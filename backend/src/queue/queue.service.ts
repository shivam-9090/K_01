import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

export interface EmailJob {
  type:
    | 'password-reset'
    | 'welcome'
    | 'employee-invite'
    | '2fa-setup'
    | 'suspicious-login'
    | 'account-lockout';
  to: string;
  data: {
    resetToken?: string;
    userName?: string;
    companyName?: string;
    inviteToken?: string;
    ipAddress?: string;
    userAgent?: string;
  };
}

export interface NotificationJob {
  userId: string;
  type: 'security' | 'info' | 'warning';
  message: string;
  data?: any;
}

export interface AuditJob {
  userId: string;
  action: string;
  resource: string;
  details: any;
  ip?: string;
  userAgent?: string;
}

@Injectable()
export class QueueService {
  constructor(
    @InjectQueue('email') private emailQueue: Queue,
    @InjectQueue('notification') private notificationQueue: Queue,
    @InjectQueue('audit') private auditQueue: Queue,
  ) {}

  // Email Queue
  async addEmailJob(data: EmailJob, priority: number = 5) {
    return this.emailQueue.add('send-email', data, {
      priority,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    });
  }

  // Legacy method for compatibility
  async sendEmail(data: EmailJob, priority: number = 5) {
    return this.addEmailJob(data, priority);
  }

  // Notification Queue
  async sendNotification(data: NotificationJob) {
    return this.notificationQueue.add('send-notification', data, {
      attempts: 2,
      backoff: {
        type: 'fixed',
        delay: 5000,
      },
    });
  }

  async notifySecurityEvent(userId: string, message: string, data?: any) {
    return this.sendNotification({
      userId,
      type: 'security',
      message,
      data,
    });
  }

  // Audit Queue
  async logAudit(data: AuditJob) {
    return this.auditQueue.add('log-audit', data, {
      removeOnComplete: true, // Remove after successful processing
      attempts: 5,
    });
  }

  async logUserAction(
    userId: string,
    action: string,
    resource: string,
    details: any,
    metadata?: { ip?: string; userAgent?: string },
  ) {
    return this.logAudit({
      userId,
      action,
      resource,
      details,
      ip: metadata?.ip,
      userAgent: metadata?.userAgent,
    });
  }

  // Queue Management
  async getQueueStats() {
    const [emailStats, notificationStats, auditStats] = await Promise.all([
      this.emailQueue.getJobCounts(),
      this.notificationQueue.getJobCounts(),
      this.auditQueue.getJobCounts(),
    ]);

    return {
      email: emailStats,
      notification: notificationStats,
      audit: auditStats,
    };
  }

  async cleanQueues() {
    await Promise.all([
      this.emailQueue.clean(24 * 3600 * 1000, 'completed'),
      this.emailQueue.clean(24 * 3600 * 1000, 'failed'),
      this.notificationQueue.clean(24 * 3600 * 1000, 'completed'),
      this.notificationQueue.clean(24 * 3600 * 1000, 'failed'),
      this.auditQueue.clean(7 * 24 * 3600 * 1000, 'completed'),
    ]);
  }
}
