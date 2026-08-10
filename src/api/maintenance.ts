import { apiClient } from './client';
import { ApiOrgUnit } from './orgUnits';
import { ApiTaskInstance } from './tasks';

export type MaintenanceFrequency = 'day' | 'week' | 'month' | 'quarter' | 'year';
export type TicketStatus = 'CRITICAL' | 'WARNING' | 'ROUTINE';
export type TicketPriority = 'High' | 'Normal' | 'Low';

/** BRD 3 Epic 1 — 4 cấp của cây cấu trúc tài sản. */
export type AssetKind = 'company' | 'factory' | 'main_equipment' | 'part';
export type AssetCondition = 'operating' | 'broken' | 'standby' | 'other';

export const ASSET_KIND_LABEL: Record<AssetKind, string> = {
  company: 'Công ty',
  factory: 'Nhà máy / Hạ tầng',
  main_equipment: 'Phân hệ thiết bị chính',
  part: 'Bộ phận / Chi tiết',
};

export const ASSET_KIND_ICON: Record<AssetKind, string> = {
  company: 'apartment',
  factory: 'factory',
  main_equipment: 'precision_manufacturing',
  part: 'settings',
};

export const ASSET_CONDITION_LABEL: Record<AssetCondition, string> = {
  operating: 'Đang vận hành',
  broken: 'Hỏng',
  standby: 'Dự phòng',
  other: 'Khác',
};

/** Loại con hợp lệ dưới một node — khớp `isValidChildKind` phía backend. */
export function validChildKinds(parent: AssetKind | null): AssetKind[] {
  if (parent === null) return ['company'];
  if (parent === 'company') return ['factory'];
  if (parent === 'factory') return ['main_equipment'];
  return ['part']; // main_equipment và part đều chỉ nhận part
}

/** Một dòng của "Danh sách nhiệm vụ" khai theo thiết bị (BRD 3 US 2.1 AC2). */
export interface EquipmentTaskItem {
  title: string;
  durationMinutes: number;
  note?: string;
}

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
  /** Rỗng = node đứng ở gốc cây. */
  parentId?: string | null;
  assetKind: AssetKind;
  /** Chỉ có trong `GET /maintenance-parts/tree`; danh sách phẳng không kèm. */
  children?: ApiMaintenancePart[];
  /** Rỗng với node Công ty / Nhà máy — đơn vị được kế thừa từ cấp trên. */
  orgUnitId?: string | null;
  orgUnit?: ApiOrgUnit | null;
  description?: string | null;
  symbol?: string | null;
  condition?: AssetCondition | null;
  location?: string | null;
  specifications?: string | null;
  manufacturer?: string | null;
  /** Rỗng = thiết bị chưa khai "Danh sách nhiệm vụ". */
  taskTemplate?: EquipmentTaskItem[] | null;
  isActive: boolean;
  schedules: ApiMaintenanceSchedule[];
  updatedAt?: string;
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

/** BRD 3 Epic 1 — cây cấu trúc tài sản, lồng sẵn qua `children`. */
export function getMaintenancePartsTree(): Promise<ApiMaintenancePart[]> {
  return apiClient.get('/maintenance-parts/tree').then((r) => r.data);
}

export interface AssetDetailsInput {
  description?: string;
  symbol?: string;
  condition?: AssetCondition;
  location?: string;
  specifications?: string;
  manufacturer?: string;
}

export function createMaintenancePart(
  dto: {
    code: string;
    name: string;
    orgUnitId?: string;
    parentId?: string;
    assetKind?: AssetKind;
  } & AssetDetailsInput,
): Promise<ApiMaintenancePart> {
  return apiClient.post('/maintenance-parts', dto).then((r) => r.data);
}

export function updateMaintenancePart(
  id: string,
  dto: { name?: string; orgUnitId?: string; isActive?: boolean } & AssetDetailsInput,
): Promise<ApiMaintenancePart> {
  return apiClient.patch(`/maintenance-parts/${id}`, dto).then((r) => r.data);
}

/** Xoá cả nhánh bên dưới. Backend chặn nếu nhánh còn phiếu bảo trì. */
export function deleteMaintenancePart(id: string): Promise<{ deleted: number }> {
  return apiClient.delete(`/maintenance-parts/${id}`).then((r) => r.data);
}

/**
 * BRD 3 US 2.1 AC2 — lưu "Danh sách nhiệm vụ" + "Thời gian thực hiện" dạng JSON
 * gắn với thiết bị. Gửi mảng rỗng để gỡ toàn bộ cấu hình.
 */
export function setEquipmentTaskTemplate(
  partId: string,
  tasks: EquipmentTaskItem[],
): Promise<ApiMaintenancePart> {
  return apiClient.put(`/maintenance-parts/${partId}/task-template`, { tasks }).then((r) => r.data);
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
