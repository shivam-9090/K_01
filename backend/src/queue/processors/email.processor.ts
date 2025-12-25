import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { EmailJob } from '../queue.service';

@Processor('email')
export class EmailProcessor {
  private readonly logger = new Logger(EmailProcessor.name);

  @Process('send-email')
  async handleSendEmail(job: Job<EmailJob>) {
    this.logger.log(`Processing email job ${job.id}`);

    const { to, subject, body, userId } = job.data;

    try {
      // TODO: Integrate with actual email service (SendGrid, AWS SES, etc.)
      // For now, just log it
      this.logger.log(`Sending email to ${to}`);
      this.logger.log(`Subject: ${subject}`);
      this.logger.log(`Body: ${body}`);

      // Simulate email sending delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // In production, use actual email service:
      // await this.emailService.send({ to, subject, body });

      this.logger.log(`Email sent successfully to ${to}`);

      return {
        success: true,
        to,
        sentAt: new Date(),
      };
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}: ${error.message}`);
      throw error; // Will trigger retry
    }
  }
}
