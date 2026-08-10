/**
 * Cây cấu trúc tài sản (BRD 3 Epic 1) và danh sách nhiệm vụ theo thiết bị
 * (BRD 3 Epic 2 — "Data Requirement: lưu trữ dưới định dạng JSON").
 *
 * Cây được lồng ngay trong `maintenance_parts` bằng `parent_id` chứ không tách
 * bảng riêng: mọi thứ đã gắn với thiết bị (lịch bảo trì, phiếu nhắc, Lệnh công
 * việc) đều khoá theo `maintenance_parts.id`, nên tách bảng sẽ buộc toàn bộ
 * đường đi đó phải join thêm một tầng mà không đổi lại được gì.
 */

export const ASSET_KINDS = ['company', 'factory', 'main_equipment', 'part'] as const;
export type AssetKind = (typeof ASSET_KINDS)[number];

/** Cấp bậc bắt buộc của từng loại node — dùng để chặn cha/con sai tầng. */
export const ASSET_KIND_LEVEL: Record<AssetKind, number> = {
  company: 1,
  factory: 2,
  main_equipment: 3,
  part: 4,
};

export const ASSET_KIND_LABEL: Record<AssetKind, string> = {
  company: 'Công ty',
  factory: 'Nhà máy / Hạ tầng',
  main_equipment: 'Phân hệ thiết bị chính',
  part: 'Bộ phận / Chi tiết',
};

/**
 * `part` lồng được trong chính nó (BRD: "Parts...." lồng nhiều tầng, giới hạn
 * 1 Main part ↔ 5 sub-parts), các cấp còn lại chỉ nhận đúng cấp kế trên.
 */
export function isValidChildKind(parent: AssetKind | null, child: AssetKind): boolean {
  if (parent === null) return child === 'company';
  if (parent === 'part') return child === 'part';
  return ASSET_KIND_LEVEL[child] === ASSET_KIND_LEVEL[parent] + 1;
}

/** BRD: "1 Main parts <-> 5 sub-parts" — độ sâu tối đa của nhánh Parts. */
export const MAX_PART_DEPTH = 5;

export const ASSET_CONDITIONS = ['operating', 'broken', 'standby', 'other'] as const;
export type AssetCondition = (typeof ASSET_CONDITIONS)[number];

export const ASSET_CONDITION_LABEL: Record<AssetCondition, string> = {
  operating: 'Đang vận hành',
  broken: 'Hỏng',
  standby: 'Dự phòng',
  other: 'Khác',
};

/**
 * Một dòng của "Danh sách nhiệm vụ" khai ở Ma trận bảo trì (BRD 3 US 2.1 AC2).
 *
 * `durationMinutes` là "Thời gian thực hiện từng nhiệm vụ". Giữ đơn vị phút để
 * không phải đoán ý khi đọc lại: "2" có thể là 2 giờ hay 2 ngày, "120 phút" thì
 * không.
 */
export interface EquipmentTaskItem {
  title: string;
  durationMinutes: number;
  note?: string;
}

/** Chuỗi JSON đính kèm Lệnh công việc — luôn là một mảng, kể cả khi rỗng. */
export type EquipmentTaskTemplate = EquipmentTaskItem[];

export function isNonEmptyTemplate(
  template: EquipmentTaskTemplate | null | undefined,
): template is EquipmentTaskTemplate {
  return Array.isArray(template) && template.length > 0;
}
