import React, { useState } from 'react';
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
  useUnreadNotificationCount,
} from '../hooks/useNotifications';

function timeAgo(iso: string): string {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return 'vừa xong';
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  return `${Math.round(hours / 24)} ngày trước`;
}

const ICON_BY_TYPE: Record<string, string> = {
  maintenance_due: 'build',
  task_assigned: 'assignment',
};

export const NotificationBell: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { data: unread } = useUnreadNotificationCount();
  // The badge only needs a count; the list waits until the panel is opened.
  const { data: notifications = [], isLoading } = useNotifications(isOpen);
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const unreadCount = unread?.count ?? 0;

  return (
    <>
      {isOpen && <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />}

      <div className="relative">
        <button
          aria-label="Thông báo"
          title="Thông báo"
          onClick={() => setIsOpen((open) => !open)}
          className="p-2 hover:text-slate-600 transition-colors rounded-lg hover:bg-slate-50 relative"
        >
          <span className="material-symbols-outlined text-xl">notifications</span>
          {unreadCount > 0 && (
            <span className="absolute top-0.5 right-0.5 min-w-4 h-4 px-1 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {isOpen && (
          <div className="absolute right-0 top-11 w-80 sm:w-96 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">Thông báo</span>
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllRead.mutate()}
                  className="text-[11px] font-semibold text-blue-600 hover:text-blue-700"
                >
                  Đánh dấu đã đọc tất cả
                </button>
              )}
            </div>

            <div className="max-h-96 overflow-y-auto custom-scrollbar divide-y divide-slate-100">
              {isLoading && <p className="px-4 py-6 text-xs text-slate-500">Đang tải…</p>}
              {!isLoading && notifications.length === 0 && (
                <p className="px-4 py-6 text-xs text-slate-500 text-center">
                  Chưa có thông báo nào.
                </p>
              )}
              {notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => !n.readAt && markRead.mutate(n.id)}
                  className={`w-full text-left px-4 py-3 flex gap-3 hover:bg-slate-50 transition-colors ${
                    n.readAt ? '' : 'bg-blue-50/40'
                  }`}
                >
                  <span
                    className={`material-symbols-outlined text-lg shrink-0 mt-0.5 ${
                      n.readAt ? 'text-slate-400' : 'text-blue-600'
                    }`}
                  >
                    {ICON_BY_TYPE[n.type] ?? 'notifications'}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-bold text-slate-800">{n.title}</span>
                    {n.body && (
                      <span className="block text-[11px] text-slate-600 mt-0.5">{n.body}</span>
                    )}
                    <span className="block text-[10px] text-slate-400 mt-1 font-medium">
                      {timeAgo(n.createdAt)}
                    </span>
                  </span>
                  {!n.readAt && (
                    <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0 mt-1.5" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
};
