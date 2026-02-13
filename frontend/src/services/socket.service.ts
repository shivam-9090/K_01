import io from "socket.io-client";

const SOCKET_URL =
  import.meta.env.VITE_API_URL?.replace("/api", "") || "http://localhost:3000";

class SocketService {
  private socket: ReturnType<typeof io> | null = null;

  connect() {
    if (!this.socket) {
      this.socket = io(`${SOCKET_URL}/chat`, {
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        autoConnect: true, // Auto-connect for better UX
      });

      this.socket.on("connect", () => {});

      this.socket.on("disconnect", () => {});

      this.socket.on("reconnect", (attemptNumber: number) => {});

      this.socket.on("error", (error: any) => {});
    }
    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  getSocket() {
    return this.socket;
  }

  // Join a project chat room
  joinProject(projectId: string, userId: string, role: string) {
    if (this.socket) {
      this.socket.emit("join-project", { projectId, userId, role });
    }
  }

  // Leave a project chat room
  leaveProject(projectId: string) {
    if (this.socket) {
      this.socket.emit("leave-project", { projectId });
    }
  }

  // Send a message
  sendMessage(
    projectId: string,
    userId: string,
    role: string,
    message: string,
    attachments: string[] = [],
  ) {
    if (this.socket) {
      this.socket.emit("send-message", {
        projectId,
        userId,
        role,
        message,
        attachments,
      });
    }
  }

  // Pin/unpin a message
  pinMessage(
    messageId: string,
    userId: string,
    role: string,
    projectId: string,
  ) {
    if (this.socket) {
      this.socket.emit("pin-message", { messageId, userId, role, projectId });
    }
  }

  // Delete a message
  deleteMessage(
    messageId: string,
    userId: string,
    role: string,
    projectId: string,
  ) {
    if (this.socket) {
      this.socket.emit("delete-message", {
        messageId,
        userId,
        role,
        projectId,
      });
    }
  }

  // Emit typing indicator
  typing(
    projectId: string,
    userId: string,
    userName: string,
    isTyping: boolean,
  ) {
    if (this.socket) {
      this.socket.emit("typing", { projectId, userId, userName, isTyping });
    }
  }

  // Listen for events
  on(event: string, callback: (...args: any[]) => void) {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  // Remove event listener
  off(event: string, callback?: (...args: any[]) => void) {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }
}

export const socketService = new SocketService();
export default socketService;
