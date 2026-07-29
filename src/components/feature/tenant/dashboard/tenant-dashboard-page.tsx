'use client';

import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock3,
  FileText,
  FolderKanban,
  Gauge,
  ListTodo,
  Plus,
  Target,
  UserRoundCheck,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { PageHeading } from '@/components/page-heading';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { tenantPath } from '@/lib/navigation';
import { ApiError } from '@/services/service-error';
import { dashboardService } from '@/services/dashboard.service';
import { eOfficeService } from '@/services/e-office.service';
import type { DashboardSummary } from '@/types/dashboard';
import type { SubmissionList, SubmissionSummary } from '@/types/e-office';

// Temporary dashboard data for the Giai đoạn 3 demonstration. Replace each
// value with its dedicated API response as the HRM, planning, KPI and project
// modules are delivered.
const DASHBOARD_DEMO_DATA = {
  planning: {
    monthlyPlans: 12,
    monthlyPlanDetail: '8/12 đầu việc đúng hạn trong tháng',
    kpiPending: 4,
    kpiDetail: '14/18 chỉ tiêu đã được cập nhật',
    activeProjects: 3,
    projectDetail: '2 dự án đúng tiến độ, 1 dự án cần theo dõi',
  },
  hrm: {
    headcount: 86,
    headcountDetail: '54 khối vận hành · 32 khối gián tiếp',
    monthlyMovement: 2,
    movementDetail: '1 tiếp nhận · 1 điều chuyển trong tháng',
    expiringCertificates: 4,
    certificateDetail: 'Cần gia hạn trong 30 ngày tới',
    attendanceToday: 81,
    attendanceDetail: '03 ca vận hành · 03 đơn nghỉ phép hôm nay',
  },
} as const;

interface MetricCardProps {
  label: string;
  value: number | undefined;
  note: string;
  icon: React.ComponentType<{ size?: number }>;
  tone: string;
}

function MetricCard({ label, value, note, icon: Icon, tone }: MetricCardProps) {
  return (
    <Card className="gap-4 rounded-xl border-[#DDE5DC]">
      <CardHeader className="flex grid-cols-none flex-row items-start justify-between gap-4 px-5 pt-5">
        <div>
          <p className="text-xs font-extrabold tracking-[0.06em] text-[#667067] uppercase">
            {label}
          </p>
          {value === undefined ? (
            <Skeleton className="mt-3 h-9 w-16" />
          ) : (
            <strong className="font-display mt-2 block text-3xl text-[#2C342E]">
              {value}
            </strong>
          )}
        </div>
        <span className={`grid size-10 place-items-center rounded-xl ${tone}`}>
          <Icon size={20} />
        </span>
      </CardHeader>
      <CardContent className="px-5 pb-5 text-xs leading-5 text-[#758077]">
        {note}
      </CardContent>
    </Card>
  );
}

function DataPending({ label, icon: Icon, detail, value }: {
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  detail: string;
  value?: number;
}) {
  return (
    <div className="rounded-lg border border-[#E4EAE2] bg-[#FBFCFA] p-4">
      <div className="flex items-center gap-2 text-[#386948]">
        <Icon size={17} />
        <strong className="text-sm">{label}</strong>
      </div>
      <strong className="mt-3 block text-2xl text-[#2C342E]">{value ?? '—'}</strong>
      <p className="mt-1 text-xs leading-5 text-[#758077]">{detail}</p>
    </div>
  );
}

export function TenantDashboardPage({ tenantSlug }: { tenantSlug: string }) {
  const [platform, setPlatform] = useState<DashboardSummary | null>(null);
  const [office, setOffice] = useState<SubmissionSummary | null>(null);
  const [workItems, setWorkItems] = useState<SubmissionList | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    void Promise.allSettled([
      dashboardService.getSummary(),
      eOfficeService.getSummary(),
      eOfficeService.getWorkItems(),
    ]).then((results) => {
      if (!active) return;
      const [platformResult, officeResult, workItemsResult] = results;
      if (platformResult.status === 'fulfilled') setPlatform(platformResult.value);
      if (officeResult.status === 'fulfilled') setOffice(officeResult.value);
      if (workItemsResult.status === 'fulfilled') setWorkItems(workItemsResult.value);
      const failed = results.find((result) => result.status === 'rejected');
      const hasData = results.some((result) => result.status === 'fulfilled');
      if (failed?.status === 'rejected' && !hasData) {
        setError(
          failed.reason instanceof ApiError
            ? failed.reason.message
            : 'Không thể tải dữ liệu tổng quan.',
        );
      }
    });
    return () => { active = false; };
  }, []);

  const overdueWorkItems = useMemo(
    () => workItems?.items.filter((item) => item.dueAt && new Date(item.dueAt) < new Date()).length,
    [workItems],
  );
  const completionRate = useMemo(() => {
    if (!office) return undefined;
    const completed = office.approved;
    const active = office.draft + office.inReview + office.returned + completed;
    return active ? Math.round((completed / active) * 100) : 0;
  }, [office]);

  const metrics: MetricCardProps[] = [
    {
      label: 'Công việc cần xử lý',
      value: workItems?.total,
      note: 'Các hồ sơ được phân công cho bạn',
      icon: ListTodo,
      tone: 'bg-[#FFF3D8] text-[#745C27]',
    },
    {
      label: 'Công việc quá hạn',
      value: overdueWorkItems,
      note: 'Theo hạn xử lý đã thiết lập',
      icon: Clock3,
      tone: 'bg-[#FCECEB] text-[#A83836]',
    },
    {
      label: 'Hồ sơ chờ duyệt',
      value: office?.inReview,
      note: 'Hồ sơ đang trong luồng phê duyệt',
      icon: FileText,
      tone: 'bg-[#E8F3E8] text-[#386948]',
    },
    {
      label: 'Tài khoản hoạt động',
      value: platform?.activeUsers,
      note: `${platform?.users ?? 0} tài khoản thuộc doanh nghiệp`,
      icon: Users,
      tone: 'bg-[#EEF1ED] text-[#59615A]',
    },
  ];

  return (
    <>
      <PageHeading
        eyebrow="Không gian điều hành doanh nghiệp"
        title="Tổng quan điều hành"
        description="Theo dõi công việc, hồ sơ, kế hoạch, KPI, dự án và nguồn lực doanh nghiệp trong một màn hình."
        actions={
          <Button asChild size="sm">
            <Link href={tenantPath(tenantSlug, '/e-office/submissions/new')}>
              <Plus size={17} /> Tạo hồ sơ
            </Link>
          </Button>
        }
      />

      {error && (
        <div className="mb-5 rounded-xl border border-[#E7B5B3] bg-[#FCECEB] px-4 py-3 text-sm font-bold text-[#A83836]">
          {error}
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Chỉ số điều hành">
        {metrics.map((metric) => <MetricCard key={metric.label} {...metric} />)}
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,.7fr)]">
        <Card className="gap-0 overflow-hidden rounded-xl border-[#DDE5DC]">
          <CardHeader className="border-b border-[#E4EAE2] px-5 py-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="font-display text-lg">Điều hành công việc và hồ sơ</CardTitle>
                <p className="mt-1 text-sm text-[#667067]">Tình trạng thực tế của luồng công việc điện tử.</p>
              </div>
              <ClipboardList size={20} className="text-primary" />
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 p-5 sm:grid-cols-3">
            <DataPending label="Chờ duyệt" icon={Clock3} detail="Hồ sơ trong luồng phê duyệt" value={office?.inReview} />
            <DataPending label="Cần bổ sung" icon={ArrowRight} detail="Hồ sơ được trả lại để hoàn thiện" value={office?.returned} />
            <DataPending label="Đã phê duyệt" icon={CheckCircle2} detail="Hồ sơ đã hoàn tất luồng duyệt" value={office?.approved} />
          </CardContent>
        </Card>

        <Card className="gap-0 overflow-hidden rounded-xl border-0 bg-primary text-white shadow-[0_18px_42px_color-mix(in_srgb,var(--primary)_30%,transparent)]">
          <CardHeader className="px-6 pt-6">
            <span className="mb-2 w-fit rounded-full bg-[#B9EFC5] px-3 py-1 text-xs font-black text-[#2B5D3C]">Tiến độ thực hiện</span>
            <strong className="font-display block text-4xl">{completionRate ?? '—'}{completionRate !== undefined ? '%' : ''}</strong>
            <p className="mt-2 text-sm leading-6 text-white/70">Tỷ lệ hồ sơ hoàn tất trên tổng hồ sơ phát sinh trong doanh nghiệp.</p>
          </CardHeader>
          <CardContent className="mt-auto px-6 pb-6">
            <Link href={tenantPath(tenantSlug, '/work-items')} className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[#B9EFC5] px-4 text-sm font-black text-[#234D32] transition hover:bg-[#C9F4D1]">Mở việc cần xử lý <ArrowRight size={17} /></Link>
          </CardContent>
        </Card>
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-2">
        <Card className="gap-0 rounded-xl border-[#DDE5DC]">
          <CardHeader className="px-5 py-4"><CardTitle className="font-display text-lg">Kế hoạch, KPI và dự án</CardTitle><p className="mt-1 text-sm text-[#667067]">Chỉ số điều hành theo kỳ hiện tại.</p></CardHeader>
          <CardContent className="grid gap-3 px-5 pb-5 sm:grid-cols-3">
            <DataPending label="Kế hoạch tháng" icon={CalendarDays} value={DASHBOARD_DEMO_DATA.planning.monthlyPlans} detail={DASHBOARD_DEMO_DATA.planning.monthlyPlanDetail} />
            <DataPending label="KPI cần cập nhật" icon={Target} value={DASHBOARD_DEMO_DATA.planning.kpiPending} detail={DASHBOARD_DEMO_DATA.planning.kpiDetail} />
            <DataPending label="Dự án đang triển khai" icon={FolderKanban} value={DASHBOARD_DEMO_DATA.planning.activeProjects} detail={DASHBOARD_DEMO_DATA.planning.projectDetail} />
          </CardContent>
        </Card>

        <Card className="gap-0 rounded-xl border-[#DDE5DC]">
          <CardHeader className="px-5 py-4"><CardTitle className="font-display text-lg">Nhân sự và chấm công</CardTitle><p className="mt-1 text-sm text-[#667067]">Báo cáo cơ cấu nguồn lực và dữ liệu theo ca.</p></CardHeader>
          <CardContent className="grid gap-3 px-5 pb-5 sm:grid-cols-2">
            <DataPending label="Tổng nhân sự" icon={Users} value={DASHBOARD_DEMO_DATA.hrm.headcount} detail={DASHBOARD_DEMO_DATA.hrm.headcountDetail} />
            <DataPending label="Biến động nhân sự" icon={UserRoundCheck} value={DASHBOARD_DEMO_DATA.hrm.monthlyMovement} detail={DASHBOARD_DEMO_DATA.hrm.movementDetail} />
            <DataPending label="Chứng chỉ sắp hết hạn" icon={Gauge} value={DASHBOARD_DEMO_DATA.hrm.expiringCertificates} detail={DASHBOARD_DEMO_DATA.hrm.certificateDetail} />
            <DataPending label="Ca kíp & bảng công" icon={CalendarDays} value={DASHBOARD_DEMO_DATA.hrm.attendanceToday} detail={DASHBOARD_DEMO_DATA.hrm.attendanceDetail} />
          </CardContent>
        </Card>
      </section>

      <section className="mt-5">
        <Card className="gap-0 rounded-xl border-[#DDE5DC]">
          <CardHeader className="flex flex-row items-center justify-between gap-4 px-5 py-4">
            <div><CardTitle className="font-display text-lg">Việc cần ưu tiên</CardTitle><p className="mt-1 text-sm text-[#667067]">Danh sách hồ sơ đang được phân công cho bạn.</p></div>
            <Button asChild variant="secondary" size="sm"><Link href={tenantPath(tenantSlug, '/work-items')}>Xem tất cả <ArrowRight size={16} /></Link></Button>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            {workItems?.items.length ? (
              <div className="grid divide-y divide-[#E8EDE6]">
                {workItems.items.slice(0, 5).map((item) => (
                  <Link key={item.id} href={tenantPath(tenantSlug, `/e-office/submissions/${item.id}`)} className="flex items-center gap-4 py-3 transition hover:text-[#386948]">
                    <span className="grid size-9 place-items-center rounded-lg bg-[#F0F5EE] text-[#386948]"><FileText size={18} /></span>
                    <span className="min-w-0 flex-1"><strong className="block truncate text-sm">{item.title}</strong><small className="text-xs text-[#758077]">{item.code}{item.dueAt ? ` · Hạn ${new Intl.DateTimeFormat('vi-VN').format(new Date(item.dueAt))}` : ''}</small></span>
                    <span className="rounded-full bg-[#F5F7F4] px-2.5 py-1 text-xs font-bold text-[#59615A]">{item.priority}</span>
                  </Link>
                ))}
              </div>
            ) : <p className="rounded-lg bg-[#F7FAF4] px-4 py-8 text-center text-sm text-[#667067]">Không có công việc nào đang được phân công cho bạn.</p>}
          </CardContent>
        </Card>
      </section>
    </>
  );
}
