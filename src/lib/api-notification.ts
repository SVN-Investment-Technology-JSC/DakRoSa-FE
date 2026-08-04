import { apiRequest } from './api';
import type { AppNotification } from '@/types/workflow';

export async function getNotifications(): Promise<AppNotification[]> {
  const res = await apiRequest<{ data: AppNotification[] }>('/notifications');
  return res.data;
}

export async function getUnreadCount(): Promise<number> {
  const res = await apiRequest<{ data: { count: number } }>('/notifications/unread-count');
  return res.data.count;
}

export async function markAllRead(): Promise<void> {
  await apiRequest('/notifications/mark-all-read', { method: 'PATCH' });
}

export async function markOneRead(id: string): Promise<void> {
  await apiRequest(`/notifications/${id}/read`, { method: 'PATCH' });
}
