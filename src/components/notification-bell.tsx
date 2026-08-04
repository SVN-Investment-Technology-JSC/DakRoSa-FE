/* eslint-disable */
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Bell, CheckCheck, X } from 'lucide-react';
import {
  getNotifications,
  getUnreadCount,
  markAllRead,
  markOneRead,
} from '@/lib/api-notification';
import type { AppNotification } from '@/types/workflow';

const TYPE_ICON: Record<string, string> = {
  work_order_assigned: '📋',
  work_order_sla_warning: '⏰',
  work_order_overdue: '🔴',
  workflow_task_assigned: '✅',
  workflow_task_rejected: '↩️',
  workflow_completed: '🎉',
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Vừa xong';
  if (mins < 60) return `${mins} phút trước`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} giờ trước`;
  return `${Math.floor(hrs / 24)} ngày trước`;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);

  const reload = useCallback(async () => {
    try {
      const [notifs, count] = await Promise.all([getNotifications(), getUnreadCount()]);
      setNotifications(notifs);
      setUnread(count);
    } catch {
      // không có quyền hoặc chưa đăng nhập
    }
  }, []);

  useEffect(() => {
    void reload();
    // Poll mỗi 30 giây
    const timer = setInterval(() => void reload(), 30_000);
    return () => clearInterval(timer);
  }, [reload]);

  // Close when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleMarkAll = async () => {
    await markAllRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnread(0);
  };

  const handleMarkOne = async (id: string) => {
    await markOneRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
    );
    setUnread((c) => Math.max(0, c - 1));
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        id="notification-bell-btn"
        onClick={() => setOpen((p) => !p)}
        className="relative flex size-9 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
        aria-label="Thông báo"
      >
        <Bell size={20} />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 top-11 z-50 w-80 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <span className="font-semibold text-sm text-gray-700">
              Thông báo {unread > 0 && <span className="text-red-500">({unread})</span>}
            </span>
            <div className="flex items-center gap-2">
              {unread > 0 && (
                <button
                  onClick={handleMarkAll}
                  title="Đánh dấu tất cả đã đọc"
                  className="text-gray-400 hover:text-green-600 transition"
                >
                  <CheckCheck size={16} />
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Notification list */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-10 text-center text-xs text-gray-400">
                Không có thông báo nào
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`flex gap-3 border-b border-gray-50 px-4 py-3 transition hover:bg-gray-50 ${
                    !n.isRead ? 'bg-blue-50/40' : ''
                  }`}
                >
                  <span className="mt-0.5 text-lg">{TYPE_ICON[n.type] ?? '🔔'}</span>
                  <div className="flex-1 min-w-0">
                    {n.actionUrl ? (
                      <Link
                        href={n.actionUrl}
                        onClick={() => { if (!n.isRead) void handleMarkOne(n.id); setOpen(false); }}
                        className="block font-medium text-xs text-gray-800 hover:text-[#386948]"
                      >
                        {n.title}
                      </Link>
                    ) : (
                      <p className="font-medium text-xs text-gray-800">{n.title}</p>
                    )}
                    {n.body && (
                      <p className="mt-0.5 text-[11px] text-gray-500 line-clamp-2">{n.body}</p>
                    )}
                    <p className="mt-1 text-[10px] text-gray-400">{timeAgo(n.createdAt)}</p>
                  </div>
                  {!n.isRead && (
                    <button
                      onClick={() => void handleMarkOne(n.id)}
                      className="mt-1 size-2 flex-none rounded-full bg-blue-500 hover:bg-blue-700 transition"
                      title="Đánh dấu đã đọc"
                    />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
