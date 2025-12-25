import { Injectable, NestMiddleware, Logger, Inject } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger as WinstonLogger } from 'winston';

@Injectable()
export class RequestLoggingMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  constructor(
    private prisma: PrismaService,
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly winstonLogger: WinstonLogger,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const { method, originalUrl, ip } = req;
    const startTime = Date.now();
    const userAgent = req.headers['user-agent'] || 'unknown';

    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const { statusCode } = res;
      const user = (req as any).user;

      // Structured logging with Winston
      const logData = {
        method,
        url: originalUrl,
        statusCode,
        duration,
        ip,
        userAgent,
        userId: user?.userId || 'anonymous',
        timestamp: new Date().toISOString(),
      };

      // Log based on status code
      if (statusCode >= 500) {
        this.winstonLogger.error('Server error', logData);
      } else if (statusCode >= 400) {
        this.winstonLogger.warn('Client error', logData);
      } else {
        this.winstonLogger.info('Request completed', logData);
      }

      // Console log for development
      this.logger.log(
        `${method} ${originalUrl} ${statusCode} ${duration}ms from ${ip}`,
      );

      // Store in database for audit (security-sensitive actions only)
      if (user && this.shouldAudit(method, originalUrl)) {
        this.logAudit(
          user.userId,
          method,
          originalUrl,
          ip,
          userAgent,
          statusCode,
        );
      }
    });

    next();
  }

  private shouldAudit(method: string, url: string): boolean {
    // Audit non-GET requests and sensitive endpoints
    if (method !== 'GET') return true;

    // Audit sensitive GET endpoints
    const sensitivePatterns = ['/2fa/', '/auth/', '/users/me'];
    return sensitivePatterns.some((pattern) => url.includes(pattern));
  }

  private async logAudit(
    userId: string,
    method: string,
    url: string,
    ipAddress: string,
    userAgent: string,
    statusCode: number,
  ) {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId,
          action: `${method} ${url}`,
          resource: url,
          ipAddress,
          userAgent,
        },
      });

      // Log to Winston for centralized logging
      this.winstonLogger.info('Audit log created', {
        userId,
        method,
        url,
        ipAddress,
        statusCode,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error('Failed to log audit', error);
      this.winstonLogger.error('Audit log creation failed', {
        error: error.message,
        userId,
      });
    }
  }
}
