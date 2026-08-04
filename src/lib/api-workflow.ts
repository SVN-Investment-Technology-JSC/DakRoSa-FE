import { apiRequest } from './api';
import type {
  WorkflowDefinition,
  WorkflowDraftInput,
  WorkflowInstance,
  WorkflowValidation,
  CMMSWorkflowTemplate,
  WorkflowRoleMapping,
} from '@/types/workflow';

export const workflowApi = {
  getDefinitions: () =>
    apiRequest<WorkflowDefinition[]>('/workflow/definitions'),
  getArchivedDefinitions: () =>
    apiRequest<WorkflowDefinition[]>('/workflow/definitions/archived'),
  getDefinition: (id: string) =>
    apiRequest<WorkflowDefinition>(`/workflow/definitions/${id}`),
  createDefinition: (input: {
    key: string;
    name: string;
    description?: string;
    resourceType?: string;
  }) =>
    apiRequest<WorkflowDefinition>('/workflow/definitions', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  saveDraft: (id: string, input: WorkflowDraftInput) =>
    apiRequest<WorkflowDefinition>(`/workflow/definitions/${id}/draft`, {
      method: 'PUT',
      body: JSON.stringify(input),
    }),
  validate: (id: string) =>
    apiRequest<WorkflowValidation>(`/workflow/definitions/${id}/validate`, {
      method: 'POST',
    }),
  publish: (id: string) =>
    apiRequest<WorkflowDefinition>(`/workflow/definitions/${id}/publish`, {
      method: 'POST',
    }),
  clone: (id: string, input: { key: string; name: string }) =>
    apiRequest<WorkflowDefinition>(`/workflow/definitions/${id}/clone`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  archive: (id: string) =>
    apiRequest<WorkflowDefinition>(`/workflow/definitions/${id}/archive`, {
      method: 'PATCH',
    }),
  restore: (id: string) =>
    apiRequest<WorkflowDefinition>(`/workflow/definitions/${id}/restore`, {
      method: 'PATCH',
    }),
  deletePermanently: (id: string) =>
    apiRequest<{ id: string; deleted: true }>(
      `/workflow/definitions/${id}/permanent`,
      { method: 'DELETE' },
    ),
  getInstance: (id: string) =>
    apiRequest<WorkflowInstance>(`/workflow/instances/${id}`),
  getMyWorkItems: () => apiRequest('/workflow/work-items/mine'),
  getMasterBoard: (id: string) =>
    apiRequest<WorkflowRoleMapping[]>(`/workflow/definitions/${id}/master-board`),
  updateMasterBoard: (id: string, mappings: WorkflowRoleMapping[]) =>
    apiRequest<{ success: boolean }>(`/workflow/definitions/${id}/master-board`, {
      method: 'PUT',
      body: JSON.stringify({ mappings }),
    }),
  getGlobalMasterBoard: () =>
    apiRequest<{ definitions: WorkflowDefinition[]; mappings: WorkflowRoleMapping[] }>(`/workflow/master-board`),
  updateMasterBoardCell: (workflowId: string, variableKey: string, mappedType: string, mappedValue: string) =>
    apiRequest<WorkflowRoleMapping | { success: boolean; deleted: boolean }>(`/workflow/master-board/cell`, {
      method: 'PUT',
      body: JSON.stringify({ workflowId, variableKey, mappedType, mappedValue }),
    }),
};

export async function listWorkflowTemplates(): Promise<CMMSWorkflowTemplate[]> {
  const res = await apiRequest<{ data: CMMSWorkflowTemplate[] }>('/workflow/templates');
  return res.data;
}

export async function getWorkflowPreview(templateId: string): Promise<CMMSWorkflowTemplate> {
  const res = await apiRequest<{ data: CMMSWorkflowTemplate }>(
    `/workflow/templates/${templateId}/preview`,
  );
  return res.data;
}

export async function executeWorkflowStep(params: {
  workOrderId: string;
  stepKey: string;
  action: 'APPROVED' | 'REJECTED';
  note?: string;
  formData?: Record<string, unknown>;
}): Promise<void> {
  await apiRequest('/workflow/execute', { method: 'POST', body: JSON.stringify(params) });
}
