import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { NotificationJob } from '../queue.service';

@Processor('notification')
export class NotificationProcessor {
  private readonly logger = new Logger(NotificationProcessor.name);

  @Process('send-notification')
  async handleSendNotification(job: Job<NotificationJob>) {
    this.logger.log(`Processing notification job ${job.id}`);

    const { userId, type, message, data } = job.data;

    try {
      // TODO: Integrate with actual notification service (Firebase, WebSocket, etc.)
      // For now, just log it
      this.logger.log(`Sending ${type} notification to user ${userId}`);
      this.logger.log(`Message: ${message}`);

      if (data) {
        this.logger.log(`Additional data: ${JSON.stringify(data)}`);
      }

      // Simulate notification sending
      await new Promise((resolve) => setTimeout(resolve, 500));

      // In production, use actual notification service:
      // await this.notificationService.send({ userId, type, message, data });

      this.logger.log(`Notification sent successfully to user ${userId}`);

      return {
        success: true,
        userId,
        type,
        sentAt: new Date(),
      };
    } catch (error) {
      this.logger.error(
        `Failed to send notification to user ${userId}: ${error.message}`,
      );
      throw error;
    }
  }
}
