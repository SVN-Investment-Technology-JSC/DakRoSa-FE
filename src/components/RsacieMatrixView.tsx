import React, { useLayoutEffect, useMemo, useState } from 'react';
import { clampLeft, useFixedPopover } from './rsacie/useFixedPopover';
import { ApiOrgUnitTreeNode } from '../api/orgUnits';
import { ApiOrgUnitMember } from '../api/positions';
import { ApiRaciAssignment, ApiWorkflow, ApiWorkflowStep, RoleLetter, WorkflowKind } from '../api/workflows';
import { useOrgUnitTree } from '../hooks/useOrgUnits';
import { useManyOrgUnitMembers } from '../hooks/usePositions';
import {
  useAddWorkflowStep,
  useCreateWorkflow,
  useUpdateWorkflowStep,
  useWorkflow,
  useWorkflows,
} from '../hooks/useWorkflows';
import { useReplaceCellAssignments, useRoleLetterOptions, useValidRollbackTargets } from '../hooks/useRaci';
import {
  ColumnNode,
  buildColumnTree,
  cellAssignments,
  inheritedByLeaf,
  deeperAssignments,
  headerRows,
  indexUnits,
  leafColumns,
  type InheritedTag,
  sortLetters,
  treeDepth,
} from './rsacie/columns';

interface RsacieMatrixViewProps {
  onMenuToggle?: () => void;
}

const LETTER_CHIP: Record<RoleLetter, string> = {
  R: 'bg-blue-50 text-blue-700 border-blue-200',
  A: 'bg-orange-50 text-orange-700 border-orange-300',
  C: 'bg-purple-50 text-purple-800 border-purple-300',
  S: 'bg-amber-50 text-amber-800 border-amber-300',
  I: 'bg-slate-100 text-slate-600 border-slate-200',
  E: 'bg-emerald-50 text-emerald-700 border-emerald-300',
};

const LETTER_LABEL: Record<RoleLetter, string> = {
  R: 'Review — thực thi nghiệp vụ',
  A: 'Approve — duyệt, tự chọn bước quay về khi từ chối',
  C: 'Check — gác cổng, quay về bước cố định khi từ chối',
  S: 'Submit — khởi tạo hồ sơ',
  I: 'Inform — chỉ nhận thông báo',
  E: 'Execute — thực thi bảo trì',
};

/** The wide role button that fills a matrix cell. */
const LetterButton: React.FC<{
  letters: string;
  tone: string;
  badge?: string;
  onClick?: () => void;
  title?: string;
}> = ({ letters, tone, badge, onClick, title }) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    disabled={!onClick}
    className={`relative flex min-h-[34px] w-full items-center justify-center rounded-lg border px-2 py-1 font-mono text-[13px] font-bold leading-tight transition-shadow ${tone} ${
      onClick ? 'cursor-pointer hover:shadow-sm' : 'cursor-default'
    }`}
  >
    <span className="break-words">{letters}</span>
    {badge && (
      <span className="absolute -bottom-1 -right-1 rounded bg-purple-600 px-1 text-[9px] font-bold leading-[14px] text-white shadow-sm">
        [{badge}]
      </span>
    )}
  </button>
);

const KIND_ICON: Record<ColumnNode['kind'], string> = {
  unit: 'corporate_fare',
  position: 'badge',
  user: 'person',
};

const KIND_HINT: Record<ColumnNode['kind'], string> = {
  unit: 'Giao cho Trưởng đơn vị — trưởng có thể giao tiếp xuống cấp dưới',
  position: 'Cấp chức vụ → giao mọi người giữ chức vụ này',
  user: 'Cấp cá nhân → giao đích danh',
};

/** Renders a set of tags as the comma-joined text used by aggregate cells. */
function joinLetters(tags: ApiRaciAssignment[]): string {
  const cTag = tags.find((t) => t.roleLetter === 'C');
  return sortLetters(tags.map((t) => t.roleLetter))
    .map((l) => (l === 'C' && cTag?.fixedRollbackStep ? `C[${cTag.fixedRollbackStep.stepCode}]` : l))
    .join(', ');
}

// --- Step cell: exactly ONE letter, unless it is an aggregate of deeper levels ---

const CELL_POPOVER_WIDTH = 256;
const CELL_POPOVER_HEIGHT = 300;

interface StepCellProps {
  workflowId: string;
  step: ApiWorkflowStep;
  column: ColumnNode;
  /** Tags assigned directly to this column's own target. */
  tags: ApiRaciAssignment[];
  /** Tags configured deeper inside a collapsed column — makes this cell an aggregate. */
  deeper: ApiRaciAssignment[];
  /**
   * Tags configured on an expanded group (a whole unit, or a whole position)
   * that this column is the run-time recipient of. Read-only here: they belong
   * to the group, so they are edited by collapsing back to it.
   */
  inherited: InheritedTag[];
  hasCElsewhere: boolean;
}

const StepCell: React.FC<StepCellProps> = ({
  workflowId,
  step,
  column,
  tags,
  deeper,
  inherited,
  hasCElsewhere,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [pendingC, setPendingC] = useState(false);
  const [rollbackStepId, setRollbackStepId] = useState('');
  const { anchorRef, position: pos } = useFixedPopover<HTMLDivElement>(isOpen, CELL_POPOVER_HEIGHT);

  useLayoutEffect(() => {
    if (!isOpen) {
      setPendingC(false);
      setRollbackStepId('');
    }
  }, [isOpen]);

  const { data: letterOptions } = useRoleLetterOptions(isOpen ? workflowId : undefined);
  const { data: rollbackTargets } = useValidRollbackTargets(
    isOpen && pendingC ? workflowId : undefined,
    isOpen && pendingC ? step.id : undefined,
  );
  const mutation = useReplaceCellAssignments(workflowId);

  // One letter per cell: saving REPLACES whatever the cell held.
  const setLetter = (letter: RoleLetter | null, fixedRollbackStepId?: string) => {
    mutation.mutate(
      {
        stepId: step.id,
        ...column.target,
        tags: letter ? [{ roleLetter: letter, fixedRollbackStepId }] : [],
      },
      { onSuccess: () => setIsOpen(false) },
    );
  };

  const isAggregate = deeper.length > 0;
  const current = tags[0];
  const multiOwn = tags.length > 1;
  const inheritedTag = inherited[0];

  return (
    <td className="border-r border-slate-100 px-2 py-2 align-middle">
      <div ref={anchorRef}>
        {!current && !isAggregate && !multiOwn && inheritedTag ? (
          // Assigned to the whole unit/position: this column is simply who
          // receives it. Shown, not editable, so the tag keeps one home.
          <LetterButton
            letters={joinLetters(inherited.map((i) => i.assignment))}
            tone="border-dashed border-indigo-300 bg-indigo-50/70 text-indigo-700"
            onClick={() => setIsOpen(true)}
            title={`Gán ở mức chức vụ “${inheritedTag.fromTitle}” → người này nhận việc. Thu gọn cột đó để sửa.`}
          />
        ) : isAggregate || multiOwn ? (
          <LetterButton
            letters={joinLetters([...tags, ...deeper])}
            tone="bg-slate-50 text-slate-500 border-slate-200 border-dashed"
            onClick={() => setIsOpen(true)}
            title={
              isAggregate
                ? 'Tổng hợp cả cấp dưới — sổ cột ra để chỉnh từng cấp. Bấm để sửa vai trò của riêng cấp này.'
                : 'Ô này đang có nhiều hơn 1 vai trò — bấm để đặt lại còn 1.'
            }
          />
        ) : current ? (
          <LetterButton
            letters={current.roleLetter}
            tone={LETTER_CHIP[current.roleLetter]}
            badge={current.roleLetter === 'C' ? current.fixedRollbackStep?.stepCode : undefined}
            onClick={() => setIsOpen(true)}
            title={
              current.roleLetter === 'C' && current.fixedRollbackStep
                ? `Từ chối → quay về bước ${current.fixedRollbackStep.stepCode}: ${current.fixedRollbackStep.stepName}`
                : LETTER_LABEL[current.roleLetter]
            }
          />
        ) : (
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            title="Gán vai trò"
            className="flex min-h-[34px] w-full items-center justify-center rounded-lg border border-transparent text-sm font-medium text-slate-300 transition-colors hover:border-slate-200 hover:bg-slate-50 hover:text-blue-500"
          >
            -
          </button>
        )}
      </div>

      {isOpen && pos && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div
            style={{
              top: pos.top,
              left: clampLeft(pos.left, CELL_POPOVER_WIDTH),
              width: CELL_POPOVER_WIDTH,
              transform: pos.flippedUp ? 'translateY(-100%)' : undefined,
            }}
            className="animate-fade-in fixed z-50 space-y-2 rounded-xl border border-blue-200 bg-white p-3 text-left shadow-2xl"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <span className="block truncate text-[11px] font-bold text-slate-800">
                  {column.subtitle ? `${column.title} — ${column.subtitle}` : column.title}
                </span>
                <span className="text-[9px] font-semibold uppercase text-slate-400">
                  {KIND_HINT[column.kind]}
                </span>
              </div>
              <button onClick={() => setIsOpen(false)} className="shrink-0 text-slate-400 hover:text-slate-600">
                <span className="material-symbols-outlined text-xs">close</span>
              </button>
            </div>

            {inherited.length > 0 && (
              <p className="rounded-lg border border-indigo-200 bg-indigo-50 px-2 py-1.5 text-[10px] leading-snug text-indigo-700">
                <b>{joinLetters(inherited.map((i) => i.assignment))}</b> đang được gán cho cả chức vụ
                “{inherited[0].fromTitle}”, nên người này là một trong những người nhận. Muốn sửa thì
                thu gọn cột “{inherited[0].fromTitle}”.
              </p>
            )}

            {isAggregate && (
              <p className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-[10px] leading-snug text-slate-500">
                Cấp dưới đang có: <b>{joinLetters(deeper)}</b>. Chọn bên dưới chỉ đổi vai trò của riêng “
                {column.title}”.
              </p>
            )}

            {!pendingC ? (
              <>
                <div className="grid grid-cols-3 gap-1.5">
                  {(letterOptions ?? []).map((l) => {
                    const blocked = l === 'C' && hasCElsewhere;
                    const active = current?.roleLetter === l && tags.length === 1;
                    return (
                      <button
                        key={l}
                        type="button"
                        disabled={blocked || mutation.isPending}
                        title={blocked ? 'Bước này đã có C ở cột khác' : LETTER_LABEL[l]}
                        onClick={() => (l === 'C' ? setPendingC(true) : setLetter(l))}
                        className={`rounded-lg border py-2 font-mono text-sm font-bold transition-all disabled:cursor-not-allowed disabled:opacity-30 ${LETTER_CHIP[l]} ${
                          active ? 'ring-2 ring-blue-500 ring-offset-1' : 'hover:shadow-sm'
                        }`}
                      >
                        {l}
                      </button>
                    );
                  })}
                </div>

                {tags.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setLetter(null)}
                    disabled={mutation.isPending}
                    className="w-full rounded-lg border border-slate-200 py-1.5 text-[11px] font-bold text-slate-500 hover:border-rose-300 hover:text-rose-600 disabled:opacity-50"
                  >
                    Xóa vai trò khỏi ô này
                  </button>
                )}
              </>
            ) : (
              <div className="space-y-2">
                <label className="block text-[10px] font-bold uppercase text-purple-700">
                  C — chọn bước quay về khi từ chối:
                </label>
                <select
                  value={rollbackStepId}
                  onChange={(e) => setRollbackStepId(e.target.value)}
                  className="w-full rounded-lg border border-purple-200 bg-purple-50 px-2 py-1.5 text-xs font-bold text-purple-900"
                >
                  <option value="">-- Chọn bước --</option>
                  {(rollbackTargets ?? []).map((s) => (
                    <option key={s.id} value={s.id}>
                      [{s.stepCode}] {s.stepName}
                    </option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPendingC(false)}
                    className="flex-1 rounded-lg border border-slate-200 py-1.5 text-[11px] font-bold text-slate-500 hover:bg-slate-50"
                  >
                    Quay lại
                  </button>
                  <button
                    type="button"
                    disabled={!rollbackStepId || mutation.isPending}
                    onClick={() => setLetter('C', rollbackStepId)}
                    className="flex-1 rounded-lg bg-purple-600 py-1.5 text-[11px] font-bold text-white hover:bg-purple-700 disabled:opacity-50"
                  >
                    {mutation.isPending ? 'Đang lưu…' : 'Gán C'}
                  </button>
                </div>
              </div>
            )}

            {mutation.isError && (
              <p className="text-[10px] font-semibold text-rose-600">
                {(mutation.error as any)?.response?.data?.message ?? 'Có lỗi khi lưu.'}
              </p>
            )}
          </div>
        </>
      )}
    </td>
  );
};

// --- Gắn Luồng Thực thi con vào một bước ---

interface SubFlowLinkProps {
  workflowId: string;
  workflowKind: WorkflowKind;
  step: ApiWorkflowStep;
  /** Process workflows may only link on their final, Role-A step. */
  isLastStep: boolean;
  hasRoleA: boolean;
}

const PANEL_WIDTH = 256;
const PANEL_MAX_HEIGHT = 260;

const SubFlowLink: React.FC<SubFlowLinkProps> = ({
  workflowId,
  workflowKind,
  step,
  isLastStep,
  hasRoleA,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Shared with the RSACIE cell editor: escapes the table's overflow clipping
  // AND re-measures on scroll, so the panel tracks its button when the matrix
  // is scrolled horizontally.
  const { anchorRef, position: pos } = useFixedPopover<HTMLButtonElement>(isOpen, PANEL_MAX_HEIGHT);

  useLayoutEffect(() => {
    if (!isOpen) setError(null);
  }, [isOpen]);

  const { data: allWorkflows = [] } = useWorkflows();
  const updateStep = useUpdateWorkflowStep(workflowId);

  // A sub-flow is always an Execution Flow; a process can never be one.
  const options = allWorkflows.filter((w) => w.kind !== 'process' && w.id !== workflowId);
  const linked = allWorkflows.find((w) => w.id === step.linkedSubFlowId);

  const isProcess = workflowKind === 'process';
  const allowed = isProcess ? isLastStep && hasRoleA : true;

  const blockedReason = !allowed
    ? isProcess && !isLastStep
      ? 'Với Quy trình, chỉ bước cuối cùng mới gắn được Luồng Thực thi.'
      : 'Bước cuối phải giữ vai trò A (Phê duyệt) trước khi gắn Luồng Thực thi.'
    : null;

  const apply = async (linkedSubFlowId: string | null) => {
    setError(null);
    try {
      await updateStep.mutateAsync({ stepId: step.id, linkedSubFlowId });
      setIsOpen(false);
    } catch (err) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Không lưu được liên kết.',
      );
    }
  };

  if (!allowed && !linked) {
    return (
      <span
        title={blockedReason ?? undefined}
        className="shrink-0 cursor-help text-[10px] font-medium text-slate-300"
      >
        —
      </span>
    );
  }

  return (
    <>
      {isOpen && <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />}
      <span className="shrink-0">
        <button
          ref={anchorRef}
          type="button"
          onClick={() => setIsOpen((v) => !v)}
          title={
            linked
              ? `Khi bước này hoàn tất sẽ mở luồng "${linked.code} — ${linked.name}"`
              : 'Gắn một Luồng Thực thi con vào bước này'
          }
          className={`flex items-center gap-1 rounded-lg border px-1.5 py-0.5 text-[10px] font-bold transition-colors ${
            linked
              ? 'border-purple-300 bg-purple-50 text-purple-700 hover:border-purple-500'
              : 'border-dashed border-slate-300 bg-white text-slate-400 hover:border-blue-400 hover:text-blue-600'
          }`}
        >
          <span className="material-symbols-outlined text-[13px] leading-none">
            {linked ? 'link' : 'add_link'}
          </span>
          {linked ? linked.code : 'Luồng con'}
        </button>

        {isOpen && pos && (
          <div
            style={{
              top: pos.top,
              left: clampLeft(pos.left, PANEL_WIDTH),
              width: PANEL_WIDTH,
              maxHeight: PANEL_MAX_HEIGHT,
              transform: pos.flippedUp ? 'translateY(-100%)' : undefined,
            }}
            className="fixed z-50 flex flex-col gap-1.5 overflow-y-auto rounded-xl border border-purple-200 bg-white p-2.5 text-left shadow-2xl"
          >
            <p className="text-[10px] font-semibold leading-snug text-slate-500">
              {isProcess
                ? 'Quy trình được duyệt xong → tự mở một Lệnh Thực thi từ luồng này.'
                : 'Bước này hoàn tất → tự mở một luồng con từ luồng này.'}
            </p>
            {error && (
              <p className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-[10px] font-semibold text-rose-700">
                {error}
              </p>
            )}
            <div className="space-y-1">
              {options.length === 0 && (
                <p className="py-2 text-center text-[10px] text-slate-400">
                  Chưa có Luồng Thực thi nào ở Bảng 2.
                </p>
              )}
              {options.map((wf) => (
                <button
                  key={wf.id}
                  onClick={() => apply(wf.id)}
                  disabled={updateStep.isPending}
                  className={`flex w-full items-center gap-1.5 rounded-lg border px-2 py-1.5 text-left text-[11px] font-semibold transition-colors disabled:opacity-50 ${
                    wf.id === step.linkedSubFlowId
                      ? 'border-purple-400 bg-purple-50 text-purple-800'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-purple-300'
                  }`}
                >
                  <span className="rounded bg-slate-100 px-1 font-mono text-[9px]">{wf.code}</span>
                  <span className="truncate">{wf.name}</span>
                </button>
              ))}
            </div>
            {linked && (
              <button
                onClick={() => apply(null)}
                disabled={updateStep.isPending}
                className="w-full rounded-lg border border-slate-200 py-1 text-[10px] font-bold text-slate-500 hover:border-rose-300 hover:text-rose-600 disabled:opacity-50"
              >
                Gỡ liên kết
              </button>
            )}
          </div>
        )}
      </span>
    </>
  );
};

// --- One workflow: summary row + step rows ---

interface WorkflowRowsProps {
  workflow: ApiWorkflow;
  /** Full header tree — needed to know which column hosts a group-level tag. */
  tree: ColumnNode[];
  columns: ColumnNode[];
  unitById: Map<string, ApiOrgUnitTreeNode>;
  isExpanded: boolean;
  onToggle: () => void;
  isProcess: boolean;
}

const WorkflowRows: React.FC<WorkflowRowsProps> = ({
  workflow,
  tree,
  columns,
  unitById,
  isExpanded,
  onToggle,
  isProcess,
}) => {
  const { data: detail } = useWorkflow(workflow.id);
  const addStep = useAddWorkflowStep(workflow.id);
  const [newStepName, setNewStepName] = useState('');
  const [adding, setAdding] = useState(false);

  const steps = [...(detail?.steps ?? [])].sort((a, b) => a.stepOrder - b.stepOrder);
  const allAssignments = steps.flatMap((s) => s.raciAssignments ?? []);

  // Computed once per render, not once per cell — this walks the whole column
  // tree, so calling it inside the column loop would be quadratic.
  const allInherited = useMemo(() => inheritedByLeaf(tree, allAssignments), [tree, allAssignments]);
  const inheritedByStep = useMemo(
    () => new Map(steps.map((s) => [s.id, inheritedByLeaf(tree, s.raciAssignments ?? [])])),
    [tree, steps],
  );

  const handleAddStep = async () => {
    if (!newStepName.trim()) return;
    const nextOrder = (steps[steps.length - 1]?.stepOrder ?? 0) + 1;
    await addStep.mutateAsync({
      stepOrder: nextOrder,
      stepCode: String(nextOrder),
      stepName: newStepName.trim(),
    });
    setNewStepName('');
    setAdding(false);
  };

  return (
    <>
      {/* Workflow summary row — aggregates every step's letters per column */}
      <tr className="border-b border-slate-200 bg-slate-50/80">
        <td className="sticky left-0 z-10 border-r border-slate-200 bg-slate-50/95 px-4 py-3">
          <div className="flex items-center gap-2">
            <button onClick={onToggle} className="text-slate-500 hover:text-blue-600">
              <span className="material-symbols-outlined text-lg leading-none">
                {isExpanded ? 'expand_more' : 'chevron_right'}
              </span>
            </button>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="rounded bg-slate-200/80 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-700">
                  {workflow.code}
                </span>
                <span className="truncate text-sm font-bold text-slate-900">{workflow.name}</span>
              </div>
              <div className="mt-0.5 flex items-center gap-2">
                <span className="text-[11px] font-medium text-slate-500">{steps.length} bước</span>
                {isProcess ? (
                  <span className="rounded-full border border-blue-200 bg-blue-50 px-1.5 text-[9px] font-bold text-blue-700">
                    S = Toàn bộ phòng ban
                  </span>
                ) : (
                  <span
                    className={`rounded-full border px-1.5 text-[9px] font-bold ${
                      workflow.kind === 'maintenance_linked'
                        ? 'border-purple-200 bg-purple-50 text-purple-700'
                        : 'border-amber-200 bg-amber-50 text-amber-800'
                    }`}
                  >
                    {workflow.kind === 'maintenance_linked' ? '🔗 Liên kết' : '⚡ Trực tiếp'}
                  </span>
                )}
              </div>
            </div>
            {isExpanded && (
              <button
                onClick={() => setAdding((v) => !v)}
                className="flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-bold text-slate-600 shadow-2xs hover:border-blue-400 hover:text-blue-700"
              >
                <span className="material-symbols-outlined text-sm leading-none">add</span> Bước
              </button>
            )}
          </div>
        </td>

        {columns.map((col) => {
          // Workflow summary = every step's roles for this column, merged.
          const tags = [
            ...cellAssignments(col, allAssignments),
            ...deeperAssignments(col, allAssignments, unitById),
            ...(allInherited.get(col.key) ?? []).map((i) => i.assignment),
          ];
          return (
            <td key={col.key} className="border-r border-slate-100 px-2 py-2.5 align-middle">
              {tags.length ? (
                <LetterButton
                  letters={joinLetters(tags)}
                  tone="bg-blue-50/70 text-blue-800 border-blue-200"
                  title="Tổng hợp vai trò của tất cả các bước trong quy trình này"
                />
              ) : (
                <div className="flex min-h-[34px] items-center justify-center text-sm text-slate-300">-</div>
              )}
            </td>
          );
        })}
      </tr>

      {isExpanded && adding && (
        <tr className="border-b border-blue-200 bg-blue-50/40">
          <td colSpan={columns.length + 1} className="px-4 py-2.5">
            <div className="flex items-center gap-2">
              <input
                autoFocus
                value={newStepName}
                onChange={(e) => setNewStepName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddStep()}
                placeholder="Tên bước mới…"
                className="max-w-md flex-1 rounded-lg border border-blue-300 bg-white px-3 py-1.5 text-xs focus:border-blue-600 focus:outline-none"
              />
              <button
                onClick={handleAddStep}
                className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700"
              >
                Lưu bước
              </button>
              <button
                onClick={() => setAdding(false)}
                className="px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-700"
              >
                Hủy
              </button>
            </div>
          </td>
        </tr>
      )}

      {isExpanded &&
        steps.map((step) => {
          const stepTags = step.raciAssignments ?? [];
          const cCount = stepTags.filter((a) => a.roleLetter === 'C').length;
          const idx = steps.findIndex((s) => s.id === step.id);
          const hasE = stepTags.some((a) => a.roleLetter === 'E');
          const laterC = steps
            .slice(idx + 1)
            .some((s) => (s.raciAssignments ?? []).some((a) => a.roleLetter === 'C'));
          const eWithoutC = hasE && !laterC;

          return (
            <tr
              key={step.id}
              className={`border-b border-slate-100 ${
                cCount > 1 ? 'bg-rose-50/40' : eWithoutC ? 'bg-amber-50/30' : 'bg-white hover:bg-slate-50/70'
              }`}
            >
              <td className="sticky left-0 z-10 border-r border-slate-200 bg-inherit px-4 py-2.5">
                <div className="flex items-center gap-2 pl-6">
                  <span className="truncate text-xs font-semibold text-slate-800">
                    {step.stepCode}-{step.stepName}
                  </span>
                  {/* The neutral icon is gone; a warning still needs to be
                      visible, so it is shown only when there actually is one. */}
                  {(cCount > 1 || eWithoutC) && (
                    <span
                      title={
                        cCount > 1
                          ? 'Bước này có nhiều hơn 1 người duyệt (C)'
                          : 'Có vai trò Thực thi (E) nhưng không có bước Kiểm tra (C) phía sau'
                      }
                      className={`shrink-0 cursor-help rounded px-1 text-[9px] font-bold ${
                        cCount > 1
                          ? 'bg-rose-100 text-rose-700'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {cCount > 1 ? 'Lỗi' : 'Cảnh báo'}
                    </span>
                  )}
                  <span className="flex-1" />
                  <SubFlowLink
                    workflowId={workflow.id}
                    workflowKind={workflow.kind}
                    step={step}
                    isLastStep={idx === steps.length - 1}
                    hasRoleA={stepTags.some((a) => a.roleLetter === 'A')}
                  />
                </div>
              </td>

              {columns.map((col) => {
                const tags = cellAssignments(col, stepTags);
                const deeper = deeperAssignments(col, stepTags, unitById);
                const stepInherited = inheritedByStep.get(step.id)?.get(col.key) ?? [];
                return (
                  <StepCell
                    key={col.key}
                    workflowId={workflow.id}
                    step={step}
                    column={col}
                    tags={tags}
                    deeper={deeper}
                    inherited={stepInherited}
                    // Any C outside this exact cell blocks a new one — the
                    // "max 1 C per step" rule is global, so a C sitting in a
                    // deeper column counts too.
                    hasCElsewhere={stepTags.some(
                      (a) => a.roleLetter === 'C' && !tags.some((t) => t.id === a.id),
                    )}
                  />
                );
              })}
            </tr>
          );
        })}
    </>
  );
};

// --- One table (per workflow kind) ---

interface MatrixTableProps {
  title: string;
  subtitle: string;
  isProcess: boolean;
  workflows: ApiWorkflow[];
  tree: ColumnNode[];
  unitById: Map<string, ApiOrgUnitTreeNode>;
  onToggleColumn: (key: string) => void;
  onCreateWorkflow: (dto: { code: string; name: string; kind: WorkflowKind }) => void;
  createKindOptions: WorkflowKind[];
}

const MatrixTable: React.FC<MatrixTableProps> = ({
  title,
  subtitle,
  isProcess,
  workflows,
  tree,
  unitById,
  onToggleColumn,
  onCreateWorkflow,
  createKindOptions,
}) => {
  const [expandedWorkflows, setExpandedWorkflows] = useState<Set<string>>(new Set());
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newKind, setNewKind] = useState<WorkflowKind>(createKindOptions[0]);

  const depth = Math.max(treeDepth(tree), 1);
  const rows = headerRows(tree, depth);
  const columns = leafColumns(tree);

  const toggleWorkflow = (id: string) =>
    setExpandedWorkflows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const handleCreate = () => {
    if (!newCode.trim() || !newName.trim()) return;
    onCreateWorkflow({ code: newCode.trim(), name: newName.trim(), kind: newKind });
    setNewCode('');
    setNewName('');
  };

  return (
    <div className="mb-10 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-6 py-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className={`h-2.5 w-2.5 rounded-full ${isProcess ? 'bg-blue-600' : 'bg-amber-500'}`} />
            <h3 className="text-base font-bold tracking-tight text-slate-800">{title}</h3>
            <span className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600">
              {workflows.length} quy trình
            </span>
          </div>
          <p className="mt-1 text-xs font-medium text-slate-500">{subtitle}</p>
        </div>
      </div>

      <div className="custom-scrollbar overflow-x-auto">
        <table className="w-full border-collapse text-slate-700">
          <thead>
            {rows.map((cells, rowIdx) => (
              <tr key={rowIdx} className="bg-slate-50">
                {rowIdx === 0 && (
                  <th
                    rowSpan={depth}
                    className="sticky left-0 z-20 w-80 min-w-80 border-b border-r border-slate-200 bg-slate-50 px-4 py-3 text-left text-xs font-bold text-slate-700"
                  >
                    Danh mục Quy trình &amp; Các bước
                  </th>
                )}
                {cells.map(({ node, colSpan, rowSpan }) => (
                  <th
                    key={node.key}
                    colSpan={colSpan}
                    rowSpan={rowSpan}
                    className={`min-w-28 border-b border-r border-slate-200 px-2 py-2 text-center align-middle text-xs font-bold ${
                      node.children.length
                        ? 'bg-slate-100/80 text-slate-800'
                        : node.kind === 'position'
                          ? 'text-indigo-700'
                          : node.kind === 'user'
                            ? 'text-teal-700'
                            : 'text-slate-700'
                    }`}
                    title={node.subtitle ? `${node.title} — ${node.subtitle}` : node.title}
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span className="material-symbols-outlined text-[12px] opacity-50">
                        {KIND_ICON[node.kind]}
                      </span>
                      <span className="truncate">{node.title}</span>
                      {node.toggleKey && (
                        <button
                          type="button"
                          onClick={() => onToggleColumn(node.toggleKey!)}
                          title={node.expanded ? 'Thu gọn' : 'Sổ ngang xuống cấp dưới'}
                          className="flex h-4 w-4 shrink-0 items-center justify-center rounded border border-slate-300 bg-white text-slate-500 transition-colors hover:border-blue-500 hover:text-blue-600"
                        >
                          <span className="material-symbols-outlined text-[11px] leading-none">
                            {node.expanded ? 'remove' : 'add'}
                          </span>
                        </button>
                      )}
                    </div>
                  </th>
                ))}
                {cells.length === 0 && rowIdx === 0 && (
                  <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-medium italic text-slate-400">
                    Chưa có đơn vị nào trong Sơ đồ Tổ chức.
                  </th>
                )}
              </tr>
            ))}
          </thead>

          <tbody>
            {workflows.map((wf) => (
              <WorkflowRows
                key={wf.id}
                workflow={wf}
                tree={tree}
                columns={columns}
                unitById={unitById}
                isProcess={isProcess}
                isExpanded={expandedWorkflows.has(wf.id)}
                onToggle={() => toggleWorkflow(wf.id)}
              />
            ))}
            {workflows.length === 0 && (
              <tr>
                <td colSpan={columns.length + 1} className="px-6 py-6 text-center text-xs text-slate-400">
                  Chưa có quy trình nào.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-slate-200 bg-slate-50 p-4">
        <input
          value={newCode}
          onChange={(e) => setNewCode(e.target.value)}
          placeholder="Mã (VD: WF-CAPEX)"
          className="w-40 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium focus:border-blue-600 focus:outline-none"
        />
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          placeholder={`Thêm quy trình mới vào ${title}…`}
          className="max-w-md flex-1 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium focus:border-blue-600 focus:outline-none"
        />
        {createKindOptions.length > 1 && (
          <select
            value={newKind}
            onChange={(e) => setNewKind(e.target.value as WorkflowKind)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium"
          >
            {createKindOptions.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        )}
        <button
          onClick={handleCreate}
          className="flex items-center gap-1 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs transition-colors hover:bg-blue-700"
        >
          <span className="material-symbols-outlined text-sm">add</span> Thêm Quy Trình
        </button>
      </div>
    </div>
  );
};

// --- Top-level ---

function allUnitIds(nodes: ApiOrgUnitTreeNode[]): string[] {
  const ids: string[] = [];
  const walk = (n: ApiOrgUnitTreeNode) => {
    ids.push(n.id);
    (n.children ?? []).forEach(walk);
  };
  nodes.forEach(walk);
  return ids;
}

export const RsacieMatrixView: React.FC<RsacieMatrixViewProps> = ({ onMenuToggle }) => {
  const [activeTab, setActiveTab] = useState<'process' | 'maintenance' | 'both'>('both');
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());

  const { data: treeRoots } = useOrgUnitTree();
  const { data: processWorkflows } = useWorkflows('process');
  const { data: maintLinked } = useWorkflows('maintenance_linked');
  const { data: maintDirect } = useWorkflows('maintenance_direct');
  const createWorkflow = useCreateWorkflow();

  const roots = treeRoots ?? [];
  const unitIds = allUnitIds(roots);
  const memberQueries = useManyOrgUnitMembers(unitIds);

  const membersByUnit = new Map<string, ApiOrgUnitMember[]>();
  unitIds.forEach((id, i) => {
    const data = memberQueries[i]?.data;
    if (data) membersByUnit.set(id, data);
  });

  const tree = buildColumnTree({ roots, expandedKeys, membersByUnit });
  const unitById = indexUnits(roots);
  const maintenanceWorkflows = [...(maintLinked ?? []), ...(maintDirect ?? [])];

  const toggleColumn = (key: string) =>
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const expandAll = () => {
    const keys = new Set<string>();
    for (const id of unitIds) {
      keys.add(id);
      for (const m of membersByUnit.get(id) ?? []) keys.add(`${id}::pos::${m.positionId}`);
    }
    setExpandedKeys(keys);
  };

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col bg-slate-50">
      <header className="fixed left-0 right-0 top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 shadow-xs md:left-64 md:px-8">
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuToggle}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 md:hidden"
          >
            <span className="material-symbols-outlined">menu</span>
          </button>
          <h2 className="text-base font-bold tracking-tight text-slate-800 md:text-lg">Ma trận RSACIE</h2>
          <div className="mx-1 hidden h-4 w-[1px] bg-slate-200 sm:block" />
          <span className="hidden rounded-md border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-700 xs:inline-block">
            Đơn vị → Chức vụ → Cá nhân · gán cho đơn vị = việc của Trưởng đơn vị
          </span>
        </div>
      </header>

      <main className="flex h-screen flex-col overflow-hidden pt-16">
        <div className="custom-scrollbar flex h-14 w-full shrink-0 items-center justify-between gap-4 overflow-x-auto border-b border-slate-200 bg-white px-4 md:px-8">
          <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1">
            {(
              [
                ['process', '1. Tạo quy trình', 'bg-blue-600'],
                ['maintenance', '2. Luồng bảo trì', 'bg-amber-500'],
                ['both', 'Xem Cả 2 Bảng', ''],
              ] as const
            ).map(([key, label, dot]) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                  activeTab === key ? 'bg-white text-slate-800 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {dot ? (
                  <span className={`h-2 w-2 rounded-full ${dot}`} />
                ) : (
                  <span className="material-symbols-outlined text-sm">view_agenda</span>
                )}
                {label}
              </button>
            ))}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={expandAll}
              title="Sổ toàn bộ cây xuống cấp cá nhân"
              className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-600 transition-colors hover:border-blue-400 hover:text-blue-700"
            >
              <span className="material-symbols-outlined text-sm">unfold_more</span> Sổ tất cả
            </button>
            <button
              onClick={() => setExpandedKeys(new Set())}
              title="Thu gọn về cấp đơn vị gốc"
              className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-600 transition-colors hover:border-blue-400 hover:text-blue-700"
            >
              <span className="material-symbols-outlined text-sm">unfold_less</span> Thu gọn
            </button>
          </div>
        </div>

        {roots.length === 0 && (
          <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-800 md:px-8">
            Chưa có đơn vị nào trong Sơ đồ Tổ chức — hãy tạo trước ở mục Sơ đồ Tổ chức.
          </div>
        )}

        <div className="custom-scrollbar relative flex-grow overflow-auto p-4 md:p-8">
          {(activeTab === 'process' || activeTab === 'both') && (
            <MatrixTable
              title="Bảng 1: Tạo Quy Trình"
              subtitle="Quy trình lập kế hoạch & thẩm định."
              isProcess
              workflows={processWorkflows ?? []}
              tree={tree}
              unitById={unitById}
              onToggleColumn={toggleColumn}
              createKindOptions={['process']}
              onCreateWorkflow={(dto) => createWorkflow.mutate(dto)}
            />
          )}

          {(activeTab === 'maintenance' || activeTab === 'both') && (
            <MatrixTable
              title="Bảng 2: Luồng Thực Thi Bảo Trì"
              subtitle="Luồng tác nghiệp & khắc phục sự cố (bao gồm vai trò Thực thi - E)."
              isProcess={false}
              workflows={maintenanceWorkflows}
              tree={tree}
              unitById={unitById}
              onToggleColumn={toggleColumn}
              createKindOptions={['maintenance_linked', 'maintenance_direct']}
              onCreateWorkflow={(dto) => createWorkflow.mutate(dto)}
            />
          )}
        </div>
      </main>
    </div>
  );
};
