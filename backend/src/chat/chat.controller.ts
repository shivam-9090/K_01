import {
  Controller,
  Get,
  Post,
  Delete,
  Put,
  Param,
  Body,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/auth.guard';
import { ChatService } from './chat.service';
import { StorageService } from '../storage/storage.service';
import { ChatGateway } from './chat.gateway';
import { AttachmentValidator } from '../common/validators/attachment.validator';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(
    private chatService: ChatService,
    private storageService: StorageService,
    private chatGateway: ChatGateway,
  ) {}

  @Get('projects/:projectId/messages')
  async getMessages(
    @Param('projectId') projectId: string,
    @Request() req: any,
  ) {
    const { userId, role } = req.user;
    return this.chatService.getProjectMessages(projectId, userId, role);
  }

  @Get('projects/:projectId/pinned')
  async getPinnedMessages(
    @Param('projectId') projectId: string,
    @Request() req: any,
  ) {
    const { userId, role } = req.user;
    return this.chatService.getPinnedMessages(projectId, userId, role);
  }

  @Post('projects/:projectId/messages')
  @UseInterceptors(FilesInterceptor('files', 5))
  async sendMessage(
    @Param('projectId') projectId: string,
    @Body() body: { message: string },
    @UploadedFiles() files: Array<Express.Multer.File>,
    @Request() req: any,
  ) {
    const { userId, role, companyId } = req.user;
    let attachments: string[] = [];

    // Upload files if provided (L-2 Fix: File validation)
    if (files && files.length > 0) {
      // Validate each file size
      files.forEach((file) => AttachmentValidator.validateFileSize(file));

      const uploadPromises = files.map((file) =>
        this.storageService.saveFile(file, userId),
      );
      const uploadResults = await Promise.all(uploadPromises);
      attachments = uploadResults.map(
        (result) => `/api/storage/files/${result.id}`,
      );

      // Validate attachments array (L-2 Fix: Attachment validation)
      AttachmentValidator.validateAttachments(attachments);
    }

    return this.chatService
      .sendMessage(projectId, userId, role, body.message, attachments)
      .then((chatMessage) => {
        // Broadcast to all users in the room via Socket.IO
        this.chatGateway.server
          .to(`project-${projectId}`)
          .emit('new-message', chatMessage);
        return chatMessage;
      });
  }

  @Put('messages/:messageId/pin')
  async pinMessage(@Param('messageId') messageId: string, @Request() req: any) {
    const { userId, role } = req.user;
    return this.chatService.pinMessage(messageId, userId, role);
  }

  @Delete('messages/:messageId')
  async deleteMessage(
    @Param('messageId') messageId: string,
    @Request() req: any,
  ) {
    const { userId, role } = req.user;
    return this.chatService.deleteMessage(messageId, userId, role);
  }
}
