/* eslint-disable */
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
  getDocuments: (id: string) => 
    apiRequest<any[]>(`/equipment/${id}/documents`),
  addDocument: (id: string, data: { name: string; type?: string; fileUrl: string; description?: string }) =>
    apiRequest<any>(`/equipment/${id}/documents`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  removeDocument: (id: string, docId: string) =>
    apiRequest<{ success: boolean }>(`/equipment/${id}/documents/${docId}`, {
      method: 'DELETE',
    }),
};
