import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { OrgUnit } from './org-unit.entity';
import { User } from '../users/user.entity';
import { Position } from '../positions/position.entity';

/**
 * Tầng nhân sự: ai làm việc ở đơn vị nào, giữ chức vụ gì.
 *
 * Note: `org_units.head_user_id` stays the authoritative "Trưởng bộ phận" pointer
 * (escalation resolves through it). This table holds the full roster — including
 * the head — so RACI can target a whole position ("Nhân viên của Tổ Backend")
 * or an exact individual.
 */
@Entity('org_unit_members')
@Index(['orgUnitId', 'userId', 'positionId'], { unique: true })
export class OrgUnitMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'org_unit_id', type: 'uuid' })
  orgUnitId: string;

  @ManyToOne(() => OrgUnit, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'org_unit_id' })
  orgUnit: OrgUnit;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'position_id', type: 'uuid' })
  positionId: string;

  @ManyToOne(() => Position)
  @JoinColumn({ name: 'position_id' })
  position: Position;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
