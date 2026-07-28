export interface MaintenancePlan {
  id: string;
  equipmentId: string;
  title: string;
  description: string | null;
  frequencyDays: number | null;
  nextDueDate: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMaintenanceDto {
  equipmentId: string;
  title: string;
  description?: string;
  frequencyDays?: number;
  nextDueDate?: string;
}

export interface UpdateMaintenanceDto extends Partial<CreateMaintenanceDto> {
  isActive?: boolean;
}
