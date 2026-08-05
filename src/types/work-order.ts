import type { JobPlanStep } from './maintenance';
import type { WorkflowInstance } from './workflow';

export type WorkOrderStatus =
  | 'DRAFT'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CLOSED'
  | 'CANCELLED';

export interface WorkOrder {
  id: string;
  code: string;
  title: string;
  description: string | null;
  type: 'INCIDENT' | 'MAINTENANCE';
  status: WorkOrderStatus;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  equipmentId: string | null;
  siteId: string | null;
  reporterId: string | null;
  assigneeId: string | null;
  startTime: string | null;
  endTime: string | null;
  plannedStartAt: string | null;
  dueAt: string | null;
  progressPercent: number;
  downtimeMinutes: number;
  rootCause: string | null;
  maintenanceScheduleId: string | null;
  maintenanceOccurrenceId: string | null;
  jobPlanVersionId: string | null;
  workflowInstanceId: string | null;
  customFields: Record<string, unknown>;
  attachments: string[] | null;
  equipment?: { id: string; code: string; name: string } | null;
  site?: { id: string; code: string; name: string } | null;
  assignee?: { id: string; displayName: string } | null;
  reporter?: { id: string; displayName: string } | null;
  updates?: WorkOrderUpdate[];
  checklist?: WorkOrderChecklistResult[];
  workflow?: WorkflowInstance | null;
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
  siteId?: string;
  assigneeId?: string;
  technicalReviewerId?: string;
  workflowDefinitionId?: string;
  maintenanceScheduleId?: string;
  maintenanceOccurrenceId?: string;
  jobPlanVersionId?: string;
  plannedStartAt?: string;
  dueAt?: string;
  customFields?: Record<string, unknown>;
}

export interface UpdateWorkOrderDto extends Partial<CreateWorkOrderDto> {
  status?: WorkOrderStatus;
  downtimeMinutes?: number;
  rootCause?: string;
  attachments?: string[];
}

export interface WorkOrderUpdate {
  id: string;
  type: 'PROGRESS' | 'BLOCKER' | 'SUPPORT_REQUEST' | 'RESULT' | 'COMMENT';
  progressPercent: number | null;
  note: string;
  payload: Record<string, unknown>;
  actor?: { id: string; displayName: string };
  createdAt: string;
}

export interface WorkOrderChecklistResult {
  id: string;
  stepId: string;
  status: 'pending' | 'passed' | 'failed' | 'not_applicable';
  value: Record<string, unknown>;
  note: string | null;
  completedAt: string | null;
  step: JobPlanStep;
  completer?: { displayName: string } | null;
}
