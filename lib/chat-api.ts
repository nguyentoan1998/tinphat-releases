import { apiClient } from './api-client';
import type { ChatRoom, ChatMessage } from '@/store/chat-store';
import { isMissingChatTableApiError } from './chat-error';

interface MessagesResponse {
  messages: ChatMessage[];
  cursor: string | null;
}

export const chatApi = {
  getRooms: async (): Promise<ChatRoom[]> => {
    try {
      return await apiClient.get('/chat/rooms');
    } catch (error) {
      if (isMissingChatTableApiError(error)) return [];
      throw error;
    }
  },
  createRoom: (userIds: string[]): Promise<ChatRoom> => apiClient.post('/chat/rooms', { userIds }),
  getMessages: (roomId: string, cursor?: string, limit = 20): Promise<MessagesResponse> =>
    apiClient.get(`/chat/rooms/${roomId}/messages`, { params: { cursor, limit } }),
  sendMessage: (roomId: string, data: any): Promise<ChatMessage> =>
    apiClient.post(`/chat/rooms/${roomId}/messages`, data),
  editMessage: (id: string, content: string): Promise<ChatMessage> =>
    apiClient.patch(`/chat/messages/${id}`, { content }),
  deleteMessage: (id: string): Promise<void> => apiClient.delete(`/chat/messages/${id}`),
};
