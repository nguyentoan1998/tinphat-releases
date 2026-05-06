import { apiClient } from './api-client';

// ─── Types ─────────────────────────────────────────────────────
export type NotificationType =
    | 'NEW_ORDER'
    | 'PRODUCTION_COMPLETED'
    | 'LOW_STOCK'
    | 'GOODS_RECEIPT'
    | 'GENERAL';

export interface AppNotification {
    id: string;
    type: NotificationType;
    title: string;
    body: string;
    data?: Record<string, unknown>;
    read: boolean;
    sentAt: string | null;
    createdAt: string;
    userId: string;
}

export interface NotificationListResponse {
    items: AppNotification[];
    total: number;
    unreadCount: number;
    hasMore: boolean;
}

export interface RegisterDeviceDto {
    token: string;
    platform: 'ios' | 'android';
}

// ─── API ───────────────────────────────────────────────────────
export const notificationApi = {
    getNotifications: (params?: {
        take?: number;
        skip?: number;
        unreadOnly?: boolean;
    }): Promise<NotificationListResponse> =>
        apiClient.get('/notifications', { params }),

    getUnreadCount: (): Promise<{ count: number }> =>
        apiClient.get('/notifications/unread-count'),

    markAsRead: (id: string): Promise<{ success: boolean }> =>
        apiClient.patch(`/notifications/${id}/read`, {}),

    markAllAsRead: (): Promise<{ success: boolean }> =>
        apiClient.patch('/notifications/read-all', {}),

    registerDevice: (dto: RegisterDeviceDto): Promise<void> =>
        apiClient.post('/notifications/device', dto),

    unregisterDevice: (token: string): Promise<void> =>
        apiClient.delete(`/notifications/device/${token}`),
};
