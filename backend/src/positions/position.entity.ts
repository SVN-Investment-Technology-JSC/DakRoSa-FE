import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Danh mục Chức vụ (global catalog) — e.g. Trưởng phòng, Phó phòng, Nhân viên.
 * A position is org-unit-agnostic; who holds it *where* lives in org_unit_members.
 */
@Entity('positions')
export class Position {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  code: string;

  @Column()
  name: string;

  /** Lower = more senior. Used only for stable ordering of the position columns. */
  @Column({ type: 'int', default: 100 })
  rank: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
