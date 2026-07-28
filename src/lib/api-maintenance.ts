import { apiRequest } from './api';
import { MaintenancePlan, CreateMaintenanceDto, UpdateMaintenanceDto } from '@/types/maintenance';

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
};
