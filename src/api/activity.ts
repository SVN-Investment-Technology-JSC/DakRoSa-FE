import { apiClient } from './client';
import { ApiUserRef } from './tasks';

/** Một dòng nhật ký thao tác của đơn. */
export interface ApiActivityLog {
  id: string;
  taskId: string;
  stepId?: string | null;
  actorUserId?: string | null;
  /** Null nghĩa là hệ thống tự làm (cron, tự sinh luồng con). */
  actor?: ApiUserRef | null;
  action: string;
  summary: string;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

export function getTaskActivity(taskId: string): Promise<ApiActivityLog[]> {
  return apiClient.get(`/tasks/${taskId}/activity`).then((r) => r.data);
}
