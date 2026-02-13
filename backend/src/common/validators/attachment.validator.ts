import { BadRequestException } from '@nestjs/common';

/**
 * L-2 Fix: ProjectChat Attachments Validation
 * Validates attachment URLs, file types, and sizes
 */
export class AttachmentValidator {
  // Allowed file extensions for security
  private static readonly ALLOWED_EXTENSIONS = [
    // Documents
    '.pdf',
    '.doc',
    '.docx',
    '.xls',
    '.xlsx',
    '.ppt',
    '.pptx',
    '.txt',
    '.csv',
    // Images
    '.jpg',
    '.jpeg',
    '.png',
    '.gif',
    '.svg',
    '.webp',
    // Archives
    '.zip',
    '.rar',
    '.7z',
    '.tar',
    '.gz',
    // Code
    '.js',
    '.ts',
    '.jsx',
    '.tsx',
    '.json',
    '.xml',
    '.html',
    '.css',
  ];

  // Max file size: 10MB
  private static readonly MAX_FILE_SIZE = 10 * 1024 * 1024;

  // Max attachments per message
  private static readonly MAX_ATTACHMENTS = 5;

  /**
   * Validates an array of attachment URLs
   * @param attachments - Array of attachment URLs/paths
   * @throws BadRequestException if invalid
   */
  static validateAttachments(attachments: string[]): void {
    if (!attachments || attachments.length === 0) {
      return; // Empty is valid
    }

    // Check max count
    if (attachments.length > this.MAX_ATTACHMENTS) {
      throw new BadRequestException(
        `Too many attachments. Maximum allowed: ${this.MAX_ATTACHMENTS}`,
      );
    }

    // Validate each attachment
    attachments.forEach((attachment, index) => {
      this.validateSingleAttachment(attachment, index);
    });
  }

  /**
   * Validates a single attachment URL
   */
  private static validateSingleAttachment(
    attachment: string,
    index: number,
  ): void {
    if (!attachment || typeof attachment !== 'string') {
      throw new BadRequestException(
        `Attachment at index ${index} is invalid (empty or not a string)`,
      );
    }

    // Check URL format (must start with / or http)
    if (
      !attachment.startsWith('/') &&
      !attachment.startsWith('http://') &&
      !attachment.startsWith('https://')
    ) {
      throw new BadRequestException(
        `Attachment at index ${index} has invalid URL format: ${attachment}`,
      );
    }

    // Extract file extension
    const extension = this.getFileExtension(attachment);
    if (!extension) {
      throw new BadRequestException(
        `Attachment at index ${index} has no file extension: ${attachment}`,
      );
    }

    // Validate extension
    if (!this.ALLOWED_EXTENSIONS.includes(extension.toLowerCase())) {
      throw new BadRequestException(
        `Attachment at index ${index} has disallowed file type: ${extension}. Allowed types: ${this.ALLOWED_EXTENSIONS.join(', ')}`,
      );
    }

    // Check for malicious patterns
    if (this.containsMaliciousPattern(attachment)) {
      throw new BadRequestException(
        `Attachment at index ${index} contains malicious pattern`,
      );
    }
  }

  /**
   * Validates file size (for multer uploads)
   */
  static validateFileSize(file: Express.Multer.File): void {
    if (!file) return;

    if (file.size > this.MAX_FILE_SIZE) {
      throw new BadRequestException(
        `File "${file.originalname}" exceeds maximum size of ${Math.round(this.MAX_FILE_SIZE / 1024 / 1024)}MB`,
      );
    }
  }

  /**
   * Extracts file extension from URL/path
   */
  private static getFileExtension(url: string): string | null {
    // Remove query string and hash
    const cleanUrl = url.split('?')[0].split('#')[0];

    // Get extension
    const match = cleanUrl.match(/\.([a-zA-Z0-9]+)$/);
    return match ? `.${match[1]}` : null;
  }

  /**
   * Checks for malicious patterns (path traversal, etc.)
   */
  private static containsMaliciousPattern(url: string): boolean {
    const maliciousPatterns = [
      '../', // Path traversal
      '..\\', // Windows path traversal
      '%2e%2e%2f', // URL-encoded path traversal
      '%2e%2e%5c',
      '<script', // XSS attempt
      'javascript:', // JS execution
      'data:', // Data URI (can contain scripts)
      'file://', // Local file access
    ];

    const lowerUrl = url.toLowerCase();
    return maliciousPatterns.some((pattern) => lowerUrl.includes(pattern));
  }

  /**
   * Sanitizes attachment URLs
   * @param attachments - Array of attachment URLs
   * @returns Sanitized attachment URLs
   */
  static sanitizeAttachments(attachments: string[]): string[] {
    if (!attachments) return [];

    return attachments
      .filter((att) => att && typeof att === 'string')
      .map((att) => att.trim())
      .filter((att) => att.length > 0)
      .slice(0, this.MAX_ATTACHMENTS); // Enforce max limit
  }

  /**
   * Gets human-readable file size
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }
}
