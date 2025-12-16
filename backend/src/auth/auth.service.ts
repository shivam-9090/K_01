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

type ClientContext = { ip?: string; userAgent?: string };

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private usersService: UsersService,
  ) {}

  // Register new user
  async register(
    registerDto: RegisterDto,
    client?: ClientContext,
  ): Promise<AuthResponse> {
    const { email, username, password, firstName, lastName } = registerDto;

    // Check if user already exists
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }],
      },
    });

    if (existingUser) {
      throw new ConflictException('Email or username already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email,
        username,
        password: hashedPassword,
        firstName,
        lastName,
      },
    });

    // Log the registration
    await this.logAudit(user.id, 'REGISTER', 'user', null, client);

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

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Check if account is locked
    if (user.lockUntil && new Date() < user.lockUntil) {
      throw new UnauthorizedException(
        'Account is locked due to too many failed attempts. Try again later.',
      );
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);

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

    // Otherwise, return full auth response
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

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(dto.newPassword, 10);

    // Update password
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedNewPassword },
    });

    // Log the password change
    await this.logAudit(userId, 'PASSWORD_CHANGE', 'user', null, client);
  }

  // Generate JWT tokens
  async generateAuthResponse(
    user: any,
    client?: ClientContext,
  ): Promise<AuthResponse> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: parseInt(process.env.JWT_EXPIRATION || '3600'),
    });

    const refreshJti = crypto.randomUUID();
    const refreshPayload = { ...payload, jti: refreshJti, type: 'refresh' };
    const refreshToken = this.jwtService.sign(refreshPayload, {
      expiresIn: '7d',
    });

    await this.prisma.refreshToken.create({
      data: {
        token: this.hashToken(refreshToken),
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    await this.logAudit(user.id, 'TOKEN_ISSUED', 'auth', null, client);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        isTwoFAEnabled: user.isTwoFAEnabled,
      },
    };
  }

  // Refresh access token
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

      await this.logAudit(user.id, 'REFRESH_ROTATED', 'auth', null, client);

      return this.generateAuthResponse(user, client);
    } catch (error) {
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
        ipAddress: client?.ip,
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
