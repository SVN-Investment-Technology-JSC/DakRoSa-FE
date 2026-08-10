export const TASK_STATUSES = ['Active', 'Pending', 'Completed', 'Rejected'] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

/**
 * `Rework` (BRD 2 US 1.5 AC2): a Node E that was sent back by its Node C. It is
 * an ACTIONABLE state — the Node E owner has the work again — so anywhere that
 * gates on "In Progress" must accept it too. Use `isActionableStepStatus`.
 */
export const TASK_STEP_STATUSES = [
  'Completed',
  'In Progress',
  'Pending',
  'Rejected',
  'Rework',
] as const;
export type TaskStepStatus = (typeof TASK_STEP_STATUSES)[number];

export function isActionableStepStatus(status: TaskStepStatus): boolean {
  return status === 'In Progress' || status === 'Rework';
}

export const TASK_PRIORITIES = ['High', 'Normal', 'Low'] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];
