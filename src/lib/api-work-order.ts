import { apiRequest } from './api';
import { WorkOrder, CreateWorkOrderDto, UpdateWorkOrderDto } from '@/types/work-order';

export const workOrderApi = {
  getAll: () => apiRequest<WorkOrder[]>('/work-orders'),
  getById: (id: string) => apiRequest<WorkOrder>(`/work-orders/${id}`),
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
};
