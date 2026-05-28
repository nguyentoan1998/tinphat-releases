import { create } from 'zustand';
import { notificationApi, AppNotification } from '@/lib/notification-api';
import { connectSocket, disconnectSocket, getSocket } from '@/lib/socket';

interface NotificationState {
    unreadCount: number;
    notifications: AppNotification[];
    loading: boolean;
    initialized: boolean;
    socketConnected: boolean;
    lastSocketNotification: AppNotification | null;
    disabled: boolean;

    fetchUnreadCount: () => Promise<void>;
    fetchNotifications: (opts?: { skip?: number; take?: number }) => Promise<void>;
    markAsRead: (id: string) => Promise<void>;
    markAllAsRead: () => Promise<void>;
    initSocket: (token: string) => void;
    destroySocket: () => void;
    disableNotifications: () => void;
    enableNotifications: () => void;
    reset: () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
    unreadCount: 0,
    notifications: [],
    loading: false,
    initialized: false,
    socketConnected: false,
    lastSocketNotification: null,
    disabled: false,

    fetchUnreadCount: async () => {
        try {
            const res = await notificationApi.getUnreadCount();
            set({ unreadCount: res.count });
        } catch { }
    },

    fetchNotifications: async (opts) => {
        try {
            set({ loading: true });
            const res = await notificationApi.getNotifications({
                take: opts?.take ?? 50,
                skip: opts?.skip ?? 0,
            });
            set({
                notifications: opts?.skip ? [...get().notifications, ...res.items] : res.items,
                loading: false,
                initialized: true,
            });
        } catch {
            set({ loading: false });
        }
    },

    markAsRead: async (id) => {
        try {
            await notificationApi.markAsRead(id);
            set(state => ({
                unreadCount: Math.max(0, state.unreadCount - 1),
                notifications: state.notifications.map(n =>
                    n.id === id ? { ...n, read: true } : n
                ),
            }));
        } catch { }
    },

    markAllAsRead: async () => {
        try {
            await notificationApi.markAllAsRead();
            set(state => ({
                unreadCount: 0,
                notifications: state.notifications.map(n => ({ ...n, read: true })),
            }));
        } catch { }
    },

    initSocket: (token: string) => {
        const s = connectSocket(token);
        s.off('new_notification');
        s.on('new_notification', (notification: AppNotification) => {
            set(state => ({
                unreadCount: state.unreadCount + 1,
                notifications: [notification, ...state.notifications],
                lastSocketNotification: state.disabled ? null : notification,
            }));
        });
        s.off('connect');
        s.on('connect', () => {
            get().fetchUnreadCount();
        });
        set({ socketConnected: true });
    },

    destroySocket: () => {
        const s = getSocket();
        s.off('new_notification');
        s.off('connect');
        disconnectSocket();
        set({ socketConnected: false });
    },

    disableNotifications: () => {
        set({ disabled: true, lastSocketNotification: null });
    },

    enableNotifications: () => {
        set({ disabled: false });
    },

    reset: () => {
        set({
            unreadCount: 0,
            notifications: [],
            loading: false,
            initialized: false,
            socketConnected: false,
            lastSocketNotification: null,
            disabled: false,
        });
    },
}));
