import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';

type ClientContext = { ip?: string; userAgent?: string };

@Injectable()
export class TwoFAService {
  private encryptionKey: Buffer;

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private authService: AuthService,
  ) {
    this.encryptionKey = this.getEncryptionKey();
  }

  async generateSecret(email: string) {
    const secret = speakeasy.generateSecret({
      name: `Auth App (${email})`,
      issuer: 'Auth App',
      length: 32,
    });

    return {
      secret: secret.base32,
      qrCode: await QRCode.toDataURL(secret.otpauth_url),
      manualEntryKey: secret.base32,
    };
  }

  private async verifyToken(secret: string, token: string): Promise<boolean> {
    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: parseInt(process.env.TOTP_WINDOW || '2'),
    });
  }

  async enableTwoFA(
    userId: string,
    secret: string,
    token: string,
    password: string,
    client?: ClientContext,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Enforce password re-auth
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid password');
    }

    // Verify the token
    const isValid = await this.verifyToken(secret, token);

    if (!isValid) {
      throw new BadRequestException('Invalid TOTP code');
    }

    // Generate backup codes
    const backupCodes = this.generateBackupCodes(10);
    const hashedBackupCodes = await Promise.all(
      backupCodes.map(code => bcrypt.hash(code, 10)),
    );

    // Enable 2FA
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        isTwoFAEnabled: true,
        twoFASecret: this.encryptSecret(secret),
        twoFABackupCodes: hashedBackupCodes,
      },
    });

    // Log the 2FA enablement
    await this.logAudit(userId, '2FA_ENABLED', 'user', null, client);

    return {
      message: '2FA enabled successfully',
      backupCodes,
      warning: 'Save these backup codes in a safe place. Each can be used once if you lose access to your authenticator.',
    };
  }

  async disableTwoFA(
    userId: string,
    token: string,
    password: string,
    client?: ClientContext,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.isTwoFAEnabled) {
      throw new BadRequestException('2FA is not enabled for this user');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid password');
    }

    // Verify the token
    const secret = this.decryptSecret(user.twoFASecret as string);
    const isValid = await this.verifyToken(secret, token);

    if (!isValid) {
      throw new BadRequestException('Invalid TOTP code');
    }

    // Disable 2FA
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        isTwoFAEnabled: false,
        twoFASecret: null,
        twoFABackupCodes: [],
      },
    });

    // Log the 2FA disablement
    await this.logAudit(userId, '2FA_DISABLED', 'user', null, client);

    return { message: '2FA disabled successfully' };
  }

  async verify2FALogin(
    token: string,
    code: string,
    client?: ClientContext,
  ) {
    try {
      const decoded = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET,
      }) as { sub: string; temp?: boolean; type?: string; fp?: string };

      if (!decoded?.temp || decoded.type !== '2fa') {
        throw new UnauthorizedException('Invalid or expired token');
      }

      if (decoded.fp && decoded.fp !== this.fingerprint(client)) {
        throw new ForbiddenException('Client fingerprint mismatch');
      }

      const user = await this.prisma.user.findUnique({
        where: { id: decoded.sub },
      });

      if (!user || !user.isActive || !user.isTwoFAEnabled) {
        throw new UnauthorizedException('Invalid request');
      }

      if (user.twoFALockUntil && user.twoFALockUntil > new Date()) {
        throw new UnauthorizedException('2FA temporarily locked. Try again later');
      }

      const secret = this.decryptSecret(user.twoFASecret as string);

      // Try to verify with TOTP code
      let isValid = await this.verifyToken(secret, code);

      // If TOTP fails, try backup codes
      if (!isValid) {
        isValid = await this.verifyBackupCode(user, code);
      }

      if (!isValid) {
        await this.incrementTwoFAAttempts(user.id, user.twoFAAttempts);
        throw new BadRequestException('Invalid code');
      }

      await this.resetTwoFAAttempts(user.id);
      // Generate full auth tokens
      await this.logAudit(user.id, '2FA_VERIFIED', 'user', null, client);
      return this.authService.generateAuthResponse(user, client);
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private async incrementTwoFAAttempts(userId: string, current: number) {
    const attempts = current + 1;
    const lockThreshold = 5;
    const lockMinutes = 10;

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFAAttempts: attempts,
        twoFALockUntil:
          attempts >= lockThreshold
            ? new Date(Date.now() + lockMinutes * 60 * 1000)
            : null,
      },
    });
  }

  private async resetTwoFAAttempts(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFAAttempts: 0, twoFALockUntil: null },
    });
  }

  private async verifyBackupCode(user: any, code: string): Promise<boolean> {
    for (let i = 0; i < user.twoFABackupCodes.length; i++) {
      const isValid = await bcrypt.compare(code, user.twoFABackupCodes[i]);

      if (isValid) {
        // Remove used backup code
        const updatedCodes = user.twoFABackupCodes.filter(
          (_, index) => index !== i,
        );
        await this.prisma.user.update({
          where: { id: user.id },
          data: { twoFABackupCodes: updatedCodes },
        });

        return true;
      }
    }

    return false;
  }

  private generateBackupCodes(count: number): string[] {
    const codes = [];
    for (let i = 0; i < count; i++) {
      codes.push(crypto.randomBytes(5).toString('hex').toUpperCase());
    }
    return codes;
  }

  private async logAudit(
    userId: string,
    action: string,
    resource: string,
    metadata: any,
    client?: ClientContext,
  ): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        userId,
        action,
        resource,
        metadata: metadata ? JSON.stringify(metadata) : null,
        ipAddress: client?.ip,
        userAgent: client?.userAgent,
      },
    });
  }

  async regenerateBackupCodes(
    userId: string,
    token: string,
    client?: ClientContext,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.isTwoFAEnabled) {
      throw new BadRequestException('2FA is not enabled');
    }

    // Verify the token
    const secret = this.decryptSecret(user.twoFASecret as string);
    const isValid = await this.verifyToken(secret, token);

    if (!isValid) {
      throw new BadRequestException('Invalid TOTP code');
    }

    // Generate new backup codes
    const backupCodes = this.generateBackupCodes(10);
    const hashedBackupCodes = await Promise.all(
      backupCodes.map(code => bcrypt.hash(code, 10)),
    );

    // Update backup codes
    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFABackupCodes: hashedBackupCodes },
    });

    await this.logAudit(userId, '2FA_BACKUP_REGEN', 'user', null, client);

    return {
      message: 'Backup codes regenerated successfully',
      backupCodes,
    };
  }

  private getEncryptionKey(): Buffer {
    const key = process.env.TWOFA_ENCRYPTION_KEY;
    if (!key) {
      throw new Error('TWOFA_ENCRYPTION_KEY is required for 2FA secret encryption');
    }
    const buffer = Buffer.from(key, 'base64');
    if (buffer.length !== 32) {
      throw new Error('TWOFA_ENCRYPTION_KEY must be 32 bytes base64-encoded');
    }
    return buffer;
  }

  private encryptSecret(secret: string): string {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.encryptionKey, iv);
    const ciphertext = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${iv.toString('base64')}:${ciphertext.toString('base64')}:${tag.toString('base64')}`;
  }

  private decryptSecret(payload: string): string {
    const [ivB64, dataB64, tagB64] = payload.split(':');
    const iv = Buffer.from(ivB64, 'base64');
    const ciphertext = Buffer.from(dataB64, 'base64');
    const tag = Buffer.from(tagB64, 'base64');
    const decipher = crypto.createDecipheriv('aes-256-gcm', this.encryptionKey, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return decrypted.toString('utf8');
  }

  private fingerprint(client?: ClientContext): string {
    const input = `${client?.ip || ''}|${client?.userAgent || ''}`;
    return crypto.createHash('sha256').update(input).digest('hex');
  }
}
