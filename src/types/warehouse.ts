export type WarehouseAssetKind = 'company' | 'factory' | 'main_equipment' | 'part';

export type WarehouseCondition = 'operating' | 'broken' | 'standby' | 'other' | 'maintenance' | 'calibrating';

export type MaintenanceFrequency = 'day' | 'week' | 'month' | 'quarter' | 'year';

export type ConditionTone = 'ok' | 'alarm' | 'priority' | 'critical';

export type ItemCategory = 'SPARE_PART' | 'CONSUMABLE' | 'TOOL' | 'RAW_MATERIAL';

export type TransactionType = 'IN' | 'OUT' | 'TRANSFER' | 'BORROW' | 'RETURN' | 'ADJUST';

export type TransactionStatus = 'COMPLETED' | 'PENDING_APPROVAL' | 'APPROVED' | 'CANCELLED';

export interface StorageLocation {
  id: string;
  warehouseId: string;
  warehouseName: string;
  zone: string; // VD: Phân khu A, Kệ B2
  shelf: string; // VD: Kệ 01, Tầng 2
  bin: string;   // VD: Ngăn 04, Ô B05
  fullAddress: string; // VD: Kho Khe Diên - Kệ A2 - Tầng 2 - Ngăn 04
}

export interface InventoryStock {
  itemId: string;
  itemCode: string;
  itemName: string;
  unit: string;
  quantityOnHand: number;     // Tồn thực tế trong kho
  quantityReserved: number;   // Số lượng đã giữ chỗ trước cho Work Orders / Kế hoạch
  quantityAvailable: number;  // Tồn khả dụng (onHand - reserved)
  minStock: number;           // Ngưỡng cảnh báo tồn tối thiểu
  maxStock: number;           // Định mức tồn tối đa
  unitPrice?: number;         // Đơn giá tham chiếu (VND)
  storageLocation?: StorageLocation;
}

export interface InventoryTransaction {
  id: string;
  transactionCode: string;   // VD: NK-202608-001, XK-WO-202608-012, DC-KD-HN-003
  transactionType: TransactionType;
  itemCode: string;
  itemName: string;
  quantity: number;
  unit: string;
  fromLocation?: string;
  toLocation?: string;
  referenceType?: 'WORK_ORDER' | 'PURCHASE_ORDER' | 'OPERATION' | 'INSPECTION' | 'DIRECT';
  referenceId?: string;       // VD: WO-2026-0815, PO-2026-092
  requester?: string;         // Người / Đơn vị yêu cầu
  approver?: string;          // Người phê duyệt (Workflow)
  executor: string;           // Thủ kho thực hiện thao tác
  status: TransactionStatus;
  notes?: string;
  createdAt: string;
}

export interface NamingDictionary {
  companyCodes: Record<string, string>;
  factoryCodes: Record<string, string>;
  mainParts: Record<string, string>; // T: 'Tuabin', G: 'Máy phát', etc.
  subParts: Record<string, string>;  // S: 'Buồng xoắn', Gu: 'Cánh Hướng', Sh: 'Trục', Ro: 'Roăng làm kín', etc.
}

export interface EquipmentDocument {
  id: string;
  name: string;
  type: 'manual' | 'cocq' | 'test_report' | 'work_record' | 'drawing' | 'other';
  fileUrl: string;
  fileSize?: string;
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

export interface BOMItem {
  id: string;
  code: string;
  name: string;
  category: ItemCategory;
  quantity: number;
  unit: string;
  condition: string;
  stockStatus: 'available' | 'low_stock' | 'out_of_stock';
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
  
  // Thông số kỹ thuật chi tiết theo UI mẫu (main_UI.jpg)
  model?: string;
  serialNumber?: string;
  material?: string;
  dimensions?: string;
  operatingTemp?: string;
  pressureRating?: string;
  location?: string; // Địa điểm - Kho lưu trữ
  specifications?: string; // Thông số kỹ thuật chung
  manufacturer?: string;
  
  // Yêu cầu bảo dưỡng
  requiredTools?: string[];
  laborRequirement?: string;
  assignedTeam?: string;

  // Dữ liệu quản lý kho theo plan_2.md & dexuat.md
  category?: ItemCategory;
  stock?: InventoryStock;
  transactions?: InventoryTransaction[];
  bomItems?: BOMItem[];

  timeline?: Array<{
    date: string;
    event: string;
    type: 'maintenance' | 'repair' | 'incident' | 'inspection';
    reference?: string;
  }>;
  documents?: EquipmentDocument[];
  schedules?: MaintenanceMatrixSchedule[];
  
  // Tính năng mạng lưới dự phòng đa nhà máy
  crossPlantSpareAvailable?: boolean;
  crossPlantSuggestions?: Array<{
    plantName: string;
    warehouseName: string;
    partCode: string;
    availableQty: number;
    matchRate: string;
    specRating?: string;
    statusNote?: string;
  }>;
  
  children: WarehouseNode[];
  createdAt?: string;
  updatedAt?: string;
}
