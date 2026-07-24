import { apiRequest } from './api';
import { Equipment, CreateEquipmentDto, UpdateEquipmentDto } from '@/types/equipment';

export const equipmentApi = {
  getTree: () => apiRequest<Equipment[]>('/equipment/tree'),
  getAll: () => apiRequest<Equipment[]>('/equipment'),
  getById: (id: string) => apiRequest<Equipment>(`/equipment/${id}`),
  create: (data: CreateEquipmentDto) =>
    apiRequest<Equipment>('/equipment', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: string, data: UpdateEquipmentDto) =>
    apiRequest<Equipment>(`/equipment/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    apiRequest<{ success: boolean }>(`/equipment/${id}`, {
      method: 'DELETE',
    }),
};
