import { apiClient } from './client';

export type WorkflowKind = 'process' | 'maintenance_linked' | 'maintenance_direct';
export type RoleLetter = 'R' | 'A' | 'C' | 'S' | 'I' | 'E';

export interface ApiOrgUnitRef {
  id: string;
  title: string;
  level: number;
}

export interface ApiRaciAssignment {
  id: string;
  stepId: string;
  /** The org unit this tag anchors to (any level). Always set. */
  orgUnitId: string;
  orgUnit?: ApiOrgUnitRef;
  /** Set when the tag targets holders of a position within `orgUnitId`. */
  positionId?: string | null;
  position?: { id: string; name: string; rank: number } | null;
  /** Set when the tag targets one exact person. */
  userId?: string | null;
  user?: { id: string; email: string; fullName: string; avatarInitials?: string } | null;
  roleLetter: RoleLetter;
  fixedRollbackStepId?: string | null;
  /** Resolved rollback step (Role C only) — rendered as the C[n] badge. */
  fixedRollbackStep?: { id: string; stepCode: string; stepName: string } | null;
  /**
   * BRD 3 US 3.1 — nguồn dữ liệu công việc, chỉ có nghĩa với tag `E`.
   * Rỗng = "Thiết lập thủ công" (hành vi mặc định có từ trước BRD 3).
   */
  eTaskSource?: 'device_default' | 'task_list' | 'manual' | null;
  eTaskList?: Array<{ title: string; durationMinutes: number; note?: string }> | null;
}

export interface ApiWorkflowStep {
  id: string;
  workflowId: string;
  stepOrder: number;
  stepCode: string;
  stepName: string;
  icon?: string | null;
  linkedSubFlowId?: string | null;
  raciAssignments?: ApiRaciAssignment[];
}

export interface ApiWorkflow {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  kind: WorkflowKind;
  isActive: boolean;
  steps?: ApiWorkflowStep[];
}

export function getWorkflows(kind?: WorkflowKind): Promise<ApiWorkflow[]> {
  return apiClient.get('/workflows', { params: kind ? { kind } : {} }).then((r) => r.data);
}

export function getWorkflow(id: string): Promise<ApiWorkflow> {
  return apiClient.get(`/workflows/${id}`).then((r) => r.data);
}

export function createWorkflow(dto: {
  code: string;
  name: string;
  description?: string;
  kind: WorkflowKind;
}): Promise<ApiWorkflow> {
  return apiClient.post('/workflows', dto).then((r) => r.data);
}

/** Sửa một bước — dùng chủ yếu để gắn/gỡ Luồng Thực thi con. */
export function updateWorkflowStep(
  workflowId: string,
  stepId: string,
  dto: { stepName?: string; icon?: string; linkedSubFlowId?: string | null },
): Promise<ApiWorkflowStep> {
  return apiClient.patch(`/workflows/${workflowId}/steps/${stepId}`, dto).then((r) => r.data);
}

export function addWorkflowStep(
  workflowId: string,
  dto: { stepOrder: number; stepCode: string; stepName: string; icon?: string; linkedSubFlowId?: string },
): Promise<ApiWorkflowStep> {
  return apiClient.post(`/workflows/${workflowId}/steps`, dto).then((r) => r.data);
}
