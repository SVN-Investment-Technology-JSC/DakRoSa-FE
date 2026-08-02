'use client';

import {
  AlertTriangle,
  ArrowLeft,
  CalendarClock,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  FileText,
  Image as ImageIcon,
  ListChecks,
  Loader2,
  MessageSquareText,
  Package,
  Paperclip,
  Plus,
  Route,
  Save,
  Send,
  Trash2,
  Upload,
  UserRound,
  Wrench,
  XCircle,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { inventoryApi } from '@/lib/api-inventory';
import { PERMISSIONS } from '@/lib/navigation';
import { hasPermission } from '@/lib/permissions';
import { storageApi } from '@/lib/api-storage';
import { workOrderApi } from '@/lib/api-work-order';
import { useAuth } from '@/providers/auth-provider';
import type { InventoryItem, Material, Warehouse } from '@/types/inventory';
import type {
  WorkOrder,
  WorkOrderChecklistResult,
  WorkOrderStatus,
  WorkOrderUpdate,
} from '@/types/work-order';
import type { WorkflowAvailableAction } from '@/types/workflow';

type Tab = 'execution' | 'materials' | 'documents' | 'history';

interface WorkOrderMaterialRecord {
  id: string;
  materialId: string;
  warehouseId: string;
  quantity: number;
  material?: Material;
  warehouse?: Warehouse;
}

interface WorkOrderLogRecord {
  id: string;
  action: string;
  note: string | null;
  createdAt: string;
  user?: { displayName: string };
}

const statusLabels: Record<WorkOrderStatus, string> = {
  DRAFT: 'Mới tạo',
  ASSIGNED: 'Đã giao',
  IN_PROGRESS: 'Đang thực hiện',
  COMPLETED: 'Hoàn thành',
  CLOSED: 'Đã đóng',
  CANCELLED: 'Đã hủy',
};

const updateLabels: Record<WorkOrderUpdate['type'], string> = {
  PROGRESS: 'Cập nhật tiến độ',
  BLOCKER: 'Vướng mắc',
  SUPPORT_REQUEST: 'Yêu cầu hỗ trợ',
  RESULT: 'Kết quả thực hiện',
  COMMENT: 'Trao đổi',
};

const workOrderTabs: Array<{ id: Tab; label: string; icon: typeof ListChecks }> = [
  { id: 'execution', label: 'Thực hiện', icon: ListChecks },
  { id: 'materials', label: 'Vật tư', icon: Package },
  { id: 'documents', label: 'Tài liệu', icon: Paperclip },
  { id: 'history', label: 'Lịch sử', icon: Route },
];

const dateTimeFormatter = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Asia/Ho_Chi_Minh',
});

function formatDateTime(value: string | Date) {
  return dateTimeFormatter.format(new Date(value));
}

function isImage(url: string) {
  return /\.(png|jpe?g|gif|webp|bmp)(\?.*)?$/i.test(url);
}

export default function WorkOrderDetailsPage() {
  const params = useParams<{ tenantSlug: string; id: string }>();
  const { user } = useAuth();
  const canUpdate = hasPermission(user, PERMISSIONS.WORK_ORDER_UPDATE);
  const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null);
  const [materials, setMaterials] = useState<WorkOrderMaterialRecord[]>([]);
  const [stock, setStock] = useState<InventoryItem[]>([]);
  const [logs, setLogs] = useState<WorkOrderLogRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [tab, setTab] = useState<Tab>('execution');
  const [action, setAction] = useState<WorkflowAvailableAction | null>(null);
  const [actionNote, setActionNote] = useState('');
  const [actionPayload, setActionPayload] = useState<Record<string, unknown>>(
    {},
  );
  const [updateForm, setUpdateForm] = useState({
    type: 'PROGRESS' as WorkOrderUpdate['type'],
    progressPercent: 0,
    note: '',
  });
  const [infoForm, setInfoForm] = useState({
    description: '',
    rootCause: '',
    downtimeMinutes: 0,
  });
  const [materialForm, setMaterialForm] = useState({
    inventoryId: '',
    quantity: 1,
  });
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [detail, materialResult, stockResult, logResult] =
        await Promise.allSettled([
          workOrderApi.getById(params.id),
          workOrderApi.getMaterials(params.id),
          inventoryApi.getStock(),
          workOrderApi.getLogs(params.id),
        ]);
      if (detail.status === 'fulfilled') {
        setWorkOrder(detail.value);
        setInfoForm({
          description: detail.value.description ?? '',
          rootCause: detail.value.rootCause ?? '',
          downtimeMinutes: detail.value.downtimeMinutes,
        });
        setUpdateForm((current) => ({
          ...current,
          progressPercent: detail.value.progressPercent,
        }));
      } else {
        toast.error('Không thể tải phiếu công việc.');
      }
      setMaterials(
        materialResult.status === 'fulfilled'
          ? (materialResult.value as WorkOrderMaterialRecord[])
          : [],
      );
      setStock(
        stockResult.status === 'fulfilled'
          ? stockResult.value.filter((item) => item.quantity > 0)
          : [],
      );
      setLogs(
        logResult.status === 'fulfilled'
          ? (logResult.value as WorkOrderLogRecord[])
          : [],
      );
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const checklistProgress = useMemo(() => {
    const checklist = workOrder?.checklist ?? [];
    if (!checklist.length) return 100;
    const completed = checklist.filter((item) => item.status !== 'pending').length;
    return Math.round((completed / checklist.length) * 100);
  }, [workOrder?.checklist]);

  const overdue =
    workOrder?.dueAt &&
    new Date(workOrder.dueAt) < new Date() &&
    !['COMPLETED', 'CLOSED', 'CANCELLED'].includes(workOrder.status);
  const actionFields = (action?.formFields ?? []).filter(
    (field) =>
      !field.actions?.length || (action ? field.actions.includes(action.key) : false),
  );

  const openAction = (nextAction: WorkflowAvailableAction) => {
    setAction(nextAction);
    setActionNote('');
    setActionPayload(
      Object.fromEntries(
        (nextAction.formFields ?? [])
          .filter(
            (field) =>
              !field.actions?.length || field.actions.includes(nextAction.key),
          )
          .map((field) => [field.key, field.type === 'boolean' ? false : '']),
      ),
    );
  };

  const saveInfo = async () => {
    if (!workOrder) return;
    setSaving(true);
    try {
      await workOrderApi.update(workOrder.id, {
        description: infoForm.description,
        rootCause: infoForm.rootCause,
        downtimeMinutes: infoForm.downtimeMinutes,
      });
      await load();
      toast.success('Đã lưu thông tin phiếu.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể lưu phiếu.');
    } finally {
      setSaving(false);
    }
  };

  const submitUpdate = async () => {
    if (!workOrder || !updateForm.note.trim()) {
      toast.error('Vui lòng nhập nội dung cập nhật.');
      return;
    }
    setSaving(true);
    try {
      await workOrderApi.addUpdate(workOrder.id, {
        type: updateForm.type,
        progressPercent:
          updateForm.type === 'PROGRESS' ? updateForm.progressPercent : undefined,
        note: updateForm.note,
      });
      setUpdateForm((current) => ({ ...current, note: '' }));
      await load();
      toast.success('Đã ghi nhận cập nhật.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể cập nhật tiến độ.');
    } finally {
      setSaving(false);
    }
  };

  const updateChecklist = async (
    item: WorkOrderChecklistResult,
    status: WorkOrderChecklistResult['status'],
    value = item.value,
  ) => {
    if (!workOrder) return;
    setSaving(true);
    try {
      await workOrderApi.updateChecklist(workOrder.id, {
        stepId: item.stepId,
        status,
        value,
        note: item.note ?? undefined,
      });
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể cập nhật checklist.');
    } finally {
      setSaving(false);
    }
  };

  const performAction = async () => {
    if (!workOrder || !action) return;
    const missingField = actionFields.find((field) => {
      const value = actionPayload[field.key];
      return (
        field.required &&
        (value === undefined ||
          value === null ||
          (typeof value === 'string' && !value.trim()))
      );
    });
    if (missingField) {
      toast.error(`Vui lòng nhập trường “${missingField.label}”.`);
      return;
    }
    setSaving(true);
    try {
      await workOrderApi.performAction(workOrder.id, {
        actionKey: action.key,
        taskId: action.taskId,
        note: actionNote || undefined,
        payload: actionPayload,
        idempotencyKey: `${workOrder.id}-${action.taskId ?? 'task'}-${action.key}`,
      });
      setAction(null);
      setActionNote('');
      setActionPayload({});
      await load();
      toast.success(`Đã thực hiện: ${action.label}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể chuyển bước.');
    } finally {
      setSaving(false);
    }
  };

  const addMaterial = async () => {
    if (!workOrder) return;
    const selectedStock = stock.find((item) => item.id === materialForm.inventoryId);
    if (!selectedStock || materialForm.quantity <= 0) {
      toast.error('Vui lòng chọn vật tư và số lượng.');
      return;
    }
    setSaving(true);
    try {
      await workOrderApi.addMaterial(workOrder.id, {
        materialId: selectedStock.materialId,
        warehouseId: selectedStock.warehouseId,
        quantity: materialForm.quantity,
      });
      setMaterialForm({ inventoryId: '', quantity: 1 });
      await load();
      toast.success('Đã xuất vật tư cho phiếu.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể xuất vật tư.');
    } finally {
      setSaving(false);
    }
  };

  const removeMaterial = async (item: WorkOrderMaterialRecord) => {
    if (!workOrder) return;
    setSaving(true);
    try {
      await workOrderApi.removeMaterial(
        workOrder.id,
        item.warehouseId,
        item.materialId,
      );
      await load();
      toast.success('Đã hoàn trả vật tư về kho.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể hoàn trả vật tư.');
    } finally {
      setSaving(false);
    }
  };

  const uploadAttachment = async (file?: File) => {
    if (!file || !workOrder) return;
    setUploading(true);
    try {
      const uploaded = await storageApi.uploadFile(file, 'work-orders');
      await workOrderApi.update(workOrder.id, {
        attachments: [...(workOrder.attachments ?? []), uploaded.url],
      });
      await load();
      toast.success('Đã tải lên tài liệu.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể tải tài liệu.');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const removeAttachment = async (url: string) => {
    if (!workOrder) return;
    setSaving(true);
    try {
      await workOrderApi.update(workOrder.id, {
        attachments: (workOrder.attachments ?? []).filter((item) => item !== url),
      });
      await load();
      toast.success('Đã gỡ tài liệu khỏi phiếu.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể gỡ tài liệu.');
    } finally {
      setSaving(false);
    }
  };

  if (loading && !workOrder) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <Loader2 className="animate-spin text-emerald-700" />
      </div>
    );
  }

  if (!workOrder) {
    return (
      <div className="grid min-h-[60vh] place-items-center text-center">
        <div>
          <XCircle className="mx-auto text-red-500" />
          <strong className="mt-3 block">Không tìm thấy phiếu công việc</strong>
          <Button asChild variant="outline" className="mt-4">
            <Link href={`/t/${params.tenantSlug}/work-orders`}>Quay lại danh sách</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Protected permission={PERMISSIONS.WORK_ORDER_VIEW}>
      <div className="grid gap-5">
        <Link
          href={`/t/${params.tenantSlug}/work-orders`}
          className="inline-flex w-fit items-center gap-2 text-sm font-bold text-[#66736B] hover:text-emerald-700"
        >
          <ArrowLeft size={16} />
          Phiếu công việc
        </Link>

        <header className="overflow-hidden rounded-3xl border border-[#DCE6DB] bg-white shadow-sm">
          <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_auto]">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-emerald-100 text-emerald-800">{workOrder.code}</Badge>
                <Badge variant="outline">
                  {workOrder.type === 'MAINTENANCE' ? 'Bảo trì' : 'Sự cố'}
                </Badge>
                <Badge
                  variant="outline"
                  className={
                    workOrder.status === 'COMPLETED' || workOrder.status === 'CLOSED'
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                      : workOrder.status === 'IN_PROGRESS'
                        ? 'border-amber-200 bg-amber-50 text-amber-700'
                        : 'border-blue-200 bg-blue-50 text-blue-700'
                  }
                >
                  {statusLabels[workOrder.status]}
                </Badge>
                {overdue ? (
                  <Badge className="bg-red-100 text-red-700">
                    <AlertTriangle />
                    Quá hạn
                  </Badge>
                ) : null}
              </div>
              <h1 className="mt-3 text-2xl font-black tracking-tight text-[#26352B]">
                {workOrder.title}
              </h1>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-[#66736B]">
                <span className="flex items-center gap-1.5">
                  <Wrench size={15} />
                  {workOrder.equipment
                    ? `${workOrder.equipment.code} · ${workOrder.equipment.name}`
                    : 'Không gắn thiết bị'}
                </span>
                <span className="flex items-center gap-1.5">
                  <UserRound size={15} />
                  {workOrder.assignee?.displayName ?? 'Chưa phân công'}
                </span>
                <span className="flex items-center gap-1.5">
                  <CalendarClock size={15} />
                  {workOrder.dueAt
                    ? `Hạn ${formatDateTime(workOrder.dueAt)}`
                    : 'Chưa có hạn'}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap items-start gap-2">
              {workOrder.workflow?.availableActions.map((item) => (
                <Button
                  key={`${item.taskId ?? 'automatic'}-${item.key}`}
                  variant={item.key.includes('approve') ? 'default' : 'outline'}
                  onClick={() => openAction(item)}
                >
                  {item.key.includes('approve') ? <CheckCircle2 /> : <Send />}
                  {item.label}
                </Button>
              ))}
            </div>
          </div>
          <div className="grid gap-2 border-t border-[#E7ECE6] bg-[#F8FAF7] px-5 py-3 sm:grid-cols-2 sm:px-6">
            <div>
              <span className="flex items-center justify-between text-[11px] font-bold text-[#68746C]">
                <span>Tiến độ công việc</span>
                <span>{workOrder.progressPercent}%</span>
              </span>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[#E2E8E1]">
                <div
                  className="h-full rounded-full bg-emerald-600 transition-[width]"
                  style={{ width: `${workOrder.progressPercent}%` }}
                />
              </div>
            </div>
            <div>
              <span className="flex items-center justify-between text-[11px] font-bold text-[#68746C]">
                <span>Checklist</span>
                <span>{checklistProgress}%</span>
              </span>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[#E2E8E1]">
                <div
                  className="h-full rounded-full bg-blue-500 transition-[width]"
                  style={{ width: `${checklistProgress}%` }}
                />
              </div>
            </div>
          </div>
          <nav className="flex overflow-x-auto border-t border-[#E7ECE6] px-3 sm:px-5">
            {workOrderTabs.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  className={`relative flex min-h-12 shrink-0 items-center gap-2 px-3 text-sm font-bold transition ${
                    tab === item.id
                      ? 'text-emerald-700'
                      : 'text-[#768179] hover:text-[#455249]'
                  }`}
                >
                  <Icon size={16} />
                  {item.label}
                  {tab === item.id ? (
                    <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-emerald-600" />
                  ) : null}
                </button>
              );
            })}
          </nav>
        </header>

        {tab === 'execution' ? (
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
            <section className="grid gap-5">
              <div className="overflow-hidden rounded-2xl border border-[#DFE7DE] bg-white shadow-sm">
                <header className="flex items-center justify-between border-b border-[#E7ECE6] px-5 py-4">
                  <div>
                    <h2 className="flex items-center gap-2 font-black text-[#2D3A31]">
                      <ClipboardCheck size={18} className="text-emerald-700" />
                      Checklist thực hiện
                    </h2>
                    <p className="mt-1 text-xs text-[#7A857D]">
                      Được ghim từ phiên bản mẫu tại thời điểm tạo phiếu
                    </p>
                  </div>
                  <Badge variant="outline">
                    {(workOrder.checklist ?? []).filter((item) => item.status !== 'pending').length}/
                    {workOrder.checklist?.length ?? 0}
                  </Badge>
                </header>
                <div className="divide-y divide-[#EBF0EA]">
                  {workOrder.checklist?.length ? (
                    workOrder.checklist.map((item, index) => (
                      <ChecklistItem
                        key={item.id}
                        item={item}
                        index={index}
                        disabled={!canUpdate || saving}
                        onUpdate={updateChecklist}
                      />
                    ))
                  ) : (
                    <div className="p-10 text-center text-sm text-[#7A857D]">
                      Phiếu này không có checklist mẫu.
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-[#DFE7DE] bg-white p-5 shadow-sm">
                <h2 className="flex items-center gap-2 font-black text-[#2D3A31]">
                  <FileText size={18} className="text-emerald-700" />
                  Thông tin kỹ thuật
                </h2>
                <div className="mt-4 grid gap-4">
                  <label className="grid gap-1.5 text-sm font-bold">
                    Mô tả / phạm vi công việc
                    <Textarea
                      rows={4}
                      value={infoForm.description}
                      disabled={!canUpdate}
                      onChange={(event) =>
                        setInfoForm((current) => ({
                          ...current,
                          description: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
                    <label className="grid gap-1.5 text-sm font-bold">
                      Nguyên nhân gốc
                      <Input
                        value={infoForm.rootCause}
                        disabled={!canUpdate}
                        onChange={(event) =>
                          setInfoForm((current) => ({
                            ...current,
                            rootCause: event.target.value,
                          }))
                        }
                      />
                    </label>
                    <label className="grid gap-1.5 text-sm font-bold">
                      Dừng máy (phút)
                      <Input
                        type="number"
                        min={0}
                        value={infoForm.downtimeMinutes}
                        disabled={!canUpdate}
                        onChange={(event) =>
                          setInfoForm((current) => ({
                            ...current,
                            downtimeMinutes: Number(event.target.value),
                          }))
                        }
                      />
                    </label>
                  </div>
                  {canUpdate ? (
                    <Button
                      className="justify-self-end"
                      variant="outline"
                      onClick={() => void saveInfo()}
                      disabled={saving}
                    >
                      <Save />
                      Lưu thông tin
                    </Button>
                  ) : null}
                </div>
              </div>
            </section>

            <aside className="grid content-start gap-5">
              {canUpdate ? (
                <div className="rounded-2xl border border-[#DFE7DE] bg-white p-5 shadow-sm">
                  <h2 className="flex items-center gap-2 font-black text-[#2D3A31]">
                    <MessageSquareText size={18} className="text-emerald-700" />
                    Ghi nhận cập nhật
                  </h2>
                  <div className="mt-4 grid gap-3">
                    <div className="grid grid-cols-[1fr_105px] gap-2">
                      <select
                        aria-label="Loại cập nhật tiến độ"
                        className="h-9 rounded-md border border-input bg-white px-3 text-sm"
                        value={updateForm.type}
                        onChange={(event) =>
                          setUpdateForm((current) => ({
                            ...current,
                            type: event.target.value as WorkOrderUpdate['type'],
                          }))
                        }
                      >
                        {Object.entries(updateLabels).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                      {updateForm.type === 'PROGRESS' ? (
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={updateForm.progressPercent}
                          onChange={(event) =>
                            setUpdateForm((current) => ({
                              ...current,
                              progressPercent: Number(event.target.value),
                            }))
                          }
                        />
                      ) : (
                        <span />
                      )}
                    </div>
                    <Textarea
                      rows={4}
                      value={updateForm.note}
                      placeholder="Tiến độ, kết quả, vướng mắc hoặc yêu cầu hỗ trợ…"
                      onChange={(event) =>
                        setUpdateForm((current) => ({
                          ...current,
                          note: event.target.value,
                        }))
                      }
                    />
                    <Button onClick={() => void submitUpdate()} disabled={saving}>
                      <Send />
                      Gửi cập nhật
                    </Button>
                  </div>
                </div>
              ) : null}

              <div className="overflow-hidden rounded-2xl border border-[#DFE7DE] bg-white shadow-sm">
                <header className="border-b border-[#E7ECE6] px-5 py-4">
                  <h2 className="font-black text-[#2D3A31]">Nhật ký tiến độ</h2>
                </header>
                <div className="max-h-[520px] divide-y divide-[#EDF1EC] overflow-y-auto">
                  {workOrder.updates?.length ? (
                    workOrder.updates.map((update) => (
                      <div key={update.id} className="p-4">
                        <div className="flex items-center justify-between gap-2">
                          <Badge variant="outline">{updateLabels[update.type]}</Badge>
                          <span className="text-[11px] text-[#7F8A82]">
                            {formatDateTime(update.createdAt)}
                          </span>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-[#49564E]">{update.note}</p>
                        <span className="mt-2 block text-xs font-bold text-[#768179]">
                          {update.actor?.displayName ?? 'Người dùng'}{' '}
                          {update.progressPercent !== null
                            ? `· ${update.progressPercent}%`
                            : ''}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-sm text-[#7A857D]">
                      Chưa có cập nhật.
                    </div>
                  )}
                </div>
              </div>
            </aside>
          </div>
        ) : null}

        {tab === 'materials' ? (
          <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="overflow-hidden rounded-2xl border border-[#DFE7DE] bg-white shadow-sm">
              <header className="border-b border-[#E7ECE6] px-5 py-4">
                <h2 className="font-black text-[#2D3A31]">Vật tư đã sử dụng</h2>
              </header>
              <div className="divide-y divide-[#EDF1EC]">
                {materials.length ? (
                  materials.map((item) => (
                    <div key={item.id} className="flex items-center gap-4 p-4">
                      <span className="grid size-10 place-items-center rounded-xl bg-amber-50 text-amber-700">
                        <Package size={18} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <strong className="block text-sm text-[#354139]">
                          {item.material?.name ?? item.materialId}
                        </strong>
                        <span className="text-xs text-[#7B857E]">
                          {item.material?.code} · {item.warehouse?.name ?? 'Kho'}
                        </span>
                      </span>
                      <strong className="text-sm text-[#334039]">
                        {item.quantity} {item.material?.unit}
                      </strong>
                      {canUpdate ? (
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          className="text-red-600"
                          aria-label="Hoàn trả vật tư"
                          onClick={() => void removeMaterial(item)}
                        >
                          <Trash2 />
                        </Button>
                      ) : null}
                    </div>
                  ))
                ) : (
                  <div className="p-12 text-center text-sm text-[#7A857D]">
                    Chưa ghi nhận vật tư.
                  </div>
                )}
              </div>
            </div>
            {canUpdate ? (
              <aside className="rounded-2xl border border-[#DFE7DE] bg-white p-5 shadow-sm">
                <h2 className="font-black text-[#2D3A31]">Xuất vật tư</h2>
                <div className="mt-4 grid gap-3">
                  <label className="grid gap-1.5 text-sm font-bold">
                    Tồn kho khả dụng
                    <select
                      aria-label="Chọn vật tư tồn kho"
                      className="h-9 rounded-md border border-input bg-white px-3 text-sm"
                      value={materialForm.inventoryId}
                      onChange={(event) =>
                        setMaterialForm((current) => ({
                          ...current,
                          inventoryId: event.target.value,
                        }))
                      }
                    >
                      <option value="">Chọn vật tư</option>
                      {stock.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.material?.code} · {item.material?.name} ({item.quantity}{' '}
                          {item.material?.unit})
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-1.5 text-sm font-bold">
                    Số lượng
                    <Input
                      type="number"
                      min={1}
                      value={materialForm.quantity}
                      onChange={(event) =>
                        setMaterialForm((current) => ({
                          ...current,
                          quantity: Number(event.target.value),
                        }))
                      }
                    />
                  </label>
                  <Button onClick={() => void addMaterial()} disabled={saving}>
                    <Plus />
                    Xuất cho phiếu
                  </Button>
                </div>
              </aside>
            ) : null}
          </section>
        ) : null}

        {tab === 'documents' ? (
          <section className="rounded-2xl border border-[#DFE7DE] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-black text-[#2D3A31]">Tài liệu & hình ảnh</h2>
                <p className="mt-1 text-xs text-[#7A857D]">
                  Biên bản, ảnh hiện trường và tài liệu kỹ thuật của phiếu
                </p>
              </div>
              {canUpdate ? (
                <>
                  <input
                    ref={fileRef}
                    type="file"
                    className="hidden"
                    onChange={(event) => void uploadAttachment(event.target.files?.[0])}
                  />
                  <Button
                    variant="outline"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? <Loader2 className="animate-spin" /> : <Upload />}
                    Tải lên
                  </Button>
                </>
              ) : null}
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {workOrder.attachments?.length ? (
                workOrder.attachments.map((url) => (
                  <div
                    key={url}
                    className="group relative overflow-hidden rounded-2xl border border-[#DFE7DE] bg-[#F8FAF7]"
                  >
                    <a href={url} target="_blank" rel="noreferrer">
                      {isImage(url) ? (
                        <Image
                          src={url}
                          alt="Minh chứng công việc"
                          width={480}
                          height={320}
                          unoptimized
                          className="h-40 w-full object-cover"
                        />
                      ) : (
                        <span className="grid h-40 place-items-center text-[#718078]">
                          <FileText size={32} />
                        </span>
                      )}
                    </a>
                    <div className="flex items-center gap-2 border-t border-[#E2E8E1] bg-white p-3">
                      {isImage(url) ? <ImageIcon size={15} /> : <Paperclip size={15} />}
                      <span className="min-w-0 flex-1 truncate text-xs font-bold">
                        {decodeURIComponent(url.split('/').pop() ?? 'Tài liệu')}
                      </span>
                      {canUpdate ? (
                        <Button
                          size="icon-xs"
                          variant="ghost"
                          className="text-red-600"
                          aria-label="Gỡ tài liệu"
                          onClick={() => void removeAttachment(url)}
                        >
                          <Trash2 />
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full grid place-items-center py-14 text-center">
                  <Paperclip className="text-[#9BA69D]" />
                  <strong className="mt-3 text-sm text-[#435047]">Chưa có tài liệu</strong>
                </div>
              )}
            </div>
          </section>
        ) : null}

        {tab === 'history' ? (
          <section className="grid gap-5 lg:grid-cols-2">
            <TimelineCard
              title="Lịch sử quy trình"
              icon={Route}
              items={(workOrder.workflow?.actions ?? []).map((item) => ({
                id: item.id,
                title: item.actionKey,
                description: `${item.fromNode?.name ?? 'Bắt đầu'} → ${
                  item.toNode?.name ?? 'Hoàn tất'
                }${item.note ? ` · ${item.note}` : ''}`,
                actor: item.actor?.displayName ?? 'Hệ thống',
                time: item.createdAt,
              }))}
            />
            <TimelineCard
              title="Nhật ký phiếu"
              icon={Clock3}
              items={logs.map((item) => ({
                id: item.id,
                title: item.action,
                description: item.note ?? '',
                actor: item.user?.displayName ?? 'Hệ thống',
                time: item.createdAt,
              }))}
            />
          </section>
        ) : null}
      </div>

      <Dialog open={Boolean(action)} onOpenChange={(open) => !open && setAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{action?.label ?? 'Thực hiện hành động'}</DialogTitle>
            <DialogDescription>
              Hành động này sẽ chuyển phiếu sang bước tiếp theo của quy trình.
            </DialogDescription>
          </DialogHeader>
          {actionFields.length ? (
            <div className="grid gap-3 rounded-2xl border border-[#DFE7DE] bg-[#F8FAF7] p-4">
              {actionFields.map((field) => (
                <label
                  key={field.key}
                  className="grid gap-1.5 text-sm font-bold"
                >
                  <span>
                    {field.label}
                    {field.required ? (
                      <span className="ml-1 text-red-600">*</span>
                    ) : null}
                  </span>
                  {field.type === 'textarea' ? (
                    <Textarea
                      rows={3}
                      value={String(actionPayload[field.key] ?? '')}
                      onChange={(event) =>
                        setActionPayload((current) => ({
                          ...current,
                          [field.key]: event.target.value,
                        }))
                      }
                    />
                  ) : field.type === 'select' ? (
                    <select
                      className="h-10 rounded-md border border-input bg-white px-3 text-sm"
                      value={String(actionPayload[field.key] ?? '')}
                      onChange={(event) =>
                        setActionPayload((current) => ({
                          ...current,
                          [field.key]: event.target.value,
                        }))
                      }
                    >
                      <option value="">Chọn giá trị</option>
                      {(field.options ?? []).map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  ) : field.type === 'boolean' ? (
                    <span className="flex items-center gap-2 rounded-xl border border-[#DCE5DA] bg-white px-3 py-2 font-normal">
                      <input
                        type="checkbox"
                        checked={Boolean(actionPayload[field.key])}
                        onChange={(event) =>
                          setActionPayload((current) => ({
                            ...current,
                            [field.key]: event.target.checked,
                          }))
                        }
                      />
                      Xác nhận
                    </span>
                  ) : (
                    <Input
                      type={
                        field.type === 'number'
                          ? 'number'
                          : field.type === 'date'
                            ? 'date'
                            : 'text'
                      }
                      value={String(actionPayload[field.key] ?? '')}
                      onChange={(event) =>
                        setActionPayload((current) => ({
                          ...current,
                          [field.key]:
                            field.type === 'number'
                              ? event.target.value === ''
                                ? ''
                                : Number(event.target.value)
                              : event.target.value,
                        }))
                      }
                    />
                  )}
                </label>
              ))}
            </div>
          ) : null}
          <label className="grid gap-1.5 text-sm font-bold">
            Ghi chú
            <Textarea
              rows={4}
              value={actionNote}
              placeholder="Kết quả xử lý hoặc lý do chuyển bước…"
              onChange={(event) => setActionNote(event.target.value)}
            />
          </label>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setAction(null);
                setActionPayload({});
              }}
            >
              Hủy
            </Button>
            <Button onClick={() => void performAction()} disabled={saving}>
              <Send />
              Xác nhận
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Protected>
  );
}

function ChecklistItem({
  item,
  index,
  disabled,
  onUpdate,
}: {
  item: WorkOrderChecklistResult;
  index: number;
  disabled: boolean;
  onUpdate: (
    item: WorkOrderChecklistResult,
    status: WorkOrderChecklistResult['status'],
    value?: Record<string, unknown>,
  ) => Promise<void>;
}) {
  const [measurement, setMeasurement] = useState(
    String(item.value.measurement ?? ''),
  );
  const passed = item.status === 'passed';
  const failed = item.status === 'failed';
  return (
    <div className="grid gap-3 p-4 sm:grid-cols-[34px_minmax(0,1fr)_auto] sm:items-start">
      <span
        className={`grid size-8 place-items-center rounded-full text-xs font-black ${
          passed
            ? 'bg-emerald-100 text-emerald-700'
            : failed
              ? 'bg-red-100 text-red-700'
              : 'bg-[#EEF2ED] text-[#657169]'
        }`}
      >
        {passed ? <Check size={15} /> : failed ? <XCircle size={15} /> : index + 1}
      </span>
      <div className="min-w-0">
        <span className="flex flex-wrap items-center gap-2">
          <strong className="text-sm text-[#354139]">{item.step.title}</strong>
          {item.step.isRequired ? <Badge variant="outline">Bắt buộc</Badge> : null}
          <Badge variant="secondary">{item.step.type}</Badge>
        </span>
        {item.step.description ? (
          <p className="mt-1 text-xs leading-5 text-[#748078]">{item.step.description}</p>
        ) : null}
        {item.step.type === 'MEASUREMENT' ? (
          <div className="mt-3 flex max-w-sm items-center gap-2">
            <Input
              type="number"
              value={measurement}
              disabled={disabled}
              placeholder="Giá trị đo"
              onChange={(event) => setMeasurement(event.target.value)}
            />
            <span className="text-xs font-bold text-[#6E7A72]">
              {String(item.step.config.unit ?? '')}
            </span>
          </div>
        ) : null}
        {item.completedAt ? (
          <span className="mt-2 block text-[11px] text-[#849087]">
            {item.completer?.displayName ?? 'Người dùng'} ·{' '}
            {formatDateTime(item.completedAt)}
          </span>
        ) : null}
      </div>
      <div className="flex gap-1">
        <Button
          type="button"
          size="sm"
          variant={passed ? 'default' : 'outline'}
          disabled={disabled}
          onClick={() =>
            void onUpdate(item, 'passed', {
              ...item.value,
              ...(item.step.type === 'MEASUREMENT'
                ? { measurement: Number(measurement) }
                : {}),
            })
          }
        >
          <CheckCircle2 />
          Đạt
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className={failed ? 'border-red-300 bg-red-50 text-red-700' : ''}
          disabled={disabled}
          onClick={() => void onUpdate(item, 'failed')}
        >
          <AlertTriangle />
          Không đạt
        </Button>
      </div>
    </div>
  );
}

function TimelineCard({
  title,
  icon: Icon,
  items,
}: {
  title: string;
  icon: typeof Route;
  items: Array<{
    id: string;
    title: string;
    description: string;
    actor: string;
    time: string;
  }>;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#DFE7DE] bg-white shadow-sm">
      <header className="flex items-center gap-2 border-b border-[#E7ECE6] px-5 py-4">
        <Icon size={18} className="text-emerald-700" />
        <h2 className="font-black text-[#2D3A31]">{title}</h2>
      </header>
      <div className="divide-y divide-[#EDF1EC]">
        {items.length ? (
          items.map((item) => (
            <div key={item.id} className="flex gap-3 p-4">
              <span className="mt-1 size-2 shrink-0 rounded-full bg-emerald-500 ring-4 ring-emerald-50" />
              <span className="min-w-0">
                <strong className="block text-sm text-[#354139]">{item.title}</strong>
                {item.description ? (
                  <span className="mt-1 block text-xs leading-5 text-[#748078]">
                    {item.description}
                  </span>
                ) : null}
                <span className="mt-1.5 block text-[11px] text-[#849087]">
                  {item.actor} · {formatDateTime(item.time)}
                </span>
              </span>
            </div>
          ))
        ) : (
          <div className="p-10 text-center text-sm text-[#7A857D]">Chưa có lịch sử.</div>
        )}
      </div>
    </div>
  );
}
