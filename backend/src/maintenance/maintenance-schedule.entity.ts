import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { MaintenancePart } from './maintenance-part.entity';
import { Workflow } from '../workflows/workflow.entity';
import { MAINTENANCE_FREQUENCIES } from './maintenance-frequency';
import type { MaintenanceFrequency } from './maintenance-frequency';

/**
 * One cell of the maintenance matrix: "this part, at this frequency".
 *
 * Q2: the cycle is anchored on `anchorDate`, so a monthly job anchored on the
 * 15th always falls on the 15th. `nextDueAt` is only a cache of the next
 * occurrence — it is always recomputable from `anchorDate` + `frequency`, so a
 * missed or double cron run can never permanently corrupt the cycle.
 */
@Entity('maintenance_schedules')
@Index('IDX_maintenance_schedules_part_frequency', ['partId', 'frequency'], { unique: true })
export class MaintenanceSchedule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'part_id', type: 'uuid' })
  partId: string;

  @ManyToOne(() => MaintenancePart, (part) => part.schedules, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'part_id' })
  part: MaintenancePart;

  @Column({ type: 'enum', enum: MAINTENANCE_FREQUENCIES })
  frequency: MaintenanceFrequency;

  @Column({ name: 'anchor_date', type: 'date' })
  anchorDate: string;

  @Column({ name: 'next_due_at', type: 'date' })
  nextDueAt: string;

  /** Execution Flow to start when a ticket from this schedule becomes a Work Order. */
  @Column({ name: 'workflow_id', type: 'uuid', nullable: true })
  workflowId?: string | null;

  @ManyToOne(() => Workflow, { nullable: true })
  @JoinColumn({ name: 'workflow_id' })
  workflow?: Workflow | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
