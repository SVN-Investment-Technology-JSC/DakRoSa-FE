'use client';

import { Bell, CheckCheck, CircleAlert, Clock3, Inbox } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  notificationsCleared,
} from '@/store/notifications.slice';
import { useAppDispatch, useAppSelector } from '@/store/hooks';

function relativeTime(value: string) {
  const minutes = Math.max(
    0,
    Math.round((Date.now() - new Date(value).getTime()) / 60_000),
  );
  if (minutes < 1) return 'Vừa xong';
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  return `${Math.floor(hours / 24)} ngày trước`;
}

export function NotificationCenter({ tenantSlug }: { tenantSlug: string }) {
  const dispatch = useAppDispatch();
  const { items, unreadCount, status } = useAppSelector(
    (state) => state.notifications,
  );
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(() => {
    void dispatch(fetchNotifications(false));
  }, [dispatch]);

  useEffect(() => {
    dispatch(notificationsCleared());
    refresh();
    const timer = window.setInterval(refresh, 45_000);
    return () => window.clearInterval(timer);
  }, [dispatch, refresh, tenantSlug]);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener('mousedown', close);
    return () => window.removeEventListener('mousedown', close);
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="relative grid size-10 place-items-center rounded-xl border border-[#DDE5DC] bg-white text-[#59615A] hover:bg-[#F0F5EE]"
        aria-label={`Thông báo${unreadCount ? `, ${unreadCount} chưa đọc` : ''}`}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <Bell size={19} />
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-red-500 px-1 text-[10px] font-black text-white ring-2 ring-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        ) : null}
      </Button>

      {open ? (
        <section className="absolute right-0 top-12 z-50 w-[min(92vw,390px)] overflow-hidden rounded-2xl border border-[#DDE5DC] bg-white shadow-[0_22px_70px_rgba(26,42,31,0.20)]">
          <header className="flex items-center justify-between border-b border-[#E6ECE5] px-4 py-3">
            <div>
              <strong className="block text-sm text-[#26352B]">Thông báo</strong>
              <span className="text-xs text-[#718078]">
                {unreadCount ? `${unreadCount} việc chưa đọc` : 'Bạn đã xem hết'}
              </span>
            </div>
            {unreadCount ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => void dispatch(markAllNotificationsRead())}
                className="text-xs text-primary"
              >
                <CheckCheck size={15} />
                Đọc tất cả
              </Button>
            ) : null}
          </header>

          <div className="max-h-[430px] overflow-y-auto p-2">
            {status === 'loading' && !items.length ? (
              <div className="grid gap-2 p-2">
                {Array.from({ length: 3 }, (_, index) => (
                  <div
                    key={index}
                    className="h-20 animate-pulse rounded-xl bg-[#F0F4EF]"
                  />
                ))}
              </div>
            ) : items.length ? (
              items.map((item) => {
                const href = item.actionUrl?.startsWith('/t/')
                  ? item.actionUrl.replace(/^\/t\/[^/]+/, `/t/${tenantSlug}`)
                  : item.actionUrl?.startsWith('/')
                    ? `/t/${tenantSlug}${item.actionUrl}`
                    : `/t/${tenantSlug}/work-items`;
                return (
                  <Link
                    key={item.id}
                    href={href}
                    onClick={() => {
                      setOpen(false);
                      if (!item.readAt) void dispatch(markNotificationRead(item.id));
                    }}
                    className={cn(
                      'group flex gap-3 rounded-xl p-3 transition hover:bg-[#F2F7F1]',
                      !item.readAt && 'bg-[#F4FAF3]',
                    )}
                  >
                    <span
                      className={cn(
                        'mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl',
                        item.type.includes('overdue')
                          ? 'bg-red-50 text-red-600'
                          : 'bg-emerald-50 text-emerald-700',
                      )}
                    >
                      {item.type.includes('overdue') ? (
                        <CircleAlert size={17} />
                      ) : (
                        <Inbox size={17} />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-start gap-2">
                        <strong className="min-w-0 flex-1 text-sm leading-5 text-[#2C342E]">
                          {item.title}
                        </strong>
                        {!item.readAt ? (
                          <span className="mt-1.5 size-2 shrink-0 rounded-full bg-emerald-500" />
                        ) : null}
                      </span>
                      <span className="mt-0.5 line-clamp-2 block text-xs leading-5 text-[#6B766E]">
                        {item.message}
                      </span>
                      <span className="mt-1 flex items-center gap-1 text-[11px] text-[#8A948D]">
                        <Clock3 size={11} />
                        {relativeTime(item.createdAt)}
                      </span>
                    </span>
                  </Link>
                );
              })
            ) : (
              <div className="grid place-items-center px-5 py-10 text-center">
                <span className="grid size-11 place-items-center rounded-2xl bg-[#F0F4EF] text-[#7A857C]">
                  <Bell size={20} />
                </span>
                <strong className="mt-3 text-sm text-[#334039]">
                  Chưa có thông báo
                </strong>
                <span className="mt-1 text-xs text-[#7A857C]">
                  Việc được giao và nhắc hạn sẽ xuất hiện tại đây.
                </span>
              </div>
            )}
          </div>
        </section>
      ) : null}
    </div>
  );
}
