import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  // Check if user has access to project chat (no restrictions - everyone can chat)
  async checkProjectAccess(
    projectId: string,
    userId: string,
    role: string,
  ): Promise<boolean> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    // If project exists, everyone has access
    return !!project;
  }

  // Get all messages for a project
  async getProjectMessages(projectId: string, userId: string, role: string) {
    // No permission check - everyone can see messages

    const messages = await this.prisma.projectChat.findMany({
      where: { projectId },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: [
        { isPinned: 'desc' }, // Pinned messages first
        { createdAt: 'asc' }, // Then chronological order
      ],
    });

    return messages;
  }

  // Send a message
  async sendMessage(
    projectId: string,
    userId: string,
    role: string,
    message: string,
    attachments: string[] = [],
  ) {
    // No permission check - everyone can send messages

    const chatMessage = await this.prisma.projectChat.create({
      data: {
        projectId,
        senderId: userId,
        message,
        attachments,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    return chatMessage;
  }

  // Pin a message (BOSS only)
  async pinMessage(messageId: string, userId: string, role: string) {
    if (role !== 'BOSS') {
      throw new ForbiddenException('Only BOSS can pin messages');
    }

    const message = await this.prisma.projectChat.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    const updatedMessage = await this.prisma.projectChat.update({
      where: { id: messageId },
      data: {
        isPinned: !message.isPinned,
        pinnedBy: message.isPinned ? null : userId,
        pinnedAt: message.isPinned ? null : new Date(),
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    return updatedMessage;
  }

  // Delete a message
  async deleteMessage(messageId: string, userId: string, role: string) {
    const message = await this.prisma.projectChat.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    // Only message sender or BOSS can delete
    if (message.senderId !== userId && role !== 'BOSS') {
      throw new ForbiddenException('You can only delete your own messages');
    }

    await this.prisma.projectChat.delete({
      where: { id: messageId },
    });

    return { success: true, message: 'Message deleted' };
  }

  // Get pinned messages
  async getPinnedMessages(projectId: string, userId: string, role: string) {
    const hasAccess = await this.checkProjectAccess(projectId, userId, role);
    if (!hasAccess) {
      throw new ForbiddenException(
        'You do not have access to this project chat',
      );
    }

    const pinnedMessages = await this.prisma.projectChat.findMany({
      where: {
        projectId,
        isPinned: true,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: {
        pinnedAt: 'desc',
      },
    });

    return pinnedMessages;
  }
}
