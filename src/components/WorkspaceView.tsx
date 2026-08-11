import React, { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { ExecutionPanel } from './ExecutionPanel';
import { ActivityLogPanel } from './ActivityLogPanel';
import { StepDetailModal } from './StepDetailModal';
import {
  ApiTaskInstance,
  ApiTaskStepInstance,
  TaskPriority,
  TaskStatus,
  isActionableStepStatus,
} from '../api/tasks';
import { RoleLetter } from '../api/workflows';
import {
  useApproveStep,
  useCreateTask,
  useDelegateStep,
  useDelegationCandidates,
  useRejectStep,
  useTask,
  useTaskRollbackTargets,
  useTasks,
} from '../hooks/useTasks';
import { useOrgUnitsByLevel } from '../hooks/useOrgUnits';
import { useSubmittableWorkflows } from '../hooks/useWorkflows';

interface WorkspaceViewProps {
  onMenuToggle?: () => void;
}

const STATUS_STYLES: Record<TaskStatus, string> = {
  Active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Completed: 'bg-blue-50 text-blue-700 border-blue-200',
  Pending: 'bg-slate-100 text-slate-600 border-slate-200',
  Rejected: 'bg-rose-50 text-rose-700 border-rose-200',
};

const STEP_STATUS_STYLES: Record<string, string> = {
  Completed: 'bg-emerald-50/60 border-emerald-300 text-emerald-700',
  'In Progress': 'bg-blue-50 border-blue-400 ring-2 ring-blue-500/20 text-blue-700',
  Rework: 'bg-orange-50 border-orange-400 ring-2 ring-orange-500/20 text-orange-700',
  Pending: 'bg-slate-50 border-slate-200 opacity-70 text-slate-500',
  Rejected: 'bg-rose-50 border-rose-300 text-rose-700',
};

/** Thứ tự đọc của sáu chữ cái — trùng với thứ tự trong Ma trận RSACIE. */
const LETTER_ORDER: RoleLetter[] = ['R', 'S', 'A', 'C', 'I', 'E'];

/**
 * "C: Nguyễn Văn Tuấn" thay vì "C: Khối Kỹ thuật".
 *
 * Dựng từ `assignees` — tức là những người ĐÃ được phân giải lúc tạo đơn, đã
 * tính cả escalation lẫn uỷ quyền — chứ không đọc `roleAssignedSummary` sẵn có,
 * vì chuỗi đó được đông cứng lúc tạo và các đơn tạo trước thay đổi này vẫn đang
 * ghi tên đơn vị. Chỉ rơi về nó khi một bước không có người nhận nào.
 */
function describeStepOwners(step: ApiTaskStepInstance): string | null {
  const assignees = step.assignees ?? [];
  if (assignees.length === 0) return step.roleAssignedSummary ?? null;

  const byLetter = new Map<RoleLetter, string[]>();
  for (const a of assignees) {
    const name = a.user?.fullName ?? 'Không rõ';
    const label = a.isEscalated ? `${name} (xử lý thay)` : name;
    const list = byLetter.get(a.roleLetter) ?? [];
    if (!list.includes(label)) list.push(label);
    byLetter.set(a.roleLetter, list);
  }

  return LETTER_ORDER.filter((l) => byLetter.has(l))
    .map((l) => `${l}: ${byLetter.get(l)!.join(', ')}`)
    .join('; ');
}

// --- Create Task Modal ---

interface CreateTaskModalProps {
  onClose: () => void;
  onCreated: (taskId: string) => void;
}

const CreateTaskModal: React.FC<CreateTaskModalProps> = ({ onClose, onCreated }) => {
  // Chỉ quy trình người dùng giữ chữ S. `maintenance_linked` không có mặt ở đây
  // vì luồng đó do hệ thống tự sinh sau khi quy trình cha được duyệt.
  const { data: processWorkflows, isLoading: loadingProcess } =
    useSubmittableWorkflows('process');
  const { data: directWorkflows, isLoading: loadingDirect } =
    useSubmittableWorkflows('maintenance_direct');
  const { data: orgUnits } = useOrgUnitsByLevel(1);
  const createTaskMutation = useCreateTask();

  const [workflowId, setWorkflowId] = useState('');
  const [orgUnitId, setOrgUnitId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('Normal');
  const [dueDate, setDueDate] = useState('');

  const workflowOptions = [...(processWorkflows ?? []), ...(directWorkflows ?? [])];
  const isLoadingWorkflows = loadingProcess || loadingDirect;
  const hasNoWorkflows = !isLoadingWorkflows && workflowOptions.length === 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workflowId || !orgUnitId || !title.trim()) return;
    const task = await createTaskMutation.mutateAsync({
      workflowId,
      orgUnitId,
      title: title.trim(),
      description: description.trim() || undefined,
      priority,
      dueDate: dueDate || undefined,
    });
    onCreated(task.id);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
          <h3 className="text-base font-bold text-slate-800">Tạo Đơn / Yêu cầu Mới</h3>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 custom-scrollbar flex-1">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">
              Quy trình <span className="text-rose-500">*</span>
            </label>
            <select
              value={workflowId}
              onChange={(e) => {
                setWorkflowId(e.target.value);
                const wf = workflowOptions.find((w) => w.id === e.target.value);
                if (wf) setTitle(`Yêu cầu ${wf.name}`);
              }}
              required
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-800"
            >
              <option value="" disabled>
                {isLoadingWorkflows ? 'Đang tải...' : '-- Chọn quy trình --'}
              </option>
              {workflowOptions.map((wf) => (
                <option key={wf.id} value={wf.id}>
                  {wf.code}: {wf.name}
                </option>
              ))}
            </select>
            {hasNoWorkflows && (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] leading-snug text-amber-800">
                Bạn chưa được gán vai trò <b>Đề xuất (S)</b> ở quy trình nào, nên chưa mở được đơn.
                Nhờ người thiết kế quy trình gán chữ S cho bạn (hoặc cho đơn vị của bạn) ở{' '}
                <b>Ma trận RSACIE</b>.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">
              Đơn vị phụ trách (Cấp 1) <span className="text-rose-500">*</span>
            </label>
            <select
              value={orgUnitId}
              onChange={(e) => setOrgUnitId(e.target.value)}
              required
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-800"
            >
              <option value="" disabled>
                -- Chọn đơn vị --
              </option>
              {(orgUnits ?? []).map((u) => (
                <option key={u.id} value={u.id}>
                  {u.title}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">
              Tiêu đề <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-800"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">Mô tả</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-medium text-slate-800 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">Mức ưu tiên</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
              >
                <option value="Low">Thấp</option>
                <option value="Normal">Bình thường</option>
                <option value="High">Cao</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">Hạn hoàn thành</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={createTaskMutation.isPending}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs disabled:opacity-60"
            >
              {createTaskMutation.isPending ? 'Đang tạo…' : 'Khởi Tạo Đơn Ngay'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// --- Approve / Reject panel for the currently active step ---

interface ApprovalPanelProps {
  task: ApiTaskInstance;
  activeStep: ApiTaskStepInstance | undefined;
}

const ApprovalPanel: React.FC<ApprovalPanelProps> = ({ task, activeStep }) => {
  const { user } = useAuth();
  const approveMutation = useApproveStep(task.id);
  const rejectMutation = useRejectStep(task.id);
  const delegateMutation = useDelegateStep(task.id);
  const [notes, setNotes] = useState('');
  const [targetStepId, setTargetStepId] = useState('');
  const [selectedLetter, setSelectedLetter] = useState<RoleLetter | ''>('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [showDelegate, setShowDelegate] = useState(false);
  const [delegateToUserId, setDelegateToUserId] = useState('');

  // Computed BEFORE the hooks below, and before the early return, because the
  // rollback query has to be gated on the letter actually being acted as — not
  // on `selectedLetter`, which stays empty whenever the user holds a single
  // role and is therefore never asked to pick one.
  const myAssignments = (activeStep?.assignees ?? []).filter((a) => a.userId === user?.id);
  const heldLetters = myAssignments.map((a) => a.roleLetter);
  const rejectCapableLetters = heldLetters.filter((l) => l === 'A' || l === 'C');
  const rejectLetter =
    selectedLetter && rejectCapableLetters.includes(selectedLetter)
      ? selectedLetter
      : rejectCapableLetters.length === 1
        ? rejectCapableLetters[0]
        : '';

  const { data: rollbackTargets } = useTaskRollbackTargets(
    activeStep && rejectLetter === 'A' ? task.id : undefined,
    activeStep && rejectLetter === 'A' ? activeStep.id : undefined,
  );
  const { data: delegationCandidates } = useDelegationCandidates(
    showDelegate ? task.id : undefined,
    showDelegate ? activeStep?.id : undefined,
  );

  if (!activeStep) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs text-xs text-slate-500">
        Đơn này hiện không có bước nào đang chờ xử lý.
      </div>
    );
  }

  const delegateCapableLetters = heldLetters.filter((l) => l === 'R' || l === 'C');
  const isActingAsEscalated = myAssignments.some((a) => a.isEscalated);
  const delegatedAssignments = myAssignments.filter((a) => a.delegatedFromUser);

  if (heldLetters.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs text-xs text-slate-500">
        Bạn không được phân công vai trò nào ở bước hiện tại (<strong>{activeStep.stepName}</strong>) nên
        không thể phê duyệt/từ chối.
      </div>
    );
  }

  const effectiveLetter = selectedLetter || (heldLetters.length === 1 ? heldLetters[0] : '');

  const handleApprove = async () => {
    if (heldLetters.length > 1 && !effectiveLetter) {
      setFeedback('Bạn giữ nhiều vai trò ở bước này — hãy chọn vai trò bạn đang hành động.');
      return;
    }
    try {
      await approveMutation.mutateAsync({ stepId: activeStep.id, notes: notes || undefined, roleLetter: effectiveLetter || undefined });
      setNotes('');
      setFeedback('Đã phê duyệt bước thành công.');
    } catch (err: any) {
      setFeedback(err?.response?.data?.message ?? 'Có lỗi khi phê duyệt.');
    }
  };

  const handleReject = async () => {
    if (!notes.trim()) {
      setFeedback('Vui lòng nhập ghi chú lý do từ chối.');
      return;
    }
    if (rejectCapableLetters.length === 0) {
      setFeedback('Chỉ vai trò A (Approve) hoặc C (Checker) mới được từ chối bước này.');
      return;
    }
    if (!rejectLetter) {
      setFeedback('Bạn giữ cả A lẫn C ở bước này — hãy chọn vai trò bạn đang hành động.');
      return;
    }
    if (rejectLetter === 'A' && !targetStepId) {
      setFeedback('Vai trò A phải chọn bước sẽ quay về khi từ chối.');
      return;
    }
    try {
      await rejectMutation.mutateAsync({
        stepId: activeStep.id,
        notes: notes.trim(),
        targetStepId: rejectLetter === 'A' ? targetStepId : undefined,
        roleLetter: rejectLetter,
      });
      setNotes('');
      setTargetStepId('');
      setFeedback('Đã từ chối và quay về bước tương ứng.');
    } catch (err: any) {
      setFeedback(err?.response?.data?.message ?? 'Có lỗi khi từ chối.');
    }
  };

  const handleDelegate = async () => {
    if (!delegateToUserId) {
      setFeedback('Vui lòng chọn người sẽ nhận việc.');
      return;
    }
    const delegateLetter =
      selectedLetter && delegateCapableLetters.includes(selectedLetter)
        ? selectedLetter
        : delegateCapableLetters.length === 1
          ? delegateCapableLetters[0]
          : undefined;
    if (!delegateLetter) {
      setFeedback('Bạn giữ cả R lẫn C ở bước này — hãy chọn vai trò bạn đang hành động trước khi giao việc.');
      return;
    }
    try {
      await delegateMutation.mutateAsync({ stepId: activeStep.id, toUserId: delegateToUserId, roleLetter: delegateLetter });
      setShowDelegate(false);
      setDelegateToUserId('');
      setFeedback('Đã giao việc thành công.');
    } catch (err: any) {
      setFeedback(err?.response?.data?.message ?? 'Có lỗi khi giao việc.');
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs flex flex-col gap-4">
      <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-3 flex items-center justify-between">
        <span>Xử lý & Phê duyệt</span>
        <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded font-bold">
          Bước: {activeStep.stepName}
        </span>
      </h3>

      <div className="text-xs text-slate-600">
        Vai trò bạn giữ ở bước này:{' '}
        <span className="font-mono font-bold text-slate-800">{heldLetters.join(', ')}</span>
      </div>

      {isActingAsEscalated && (
        <div className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 flex items-center gap-1.5">
          <span>⬆️</span> Xử lý thay thế — đơn vị được gán ban đầu không có Trưởng bộ phận, việc này được tự động đẩy lên bạn.
        </div>
      )}
      {delegatedAssignments.map((a) => (
        <div
          key={a.roleLetter}
          className="text-[10px] font-bold text-purple-800 bg-purple-50 border border-purple-200 rounded-lg px-2.5 py-1.5"
        >
          🔁 Vai trò {a.roleLetter}: được giao bởi {a.delegatedFromUser?.fullName}
        </div>
      ))}

      {heldLetters.length > 1 && (
        <select
          value={selectedLetter}
          onChange={(e) => setSelectedLetter(e.target.value as RoleLetter | '')}
          className="w-full p-2 text-xs font-bold border border-slate-200 rounded-xl bg-slate-50"
        >
          <option value="">-- Chọn vai trò đang hành động --</option>
          {heldLetters.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
      )}

      <div>
        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
          Ghi chú phản hồi / Lý do từ chối
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Nhập nhận xét hoặc phương án điều chỉnh..."
          className="w-full p-2.5 text-xs border border-slate-200 rounded-xl bg-slate-50 resize-none"
        />
      </div>

      {rejectLetter === 'A' && (
        <div>
          <label className="block text-[10px] font-bold text-orange-600 uppercase tracking-wider mb-1.5">
            Chọn bước quay về (bắt buộc cho Role A)
          </label>
          <select
            value={targetStepId}
            onChange={(e) => setTargetStepId(e.target.value)}
            className="w-full p-2.5 text-xs font-bold border border-orange-200 rounded-xl bg-orange-50 text-orange-900"
          >
            <option value="">-- Chọn bước --</option>
            {(rollbackTargets ?? []).map((s) => (
              <option key={s.id} value={s.id}>
                [{s.stepOrder}] {s.stepName}
              </option>
            ))}
          </select>
        </div>
      )}

      {rejectLetter === 'C' && (
        <p className="text-[10px] text-purple-700 bg-purple-50 border border-purple-200 rounded-lg px-2.5 py-2 leading-snug">
          Vai trò C có bước quay về cố định được cấu hình sẵn từ Ma trận RACI — hệ thống sẽ tự động chuyển về
          đúng bước đó, không cần chọn thủ công.
        </p>
      )}

      {delegateCapableLetters.length > 0 && (
        <div className="border-t border-slate-100 pt-3">
          {!showDelegate ? (
            <button
              onClick={() => setShowDelegate(true)}
              className="w-full text-xs font-bold text-slate-600 hover:text-blue-600 hover:bg-blue-50/50 border border-slate-200 rounded-xl py-2 transition-colors flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-sm">forward</span> Giao việc cho cấp dưới
            </button>
          ) : (
            <div className="space-y-2">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Giao việc cho (chỉ hiện cấp dưới trực thuộc bạn)
              </label>
              <select
                value={delegateToUserId}
                onChange={(e) => setDelegateToUserId(e.target.value)}
                className="w-full p-2.5 text-xs font-bold border border-slate-200 rounded-xl bg-slate-50"
              >
                <option value="">-- Chọn người nhận --</option>
                {(delegationCandidates ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.fullName} ({c.email})
                  </option>
                ))}
              </select>
              {(delegationCandidates ?? []).length === 0 && (
                <p className="text-[10px] text-slate-400 italic">Bạn không có cấp dưới nào để giao việc.</p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => setShowDelegate(false)}
                  className="flex-1 text-xs font-semibold text-slate-500 hover:bg-slate-100 rounded-xl py-2"
                >
                  Hủy
                </button>
                <button
                  onClick={handleDelegate}
                  disabled={delegateMutation.isPending}
                  className="flex-1 text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 rounded-xl py-2 disabled:opacity-60"
                >
                  {delegateMutation.isPending ? 'Đang giao…' : 'Xác nhận giao việc'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {feedback && (
        <div className="text-[11px] font-semibold text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2">
          {feedback}
        </div>
      )}

      <div className="flex gap-2.5 mt-auto pt-3 border-t border-slate-100">
        <button
          onClick={handleReject}
          disabled={rejectMutation.isPending || rejectCapableLetters.length === 0}
          className="flex-1 bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 py-2.5 rounded-xl text-xs font-bold transition-colors flex justify-center items-center gap-1 shadow-2xs disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-base">close</span> Từ chối
        </button>
        <button
          onClick={handleApprove}
          disabled={approveMutation.isPending}
          className="flex-1 bg-blue-600 text-white hover:bg-blue-700 py-2.5 rounded-xl text-xs font-bold transition-colors flex justify-center items-center gap-1 shadow-xs disabled:opacity-60"
        >
          <span className="material-symbols-outlined text-base">check</span> Phê duyệt
        </button>
      </div>
    </div>
  );
};

// --- Top-level view ---

export const WorkspaceView: React.FC<WorkspaceViewProps> = ({ onMenuToggle }) => {
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTaskId, setSelectedTaskId] = useState<string | undefined>(undefined);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [detailStepId, setDetailStepId] = useState<string | null>(null);

  const { data: tasks, isLoading: tasksLoading } = useTasks(
    statusFilter !== 'all' ? { status: statusFilter } : undefined,
  );
  const activeTaskId = selectedTaskId ?? tasks?.[0]?.id;
  const { data: task } = useTask(activeTaskId);

  const filteredTasks = (tasks ?? []).filter((t) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return t.title.toLowerCase().includes(q) || t.taskCode.toLowerCase().includes(q);
  });

  const steps = [...(task?.steps ?? [])].sort((a, b) => a.stepOrder - b.stepOrder);
  // A step in Rework is still awaiting action, so it counts as the active one.
  const activeStep = steps.find((s) => isActionableStepStatus(s.status));
  // Resolved from the live list, not stored: switching tasks must not leave the
  // modal open on a step belonging to the task you just navigated away from.
  const detailStep = steps.find((s) => s.id === detailStepId);

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 min-w-0">
      <header className="fixed top-0 right-0 left-0 md:left-64 h-16 bg-white border-b border-slate-200 flex justify-between items-center px-4 md:px-8 z-30 shadow-2xs">
        <div className="flex items-center gap-3">
          <button onClick={onMenuToggle} className="p-2 md:hidden text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100">
            <span className="material-symbols-outlined">menu</span>
          </button>
          <h1 className="text-base md:text-lg font-bold text-slate-800 tracking-tight">Workspace</h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs"
          >
            <span className="material-symbols-outlined text-sm">add_circle</span>
            <span>Tạo Đơn / Yêu cầu Mới</span>
          </button>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm đơn, mã…"
            className="pl-3 pr-3 py-1.5 bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl focus:outline-none focus:border-blue-600 w-44 md:w-56"
          />
        </div>
      </header>

      <main className="flex-1 mt-16 p-4 md:p-6 overflow-y-auto custom-scrollbar">
        <div className="max-w-7xl mx-auto space-y-5">
          <div className="flex items-center gap-2 bg-white p-3 border border-slate-200 rounded-2xl shadow-2xs overflow-x-auto custom-scrollbar">
            {(['all', 'Active', 'Completed', 'Rejected'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                  statusFilter === s ? 'bg-blue-600 text-white shadow-2xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {s === 'all' ? 'Tất cả' : s}
              </button>
            ))}
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
            {tasksLoading && <p className="text-xs text-slate-400">Đang tải danh sách…</p>}
            {!tasksLoading && filteredTasks.length === 0 && (
              <p className="text-xs text-slate-400 italic">Không có đơn nào phù hợp.</p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {filteredTasks.map((t) => {
                const isSelected = t.id === activeTaskId;
                return (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTaskId(t.id)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                      isSelected ? 'border-blue-500 bg-blue-50/70 shadow-xs ring-2 ring-blue-500/20' : 'border-slate-200 hover:border-blue-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-mono text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-bold truncate">
                          {t.taskCode}
                        </span>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${STATUS_STYLES[t.status]}`}>
                          {t.status}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-800 line-clamp-2 leading-snug">{t.title}</h4>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-2 border-t border-slate-200/60">
                      <span className="truncate max-w-[120px] font-medium">{t.orgUnit?.title}</span>
                      <span className="font-semibold">{t.priority}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {task && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-8 flex flex-col gap-6">
                <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col gap-5 shadow-2xs">
                  <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                    <div>
                      <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-lg border border-blue-200">
                        {task.taskCode}
                      </span>
                      <h2 className="text-xl font-bold text-slate-800 tracking-tight mt-1">{task.title}</h2>
                      {task.referenceCode && (
                        <p className="text-[11px] text-slate-500 font-semibold mt-1">
                          <span className="material-symbols-outlined text-xs align-middle mr-0.5">link</span>
                          Nguồn: {task.referenceCode}
                          {task.referenceTitle ? ` — ${task.referenceTitle}` : ''}
                        </p>
                      )}
                    </div>
                    <span className={`px-3 py-1 rounded-lg text-xs font-bold border ${STATUS_STYLES[task.status]}`}>
                      {task.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50/70 p-4 rounded-xl border border-slate-200/70">
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-0.5">Người Khởi Tạo</p>
                      <p className="text-xs font-bold text-slate-800 truncate">{task.initiator?.fullName}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-0.5">Đơn vị</p>
                      <p className="text-xs font-bold text-slate-800 truncate">{task.orgUnit?.title}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-0.5">Mức Ưu Tiên</p>
                      <p className={`text-xs font-bold ${task.priority === 'High' ? 'text-rose-600' : 'text-slate-800'}`}>
                        {task.priority}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-0.5">Hạn Hoàn Thành</p>
                      <p className="text-xs font-mono font-bold text-slate-800">{task.dueDate ?? '—'}</p>
                    </div>
                  </div>

                  {task.description && (
                    <p className="text-xs text-slate-600 leading-relaxed font-normal p-3 bg-white rounded-xl border border-slate-200">
                      {task.description}
                    </p>
                  )}
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <span className="material-symbols-outlined text-blue-600">account_tree</span>
                    Tiến trình các bước
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {steps.map((step) => (
                      <button
                        key={step.id}
                        type="button"
                        onClick={() => setDetailStepId(step.id)}
                        title="Xem chi tiết bước"
                        className={`p-4 rounded-xl border flex flex-col gap-2 text-left transition-shadow hover:shadow-md hover:ring-2 hover:ring-blue-300 ${STEP_STATUS_STYLES[step.status]}`}
                      >
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-mono font-bold uppercase">Bước {step.stepOrder}</span>
                          {step.status === 'Completed' && <span className="material-symbols-outlined text-base">check_circle</span>}
                          {step.status === 'In Progress' && <span className="material-symbols-outlined text-base animate-spin">sync</span>}
                          {step.status === 'Rework' && (
                            <span className="material-symbols-outlined text-base" title="Bị Node C trả về để làm lại">
                              replay
                            </span>
                          )}
                          {step.status === 'Pending' && <span className="material-symbols-outlined text-base">schedule</span>}
                        </div>
                        <h5 className="text-xs font-bold line-clamp-2">{step.stepName}</h5>
                        {describeStepOwners(step) && (
                          <div className="text-[10px] font-semibold pt-2 border-t border-current/10">
                            👤 {describeStepOwners(step)}
                          </div>
                        )}
                        <div className="w-full bg-white/60 rounded-full h-1.5 overflow-hidden">
                          <div className="bg-current h-1.5 transition-all" style={{ width: `${step.progress}%` }} />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* BRD 2 US 1.3/1.4 — only a Node E step can be broken down. */}
                {activeStep && (activeStep.assignees ?? []).some((a) => a.roleLetter === 'E') && (
                  <ExecutionPanel task={task} step={activeStep} />
                )}
              </div>

              <div className="lg:col-span-4 flex flex-col gap-6">
                <ApprovalPanel task={task} activeStep={activeStep} />
                <ActivityLogPanel taskId={task.id} />
              </div>
            </div>
          )}
        </div>
      </main>

      {task && detailStep && (
        <StepDetailModal task={task} step={detailStep} onClose={() => setDetailStepId(null)} />
      )}

      {showCreateModal && (
        <CreateTaskModal
          onClose={() => setShowCreateModal(false)}
          onCreated={(taskId) => {
            setShowCreateModal(false);
            setSelectedTaskId(taskId);
          }}
        />
      )}
    </div>
  );
};
