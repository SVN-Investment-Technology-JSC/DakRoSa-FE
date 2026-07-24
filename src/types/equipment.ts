export interface Equipment {
  id: string;
  parentId: string | null;
  code: string;
  name: string;
  category: string | null;
  status: string;
  installationDate: string | null;
  specs: Record<string, any> | null;
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
  specs?: Record<string, any>;
  description?: string;
}

export interface UpdateEquipmentDto extends Partial<CreateEquipmentDto> {}
