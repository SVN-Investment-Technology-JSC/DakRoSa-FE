export interface WorkOrder {
  id: string;
  code: string;
  title: string;
  description: string | null;
  type: 'INCIDENT' | 'MAINTENANCE';
  status: 'DRAFT' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CLOSED';
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  equipmentId: string | null;
  reporterId: string | null;
  assigneeId: string | null;
  startTime: string | null;
  endTime: string | null;
  downtimeMinutes: number;
  rootCause: string | null;
  attachments: string[] | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWorkOrderDto {
  code: string;
  title: string;
  description?: string;
  type: 'INCIDENT' | 'MAINTENANCE';
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  equipmentId?: string;
}

export interface UpdateWorkOrderDto {
  title?: string;
  description?: string;
  type?: 'INCIDENT' | 'MAINTENANCE';
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  status?: 'DRAFT' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CLOSED';
  equipmentId?: string;
  assigneeId?: string;
  downtimeMinutes?: number;
  rootCause?: string;
  attachments?: string[];
}
