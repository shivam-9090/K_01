import {
  Injectable,
  NestMiddleware,
  Logger,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RequestLoggingMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');
  
  constructor(private prisma: PrismaService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const { method, originalUrl, ip } = req;
    const startTime = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const { statusCode } = res;

      this.logger.log(
        `${method} ${originalUrl} ${statusCode} ${duration}ms from ${ip}`,
      );

      // Store in database if user is authenticated
      const user = (req as any).user;
      if (user && method !== 'GET') {
        this.logAudit(user.userId, method, originalUrl, ip, req.headers['user-agent']);
      }
    });

    next();
  }

  private async logAudit(
    userId: string,
    method: string,
    url: string,
    ipAddress: string,
    userAgent: string,
  ) {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId,
          action: `${method}`,
          resource: url,
          ipAddress,
          userAgent,
        },
      });
    } catch (error) {
      this.logger.error('Failed to log audit', error);
    }
  }
}
