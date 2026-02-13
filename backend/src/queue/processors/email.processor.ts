import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { EmailJob } from '../queue.service';
import { EmailService } from '../../email/email.service';

@Processor('email')
export class EmailProcessor {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(private readonly emailService: EmailService) {}

  @Process('send-email')
  async handleSendEmail(job: Job<EmailJob>) {
    this.logger.log(`Processing email job ${job.id} - Type: ${job.data.type}`);

    const { type, to, data } = job.data;

    try {
      let success = false;

      switch (type) {
        case 'password-reset':
          success = await this.emailService.sendPasswordReset(
            to,
            data.resetToken,
          );
          break;

        case 'welcome':
          success = await this.emailService.sendWelcomeEmail(
            to,
            data.userName,
            data.companyName,
          );
          break;

        case 'employee-invite':
          success = await this.emailService.sendEmployeeInvite(
            to,
            data.inviteToken,
            data.companyName,
          );
          break;

        case '2fa-setup':
          success = await this.emailService.send2FASetupConfirmation(
            to,
            data.userName,
          );
          break;

        case 'suspicious-login':
          success = await this.emailService.sendSuspiciousLoginAlert(
            to,
            data.ipAddress,
            data.userAgent,
          );
          break;

        case 'account-lockout':
          success = await this.emailService.sendAccountLockoutNotification(to);
          break;

        default:
          this.logger.warn(`Unknown email type: ${type}`);
          return { success: false };
      }

      this.logger.log(`Email sent successfully to ${to}`);

      return {
        success,
        to,
        sentAt: new Date(),
      };
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}: ${error.message}`);
      throw error; // Will trigger retry
    }
  }
}
