export interface AuditLog {
  id: string;
  userId: string | null;
  username: string | null;
  action: string;
  resource: string;
  resourceId: string | null;
  status: string;
  ipAddress: string | null;
  details: Record<string, unknown> | null;
  createdAt: string;
}

export interface AuditLogList {
  items: AuditLog[];
  total: number;
}
