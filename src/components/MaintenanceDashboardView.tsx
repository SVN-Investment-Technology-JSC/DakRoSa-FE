import React, { useMemo, useState } from 'react';
import { TopAppBar } from './TopAppBar';
import {
  useCreateWorkOrder,
  useMaintenanceTickets,
  useRunMaintenanceSweep,
  useUpdateMaintenanceTicket,
} from '../hooks/useMaintenance';
import type { ApiMaintenanceTicket, TicketPriority } from '../api/maintenance';

interface MaintenanceDashboardViewProps {
  onOpenConfig?: () => void;
  onMenuToggle?: () => void;
}

const PRIORITY_FILTERS: Array<{ id: 'ALL' | TicketPriority; label: string }> = [
  { id: 'ALL', label: 'Tất cả' },
  { id: 'High', label: 'Cao' },
  { id: 'Normal', label: 'Thường' },
  { id: 'Low', label: 'Thấp' },
];

const STATUS_LABEL: Record<string, string> = {
  CRITICAL: 'KHẨN',
  WARNING: 'CẢNH BÁO',
  ROUTINE: 'ĐỊNH KỲ',
};

/** Days from today to `dueDate`, both read as calendar dates. */
function daysUntil(dueDate: string): number {
  const today = new Date();
  const [y, m, d] = dueDate.split('-').map(Number);
  const diff =
    Date.UTC(y, m - 1, d) -
    Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round(diff / 86_400_000);
}

function deadlineText(dueDate: string): string {
  const days = daysUntil(dueDate);
  if (days < 0) return `Quá hạn ${-days} ngày`;
  if (days === 0) return 'Hôm nay';
  if (days === 1) return 'Ngày mai';
  return `Còn ${days} ngày`;
}

const errorMessage = (error: unknown, fallback: string) =>
  (error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback;

export const MaintenanceDashboardView: React.FC<MaintenanceDashboardViewProps> = ({
  onOpenConfig,
  onMenuToggle,
}) => {
  const { data: tickets = [], isLoading } = useMaintenanceTickets();
  const updateTicket = useUpdateMaintenanceTicket();
  const workOrder = useCreateWorkOrder();
  const sweep = useRunMaintenanceSweep();

  const [filterPriority, setFilterPriority] = useState<'ALL' | TicketPriority>('ALL');
  const [editing, setEditing] = useState<ApiMaintenanceTicket | null>(null);
  const [toast, setToast] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const showToast = (kind: 'ok' | 'err', text: string) => {
    setToast({ kind, text });
    setTimeout(() => setToast(null), kind === 'err' ? 5000 : 3000);
  };

  const filtered = useMemo(
    () => tickets.filter((t) => filterPriority === 'ALL' || t.priority === filterPriority),
    [tickets, filterPriority],
  );

  const criticalCount = tickets.filter((t) => t.status === 'CRITICAL').length;
  const openCount = tickets.filter((t) => !t.resultingTaskId).length;

  const handleWorkOrder = async (ticket: ApiMaintenanceTicket) => {
    try {
      const task = await workOrder.mutateAsync(ticket.id);
      showToast('ok', `Đã tạo Lệnh công việc ${task.taskCode}. Bạn là người giữ Node E.`);
    } catch (error) {
      showToast('err', errorMessage(error, 'Tạo Lệnh công việc thất bại.'));
    }
  };

  const handleSweep = async () => {
    try {
      const result = await sweep.mutateAsync(undefined);
      showToast(
        'ok',
        result.ticketsCreated > 0
          ? `Đã quét ${result.schedulesChecked} lịch, tạo ${result.ticketsCreated} phiếu mới.`
          : `Đã quét ${result.schedulesChecked} lịch — không có phiếu mới nào cần tạo.`,
      );
    } catch (error) {
      showToast('err', errorMessage(error, 'Quét thất bại.'));
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 min-w-0">
      <TopAppBar
        title="Bảng Bảo trì & Cảnh báo"
        onMenuToggle={onMenuToggle}
        actionButtons={
          <>
            <button
              onClick={handleSweep}
              disabled={sweep.isPending}
              title="Chạy lại đợt quét nhắc việc ngay bây giờ (bình thường tự chạy lúc 00:00)"
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 border border-slate-200 disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-sm text-slate-500">refresh</span>
              {sweep.isPending ? 'Đang quét…' : 'Quét ngay'}
            </button>
            {onOpenConfig && (
              <button
                onClick={onOpenConfig}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 border border-slate-200"
              >
                <span className="material-symbols-outlined text-sm text-slate-500">settings</span>
                Cấu hình bảo trì
              </button>
            )}
          </>
        }
      />

      <main className="mt-16 p-4 md:p-8 flex-1 overflow-y-auto custom-scrollbar">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-white border border-slate-200 p-5 rounded-2xl flex items-center justify-between shadow-xs">
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">
                  Phiếu khẩn
                </p>
                <p className="text-2xl font-bold text-rose-600">{criticalCount}</p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center">
                <span className="material-symbols-outlined text-xl">warning</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 p-5 rounded-2xl flex items-center justify-between shadow-xs">
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">
                  Phiếu chưa xử lý
                </p>
                <p className="text-2xl font-bold text-slate-800">{openCount}</p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center">
                <span className="material-symbols-outlined text-xl">confirmation_number</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 p-5 rounded-2xl flex items-center justify-between shadow-xs">
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">
                  Đã tạo Lệnh công việc
                </p>
                <p className="text-2xl font-bold text-emerald-600">
                  {tickets.length - openCount}
                </p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center">
                <span className="material-symbols-outlined text-xl">assignment_turned_in</span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Phiếu nhắc bảo trì</h3>
                <p className="text-xs text-slate-500 mt-0.5 font-medium">
                  Hệ thống tự sinh phiếu trước hạn 3 ngày và báo cho trưởng đơn vị phụ trách.
                </p>
              </div>

              <div className="flex gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                {PRIORITY_FILTERS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setFilterPriority(p.id)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      filterPriority === p.id
                        ? 'bg-white text-blue-600 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="p-4">Số phiếu</th>
                    <th className="p-4">Thiết bị</th>
                    <th className="p-4">Đơn vị phụ trách</th>
                    <th className="p-4">Hạn</th>
                    <th className="p-4">Mức</th>
                    <th className="p-4">Ưu tiên</th>
                    <th className="p-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {isLoading && (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-500">
                        Đang tải…
                      </td>
                    </tr>
                  )}
                  {!isLoading && filtered.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-500">
                        Chưa có phiếu nào. Bấm <strong>Quét ngay</strong> nếu vừa cấu hình lịch.
                      </td>
                    </tr>
                  )}
                  {filtered.map((t) => {
                    const days = daysUntil(t.dueDate);
                    return (
                      <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-4 font-mono font-bold text-blue-600">{t.ticketNumber}</td>
                        <td className="p-4">
                          <div className="font-bold text-slate-800">{t.part?.name ?? '—'}</div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {t.part?.code}
                          </div>
                        </td>
                        <td className="p-4 text-slate-600 font-medium">
                          {t.part?.orgUnit?.title ?? '—'}
                        </td>
                        <td className="p-4">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-md text-xs font-bold ${
                              days <= 0
                                ? 'bg-rose-50 text-rose-600 border border-rose-200'
                                : days <= 2
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : 'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}
                            title={t.dueDate}
                          >
                            {deadlineText(t.dueDate)}
                          </span>
                        </td>
                        <td className="p-4">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-md text-[10px] font-bold ${
                              t.status === 'CRITICAL'
                                ? 'bg-rose-600 text-white'
                                : t.status === 'WARNING'
                                  ? 'bg-amber-500 text-white'
                                  : 'bg-slate-600 text-white'
                            }`}
                          >
                            {STATUS_LABEL[t.status]}
                          </span>
                        </td>
                        <td className="p-4 font-bold text-slate-700">{t.priority}</td>
                        <td className="p-4 text-right whitespace-nowrap">
                          {t.resultingTaskId ? (
                            <span className="text-emerald-600 font-bold inline-flex items-center justify-end gap-1">
                              <span className="material-symbols-outlined text-sm">check</span>
                              Đã tạo Lệnh
                            </span>
                          ) : (
                            <div className="flex gap-2 justify-end">
                              <button
                                onClick={() => setEditing(t)}
                                className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl font-bold transition-colors"
                              >
                                Sửa lịch / ưu tiên
                              </button>
                              <button
                                onClick={() => handleWorkOrder(t)}
                                disabled={workOrder.isPending}
                                className="px-3.5 py-1.5 bg-white border border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white rounded-xl font-bold transition-colors disabled:opacity-50"
                              >
                                Tạo Lệnh công việc
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      {editing && (
        <EditTicketModal
          ticket={editing}
          isSaving={updateTicket.isPending}
          onClose={() => setEditing(null)}
          onSave={async (dto) => {
            try {
              await updateTicket.mutateAsync({ id: editing.id, ...dto });
              setEditing(null);
              showToast('ok', 'Đã cập nhật phiếu.');
            } catch (error) {
              showToast('err', errorMessage(error, 'Cập nhật thất bại.'));
            }
          }}
        />
      )}

      {toast && (
        <div
          className={`fixed bottom-6 right-6 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-2.5 z-50 text-xs font-semibold max-w-md ${
            toast.kind === 'ok' ? 'bg-slate-900 border border-slate-800' : 'bg-red-600'
          }`}
        >
          <span className="material-symbols-outlined text-lg shrink-0">
            {toast.kind === 'ok' ? 'check_circle' : 'error'}
          </span>
          <span>{toast.text}</span>
        </div>
      )}
    </div>
  );
};

interface EditTicketModalProps {
  ticket: ApiMaintenanceTicket;
  isSaving: boolean;
  onClose: () => void;
  onSave: (dto: { dueDate?: string; priority?: TicketPriority; note?: string }) => void;
}

/** US 2.2 — "Change Maintenance" (move the date) and "Set Priority". */
const EditTicketModal: React.FC<EditTicketModalProps> = ({
  ticket,
  isSaving,
  onClose,
  onSave,
}) => {
  const [dueDate, setDueDate] = useState(ticket.dueDate);
  const [priority, setPriority] = useState<TicketPriority>(ticket.priority);
  const [note, setNote] = useState(ticket.note ?? '');

  return (
    <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-800">
            Phiếu {ticket.ticketNumber} — {ticket.part?.name}
          </h3>
        </div>

        <div className="p-5 space-y-4">
          <label className="block">
            <span className="text-xs font-bold text-slate-700">Dời hạn bảo trì</span>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="mt-1 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-blue-600"
            />
          </label>

          <label className="block">
            <span className="text-xs font-bold text-slate-700">Mức ưu tiên</span>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as TicketPriority)}
              className="mt-1 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-blue-600"
            >
              <option value="High">Cao</option>
              <option value="Normal">Thường</option>
              <option value="Low">Thấp</option>
            </select>
          </label>

          <label className="block">
            <span className="text-xs font-bold text-slate-700">Ghi chú</span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Lý do dời lịch, tình trạng thiết bị…"
              className="mt-1 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-blue-600 resize-none"
            />
          </label>
        </div>

        <div className="px-5 py-4 border-t border-slate-100 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50"
          >
            Huỷ
          </button>
          <button
            onClick={() => onSave({ dueDate, priority, note: note.trim() || undefined })}
            disabled={isSaving}
            className="px-5 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 disabled:opacity-50"
          >
            {isSaving ? 'Đang lưu…' : 'Lưu'}
          </button>
        </div>
      </div>
    </div>
  );
};
