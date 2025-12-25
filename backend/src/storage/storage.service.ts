import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { promises as fs } from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

export interface UploadedFile {
  id: string;
  originalName: string;
  filename: string;
  path: string;
  size: number;
  mimetype: string;
  uploadedAt: Date;
}

@Injectable()
export class StorageService {
  private readonly uploadDir = path.join(process.cwd(), 'uploads');
  private readonly maxFileSize = 10 * 1024 * 1024; // 10MB
  private readonly allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ];

  constructor() {
    this.ensureUploadDirectory();
  }

  private async ensureUploadDirectory() {
    try {
      await fs.access(this.uploadDir);
    } catch {
      await fs.mkdir(this.uploadDir, { recursive: true });
    }
  }

  async saveFile(
    file: Express.Multer.File,
    userId: string,
  ): Promise<UploadedFile> {
    // Validate file
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    if (file.size > this.maxFileSize) {
      throw new BadRequestException(
        `File size exceeds ${this.maxFileSize / 1024 / 1024}MB limit`,
      );
    }

    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('File type not allowed');
    }

    // Generate unique filename
    const fileId = uuidv4();
    const ext = path.extname(file.originalname);
    const filename = `${fileId}${ext}`;
    const filePath = path.join(this.uploadDir, filename);

    // Save file
    await fs.writeFile(filePath, file.buffer);

    // Return file metadata
    return {
      id: fileId,
      originalName: file.originalname,
      filename,
      path: filePath,
      size: file.size,
      mimetype: file.mimetype,
      uploadedAt: new Date(),
    };
  }

  async getFile(fileId: string): Promise<Buffer> {
    const files = await fs.readdir(this.uploadDir);
    const file = files.find((f) => f.startsWith(fileId));

    if (!file) {
      throw new NotFoundException('File not found');
    }

    const filePath = path.join(this.uploadDir, file);
    return fs.readFile(filePath);
  }

  async deleteFile(fileId: string): Promise<void> {
    const files = await fs.readdir(this.uploadDir);
    const file = files.find((f) => f.startsWith(fileId));

    if (!file) {
      throw new NotFoundException('File not found');
    }

    const filePath = path.join(this.uploadDir, file);
    await fs.unlink(filePath);
  }

  async getFileMetadata(fileId: string): Promise<any> {
    const files = await fs.readdir(this.uploadDir);
    const file = files.find((f) => f.startsWith(fileId));

    if (!file) {
      throw new NotFoundException('File not found');
    }

    const filePath = path.join(this.uploadDir, file);
    const stats = await fs.stat(filePath);

    return {
      id: fileId,
      filename: file,
      size: stats.size,
      createdAt: stats.birthtime,
      modifiedAt: stats.mtime,
    };
  }

  async listFiles(): Promise<string[]> {
    const files = await fs.readdir(this.uploadDir);
    return files;
  }

  // For production: Integrate with cloud storage (AWS S3, Google Cloud Storage, Azure Blob)
  async uploadToCloud(file: Express.Multer.File): Promise<string> {
    // TODO: Implement cloud storage upload
    // Example with AWS S3:
    // const params = {
    //   Bucket: process.env.S3_BUCKET,
    //   Key: `uploads/${uuidv4()}${path.extname(file.originalname)}`,
    //   Body: file.buffer,
    //   ContentType: file.mimetype,
    // };
    // const result = await this.s3.upload(params).promise();
    // return result.Location;

    throw new Error('Cloud storage not configured');
  }
}
