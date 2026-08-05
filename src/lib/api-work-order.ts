import { apiRequest } from './api';
import type {
  CreateWorkOrderDto,
  UpdateWorkOrderDto,
  WorkOrder,
  WorkOrderChecklistResult,
  WorkOrderUpdate,
} from '@/types/work-order';

export const workOrderApi = {
  getAll: () => apiRequest<WorkOrder[]>('/work-orders'),
  getById: (id: string) => apiRequest<WorkOrder>(`/work-orders/${id}`),
  getByEquipment: (equipmentId: string) =>
    apiRequest<WorkOrder[]>(`/work-orders/equipment/${equipmentId}`),
  create: (data: CreateWorkOrderDto) =>
    apiRequest<WorkOrder>('/work-orders', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: string, data: UpdateWorkOrderDto) =>
    apiRequest<WorkOrder>(`/work-orders/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  performAction: (
    id: string,
    data: {
      actionKey: string;
      taskId?: string;
      note?: string;
      payload?: Record<string, unknown>;
      idempotencyKey?: string;
    },
  ) =>
    apiRequest<WorkOrder>(`/work-orders/${id}/actions`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getUpdates: (id: string) =>
    apiRequest<WorkOrderUpdate[]>(`/work-orders/${id}/updates`),
  addUpdate: (
    id: string,
    data: {
      type: WorkOrderUpdate['type'];
      progressPercent?: number;
      note: string;
      payload?: Record<string, unknown>;
    },
  ) =>
    apiRequest<WorkOrderUpdate>(`/work-orders/${id}/updates`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getChecklist: (id: string) =>
    apiRequest<WorkOrderChecklistResult[]>(`/work-orders/${id}/checklist`),
  updateChecklist: (
    id: string,
    data: {
      stepId: string;
      status: WorkOrderChecklistResult['status'];
      value: Record<string, unknown>;
      note?: string;
    },
  ) =>
    apiRequest<WorkOrderChecklistResult>(`/work-orders/${id}/checklist`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  getMaterials: (id: string) =>
    apiRequest<unknown[]>(`/work-orders/${id}/materials`),
  addMaterial: (
    id: string,
    data: { materialId: string; warehouseId: string; quantity: number },
  ) =>
    apiRequest(`/work-orders/${id}/materials`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  removeMaterial: (id: string, warehouseId: string, materialId: string) =>
    apiRequest(`/work-orders/${id}/materials/${warehouseId}/${materialId}`, {
      method: 'DELETE',
    }),
  getLogs: (id: string) =>
    apiRequest<unknown[]>(`/work-orders/${id}/logs`),
};
