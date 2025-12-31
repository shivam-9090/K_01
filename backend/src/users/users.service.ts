import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        mobile: true,
        role: true,
        isEmailVerified: true,
        isActive: true,
        isTwoFAEnabled: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        mobile: true,
        role: true,
        isActive: true,
        isTwoFAEnabled: true,
      },
    });
  }

  async getAllUsers(skip = 0, take = 10) {
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        skip,
        take,
        select: {
          id: true,
          email: true,
          mobile: true,
          role: true,
          isActive: true,
          lastLogin: true,
          createdAt: true,
        },
      }),
      this.prisma.user.count(),
    ]);

    return { users, total, skip, take };
  }

  async updateUser(id: string, data: any) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        mobile: true,
        role: true,
        isActive: true,
        updatedAt: true,
      },
    });
  }

  async deactivateUser(id: string) {
    return this.updateUser(id, { isActive: false });
  }

  async activateUser(id: string) {
    return this.updateUser(id, { isActive: true });
  }

  async updateUserRole(userId: string, newRole: string) {
    const validRoles = ['BOSS', 'EMPLOYEE'];

    if (!validRoles.includes(newRole)) {
      throw new BadRequestException('Invalid role. Must be BOSS or EMPLOYEE');
    }

    return this.updateUser(userId, { role: newRole });
  }

  async getUserAuditLogs(userId: string, skip = 0, take = 20) {
    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where: { userId },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.auditLog.count({ where: { userId } }),
    ]);

    return { logs, total };
  }

  async getUserSessions(userId: string) {
    return this.prisma.session.findMany({
      where: { userId },
      select: {
        id: true,
        userAgent: true,
        ipAddress: true,
        lastActivity: true,
        expiresAt: true,
        createdAt: true,
      },
      orderBy: { lastActivity: 'desc' },
    });
  }

  async revokeSession(sessionId: string) {
    return this.prisma.session.delete({
      where: { id: sessionId },
    });
  }

  async revokeAllSessions(userId: string) {
    await this.prisma.session.deleteMany({
      where: { userId },
    });

    return { message: 'All sessions revoked' };
  }

  // Profile management - Update company name (BOSS only)
  async updateCompanyName(userId: string, newCompanyName: string) {
    // Get user with company
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { company: true, ownedCompanies: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role !== 'BOSS') {
      throw new BadRequestException(
        'Only company owners can update company name',
      );
    }

    // Get the company owned by this user
    const ownedCompany = user.ownedCompanies[0];
    if (!ownedCompany) {
      throw new NotFoundException('No company found for this user');
    }

    // Check if new company name already exists
    const existingCompany = await this.prisma.company.findUnique({
      where: { name: newCompanyName },
    });

    if (existingCompany && existingCompany.id !== ownedCompany.id) {
      throw new BadRequestException('Company name already exists');
    }

    // Update company name
    const updatedCompany = await this.prisma.company.update({
      where: { id: ownedCompany.id },
      data: { name: newCompanyName },
    });

    return {
      success: true,
      message: 'Company name updated successfully',
      company: updatedCompany,
    };
  }

  // Change password for current user
  async changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify old password
    const isPasswordValid = await bcrypt.compare(oldPassword, user.password);
    if (!isPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    // Revoke all sessions for security
    await this.revokeAllSessions(userId);

    return {
      success: true,
      message: 'Password changed successfully. Please login again.',
    };
  }

  // Get profile with company details
  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        mobile: true,
        role: true,
        isEmailVerified: true,
        isActive: true,
        isTwoFAEnabled: true,
        skills: true,
        achievements: true,
        attendance: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
        company: {
          select: {
            id: true,
            name: true,
            createdAt: true,
          },
        },
        ownedCompanies: {
          select: {
            id: true,
            name: true,
            isActive: true,
            createdAt: true,
            _count: {
              select: {
                employees: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }
}
