export type WarehouseAssetKind = 'company' | 'factory' | 'main_equipment' | 'part';

export type WarehouseCondition = 'operating' | 'broken' | 'standby' | 'other';

export type MaintenanceFrequency = 'day' | 'week' | 'month' | 'quarter' | 'year';

export type ConditionTone = 'ok' | 'alarm' | 'priority' | 'critical';

export interface NamingDictionary {
  companyCodes: Record<string, string>;
  factoryCodes: Record<string, string>;
  mainParts: Record<string, string>; // T: 'Tuabin', G: 'Máy phát', etc.
  subParts: Record<string, string>;  // S: 'Buồng xoắn', Gu: 'Cánh Hướng', Sh: 'Trục', etc.
}

export interface EquipmentDocument {
  id: string;
  name: string;
  type: 'manual' | 'cocq' | 'test_report' | 'work_record' | 'other';
  fileUrl: string;
  uploadedAt: string;
}

export interface MaintenanceMatrixSchedule {
  id: string;
  frequency: MaintenanceFrequency;
  value?: string | number; // 'x', 1, 3...
  taskName?: string;
  laborCount?: number; // e.g. 2 công
  startTime?: string;
  finishTime?: string;
  toolsNeeded?: string[];
  assignedTeam?: string[];
  nextDueDate?: string;
  workOrderMode?: 'auto' | 'manual';
  notes?: string;
}

export interface WarehouseNode {
  id: string;
  tenantId: string;
  parentId: string | null;
  code: string; // e.g. SB-KD-T-Sh-Ro-01
  name: string;
  assetKind: WarehouseAssetKind;
  symbol?: string;
  condition: WarehouseCondition;
  location?: string; // Địa điểm - Kho lưu trữ
  specifications?: string; // Thông số kỹ thuật / vật liệu / quy cách
  manufacturer?: string;
  timeline?: Array<{
    date: string;
    event: string;
    type: 'maintenance' | 'repair' | 'incident' | 'inspection';
  }>;
  documents?: EquipmentDocument[];
  schedules?: MaintenanceMatrixSchedule[];
  crossPlantSpareAvailable?: boolean;
  crossPlantSuggestions?: Array<{
    plantName: string;
    warehouseName: string;
    partCode: string;
    availableQty: number;
    matchRate: string;
  }>;
  children: WarehouseNode[];
  createdAt?: string;
  updatedAt?: string;
}
