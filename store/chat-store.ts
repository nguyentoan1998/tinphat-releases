import { create } from 'zustand';
import { getSocket } from '@/lib/socket';
import { chatApi } from '@/lib/chat-api';
import type { UploadedChatFile } from '@/lib/upload-api';

export interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  type: 'TEXT' | 'IMAGE' | 'FILE';
  content?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  replyToId?: string;
  createdAt: string;
  updatedAt?: string;
  sender: { id: string; name: string };
  _temp?: boolean;
  _failed?: boolean;
}

export interface ChatRoom {
  id: string;
  type: string;
  participants: any[];
  lastMessage?: ChatMessage;
  unreadCount: number;
  updatedAt: string;
}

interface ChatState {
  rooms: ChatRoom[];
  messages: Record<string, ChatMessage[]>;
  typingUsers: Record<string, string[]>;
  loadingRooms: boolean;
  loadingMessages: Record<string, boolean>;

  loadRooms: () => Promise<void>;
  loadMessages: (roomId: string) => Promise<void>;
  loadMoreMessages: (roomId: string) => Promise<void>;
  sendMessage: (roomId: string, content: string, file?: UploadedChatFile) => Promise<void>;
  markRead: (roomId: string) => void;
  setTyping: (roomId: string, isTyping: boolean) => void;
  initSocket: () => void;
  destroySocket: () => void;
  reset: () => void;
}

let _listenersAttached = false;

export const useChatStore = create<ChatState>((set, get) => ({
  rooms: [],
  messages: {},
  typingUsers: {},
  loadingRooms: false,
  loadingMessages: {},

  loadRooms: async () => {
    set({ loadingRooms: true });
    try {
      const rooms = await chatApi.getRooms();
      set({ rooms });
    } catch (error: any) {
      console.warn(
        '[Chat] Failed to load rooms:',
        error?.response?.status,
        error?.response?.data?.message || error?.message,
      );
      set({ rooms: [] });
    } finally {
      set({ loadingRooms: false });
    }
  },

  loadMessages: async (roomId: string) => {
    set((s) => ({ loadingMessages: { ...s.loadingMessages, [roomId]: true } }));
    try {
      const data = await chatApi.getMessages(roomId);
      set((s) => ({ messages: { ...s.messages, [roomId]: data.messages } }));
    } catch (error: any) {
      console.warn(
        '[Chat] Failed to load messages:',
        error?.response?.status,
        error?.response?.data?.message || error?.message,
      );
    } finally {
      set((s) => ({ loadingMessages: { ...s.loadingMessages, [roomId]: false } }));
    }
  },

  loadMoreMessages: async (roomId: string) => {
    const existing = get().messages[roomId];
    if (!existing || existing.length === 0) return;
    const cursor = existing[0].id;
    try {
      const data = await chatApi.getMessages(roomId, cursor);
      set((s) => ({
        messages: {
          ...s.messages,
          [roomId]: [...data.messages, ...existing],
        },
      }));
    } catch (error: any) {
      console.warn(
        '[Chat] Failed to load more messages:',
        error?.response?.status,
        error?.response?.data?.message || error?.message,
      );
    }
  },

  sendMessage: async (roomId: string, content: string, file?: UploadedChatFile) => {
    const tempId = `temp_${Date.now()}`;
    const isImage = !!file?.mimeType?.startsWith('image/');
    const type: ChatMessage['type'] = file ? (isImage ? 'IMAGE' : 'FILE') : 'TEXT';
    const tempMsg: ChatMessage = {
      id: tempId,
      roomId,
      senderId: '',
      type,
      content,
      fileUrl: file?.url,
      fileName: file?.fileName,
      fileSize: file?.fileSize,
      mimeType: file?.mimeType,
      createdAt: new Date().toISOString(),
      sender: { id: '', name: '' },
      _temp: true,
    };

    set((s) => ({
      messages: {
        ...s.messages,
        [roomId]: [...(s.messages[roomId] || []), tempMsg],
      },
    }));

    getSocket().emit('chat:send', { roomId, type, content, ...(file ? { fileUrl: file.url, fileName: file.fileName, fileSize: file.fileSize, mimeType: file.mimeType } : {}) });
  },

  markRead: (roomId: string) => {
    getSocket().emit('chat:read', { roomId });
    set((s) => {
      const rooms = s.rooms.map((r) =>
        r.id === roomId ? { ...r, unreadCount: 0 } : r
      );
      return { rooms };
    });
  },

  setTyping: (roomId: string, isTyping: boolean) => {
    getSocket().emit('chat:typing', { roomId, isTyping });
  },

  initSocket: () => {
    if (_listenersAttached) return;
    _listenersAttached = true;
    const socket = getSocket();

    socket.on('chat:message', (message: ChatMessage) => {
      set((s) => {
        const current = s.messages[message.roomId] || [];
        let removedTemp = false;
        const filtered = current.filter((m) => {
          if (!m._temp || removedTemp) return true;
          const isSameText = m.type === 'TEXT' && message.type === 'TEXT' && m.content === message.content;
          const isSameFile = m.type !== 'TEXT' && message.type !== 'TEXT' && m.fileName === message.fileName;
          if (isSameText || isSameFile) {
            removedTemp = true;
            return false;
          }
          return true;
        });
        return {
          messages: { ...s.messages, [message.roomId]: [...filtered, message] },
          rooms: s.rooms.map((r) =>
            r.id === message.roomId
              ? { ...r, lastMessage: message, updatedAt: message.createdAt }
              : r
          ),
        };
      });
    });

    socket.on('chat:typing', ({ userId, roomId, isTyping }: { userId: string; roomId: string; isTyping: boolean }) => {
      set((s) => {
        const current = s.typingUsers[roomId] || [];
        const updated = isTyping
          ? (current.includes(userId) ? current : [...current, userId])
          : current.filter((id) => id !== userId);
        return {
          typingUsers: { ...s.typingUsers, [roomId]: updated },
        };
      });
    });

    socket.on('chat:read', ({ userId, roomId }: { userId: string; roomId: string }) => {
      // Could update read status in messages
    });
  },

  destroySocket: () => {
    if (!_listenersAttached) return;
    const socket = getSocket();
    socket.off('chat:message');
    socket.off('chat:typing');
    socket.off('chat:read');
    _listenersAttached = false;
  },

  reset: () => {
    get().destroySocket();
    set({ rooms: [], messages: {}, typingUsers: {} });
  },
}));
