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

/**
 * A piece of equipment that needs periodic maintenance (BRD 2 Epic 2, US 2.1).
 * `orgUnitId` is the unit responsible for it — the Work Order raised from a
 * ticket is created under that unit.
 */
@Entity('maintenance_parts')
export class MaintenancePart {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  code: string;

  @Column()
  name: string;

  @Column({ name: 'org_unit_id', type: 'uuid' })
  orgUnitId: string;

  @ManyToOne(() => OrgUnit)
  @JoinColumn({ name: 'org_unit_id' })
  orgUnit: OrgUnit;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @OneToMany(() => MaintenanceSchedule, (schedule) => schedule.part)
  schedules: MaintenanceSchedule[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
