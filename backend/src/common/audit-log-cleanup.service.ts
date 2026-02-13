import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Audit Log Retention Service
 *
 * Purpose: Automatically cleanup old audit logs to prevent unbounded database growth
 * Fixes: H-6 from DATABASE_SECURITY_AUDIT.md (No retention policy)
 * Compliance: SOC2 CC6.1 (requires defined retention period)
 *
 * Default Retention:
 * - AuditLog: 90 days (security events, login attempts, 2FA)
 * - CompanyAuditLog: 365 days (business events, longer compliance requirement)
 *
 * Schedule: Runs daily at 3 AM
 */
@Injectable()
export class AuditLogCleanupService {
  private readonly logger = new Logger(AuditLogCleanupService.name);

  // Retention periods (configurable via environment variables)
  private readonly AUDIT_LOG_RETENTION_DAYS = parseInt(
    process.env.AUDIT_LOG_RETENTION_DAYS || '90',
  );
  private readonly COMPANY_AUDIT_LOG_RETENTION_DAYS = parseInt(
    process.env.COMPANY_AUDIT_LOG_RETENTION_DAYS || '365',
  );

  constructor(private prisma: PrismaService) {}

  /**
   * Scheduled job: Runs daily at 3:00 AM to cleanup old audit logs
   * Cron format: second minute hour day month dayOfWeek
   */
  @Cron('0 0 3 * * *', {
    name: 'audit-log-cleanup',
    timeZone: 'UTC',
  })
  async handleAuditLogCleanup() {
    this.logger.log('Starting scheduled audit log cleanup...');

    try {
      const results = await this.cleanupOldAuditLogs();

      this.logger.log(
        `✅ Audit log cleanup completed successfully. ` +
          `AuditLog: ${results.auditLogDeleted} deleted, ` +
          `CompanyAuditLog: ${results.companyAuditLogDeleted} deleted`,
      );
    } catch (error) {
      this.logger.error(
        `❌ Audit log cleanup failed: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Manual cleanup method (can be called via admin endpoint)
   * @returns Object with counts of deleted records
   */
  async cleanupOldAuditLogs(): Promise<{
    auditLogDeleted: number;
    companyAuditLogDeleted: number;
  }> {
    const now = new Date();
    const auditLogCutoffDate = new Date(
      now.getTime() - this.AUDIT_LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000,
    );
    const companyAuditLogCutoffDate = new Date(
      now.getTime() -
        this.COMPANY_AUDIT_LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000,
    );

    this.logger.debug(
      `Deleting AuditLogs older than ${auditLogCutoffDate.toISOString()}`,
    );
    this.logger.debug(
      `Deleting CompanyAuditLogs older than ${companyAuditLogCutoffDate.toISOString()}`,
    );

    // Delete old AuditLogs (user-level security events)
    const auditLogResult = await this.prisma.auditLog.deleteMany({
      where: {
        createdAt: {
          lt: auditLogCutoffDate,
        },
      },
    });

    // Delete old CompanyAuditLogs (company-level business events)
    const companyAuditLogResult = await this.prisma.companyAuditLog.deleteMany({
      where: {
        createdAt: {
          lt: companyAuditLogCutoffDate,
        },
      },
    });

    return {
      auditLogDeleted: auditLogResult.count,
      companyAuditLogDeleted: companyAuditLogResult.count,
    };
  }

  /**
   * Get current audit log statistics
   * Useful for monitoring database growth
   */
  async getAuditLogStats(): Promise<{
    auditLogCount: number;
    companyAuditLogCount: number;
    oldestAuditLog: Date | null;
    oldestCompanyAuditLog: Date | null;
  }> {
    const [
      auditLogCount,
      companyAuditLogCount,
      oldestAuditLog,
      oldestCompanyAuditLog,
    ] = await Promise.all([
      this.prisma.auditLog.count(),
      this.prisma.companyAuditLog.count(),
      this.prisma.auditLog.findFirst({
        orderBy: { createdAt: 'asc' },
        select: { createdAt: true },
      }),
      this.prisma.companyAuditLog.findFirst({
        orderBy: { createdAt: 'asc' },
        select: { createdAt: true },
      }),
    ]);

    return {
      auditLogCount,
      companyAuditLogCount,
      oldestAuditLog: oldestAuditLog?.createdAt || null,
      oldestCompanyAuditLog: oldestCompanyAuditLog?.createdAt || null,
    };
  }
}
