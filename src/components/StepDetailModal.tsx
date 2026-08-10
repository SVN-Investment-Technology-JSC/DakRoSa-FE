import React from 'react';
import { openAttachment, useSubtasks } from '../hooks/useExecution';
import { useTaskActivity } from '../hooks/useActivity';
import type { ApiTaskInstance, ApiTaskStepInstance } from '../api/tasks';

interface StepDetailModalProps {
  task: ApiTaskInstance;
  step: ApiTaskStepInstance;
  onClose: () => void;
}

const ROLE_LABELS: Record<string, string> = {
  R: 'Thực hiện (R)',
  S: 'Khởi tạo (S)',
  A: 'Phê duyệt cuối (A)',
  C: 'Kiểm tra (C)',
  I: 'Được thông báo (I)',
  E: 'Thực thi (E)',
};

const formatBytes = (bytes: number) =>
  bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

const formatTime = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString('vi-VN', { hour12: false }) : '—';

/**
 * Xem lại MỌI bước, kể cả bước đã đóng và bước không phải của mình.
 *
 * Đây là màn hình đọc — không có nút thao tác nào. Thao tác vẫn chỉ nằm ở bước
 * đang mở (ApprovalPanel / ExecutionPanel), nên mở chi tiết một bước cũ không
 * mở thêm quyền gì; nó chỉ trả lời hai câu hỏi thực tế: cấp trên cần xem cấp
 * dưới đã nộp gì trước khi duyệt, và người giữ E ở bước sau cần xem kết quả E
 * của các bước trước.
 */
export const StepDetailModal: React.FC<StepDetailModalProps> = ({ task, step, onClose }) => {
  const { data: subtasks = [], isLoading } = useSubtasks(task.id, step.id);
  const { data: activity = [] } = useTaskActivity(task.id);

  const stepActivity = activity.filter((entry) => entry.stepId === step.id);
  const attachmentCount = subtasks.reduce((n, s) => n + (s.attachments?.length ?? 0), 0);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/40 flex items-start justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-3xl my-8 border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 p-5 border-b border-slate-100">
          <div>
            <span className="text-[10px] font-mono font-bold uppercase text-slate-400">
              Bước {step.stepOrder} · {task.taskCode}
            </span>
            <h3 className="text-lg font-bold text-slate-800 tracking-tight">{step.stepName}</h3>
            <p className="text-[11px] font-semibold text-slate-500 mt-0.5">
              {step.status} · tiến độ {step.progress}%
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            title="Đóng"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        <div className="p-5 space-y-6">
          <section>
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Người phụ trách
            </h4>
            {(step.assignees ?? []).length === 0 ? (
              <p className="text-xs text-slate-400 italic">Bước này chưa có người giữ vai trò nào.</p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {(step.assignees ?? []).map((a) => (
                  <div
                    key={`${a.userId}-${a.roleLetter}`}
                    className="flex items-center gap-2 text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
                  >
                    <span className="font-mono font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded px-1.5">
                      {a.roleLetter}
                    </span>
                    <span className="font-semibold text-slate-800">
                      {a.user?.fullName ?? a.userId}
                    </span>
                    <span className="text-slate-400">{ROLE_LABELS[a.roleLetter] ?? ''}</span>
                    {a.isEscalated && (
                      <span className="ml-auto text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
                        Xử lý thay thế
                      </span>
                    )}
                    {a.delegatedFromUser && (
                      <span className="ml-auto text-[10px] font-bold text-violet-700 bg-violet-50 border border-violet-200 rounded px-1.5 py-0.5">
                        Được giao bởi {a.delegatedFromUser.fullName}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Kết quả thực hiện{attachmentCount > 0 ? ` · ${attachmentCount} file` : ''}
            </h4>
            {isLoading ? (
              <p className="text-xs text-slate-400">Đang tải…</p>
            ) : subtasks.length === 0 ? (
              <p className="text-xs text-slate-400 italic">
                Bước này không được phân rã công việc con, nên không có file kết quả.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {subtasks.map((s) => (
                  <div key={s.id} className="border border-slate-200 rounded-xl p-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-800">{s.title}</span>
                      <span className="text-[10px] font-mono font-bold text-slate-500">
                        {s.weight}%
                      </span>
                      <span
                        className={`ml-auto text-[10px] font-bold rounded px-1.5 py-0.5 border ${
                          s.status === 'Submitted'
                            ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                            : 'text-slate-500 bg-slate-50 border-slate-200'
                        }`}
                      >
                        {s.status === 'Submitted' ? 'Đã nộp' : 'Chưa nộp'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      {s.assignee?.fullName ?? s.assigneeUserId}
                      {s.submittedAt ? ` · nộp lúc ${formatTime(s.submittedAt)}` : ''}
                    </p>
                    {s.note && (
                      <p className="text-[11px] text-slate-600 mt-1.5 bg-slate-50 rounded-lg p-2 border border-slate-100">
                        {s.note}
                      </p>
                    )}
                    {(s.attachments ?? []).length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {(s.attachments ?? []).map((f) => (
                          <button
                            key={f.id}
                            onClick={() => openAttachment(task.id, step.id, s.id, f.id)}
                            className="flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-2 py-1 hover:bg-blue-100"
                          >
                            <span className="material-symbols-outlined text-sm">attach_file</span>
                            {f.fileName}
                            <span className="text-blue-400 font-normal">
                              ({formatBytes(f.sizeBytes)})
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Nhật ký của bước
            </h4>
            {stepActivity.length === 0 ? (
              <p className="text-xs text-slate-400 italic">Chưa có thao tác nào trên bước này.</p>
            ) : (
              <ol className="flex flex-col gap-2">
                {stepActivity.map((entry) => (
                  <li key={entry.id} className="text-[11px] text-slate-600 flex gap-2">
                    <span className="font-mono text-slate-400 shrink-0">
                      {formatTime(entry.createdAt)}
                    </span>
                    <span>
                      <span className="font-semibold text-slate-800">
                        {entry.actor?.fullName ?? 'Hệ thống'}
                      </span>{' '}
                      {entry.summary}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};
