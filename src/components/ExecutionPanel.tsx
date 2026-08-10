import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import {
  openAttachment,
  useBreakdownCandidates,
  useReplaceSubtasks,
  useSubmitSubtask,
  useSubtasks,
  useUploadAttachment,
} from '../hooks/useExecution';
import { isActionableStepStatus, type ApiTaskInstance, type ApiTaskStepInstance } from '../api/tasks';
import type { ApiExecutionSubtask } from '../api/execution';

interface ExecutionPanelProps {
  task: ApiTaskInstance;
  step: ApiTaskStepInstance;
}

interface DraftRow {
  assigneeUserId: string;
  title: string;
  /** Empty means "let the server split evenly" (BRD Q1). */
  weight: string;
}

const errorMessage = (error: unknown, fallback: string) =>
  (error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback;

const formatBytes = (bytes: number) =>
  bytes < 1024 * 1024
    ? `${Math.round(bytes / 1024)} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

/**
 * BRD 2 US 1.3 / 1.4 — the Node E owner breaks the step into weighted `E(x)`
 * sub-tasks, and each assignee uploads a report file before submitting theirs.
 */
export const ExecutionPanel: React.FC<ExecutionPanelProps> = ({ task, step }) => {
  const { user } = useAuth();
  const isNodeEOwner = (step.assignees ?? []).some(
    (a) => a.userId === user?.id && a.roleLetter === 'E',
  );

  const { data: subtasks = [], isLoading } = useSubtasks(task.id, step.id);
  // Only the Node E owner may call this, so it is gated on holding the letter.
  const { data: candidates = [] } = useBreakdownCandidates(
    isNodeEOwner ? task.id : undefined,
    isNodeEOwner ? step.id : undefined,
  );
  const replaceSubtasks = useReplaceSubtasks(task.id, step.id);

  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<DraftRow[]>([]);
  const [feedback, setFeedback] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const canEdit = isNodeEOwner && isActionableStepStatus(step.status);

  // Anyone already given an E(x) can stay an option even if they aren't in the
  // candidate list any more (roster changed since the breakdown was made).
  const assigneeOptions = [
    ...candidates.map((c) => ({
      id: c.id,
      label: c.positionName ? `${c.fullName} — ${c.positionName}` : c.fullName,
    })),
    ...subtasks
      .filter((s) => !candidates.some((c) => c.id === s.assigneeUserId))
      .map((s) => ({ id: s.assigneeUserId, label: s.assignee?.fullName ?? s.assigneeUserId })),
  ];

  const startEditing = () => {
    setDraft(
      subtasks.length > 0
        ? subtasks.map((s) => ({
            assigneeUserId: s.assigneeUserId,
            title: s.title,
            weight: String(s.weight),
          }))
        : [{ assigneeUserId: '', title: '', weight: '' }],
    );
    setIsEditing(true);
    setFeedback(null);
  };

  const handleSave = async () => {
    const rows = draft.filter((r) => r.assigneeUserId && r.title.trim());
    if (rows.length === 0) {
      setFeedback({ kind: 'err', text: 'Cần ít nhất một công việc con có người nhận và tên việc.' });
      return;
    }
    try {
      await replaceSubtasks.mutateAsync(
        rows.map((r) => ({
          assigneeUserId: r.assigneeUserId,
          title: r.title.trim(),
          // Omitting weight on ANY row makes the server split all of them
          // evenly — so only send weights when every row has one.
          weight: r.weight.trim() === '' ? undefined : Number(r.weight),
        })),
      );
      setIsEditing(false);
      setFeedback({ kind: 'ok', text: 'Đã lưu phân rã công việc.' });
    } catch (error) {
      setFeedback({ kind: 'err', text: errorMessage(error, 'Lưu phân rã thất bại.') });
    }
  };

  const draftTotal = draft
    .filter((r) => r.weight.trim() !== '')
    .reduce((sum, r) => sum + (Number(r.weight) || 0), 0);
  const allWeighted = draft.length > 0 && draft.every((r) => r.weight.trim() !== '');

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4">
      <div className="flex justify-between items-start gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <span className="material-symbols-outlined text-violet-600">checklist</span>
            Phân rã công việc — Node E
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
            Bước <strong>{step.stepName}</strong> · tiến độ {step.progress}% (cộng theo trọng số các
            việc đã nộp)
          </p>
        </div>
        {canEdit && !isEditing && (
          <button
            onClick={startEditing}
            className="px-3.5 py-1.5 bg-violet-600 text-white rounded-xl text-xs font-bold hover:bg-violet-700 transition-colors shrink-0"
          >
            {subtasks.length > 0 ? 'Sửa phân rã' : 'Phân rã công việc'}
          </button>
        )}
      </div>

      {feedback && (
        <div
          className={`px-3 py-2 rounded-xl text-[11px] font-semibold ${
            feedback.kind === 'ok'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-rose-50 text-rose-700 border border-rose-200'
          }`}
        >
          {feedback.text}
        </div>
      )}

      {isEditing ? (
        <div className="space-y-3">
          <div className="space-y-2">
            {draft.map((row, index) => (
              <div key={index} className="flex gap-2 items-start">
                <select
                  value={row.assigneeUserId}
                  onChange={(e) =>
                    setDraft(draft.map((r, i) => (i === index ? { ...r, assigneeUserId: e.target.value } : r)))
                  }
                  className="w-44 px-2 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-medium focus:outline-none focus:border-violet-600 shrink-0"
                >
                  <option value="">— Người thực hiện —</option>
                  {assigneeOptions.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={row.title}
                  placeholder="Nội dung công việc con"
                  onChange={(e) =>
                    setDraft(draft.map((r, i) => (i === index ? { ...r, title: e.target.value } : r)))
                  }
                  className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-medium focus:outline-none focus:border-violet-600"
                />
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max="100"
                  value={row.weight}
                  placeholder="chia đều"
                  onChange={(e) =>
                    setDraft(draft.map((r, i) => (i === index ? { ...r, weight: e.target.value } : r)))
                  }
                  className="w-24 px-2 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-medium focus:outline-none focus:border-violet-600 shrink-0"
                />
                <button
                  onClick={() => setDraft(draft.filter((_, i) => i !== index))}
                  title="Xoá dòng"
                  className="p-2 text-slate-400 hover:text-rose-600 shrink-0"
                >
                  <span className="material-symbols-outlined text-base">delete</span>
                </button>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between gap-3">
            <button
              onClick={() => setDraft([...draft, { assigneeUserId: '', title: '', weight: '' }])}
              className="text-[11px] font-bold text-violet-600 hover:text-violet-700 flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-sm">add</span> Thêm công việc con
            </button>
            <span
              className={`text-[11px] font-bold ${
                allWeighted && Math.abs(draftTotal - 100) > 0.001 ? 'text-rose-600' : 'text-slate-500'
              }`}
            >
              {allWeighted
                ? `Tổng trọng số: ${draftTotal.toFixed(2)}%`
                : 'Để trống trọng số → hệ thống chia đều'}
            </span>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50"
            >
              Huỷ
            </button>
            <button
              onClick={handleSave}
              disabled={replaceSubtasks.isPending}
              className="px-5 py-2 bg-violet-600 text-white rounded-xl text-xs font-bold hover:bg-violet-700 disabled:opacity-50"
            >
              {replaceSubtasks.isPending ? 'Đang lưu…' : 'Lưu phân rã'}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {isLoading && <p className="text-xs text-slate-500">Đang tải…</p>}
          {!isLoading && subtasks.length === 0 && (
            <p className="text-xs text-slate-500 py-4 text-center bg-slate-50 rounded-xl border border-slate-200">
              {canEdit
                ? 'Chưa phân rã. Bấm “Phân rã công việc” để giao việc cho cấp dưới.'
                : 'Người giữ Node E chưa phân rã công việc cho bước này.'}
            </p>
          )}
          {subtasks.map((subtask, index) => (
            <SubtaskRow
              key={subtask.id}
              task={task}
              step={step}
              subtask={subtask}
              index={index}
              onError={(text) => setFeedback({ kind: 'err', text })}
              onSuccess={(text) => setFeedback({ kind: 'ok', text })}
            />
          ))}
        </div>
      )}
    </div>
  );
};

interface SubtaskRowProps {
  task: ApiTaskInstance;
  step: ApiTaskStepInstance;
  subtask: ApiExecutionSubtask;
  index: number;
  onError: (text: string) => void;
  onSuccess: (text: string) => void;
}

const SubtaskRow: React.FC<SubtaskRowProps> = ({
  task,
  step,
  subtask,
  index,
  onError,
  onSuccess,
}) => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const upload = useUploadAttachment(task.id, step.id);
  const submit = useSubmitSubtask(task.id, step.id);
  const [note, setNote] = useState('');

  const isMine = subtask.assigneeUserId === user?.id;
  const isSubmitted = subtask.status === 'Submitted';
  const attachments = subtask.attachments ?? [];

  // Keep the note box in sync when the row is refetched after a submit.
  useEffect(() => {
    if (isSubmitted) setNote('');
  }, [isSubmitted]);

  const handleUpload = async (file: File) => {
    try {
      await upload.mutateAsync({ subtaskId: subtask.id, file });
      onSuccess(`Đã tải lên "${file.name}".`);
    } catch (error) {
      onError(errorMessage(error, 'Tải file lên thất bại.'));
    }
  };

  const handleSubmit = async () => {
    try {
      await submit.mutateAsync({ subtaskId: subtask.id, note: note.trim() || undefined });
      onSuccess('Đã nộp kết quả công việc con.');
    } catch (error) {
      onError(errorMessage(error, 'Nộp kết quả thất bại.'));
    }
  };

  return (
    <div
      className={`p-3 rounded-xl border ${
        isSubmitted ? 'bg-emerald-50/50 border-emerald-200' : 'bg-slate-50 border-slate-200'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold text-violet-700 bg-violet-100 px-1.5 py-0.5 rounded">
              E({index + 1})
            </span>
            <span className="text-xs font-bold text-slate-800 truncate">{subtask.title}</span>
          </div>
          <p className="text-[11px] text-slate-500 font-medium mt-1">
            👤 {subtask.assignee?.fullName ?? '—'} · trọng số <strong>{subtask.weight}%</strong>
          </p>
        </div>
        <span
          className={`px-2 py-0.5 rounded-md text-[10px] font-bold shrink-0 ${
            isSubmitted ? 'bg-emerald-600 text-white' : 'bg-slate-300 text-slate-700'
          }`}
        >
          {isSubmitted ? 'ĐÃ NỘP' : 'CHƯA NỘP'}
        </span>
      </div>

      {attachments.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {attachments.map((att) => (
            <button
              key={att.id}
              onClick={() => openAttachment(task.id, step.id, subtask.id, att.id)}
              title="Mở file (link có hạn 5 phút)"
              className="inline-flex items-center gap-1 px-2 py-1 bg-white border border-slate-200 rounded-lg text-[10px] font-semibold text-slate-700 hover:border-blue-600 hover:text-blue-600 transition-colors max-w-full"
            >
              <span className="material-symbols-outlined text-xs shrink-0">attach_file</span>
              <span className="truncate">{att.fileName}</span>
              <span className="text-slate-400 shrink-0">({formatBytes(att.sizeBytes)})</span>
            </button>
          ))}
        </div>
      )}

      {isMine && !isSubmitted && (
        <div className="mt-3 space-y-2 pt-3 border-t border-slate-200">
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ghi chú kết quả (không bắt buộc)"
            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px] font-medium focus:outline-none focus:border-violet-600"
          />
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleUpload(file);
                e.target.value = ''; // allow re-picking the same file
              }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={upload.isPending}
              className="flex-1 px-3 py-1.5 bg-white border border-slate-300 text-slate-700 rounded-lg text-[11px] font-bold hover:bg-slate-50 disabled:opacity-50 flex items-center justify-center gap-1"
            >
              <span className="material-symbols-outlined text-sm">upload_file</span>
              {upload.isPending ? 'Đang tải…' : 'Đính kèm báo cáo'}
            </button>
            <button
              onClick={handleSubmit}
              disabled={submit.isPending || attachments.length === 0}
              title={
                attachments.length === 0 ? 'Phải đính kèm ít nhất 1 file báo cáo mới nộp được' : undefined
              }
              className="flex-1 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-[11px] font-bold hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submit.isPending ? 'Đang nộp…' : 'Nộp kết quả'}
            </button>
          </div>
          {attachments.length === 0 && (
            <p className="text-[10px] text-amber-700 font-semibold">
              Vui lòng đính kèm file báo cáo kết quả trước khi nộp.
            </p>
          )}
        </div>
      )}

      {isSubmitted && subtask.note && (
        <p className="mt-2 text-[11px] text-slate-600 italic">“{subtask.note}”</p>
      )}
    </div>
  );
};
