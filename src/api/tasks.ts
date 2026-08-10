import { apiClient } from './client';
import { RoleLetter, WorkflowKind } from './workflows';

export type TaskStatus = 'Active' | 'Pending' | 'Completed' | 'Rejected';
/** `Rework` = a Node E sent back by its Node C. It is actionable, like In Progress. */
export type TaskStepStatus = 'Completed' | 'In Progress' | 'Pending' | 'Rejected' | 'Rework';

export function isActionableStepStatus(status: TaskStepStatus): boolean {
  return status === 'In Progress' || status === 'Rework';
}
export type TaskPriority = 'High' | 'Normal' | 'Low';

export interface ApiUserRef {
  id: string;
  email: string;
  fullName: string;
  avatarInitials?: string;
}

export interface ApiTaskStepAssignee {
  taskStepInstanceId: string;
  userId: string;
  roleLetter: RoleLetter;
  user?: ApiUserRef;
  /** True if this assignee was resolved by escalating up the org tree (empty seat). */
  isEscalated: boolean;
  delegatedFromUserId?: string | null;
  delegatedFromUser?: ApiUserRef | null;
}

export interface ApiTaskStepInstance {
  id: string;
  taskId: string;
  workflowStepId?: string | null;
  stepOrder: number;
  stepName: string;
  roleAssignedSummary?: string | null;
  status: TaskStepStatus;
  progress: number;
  assignees?: ApiTaskStepAssignee[];
  /**
   * BRD 3 US 3.1 — nguồn công việc của Node E, đông cứng lúc tạo đơn.
   * Rỗng = "Thiết lập thủ công".
   */
  eTaskSource?: 'device_default' | 'task_list' | 'manual' | null;
}

export interface ApiTaskInstance {
  id: string;
  workflowId?: string | null;
  workflowKind: WorkflowKind;
  title: string;
  referenceCode?: string | null;
  referenceTitle?: string | null;
  status: TaskStatus;
  dueDate?: string | null;
  initiatorUserId: string;
  initiator?: { id: string; email: string; fullName: string; avatarInitials?: string };
  orgUnitId: string;
  orgUnit?: { id: string; title: string; level: number };
  priority: TaskPriority;
  taskCode: string;
  description?: string | null;
  /**
   * BRD 3 US 2.1 AC2 — chuỗi JSON nhiệm vụ của thiết bị, chép sang lúc Lệnh
   * công việc được tạo. Chỉ có ở Lệnh sinh từ phiếu bảo trì.
   */
  maintenancePartId?: string | null;
  equipmentTaskTemplate?: Array<{ title: string; durationMinutes: number; note?: string }> | null;
  steps?: ApiTaskStepInstance[];
}

export function getTasks(filter?: { status?: TaskStatus; assignedToMe?: boolean }): Promise<ApiTaskInstance[]> {
  return apiClient.get('/tasks', { params: filter }).then((r) => r.data);
}

export function getTask(id: string): Promise<ApiTaskInstance> {
  return apiClient.get(`/tasks/${id}`).then((r) => r.data);
}

export interface CreateTaskDto {
  workflowId: string;
  title: string;
  referenceCode?: string;
  referenceTitle?: string;
  orgUnitId: string;
  priority: TaskPriority;
  dueDate?: string;
  description?: string;
}

export function createTask(dto: CreateTaskDto): Promise<ApiTaskInstance> {
  return apiClient.post('/tasks', dto).then((r) => r.data);
}

export function getValidRollbackTargetsForTask(
  taskId: string,
  stepId: string,
): Promise<ApiTaskStepInstance[]> {
  return apiClient.get(`/tasks/${taskId}/steps/${stepId}/valid-rollback-targets`).then((r) => r.data);
}

export function approveStep(
  taskId: string,
  stepId: string,
  dto: { notes?: string; roleLetter?: RoleLetter },
): Promise<ApiTaskInstance> {
  return apiClient.post(`/tasks/${taskId}/steps/${stepId}/approve`, dto).then((r) => r.data);
}

export function rejectStep(
  taskId: string,
  stepId: string,
  dto: { notes: string; targetStepId?: string; roleLetter?: RoleLetter },
): Promise<ApiTaskInstance> {
  return apiClient.post(`/tasks/${taskId}/steps/${stepId}/reject`, dto).then((r) => r.data);
}

export function getDelegationCandidates(taskId: string, stepId: string): Promise<ApiUserRef[]> {
  return apiClient.get(`/tasks/${taskId}/steps/${stepId}/delegation-candidates`).then((r) => r.data);
}

export function delegateStep(
  taskId: string,
  stepId: string,
  dto: { toUserId: string; roleLetter?: RoleLetter },
): Promise<ApiTaskInstance> {
  return apiClient.post(`/tasks/${taskId}/steps/${stepId}/delegate`, dto).then((r) => r.data);
}
