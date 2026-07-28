export interface Warehouse {
  id: string;
  code: string;
  name: string;
  location: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface Material {
  id: string;
  code: string;
  name: string;
  category: string | null;
  unit: string;
  minStock: number;
  isActive: boolean;
  createdAt: string;
}

export interface InventoryItem {
  id: string;
  warehouseId: string;
  materialId: string;
  quantity: number;
  location: string | null;
  warehouse?: Warehouse;
  material?: Material;
}

export interface CreateMaterialDto {
  code: string;
  name: string;
  category?: string;
  unit: string;
  minStock?: number;
}

export interface UpdateMaterialDto extends Partial<CreateMaterialDto> {
  isActive?: boolean;
}

export interface InventoryTransactionDto {
  warehouseId: string;
  materialId: string;
  type: 'IN' | 'OUT';
  quantity: number;
  referenceId?: string;
  note?: string;
}
