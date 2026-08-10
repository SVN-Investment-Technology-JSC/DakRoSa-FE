import { apiClient } from './client';
import { ApiRaciAssignment, ApiWorkflowStep, RoleLetter } from './workflows';

export function getRoleLetterOptions(workflowId: string): Promise<RoleLetter[]> {
  return apiClient.get(`/workflows/${workflowId}/role-letter-options`).then((r) => r.data);
}

export function getValidRollbackTargets(
  workflowId: string,
  stepId: string,
): Promise<ApiWorkflowStep[]> {
  return apiClient
    .get(`/workflows/${workflowId}/steps/${stepId}/valid-rollback-targets`)
    .then((r) => r.data);
}

export interface RaciTagInput {
  roleLetter: RoleLetter;
  fixedRollbackStepId?: string;
}

/** Identifies one matrix cell: an org unit, optionally narrowed to a position or a person. */
export interface RaciCellTarget {
  orgUnitId: string;
  positionId?: string;
  userId?: string;
}

export function replaceCellAssignments(
  workflowId: string,
  stepId: string,
  dto: RaciCellTarget & { tags: RaciTagInput[] },
): Promise<ApiRaciAssignment[]> {
  return apiClient.put(`/workflows/${workflowId}/steps/${stepId}/raci`, dto).then((r) => r.data);
}
