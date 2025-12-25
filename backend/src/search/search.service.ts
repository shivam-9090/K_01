import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface SearchResult<T> {
  results: T[];
  total: number;
  page: number;
  pageSize: number;
}

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async searchUsers(
    query: string,
    page = 1,
    pageSize = 10,
  ): Promise<SearchResult<any>> {
    const skip = (page - 1) * pageSize;

    const whereClause = {
      OR: [
        { email: { contains: query, mode: 'insensitive' as const } },
        { firstName: { contains: query, mode: 'insensitive' as const } },
        { lastName: { contains: query, mode: 'insensitive' as const } },
      ],
    };

    const [results, total] = await Promise.all([
      this.prisma.user.findMany({
        where: whereClause,
        skip,
        take: pageSize,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          createdAt: true,
          isTwoFAEnabled: true,
        },
      }),
      this.prisma.user.count({ where: whereClause }),
    ]);

    return {
      results,
      total,
      page,
      pageSize,
    };
  }

  async searchByEmail(email: string): Promise<any[]> {
    return this.prisma.user.findMany({
      where: {
        email: {
          contains: email,
          mode: 'insensitive',
        },
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        createdAt: true,
      },
    });
  }

  async searchByRole(
    role: string,
    page = 1,
    pageSize = 10,
  ): Promise<SearchResult<any>> {
    const skip = (page - 1) * pageSize;

    const [results, total] = await Promise.all([
      this.prisma.user.findMany({
        where: { role: role as any },
        skip,
        take: pageSize,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          createdAt: true,
        },
      }),
      this.prisma.user.count({ where: { role: role as any } }),
    ]);

    return {
      results,
      total,
      page,
      pageSize,
    };
  }

  async advancedSearch(filters: {
    query?: string;
    role?: string;
    twoFactorEnabled?: boolean;
    createdAfter?: Date;
    createdBefore?: Date;
    page?: number;
    pageSize?: number;
  }): Promise<SearchResult<any>> {
    const {
      query,
      role,
      twoFactorEnabled,
      createdAfter,
      createdBefore,
      page = 1,
      pageSize = 10,
    } = filters;
    const skip = (page - 1) * pageSize;

    const whereClause: any = {};

    if (query) {
      whereClause.OR = [
        { email: { contains: query, mode: 'insensitive' } },
        { firstName: { contains: query, mode: 'insensitive' } },
        { lastName: { contains: query, mode: 'insensitive' } },
      ];
    }

    if (role) {
      whereClause.role = role;
    }

    if (twoFactorEnabled !== undefined) {
      whereClause.isTwoFAEnabled = twoFactorEnabled;
    }

    if (createdAfter || createdBefore) {
      whereClause.createdAt = {};
      if (createdAfter) whereClause.createdAt.gte = createdAfter;
      if (createdBefore) whereClause.createdAt.lte = createdBefore;
    }

    const [results, total] = await Promise.all([
      this.prisma.user.findMany({
        where: whereClause,
        skip,
        take: pageSize,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          createdAt: true,
          isTwoFAEnabled: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where: whereClause }),
    ]);

    return {
      results,
      total,
      page,
      pageSize,
    };
  }

  async getUserStats() {
    const [total, withTwoFactor, byRole] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { isTwoFAEnabled: true } }),
      this.prisma.user.groupBy({
        by: ['role'],
        _count: true,
      }),
    ]);

    return {
      total,
      withTwoFactor,
      byRole: byRole.map((r) => ({
        role: r.role,
        count: r._count,
      })),
    };
  }
}
