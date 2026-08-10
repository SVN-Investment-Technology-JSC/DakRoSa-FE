import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { OrgUnit } from '../org-units/org-unit.entity';
import { MaintenanceSchedule } from './maintenance-schedule.entity';
import { ASSET_CONDITIONS, ASSET_KINDS } from './asset';
import type { AssetCondition, AssetKind, EquipmentTaskTemplate } from './asset';

/**
 * Một node của cây cấu trúc tài sản (BRD 3 Epic 1) — đồng thời là thiết bị cần
 * bảo trì định kỳ (BRD 2 Epic 2, US 2.1).
 *
 * Hai vai trò nằm chung một bảng vì chúng là cùng một thứ ở hai màn hình: node
 * "Sơ đồ thiết bị" chính là dòng của "Ma trận bảo trì". `parentId` dựng cây 4
 * cấp Company → Factory → Main Equipment → Parts (Parts lồng tiếp trong Parts).
 *
 * `orgUnitId` là đơn vị phụ trách — Lệnh công việc sinh từ phiếu nhắc được tạo
 * dưới đơn vị đó. Từ BRD 3 trường này cho phép rỗng: một node Công ty hay Nhà
 * máy không nhất thiết thuộc về một tổ nào cả. Chỗ nào thực sự cần đơn vị (lên
 * lịch, tạo Lệnh) sẽ leo ngược cây tìm đơn vị gần nhất — xem
 * `MaintenanceService.resolveOrgUnitId`.
 */
@Entity('maintenance_parts')
export class MaintenancePart {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  code: string;

  @Column()
  name: string;

  @Column({ name: 'parent_id', type: 'uuid', nullable: true })
  parentId?: string | null;

  @ManyToOne(() => MaintenancePart, (part) => part.children, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'parent_id' })
  parent?: MaintenancePart | null;

  @OneToMany(() => MaintenancePart, (part) => part.parent)
  children: MaintenancePart[];

  /**
   * Loại node trong cây. Mặc định `part` để mọi thiết bị đã tồn tại trước BRD 3
   * vẫn là một chi tiết hợp lệ, chỉ là đang đứng độc lập ở gốc cây.
   */
  @Column({ name: 'asset_kind', type: 'enum', enum: ASSET_KINDS, default: 'part' })
  assetKind: AssetKind;

  @Column({ name: 'org_unit_id', type: 'uuid', nullable: true })
  orgUnitId?: string | null;

  @ManyToOne(() => OrgUnit, { nullable: true })
  @JoinColumn({ name: 'org_unit_id' })
  orgUnit?: OrgUnit | null;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  // ------------------------------------------- Khung thông tin chi tiết (BRD 3)

  /** "Kí hiệu" — mã hiệu kỹ thuật in trên thiết bị, khác `code` của hệ thống. */
  @Column({ type: 'varchar', nullable: true })
  symbol?: string | null;

  @Column({ name: 'condition', type: 'enum', enum: ASSET_CONDITIONS, nullable: true })
  condition?: AssetCondition | null;

  /** "Vị trí: địa điểm - Kho". */
  @Column({ type: 'varchar', nullable: true })
  location?: string | null;

  /** "Thông số chính: Thông số kỹ thuật / vật liệu / Quy cách". */
  @Column({ type: 'text', nullable: true })
  specifications?: string | null;

  @Column({ type: 'varchar', nullable: true })
  manufacturer?: string | null;

  /**
   * BRD 3 US 2.1 AC2 — "Danh sách nhiệm vụ" + "Thời gian thực hiện từng nhiệm
   * vụ", bắt buộc lưu dạng JSON gắn với ID thiết bị. Mỗi khi thiết bị này sinh
   * Lệnh công việc, chuỗi này được sao nguyên văn sang Lệnh đó.
   */
  @Column({ name: 'task_template', type: 'jsonb', nullable: true })
  taskTemplate?: EquipmentTaskTemplate | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @OneToMany(() => MaintenanceSchedule, (schedule) => schedule.part)
  schedules: MaintenanceSchedule[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
