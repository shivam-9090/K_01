import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    const provider = process.env.EMAIL_PROVIDER || 'sendgrid';

    switch (provider) {
      case 'sendgrid':
        this.transporter = nodemailer.createTransport({
          host: 'smtp.sendgrid.net',
          port: 587,
          secure: false,
          auth: {
            user: 'apikey',
            pass: process.env.SENDGRID_API_KEY,
          },
        });
        break;

      case 'aws-ses':
        this.transporter = nodemailer.createTransport({
          host: `email-smtp.${process.env.AWS_REGION}.amazonaws.com`,
          port: 587,
          secure: false,
          auth: {
            user: process.env.AWS_SES_USER,
            pass: process.env.AWS_SES_PASSWORD,
          },
        });
        break;

      case 'resend':
        this.transporter = nodemailer.createTransport({
          host: 'smtp.resend.com',
          port: 587,
          secure: false,
          auth: {
            user: 'resend',
            pass: process.env.RESEND_API_KEY,
          },
        });
        break;

      case 'smtp':
      default:
        this.transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT || '587'),
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD,
          },
        });
        break;
    }
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      const from = process.env.EMAIL_FROM || 'noreply@example.com';

      await this.transporter.sendMail({
        from,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });

      return true;
    } catch (error) {
      throw new Error(`Failed to send email: ${error.message}`);
    }
  }

  /**
   * Send welcome email after registration
   */
  async sendWelcomeEmail(
    email: string,
    userName: string,
    companyName?: string,
  ): Promise<boolean> {
    const dashboardUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; background-color: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; color: #888; font-size: 12px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Welcome to ${companyName || 'Our Platform'}!</h1>
          </div>
          <div class="content">
            <h2>Hi ${userName},</h2>
            <p>Your account has been successfully created! We're excited to have you on board.</p>
            
            <h3>What's next?</h3>
            <ul>
              <li>Complete your profile with additional information</li>
              <li>Explore your dashboard and available features</li>
              <li>Connect your GitHub account for enhanced collaboration</li>
              <li>Join your team's projects and start contributing</li>
            </ul>
            
            <div style="text-align: center;">
              <a href="${dashboardUrl}" class="button">Go to Dashboard</a>
            </div>
            
            <p style="margin-top: 30px;"><strong>Need help?</strong> Feel free to reach out to your team administrator.</p>
          </div>
          <div class="footer">
            <p>This email was sent to ${email}</p>
            <p>&copy; ${new Date().getFullYear()} ${companyName || 'Company'}. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject: `Welcome to ${companyName || 'Our Platform'}! 🚀`,
      html,
      text: `Welcome ${userName}! Your account has been created. Visit: ${dashboardUrl}`,
    });
  }

  /**
   * Send employee invitation email
   */
  async sendEmployeeInvite(
    email: string,
    inviteToken: string,
    companyName: string,
  ): Promise<boolean> {
    const inviteUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/accept-invite?token=${inviteToken}`;

    const html = `
      <h2>Welcome to ${companyName}</h2>
      <p>You have been invited to join <strong>${companyName}</strong> as an employee.</p>
      <p>
        <a href="${inviteUrl}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">
          Accept Invitation
        </a>
      </p>
      <p>Or copy this link: ${inviteUrl}</p>
      <p>This invitation expires in 24 hours.</p>
    `;

    return this.sendEmail({
      to: email,
      subject: `Invitation to join ${companyName}`,
      html,
      text: `You have been invited to join ${companyName}. Visit: ${inviteUrl}`,
    });
  }

  /**
   * Send password reset email
   */
  async sendPasswordReset(email: string, resetToken: string): Promise<boolean> {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; background-color: #dc3545; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: bold; }
          .warning { background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
          .footer { text-align: center; color: #888; font-size: 12px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 Password Reset Request</h1>
          </div>
          <div class="content">
            <p>Hello,</p>
            <p>We received a request to reset the password for your account.</p>
            
            <div style="text-align: center;">
              <a href="${resetUrl}" class="button">Reset Password</a>
            </div>
            
            <p style="font-size: 14px; color: #666;">Or copy and paste this link into your browser:</p>
            <p style="background: #e9ecef; padding: 10px; border-radius: 4px; word-break: break-all; font-size: 12px;">${resetUrl}</p>
            
            <div class="warning">
              <strong>⏰ Important:</strong> This link will expire in <strong>1 hour</strong>.
            </div>
            
            <div class="warning">
              <strong>🛡️ Security Note:</strong> If you didn't request this password reset, please ignore this email. Your password will remain unchanged.
            </div>
          </div>
          <div class="footer">
            <p>This email was sent to ${email}</p>
            <p>For security reasons, never share this link with anyone.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject: 'Password Reset Request - Action Required',
      html,
      text: `Reset your password: ${resetUrl} (Link expires in 1 hour)`,
    });
  }

  /**
   * Send 2FA setup confirmation
   */
  async send2FASetupConfirmation(
    email: string,
    userName: string,
  ): Promise<boolean> {
    const html = `
      <h2>Two-Factor Authentication Enabled</h2>
      <p>Hi ${userName},</p>
      <p>Two-factor authentication (2FA) has been successfully enabled on your account.</p>
      <p>From now on, you'll need to provide a second form of verification when logging in.</p>
      <p>Make sure to save your backup codes in a secure location.</p>
      <p>If you didn't enable 2FA, please contact support immediately.</p>
    `;

    return this.sendEmail({
      to: email,
      subject: '2FA Successfully Enabled',
      html,
      text: 'Two-factor authentication has been enabled on your account.',
    });
  }

  /**
   * Send suspicious login alert
   */
  async sendSuspiciousLoginAlert(
    email: string,
    ipAddress: string,
    userAgent: string,
  ): Promise<boolean> {
    const html = `
      <h2>Suspicious Login Alert</h2>
      <p>A login attempt was detected from a new location:</p>
      <p>
        <strong>IP Address:</strong> ${ipAddress}<br>
        <strong>Device:</strong> ${userAgent}
      </p>
      <p>If this wasn't you, please:</p>
      <ol>
        <li>Change your password immediately</li>
        <li>Review your active sessions</li>
        <li>Contact support if you have concerns</li>
      </ol>
    `;

    return this.sendEmail({
      to: email,
      subject: 'Suspicious Login Alert',
      html,
      text: `A login was detected from IP: ${ipAddress}`,
    });
  }

  /**
   * Send account lockout notification
   */
  async sendAccountLockoutNotification(email: string): Promise<boolean> {
    const html = `
      <h2>Account Security Alert</h2>
      <p>Your account has been temporarily locked due to multiple failed login attempts.</p>
      <p>This is a security measure to protect your account.</p>
      <p>Your account will be automatically unlocked after 15 minutes.</p>
      <p>If you forgot your password, use the password reset option.</p>
    `;

    return this.sendEmail({
      to: email,
      subject: 'Account Locked - Security Alert',
      html,
      text: 'Your account has been temporarily locked due to failed login attempts.',
    });
  }
}
