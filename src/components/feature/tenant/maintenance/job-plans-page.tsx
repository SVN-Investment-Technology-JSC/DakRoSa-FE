'use client';

import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronRight,
  ClipboardCheck,
  FileText,
  Gauge,
  GripVertical,
  ImagePlus,
  ListChecks,
  Plus,
  Save,
  Send,
  Trash2,
} from 'lucide-react';
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
import { maintenanceApi } from '@/lib/api-maintenance';
import { PERMISSIONS } from '@/lib/navigation';
import { hasPermission } from '@/lib/permissions';
import { useAuth } from '@/providers/auth-provider';
import type {
  JobPlanStep,
  MaintenanceJobPlan,
  MaintenanceStepType,
} from '@/types/maintenance';
import { MaintenanceShell } from './maintenance-shell';

const stepMeta: Record<
  MaintenanceStepType,
  { label: string; description: string; icon: typeof FileText; tone: string }
> = {
  INSTRUCTION: {
    label: 'Hướng dẫn',
    description: 'Mô tả thao tác hoặc quy tắc an toàn',
    icon: FileText,
    tone: 'bg-blue-50 text-blue-700',
  },
  CHECKLIST: {
    label: 'Xác nhận',
    description: 'Một điểm kiểm tra đạt/không đạt',
    icon: ClipboardCheck,
    tone: 'bg-emerald-50 text-emerald-700',
  },
  MEASUREMENT: {
    label: 'Đo lường',
    description: 'Thu thập giá trị, đơn vị và ngưỡng',
    icon: Gauge,
    tone: 'bg-amber-50 text-amber-700',
  },
  EVIDENCE: {
    label: 'Minh chứng',
    description: 'Yêu cầu ảnh hoặc tài liệu',
    icon: ImagePlus,
    tone: 'bg-violet-50 text-violet-700',
  },
};

function newStep(index: number, type: MaintenanceStepType = 'CHECKLIST'): JobPlanStep {
  return {
    key: `step_${index + 1}`,
    type,
    title: `Bước ${index + 1}`,
    description: '',
    isRequired: true,
    config:
      type === 'MEASUREMENT'
        ? { unit: '', min: null, max: null }
        : type === 'EVIDENCE'
          ? { accept: 'image/*', minimumFiles: 1 }
          : {},
  };
}

export function JobPlansPage({ tenantSlug }: { tenantSlug: string }) {
  const { user } = useAuth();
  const canManage = hasPermission(user, PERMISSIONS.MAINTENANCE_JOB_PLAN_MANAGE);
  const canPublish = hasPermission(user, PERMISSIONS.MAINTENANCE_JOB_PLAN_PUBLISH);
  const [plans, setPlans] = useState<MaintenanceJobPlan[]>([]);
  const [selected, setSelected] = useState<MaintenanceJobPlan | null>(null);
  const [steps, setSteps] = useState<JobPlanStep[]>([]);
  const [selectedStepKey, setSelectedStepKey] = useState('');
  const [estimatedMinutes, setEstimatedMinutes] = useState(60);
  const [skillsText, setSkillsText] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    code: '',
    name: '',
    category: '',
    description: '',
  });

  const hydrateEditor = useCallback((plan: MaintenanceJobPlan) => {
    setSelected(plan);
    const nextSteps = plan.selectedVersion?.steps ?? [];
    setSteps(nextSteps);
    setSelectedStepKey(nextSteps[0]?.key ?? '');
    setEstimatedMinutes(plan.selectedVersion?.estimatedMinutes ?? 60);
    setSkillsText((plan.selectedVersion?.requiredSkills ?? []).join(', '));
  }, []);

  const load = useCallback(
    async (preferredId?: string) => {
      setLoading(true);
      try {
        const list = await maintenanceApi.getJobPlans();
        setPlans(list);
        const id = preferredId ?? list[0]?.id;
        if (id) {
          hydrateEditor(await maintenanceApi.getJobPlan(id));
        } else {
          setSelected(null);
          setSteps([]);
          setSelectedStepKey('');
          setEstimatedMinutes(60);
          setSkillsText('');
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Không thể tải mẫu công việc.');
      } finally {
        setLoading(false);
      }
    },
    [hydrateEditor],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load, tenantSlug]);

  const activeStep = useMemo(
    () => steps.find((step) => step.key === selectedStepKey) ?? null,
    [selectedStepKey, steps],
  );

  const choosePlan = async (id: string) => {
    setLoading(true);
    try {
      hydrateEditor(await maintenanceApi.getJobPlan(id));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể mở mẫu.');
    } finally {
      setLoading(false);
    }
  };

  const updateStep = (key: string, patch: Partial<JobPlanStep>) => {
    setSteps((current) =>
      current.map((step) => (step.key === key ? { ...step, ...patch } : step)),
    );
  };

  const moveStep = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= steps.length) return;
    setSteps((current) => {
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const addStep = (type: MaintenanceStepType) => {
    const step = newStep(steps.length, type);
    const used = new Set(steps.map((item) => item.key));
    let suffix = steps.length + 1;
    while (used.has(step.key)) step.key = `step_${++suffix}`;
    setSteps((current) => [...current, step]);
    setSelectedStepKey(step.key);
  };

  const removeStep = (key: string) => {
    if (steps.length <= 1) {
      toast.error('Mẫu công việc cần ít nhất một bước.');
      return;
    }
    const index = steps.findIndex((step) => step.key === key);
    const next = steps.filter((step) => step.key !== key);
    setSteps(next);
    setSelectedStepKey(next[Math.max(0, index - 1)]?.key ?? '');
  };

  const save = async () => {
    if (!selected?.id) return;
    if (steps.some((step) => !step.title.trim() || !step.key.trim())) {
      toast.error('Mỗi bước cần mã và tên rõ ràng.');
      return;
    }
    setSaving(true);
    try {
      const saved = await maintenanceApi.saveJobPlan(selected.id, {
        estimatedMinutes,
        requiredSkills: skillsText
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean),
        steps: steps.map((step) => ({
          key: step.key,
          type: step.type,
          title: step.title,
          description: step.description ?? undefined,
          isRequired: step.isRequired,
          config: step.config,
        })),
      });
      hydrateEditor(saved);
      await load(saved.id);
      toast.success('Đã lưu phiên bản nháp.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể lưu mẫu.');
    } finally {
      setSaving(false);
    }
  };

  const publish = async () => {
    if (!selected?.id) return;
    setSaving(true);
    try {
      const saved = await maintenanceApi.publishJobPlan(selected.id);
      hydrateEditor(saved);
      await load(saved.id);
      toast.success('Mẫu công việc đã được công bố và khóa phiên bản.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể công bố mẫu.');
    } finally {
      setSaving(false);
    }
  };

  const create = async () => {
    if (!createForm.code.trim() || !createForm.name.trim()) {
      toast.error('Vui lòng nhập mã và tên mẫu.');
      return;
    }
    setSaving(true);
    try {
      const created = await maintenanceApi.createJobPlan({
        ...createForm,
        estimatedMinutes: 60,
        requiredSkills: [],
        steps: [
          {
            key: 'safety_check',
            type: 'CHECKLIST',
            title: 'Kiểm tra điều kiện an toàn',
            description: 'Xác nhận cô lập năng lượng và khu vực làm việc.',
            isRequired: true,
            config: {},
          },
        ],
      });
      setCreateOpen(false);
      setCreateForm({ code: '', name: '', category: '', description: '' });
      await load(created.id);
      toast.success('Đã tạo mẫu công việc mới.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể tạo mẫu.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Protected permission={PERMISSIONS.MAINTENANCE_JOB_PLAN_VIEW}>
      <MaintenanceShell
        tenantSlug={tenantSlug}
        title="Mẫu công việc"
        description="Chuẩn hóa hướng dẫn, checklist, phép đo và minh chứng thành phiên bản bất biến để mọi phiếu bảo trì thực hiện nhất quán."
        actions={
          canManage ? (
            <Button
              className="bg-white text-[#194934] hover:bg-emerald-50"
              onClick={() => setCreateOpen(true)}
            >
              <Plus />
              Tạo mẫu
            </Button>
          ) : null
        }
      >
        <div className="grid min-h-[650px] overflow-hidden rounded-2xl border border-[#DCE5DB] bg-white shadow-sm xl:grid-cols-[280px_minmax(0,1fr)_320px]">
          <aside className="border-b border-[#E4EAE3] bg-[#F8FAF7] xl:border-b-0 xl:border-r">
            <div className="border-b border-[#E4EAE3] p-4">
              <strong className="text-sm text-[#334039]">Thư viện mẫu</strong>
              <p className="mt-1 text-xs text-[#79837B]">{plans.length} mẫu của doanh nghiệp</p>
            </div>
            <div className="max-h-[600px] space-y-1 overflow-y-auto p-2">
              {loading && !plans.length ? (
                Array.from({ length: 5 }, (_, index) => (
                  <div key={index} className="h-20 animate-pulse rounded-xl bg-[#EAF0E9]" />
                ))
              ) : plans.length ? (
                plans.map((plan) => (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => void choosePlan(plan.id)}
                    className={`flex w-full items-center gap-3 rounded-xl p-3 text-left transition ${
                      selected?.id === plan.id
                        ? 'bg-white shadow-sm ring-1 ring-emerald-200'
                        : 'hover:bg-white/80'
                    }`}
                  >
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
                      <ListChecks size={17} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <strong className="block truncate text-sm text-[#354139]">{plan.name}</strong>
                      <span className="mt-0.5 flex items-center gap-2 text-[11px] text-[#7B857E]">
                        {plan.code}
                        <Badge
                          variant="outline"
                          className={`px-1.5 py-0 text-[10px] ${
                            plan.status === 'published'
                              ? 'border-emerald-200 text-emerald-700'
                              : 'border-amber-200 text-amber-700'
                          }`}
                        >
                          {plan.status === 'published' ? 'Đã công bố' : 'Nháp'}
                        </Badge>
                      </span>
                    </span>
                    <ChevronRight size={15} className="text-[#9AA39D]" />
                  </button>
                ))
              ) : (
                <div className="p-6 text-center text-sm text-[#758078]">
                  Chưa có mẫu công việc.
                </div>
              )}
            </div>
          </aside>

          <main className="min-w-0 border-b border-[#E4EAE3] xl:border-b-0 xl:border-r">
            {selected?.id ? (
              <>
                <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E7ECE6] px-5 py-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="truncate font-black text-[#2D3A31]">{selected.name}</h2>
                      <Badge variant="outline">
                        v{selected.selectedVersion?.versionNumber ?? 1}
                      </Badge>
                    </div>
                    <p className="mt-1 truncate text-xs text-[#78837B]">
                      {selected.description || 'Chưa có mô tả'} · {steps.length} bước
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {canManage ? (
                      <Button variant="outline" onClick={() => void save()} disabled={saving}>
                        <Save />
                        Lưu nháp
                      </Button>
                    ) : null}
                    {canPublish ? (
                      <Button onClick={() => void publish()} disabled={saving}>
                        <Send />
                        Công bố
                      </Button>
                    ) : null}
                  </div>
                </header>
                <div className="p-5">
                  <div className="mb-5 grid gap-3 rounded-2xl bg-[#F4F8F3] p-4 sm:grid-cols-2">
                    <label className="grid gap-1.5 text-xs font-bold text-[#59665D]">
                      Thời lượng dự kiến (phút)
                      <Input
                        type="number"
                        min={1}
                        value={estimatedMinutes}
                        disabled={!canManage}
                        onChange={(event) => setEstimatedMinutes(Number(event.target.value))}
                        className="bg-white"
                      />
                    </label>
                    <label className="grid gap-1.5 text-xs font-bold text-[#59665D]">
                      Kỹ năng yêu cầu (phân cách bằng dấu phẩy)
                      <Input
                        value={skillsText}
                        disabled={!canManage}
                        onChange={(event) => setSkillsText(event.target.value)}
                        placeholder="Điện cao áp, Cơ khí"
                        className="bg-white"
                      />
                    </label>
                  </div>

                  <div className="grid gap-2">
                    {steps.map((step, index) => {
                      const meta = stepMeta[step.type];
                      const Icon = meta.icon;
                      return (
                        <button
                          key={step.key}
                          type="button"
                          onClick={() => setSelectedStepKey(step.key)}
                          className={`group flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition ${
                            selectedStepKey === step.key
                              ? 'border-emerald-300 bg-emerald-50/50 shadow-sm'
                              : 'border-[#E2E8E1] hover:border-[#C7D5C6]'
                          }`}
                        >
                          <GripVertical size={16} className="shrink-0 text-[#A0AAA3]" />
                          <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${meta.tone}`}>
                            <Icon size={17} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-2">
                              <span className="text-[11px] font-black text-[#8A948D]">
                                {String(index + 1).padStart(2, '0')}
                              </span>
                              <strong className="truncate text-sm text-[#334039]">{step.title}</strong>
                              {step.isRequired ? (
                                <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
                                  Bắt buộc
                                </Badge>
                              ) : null}
                            </span>
                            <span className="mt-0.5 block truncate text-xs text-[#7A857D]">
                              {meta.label} · {step.description || meta.description}
                            </span>
                          </span>
                          {canManage ? (
                            <span className="flex opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
                              <Button
                                type="button"
                                size="icon-sm"
                                variant="ghost"
                                aria-label="Di chuyển lên"
                                disabled={index === 0}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  moveStep(index, -1);
                                }}
                              >
                                <ArrowUp />
                              </Button>
                              <Button
                                type="button"
                                size="icon-sm"
                                variant="ghost"
                                aria-label="Di chuyển xuống"
                                disabled={index === steps.length - 1}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  moveStep(index, 1);
                                }}
                              >
                                <ArrowDown />
                              </Button>
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>

                  {canManage ? (
                    <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {(Object.keys(stepMeta) as MaintenanceStepType[]).map((type) => {
                        const meta = stepMeta[type];
                        const Icon = meta.icon;
                        return (
                          <Button
                            key={type}
                            type="button"
                            variant="outline"
                            className="h-auto justify-start px-3 py-2.5"
                            onClick={() => addStep(type)}
                          >
                            <Icon />
                            <span className="text-left">
                              <span className="block text-xs">{meta.label}</span>
                            </span>
                          </Button>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              </>
            ) : (
              <div className="grid h-full min-h-[500px] place-items-center p-8 text-center">
                <div>
                  <ListChecks className="mx-auto text-[#9DA79F]" />
                  <strong className="mt-3 block text-[#435047]">Chọn một mẫu để biên soạn</strong>
                  <span className="mt-1 block text-sm text-[#7E8981]">
                    Hoặc tạo mẫu đầu tiên cho doanh nghiệp.
                  </span>
                </div>
              </div>
            )}
          </main>

          <aside className="bg-[#FBFCFA]">
            <header className="border-b border-[#E4EAE3] p-4">
              <strong className="text-sm text-[#334039]">Thuộc tính bước</strong>
              <p className="mt-1 text-xs text-[#79837B]">Cấu hình dữ liệu cần thu thập</p>
            </header>
            {activeStep ? (
              <div className="grid gap-4 p-4">
                <label className="grid gap-1.5 text-xs font-bold text-[#5B675F]">
                  Mã bước
                  <Input
                    value={activeStep.key}
                    disabled
                    title="Mã bước được khóa để giữ liên kết dữ liệu ổn định."
                  />
                </label>
                <label className="grid gap-1.5 text-xs font-bold text-[#5B675F]">
                  Loại dữ liệu
                  <select
                    className="h-9 rounded-md border border-input bg-white px-3 text-sm"
                    value={activeStep.type}
                    disabled={!canManage}
                    onChange={(event) => {
                      const type = event.target.value as MaintenanceStepType;
                      updateStep(activeStep.key, {
                        type,
                        config: newStep(0, type).config,
                      });
                    }}
                  >
                    {(Object.keys(stepMeta) as MaintenanceStepType[]).map((type) => (
                      <option key={type} value={type}>
                        {stepMeta[type].label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1.5 text-xs font-bold text-[#5B675F]">
                  Tên bước
                  <Input
                    value={activeStep.title}
                    disabled={!canManage}
                    onChange={(event) => updateStep(activeStep.key, { title: event.target.value })}
                  />
                </label>
                <label className="grid gap-1.5 text-xs font-bold text-[#5B675F]">
                  Hướng dẫn chi tiết
                  <Textarea
                    rows={5}
                    value={activeStep.description ?? ''}
                    disabled={!canManage}
                    onChange={(event) =>
                      updateStep(activeStep.key, { description: event.target.value })
                    }
                  />
                </label>
                {activeStep.type === 'MEASUREMENT' ? (
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      ['unit', 'Đơn vị'],
                      ['min', 'Min'],
                      ['max', 'Max'],
                    ].map(([key, label]) => (
                      <label key={key} className="grid gap-1 text-[11px] font-bold text-[#647068]">
                        {label}
                        <Input
                          value={String(activeStep.config[key] ?? '')}
                          disabled={!canManage}
                          onChange={(event) =>
                            updateStep(activeStep.key, {
                              config: {
                                ...activeStep.config,
                                [key]:
                                  key === 'unit'
                                    ? event.target.value
                                    : event.target.value
                                      ? Number(event.target.value)
                                      : null,
                              },
                            })
                          }
                        />
                      </label>
                    ))}
                  </div>
                ) : null}
                <label className="flex items-center gap-2 rounded-xl border border-[#E0E7DF] bg-white p-3 text-sm font-bold text-[#4B5850]">
                  <input
                    type="checkbox"
                    checked={activeStep.isRequired}
                    disabled={!canManage}
                    onChange={(event) =>
                      updateStep(activeStep.key, { isRequired: event.target.checked })
                    }
                  />
                  Bắt buộc hoàn thành
                  {activeStep.isRequired ? <Check size={15} className="ml-auto text-emerald-600" /> : null}
                </label>
                {canManage ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-2 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                    onClick={() => removeStep(activeStep.key)}
                  >
                    <Trash2 />
                    Xóa bước
                  </Button>
                ) : null}
              </div>
            ) : (
              <div className="p-8 text-center text-sm text-[#7B857E]">
                Chọn một bước để chỉnh thuộc tính.
              </div>
            )}
          </aside>
        </div>
      </MaintenanceShell>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tạo mẫu công việc</DialogTitle>
            <DialogDescription>
              Tạo khung ban đầu; bạn sẽ biên soạn chi tiết ngay sau đó.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1.5 text-sm font-bold">
                Mã mẫu *
                <Input
                  value={createForm.code}
                  placeholder="PM-TURBINE"
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      code: event.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ''),
                    }))
                  }
                />
              </label>
              <label className="grid gap-1.5 text-sm font-bold">
                Nhóm
                <Input
                  value={createForm.category}
                  placeholder="Tuabin"
                  onChange={(event) =>
                    setCreateForm((current) => ({ ...current, category: event.target.value }))
                  }
                />
              </label>
            </div>
            <label className="grid gap-1.5 text-sm font-bold">
              Tên mẫu *
              <Input
                value={createForm.name}
                placeholder="Bảo dưỡng định kỳ tuabin"
                onChange={(event) =>
                  setCreateForm((current) => ({ ...current, name: event.target.value }))
                }
              />
            </label>
            <label className="grid gap-1.5 text-sm font-bold">
              Mô tả
              <Textarea
                value={createForm.description}
                onChange={(event) =>
                  setCreateForm((current) => ({ ...current, description: event.target.value }))
                }
              />
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Hủy
            </Button>
            <Button onClick={() => void create()} disabled={saving}>
              <Plus />
              Tạo và biên soạn
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Protected>
  );
}
