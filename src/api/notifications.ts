import { apiClient } from './client';

export interface ApiNotification {
  id: string;
  userId: string;
  type: string;
  title: string;
  body?: string | null;
  link?: string | null;
  readAt?: string | null;
  createdAt: string;
}

export function getNotifications(unreadOnly = false): Promise<ApiNotification[]> {
  return apiClient
    .get('/notifications', { params: unreadOnly ? { unread: 'true' } : undefined })
    .then((r) => r.data);
}

export function getUnreadCount(): Promise<{ count: number }> {
  return apiClient.get('/notifications/unread-count').then((r) => r.data);
}

export function markNotificationRead(id: string): Promise<ApiNotification> {
  return apiClient.patch(`/notifications/${id}/read`).then((r) => r.data);
}

export function markAllNotificationsRead(): Promise<{ updated: number }> {
  return apiClient.patch('/notifications/read-all').then((r) => r.data);
}
