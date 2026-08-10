import { apiClient } from './client';
import { ApiOrgUnit } from './orgUnits';
import { ApiTaskInstance } from './tasks';

export type MaintenanceFrequency = 'day' | 'week' | 'month' | 'quarter' | 'year';
export type TicketStatus = 'CRITICAL' | 'WARNING' | 'ROUTINE';
export type TicketPriority = 'High' | 'Normal' | 'Low';

/** Một ô của ma trận bảo trì: thiết bị này, tần suất này. */
export interface ApiMaintenanceSchedule {
  id: string;
  partId: string;
  frequency: MaintenanceFrequency;
  /** Ngày neo chu kỳ — lịch tháng neo ngày 15 thì luôn rơi vào ngày 15. */
  anchorDate: string;
  nextDueAt: string;
  workflowId?: string | null;
  isActive: boolean;
}

export interface ApiMaintenancePart {
  id: string;
  code: string;
  name: string;
  orgUnitId: string;
  orgUnit?: ApiOrgUnit;
  description?: string | null;
  isActive: boolean;
  schedules: ApiMaintenanceSchedule[];
}

export interface ApiMaintenanceTicket {
  id: string;
  ticketNumber: string;
  partId: string;
  part?: ApiMaintenancePart;
  scheduleId: string;
  schedule?: ApiMaintenanceSchedule;
  dueDate: string;
  status: TicketStatus;
  priority: TicketPriority;
  note?: string | null;
  resultingTaskId?: string | null;
  createdAt: string;
}

export function getMaintenanceParts(): Promise<ApiMaintenancePart[]> {
  return apiClient.get('/maintenance-parts').then((r) => r.data);
}

export function createMaintenancePart(dto: {
  code: string;
  name: string;
  orgUnitId: string;
  description?: string;
}): Promise<ApiMaintenancePart> {
  return apiClient.post('/maintenance-parts', dto).then((r) => r.data);
}

/** Thay toàn bộ dòng lịch của một thiết bị (gửi đủ danh sách tần suất đang tick). */
export function setMaintenanceSchedules(
  partId: string,
  schedules: Array<{ frequency: MaintenanceFrequency; anchorDate?: string; workflowId?: string }>,
): Promise<ApiMaintenancePart> {
  return apiClient.put(`/maintenance-parts/${partId}/schedules`, { schedules }).then((r) => r.data);
}

export function getMaintenanceTickets(openOnly = false): Promise<ApiMaintenanceTicket[]> {
  return apiClient
    .get('/maintenance-tickets', { params: openOnly ? { open: 'true' } : undefined })
    .then((r) => r.data);
}

export function updateMaintenanceTicket(
  id: string,
  dto: { dueDate?: string; priority?: TicketPriority; note?: string },
): Promise<ApiMaintenanceTicket> {
  return apiClient.patch(`/maintenance-tickets/${id}`, dto).then((r) => r.data);
}

export function createWorkOrder(ticketId: string): Promise<ApiTaskInstance> {
  return apiClient.post(`/maintenance-tickets/${ticketId}/work-order`).then((r) => r.data);
}

export function runMaintenanceSweep(today?: string): Promise<{
  ranFor: string;
  ticketsCreated: number;
  schedulesChecked: number;
}> {
  return apiClient.post('/maintenance/run-sweep', today ? { today } : {}).then((r) => r.data);
}
