import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards } from '@nestjs/common';
import { ChatService } from './chat.service';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private chatService: ChatService) {}

  private userSocketMap = new Map<string, string>(); // userId -> socketId

  handleConnection(client: Socket) {}

  handleDisconnect(client: Socket) {
    // Remove from map
    for (const [userId, socketId] of this.userSocketMap.entries()) {
      if (socketId === client.id) {
        this.userSocketMap.delete(userId);
        break;
      }
    }
  }

  @SubscribeMessage('join-project')
  async handleJoinProject(
    @MessageBody() data: { projectId: string; userId: string; role: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      // Verify user has access
      const hasAccess = await this.chatService.checkProjectAccess(
        data.projectId,
        data.userId,
        data.role,
      );

      if (!hasAccess) {
        client.emit('error', { message: 'Access denied to this project chat' });
        return;
      }

      // Join the project room
      client.join(`project-${data.projectId}`);
      this.userSocketMap.set(data.userId, client.id);

      // Send existing messages
      const messages = await this.chatService.getProjectMessages(
        data.projectId,
        data.userId,
        data.role,
      );
      client.emit('project-messages', messages);
    } catch (error) {
      client.emit('error', { message: error.message });
    }
  }

  @SubscribeMessage('leave-project')
  handleLeaveProject(
    @MessageBody() data: { projectId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.leave(`project-${data.projectId}`);
  }

  @SubscribeMessage('send-message')
  async handleSendMessage(
    @MessageBody()
    data: {
      projectId: string;
      userId: string;
      role: string;
      message: string;
      attachments?: string[];
    },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const chatMessage = await this.chatService.sendMessage(
        data.projectId,
        data.userId,
        data.role,
        data.message,
        data.attachments || [],
      );

      // Broadcast to all users in the project room
      this.server
        .to(`project-${data.projectId}`)
        .emit('new-message', chatMessage);
    } catch (error) {
      client.emit('error', { message: error.message });
    }
  }

  @SubscribeMessage('pin-message')
  async handlePinMessage(
    @MessageBody()
    data: {
      messageId: string;
      userId: string;
      role: string;
      projectId: string;
    },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const updatedMessage = await this.chatService.pinMessage(
        data.messageId,
        data.userId,
        data.role,
      );

      // Broadcast to all users in the project room
      this.server
        .to(`project-${data.projectId}`)
        .emit('message-pinned', updatedMessage);
    } catch (error) {
      client.emit('error', { message: error.message });
    }
  }

  @SubscribeMessage('delete-message')
  async handleDeleteMessage(
    @MessageBody()
    data: {
      messageId: string;
      userId: string;
      role: string;
      projectId: string;
    },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      await this.chatService.deleteMessage(
        data.messageId,
        data.userId,
        data.role,
      );

      // Broadcast to all users in the project room
      this.server
        .to(`project-${data.projectId}`)
        .emit('message-deleted', { messageId: data.messageId });
    } catch (error) {
      client.emit('error', { message: error.message });
    }
  }

  @SubscribeMessage('typing')
  handleTyping(
    @MessageBody()
    data: {
      projectId: string;
      userId: string;
      userName: string;
      isTyping: boolean;
    },
    @ConnectedSocket() client: Socket,
  ) {
    // Broadcast typing indicator to other users in the room
    client.broadcast.to(`project-${data.projectId}`).emit('user-typing', {
      userId: data.userId,
      userName: data.userName,
      isTyping: data.isTyping,
    });
  }
}
