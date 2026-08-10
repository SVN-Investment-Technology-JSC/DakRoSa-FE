import React, { useEffect, useMemo, useState } from 'react';
import { TopAppBar } from './TopAppBar';
import {
  useCreateMaintenancePart,
  useMaintenanceParts,
  useSetMaintenanceSchedules,
} from '../hooks/useMaintenance';
import { useOrgUnitTree } from '../hooks/useOrgUnits';
import { useWorkflows } from '../hooks/useWorkflows';
import type { ApiOrgUnit, ApiOrgUnitTreeNode } from '../api/orgUnits';
import type { MaintenanceFrequency } from '../api/maintenance';

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

export const MaintenanceConfigView: React.FC<MaintenanceConfigViewProps> = ({ onMenuToggle }) => {
  const { data: parts = [], isLoading } = useMaintenanceParts();
  const { data: tree = [] } = useOrgUnitTree();
  const { data: workflows = [] } = useWorkflows();
  const setSchedules = useSetMaintenanceSchedules();
  const createPart = useCreateMaintenancePart();

  const [draft, setDraft] = useState<Record<string, DraftRow>>({});
  const [toast, setToast] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [newPart, setNewPart] = useState({ code: '', name: '', orgUnitId: '' });

  const orgUnits = useMemo(() => flattenTree(tree), [tree]);
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
                {parts.map((part) => {
                  const row = draft[part.id];
                  return (
                    <tr key={part.id} className="bg-white hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 h-14 border-r border-slate-200">
                        <div className="text-xs font-bold text-slate-800 truncate">{part.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{part.code}</div>
                      </td>
                      <td className="px-4 border-r border-slate-200 text-xs text-slate-600 font-medium">
                        {part.orgUnit?.title ?? '—'}
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
                      <td className="px-4">
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
