'use client';

import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  CircleDashed,
  ClipboardList,
  Filter,
  PlayCircle,
  Plus,
  Search,
  UserRound,
  Wrench,
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Protected } from '@/components/protected';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { equipmentApi } from '@/lib/api-equipment';
import { maintenanceApi } from '@/lib/api-maintenance';
import { PERMISSIONS } from '@/lib/navigation';
import { hasPermission } from '@/lib/permissions';
import { workOrderApi } from '@/lib/api-work-order';
import { workflowApi } from '@/lib/api-workflow';
import { useAuth } from '@/providers/auth-provider';
import { usersService } from '@/services/users.service';
import type { Equipment } from '@/types/equipment';
import type { MaintenanceJobPlan } from '@/types/maintenance';
import type { UserRecord } from '@/types/user';
import type { WorkOrder, WorkOrderStatus } from '@/types/work-order';
import type { WorkflowDefinition } from '@/types/workflow';

const statusMeta: Record<
  WorkOrderStatus,
  { label: string; className: string; icon: typeof CircleDashed }
> = {
  DRAFT: {
    label: 'Mới tạo',
    className: 'border-slate-200 bg-slate-50 text-slate-700',
    icon: CircleDashed,
  },
  ASSIGNED: {
    label: 'Đã giao',
    className: 'border-blue-200 bg-blue-50 text-blue-700',
    icon: UserRound,
  },
  IN_PROGRESS: {
    label: 'Đang làm',
    className: 'border-amber-200 bg-amber-50 text-amber-700',
    icon: PlayCircle,
  },
  COMPLETED: {
    label: 'Hoàn thành',
    className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    icon: CheckCircle2,
  },
  CLOSED: {
    label: 'Đã đóng',
    className: 'border-slate-300 bg-slate-100 text-slate-700',
    icon: CheckCircle2,
  },
  CANCELLED: {
    label: 'Đã hủy',
    className: 'border-red-200 bg-red-50 text-red-700',
    icon: AlertTriangle,
  },
};

const priorityLabels = {
  LOW: 'Thấp',
  NORMAL: 'Bình thường',
  HIGH: 'Cao',
  URGENT: 'Khẩn cấp',
} as const;

const dateTimeFormatter = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Asia/Ho_Chi_Minh',
});

function newCode() {
  const now = new Date();
  return `WO-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(
    now.getDate(),
  ).padStart(2, '0')}-${String(now.getTime()).slice(-5)}`;
}

export default function WorkOrderPage() {
  const params = useParams<{ tenantSlug: string }>();
  const tenantSlug = params.tenantSlug;
  const { user } = useAuth();
  const canCreate = hasPermission(user, PERMISSIONS.WORK_ORDER_CREATE);
  const [items, setItems] = useState<WorkOrder[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [workflows, setWorkflows] = useState<WorkflowDefinition[]>([]);
  const [jobPlans, setJobPlans] = useState<MaintenanceJobPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [form, setForm] = useState({
    code: newCode(),
    title: '',
    description: '',
    type: 'INCIDENT' as 'INCIDENT' | 'MAINTENANCE',
    priority: 'NORMAL' as WorkOrder['priority'],
    equipmentId: '',
    assigneeId: '',
    reviewerId: '',
    workflowDefinitionId: '',
    jobPlanVersionId: '',
    plannedStartAt: '',
    dueAt: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const results = await Promise.allSettled([
        workOrderApi.getAll(),
        equipmentApi.getAll(),
        usersService.getUsers(),
        workflowApi.getDefinitions(),
        maintenanceApi.getJobPlans(),
      ]);
      setItems(results[0].status === 'fulfilled' ? results[0].value : []);
      setEquipment(results[1].status === 'fulfilled' ? results[1].value : []);
      setUsers(results[2].status === 'fulfilled' ? results[2].value.items : []);
      setWorkflows(results[3].status === 'fulfilled' ? results[3].value : []);
      setJobPlans(results[4].status === 'fulfilled' ? results[4].value : []);
      if (results[0].status === 'rejected') {
        toast.error('Không thể tải danh sách phiếu công việc.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load, tenantSlug]);

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return items.filter(
      (item) =>
        (!keyword ||
          item.code.toLowerCase().includes(keyword) ||
          item.title.toLowerCase().includes(keyword) ||
          item.equipment?.name.toLowerCase().includes(keyword)) &&
        (!status || item.status === status) &&
        (!priority || item.priority === priority),
    );
  }, [items, priority, search, status]);

  const metrics = useMemo(
    () => ({
      open: items.filter((item) => !['COMPLETED', 'CLOSED', 'CANCELLED'].includes(item.status))
        .length,
      inProgress: items.filter((item) => item.status === 'IN_PROGRESS').length,
      overdue: items.filter(
        (item) =>
          item.dueAt &&
          new Date(item.dueAt) < new Date() &&
          !['COMPLETED', 'CLOSED', 'CANCELLED'].includes(item.status),
      ).length,
    }),
    [items],
  );

  const openCreate = () => {
    setForm({
      code: newCode(),
      title: '',
      description: '',
      type: 'INCIDENT',
      priority: 'NORMAL',
      equipmentId: '',
      assigneeId: '',
      reviewerId: '',
      workflowDefinitionId:
        workflows.find((item) => item.status === 'published')?.id ?? '',
      jobPlanVersionId: '',
      plannedStartAt: '',
      dueAt: '',
    });
    setCreateOpen(true);
  };

  const create = async () => {
    if (!form.code || !form.title.trim()) {
      toast.error('Vui lòng nhập mã và tiêu đề phiếu.');
      return;
    }
    setSaving(true);
    try {
      await workOrderApi.create({
        code: form.code,
        title: form.title,
        description: form.description || undefined,
        type: form.type,
        priority: form.priority,
        equipmentId: form.equipmentId || undefined,
        assigneeId: form.assigneeId || undefined,
        technicalReviewerId: form.reviewerId || undefined,
        workflowDefinitionId: form.workflowDefinitionId || undefined,
        jobPlanVersionId: form.jobPlanVersionId || undefined,
        plannedStartAt: form.plannedStartAt
          ? new Date(form.plannedStartAt).toISOString()
          : undefined,
        dueAt: form.dueAt ? new Date(form.dueAt).toISOString() : undefined,
      });
      setCreateOpen(false);
      await load();
      toast.success('Phiếu đã được tạo và đưa vào quy trình.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể tạo phiếu.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Protected permission={PERMISSIONS.WORK_ORDER_VIEW}>
      <div className="grid gap-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex gap-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
              <ClipboardList size={22} />
            </span>
            <div>
              <span className="text-xs font-black tracking-[0.12em] text-[#78837B] uppercase">
                Thực thi bảo trì
              </span>
              <h1 className="mt-1 text-2xl font-black tracking-tight text-[#26352B]">
                Phiếu công việc
              </h1>
              <p className="mt-1 text-sm text-[#6F7B73]">
                Theo dõi công việc từ giao việc, thực hiện đến kiểm tra kỹ thuật.
              </p>
            </div>
          </div>
          {canCreate ? (
            <Button onClick={openCreate}>
              <Plus />
              Tạo phiếu
            </Button>
          ) : null}
        </header>

        <section className="grid gap-4 sm:grid-cols-3">
          {[
            {
              label: 'Đang mở',
              value: metrics.open,
              icon: ClipboardList,
              tone: 'bg-blue-50 text-blue-700',
            },
            {
              label: 'Đang thực hiện',
              value: metrics.inProgress,
              icon: Wrench,
              tone: 'bg-amber-50 text-amber-700',
            },
            {
              label: 'Quá hạn',
              value: metrics.overdue,
              icon: AlertTriangle,
              tone: metrics.overdue
                ? 'bg-red-50 text-red-700'
                : 'bg-slate-50 text-slate-600',
            },
          ].map((metric) => {
            const Icon = metric.icon;
            return (
              <div
                key={metric.label}
                className="flex items-center gap-4 rounded-2xl border border-[#DFE7DE] bg-white p-5 shadow-sm"
              >
                <span className={`grid size-11 place-items-center rounded-2xl ${metric.tone}`}>
                  <Icon size={20} />
                </span>
                <span>
                  <span className="block text-xs font-bold text-[#79837B]">{metric.label}</span>
                  <strong className="mt-0.5 block text-2xl font-black text-[#2B382F]">
                    {loading ? '—' : metric.value}
                  </strong>
                </span>
              </div>
            );
          })}
        </section>

        <section className="overflow-hidden rounded-2xl border border-[#DFE7DE] bg-white shadow-sm">
          <div className="flex flex-wrap items-center gap-3 border-b border-[#E7ECE6] p-4">
            <label className="relative min-w-60 flex-1">
              <Search
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8B968E]"
              />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Tìm mã phiếu, tiêu đề, thiết bị…"
                className="pl-9"
              />
            </label>
            <span className="flex items-center gap-2 text-xs font-bold text-[#6D7971]">
              <Filter size={14} />
              Lọc
            </span>
            <select
              aria-label="Lọc theo trạng thái"
              className="h-9 rounded-md border border-input bg-white px-3 text-sm"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              <option value="">Mọi trạng thái</option>
              {(Object.keys(statusMeta) as WorkOrderStatus[]).map((value) => (
                <option key={value} value={value}>
                  {statusMeta[value].label}
                </option>
              ))}
            </select>
            <select
              aria-label="Lọc theo độ ưu tiên"
              className="h-9 rounded-md border border-input bg-white px-3 text-sm"
              value={priority}
              onChange={(event) => setPriority(event.target.value)}
            >
              <option value="">Mọi ưu tiên</option>
              {Object.entries(priorityLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="divide-y divide-[#EAF0E9]">
            {loading ? (
              Array.from({ length: 5 }, (_, index) => (
                <div key={index} className="h-24 animate-pulse bg-[#F7F9F6]" />
              ))
            ) : filtered.length ? (
              filtered.map((item) => {
                const meta = statusMeta[item.status];
                const Icon = meta.icon;
                const overdue =
                  item.dueAt &&
                  new Date(item.dueAt) < new Date() &&
                  !['COMPLETED', 'CLOSED', 'CANCELLED'].includes(item.status);
                return (
                  <Link
                    key={item.id}
                    href={`/t/${tenantSlug}/work-orders/${item.id}`}
                    className="group grid gap-3 p-4 transition hover:bg-[#F7FAF6] sm:grid-cols-[minmax(0,1fr)_150px_170px_28px] sm:items-center"
                  >
                    <div className="flex min-w-0 gap-3">
                      <span
                        className={`grid size-10 shrink-0 place-items-center rounded-xl border ${meta.className}`}
                      >
                        <Icon size={18} />
                      </span>
                      <span className="min-w-0">
                        <span className="flex flex-wrap items-center gap-2">
                          <strong className="text-xs font-black text-emerald-700">{item.code}</strong>
                          {item.type === 'MAINTENANCE' ? (
                            <Badge variant="secondary">Bảo trì</Badge>
                          ) : (
                            <Badge variant="outline" className="border-red-200 text-red-700">
                              Sự cố
                            </Badge>
                          )}
                          {overdue ? (
                            <Badge className="bg-red-100 text-red-700">Quá hạn</Badge>
                          ) : null}
                        </span>
                        <strong className="mt-1 block truncate text-sm text-[#334039]">
                          {item.title}
                        </strong>
                        <span className="mt-0.5 block truncate text-xs text-[#7A857D]">
                          {item.equipment
                            ? `${item.equipment.code} · ${item.equipment.name}`
                            : 'Không gắn thiết bị'}
                        </span>
                      </span>
                    </div>
                    <span className="flex items-center gap-2 text-xs text-[#68746C]">
                      <UserRound size={14} />
                      <span className="truncate">
                        {item.assignee?.displayName ?? 'Chưa phân công'}
                      </span>
                    </span>
                    <span>
                      <Badge variant="outline" className={meta.className}>
                        {meta.label}
                      </Badge>
                      <span className="mt-2 flex items-center gap-1 text-[11px] text-[#7B857E]">
                        <CalendarClock size={12} />
                        {item.dueAt
                          ? dateTimeFormatter.format(new Date(item.dueAt))
                          : 'Chưa có hạn'}
                      </span>
                    </span>
                    <ChevronRight className="hidden text-[#9AA49D] transition group-hover:translate-x-0.5 sm:block" />
                  </Link>
                );
              })
            ) : (
              <div className="grid place-items-center px-5 py-16 text-center">
                <ClipboardList className="text-[#9AA69D]" />
                <strong className="mt-3 text-[#435047]">Không có phiếu phù hợp</strong>
                <span className="mt-1 text-sm text-[#7E8981]">
                  Thử thay đổi bộ lọc hoặc tạo phiếu mới.
                </span>
              </div>
            )}
          </div>
        </section>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Tạo phiếu công việc</DialogTitle>
            <DialogDescription>
              Phiếu sẽ được gắn với phiên bản quy trình hiện hành ngay khi tạo.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1.5 text-sm font-bold">
                Mã phiếu *
                <Input
                  value={form.code}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      code: event.target.value
                        .toUpperCase()
                        .replace(/[^A-Z0-9_-]/g, ''),
                    }))
                  }
                />
              </label>
              <label className="grid gap-1.5 text-sm font-bold">
                Loại phiếu
                <select
                  className="h-9 rounded-md border border-input bg-white px-3 text-sm"
                  value={form.type}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      type: event.target.value as 'INCIDENT' | 'MAINTENANCE',
                    }))
                  }
                >
                  <option value="INCIDENT">Sự cố / đột xuất</option>
                  <option value="MAINTENANCE">Bảo trì chủ động</option>
                </select>
              </label>
            </div>
            <label className="grid gap-1.5 text-sm font-bold">
              Tiêu đề *
              <Input
                value={form.title}
                placeholder="Mô tả ngắn gọn việc cần xử lý"
                onChange={(event) =>
                  setForm((current) => ({ ...current, title: event.target.value }))
                }
              />
            </label>
            <label className="grid gap-1.5 text-sm font-bold">
              Mô tả hiện trạng / yêu cầu
              <Textarea
                rows={4}
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1.5 text-sm font-bold">
                Thiết bị
                <select
                  className="h-9 rounded-md border border-input bg-white px-3 text-sm"
                  value={form.equipmentId}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      equipmentId: event.target.value,
                    }))
                  }
                >
                  <option value="">Không gắn thiết bị</option>
                  {equipment.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.code} · {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1.5 text-sm font-bold">
                Ưu tiên
                <select
                  className="h-9 rounded-md border border-input bg-white px-3 text-sm"
                  value={form.priority}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      priority: event.target.value as WorkOrder['priority'],
                    }))
                  }
                >
                  {Object.entries(priorityLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1.5 text-sm font-bold">
                Người thực hiện
                <select
                  className="h-9 rounded-md border border-input bg-white px-3 text-sm"
                  value={form.assigneeId}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      assigneeId: event.target.value,
                    }))
                  }
                >
                  <option value="">Quy trình tự xác định</option>
                  {users.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.displayName}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1.5 text-sm font-bold">
                Người kiểm tra
                <select
                  className="h-9 rounded-md border border-input bg-white px-3 text-sm"
                  value={form.reviewerId}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      reviewerId: event.target.value,
                    }))
                  }
                >
                  <option value="">Quy trình tự xác định</option>
                  {users.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.displayName}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1.5 text-sm font-bold">
                Quy trình
                <select
                  className="h-9 rounded-md border border-input bg-white px-3 text-sm"
                  value={form.workflowDefinitionId}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      workflowDefinitionId: event.target.value,
                    }))
                  }
                >
                  <option value="">Quy trình chuẩn mặc định</option>
                  {workflows
                    .filter((item) => item.status === 'published')
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                </select>
              </label>
              <label className="grid gap-1.5 text-sm font-bold">
                Mẫu công việc
                <select
                  className="h-9 rounded-md border border-input bg-white px-3 text-sm"
                  value={form.jobPlanVersionId}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      jobPlanVersionId: event.target.value,
                    }))
                  }
                >
                  <option value="">Không dùng checklist mẫu</option>
                  {jobPlans
                    .filter((item) => item.status === 'published')
                    .map((item) => (
                      <option key={item.id} value={item.currentVersionId ?? ''}>
                        {item.code} · {item.name}
                      </option>
                    ))}
                </select>
              </label>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1.5 text-sm font-bold">
                Bắt đầu dự kiến
                <Input
                  type="datetime-local"
                  value={form.plannedStartAt}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      plannedStartAt: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="grid gap-1.5 text-sm font-bold">
                Hạn hoàn thành
                <Input
                  type="datetime-local"
                  value={form.dueAt}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      dueAt: event.target.value,
                    }))
                  }
                />
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Hủy
            </Button>
            <Button onClick={() => void create()} disabled={saving}>
              <Plus />
              Tạo và vào quy trình
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Protected>
  );
}
