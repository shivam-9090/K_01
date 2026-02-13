import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly key: Buffer;
  private readonly keyLength = 32; // 256 bits

  constructor() {
    // Use TWOFA_ENCRYPTION_KEY or generate a new one
    const keyString =
      process.env.GITHUB_ENCRYPTION_KEY || process.env.TWOFA_ENCRYPTION_KEY;

    if (!keyString) {
      throw new Error(
        'GITHUB_ENCRYPTION_KEY or TWOFA_ENCRYPTION_KEY must be set in environment variables',
      );
    }

    // Convert base64 key to buffer
    this.key = Buffer.from(keyString, 'base64');

    if (this.key.length !== this.keyLength) {
      throw new Error(
        `Encryption key must be ${this.keyLength} bytes (256 bits)`,
      );
    }
  }

  /**
   * Encrypt a string value using AES-256-GCM
   * @param plaintext - The value to encrypt
   * @returns Encrypted value in format: iv:authTag:ciphertext (all base64)
   */
  encrypt(plaintext: string): string {
    if (!plaintext) {
      return plaintext;
    }

    // Generate random IV (12 bytes recommended for GCM)
    const iv = crypto.randomBytes(12);

    // Create cipher
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);

    // Encrypt
    let ciphertext = cipher.update(plaintext, 'utf8', 'base64');
    ciphertext += cipher.final('base64');

    // Get authentication tag (16 bytes for GCM)
    const authTag = cipher.getAuthTag();

    // Return format: iv:authTag:ciphertext (all base64)
    return `${iv.toString('base64')}:${authTag.toString('base64')}:${ciphertext}`;
  }

  /**
   * Deterministically encrypt a string value (SHA256 of key -> IV)
   * Use for searchable/unique fields like mobile numbers
   */
  encryptDeterministic(plaintext: string): string {
    if (!plaintext) return plaintext;

    // Create deterministic IV from key (first 16 bytes of SHA256)
    const iv = crypto
      .createHash('sha256')
      .update(this.key)
      .digest()
      .slice(0, 16);

    // AES-256-CBC with fixed IV = deterministic output
    const cipher = crypto.createCipheriv('aes-256-cbc', this.key, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return encrypted;
  }

  /**
   * Decrypt a deterministically encrypted string value
   */
  decryptDeterministic(ciphertext: string): string {
    if (!ciphertext) return ciphertext;

    try {
      // Create deterministic IV from key
      const iv = crypto
        .createHash('sha256')
        .update(this.key)
        .digest()
        .slice(0, 16);

      const decipher = crypto.createDecipheriv('aes-256-cbc', this.key, iv);

      let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      // If decryption fails, return original (useful for migration)
      return ciphertext;
    }
  }

  /**
   * Decrypt a string value encrypted with AES-256-GCM
   * @param encrypted - The encrypted value in format: iv:authTag:ciphertext
   * @returns Decrypted plaintext
   */
  decrypt(encrypted: string): string {
    if (!encrypted) {
      return encrypted;
    }

    try {
      // Split the encrypted value
      const parts = encrypted.split(':');
      if (parts.length !== 3) {
        throw new Error('Invalid encrypted format');
      }

      const [ivBase64, authTagBase64, ciphertext] = parts;

      // Convert from base64
      const iv = Buffer.from(ivBase64, 'base64');
      const authTag = Buffer.from(authTagBase64, 'base64');

      // Create decipher
      const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
      decipher.setAuthTag(authTag);

      // Decrypt
      let plaintext = decipher.update(ciphertext, 'base64', 'utf8');
      plaintext += decipher.final('utf8');

      return plaintext;
    } catch (error) {
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }

  /**
   * Encrypt sensitive data fields in an object
   * @param data - Object containing sensitive fields
   * @param fields - Array of field names to encrypt
   * @returns Object with encrypted fields
   */
  encryptFields<T extends Record<string, any>>(
    data: T,
    fields: (keyof T)[],
  ): T {
    const encrypted = { ...data };
    for (const field of fields) {
      if (encrypted[field] && typeof encrypted[field] === 'string') {
        encrypted[field] = this.encrypt(encrypted[field] as string) as any;
      }
    }
    return encrypted;
  }

  /**
   * Decrypt sensitive data fields in an object
   * @param data - Object with encrypted fields
   * @param fields - Array of field names to decrypt
   * @returns Object with decrypted fields
   */
  decryptFields<T extends Record<string, any>>(
    data: T,
    fields: (keyof T)[],
  ): T {
    const decrypted = { ...data };
    for (const field of fields) {
      if (decrypted[field] && typeof decrypted[field] === 'string') {
        decrypted[field] = this.decrypt(decrypted[field] as string) as any;
      }
    }
    return decrypted;
  }

  /**
   * Hash a value using SHA-256 (one-way)
   * @param value - Value to hash
   * @returns SHA-256 hash in hex format
   */
  hash(value: string): string {
    return crypto.createHash('sha256').update(value).digest('hex');
  }

  /**
   * Generate a cryptographically secure random token
   * @param bytes - Number of random bytes (default: 32)
   * @returns Random token in hex format
   */
  generateToken(bytes: number = 32): string {
    return crypto.randomBytes(bytes).toString('hex');
  }

  /**
   * Compare two values in constant time (prevents timing attacks)
   * @param a - First value
   * @param b - Second value
   * @returns True if values are equal
   */
  constantTimeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    const bufferA = Buffer.from(a);
    const bufferB = Buffer.from(b);

    return crypto.timingSafeEqual(bufferA, bufferB);
  }
}
