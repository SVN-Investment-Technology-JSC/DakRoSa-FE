/* eslint-disable */
import { apiRequest } from './api';
import { WorkOrder, CreateWorkOrderDto, UpdateWorkOrderDto } from '@/types/work-order';

export const workOrderApi = {
  getAll: () => apiRequest<WorkOrder[]>('/work-orders'),
  getById: (id: string) => apiRequest<WorkOrder>(`/work-orders/${id}`),
  getByEquipment: (equipmentId: string) => apiRequest<WorkOrder[]>(`/work-orders/equipment/${equipmentId}`),
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
  getMaterials: (id: string) => apiRequest<any[]>(`/work-orders/${id}/materials`),
  addMaterial: (id: string, data: { materialId: string; warehouseId: string; quantity: number }) =>
    apiRequest(`/work-orders/${id}/materials`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  removeMaterial: (id: string, warehouseId: string, materialId: string) =>
    apiRequest(`/work-orders/${id}/materials/${warehouseId}/${materialId}`, {
      method: 'DELETE',
    }),
  getLogs: (id: string) => apiRequest<any[]>(`/work-orders/${id}/logs`),
};
