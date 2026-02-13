import { api } from "./api";

export interface ChatMessage {
  id: string;
  message: string;
  projectId: string;
  senderId: string;
  sender: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  attachments: string[];
  isPinned: boolean;
  pinnedBy: string | null;
  pinnedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

const chatService = {
  // Get all messages for a project
  getMessages: async (projectId: string): Promise<ChatMessage[]> => {
    const response = await api.get(`/chat/projects/${projectId}/messages`);
    return response.data;
  },

  // Get pinned messages
  getPinnedMessages: async (projectId: string): Promise<ChatMessage[]> => {
    const response = await api.get(`/chat/projects/${projectId}/pinned`);
    return response.data;
  },

  // Send a message with files
  sendMessageWithFiles: async (
    projectId: string,
    message: string,
    files?: File[]
  ): Promise<ChatMessage> => {
    const formData = new FormData();
    formData.append("message", message);

    if (files && files.length > 0) {
      files.forEach((file) => {
        formData.append("files", file);
      });
    }

    const response = await api.post(
      `/chat/projects/${projectId}/messages`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return response.data;
  },

  // Pin/unpin a message
  pinMessage: async (messageId: string): Promise<ChatMessage> => {
    const response = await api.put(`/chat/messages/${messageId}/pin`);
    return response.data;
  },

  // Delete a message
  deleteMessage: async (messageId: string): Promise<void> => {
    await api.delete(`/chat/messages/${messageId}`);
  },
};

export default chatService;
