import {
  Injectable,
  BadRequestException,
  ConflictException,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { RegisterDto, LoginDto, ChangePasswordDto } from './dto/auth.dto';
import {
  AuthResponse,
  TwoFAAuthResponse,
  JwtPayload,
} from './interfaces/auth.interface';
import { EncryptionService } from '../common/encryption.service';
import { QueueService } from '../queue/queue.service';
import { RedisService } from '../redis/redis.service';
import { IpAddressValidator } from '../common/validators/ip-address.validator';

type ClientContext = { ip?: string; userAgent?: string };

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private usersService: UsersService,
    private queueService: QueueService,
    private redisService: RedisService,
    private encryptionService: EncryptionService,
  ) {}

  // Register new user (BOSS only - with company)
  async register(
    registerDto: RegisterDto,
    client?: ClientContext,
  ): Promise<AuthResponse> {
    const { email, password, name, companyName, mobile } = registerDto;

    // Encrypt mobile number if provided (Deterministic encryption for search/uniqueness)
    const mobileEncrypted = mobile
      ? this.encryptionService.encryptDeterministic(mobile)
      : null;

    // Check if user already exists
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ email }, { mobile: mobileEncrypted }],
      },
    });

    if (existingUser) {
      // Generic message to prevent user enumeration
      throw new ConflictException(
        'Registration failed. Please try a different email or contact',
      );
    }

    // Check if company name already exists
    const existingCompany = await this.prisma.company.findUnique({
      where: { name: companyName },
    });

    if (existingCompany) {
      throw new ConflictException('Company name already exists');
    }

    // Hash password with 12 rounds (increased from 10 for better security)
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user as BOSS with company in a transaction
    const user = await this.prisma.$transaction(async (tx) => {
      // Create BOSS user
      const newUser = await tx.user.create({
        data: {
          email,
          mobile: mobileEncrypted, // Store encrypted mobile (H-1 Fix)
          password: hashedPassword,
          role: 'BOSS', // Always BOSS for registration
          username: registerDto.username, // Optional username
        },
      });

      // Create company and link to BOSS
      const company = await tx.company.create({
        data: {
          name: companyName,
          ownerId: newUser.id,
        },
      });

      // Update user with company ID
      const updatedUser = await tx.user.update({
        where: { id: newUser.id },
        data: { companyId: company.id },
        include: { company: true },
      });

      return updatedUser;
    });

    // Log the registration
    await this.logAudit(user.id, 'REGISTER', 'user', null, client);

    // Send welcome email asynchronously
    await this.queueService.addEmailJob({
      type: 'welcome',
      to: user.email,
      data: {
        userName: user.name,
        companyName: companyName,
      },
    });

    // Log user action in queue
    await this.queueService.logUserAction(
      user.id,
      'REGISTER',
      'user',
      { email: user.email, companyName },
      { ip: client?.ip, userAgent: client?.userAgent },
    );

    return this.generateAuthResponse(user, client);
  }

  // Login user
  async login(
    loginDto: LoginDto,
    client?: ClientContext,
  ): Promise<TwoFAAuthResponse | AuthResponse> {
    const { email, password } = loginDto;

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    // Always run bcrypt comparison to prevent timing attacks
    const fakeHash =
      '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5jtRkYVBAABCD'; // Fake hash for non-existent users
    const isPasswordValid = user
      ? await bcrypt.compare(password, user.password)
      : await bcrypt.compare(password, fakeHash);

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Check if account is locked
    if (user.lockUntil && new Date() < user.lockUntil) {
      throw new UnauthorizedException(
        'Account is locked due to too many failed attempts. Try again later.',
      );
    }

    if (!isPasswordValid) {
      // Increment login attempts
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          loginAttempts: user.loginAttempts + 1,
          lockUntil:
            user.loginAttempts + 1 >= 5
              ? new Date(Date.now() + 15 * 60 * 1000) // Lock for 15 minutes
              : null,
        },
      });

      throw new UnauthorizedException('Invalid email or password');
    }

    // Reset login attempts on successful login
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        loginAttempts: 0,
        lockUntil: null,
        lastLogin: new Date(),
      },
    });

    // Log the login attempt
    await this.logAudit(user.id, 'LOGIN', 'user', null, client);

    // If 2FA is enabled, return temporary token
    if (user.isTwoFAEnabled) {
      const tempToken = this.jwtService.sign(
        {
          sub: user.id,
          email: user.email,
          role: user.role,
          temp: true,
          type: '2fa',
          fp: this.fingerprint(client),
        },
        { expiresIn: '5m' },
      );

      return {
        token: tempToken,
        requiresTwoFA: true,
      };
    }

    // Otherwise, return full auth response    // Decrypt mobile number before returning, if present
    if (user.mobile) {
      user.mobile = this.encryptionService.decryptDeterministic(user.mobile);
    }
    return this.generateAuthResponse(user, client);
  }

  // Validate user credentials
  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (isPasswordValid) {
      const { password, ...result } = user;
      return result;
    }

    return null;
  }

  // Change password
  async changePassword(
    userId: string,
    dto: ChangePasswordDto,
    client?: ClientContext,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Verify old password
    const isOldPasswordValid = await bcrypt.compare(
      dto.oldPassword,
      user.password,
    );

    if (!isOldPasswordValid) {
      throw new UnauthorizedException('Old password is incorrect');
    }

    // Hash new password with 12 rounds
    const hashedNewPassword = await bcrypt.hash(dto.newPassword, 12);

    // Update password and invalidate any existing reset tokens
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedNewPassword,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    // Log the password change
    await this.logAudit(userId, 'PASSWORD_CHANGE', 'user', null, client);
  }

  // Forgot password - send reset email
  async forgotPassword(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    // Always return success message to prevent email enumeration
    if (!user) {
      // Simulate processing time to prevent timing attacks
      await new Promise((resolve) => setTimeout(resolve, 500));
      return;
    }

    // Generate reset token (valid for 1 hour)
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

    // Save bcrypt-hashed token to database (more secure than SHA256)
    const hashedToken = await bcrypt.hash(resetToken, 12);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: hashedToken,
        resetTokenExpiry,
      },
    });

    // Send password reset email
    await this.queueService.addEmailJob({
      type: 'password-reset',
      to: user.email,
      data: {
        resetToken,
        userName: user.name,
      },
    });
  }

  // Reset password with token
  async resetPassword(token: string, newPassword: string): Promise<void> {
    // Find all users with non-expired reset tokens
    const users = await this.prisma.user.findMany({
      where: {
        resetToken: { not: null },
        resetTokenExpiry: { gte: new Date() },
      },
    });

    // Verify token against each user's hashed token using bcrypt
    let matchedUser = null;
    for (const user of users) {
      if (user.resetToken) {
        const isMatch = await bcrypt.compare(token, user.resetToken);
        if (isMatch) {
          matchedUser = user;
          break;
        }
      }
    }

    if (!matchedUser) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Hash new password with 12 rounds
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password and clear reset token
    await this.prisma.user.update({
      where: { id: matchedUser.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
        loginAttempts: 0, // Reset login attempts
        lockUntil: null, // Unlock account if locked
      },
    });

    // Log the password reset
    await this.logAudit(matchedUser.id, 'PASSWORD_RESET', 'user', null, null);
  }

  // Generate JWT tokens
  async generateAuthResponse(
    user: any,
    client?: ClientContext,
  ): Promise<AuthResponse> {
    // Fetch fresh user data with company included
    const fullUser = await this.prisma.user.findUnique({
      where: { id: user.id },
      include: { company: true },
    });

    if (!fullUser) {
      throw new UnauthorizedException('User not found');
    }

    const payload: JwtPayload = {
      sub: fullUser.id,
      email: fullUser.email,
      role: fullUser.role,
      companyId: fullUser.companyId, // Add companyId to JWT payload
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: parseInt(process.env.JWT_EXPIRATION || '3600'),
    });

    const refreshJti = crypto.randomUUID();
    const refreshPayload = { ...payload, jti: refreshJti, type: 'refresh' };
    const refreshToken = this.jwtService.sign(refreshPayload, {
      expiresIn: '7d',
    });

    // Concurrent session limit: max 5 active sessions per user
    const activeSessions = await this.prisma.refreshToken.count({
      where: {
        userId: fullUser.id,
        revokedAt: null,
        expiresAt: { gte: new Date() },
      },
    });

    if (activeSessions >= 5) {
      // Revoke oldest session
      const oldestSession = await this.prisma.refreshToken.findFirst({
        where: {
          userId: fullUser.id,
          revokedAt: null,
          expiresAt: { gte: new Date() },
        },
        orderBy: { createdAt: 'asc' },
      });

      if (oldestSession) {
        await this.prisma.refreshToken.update({
          where: { id: oldestSession.id },
          data: { revokedAt: new Date() },
        });
      }
    }

    await this.prisma.refreshToken.create({
      data: {
        token: this.hashToken(refreshToken),
        userId: fullUser.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    await this.logAudit(fullUser.id, 'TOKEN_ISSUED', 'auth', null, client);

    return {
      accessToken,
      refreshToken,
      user: {
        id: fullUser.id,
        email: fullUser.email,
        username: fullUser.username,
        role: fullUser.role,
        isTwoFAEnabled: fullUser.isTwoFAEnabled,
        mobile: fullUser.mobile,
        companyId: fullUser.companyId,
        isActive: fullUser.isActive,
        lastLogin: fullUser.lastLogin,
        name: fullUser.name,
        // GitHub fields
        githubId: fullUser.githubId,
        githubUsername: fullUser.githubUsername,
        githubAvatarUrl: fullUser.githubAvatarUrl,
        githubProfileUrl: fullUser.githubProfileUrl,
        githubBio: fullUser.githubBio,
        githubLocation: fullUser.githubLocation,
        githubCompany: fullUser.githubCompany,
        githubReposCount: fullUser.githubReposCount,
        // All permission fields
        canCreateProject: fullUser.canCreateProject,
        canUpdateProject: fullUser.canUpdateProject,
        canDeleteProject: fullUser.canDeleteProject,
        canViewAllProjects: fullUser.canViewAllProjects,
        canCreateTask: fullUser.canCreateTask,
        canUpdateTask: fullUser.canUpdateTask,
        canDeleteTask: fullUser.canDeleteTask,
        canCompleteTask: fullUser.canCompleteTask,
        canVerifyTask: fullUser.canVerifyTask,
        canViewAllTasks: fullUser.canViewAllTasks,
        canViewOverdueTasks: fullUser.canViewOverdueTasks,
        canCreateEmployee: fullUser.canCreateEmployee,
        canUpdateEmployee: fullUser.canUpdateEmployee,
        canDeleteEmployee: fullUser.canDeleteEmployee,
        canViewAllEmployees: fullUser.canViewAllEmployees,
        canManagePermissions: fullUser.canManagePermissions,
        canCreateTeam: fullUser.canCreateTeam,
        canUpdateTeam: fullUser.canUpdateTeam,
        canDeleteTeam: fullUser.canDeleteTeam,
        canViewAllTeams: fullUser.canViewAllTeams,
        canViewAuditLogs: fullUser.canViewAuditLogs,
        canViewAllSessions: fullUser.canViewAllSessions,
        canManage2FA: fullUser.canManage2FA,
        ...(fullUser.company && { company: fullUser.company }),
      },
    };
  }

  // Refresh access token with Redis lock to prevent race conditions
  async refreshAccessToken(
    refreshToken: string,
    client?: ClientContext,
  ): Promise<AuthResponse> {
    try {
      const decoded = this.jwtService.verify(refreshToken) as JwtPayload & {
        jti?: string;
        type?: string;
      };

      if (decoded.type !== 'refresh') {
        throw new UnauthorizedException('Invalid refresh token type');
      }

      const hashed = this.hashToken(refreshToken);
      const lockKey = `refresh-lock:${hashed}`;

      // Acquire Redis lock to prevent concurrent refresh token usage (race condition)
      const lockAcquired = await this.redisService.acquireLock(lockKey, 5);

      if (!lockAcquired) {
        throw new UnauthorizedException(
          'Another refresh is in progress. Please wait.',
        );
      }

      try {
        // Check if refresh token exists and is not revoked
        const storedToken = await this.prisma.refreshToken.findUnique({
          where: { token: hashed },
        });

        if (!storedToken) {
          throw new UnauthorizedException('Invalid or revoked refresh token');
        }

        if (storedToken.revokedAt) {
          // Reuse detected: revoke all tokens for this user
          await this.revokeAllUserTokens(decoded.sub);
          throw new UnauthorizedException('Refresh token reuse detected');
        }

        if (storedToken.userId !== decoded.sub) {
          throw new UnauthorizedException('Refresh token user mismatch');
        }

        if (storedToken.expiresAt < new Date()) {
          await this.prisma.refreshToken.update({
            where: { token: hashed },
            data: { revokedAt: new Date() },
          });
          throw new UnauthorizedException('Expired refresh token');
        }

        const user = await this.prisma.user.findUnique({
          where: { id: decoded.sub },
        });

        if (!user || !user.isActive) {
          throw new UnauthorizedException('User not found or inactive');
        }

        // Rotate: revoke old token
        await this.prisma.refreshToken.update({
          where: { token: hashed },
          data: { revokedAt: new Date() },
        });
        // Release Redis lock
        await this.redisService.releaseLock(lockKey);
        await this.logAudit(user.id, 'REFRESH_ROTATED', 'auth', null, client);

        return this.generateAuthResponse(user, client);
      } catch (innerError) {
        // Release lock in case of inner errors
        await this.redisService.releaseLock(lockKey).catch(() => {});
        throw innerError;
      }
    } catch (error) {
      // For JWT errors (outer catch)
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  // Logout - revoke refresh token
  async logout(refreshToken: string, userId?: string): Promise<void> {
    const decoded = this.jwtService.verify(refreshToken) as JwtPayload;

    if (userId && decoded.sub !== userId) {
      throw new ForbiddenException('Token does not belong to the caller');
    }

    await this.prisma.refreshToken.updateMany({
      where: { token: this.hashToken(refreshToken), userId: decoded.sub },
      data: { revokedAt: new Date() },
    });
  }

  private async revokeAllUserTokens(userId: string) {
    await this.prisma.refreshToken.updateMany({
      where: { userId },
      data: { revokedAt: new Date() },
    });
  }

  // Audit logging
  private async logAudit(
    userId: string,
    action: string,
    resource: string,
    metadata: any,
    client?: ClientContext,
  ): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        userId,
        action,
        resource,
        metadata: metadata ? JSON.stringify(metadata) : null,
        ipAddress: IpAddressValidator.sanitize(client?.ip), // M-2: Validate IP
        userAgent: client?.userAgent,
      },
    });
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private fingerprint(client?: ClientContext): string {
    const input = `${client?.ip || ''}|${client?.userAgent || ''}`;
    return this.hashToken(input);
  }
}
