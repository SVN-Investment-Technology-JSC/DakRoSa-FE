export interface AppNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  resourceType: string | null;
  resourceId: string | null;
  actionUrl: string | null;
  payload: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationInbox {
  items: AppNotification[];
  unreadCount: number;
}
