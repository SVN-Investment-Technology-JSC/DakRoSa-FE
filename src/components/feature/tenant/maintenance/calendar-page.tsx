'use client';

import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  ClipboardCheck,
  Filter,
  SkipForward,
  Wrench,
} from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Protected } from '@/components/protected';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { equipmentApi } from '@/lib/api-equipment';
import { maintenanceApi } from '@/lib/api-maintenance';
import { PERMISSIONS } from '@/lib/navigation';
import { hasPermission } from '@/lib/permissions';
import { useAuth } from '@/providers/auth-provider';
import { tenancyService } from '@/services/tenancy.service';
import type { Equipment } from '@/types/equipment';
import type { MaintenanceOccurrence } from '@/types/maintenance';
import type { Site } from '@/types/tenancy';
import { MaintenanceShell } from './maintenance-shell';

const weekDays = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

function monthRange(cursor: Date) {
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const start = new Date(first);
  const mondayOffset = (first.getDay() + 6) % 7;
  start.setDate(first.getDate() - mondayOffset);
  const end = new Date(start);
  end.setDate(start.getDate() + 42);
  return { start, end };
}

function dateKey(value: Date | string) {
  const date = typeof value === 'string' ? new Date(value) : value;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`;
}

export function MaintenanceCalendarPage({
  tenantSlug,
}: {
  tenantSlug: string;
}) {
  const { user } = useAuth();
  const canManage = hasPermission(
    user,
    PERMISSIONS.MAINTENANCE_SCHEDULE_MANAGE,
  );
  const [cursor, setCursor] = useState(() => new Date());
  const [occurrences, setOccurrences] = useState<MaintenanceOccurrence[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [siteId, setSiteId] = useState('');
  const [equipmentId, setEquipmentId] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const range = useMemo(() => monthRange(cursor), [cursor]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [calendar, equipmentResult, tenancy] = await Promise.all([
        maintenanceApi.getCalendar(
          range.start.toISOString(),
          range.end.toISOString(),
          {
            siteId: siteId || undefined,
            equipmentId: equipmentId || undefined,
            status: status || undefined,
          },
        ),
        equipmentApi.getAll(),
        tenancyService.getSettings(),
      ]);
      setOccurrences(calendar);
      setEquipment(equipmentResult);
      setSites(tenancy.sites);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể tải lịch bảo trì.');
    } finally {
      setLoading(false);
    }
  }, [equipmentId, range.end, range.start, siteId, status]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load, tenantSlug]);

  const days = useMemo(
    () =>
      Array.from({ length: 42 }, (_, index) => {
        const day = new Date(range.start);
        day.setDate(range.start.getDate() + index);
        return day;
      }),
    [range.start],
  );

  const grouped = useMemo(() => {
    const result = new Map<string, MaintenanceOccurrence[]>();
    for (const occurrence of occurrences) {
      const key = dateKey(occurrence.plannedStartAt);
      result.set(key, [...(result.get(key) ?? []), occurrence]);
    }
    return result;
  }, [occurrences]);

  const upcoming = useMemo(
    () =>
      occurrences
        .filter(
          (item) =>
            ['planned', 'generated'].includes(item.status) &&
            new Date(item.plannedStartAt) >= new Date(),
        )
        .sort(
          (a, b) =>
            new Date(a.plannedStartAt).getTime() -
            new Date(b.plannedStartAt).getTime(),
        )
        .slice(0, 12),
    [occurrences],
  );

  const moveMonth = (offset: number) => {
    setCursor((value) => new Date(value.getFullYear(), value.getMonth() + offset, 1));
  };

  const skipOccurrence = async (occurrence: MaintenanceOccurrence) => {
    const reason = window.prompt(
      `Lý do bỏ qua lịch “${occurrence.schedule?.name ?? 'Bảo trì'}” (có thể để trống):`,
      '',
    );
    if (reason === null) return;
    try {
      await maintenanceApi.skipOccurrence(occurrence.id, reason || undefined);
      await load();
      toast.success('Đã bỏ qua occurrence.');
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Không thể bỏ qua occurrence.',
      );
    }
  };

  return (
    <Protected permission={PERMISSIONS.MAINTENANCE_SCHEDULE_VIEW}>
      <MaintenanceShell
        tenantSlug={tenantSlug}
        title="Lịch bảo trì"
        description="Quan sát occurrence được sinh từ mọi trigger theo tháng, lọc theo nhà máy/thiết bị và mở nhanh phiếu công việc đã tạo."
        actions={
          <Button
            variant="outline"
            className="border-white/25 bg-white/10 text-white hover:bg-white/18 hover:text-white"
            onClick={() => setCursor(new Date())}
          >
            <CalendarDays />
            Hôm nay
          </Button>
        }
      >
        <section className="flex flex-wrap items-center gap-3 rounded-2xl border border-[#DFE7DE] bg-white p-4 shadow-sm">
          <span className="flex items-center gap-2 text-sm font-black text-[#3A473F]">
            <Filter size={16} className="text-emerald-700" />
            Bộ lọc
          </span>
          <select
            className="h-9 min-w-44 rounded-md border border-input bg-white px-3 text-sm"
            value={siteId}
            onChange={(event) => {
              setSiteId(event.target.value);
              setEquipmentId('');
            }}
          >
            <option value="">Tất cả nhà máy</option>
            {sites.map((site) => (
              <option key={site.id} value={site.id}>
                {site.name}
              </option>
            ))}
          </select>
          <select
            className="h-9 min-w-52 rounded-md border border-input bg-white px-3 text-sm"
            value={equipmentId}
            onChange={(event) => setEquipmentId(event.target.value)}
          >
            <option value="">Tất cả thiết bị</option>
            {equipment
              .filter((item) => !siteId || !item.siteId || item.siteId === siteId)
              .map((item) => (
                <option key={item.id} value={item.id}>
                  {item.code} · {item.name}
                </option>
              ))}
          </select>
          <select
            className="h-9 min-w-40 rounded-md border border-input bg-white px-3 text-sm"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="">Mọi trạng thái</option>
            <option value="planned">Dự kiến</option>
            <option value="generated">Đã sinh phiếu</option>
            <option value="completed">Hoàn thành</option>
            <option value="skipped">Bỏ qua</option>
            <option value="cancelled">Đã hủy</option>
          </select>
          <Badge variant="outline" className="ml-auto">
            {occurrences.length} occurrence
          </Badge>
        </section>

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
          <div className="overflow-hidden rounded-2xl border border-[#DFE7DE] bg-white shadow-sm">
            <header className="flex items-center justify-between border-b border-[#E7ECE6] px-4 py-3">
              <Button variant="ghost" size="icon" onClick={() => moveMonth(-1)}>
                <ChevronLeft />
              </Button>
              <strong className="text-base capitalize text-[#2D3A31]">
                {cursor.toLocaleDateString('vi-VN', {
                  month: 'long',
                  year: 'numeric',
                })}
              </strong>
              <Button variant="ghost" size="icon" onClick={() => moveMonth(1)}>
                <ChevronRight />
              </Button>
            </header>

            <div className="hidden grid-cols-7 border-b border-[#E7ECE6] bg-[#F8FAF7] sm:grid">
              {weekDays.map((day) => (
                <div
                  key={day}
                  className="px-2 py-2 text-center text-[11px] font-black tracking-wide text-[#7A857D]"
                >
                  {day}
                </div>
              ))}
            </div>
            <div className="hidden grid-cols-7 sm:grid">
              {days.map((day) => {
                const key = dateKey(day);
                const items = grouped.get(key) ?? [];
                const muted = day.getMonth() !== cursor.getMonth();
                const today = key === dateKey(new Date());
                return (
                  <div
                    key={key}
                    className={`min-h-28 border-b border-r border-[#EDF1EC] p-2 ${
                      muted ? 'bg-[#FAFBF9] text-[#A0A8A2]' : 'bg-white'
                    }`}
                  >
                    <span
                      className={`grid size-6 place-items-center rounded-full text-xs font-bold ${
                        today ? 'bg-emerald-600 text-white' : ''
                      }`}
                    >
                      {day.getDate()}
                    </span>
                    <div className="mt-1 grid gap-1">
                      {items.slice(0, 3).map((occurrence) => (
                        <Link
                          key={occurrence.id}
                          href={
                            occurrence.workOrderId
                              ? `/t/${tenantSlug}/work-orders/${occurrence.workOrderId}`
                              : `/t/${tenantSlug}/maintenance/schedules`
                          }
                          className={`truncate rounded-md border-l-2 px-1.5 py-1 text-[10px] font-bold ${
                            occurrence.status === 'generated'
                              ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                              : 'border-blue-500 bg-blue-50 text-blue-800'
                          }`}
                          title={
                            occurrence.schedule?.name ??
                            occurrence.equipment?.name ??
                            'Bảo trì'
                          }
                        >
                          {new Date(occurrence.plannedStartAt).toLocaleTimeString(
                            'vi-VN',
                            { hour: '2-digit', minute: '2-digit' },
                          )}{' '}
                          {occurrence.equipment?.code ?? 'PM'}
                        </Link>
                      ))}
                      {items.length > 3 ? (
                        <span className="px-1 text-[10px] font-bold text-[#6F7A72]">
                          +{items.length - 3} việc
                        </span>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="divide-y divide-[#E8EDE7] sm:hidden">
              {upcoming.length ? (
                upcoming.map((occurrence) => (
                  <OccurrenceRow
                    key={occurrence.id}
                    occurrence={occurrence}
                    tenantSlug={tenantSlug}
                    canManage={canManage}
                    onSkip={skipOccurrence}
                  />
                ))
              ) : (
                <div className="p-10 text-center text-sm text-[#7B857E]">
                  Không có lịch trong khoảng này.
                </div>
              )}
            </div>
          </div>

          <aside className="overflow-hidden rounded-2xl border border-[#DFE7DE] bg-white shadow-sm">
            <header className="border-b border-[#E7ECE6] px-4 py-3">
              <strong className="text-sm text-[#334039]">Sắp đến hạn</strong>
              <p className="mt-0.5 text-xs text-[#7A857D]">
                Danh sách ưu tiên theo thời gian
              </p>
            </header>
            <div className="max-h-[620px] divide-y divide-[#EDF1EC] overflow-y-auto">
              {loading ? (
                Array.from({ length: 5 }, (_, index) => (
                  <div key={index} className="h-20 animate-pulse bg-[#F5F8F4]" />
                ))
              ) : upcoming.length ? (
                upcoming.map((occurrence) => (
                  <OccurrenceRow
                    key={occurrence.id}
                    occurrence={occurrence}
                    tenantSlug={tenantSlug}
                    canManage={canManage}
                    onSkip={skipOccurrence}
                  />
                ))
              ) : (
                <div className="grid place-items-center px-5 py-12 text-center">
                  <CalendarDays className="text-[#9BA69D]" />
                  <strong className="mt-3 text-sm text-[#435047]">Không có việc sắp tới</strong>
                </div>
              )}
            </div>
          </aside>
        </section>
      </MaintenanceShell>
    </Protected>
  );
}

function OccurrenceRow({
  occurrence,
  tenantSlug,
  canManage,
  onSkip,
}: {
  occurrence: MaintenanceOccurrence;
  tenantSlug: string;
  canManage: boolean;
  onSkip: (occurrence: MaintenanceOccurrence) => void;
}) {
  const overdue =
    occurrence.dueAt &&
    new Date(occurrence.dueAt) < new Date() &&
    occurrence.status === 'planned';
  return (
    <div className="flex items-center gap-2 p-4 transition hover:bg-[#F5F9F4]">
      <Link
        href={
          occurrence.workOrderId
            ? `/t/${tenantSlug}/work-orders/${occurrence.workOrderId}`
            : `/t/${tenantSlug}/maintenance/schedules`
        }
        className="flex min-w-0 flex-1 gap-3"
      >
        <span
          className={`grid size-9 shrink-0 place-items-center rounded-xl ${
            overdue
              ? 'bg-red-50 text-red-600'
              : occurrence.status === 'generated'
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-blue-50 text-blue-700'
          }`}
        >
          {overdue ? (
            <CircleAlert size={17} />
          ) : occurrence.status === 'generated' ? (
            <ClipboardCheck size={17} />
          ) : (
            <Wrench size={17} />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <strong className="block truncate text-sm text-[#354139]">
            {occurrence.schedule?.name ?? 'Bảo trì định kỳ'}
          </strong>
          <span className="mt-0.5 block truncate text-xs text-[#7A857D]">
            {occurrence.equipment
              ? `${occurrence.equipment.code} · ${occurrence.equipment.name}`
              : 'Chưa xác định thiết bị'}
          </span>
          <span className="mt-1 block text-[11px] font-bold text-[#657169]">
            {new Date(occurrence.plannedStartAt).toLocaleString('vi-VN', {
              day: '2-digit',
              month: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </span>
      </Link>
      {canManage && occurrence.status === 'planned' ? (
        <Button
          size="icon-xs"
          variant="ghost"
          className="shrink-0 text-[#7D8780] hover:text-amber-700"
          aria-label="Bỏ qua occurrence"
          onClick={() => onSkip(occurrence)}
        >
          <SkipForward />
        </Button>
      ) : null}
    </div>
  );
}
