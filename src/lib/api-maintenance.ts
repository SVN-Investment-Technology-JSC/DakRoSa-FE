import { apiRequest } from './api';
import type {
  CreateJobPlanInput,
  CreateMaintenanceDto,
  CreateScheduleInput,
  EquipmentMeter,
  MaintenanceJobPlan,
  MaintenanceOccurrence,
  MaintenancePlan,
  MaintenanceSchedule,
  MaintenanceSchedulePreview,
  SaveJobPlanInput,
  UpdateMaintenanceDto,
} from '@/types/maintenance';

export const maintenanceApi = {
  getAll: () => apiRequest<MaintenancePlan[]>('/maintenance'),
  getById: (id: string) => apiRequest<MaintenancePlan>(`/maintenance/${id}`),
  create: (data: CreateMaintenanceDto) =>
    apiRequest<MaintenancePlan>('/maintenance', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: string, data: UpdateMaintenanceDto) =>
    apiRequest<MaintenancePlan>(`/maintenance/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    apiRequest<{ success: boolean }>(`/maintenance/${id}`, {
      method: 'DELETE',
    }),

  getJobPlans: () => apiRequest<MaintenanceJobPlan[]>('/maintenance/job-plans'),
  getJobPlan: (id: string) =>
    apiRequest<MaintenanceJobPlan>(`/maintenance/job-plans/${id}`),
  createJobPlan: (input: CreateJobPlanInput) =>
    apiRequest<MaintenanceJobPlan>('/maintenance/job-plans', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  saveJobPlan: (id: string, input: SaveJobPlanInput) =>
    apiRequest<MaintenanceJobPlan>(`/maintenance/job-plans/${id}/draft`, {
      method: 'PUT',
      body: JSON.stringify(input),
    }),
  publishJobPlan: (id: string) =>
    apiRequest<MaintenanceJobPlan>(`/maintenance/job-plans/${id}/publish`, {
      method: 'POST',
    }),
  archiveJobPlan: (id: string) =>
    apiRequest<MaintenanceJobPlan>(`/maintenance/job-plans/${id}/archive`, {
      method: 'PATCH',
    }),

  getSchedules: () =>
    apiRequest<MaintenanceSchedule[]>('/maintenance/schedules'),
  getSchedule: (id: string) =>
    apiRequest<MaintenanceSchedule>(`/maintenance/schedules/${id}`),
  createSchedule: (input: CreateScheduleInput) =>
    apiRequest<MaintenanceSchedule>('/maintenance/schedules', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  updateSchedule: (id: string, input: CreateScheduleInput) =>
    apiRequest<MaintenanceSchedule>(`/maintenance/schedules/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    }),
  previewSchedule: (input: {
    timezone: string;
    startDate: string;
    endDate?: string;
    horizonDays?: number;
    triggers: CreateScheduleInput['triggers'];
  }) =>
    apiRequest<MaintenanceSchedulePreview>('/maintenance/schedules/preview', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  activateSchedule: (id: string) =>
    apiRequest<MaintenanceSchedule>(`/maintenance/schedules/${id}/activate`, {
      method: 'POST',
    }),
  pauseSchedule: (id: string) =>
    apiRequest<MaintenanceSchedule>(`/maintenance/schedules/${id}/pause`, {
      method: 'POST',
    }),
  archiveSchedule: (id: string) =>
    apiRequest<MaintenanceSchedule>(`/maintenance/schedules/${id}/archive`, {
      method: 'PATCH',
    }),
  skipOccurrence: (id: string, reason?: string) =>
    apiRequest<MaintenanceOccurrence>(`/maintenance/occurrences/${id}/skip`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),
  getCalendar: (from: string, to: string, filters?: { siteId?: string; equipmentId?: string; status?: string }) => {
    const query = new URLSearchParams({ from, to });
    if (filters?.siteId) query.set('siteId', filters.siteId);
    if (filters?.equipmentId) query.set('equipmentId', filters.equipmentId);
    if (filters?.status) query.set('status', filters.status);
    return apiRequest<MaintenanceOccurrence[]>(`/maintenance/calendar?${query}`);
  },

  getMeters: (equipmentId?: string) =>
    apiRequest<EquipmentMeter[]>(
      `/maintenance/meters${equipmentId ? `?equipmentId=${encodeURIComponent(equipmentId)}` : ''}`,
    ),
  createMeter: (input: {
    equipmentId: string;
    code: string;
    name: string;
    unit: string;
    rolloverValue?: number;
  }) =>
    apiRequest<EquipmentMeter>('/maintenance/meters', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  addMeterReading: (
    id: string,
    input: { value: number; occurredAt: string; source?: string; externalId?: string },
  ) =>
    apiRequest(`/maintenance/meters/${id}/readings`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),
};
