'use client';

import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  Clock3,
  ListChecks,
  Plus,
  Route,
  Sparkles,
  Wrench,
} from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Protected } from '@/components/protected';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { maintenanceApi } from '@/lib/api-maintenance';
import { workOrderApi } from '@/lib/api-work-order';
import { workflowApi } from '@/lib/api-workflow';
import { PERMISSIONS } from '@/lib/navigation';
import type {
  MaintenanceJobPlan,
  MaintenanceOccurrence,
  MaintenanceSchedule,
} from '@/types/maintenance';
import type { WorkOrder } from '@/types/work-order';
import type { WorkflowDefinition } from '@/types/workflow';
import { MaintenanceShell } from './maintenance-shell';

interface OverviewData {
  schedules: MaintenanceSchedule[];
  jobPlans: MaintenanceJobPlan[];
  workflows: WorkflowDefinition[];
  occurrences: MaintenanceOccurrence[];
  workOrders: WorkOrder[];
}

const emptyData: OverviewData = {
  schedules: [],
  jobPlans: [],
  workflows: [],
  occurrences: [],
  workOrders: [],
};

function startOfToday() {
  const value = new Date();
  value.setHours(0, 0, 0, 0);
  return value;
}

export function MaintenancePage({ tenantSlug }: { tenantSlug: string }) {
  const [data, setData] = useState<OverviewData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const from = startOfToday();
      const to = new Date(from);
      to.setDate(to.getDate() + 30);
      const results = await Promise.allSettled([
        maintenanceApi.getSchedules(),
        maintenanceApi.getJobPlans(),
        workflowApi.getDefinitions(),
        maintenanceApi.getCalendar(from.toISOString(), to.toISOString()),
        workOrderApi.getAll(),
      ]);
      const failed = results.filter((result) => result.status === 'rejected').length;
      setData({
        schedules: results[0].status === 'fulfilled' ? results[0].value : [],
        jobPlans: results[1].status === 'fulfilled' ? results[1].value : [],
        workflows: results[2].status === 'fulfilled' ? results[2].value : [],
        occurrences: results[3].status === 'fulfilled' ? results[3].value : [],
        workOrders: results[4].status === 'fulfilled' ? results[4].value : [],
      });
      if (failed === results.length) {
        setError('Không thể tải dữ liệu trung tâm bảo trì. Vui lòng thử lại.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load, tenantSlug]);

  const metrics = useMemo(() => {
    const today = startOfToday();
    const sevenDays = new Date(today);
    sevenDays.setDate(sevenDays.getDate() + 7);
    return {
      activeSchedules: data.schedules.filter((item) => item.status === 'active').length,
      upcoming: data.occurrences.filter((item) => {
        const date = new Date(item.plannedStartAt);
        return date >= today && date < sevenDays;
      }).length,
      overdue: data.workOrders.filter(
        (item) =>
          item.dueAt &&
          new Date(item.dueAt) < new Date() &&
          !['COMPLETED', 'CLOSED', 'CANCELLED'].includes(item.status),
      ).length,
      inProgress: data.workOrders.filter((item) => item.status === 'IN_PROGRESS').length,
    };
  }, [data]);

  const base = `/t/${tenantSlug}`;
  const metricCards = [
    {
      label: 'Kế hoạch đang chạy',
      value: metrics.activeSchedules,
      hint: `${data.schedules.length} kế hoạch đã cấu hình`,
      icon: CalendarDays,
      tone: 'bg-emerald-50 text-emerald-700',
    },
    {
      label: 'Đến hạn trong 7 ngày',
      value: metrics.upcoming,
      hint: 'Đã materialize từ các trigger',
      icon: Clock3,
      tone: 'bg-blue-50 text-blue-700',
    },
    {
      label: 'Phiếu quá hạn',
      value: metrics.overdue,
      hint: metrics.overdue ? 'Cần điều phối ngay' : 'Không có việc tồn quá hạn',
      icon: CircleAlert,
      tone: metrics.overdue
        ? 'bg-red-50 text-red-700'
        : 'bg-slate-50 text-slate-600',
    },
    {
      label: 'Đang thực hiện',
      value: metrics.inProgress,
      hint: `${data.workOrders.length} phiếu trong hệ thống`,
      icon: Wrench,
      tone: 'bg-amber-50 text-amber-700',
    },
  ];

  return (
    <Protected permission={PERMISSIONS.MAINTENANCE_VIEW}>
      <MaintenanceShell
        tenantSlug={tenantSlug}
        title="Trung tâm bảo trì"
        description="Một không gian thống nhất để thiết kế quy trình, chuẩn hóa công việc, lập lịch đa điều kiện và theo dõi thực thi tại mọi nhà máy."
        actions={
          <>
            <Button asChild variant="outline" className="border-white/25 bg-white/10 text-white hover:bg-white/18 hover:text-white">
              <Link href={`${base}/maintenance/calendar`}>
                <CalendarDays />
                Xem lịch
              </Link>
            </Button>
            <Button asChild className="bg-white text-[#194934] hover:bg-emerald-50">
              <Link href={`${base}/maintenance/schedules`}>
                <Plus />
                Lập kế hoạch
              </Link>
            </Button>
          </>
        }
      >
        {error ? (
          <div className="flex items-center justify-between gap-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <span className="flex items-center gap-2">
              <CircleAlert size={17} />
              {error}
            </span>
            <Button variant="outline" size="sm" onClick={() => void load()}>
              Thử lại
            </Button>
          </div>
        ) : null}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {metricCards.map((metric) => {
            const Icon = metric.icon;
            return (
              <Card key={metric.label} className="gap-0 overflow-hidden border-[#DFE8DE] py-0 shadow-sm">
                <CardContent className="flex items-start gap-4 p-5">
                  <span className={`grid size-11 shrink-0 place-items-center rounded-2xl ${metric.tone}`}>
                    <Icon size={20} />
                  </span>
                  <div className="min-w-0">
                    <span className="text-xs font-bold tracking-wide text-[#78837B] uppercase">
                      {metric.label}
                    </span>
                    <strong className="mt-1 block text-3xl font-black text-[#26352B]">
                      {loading ? '—' : metric.value}
                    </strong>
                    <span className="mt-1 block truncate text-xs text-[#7A857D]">
                      {metric.hint}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.45fr_0.75fr]">
          <Card className="gap-0 border-[#DFE8DE] py-0 shadow-sm">
            <div className="flex items-center justify-between border-b border-[#E7ECE6] px-5 py-4">
              <div>
                <h2 className="font-black text-[#2B382F]">Lịch sắp tới</h2>
                <p className="mt-0.5 text-xs text-[#77827A]">
                  10 occurrence gần nhất trong 30 ngày
                </p>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link href={`${base}/maintenance/calendar`}>
                  Xem toàn bộ
                  <ArrowRight />
                </Link>
              </Button>
            </div>
            <div className="divide-y divide-[#EDF1EC]">
              {loading ? (
                Array.from({ length: 4 }, (_, index) => (
                  <div key={index} className="h-[76px] animate-pulse bg-[#F7F9F6]" />
                ))
              ) : data.occurrences.length ? (
                data.occurrences.slice(0, 10).map((occurrence) => (
                  <div key={occurrence.id} className="flex items-center gap-3 px-5 py-3.5">
                    <span className="grid min-w-14 rounded-xl bg-[#F0F6EF] px-2 py-2 text-center">
                      <strong className="text-sm text-[#24543A]">
                        {new Date(occurrence.plannedStartAt).toLocaleDateString('vi-VN', {
                          day: '2-digit',
                          month: '2-digit',
                        })}
                      </strong>
                      <span className="text-[10px] font-bold text-[#7B877E]">
                        {new Date(occurrence.plannedStartAt).toLocaleTimeString('vi-VN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </span>
                    <div className="min-w-0 flex-1">
                      <strong className="block truncate text-sm text-[#2C3730]">
                        {occurrence.schedule?.name ?? 'Công việc bảo trì'}
                      </strong>
                      <span className="mt-0.5 block truncate text-xs text-[#758078]">
                        {occurrence.equipment
                          ? `${occurrence.equipment.code} · ${occurrence.equipment.name}`
                          : 'Chưa xác định thiết bị'}
                      </span>
                    </div>
                    <Badge variant="outline" className="border-[#D8E4D8] bg-white text-[#536258]">
                      {occurrence.status === 'generated' ? 'Đã sinh phiếu' : 'Dự kiến'}
                    </Badge>
                  </div>
                ))
              ) : (
                <div className="grid place-items-center px-5 py-12 text-center">
                  <CalendarDays className="text-[#9AA69D]" />
                  <strong className="mt-3 text-sm text-[#435047]">Chưa có lịch sắp tới</strong>
                  <span className="mt-1 text-xs text-[#7D8780]">
                    Kích hoạt một kế hoạch để hệ thống sinh occurrence.
                  </span>
                </div>
              )}
            </div>
          </Card>

          <div className="grid gap-5">
            <Card className="gap-0 border-[#DFE8DE] py-0 shadow-sm">
              <CardContent className="p-5">
                <span className="flex items-center gap-2 text-xs font-black tracking-wide text-[#718078] uppercase">
                  <Sparkles size={15} className="text-emerald-600" />
                  Mức độ sẵn sàng
                </span>
                <div className="mt-4 grid gap-3">
                  {[
                    {
                      label: 'Mẫu quy trình đã công bố',
                      value: data.workflows.filter((item) => item.status === 'published').length,
                      total: data.workflows.length,
                      href: `${base}/maintenance/workflows`,
                      icon: Route,
                    },
                    {
                      label: 'Mẫu công việc đã công bố',
                      value: data.jobPlans.filter((item) => item.status === 'published').length,
                      total: data.jobPlans.length,
                      href: `${base}/maintenance/job-plans`,
                      icon: ListChecks,
                    },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.label}
                        href={item.href}
                        className="flex items-center gap-3 rounded-2xl border border-[#E2E9E1] p-3 transition hover:border-emerald-300 hover:bg-emerald-50/50"
                      >
                        <span className="grid size-9 place-items-center rounded-xl bg-[#EFF5EE] text-[#2D6A49]">
                          <Icon size={17} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <strong className="block text-sm text-[#354139]">{item.label}</strong>
                          <span className="text-xs text-[#7C867F]">
                            {item.value}/{item.total} sẵn sàng
                          </span>
                        </span>
                        {item.value > 0 ? (
                          <CheckCircle2 size={18} className="text-emerald-600" />
                        ) : (
                          <CircleAlert size={18} className="text-amber-500" />
                        )}
                      </Link>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card className="gap-0 border-0 bg-[linear-gradient(145deg,#F1F7EF,#E7F2E8)] py-0 shadow-none">
              <CardContent className="p-5">
                <span className="text-xs font-black tracking-wide text-[#4E735A] uppercase">
                  Luồng khuyến nghị
                </span>
                <ol className="mt-3 grid gap-2 text-sm text-[#46534A]">
                  <li><strong>1.</strong> Chuẩn hóa mẫu công việc và checklist</li>
                  <li><strong>2.</strong> Chọn hoặc thiết kế quy trình thực thi</li>
                  <li><strong>3.</strong> Lập lịch và cấu hình các trigger</li>
                </ol>
              </CardContent>
            </Card>
          </div>
        </section>
      </MaintenanceShell>
    </Protected>
  );
}
