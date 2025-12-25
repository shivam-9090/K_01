import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  Req,
  Res,
  BadRequestException,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { StorageService } from './storage.service';
import { JwtAuthGuard } from '../auth/guards/auth.guard';

@Controller('storage')
@UseGuards(JwtAuthGuard)
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file: Express.Multer.File, @Req() req: any) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const userId = req.user.sub;
    const uploadedFile = await this.storageService.saveFile(file, userId);

    return {
      statusCode: HttpStatus.CREATED,
      message: 'File uploaded successfully',
      data: {
        id: uploadedFile.id,
        filename: uploadedFile.originalName,
        size: uploadedFile.size,
        mimetype: uploadedFile.mimetype,
        uploadedAt: uploadedFile.uploadedAt,
      },
    };
  }

  @Get(':id')
  async getFile(@Param('id') id: string, @Res() res: Response) {
    const fileBuffer = await this.storageService.getFile(id);
    const metadata = await this.storageService.getFileMetadata(id);

    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${metadata.filename}"`,
    );
    res.send(fileBuffer);
  }

  @Get(':id/metadata')
  async getFileMetadata(@Param('id') id: string) {
    const metadata = await this.storageService.getFileMetadata(id);

    return {
      statusCode: HttpStatus.OK,
      data: metadata,
    };
  }

  @Delete(':id')
  async deleteFile(@Param('id') id: string, @Req() req: any) {
    await this.storageService.deleteFile(id);

    return {
      statusCode: HttpStatus.OK,
      message: 'File deleted successfully',
    };
  }

  @Get()
  async listFiles() {
    const files = await this.storageService.listFiles();

    return {
      statusCode: HttpStatus.OK,
      data: { files },
    };
  }
}
