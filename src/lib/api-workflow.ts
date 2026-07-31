import { apiRequest } from './api';
import type {
  WorkflowDefinition,
  WorkflowDraftInput,
  WorkflowInstance,
  WorkflowValidation,
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
};
