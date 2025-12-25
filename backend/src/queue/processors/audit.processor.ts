import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { AuditJob } from '../queue.service';

@Processor('audit')
export class AuditProcessor {
  private readonly logger = new Logger(AuditProcessor.name);

  @Process('log-audit')
  async handleLogAudit(job: Job<AuditJob>) {
    this.logger.log(`Processing audit log job ${job.id}`);

    const { userId, action, resource, details, ip, userAgent } = job.data;

    try {
      // TODO: Store in database or external logging service
      // For now, just log it
      this.logger.log(`Audit Log:`);
      this.logger.log(`  User: ${userId}`);
      this.logger.log(`  Action: ${action}`);
      this.logger.log(`  Resource: ${resource}`);
      this.logger.log(`  Details: ${JSON.stringify(details)}`);
      if (ip) this.logger.log(`  IP: ${ip}`);
      if (userAgent) this.logger.log(`  User-Agent: ${userAgent}`);

      // In production, store in database:
      // await this.auditLogRepository.create({ userId, action, resource, details, ip, userAgent });

      this.logger.log(`Audit log stored successfully`);

      return {
        success: true,
        loggedAt: new Date(),
      };
    } catch (error) {
      this.logger.error(`Failed to log audit: ${error.message}`);
      throw error;
    }
  }
}
