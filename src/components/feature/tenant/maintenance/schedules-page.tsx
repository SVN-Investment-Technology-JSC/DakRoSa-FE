'use client';

import {
  Activity,
  Archive,
  CalendarClock,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Gauge,
  Eye,
  Pause,
  Pencil,
  Play,
  Plus,
  Radio,
  Settings2,
  Trash2,
  UsersRound,
  Zap,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Protected } from '@/components/protected';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { equipmentApi } from '@/lib/api-equipment';
import { maintenanceApi } from '@/lib/api-maintenance';
import { PERMISSIONS } from '@/lib/navigation';
import { hasPermission } from '@/lib/permissions';
import { workflowApi } from '@/lib/api-workflow';
import { useAuth } from '@/providers/auth-provider';
import { tenancyService } from '@/services/tenancy.service';
import { usersService } from '@/services/users.service';
import type { Equipment } from '@/types/equipment';
import type {
  EquipmentMeter,
  MaintenanceJobPlan,
  MaintenanceSchedule,
  MaintenanceSchedulePreview,
  MaintenanceTriggerType,
  CreateScheduleInput,
} from '@/types/maintenance';
import type { Site } from '@/types/tenancy';
import type { UserRecord } from '@/types/user';
import type { WorkflowDefinition } from '@/types/workflow';
import { MaintenanceShell } from './maintenance-shell';

interface TriggerDraft {
  localId: string;
  type: MaintenanceTriggerType;
  rrule: string;
  time: string;
  meterId: string;
  threshold: string;
  eventKey: string;
  conditionFact: string;
  conditionOp: 'eq' | 'neq' | 'gt' | 'gte' | 'contains';
  conditionValue: string;
}

const triggerMeta: Record<
  MaintenanceTriggerType,
  { label: string; description: string; icon: typeof Clock3; tone: string }
> = {
  TIME_RRULE: {
    label: 'Theo thời gian',
    description: 'Ngày, tuần, tháng hoặc RRULE tùy chỉnh',
    icon: Clock3,
    tone: 'bg-blue-50 text-blue-700',
  },
  METER_THRESHOLD: {
    label: 'Theo chỉ số',
    description: 'Giờ chạy, số chu kỳ hoặc phép đo',
    icon: Gauge,
    tone: 'bg-amber-50 text-amber-700',
  },
  DOMAIN_EVENT: {
    label: 'Theo sự kiện',
    description: 'Sự kiện vận hành từ OCC/SCADA/API',
    icon: Radio,
    tone: 'bg-violet-50 text-violet-700',
  },
  CONDITION: {
    label: 'Sự kiện có điều kiện',
    description: 'Kích hoạt khi dữ liệu thỏa biểu thức',
    icon: Zap,
    tone: 'bg-emerald-50 text-emerald-700',
  },
};

function makeTrigger(type: MaintenanceTriggerType = 'TIME_RRULE'): TriggerDraft {
  return {
    localId: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type,
    rrule: 'FREQ=MONTHLY;INTERVAL=1',
    time: '08:00',
    meterId: '',
    threshold: '',
    eventKey: '',
    conditionFact: 'severity',
    conditionOp: 'eq',
    conditionValue: 'high',
  };
}

function triggerFromSchedule(
  trigger: MaintenanceSchedule['triggers'][number],
): TriggerDraft {
  const config = trigger.config;
  const condition =
    config.condition && typeof config.condition === 'object'
      ? (config.condition as Record<string, unknown>)
      : {};
  return {
    ...makeTrigger(trigger.type),
    type: trigger.type,
    rrule:
      typeof config.rrule === 'string'
        ? config.rrule
        : 'FREQ=MONTHLY;INTERVAL=1',
    time: typeof config.time === 'string' ? config.time : '08:00',
    meterId: typeof config.meterId === 'string' ? config.meterId : '',
    threshold:
      typeof config.threshold === 'number' ? String(config.threshold) : '',
    eventKey: typeof config.eventKey === 'string' ? config.eventKey : '',
    conditionFact:
      typeof condition.fact === 'string' ? condition.fact : 'severity',
    conditionOp: ['eq', 'neq', 'gt', 'gte', 'contains'].includes(
      String(condition.op),
    )
      ? (condition.op as TriggerDraft['conditionOp'])
      : 'eq',
    conditionValue:
      condition.value === undefined ? '' : String(condition.value),
  };
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function SchedulesPage({ tenantSlug }: { tenantSlug: string }) {
  const { user } = useAuth();
  const canManage = hasPermission(user, PERMISSIONS.MAINTENANCE_SCHEDULE_MANAGE);
  const [schedules, setSchedules] = useState<MaintenanceSchedule[]>([]);
  const [jobPlans, setJobPlans] = useState<MaintenanceJobPlan[]>([]);
  const [workflows, setWorkflows] = useState<WorkflowDefinition[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [meters, setMeters] = useState<EquipmentMeter[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [timezone, setTimezone] = useState('Asia/Ho_Chi_Minh');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [preview, setPreview] = useState<MaintenanceSchedulePreview | null>(
    null,
  );
  const [previewing, setPreviewing] = useState(false);
  const [form, setForm] = useState({
    code: '',
    name: '',
    description: '',
    siteId: '',
    jobPlanId: '',
    workflowDefinitionId: '',
    startDate: todayIso(),
    endDate: '',
    targetIds: [] as string[],
    assigneeId: '',
    reviewerId: '',
    reminderMinutes: '1440, 120',
    activateNow: true,
    triggers: [makeTrigger()] as TriggerDraft[],
  });

  const load = useCallback(async () => {
    setLoading(true);
    const results = await Promise.allSettled([
      maintenanceApi.getSchedules(),
      maintenanceApi.getJobPlans(),
      workflowApi.getDefinitions(),
      equipmentApi.getAll(),
      maintenanceApi.getMeters(),
      tenancyService.getSettings(),
      usersService.getUsers(),
    ]);
    setSchedules(results[0].status === 'fulfilled' ? results[0].value : []);
    setJobPlans(results[1].status === 'fulfilled' ? results[1].value : []);
    setWorkflows(results[2].status === 'fulfilled' ? results[2].value : []);
    setEquipment(results[3].status === 'fulfilled' ? results[3].value : []);
    setMeters(results[4].status === 'fulfilled' ? results[4].value : []);
    if (results[5].status === 'fulfilled') {
      setSites(results[5].value.sites);
      setTimezone(results[5].value.tenant.timezone);
    }
    setUsers(results[6].status === 'fulfilled' ? results[6].value.items : []);
    if (results.every((result) => result.status === 'rejected')) {
      toast.error('Không thể tải dữ liệu lập lịch.');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load, tenantSlug]);

  const publishedPlans = useMemo(
    () => jobPlans.filter((item) => item.status === 'published'),
    [jobPlans],
  );
  const publishedWorkflows = useMemo(
    () => workflows.filter((item) => item.status === 'published'),
    [workflows],
  );
  const filteredEquipment = useMemo(
    () =>
      form.siteId
        ? equipment.filter((item) => !item.siteId || item.siteId === form.siteId)
        : equipment,
    [equipment, form.siteId],
  );

  const resetWizard = () => {
    setEditingId(null);
    setPreview(null);
    setWizardStep(1);
    setForm({
      code: '',
      name: '',
      description: '',
      siteId: sites[0]?.id ?? '',
      jobPlanId: publishedPlans[0]?.id ?? '',
      workflowDefinitionId: publishedWorkflows[0]?.id ?? '',
      startDate: todayIso(),
      endDate: '',
      targetIds: [],
      assigneeId: '',
      reviewerId: '',
      reminderMinutes: '1440, 120',
      activateNow: true,
      triggers: [makeTrigger()],
    });
    setWizardOpen(true);
  };

  const editSchedule = (schedule: MaintenanceSchedule) => {
    setEditingId(schedule.id);
    setPreview(null);
    setWizardStep(1);
    setForm({
      code: schedule.code,
      name: schedule.name,
      description: schedule.description ?? '',
      siteId: schedule.siteId ?? '',
      jobPlanId: schedule.jobPlanId,
      workflowDefinitionId: schedule.workflowDefinitionId,
      startDate: schedule.startDate,
      endDate: schedule.endDate ?? '',
      targetIds: schedule.targets
        .filter((target) => target.targetType === 'EQUIPMENT')
        .map((target) => target.targetId),
      assigneeId: schedule.defaultAssigneeId ?? '',
      reviewerId: schedule.defaultTechnicalReviewerId ?? '',
      reminderMinutes: schedule.reminderMinutes.join(', '),
      activateNow: false,
      triggers: schedule.triggers.map(triggerFromSchedule),
    });
    setWizardOpen(true);
  };

  const updateTrigger = (localId: string, patch: Partial<TriggerDraft>) => {
    setForm((current) => ({
      ...current,
      triggers: current.triggers.map((trigger) =>
        trigger.localId === localId ? { ...trigger, ...patch } : trigger,
      ),
    }));
  };

  const toggleTarget = (id: string) => {
    setForm((current) => ({
      ...current,
      targetIds: current.targetIds.includes(id)
        ? current.targetIds.filter((value) => value !== id)
        : [...current.targetIds, id],
    }));
  };

  const canContinue = () => {
    if (wizardStep === 1) {
      return Boolean(
        form.code &&
        form.name.trim() &&
        form.jobPlanId &&
        form.workflowDefinitionId &&
        form.startDate,
      );
    }
    if (wizardStep === 2) return form.targetIds.length > 0;
    if (wizardStep === 3) {
      return form.triggers.every((trigger) => {
        if (trigger.type === 'TIME_RRULE') return Boolean(trigger.rrule);
        if (trigger.type === 'METER_THRESHOLD') {
          return Boolean(trigger.meterId && Number.isFinite(Number(trigger.threshold)));
        }
        return Boolean(trigger.eventKey);
      });
    }
    return true;
  };

  const triggerPayload = (trigger: TriggerDraft) => {
    if (trigger.type === 'TIME_RRULE') {
      return {
        type: trigger.type,
        isActive: true,
        config: { rrule: trigger.rrule, time: trigger.time },
      };
    }
    if (trigger.type === 'METER_THRESHOLD') {
      return {
        type: trigger.type,
        isActive: true,
        config: {
          meterId: trigger.meterId,
          threshold: Number(trigger.threshold),
          interval: Number(trigger.threshold),
        },
      };
    }
    if (trigger.type === 'DOMAIN_EVENT') {
      return {
        type: trigger.type,
        isActive: true,
        config: { eventKey: trigger.eventKey },
      };
    }
    const numeric = Number(trigger.conditionValue);
    return {
      type: trigger.type,
      isActive: true,
      config: {
        eventKey: trigger.eventKey,
        condition: {
          fact: trigger.conditionFact,
          op: trigger.conditionOp,
          value: Number.isNaN(numeric) ? trigger.conditionValue : numeric,
        },
      },
    };
  };

  const schedulePayload = (): CreateScheduleInput => ({
    code: form.code,
    name: form.name,
    description: form.description || undefined,
    siteId: form.siteId || undefined,
    jobPlanId: form.jobPlanId,
    workflowDefinitionId: form.workflowDefinitionId,
    defaultAssigneeId: form.assigneeId || undefined,
    defaultTechnicalReviewerId: form.reviewerId || undefined,
    timezone,
    startDate: form.startDate,
    endDate: form.endDate || undefined,
    reminderMinutes: form.reminderMinutes
      .split(',')
      .map((value) => Number(value.trim()))
      .filter((value) => Number.isInteger(value) && value >= 0),
    targets: form.targetIds.map((targetId) => ({
      targetType: 'EQUIPMENT',
      targetId,
    })),
    triggers: form.triggers.map(triggerPayload),
  });

  const saveSchedule = async () => {
    if (!canContinue()) return;
    setSaving(true);
    try {
      const created = editingId
        ? await maintenanceApi.updateSchedule(editingId, schedulePayload())
        : await maintenanceApi.createSchedule(schedulePayload());
      if (form.activateNow) await maintenanceApi.activateSchedule(created.id);
      setWizardOpen(false);
      await load();
      toast.success(
        form.activateNow
          ? 'Kế hoạch đã lưu, kích hoạt và sinh lịch 90 ngày.'
          : editingId
            ? 'Đã cập nhật kế hoạch nháp.'
            : 'Đã lưu kế hoạch ở trạng thái nháp.',
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể tạo kế hoạch.');
    } finally {
      setSaving(false);
    }
  };

  const loadPreview = async () => {
    setPreviewing(true);
    try {
      setPreview(
        await maintenanceApi.previewSchedule({
          timezone,
          startDate: form.startDate,
          endDate: form.endDate || undefined,
          horizonDays: 90,
          triggers: form.triggers.map(triggerPayload),
        }),
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Không thể xem trước lịch.',
      );
    } finally {
      setPreviewing(false);
    }
  };

  const toggleSchedule = async (schedule: MaintenanceSchedule) => {
    setSaving(true);
    try {
      if (schedule.status === 'active') {
        await maintenanceApi.pauseSchedule(schedule.id);
        toast.success('Đã tạm dừng kế hoạch.');
      } else {
        await maintenanceApi.activateSchedule(schedule.id);
        toast.success('Đã kích hoạt kế hoạch và cập nhật lịch.');
      }
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể đổi trạng thái.');
    } finally {
      setSaving(false);
    }
  };

  const archiveSchedule = async (schedule: MaintenanceSchedule) => {
    if (
      !window.confirm(
        `Lưu trữ kế hoạch “${schedule.name}”? Các occurrence chưa sinh phiếu sẽ được hủy.`,
      )
    ) {
      return;
    }
    setSaving(true);
    try {
      await maintenanceApi.archiveSchedule(schedule.id);
      await load();
      toast.success('Đã lưu trữ kế hoạch.');
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Không thể lưu trữ kế hoạch.',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Protected permission={PERMISSIONS.MAINTENANCE_SCHEDULE_VIEW}>
      <MaintenanceShell
        tenantSlug={tenantSlug}
        title="Kế hoạch & trigger"
        description="Ghép mẫu công việc, quy trình, phạm vi thiết bị và nhiều điều kiện kích hoạt thành kế hoạch có thể tái sử dụng tại từng nhà máy."
        actions={
          canManage ? (
            <Button
              className="bg-white text-[#194934] hover:bg-emerald-50"
              onClick={resetWizard}
            >
              <Plus />
              Lập kế hoạch
            </Button>
          ) : null
        }
      >
        <section className="grid gap-4 sm:grid-cols-3">
          {[
            {
              label: 'Đang chạy',
              value: schedules.filter((item) => item.status === 'active').length,
              icon: Activity,
              tone: 'bg-emerald-50 text-emerald-700',
            },
            {
              label: 'Bản nháp',
              value: schedules.filter((item) => item.status === 'draft').length,
              icon: Settings2,
              tone: 'bg-slate-50 text-slate-700',
            },
            {
              label: 'Trigger đã cấu hình',
              value: schedules.reduce((sum, item) => sum + item.triggers.length, 0),
              icon: Zap,
              tone: 'bg-amber-50 text-amber-700',
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

        <section className="grid gap-4">
          {loading ? (
            Array.from({ length: 3 }, (_, index) => (
              <div key={index} className="h-36 animate-pulse rounded-2xl bg-[#EFF3EE]" />
            ))
          ) : schedules.length ? (
            schedules.map((schedule) => (
              <article
                key={schedule.id}
                className="grid gap-4 rounded-2xl border border-[#DFE7DE] bg-white p-5 shadow-sm lg:grid-cols-[1fr_auto]"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <strong className="text-base text-[#2C3930]">{schedule.name}</strong>
                    <Badge
                      variant="outline"
                      className={
                        schedule.status === 'active'
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                          : schedule.status === 'paused'
                            ? 'border-amber-200 bg-amber-50 text-amber-700'
                            : ''
                      }
                    >
                      {schedule.status === 'active'
                        ? 'Đang chạy'
                        : schedule.status === 'paused'
                          ? 'Tạm dừng'
                          : schedule.status === 'archived'
                            ? 'Đã lưu trữ'
                            : 'Bản nháp'}
                    </Badge>
                    <span className="text-xs font-bold text-[#879188]">{schedule.code}</span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-[#748078]">
                    {schedule.description || 'Chưa có mô tả kế hoạch.'}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Badge variant="secondary">
                      {schedule.jobPlan?.name ?? 'Mẫu công việc'}
                    </Badge>
                    <Badge variant="secondary">
                      {schedule.workflowDefinition?.name ?? 'Quy trình'}
                    </Badge>
                    {schedule.site ? (
                      <Badge variant="outline">{schedule.site.name}</Badge>
                    ) : null}
                    <Badge variant="outline">
                      {schedule.targets.length} thiết bị/nhóm
                    </Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {schedule.triggers.map((trigger) => {
                      const meta = triggerMeta[trigger.type];
                      const Icon = meta.icon;
                      return (
                        <span
                          key={trigger.id}
                          className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold ${meta.tone}`}
                        >
                          <Icon size={13} />
                          {meta.label}
                          {trigger.nextDueAt
                            ? ` · ${new Date(trigger.nextDueAt).toLocaleDateString('vi-VN')}`
                            : ''}
                        </span>
                      );
                    })}
                  </div>
                </div>
                {canManage ? (
                  <div className="flex flex-wrap items-start justify-end gap-2">
                    {schedule.status === 'draft' &&
                      schedule.targets.every(
                        (target) => target.targetType === 'EQUIPMENT',
                      ) ? (
                      <Button
                        variant="outline"
                        onClick={() => editSchedule(schedule)}
                        disabled={saving}
                      >
                        <Pencil />
                        Chỉnh sửa
                      </Button>
                    ) : null}
                    {schedule.status !== 'archived' ? (
                      <Button
                        variant={schedule.status === 'active' ? 'outline' : 'default'}
                        onClick={() => void toggleSchedule(schedule)}
                        disabled={saving}
                      >
                        {schedule.status === 'active' ? <Pause /> : <Play />}
                        {schedule.status === 'active' ? 'Tạm dừng' : 'Kích hoạt'}
                      </Button>
                    ) : null}
                    {schedule.status !== 'archived' ? (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-[#7D8780] hover:text-red-700"
                        aria-label={`Lưu trữ ${schedule.name}`}
                        onClick={() => void archiveSchedule(schedule)}
                        disabled={saving}
                      >
                        <Archive />
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </article>
            ))
          ) : (
            <div className="grid place-items-center rounded-2xl border border-dashed border-[#D4DED3] bg-white px-5 py-16 text-center">
              <CalendarClock className="text-[#9BA69D]" />
              <strong className="mt-3 text-[#3F4C44]">Chưa có kế hoạch bảo trì</strong>
              <span className="mt-1 max-w-md text-sm text-[#7A857D]">
                Hãy công bố ít nhất một mẫu công việc và một quy trình trước khi lập kế hoạch.
              </span>
            </div>
          )}
        </section>
      </MaintenanceShell>

      <Dialog open={wizardOpen} onOpenChange={setWizardOpen}>
        <DialogContent className="flex h-[min(86vh,780px)] w-[calc(100vw-2rem)] max-w-[1280px] flex-col gap-0 overflow-hidden border-[#DCE6DB] bg-[#F8FAF7] p-0 sm:rounded-xl [&_input]:bg-white [&_textarea]:bg-white">
          <DialogHeader className="shrink-0 border-b border-[#E2E9E1] bg-white px-6 py-5 pr-12">
            <DialogTitle>
              {editingId ? 'Chỉnh sửa kế hoạch nháp' : 'Lập kế hoạch bảo trì'}
            </DialogTitle>
            <DialogDescription>
              Bước {wizardStep}/4 ·{' '}
              {['Thông tin chung', 'Phạm vi thiết bị', 'Điều kiện kích hoạt', 'Phân công & xác nhận'][
                wizardStep - 1
              ]}
            </DialogDescription>
          </DialogHeader>

          <div className="grid shrink-0 grid-cols-4 gap-2 border-b border-[#E2E9E1] bg-[#FAFCF9] px-6 py-3.5">
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className="grid gap-1">
                <span
                  className={`h-1.5 rounded-full ${step <= wizardStep ? 'bg-emerald-500' : 'bg-[#E2E8E1]'
                    }`}
                />
                <span className="hidden text-[10px] font-bold text-[#7A857D] sm:block">
                  {step}. {['Nền tảng', 'Thiết bị', 'Trigger', 'Phân công'][step - 1]}
                </span>
              </div>
            ))}
          </div>

          <ScrollArea className="min-h-0 flex-1">
            <div className="min-h-[390px] px-6 py-5">
              {wizardStep === 1 ? (
                <div className="grid gap-4">
                  <div className="grid gap-3 lg:grid-cols-2">
                    <Label className="grid gap-1.5 text-sm font-bold">
                      Mã kế hoạch *
                      <Input
                        value={form.code}
                        placeholder="SCH-TURBINE-01"
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            code: event.target.value
                              .toUpperCase()
                              .replace(/[^A-Z0-9_-]/g, ''),
                          }))
                        }
                      />
                    </Label>
                    <Label className="grid gap-1.5 text-sm font-bold">
                      Nhà máy
                      <Select
                        value={form.siteId || '__all__'}
                        onValueChange={(siteId) =>
                          setForm((current) => ({
                            ...current,
                            siteId: siteId === '__all__' ? '' : siteId,
                            targetIds: [],
                          }))
                        }
                      >
                        <SelectTrigger className="w-full bg-white">
                          <SelectValue placeholder="Toàn doanh nghiệp" />
                        </SelectTrigger>
                        <SelectContent position="popper" align="start">
                          <SelectItem value="__all__">Toàn doanh nghiệp</SelectItem>
                          {sites.map((site) => (
                            <SelectItem key={site.id} value={site.id}>
                              {site.code} · {site.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Label>
                  </div>
                  <Label className="grid gap-1.5 text-sm font-bold">
                    Tên kế hoạch *
                    <Input
                      value={form.name}
                      placeholder="Bảo dưỡng tuabin hàng tháng"
                      onChange={(event) =>
                        setForm((current) => ({ ...current, name: event.target.value }))
                      }
                    />
                  </Label>
                  <Label className="grid gap-1.5 text-sm font-bold">
                    Mô tả
                    <Textarea
                      rows={3}
                      value={form.description}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          description: event.target.value,
                        }))
                      }
                    />
                  </Label>
                  <div className="grid gap-3 lg:grid-cols-2">
                    <Label className="grid gap-1.5 text-sm font-bold">
                      Mẫu công việc đã công bố *
                      <Select
                        value={form.jobPlanId || '__none__'}
                        onValueChange={(jobPlanId) =>
                          setForm((current) => ({
                            ...current,
                            jobPlanId: jobPlanId === '__none__' ? '' : jobPlanId,
                          }))
                        }
                      >
                        <SelectTrigger className="w-full bg-white">
                          <SelectValue placeholder="Chọn mẫu công việc" />
                        </SelectTrigger>
                        <SelectContent position="popper" align="start">
                          <SelectItem value="__none__">Chọn mẫu công việc</SelectItem>
                          {publishedPlans.map((plan) => (
                            <SelectItem key={plan.id} value={plan.id}>
                              {plan.code} · {plan.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Label>
                    <Label className="grid gap-1.5 text-sm font-bold">
                      Quy trình đã công bố <span className="text-red-500">*</span>
                      <Select
                        value={form.workflowDefinitionId || '__none__'}
                        onValueChange={(workflowDefinitionId) =>
                          setForm((current) => ({
                            ...current,
                            workflowDefinitionId:
                              workflowDefinitionId === '__none__'
                                ? ''
                                : workflowDefinitionId,
                          }))
                        }
                      >
                        <SelectTrigger className="w-full bg-white">
                          <SelectValue placeholder="Chọn quy trình" />
                        </SelectTrigger>
                        <SelectContent position="popper" align="start">
                          <SelectItem value="__none__">Chọn quy trình</SelectItem>
                          {publishedWorkflows.map((workflow) => (
                            <SelectItem key={workflow.id} value={workflow.id}>
                              {workflow.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Label>
                  </div>
                  <div className="grid gap-3 lg:grid-cols-2">
                    <Label className="grid gap-1.5 text-sm font-bold">
                      Bắt đầu *
                      <Input
                        type="date"
                        value={form.startDate}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            startDate: event.target.value,
                          }))
                        }
                      />
                    </Label>
                    <Label className="grid gap-1.5 text-sm font-bold">
                      Kết thúc (tùy chọn)
                      <Input
                        type="date"
                        value={form.endDate}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            endDate: event.target.value,
                          }))
                        }
                      />
                    </Label>
                  </div>
                </div>
              ) : null}

              {wizardStep === 2 ? (
                <div>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <strong className="text-sm text-[#334039]">Chọn thiết bị áp dụng</strong>
                      <p className="mt-1 text-xs text-[#7B857E]">
                        Có thể chọn nhiều thiết bị; nhóm thiết bị được hỗ trợ qua API.
                      </p>
                    </div>
                    <Badge variant="outline">{form.targetIds.length} đã chọn</Badge>
                  </div>
                  <ScrollArea className="mt-4 h-[340px] pr-3">
                    <div className="grid gap-2 lg:grid-cols-2">
                      {filteredEquipment.map((item) => {
                        const checked = form.targetIds.includes(item.id);
                        return (
                          <Button
                            key={item.id}
                            type="button"
                            variant="outline"
                            aria-pressed={checked}
                            onClick={() => toggleTarget(item.id)}
                            className={`h-auto w-full justify-start gap-3 rounded-xl p-3 text-left transition ${checked
                              ? 'border-emerald-300 bg-emerald-50'
                              : 'border-[#E0E7DF] hover:border-[#C9D6C8]'
                              }`}
                          >
                            <span
                              className={`grid size-5 place-items-center rounded border ${checked
                                ? 'border-emerald-600 bg-emerald-600 text-white'
                                : 'border-[#C7D0C7] bg-white'
                                }`}
                            >
                              {checked ? <Check size={13} /> : null}
                            </span>
                            <span className="min-w-0">
                              <strong className="block truncate text-sm text-[#354139]">
                                {item.name}
                              </strong>
                              <span className="text-xs text-[#7C867F]">
                                {item.code} · {item.category || 'Chưa phân loại'}
                              </span>
                            </span>
                          </Button>
                        );
                      })}
                    </div>
                  </ScrollArea>
                  {!filteredEquipment.length ? (
                    <div className="mt-8 text-center text-sm text-[#7A857D]">
                      Nhà máy này chưa có thiết bị phù hợp.
                    </div>
                  ) : null}
                </div>
              ) : null}

              {wizardStep === 3 ? (
                <div className="grid gap-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <strong className="text-sm text-[#334039]">Điều kiện sinh việc</strong>
                      <p className="mt-1 text-xs text-[#7B857E]">
                        Một kế hoạch có thể có nhiều trigger độc lập.
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setForm((current) => ({
                          ...current,
                          triggers: [...current.triggers, makeTrigger()],
                        }))
                      }
                    >
                      <Plus />
                      Thêm trigger
                    </Button>
                  </div>
                  {form.triggers.map((trigger, index) => {
                    const meta = triggerMeta[trigger.type];
                    const Icon = meta.icon;
                    return (
                      <div
                        key={trigger.localId}
                        className="grid gap-3 rounded-2xl border border-[#DEE6DD] bg-[#FAFCF9] p-4"
                      >
                        <div className="flex items-center gap-3">
                          <span className={`grid size-9 place-items-center rounded-xl ${meta.tone}`}>
                            <Icon size={17} />
                          </span>
                          <Select
                            value={trigger.type}
                            onValueChange={(type) =>
                              updateTrigger(trigger.localId, {
                                type: type as MaintenanceTriggerType,
                              })
                            }
                          >
                            <SelectTrigger className="flex-1 bg-white font-bold">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent position="popper" align="start">
                              {(Object.keys(triggerMeta) as MaintenanceTriggerType[]).map(
                                (type) => (
                                  <SelectItem key={type} value={type}>
                                    {triggerMeta[type].label}
                                  </SelectItem>
                                ),
                              )}
                            </SelectContent>
                          </Select>
                          {form.triggers.length > 1 ? (
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              className="text-red-600"
                              aria-label={`Xóa trigger ${index + 1}`}
                              onClick={() =>
                                setForm((current) => ({
                                  ...current,
                                  triggers: current.triggers.filter(
                                    (item) => item.localId !== trigger.localId,
                                  ),
                                }))
                              }
                            >
                              <Trash2 />
                            </Button>
                          ) : null}
                        </div>

                        {trigger.type === 'TIME_RRULE' ? (
                          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_130px]">
                            <Label className="grid gap-1 text-xs font-bold">
                              Quy luật lặp
                              <Select
                                value={trigger.rrule}
                                onValueChange={(rrule) =>
                                  updateTrigger(trigger.localId, {
                                    rrule,
                                  })
                                }
                              >
                                <SelectTrigger className="w-full bg-white">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent position="popper" align="start">
                                  <SelectItem value="FREQ=DAILY;INTERVAL=1">Mỗi ngày</SelectItem>
                                  <SelectItem value="FREQ=WEEKLY;INTERVAL=1">Mỗi tuần</SelectItem>
                                  <SelectItem value="FREQ=MONTHLY;INTERVAL=1">Mỗi tháng</SelectItem>
                                  <SelectItem value="FREQ=MONTHLY;INTERVAL=3">Mỗi quý</SelectItem>
                                  <SelectItem value="FREQ=YEARLY;INTERVAL=1">Mỗi năm</SelectItem>
                                </SelectContent>
                              </Select>
                            </Label>
                            <Label className="grid gap-1 text-xs font-bold">
                              Giờ thực hiện
                              <Input
                                type="time"
                                value={trigger.time}
                                onChange={(event) =>
                                  updateTrigger(trigger.localId, {
                                    time: event.target.value,
                                  })
                                }
                              />
                            </Label>
                          </div>
                        ) : null}

                        {trigger.type === 'METER_THRESHOLD' ? (
                          <div className="grid gap-3 lg:grid-cols-2">
                            <Label className="grid gap-1 text-xs font-bold">
                              Đồng hồ/chỉ số
                              <Select
                                value={trigger.meterId || '__none__'}
                                onValueChange={(meterId) =>
                                  updateTrigger(trigger.localId, {
                                    meterId: meterId === '__none__' ? '' : meterId,
                                  })
                                }
                              >
                                <SelectTrigger className="w-full bg-white">
                                  <SelectValue placeholder="Chọn chỉ số" />
                                </SelectTrigger>
                                <SelectContent position="popper" align="start">
                                  <SelectItem value="__none__">Chọn chỉ số</SelectItem>
                                  {meters
                                    .filter((meter) =>
                                      form.targetIds.includes(meter.equipmentId),
                                    )
                                    .map((meter) => (
                                      <SelectItem key={meter.id} value={meter.id}>
                                        {meter.name} ({meter.unit})
                                      </SelectItem>
                                    ))}
                                </SelectContent>
                              </Select>
                            </Label>
                            <Label className="grid gap-1 text-xs font-bold">
                              Mỗi khi tăng thêm
                              <Input
                                type="number"
                                min={0}
                                value={trigger.threshold}
                                onChange={(event) =>
                                  updateTrigger(trigger.localId, {
                                    threshold: event.target.value,
                                  })
                                }
                              />
                            </Label>
                          </div>
                        ) : null}

                        {['DOMAIN_EVENT', 'CONDITION'].includes(trigger.type) ? (
                          <div className="grid gap-3">
                            <Label className="grid gap-1 text-xs font-bold">
                              Mã sự kiện
                              <Input
                                value={trigger.eventKey}
                                placeholder="equipment.alarm.raised"
                                onChange={(event) =>
                                  updateTrigger(trigger.localId, {
                                    eventKey: event.target.value,
                                  })
                                }
                              />
                            </Label>
                            {trigger.type === 'CONDITION' ? (
                              <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_110px_minmax(0,1fr)]">
                                <Label className="grid gap-1 text-[11px] font-bold">
                                  Trường dữ liệu
                                  <Input
                                    value={trigger.conditionFact}
                                    onChange={(event) =>
                                      updateTrigger(trigger.localId, {
                                        conditionFact: event.target.value,
                                      })
                                    }
                                  />
                                </Label>
                                <Label className="grid gap-1 text-[11px] font-bold">
                                  So sánh
                                  <Select
                                    value={trigger.conditionOp}
                                    onValueChange={(conditionOp) =>
                                      updateTrigger(trigger.localId, {
                                        conditionOp:
                                          conditionOp as TriggerDraft['conditionOp'],
                                      })
                                    }
                                  >
                                    <SelectTrigger className="w-full bg-white px-2">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent position="popper" align="start">
                                      <SelectItem value="eq">Bằng</SelectItem>
                                      <SelectItem value="neq">Khác</SelectItem>
                                      <SelectItem value="gt">Lớn hơn</SelectItem>
                                      <SelectItem value="gte">≥</SelectItem>
                                      <SelectItem value="contains">Chứa</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </Label>
                                <Label className="grid gap-1 text-[11px] font-bold">
                                  Giá trị
                                  <Input
                                    value={trigger.conditionValue}
                                    onChange={(event) =>
                                      updateTrigger(trigger.localId, {
                                        conditionValue: event.target.value,
                                      })
                                    }
                                  />
                                </Label>
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ) : null}

              {wizardStep === 4 ? (
                <div className="grid gap-4">
                  <div className="grid gap-3 lg:grid-cols-2">
                    <Label className="grid gap-1.5 text-sm font-bold">
                      Người thực hiện mặc định
                      <Select
                        value={form.assigneeId || '__none__'}
                        onValueChange={(assigneeId) =>
                          setForm((current) => ({
                            ...current,
                            assigneeId: assigneeId === '__none__' ? '' : assigneeId,
                          }))
                        }
                      >
                        <SelectTrigger className="w-full bg-white">
                          <SelectValue placeholder="Quy trình tự xác định" />
                        </SelectTrigger>
                        <SelectContent position="popper" align="start">
                          <SelectItem value="__none__">Quy trình tự xác định</SelectItem>
                          {users.map((item) => (
                            <SelectItem key={item.id} value={item.id}>
                              {item.displayName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Label>
                    <Label className="grid gap-1.5 text-sm font-bold">
                      Người kiểm tra kỹ thuật
                      <Select
                        value={form.reviewerId || '__none__'}
                        onValueChange={(reviewerId) =>
                          setForm((current) => ({
                            ...current,
                            reviewerId: reviewerId === '__none__' ? '' : reviewerId,
                          }))
                        }
                      >
                        <SelectTrigger className="w-full bg-white">
                          <SelectValue placeholder="Quy trình tự xác định" />
                        </SelectTrigger>
                        <SelectContent position="popper" align="start">
                          <SelectItem value="__none__">Quy trình tự xác định</SelectItem>
                          {users.map((item) => (
                            <SelectItem key={item.id} value={item.id}>
                              {item.displayName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Label>
                  </div>
                  <Label className="grid gap-1.5 text-sm font-bold">
                    Nhắc trước (phút, phân cách bằng dấu phẩy)
                    <Input
                      value={form.reminderMinutes}
                      placeholder="1440, 120"
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          reminderMinutes: event.target.value,
                        }))
                      }
                    />
                    <span className="text-xs font-normal text-[#7A857D]">
                      Ví dụ 1440 = trước 1 ngày, 120 = trước 2 giờ. Kênh release đầu:
                      thông báo trong ứng dụng.
                    </span>
                  </Label>
                  <Label className="flex items-center gap-3 rounded-2xl border border-[#DCE6DB] bg-emerald-50/60 p-4">
                    <Checkbox
                      checked={form.activateNow}
                      onCheckedChange={(checked) =>
                        setForm((current) => ({
                          ...current,
                          activateNow: checked === true,
                        }))
                      }
                    />
                    <span>
                      <strong className="block text-sm text-[#32503D]">
                        Kích hoạt ngay sau khi lưu
                      </strong>
                      <span className="mt-0.5 block text-xs text-[#66806E]">
                        Hệ thống sinh trước lịch 90 ngày cho trigger thời gian.
                      </span>
                    </span>
                  </Label>
                  <div className="grid gap-2 rounded-2xl bg-[#F5F8F4] p-4 text-sm text-[#4C5951]">
                    <span className="flex items-center gap-2">
                      <UsersRound size={16} className="text-emerald-700" />
                      {form.targetIds.length} thiết bị · {form.triggers.length} trigger
                    </span>
                    <span className="flex items-center gap-2">
                      <CalendarClock size={16} className="text-emerald-700" />
                      Bắt đầu {new Date(`${form.startDate}T00:00:00`).toLocaleDateString('vi-VN')}
                    </span>
                  </div>
                  <div className="rounded-2xl border border-[#DCE6DB] bg-white p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span>
                        <strong className="block text-sm text-[#35443A]">
                          Xem trước chu kỳ
                        </strong>
                        <span className="text-xs text-[#78837B]">
                          Kiểm tra các mốc RRULE trước khi lưu kế hoạch.
                        </span>
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => void loadPreview()}
                        disabled={previewing}
                      >
                        <Eye />
                        {previewing ? 'Đang tính…' : 'Xem trước'}
                      </Button>
                    </div>
                    {preview ? (
                      <div className="mt-3 grid gap-2">
                        <span className="text-xs font-bold text-[#5D6B62]">
                          {preview.items.length} mốc từ {preview.from} đến {preview.to}
                          {preview.truncated ? ' (đã rút gọn)' : ''}
                        </span>
                        <ScrollArea className="h-40 rounded-xl bg-[#F6F8F5]">
                          <div className="grid gap-1 p-3 lg:grid-cols-2">
                            {preview.items.slice(0, 20).map((item) => (
                              <span
                                key={`${item.triggerIndex}-${item.plannedStartAt}`}
                                className="text-xs text-[#58655D]"
                              >
                                Trigger {item.triggerIndex + 1} ·{' '}
                                {new Date(item.plannedStartAt).toLocaleString('vi-VN', {
                                  timeZone: preview.timezone,
                                })}
                              </span>
                            ))}
                            {!preview.items.length ? (
                              <span className="text-xs text-amber-700">
                                Không có mốc thời gian trong khoảng xem trước.
                              </span>
                            ) : null}
                          </div>
                        </ScrollArea>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>

          </ScrollArea>

          <DialogFooter className="shrink-0 border-t border-[#E2E9E1] bg-white px-6 py-4">
            {wizardStep > 1 ? (
              <Button
                variant="outline"
                onClick={() => setWizardStep((step) => step - 1)}
              >
                <ChevronLeft />
                Quay lại
              </Button>
            ) : (
              <Button variant="outline" onClick={() => setWizardOpen(false)}>
                Hủy
              </Button>
            )}
            {wizardStep < 4 ? (
              <Button
                onClick={() => setWizardStep((step) => step + 1)}
                disabled={!canContinue()}
              >
                Tiếp tục
                <ChevronRight />
              </Button>
            ) : (
              <Button
                onClick={() => void saveSchedule()}
                disabled={saving || !canContinue()}
              >
                {form.activateNow ? <Play /> : <Check />}
                {form.activateNow
                  ? 'Lưu & kích hoạt'
                  : editingId
                    ? 'Cập nhật bản nháp'
                    : 'Lưu bản nháp'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Protected>
  );
}
