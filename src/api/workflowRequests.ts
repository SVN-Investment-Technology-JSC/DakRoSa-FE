import { apiClient } from './client';
import { WorkflowKind } from './workflows';
import { ApiTaskInstance } from './tasks';

export type WorkflowRequestStatus = 'Initiated' | 'Triage' | 'In Progress' | 'Completed';
export type WorkflowRequestPriority = 'low' | 'normal' | 'high';

export interface ApiWorkflowRequest {
  id: string;
  workflowKind: WorkflowKind;
  title: string;
  description: string;
  priority: WorkflowRequestPriority;
  status: WorkflowRequestStatus;
  attachedFileName?: string | null;
  submittedByUserId: string;
  submittedBy?: { id: string; email: string; fullName: string };
  resultingTaskId?: string | null;
  resultingTask?: ApiTaskInstance | null;
  createdAt: string;
}

export function getWorkflowRequests(status?: WorkflowRequestStatus): Promise<ApiWorkflowRequest[]> {
  return apiClient.get('/workflow-requests', { params: status ? { status } : {} }).then((r) => r.data);
}

export function getWorkflowRequest(id: string): Promise<ApiWorkflowRequest> {
  return apiClient.get(`/workflow-requests/${id}`).then((r) => r.data);
}

export interface CreateWorkflowRequestDto {
  workflowKind: WorkflowKind;
  title: string;
  description: string;
  priority: WorkflowRequestPriority;
  attachedFileName?: string;
}

export function createWorkflowRequest(dto: CreateWorkflowRequestDto): Promise<ApiWorkflowRequest> {
  return apiClient.post('/workflow-requests', dto).then((r) => r.data);
}

export function triageWorkflowRequest(
  id: string,
  dto: { workflowId: string; orgUnitId: string },
): Promise<ApiWorkflowRequest> {
  return apiClient.post(`/workflow-requests/${id}/triage`, dto).then((r) => r.data);
}
