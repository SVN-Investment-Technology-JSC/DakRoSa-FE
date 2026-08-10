import React, { useEffect, useMemo, useState } from 'react';
import { TopAppBar } from './TopAppBar';
import {
  useCreateMaintenancePart,
  useMaintenanceParts,
  useSetMaintenanceSchedules,
} from '../hooks/useMaintenance';
import { useOrgUnitTree } from '../hooks/useOrgUnits';
import { useWorkflows } from '../hooks/useWorkflows';
import { useSetEquipmentTaskTemplate } from '../hooks/useMaintenance';
import type { ApiOrgUnit, ApiOrgUnitTreeNode } from '../api/orgUnits';
import {
  ASSET_KIND_ICON,
  ASSET_KIND_LABEL,
  type ApiMaintenancePart,
  type EquipmentTaskItem,
  type MaintenanceFrequency,
} from '../api/maintenance';

interface MaintenanceConfigViewProps {
  onMenuToggle?: () => void;
}

const FREQUENCIES: Array<{ id: MaintenanceFrequency; label: string }> = [
  { id: 'day', label: 'Ngày' },
  { id: 'week', label: 'Tuần' },
  { id: 'month', label: 'Tháng' },
  { id: 'quarter', label: 'Quý' },
  { id: 'year', label: 'Năm' },
];

/** One editable row of the matrix: which frequencies are ticked for this part. */
type DraftRow = { frequencies: Set<MaintenanceFrequency>; workflowId: string };

const errorMessage = (error: unknown, fallback: string) =>
  (error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback;

/**
 * Sắp thiết bị theo đúng thứ tự cây tài sản, kèm độ sâu để thụt lề.
 *
 * `GET /maintenance-parts` trả về danh sách phẳng sắp theo mã, nên nếu in
 * nguyên xi thì một chi tiết sẽ nằm cách xa phân hệ chứa nó và bảng đọc như
 * một danh sách rời rạc thay vì một cây.
 */
function orderByHierarchy(parts: ApiMaintenancePart[]): Array<{ part: ApiMaintenancePart; depth: number }> {
  const childrenOf = new Map<string | null, ApiMaintenancePart[]>();
  for (const part of parts) {
    const key = part.parentId ?? null;
    childrenOf.set(key, [...(childrenOf.get(key) ?? []), part]);
  }
  // Node có cha nhưng cha bị lọc mất (không nên xảy ra) vẫn phải hiện ra, nếu
  // không thiết bị sẽ biến mất khỏi ma trận mà không ai biết vì sao.
  const known = new Set(parts.map((p) => p.id));
  const orphans = parts.filter((p) => p.parentId && !known.has(p.parentId));

  const out: Array<{ part: ApiMaintenancePart; depth: number }> = [];
  const walk = (nodes: ApiMaintenancePart[], depth: number) => {
    for (const node of nodes) {
      out.push({ part: node, depth });
      walk(childrenOf.get(node.id) ?? [], depth + 1);
    }
  };
  walk([...(childrenOf.get(null) ?? []), ...orphans], 0);
  return out;
}

function flattenTree(units: ApiOrgUnitTreeNode[]): ApiOrgUnit[] {
  const flat: ApiOrgUnit[] = [];
  const walk = (nodes: ApiOrgUnitTreeNode[]) => {
    for (const node of nodes) {
      flat.push(node);
      if (node.children?.length) walk(node.children);
    }
  };
  walk(units);
  return flat;
}

// ------------------------------- BRD 3 US 2.1 AC2 — "Thêm thông tin công việc"

interface TaskTemplateModalProps {
  part: ApiMaintenancePart;
  onClose: () => void;
}

interface TaskDraftRow {
  title: string;
  /** Giữ dạng chuỗi để ô nhập trống được, thay vì tự nhảy về 0. */
  durationMinutes: string;
  note: string;
}

/**
 * Khai "Danh sách nhiệm vụ" + "Thời gian thực hiện từng nhiệm vụ" của một thiết
 * bị. Toàn bộ nội dung này được backend lưu dạng JSON gắn với ID thiết bị, và
 * đính kèm vào payload mỗi khi thiết bị sinh ra Lệnh công việc.
 */
const TaskTemplateModal: React.FC<TaskTemplateModalProps> = ({ part, onClose }) => {
  const setTemplate = useSetEquipmentTaskTemplate();
  const [rows, setRows] = useState<TaskDraftRow[]>(() =>
    (part.taskTemplate ?? []).length > 0
      ? (part.taskTemplate ?? []).map((t) => ({
          title: t.title,
          durationMinutes: String(t.durationMinutes),
          note: t.note ?? '',
        }))
      : [{ title: '', durationMinutes: '', note: '' }],
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const update = (index: number, patch: Partial<TaskDraftRow>) =>
    setRows(rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));

  const filled = rows.filter((r) => r.title.trim());
  const totalMinutes = filled.reduce((sum, r) => sum + (Number(r.durationMinutes) || 0), 0);

  const save = async () => {
    const invalid = filled.find((r) => !(Number(r.durationMinutes) > 0));
    if (invalid) {
      setError(`Nhiệm vụ "${invalid.title}" chưa có thời gian thực hiện hợp lệ (phút, > 0).`);
      return;
    }
    setError(null);
    try {
      const tasks: EquipmentTaskItem[] = filled.map((r) => ({
        title: r.title.trim(),
        durationMinutes: Number(r.durationMinutes),
        ...(r.note.trim() ? { note: r.note.trim() } : {}),
      }));
      await setTemplate.mutateAsync({ partId: part.id, tasks });
      onClose();
    } catch (err) {
      setError(errorMessage(err, 'Lưu danh sách nhiệm vụ thất bại.'));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-slate-900">Thông tin công việc theo thiết bị</h3>
            <p className="mt-0.5 truncate text-[11px] font-medium text-slate-500">
              {part.name} · <span className="font-mono">{part.code}</span>
            </p>
          </div>
          <button onClick={onClose} className="shrink-0 text-slate-400 hover:text-slate-700">
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        <div className="custom-scrollbar flex-1 space-y-2 overflow-y-auto px-5 py-4">
          <p className="rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-[11px] leading-snug text-violet-800">
            Danh sách này được lưu dạng <b>JSON</b> gắn với thiết bị. Mỗi khi thiết bị sinh Lệnh
            công việc, chuỗi JSON được đính kèm vào Lệnh — và bước giữ vai trò <b>E</b> chọn{' '}
            <b>“Mặc định theo thiết bị”</b> sẽ lấy đúng các đầu việc này để giao cho nhân viên.
          </p>

          <div className="hidden gap-2 px-1 text-[10px] font-bold uppercase tracking-wide text-slate-400 sm:flex">
            <span className="flex-1">Nhiệm vụ</span>
            <span className="w-24 shrink-0">Thời gian</span>
            <span className="w-48 shrink-0">Ghi chú</span>
            <span className="w-8 shrink-0" />
          </div>

          {rows.map((row, index) => (
            <div key={index} className="flex flex-wrap items-start gap-2 sm:flex-nowrap">
              <input
                value={row.title}
                onChange={(e) => update(index, { title: e.target.value })}
                placeholder={`Nhiệm vụ ${index + 1}`}
                className="min-w-40 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-medium focus:border-violet-600 focus:outline-none"
              />
              <div className="relative w-24 shrink-0">
                <input
                  type="number"
                  min={1}
                  value={row.durationMinutes}
                  onChange={(e) => update(index, { durationMinutes: e.target.value })}
                  placeholder="phút"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-3 pr-8 text-[11px] font-medium focus:border-violet-600 focus:outline-none"
                />
                <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-slate-400">
                  ph
                </span>
              </div>
              <input
                value={row.note}
                onChange={(e) => update(index, { note: e.target.value })}
                placeholder="Ghi chú (không bắt buộc)"
                className="w-full shrink-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-medium focus:border-violet-600 focus:outline-none sm:w-48"
              />
              <button
                onClick={() => setRows(rows.filter((_, i) => i !== index))}
                title="Xoá nhiệm vụ"
                className="shrink-0 p-2 text-slate-400 hover:text-rose-600"
              >
                <span className="material-symbols-outlined text-base">delete</span>
              </button>
            </div>
          ))}

          <button
            onClick={() => setRows([...rows, { title: '', durationMinutes: '', note: '' }])}
            className="flex items-center gap-1 text-[11px] font-bold text-violet-600 hover:text-violet-700"
          >
            <span className="material-symbols-outlined text-sm">add</span> Thêm nhiệm vụ
          </button>

          {error && (
            <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-semibold text-rose-700">
              {error}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-5 py-3">
          <span className="text-[11px] font-semibold text-slate-500">
            {filled.length} nhiệm vụ · tổng thời gian {Math.floor(totalMinutes / 60)}g
            {totalMinutes % 60}p
          </span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
            >
              Huỷ
            </button>
            <button
              onClick={save}
              disabled={setTemplate.isPending}
              className="rounded-xl bg-violet-600 px-5 py-2 text-xs font-bold text-white hover:bg-violet-700 disabled:opacity-50"
            >
              {setTemplate.isPending ? 'Đang lưu…' : 'Lưu danh sách'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const MaintenanceConfigView: React.FC<MaintenanceConfigViewProps> = ({ onMenuToggle }) => {
  const { data: parts = [], isLoading } = useMaintenanceParts();
  const { data: tree = [] } = useOrgUnitTree();
  const { data: workflows = [] } = useWorkflows();
  const setSchedules = useSetMaintenanceSchedules();
  const createPart = useCreateMaintenancePart();

  const [draft, setDraft] = useState<Record<string, DraftRow>>({});
  const [toast, setToast] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [newPart, setNewPart] = useState({ code: '', name: '', orgUnitId: '' });
  const [templateForPartId, setTemplateForPartId] = useState<string | null>(null);

  const orgUnits = useMemo(() => flattenTree(tree), [tree]);
  const orderedParts = useMemo(() => orderByHierarchy(parts), [parts]);
  // Tra lại theo id chứ không giữ tham chiếu: sau khi lưu JSON, danh sách được
  // nạp lại và modal phải thấy dữ liệu mới nếu người dùng mở lại ngay.
  const templatePart = templateForPartId
    ? (parts.find((p) => p.id === templateForPartId) ?? null)
    : null;
  // Only Execution Flows make sense as a Work Order target.
  const executionWorkflows = useMemo(
    () => workflows.filter((w) => w.kind !== 'process'),
    [workflows],
  );

  // Server state is the source of truth; the draft is only what the user has
  // changed since the last save.
  useEffect(() => {
    setDraft(
      Object.fromEntries(
        parts.map((part) => [
          part.id,
          {
            frequencies: new Set(part.schedules.map((s) => s.frequency)),
            workflowId: part.schedules[0]?.workflowId ?? '',
          },
        ]),
      ),
    );
  }, [parts]);

  const showToast = (kind: 'ok' | 'err', text: string) => {
    setToast({ kind, text });
    setTimeout(() => setToast(null), kind === 'err' ? 5000 : 3000);
  };

  const toggleFrequency = (partId: string, freq: MaintenanceFrequency) => {
    setDraft((prev) => {
      const row = prev[partId] ?? { frequencies: new Set<MaintenanceFrequency>(), workflowId: '' };
      const frequencies = new Set(row.frequencies);
      if (frequencies.has(freq)) frequencies.delete(freq);
      else frequencies.add(freq);
      return { ...prev, [partId]: { ...row, frequencies } };
    });
  };

  const setWorkflow = (partId: string, workflowId: string) => {
    setDraft((prev) => ({
      ...prev,
      [partId]: { ...(prev[partId] ?? { frequencies: new Set() }), workflowId },
    }));
  };

  const handleSave = async () => {
    try {
      for (const part of parts) {
        const row = draft[part.id];
        if (!row) continue;
        const existingByFreq = new Map(part.schedules.map((s) => [s.frequency, s]));
        await setSchedules.mutateAsync({
          partId: part.id,
          schedules: [...row.frequencies].map((frequency) => ({
            frequency,
            // Preserve the original anchor so an existing monthly job keeps
            // falling on its own day instead of resetting to today.
            anchorDate: existingByFreq.get(frequency)?.anchorDate,
            workflowId: row.workflowId || undefined,
          })),
        });
      }
      showToast('ok', 'Đã lưu cấu hình lịch bảo trì.');
    } catch (error) {
      showToast('err', (error as { response?: { data?: { message?: string } } }).response?.data?.message ?? 'Lưu thất bại.');
    }
  };

  const handleAddPart = async () => {
    if (!newPart.code.trim() || !newPart.name.trim() || !newPart.orgUnitId) {
      showToast('err', 'Cần nhập đủ mã, tên và đơn vị phụ trách.');
      return;
    }
    try {
      await createPart.mutateAsync({
        code: newPart.code.trim(),
        name: newPart.name.trim(),
        orgUnitId: newPart.orgUnitId,
      });
      setNewPart({ code: '', name: '', orgUnitId: '' });
      showToast('ok', 'Đã thêm thiết bị.');
    } catch (error) {
      showToast('err', (error as { response?: { data?: { message?: string } } }).response?.data?.message ?? 'Thêm thiết bị thất bại.');
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 min-w-0">
      <TopAppBar title="Cấu hình lịch bảo trì" onMenuToggle={onMenuToggle} />

      <main className="flex-1 mt-16 p-4 md:p-8 overflow-auto custom-scrollbar">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-slate-800 tracking-tight mb-1">
                Ma trận bảo trì thiết bị
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Tick các tần suất cần bảo trì. Một thiết bị có thể có nhiều chu kỳ cùng lúc. Hệ
                thống tự nhắc trước hạn 3 ngày.
              </p>
            </div>
            <button
              onClick={handleSave}
              disabled={setSchedules.isPending}
              className="px-5 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors shadow-xs disabled:opacity-50"
            >
              {setSchedules.isPending ? 'Đang lưu…' : 'Lưu cấu hình'}
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl overflow-x-auto shadow-xs">
            <table className="w-full border-collapse min-w-[820px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-5 py-3.5 text-left text-xs font-bold text-slate-700 border-r border-slate-200 w-64">
                    Thiết bị
                  </th>
                  <th className="px-4 py-3.5 text-left text-xs font-bold text-slate-700 border-r border-slate-200 w-48">
                    Đơn vị phụ trách
                  </th>
                  {FREQUENCIES.map((freq) => (
                    <th
                      key={freq.id}
                      className="px-2 py-3.5 text-xs font-bold text-slate-700 text-center border-r border-slate-200 w-20"
                    >
                      {freq.label}
                    </th>
                  ))}
                  <th className="px-4 py-3.5 text-left text-xs font-bold text-slate-700 w-56">
                    Luồng Thực thi khi tạo Lệnh
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading && (
                  <tr>
                    <td colSpan={8} className="px-5 py-8 text-center text-xs text-slate-500">
                      Đang tải…
                    </td>
                  </tr>
                )}
                {!isLoading && parts.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-5 py-8 text-center text-xs text-slate-500">
                      Chưa có thiết bị nào. Thêm ở khung bên dưới.
                    </td>
                  </tr>
                )}
                {orderedParts.map(({ part, depth }) => {
                  const row = draft[part.id];
                  const taskCount = part.taskTemplate?.length ?? 0;
                  return (
                    <tr key={part.id} className="bg-white hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 h-14 border-r border-slate-200">
                        <div
                          className="flex items-center gap-1.5"
                          style={{ paddingLeft: depth * 14 }}
                        >
                          <span
                            title={ASSET_KIND_LABEL[part.assetKind]}
                            className="material-symbols-outlined shrink-0 text-[14px] leading-none text-slate-400"
                          >
                            {ASSET_KIND_ICON[part.assetKind]}
                          </span>
                          <div className="min-w-0">
                            <div className="truncate text-xs font-bold text-slate-800">
                              {part.name}
                            </div>
                            <div className="font-mono text-[10px] text-slate-400">{part.code}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 border-r border-slate-200 text-xs text-slate-600 font-medium">
                        {part.orgUnit?.title ?? (
                          <span className="text-slate-400 italic">kế thừa cấp trên</span>
                        )}
                      </td>
                      {FREQUENCIES.map((freq) => {
                        const checked = row?.frequencies.has(freq.id) ?? false;
                        const schedule = part.schedules.find((s) => s.frequency === freq.id);
                        return (
                          <td
                            key={freq.id}
                            className={`border-r border-slate-200 text-center ${checked ? 'bg-blue-50/60' : ''}`}
                            title={schedule ? `Kỳ kế tiếp: ${schedule.nextDueAt}` : undefined}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleFrequency(part.id, freq.id)}
                              className="w-4 h-4 accent-blue-600 cursor-pointer"
                            />
                            {schedule && (
                              <div className="text-[9px] text-slate-400 font-medium leading-tight mt-0.5">
                                {schedule.nextDueAt.slice(5)}
                              </div>
                            )}
                          </td>
                        );
                      })}
                      <td className="px-4 py-2">
                        <select
                          value={row?.workflowId ?? ''}
                          onChange={(e) => setWorkflow(part.id, e.target.value)}
                          className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-medium focus:outline-none focus:border-blue-600"
                        >
                          <option value="">— Chưa gắn —</option>
                          {executionWorkflows.map((wf) => (
                            <option key={wf.id} value={wf.id}>
                              {wf.code} — {wf.name}
                            </option>
                          ))}
                        </select>
                        {/* BRD 3 US 2.1 AC2 — action "Thêm thông tin công việc". */}
                        <button
                          onClick={() => setTemplateForPartId(part.id)}
                          title={
                            taskCount > 0
                              ? `Đã khai ${taskCount} nhiệm vụ — bấm để sửa`
                              : 'Khai danh sách nhiệm vụ và thời gian thực hiện (lưu dạng JSON)'
                          }
                          className={`mt-1 flex w-full items-center justify-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-bold transition-colors ${
                            taskCount > 0
                              ? 'border-violet-300 bg-violet-50 text-violet-700 hover:border-violet-500'
                              : 'border-dashed border-slate-300 bg-white text-slate-400 hover:border-violet-400 hover:text-violet-600'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[13px] leading-none">
                            {taskCount > 0 ? 'checklist' : 'add_task'}
                          </span>
                          {taskCount > 0
                            ? `${taskCount} nhiệm vụ (JSON)`
                            : 'Thêm thông tin công việc'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs space-y-3 max-w-2xl">
            <h3 className="text-xs font-bold text-slate-800">Thêm thiết bị mới</h3>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                placeholder="Mã (VD: PART-CNC-05)"
                value={newPart.code}
                onChange={(e) => setNewPart({ ...newPart, code: e.target.value })}
                className="w-full sm:w-48 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-blue-600"
              />
              <input
                type="text"
                placeholder="Tên thiết bị"
                value={newPart.name}
                onChange={(e) => setNewPart({ ...newPart, name: e.target.value })}
                className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-blue-600"
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <select
                value={newPart.orgUnitId}
                onChange={(e) => setNewPart({ ...newPart, orgUnitId: e.target.value })}
                className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-blue-600"
              >
                <option value="">— Chọn đơn vị phụ trách —</option>
                {orgUnits.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {'— '.repeat(Math.max(0, unit.level - 1))}
                    {unit.title}
                  </option>
                ))}
              </select>
              <button
                onClick={handleAddPart}
                disabled={createPart.isPending}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors flex items-center gap-1 shadow-2xs disabled:opacity-50 shrink-0"
              >
                <span className="material-symbols-outlined text-sm">add</span> Thêm thiết bị
              </button>
            </div>
          </div>
        </div>
      </main>

      {templatePart && (
        <TaskTemplateModal part={templatePart} onClose={() => setTemplateForPartId(null)} />
      )}

      {toast && (
        <div
          className={`fixed bottom-6 right-6 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-2.5 z-50 text-xs font-semibold ${
            toast.kind === 'ok' ? 'bg-slate-900 border border-slate-800' : 'bg-red-600'
          }`}
        >
          <span className="material-symbols-outlined text-lg">
            {toast.kind === 'ok' ? 'check_circle' : 'error'}
          </span>
          <span>{toast.text}</span>
        </div>
      )}
    </div>
  );
};
