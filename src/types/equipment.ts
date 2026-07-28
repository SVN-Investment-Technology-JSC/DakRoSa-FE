export interface Equipment {
  id: string;
  parentId: string | null;
  code: string;
  name: string;
  category: string | null;
  status: string;
  installationDate: string | null;
  specs: Record<string, unknown> | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  children?: Equipment[]; // For tree structure
}

export interface CreateEquipmentDto {
  parentId?: string;
  code: string;
  name: string;
  category?: string;
  status?: string;
  installationDate?: string;
  specs?: Record<string, unknown>;
  description?: string;
}

export type UpdateEquipmentDto = Partial<CreateEquipmentDto>;
