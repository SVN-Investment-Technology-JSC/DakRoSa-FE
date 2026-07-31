import type { AuditLogList } from '@/types/audit';
import { apiRequest } from './api-client';

export const auditService = {
  getLogs: (limit = 50) => apiRequest<AuditLogList>(`/audit-logs?limit=${limit}`),
};
