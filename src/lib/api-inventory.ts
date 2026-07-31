import { apiRequest } from './api';
import { Material, CreateMaterialDto, UpdateMaterialDto, InventoryItem, InventoryTransactionDto } from '@/types/inventory';

export const inventoryApi = {
  getMaterials: () => apiRequest<Material[]>('/inventory/materials'),
  createMaterial: (data: CreateMaterialDto) =>
    apiRequest<Material>('/inventory/materials', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateMaterial: (id: string, data: UpdateMaterialDto) =>
    apiRequest<Material>(`/inventory/materials/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  getStock: () => apiRequest<InventoryItem[]>('/inventory/stock'),
  getLowStock: () => apiRequest<InventoryItem[]>('/inventory/alerts/low-stock'),
  transaction: (data: InventoryTransactionDto) =>
    apiRequest<{ success: boolean; transactionId: string }>('/inventory/transaction', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};
