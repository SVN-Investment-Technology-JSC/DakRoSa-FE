import { apiClient } from './client';
import { ApiRaciAssignment, ApiWorkflowStep, RoleLetter } from './workflows';
import type { EquipmentTaskItem } from './maintenance';

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

/** BRD 3 US 3.1 AC2 — ba tùy chọn nguồn dữ liệu công việc của Role E. */
export type ETaskSource = 'device_default' | 'task_list' | 'manual';

export interface RaciTagInput {
  roleLetter: RoleLetter;
  fixedRollbackStepId?: string;
  /** Chỉ có nghĩa khi `roleLetter === 'E'`. */
  eTaskSource?: ETaskSource;
  /** Bắt buộc khi `eTaskSource === 'task_list'`. */
  eTaskList?: EquipmentTaskItem[];
}

export interface ETaskSourceOption {
  value: ETaskSource;
  label: string;
  /** `device_default` chỉ bật khi có thiết bị gắn luồng này đã khai JSON. */
  enabled: boolean;
  disabledReason?: string;
}

/**
 * BRD 3 US 3.1 AC3 — validation của "Mặc định theo thiết bị".
 *
 * Lúc thiết kế chưa biết Lệnh công việc sẽ thuộc thiết bị nào, nên backend trả
 * về luôn danh sách thiết bị đang trỏ vào luồng này và đã khai JSON nhiệm vụ.
 */
export function getETaskSourceOptions(workflowId: string): Promise<{
  options: ETaskSourceOption[];
  devices: Array<{ id: string; code: string; name: string; taskCount: number }>;
}> {
  return apiClient.get(`/workflows/${workflowId}/e-task-source-options`).then((r) => r.data);
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
