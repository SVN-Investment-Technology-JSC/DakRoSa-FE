import type { Equipment } from './equipment';

export type MaintenanceStepType =
  | 'INSTRUCTION'
  | 'CHECKLIST'
  | 'MEASUREMENT'
  | 'EVIDENCE';
export type MaintenanceTriggerType =
  | 'TIME_RRULE'
  | 'METER_THRESHOLD'
  | 'DOMAIN_EVENT'
  | 'CONDITION';
export type MaintenanceScheduleStatus = 'draft' | 'active' | 'paused' | 'archived';

export interface MaintenancePlan {
  id: string;
  equipmentId: string;
  title: string;
  description: string | null;
  frequencyDays: number | null;
  nextDueDate: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMaintenanceDto {
  equipmentId: string;
  title: string;
  description?: string;
  frequencyDays?: number;
  nextDueDate?: string;
}

export interface UpdateMaintenanceDto extends Partial<CreateMaintenanceDto> {
  isActive?: boolean;
}

export interface JobPlanStep {
  id?: string;
  versionId?: string;
  key: string;
  sortOrder?: number;
  type: MaintenanceStepType;
  title: string;
  description?: string | null;
  isRequired: boolean;
  config: Record<string, unknown>;
}

export interface JobPlanVersion {
  id: string;
  jobPlanId: string;
  versionNumber: number;
  status: 'draft' | 'published' | 'retired';
  estimatedMinutes: number | null;
  requiredSkills: string[];
  customFields: Record<string, unknown>;
  publishedAt: string | null;
  steps?: JobPlanStep[];
}

export interface MaintenanceJobPlan {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  description: string | null;
  category: string | null;
  status: 'draft' | 'published' | 'archived';
  currentVersionId: string | null;
  versions: JobPlanVersion[];
  selectedVersion?: JobPlanVersion & { steps: JobPlanStep[] };
  updatedAt: string;
}

export interface SaveJobPlanInput {
  estimatedMinutes?: number;
  requiredSkills?: string[];
  customFields?: Record<string, unknown>;
  steps: Array<Omit<JobPlanStep, 'id' | 'versionId' | 'sortOrder'>>;
}

export interface CreateJobPlanInput extends SaveJobPlanInput {
  code: string;
  name: string;
  description?: string;
  category?: string;
}

export interface MaintenanceScheduleTarget {
  id?: string;
  scheduleId?: string;
  targetType: 'EQUIPMENT' | 'EQUIPMENT_GROUP';
  targetId: string;
}

export interface MaintenanceTrigger {
  id?: string;
  scheduleId?: string;
  type: MaintenanceTriggerType;
  config: Record<string, unknown>;
  nextDueAt?: string | null;
  lastFiredAt?: string | null;
  isActive: boolean;
}

export interface MaintenanceSchedule {
  id: string;
  tenantId: string;
  siteId: string | null;
  code: string;
  name: string;
  description: string | null;
  jobPlanId: string;
  workflowDefinitionId: string;
  defaultAssigneeId: string | null;
  defaultTechnicalReviewerId: string | null;
  status: MaintenanceScheduleStatus;
  timezone: string;
  startDate: string;
  endDate: string | null;
  reminderMinutes: number[];
  targets: MaintenanceScheduleTarget[];
  triggers: MaintenanceTrigger[];
  jobPlan?: Pick<MaintenanceJobPlan, 'id' | 'code' | 'name' | 'status'>;
  workflowDefinition?: { id: string; key: string; name: string; status: string };
  site?: { id: string; code: string; name: string } | null;
  updatedAt: string;
}

export interface CreateScheduleInput {
  code: string;
  name: string;
  description?: string;
  siteId?: string;
  jobPlanId: string;
  workflowDefinitionId: string;
  defaultAssigneeId?: string;
  defaultTechnicalReviewerId?: string;
  timezone: string;
  startDate: string;
  endDate?: string;
  reminderMinutes?: number[];
  targets: MaintenanceScheduleTarget[];
  triggers: Array<Omit<MaintenanceTrigger, 'id' | 'scheduleId' | 'nextDueAt' | 'lastFiredAt'>>;
}

export interface MaintenanceSchedulePreview {
  timezone: string;
  from: string;
  to: string;
  items: Array<{
    triggerIndex: number;
    triggerType: MaintenanceTriggerType;
    plannedStartAt: string;
    localDateTime: string;
  }>;
  truncated: boolean;
}

export interface MaintenanceOccurrence {
  id: string;
  scheduleId: string;
  equipmentId: string | null;
  plannedStartAt: string;
  dueAt: string | null;
  status: 'planned' | 'generated' | 'completed' | 'cancelled' | 'skipped';
  workOrderId: string | null;
  snapshot: Record<string, unknown>;
  schedule?: Pick<MaintenanceSchedule, 'id' | 'code' | 'name' | 'siteId'>;
  equipment?: Pick<Equipment, 'id' | 'code' | 'name'> | null;
}

export interface EquipmentMeter {
  id: string;
  equipmentId: string;
  code: string;
  name: string;
  unit: string;
  rolloverValue: number | null;
  lastValue: number | null;
  lastReadAt: string | null;
  equipment?: Pick<Equipment, 'id' | 'code' | 'name'>;
}
