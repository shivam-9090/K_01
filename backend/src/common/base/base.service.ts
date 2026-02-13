import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface UserContext {
  userId: string;
  email: string;
  role: string;
  companyId: string;
}

@Injectable()
export class BaseService {
  constructor(protected readonly prisma: PrismaService) {}

  /**
   * Find user by ID
   * @param userId - User ID
   * @returns User or null
   */
  protected async findUserById(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      include: { company: true },
    });
  }

  /**
   * Find user by ID or throw NotFoundException
   * @param userId - User ID
   * @returns User
   * @throws NotFoundException if user not found
   */
  protected async findUserByIdOrThrow(userId: string) {
    const user = await this.findUserById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  /**
   * Get user with company context and validate
   * @param userId - User ID
   * @returns User with company
   * @throws NotFoundException if user not found
   * @throws ForbiddenException if user has no company
   */
  protected async getUserCompanyContext(userId: string) {
    const user = await this.findUserByIdOrThrow(userId);

    if (!user.companyId) {
      throw new ForbiddenException('User must belong to a company');
    }

    return {
      user,
      companyId: user.companyId,
      role: user.role,
    };
  }

  /**
   * Validate that a resource belongs to the user's company
   * @param resourceCompanyId - Company ID of the resource
   * @param userCompanyId - Company ID of the user
   * @throws ForbiddenException if companies don't match
   */
  protected validateCompanyAccess(
    resourceCompanyId: string,
    userCompanyId: string,
  ) {
    if (resourceCompanyId !== userCompanyId) {
      throw new ForbiddenException(
        'Access denied: resource belongs to another company',
      );
    }
  }

  /**
   * Validate that user is BOSS
   * @param role - User role
   * @throws ForbiddenException if not BOSS
   */
  protected validateBossRole(role: string) {
    if (role !== 'BOSS') {
      throw new ForbiddenException('Only BOSS can perform this action');
    }
  }
}
