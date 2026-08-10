/**
 * How a task instance came into existence (BRD 2 Rule 1 / US 1.1 / US 2.3).
 *
 *  - manual ............ created by a user through POST /tasks
 *  - auto_from_parent .. spawned automatically when a parent workflow finished
 *                        its final approval (Execution Flow, Flow 1)
 *  - work_order ........ created on demand from a maintenance ticket (Flow 2)
 */
export const TASK_ORIGINS = ['manual', 'auto_from_parent', 'work_order'] as const;
export type TaskOrigin = (typeof TASK_ORIGINS)[number];
