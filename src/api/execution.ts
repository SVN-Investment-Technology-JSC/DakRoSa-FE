import { apiClient } from './client';
import { ApiUserRef, ApiTaskInstance } from './tasks';
import type { EquipmentTaskItem } from './maintenance';

export interface ApiExecutionAttachment {
  id: string;
  subtaskId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedByUserId: string;
  createdAt: string;
}

/** Một công việc con `E(x)` do người giữ Node E phân rã. */
export interface ApiExecutionSubtask {
  id: string;
  taskStepInstanceId: string;
  assigneeUserId: string;
  assignee?: ApiUserRef;
  title: string;
  /** Trọng số % — tổng của cả bước luôn đúng 100. */
  weight: number;
  status: 'Pending' | 'Submitted';
  note?: string | null;
  submittedAt?: string | null;
  attachments?: ApiExecutionAttachment[];
  createdAt: string;
}

const base = (taskId: string, stepId: string) => `/tasks/${taskId}/steps/${stepId}/subtasks`;

export interface ApiBreakdownCandidate {
  id: string;
  fullName: string;
  email: string;
  positionName?: string;
  orgUnitTitle?: string;
}

/**
 * Ai được nhận `E(x)`. Rộng hơn danh sách uỷ quyền: gồm cả nhân sự trong chính
 * đơn vị mình, không chỉ đơn vị con.
 */
export function getBreakdownCandidates(
  taskId: string,
  stepId: string,
): Promise<ApiBreakdownCandidate[]> {
  return apiClient.get(`${base(taskId, stepId)}/candidates`).then((r) => r.data);
}

export function getSubtasks(taskId: string, stepId: string): Promise<ApiExecutionSubtask[]> {
  return apiClient.get(base(taskId, stepId)).then((r) => r.data);
}

/**
 * BRD 3 US 3.1 AC3 — các đầu việc bước E này phải giao, theo nguồn đã chốt lúc
 * thiết kế luồng. Chỉ là gợi ý: gắn người cho từng việc vẫn là việc của người
 * giữ Node E, nên phân rã vẫn đi qua `replaceSubtasks`.
 */
export function getSuggestedTasks(
  taskId: string,
  stepId: string,
): Promise<{
  source: 'device_default' | 'task_list' | 'manual';
  tasks: EquipmentTaskItem[];
  deviceName?: string | null;
  unavailableReason?: string;
}> {
  return apiClient.get(`${base(taskId, stepId)}/suggested`).then((r) => r.data);
}

/** Thay toàn bộ danh sách — luôn gửi đủ những gì muốn giữ lại. */
export function replaceSubtasks(
  taskId: string,
  stepId: string,
  subtasks: Array<{ assigneeUserId: string; title: string; weight?: number }>,
): Promise<ApiExecutionSubtask[]> {
  return apiClient.put(base(taskId, stepId), { subtasks }).then((r) => r.data);
}

export function uploadAttachment(
  taskId: string,
  stepId: string,
  subtaskId: string,
  file: File,
): Promise<ApiExecutionAttachment> {
  const form = new FormData();
  form.append('file', file);
  return apiClient
    .post(`${base(taskId, stepId)}/${subtaskId}/attachments`, form)
    .then((r) => r.data);
}

export function getAttachmentUrl(
  taskId: string,
  stepId: string,
  subtaskId: string,
  attachmentId: string,
): Promise<{ url: string }> {
  return apiClient
    .get(`${base(taskId, stepId)}/${subtaskId}/attachments/${attachmentId}/url`)
    .then((r) => r.data);
}

export function submitSubtask(
  taskId: string,
  stepId: string,
  subtaskId: string,
  note?: string,
): Promise<ApiTaskInstance> {
  return apiClient.post(`${base(taskId, stepId)}/${subtaskId}/submit`, { note }).then((r) => r.data);
}
