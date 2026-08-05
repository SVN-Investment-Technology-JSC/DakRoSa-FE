import { apiRequest } from './api';
import type { AppNotification, NotificationInbox } from '@/types/notification';

export const notificationsApi = {
  getInbox: (unreadOnly = false) =>
    apiRequest<NotificationInbox>(
      `/notifications${unreadOnly ? '?unreadOnly=true' : ''}`,
    ),
  markRead: (id: string) =>
    apiRequest<AppNotification>(`/notifications/${id}/read`, {
      method: 'PATCH',
    }),
  markAllRead: () =>
    apiRequest<{ success: boolean }>('/notifications/read-all', {
      method: 'PATCH',
    }),
};
