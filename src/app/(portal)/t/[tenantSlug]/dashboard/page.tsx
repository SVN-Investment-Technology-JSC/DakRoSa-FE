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
  AlertCircle,
  Wrench,
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { PageHeading } from '@/components/page-heading';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { apiRequest, ApiError } from '@/lib/api';
import { tenantPath } from '@/lib/navigation';
import { SubmissionSummary } from '@/types/e-office';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

interface PlatformSummary {
  users: number;
  activeUsers: number;
}

interface WorkItem {
  id: string;
  code: string;
  title: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  dueAt: string | null;
}

interface WorkItemsResponse {
  items: WorkItem[];
  total: number;
}

interface OperationsSummary {
  equipments: { total: number };
  workOrders: {
    downtimeMinutesThisMonth: number;
    draft: number;
    inProgress: number;
    completed: number;
    incidents30d: number;
    maintenances30d: number;
  };
  downtimeChart: Array<{ date: string; downtime: number }>;
}

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

export default function TenantDashboardPage() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const [platform, setPlatform] = useState<PlatformSummary | null>(null);
  const [office, setOffice] = useState<SubmissionSummary | null>(null);
  const [workItems, setWorkItems] = useState<WorkItemsResponse | null>(null);
  const [operations, setOperations] = useState<OperationsSummary | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    void Promise.allSettled([
      apiRequest<PlatformSummary>('/dashboard/summary'),
      apiRequest<SubmissionSummary>('/e-office/summary'),
      apiRequest<WorkItemsResponse>('/e-office/work-items'),
      apiRequest<OperationsSummary>('/dashboard/operations-summary'),
    ]).then((results) => {
      if (!active) return;
      const [platformResult, officeResult, workItemsResult, operationsResult] = results;
      if (platformResult.status === 'fulfilled') setPlatform(platformResult.value);
      if (officeResult.status === 'fulfilled') setOffice(officeResult.value);
      if (workItemsResult.status === 'fulfilled') setWorkItems(workItemsResult.value);
      if (operationsResult.status === 'fulfilled') setOperations(operationsResult.value);
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
              <ClipboardList size={20} className="text-[#386948]" />
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 p-5 sm:grid-cols-3">
            <DataPending label="Chờ duyệt" icon={Clock3} detail="Hồ sơ trong luồng phê duyệt" value={office?.inReview} />
            <DataPending label="Cần bổ sung" icon={ArrowRight} detail="Hồ sơ được trả lại để hoàn thiện" value={office?.returned} />
            <DataPending label="Đã phê duyệt" icon={CheckCircle2} detail="Hồ sơ đã hoàn tất luồng duyệt" value={office?.approved} />
          </CardContent>
        </Card>

        <Card className="gap-0 overflow-hidden rounded-xl border-0 bg-[#386948] text-white shadow-[0_18px_42px_rgba(56,105,72,0.18)]">
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
          <CardHeader className="px-5 py-4">
            <CardTitle className="font-display text-lg">Báo cáo Vận hành & Bảo trì</CardTitle>
            <p className="mt-1 text-sm text-[#667067]">Chỉ số kỹ thuật hệ thống thiết bị.</p>
          </CardHeader>
          <CardContent className="grid gap-3 px-5 pb-5 sm:grid-cols-2">
            <DataPending label="Tổng thiết bị" icon={Gauge} value={operations?.equipments?.total} detail="Đang quản lý trên hệ thống" />
            <DataPending label="Phút dừng máy (Tháng)" icon={Clock3} value={operations?.workOrders?.downtimeMinutesThisMonth} detail="Tổng thời gian gián đoạn" />
            <DataPending label="Sự cố (30 ngày)" icon={AlertCircle} value={operations?.workOrders?.incidents30d} detail="Số sự cố phát sinh" />
            <DataPending label="Bảo trì (30 ngày)" icon={Wrench} value={operations?.workOrders?.maintenances30d} detail="Số lần bảo trì định kỳ" />
          </CardContent>
        </Card>

        <Card className="gap-0 rounded-xl border-[#DDE5DC]">
          <CardHeader className="px-5 py-4">
            <CardTitle className="font-display text-lg">Biểu đồ dừng máy (7 ngày)</CardTitle>
            <p className="mt-1 text-sm text-[#667067]">Thống kê số phút dừng máy do sự cố.</p>
          </CardHeader>
          <CardContent className="px-5 pb-5 h-[240px]">
            {operations?.downtimeChart ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={operations.downtimeChart} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(val) => {
                      const d = new Date(val);
                      return `${d.getDate()}/${d.getMonth()+1}`;
                    }}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: '#667067' }}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: '#667067' }}
                  />
                  <Tooltip 
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    formatter={(value: any) => [`${value} phút`, 'Downtime']}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    labelFormatter={(label: any) => new Date(label).toLocaleDateString('vi-VN')}
                  />
                  <Bar dataKey="downtime" fill="#386948" radius={[4, 4, 0, 0]} barSize={32} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full w-full flex items-center justify-center text-sm text-gray-500">Đang tải...</div>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-2">
        <Card className="gap-0 rounded-xl border-[#DDE5DC]">
          <CardHeader className="px-5 py-4">
            <CardTitle className="font-display text-lg">Phân bố Phiếu công việc</CardTitle>
            <p className="mt-1 text-sm text-[#667067]">Trạng thái xử lý phiếu bảo trì, sửa chữa.</p>
          </CardHeader>
          <CardContent className="px-5 pb-5 h-[240px] flex items-center justify-center">
            {operations?.workOrders ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Khởi tạo', value: operations.workOrders.draft },
                      { name: 'Đang xử lý', value: operations.workOrders.inProgress },
                      { name: 'Hoàn thành', value: operations.workOrders.completed },
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    <Cell fill="#9ca3af" />
                    <Cell fill="#f59e0b" />
                    <Cell fill="#10b981" />
                  </Pie>
                  <Tooltip formatter={(value: any) => [value, 'Phiếu']} />
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-sm text-gray-500">Đang tải...</div>
            )}
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
