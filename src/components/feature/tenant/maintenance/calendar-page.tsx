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
const demoWeekDays = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

type DemoMaintenanceTask = {
  id: string;
  title: string;
  equipment: string;
  type: 'planned' | 'corrective';
  description: string;
  assignee: string;
  date: string;
  checklist: { label: string; done: boolean }[];
  attachments: { name: string; size: string; type: string }[];
};

const MOCK_TASKS: Record<string, DemoMaintenanceTask[]> = {
  '2024-07-10': [
    {
      id: 'T01',
      title: 'Kiểm tra hệ thống làm mát',
      equipment: 'Tuabin T1',
      type: 'planned',
      description:
        'Kiểm tra nhiệt độ vận hành, độ sạch bộ lọc và tình trạng quạt gió của tuabin để đảm bảo hệ thống làm mát hoạt động ổn định trong mùa cao điểm.',
      assignee: 'Đội vận hành điện - Nguyễn Văn A',
      date: '2024-07-10T08:30:00',
      checklist: [
        { label: 'Kiểm tra áp suất nước làm mát', done: true },
        { label: 'Vệ sinh bộ lọc gió', done: true },
        { label: 'Đo nhiệt độ đầu ra tuabin', done: false },
        { label: 'Xác nhận không có tiếng ồn bất thường', done: false },
      ],
      attachments: [
        { name: 'checklist-lam-mat.pdf', size: '1.2 MB', type: 'PDF' },
        { name: 'hinh-anh-tuabin-01.jpg', size: '845 KB', type: 'Ảnh' },
      ],
    },
  ],
  '2024-07-15': [
    {
      id: 'T02',
      title: 'Thay dầu máy phát G2',
      equipment: 'Máy phát G2',
      type: 'planned',
      description:
        'Thay dầu bôi trơn theo lịch định kỳ, kiểm tra mức độ hao mòn và theo dõi nhiệt độ máy phát trong quá trình vận hành.',
      assignee: 'Đội bảo dưỡng cơ khí',
      date: '2024-07-15T09:00:00',
      checklist: [
        { label: 'Xả dầu cũ theo tiêu chuẩn', done: true },
        { label: 'Lắp dầu mới đúng mức', done: true },
        { label: 'Kiểm tra rò rỉ ở bộ lọc', done: false },
      ],
      attachments: [{ name: 'bao-cao-thay-dau.xlsx', size: '350 KB', type: 'Excel' }],
    },
    {
      id: 'T03',
      title: 'Sửa chữa rò rỉ đường ống',
      equipment: 'Hệ thống ống dẫn',
      type: 'corrective',
      description:
        'Khắc phục hiện tượng rò rỉ ở đoạn ống dẫn trung tâm, kiểm tra áp suất và thay thế phụ tùng nếu cần thiết.',
      assignee: 'Đội kỹ thuật phụ trợ',
      date: '2024-07-15T14:00:00',
      checklist: [
        { label: 'Tắt nguồn lưu lượng cần kiểm tra', done: true },
        { label: 'Đóng van tạm thời', done: true },
        { label: 'Thay gasket mới', done: false },
        { label: 'Kiểm tra lại áp suất sau sửa', done: false },
      ],
      attachments: [{ name: 'anh-xac-minh-ro-ri.png', size: '1.6 MB', type: 'Ảnh' }],
    },
  ],
  '2024-07-22': [
    {
      id: 'T04',
      title: 'Bảo trì định kỳ tủ điện',
      equipment: 'Tủ điện trung thế',
      type: 'planned',
      description:
        'Thực hiện vệ sinh, kiểm tra điện áp, liên kết dây và nhiệt độ trong tủ điện theo quy trình bảo trì định kỳ.',
      assignee: 'Đội điện năng',
      date: '2024-07-22T07:30:00',
      checklist: [
        { label: 'Vệ sinh khoang tủ điện', done: true },
        { label: 'Kiểm tra cầu chì và ổ cắm', done: true },
        { label: 'Đo nhiệt độ các nhánh dây', done: false },
      ],
      attachments: [{ name: 'thu-tu-kiem-tra-tu-dien.pdf', size: '680 KB', type: 'PDF' }],
    },
  ],
  '2024-08-05': [
    {
      id: 'T05',
      title: 'Kiểm tra cảm biến áp suất',
      equipment: 'Tuabin T2',
      type: 'planned',
      description:
        'Đo và hiệu chuẩn cảm biến áp suất tuabin T2, so sánh dữ liệu đo với thông số kỹ thuật và báo cáo lệch nếu có.',
      assignee: 'Đội đo lường',
      date: '2024-08-05T11:00:00',
      checklist: [
        { label: 'Hiệu chuẩn cảm biến', done: false },
        { label: 'Kiểm tra kết nối đầu vào', done: false },
        { label: 'Lưu giá trị đo trước/sau hiệu chuẩn', done: false },
      ],
      attachments: [],
    },
  ],
};
const demoWeekDays = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

type DemoMaintenanceTask = {
  id: string;
  title: string;
  equipment: string;
  type: 'planned' | 'corrective';
  description: string;
  assignee: string;
  date: string;
  checklist: { label: string; done: boolean }[];
  attachments: { name: string; size: string; type: string }[];
};

const MOCK_TASKS: Record<string, DemoMaintenanceTask[]> = {
  '2024-07-10': [
    {
      id: 'T01',
      title: 'Kiểm tra hệ thống làm mát',
      equipment: 'Tuabin T1',
      type: 'planned',
      description:
        'Kiểm tra nhiệt độ vận hành, độ sạch bộ lọc và tình trạng quạt gió của tuabin để đảm bảo hệ thống làm mát hoạt động ổn định trong mùa cao điểm.',
      assignee: 'Đội vận hành điện - Nguyễn Văn A',
      date: '2024-07-10T08:30:00',
      checklist: [
        { label: 'Kiểm tra áp suất nước làm mát', done: true },
        { label: 'Vệ sinh bộ lọc gió', done: true },
        { label: 'Đo nhiệt độ đầu ra tuabin', done: false },
        { label: 'Xác nhận không có tiếng ồn bất thường', done: false },
      ],
      attachments: [
        { name: 'checklist-lam-mat.pdf', size: '1.2 MB', type: 'PDF' },
        { name: 'hinh-anh-tuabin-01.jpg', size: '845 KB', type: 'Ảnh' },
      ],
    },
  ],
  '2024-07-15': [
    {
      id: 'T02',
      title: 'Thay dầu máy phát G2',
      equipment: 'Máy phát G2',
      type: 'planned',
      description:
        'Thay dầu bôi trơn theo lịch định kỳ, kiểm tra mức độ hao mòn và theo dõi nhiệt độ máy phát trong quá trình vận hành.',
      assignee: 'Đội bảo dưỡng cơ khí',
      date: '2024-07-15T09:00:00',
      checklist: [
        { label: 'Xả dầu cũ theo tiêu chuẩn', done: true },
        { label: 'Lắp dầu mới đúng mức', done: true },
        { label: 'Kiểm tra rò rỉ ở bộ lọc', done: false },
      ],
      attachments: [{ name: 'bao-cao-thay-dau.xlsx', size: '350 KB', type: 'Excel' }],
    },
    {
      id: 'T03',
      title: 'Sửa chữa rò rỉ đường ống',
      equipment: 'Hệ thống ống dẫn',
      type: 'corrective',
      description:
        'Khắc phục hiện tượng rò rỉ ở đoạn ống dẫn trung tâm, kiểm tra áp suất và thay thế phụ tùng nếu cần thiết.',
      assignee: 'Đội kỹ thuật phụ trợ',
      date: '2024-07-15T14:00:00',
      checklist: [
        { label: 'Tắt nguồn lưu lượng cần kiểm tra', done: true },
        { label: 'Đóng van tạm thời', done: true },
        { label: 'Thay gasket mới', done: false },
        { label: 'Kiểm tra lại áp suất sau sửa', done: false },
      ],
      attachments: [{ name: 'anh-xac-minh-ro-ri.png', size: '1.6 MB', type: 'Ảnh' }],
    },
  ],
  '2024-07-22': [
    {
      id: 'T04',
      title: 'Bảo trì định kỳ tủ điện',
      equipment: 'Tủ điện trung thế',
      type: 'planned',
      description:
        'Thực hiện vệ sinh, kiểm tra điện áp, liên kết dây và nhiệt độ trong tủ điện theo quy trình bảo trì định kỳ.',
      assignee: 'Đội điện năng',
      date: '2024-07-22T07:30:00',
      checklist: [
        { label: 'Vệ sinh khoang tủ điện', done: true },
        { label: 'Kiểm tra cầu chì và ổ cắm', done: true },
        { label: 'Đo nhiệt độ các nhánh dây', done: false },
      ],
      attachments: [{ name: 'thu-tu-kiem-tra-tu-dien.pdf', size: '680 KB', type: 'PDF' }],
    },
  ],
  '2024-08-05': [
    {
      id: 'T05',
      title: 'Kiểm tra cảm biến áp suất',
      equipment: 'Tuabin T2',
      type: 'planned',
      description:
        'Đo và hiệu chuẩn cảm biến áp suất tuabin T2, so sánh dữ liệu đo với thông số kỹ thuật và báo cáo lệch nếu có.',
      assignee: 'Đội đo lường',
      date: '2024-08-05T11:00:00',
      checklist: [
        { label: 'Hiệu chuẩn cảm biến', done: false },
        { label: 'Kiểm tra kết nối đầu vào', done: false },
        { label: 'Lưu giá trị đo trước/sau hiệu chuẩn', done: false },
      ],
      attachments: [],
    },
  ],
};

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

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function eachDayOfInterval({ start, end }: { start: Date; end: Date }) {
  const days: Date[] = [];
  const cursor = new Date(start);

  while (cursor <= end) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return days;
}

function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function subMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() - amount, 1);
}

function isSameMonth(date: Date, compare: Date) {
  return date.getMonth() === compare.getMonth() && date.getFullYear() === compare.getFullYear();
}

function isToday(date: Date) {
  const today = new Date();
  return date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth() && date.getDate() === today.getDate();
}

function getDay(date: Date) {
  return date.getDay();
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function eachDayOfInterval({ start, end }: { start: Date; end: Date }) {
  const days: Date[] = [];
  const cursor = new Date(start);

  while (cursor <= end) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return days;
}

function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function subMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() - amount, 1);
}

function isSameMonth(date: Date, compare: Date) {
  return date.getMonth() === compare.getMonth() && date.getFullYear() === compare.getFullYear();
}

function isToday(date: Date) {
  const today = new Date();
  return date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth() && date.getDate() === today.getDate();
}

function getDay(date: Date) {
  return date.getDay();
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
  const isDemoMode = tenantSlug === 'dakrosa';

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
    if (isDemoMode) {
      return;
    }
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load, tenantSlug, isDemoMode]);

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

  if (isDemoMode) {
    return (
      <Protected permission={PERMISSIONS.MAINTENANCE_SCHEDULE_VIEW}>
        <MaintenanceShell
          tenantSlug={tenantSlug}
          title="Lịch bảo trì"
          description="Dữ liệu demo cho tháng 7/2024 để kiểm tra giao diện lịch bảo trì trước khi tích hợp API thực tế."
          actions={
            <Button
              variant="outline"
              className="border-white/25 bg-white/10 text-white hover:bg-white/18 hover:text-white"
              onClick={() => window.location.reload()}
            >
              <CalendarDays />
              Demo data
            </Button>
          }
        >
          <MockMaintenanceCalendar />
        </MaintenanceShell>
      </Protected>
    );
  }

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

function MockMaintenanceCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date('2024-07-01'));
  const [selectedTask, setSelectedTask] = useState<DemoMaintenanceTask | null>(null);
  const firstDayOfMonth = startOfMonth(currentDate);
  const lastDayOfMonth = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({
    start: firstDayOfMonth,
    end: lastDayOfMonth,
  });
  const startingDayIndex = getDay(firstDayOfMonth);

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-[#DFE7DE] bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-[#E7ECE6] bg-[#F7FAF8] px-4 py-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
              Demo
            </p>
            <h3 className="text-xl font-black capitalize text-[#2D3A31]">
              {currentDate.toLocaleDateString('vi-VN', {
                month: 'long',
                year: 'numeric',
              })}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentDate(subMonths(currentDate, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentDate(addMonths(currentDate, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-7 border-b border-[#E7ECE6] bg-[#F8FAF7]">
          {demoWeekDays.map((day) => (
            <div
              key={day}
              className="px-2 py-2 text-center text-[11px] font-black tracking-wide text-[#7A857D]"
            >
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {Array.from({ length: startingDayIndex }).map((_, index) => (
            <div
              key={`empty-${index}`}
              className="min-h-[122px] border-b border-r border-[#EDF1EC] bg-[#FAFBF9]"
            />
          ))}

          {daysInMonth.map((day) => {
            const key = dateKey(day);
            const tasksForDay = MOCK_TASKS[key] || [];

            return (
              <div
                key={day.toString()}
                className={`min-h-[122px] border-b border-r border-[#EDF1EC] bg-white p-2 ${
                  !isSameMonth(day, currentDate) ? 'text-[#A0A8A2]' : ''
                }`}
              >
                <time
                  dateTime={key}
                  className={`grid size-6 place-items-center rounded-full text-xs font-bold ${
                    isToday(day) ? 'bg-emerald-600 text-white' : ''
                  }`}
                >
                  {day.getDate()}
                </time>

                <div className="mt-2 space-y-1.5">
                  {tasksForDay.map((task) => (
                    <button
                      key={task.id}
                      type="button"
                      onClick={() => setSelectedTask(task)}
                      className={`w-full rounded-md border-l-2 px-1.5 py-1 text-left text-[10px] font-bold transition hover:opacity-90 ${
                        task.type === 'planned'
                          ? 'border-blue-500 bg-blue-50 text-blue-800'
                          : 'border-orange-500 bg-orange-50 text-orange-800'
                      }`}
                    >
                      <p className="truncate font-black">{task.title}</p>
                      <p className="truncate opacity-80">{task.equipment}</p>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {selectedTask ? (
        <div
          className="fixed inset-0 z-50 bg-slate-900/30 backdrop-blur-[1px]"
          onClick={() => setSelectedTask(null)}
        >
          <aside
            className="absolute inset-y-0 right-0 w-full max-w-lg overflow-y-auto border-l border-[#DDE5DE] bg-white p-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-[#EDF1EC] pb-4">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-700">
                  {selectedTask.type === 'planned' ? 'Bảo trì định kỳ' : 'Sửa chữa khẩn cấp'}
                </p>
                <h4 className="mt-2 text-2xl font-black text-[#27322C]">
                  {selectedTask.title}
                </h4>
              </div>
              <Button variant="outline" size="icon" onClick={() => setSelectedTask(null)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="mt-5 space-y-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-[#EDF1EC] bg-[#F8FAF8] p-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#738076]">
                    Thiết bị
                  </p>
                  <p className="mt-2 text-sm font-bold text-[#2F3C34]">{selectedTask.equipment}</p>
                </div>
                <div className="rounded-xl border border-[#EDF1EC] bg-[#F8FAF8] p-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#738076]">
                    Người phụ trách
                  </p>
                  <p className="mt-2 text-sm font-bold text-[#2F3C34]">{selectedTask.assignee}</p>
                </div>
              </div>

              <div className="rounded-xl border border-[#EDF1EC] bg-[#F7FAF8] p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#738076]">
                  Mô tả công việc
                </p>
                <p className="mt-2 text-sm leading-6 text-[#42514A]">{selectedTask.description}</p>
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#738076]">
                  Lịch thực hiện
                </p>
                <p className="mt-2 text-sm font-semibold text-[#2F3C34]">
                  {new Date(selectedTask.date).toLocaleString('vi-VN', {
                    dateStyle: 'full',
                    timeStyle: 'short',
                  })}
                </p>
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#738076]">
                  Checklist
                </p>
                <div className="mt-3 space-y-2">
                  {selectedTask.checklist.map((item) => (
                    <label
                      key={item.label}
                      className="flex items-center gap-3 rounded-lg border border-[#EDF1EC] bg-[#F9FBF9] px-3 py-2"
                    >
                      <input
                        type="checkbox"
                        checked={item.done}
                        readOnly
                        className="h-4 w-4 accent-emerald-600"
                      />
                      <span
                        className={`text-sm ${
                          item.done ? 'text-[#5A665F] line-through' : 'text-[#2F3C34]'
                        }`}
                      >
                        {item.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#738076]">
                  Tài liệu đính kèm
                </p>
                {selectedTask.attachments.length ? (
                  <div className="mt-3 space-y-2">
                    {selectedTask.attachments.map((attachment) => (
                      <div
                        key={attachment.name}
                        className="flex items-center justify-between rounded-lg border border-[#EDF1EC] bg-[#F8FAF8] px-3 py-2"
                      >
                        <div>
                          <p className="text-sm font-semibold text-[#2F3C34]">
                            {attachment.name}
                          </p>
                          <p className="text-[11px] text-[#738076]">
                            {attachment.type} · {attachment.size}
                          </p>
                        </div>
                        <span className="rounded-md bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">
                          Xem
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-3 rounded-lg border border-dashed border-[#DDE5DE] bg-[#FAFBF9] p-4 text-sm text-[#6E7A72]">
                    Không có tài liệu đính kèm cho công việc này.
                  </div>
                )}
              </div>
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}

function MockMaintenanceCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date('2024-07-01'));
  const [selectedTask, setSelectedTask] = useState<DemoMaintenanceTask | null>(null);
  const firstDayOfMonth = startOfMonth(currentDate);
  const lastDayOfMonth = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({
    start: firstDayOfMonth,
    end: lastDayOfMonth,
  });
  const startingDayIndex = getDay(firstDayOfMonth);

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-[#DFE7DE] bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-[#E7ECE6] bg-[#F7FAF8] px-4 py-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
              Demo
            </p>
            <h3 className="text-xl font-black capitalize text-[#2D3A31]">
              {currentDate.toLocaleDateString('vi-VN', {
                month: 'long',
                year: 'numeric',
              })}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentDate(subMonths(currentDate, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentDate(addMonths(currentDate, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-7 border-b border-[#E7ECE6] bg-[#F8FAF7]">
          {demoWeekDays.map((day) => (
            <div
              key={day}
              className="px-2 py-2 text-center text-[11px] font-black tracking-wide text-[#7A857D]"
            >
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {Array.from({ length: startingDayIndex }).map((_, index) => (
            <div
              key={`empty-${index}`}
              className="min-h-[122px] border-b border-r border-[#EDF1EC] bg-[#FAFBF9]"
            />
          ))}

          {daysInMonth.map((day) => {
            const key = dateKey(day);
            const tasksForDay = MOCK_TASKS[key] || [];

            return (
              <div
                key={day.toString()}
                className={`min-h-[122px] border-b border-r border-[#EDF1EC] bg-white p-2 ${
                  !isSameMonth(day, currentDate) ? 'text-[#A0A8A2]' : ''
                }`}
              >
                <time
                  dateTime={key}
                  className={`grid size-6 place-items-center rounded-full text-xs font-bold ${
                    isToday(day) ? 'bg-emerald-600 text-white' : ''
                  }`}
                >
                  {day.getDate()}
                </time>

                <div className="mt-2 space-y-1.5">
                  {tasksForDay.map((task) => (
                    <button
                      key={task.id}
                      type="button"
                      onClick={() => setSelectedTask(task)}
                      className={`w-full rounded-md border-l-2 px-1.5 py-1 text-left text-[10px] font-bold transition hover:opacity-90 ${
                        task.type === 'planned'
                          ? 'border-blue-500 bg-blue-50 text-blue-800'
                          : 'border-orange-500 bg-orange-50 text-orange-800'
                      }`}
                    >
                      <p className="truncate font-black">{task.title}</p>
                      <p className="truncate opacity-80">{task.equipment}</p>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {selectedTask ? (
        <div
          className="fixed inset-0 z-50 bg-slate-900/30 backdrop-blur-[1px]"
          onClick={() => setSelectedTask(null)}
        >
          <aside
            className="absolute inset-y-0 right-0 w-full max-w-lg overflow-y-auto border-l border-[#DDE5DE] bg-white p-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-[#EDF1EC] pb-4">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-700">
                  {selectedTask.type === 'planned' ? 'Bảo trì định kỳ' : 'Sửa chữa khẩn cấp'}
                </p>
                <h4 className="mt-2 text-2xl font-black text-[#27322C]">
                  {selectedTask.title}
                </h4>
              </div>
              <Button variant="outline" size="icon" onClick={() => setSelectedTask(null)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="mt-5 space-y-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-[#EDF1EC] bg-[#F8FAF8] p-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#738076]">
                    Thiết bị
                  </p>
                  <p className="mt-2 text-sm font-bold text-[#2F3C34]">{selectedTask.equipment}</p>
                </div>
                <div className="rounded-xl border border-[#EDF1EC] bg-[#F8FAF8] p-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#738076]">
                    Người phụ trách
                  </p>
                  <p className="mt-2 text-sm font-bold text-[#2F3C34]">{selectedTask.assignee}</p>
                </div>
              </div>

              <div className="rounded-xl border border-[#EDF1EC] bg-[#F7FAF8] p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#738076]">
                  Mô tả công việc
                </p>
                <p className="mt-2 text-sm leading-6 text-[#42514A]">{selectedTask.description}</p>
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#738076]">
                  Lịch thực hiện
                </p>
                <p className="mt-2 text-sm font-semibold text-[#2F3C34]">
                  {new Date(selectedTask.date).toLocaleString('vi-VN', {
                    dateStyle: 'full',
                    timeStyle: 'short',
                  })}
                </p>
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#738076]">
                  Checklist
                </p>
                <div className="mt-3 space-y-2">
                  {selectedTask.checklist.map((item) => (
                    <label
                      key={item.label}
                      className="flex items-center gap-3 rounded-lg border border-[#EDF1EC] bg-[#F9FBF9] px-3 py-2"
                    >
                      <input
                        type="checkbox"
                        checked={item.done}
                        readOnly
                        className="h-4 w-4 accent-emerald-600"
                      />
                      <span
                        className={`text-sm ${
                          item.done ? 'text-[#5A665F] line-through' : 'text-[#2F3C34]'
                        }`}
                      >
                        {item.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#738076]">
                  Tài liệu đính kèm
                </p>
                {selectedTask.attachments.length ? (
                  <div className="mt-3 space-y-2">
                    {selectedTask.attachments.map((attachment) => (
                      <div
                        key={attachment.name}
                        className="flex items-center justify-between rounded-lg border border-[#EDF1EC] bg-[#F8FAF8] px-3 py-2"
                      >
                        <div>
                          <p className="text-sm font-semibold text-[#2F3C34]">
                            {attachment.name}
                          </p>
                          <p className="text-[11px] text-[#738076]">
                            {attachment.type} · {attachment.size}
                          </p>
                        </div>
                        <span className="rounded-md bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">
                          Xem
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-3 rounded-lg border border-dashed border-[#DDE5DE] bg-[#FAFBF9] p-4 text-sm text-[#6E7A72]">
                    Không có tài liệu đính kèm cho công việc này.
                  </div>
                )}
              </div>
            </div>
          </aside>
        </div>
      ) : null}
    </>
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
