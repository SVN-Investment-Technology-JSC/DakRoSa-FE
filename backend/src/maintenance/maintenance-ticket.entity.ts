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
import { MaintenanceSchedule } from './maintenance-schedule.entity';
import { TaskInstance } from '../tasks/task-instance.entity';
import { TICKET_STATUSES } from './maintenance-frequency';
import type { TicketStatus } from './maintenance-frequency';
import { TASK_PRIORITIES } from '../tasks/task-status';
import type { TaskPriority } from '../tasks/task-status';

/**
 * A reminder raised by the cron ahead of a maintenance due date (US 2.1).
 *
 * The unique index on `(schedule_id, due_date)` is the anti-duplicate guard:
 * the cron is expected to run more than once for the same due date (server
 * restart, manual re-run, a retried deploy), and each of those must be a
 * no-op rather than a second ticket for the same job.
 */
@Entity('maintenance_tickets')
@Index('IDX_maintenance_tickets_schedule_due', ['scheduleId', 'dueDate'], { unique: true })
export class MaintenanceTicket {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'ticket_number', unique: true })
  ticketNumber: string;

  @Column({ name: 'part_id', type: 'uuid' })
  partId: string;

  @ManyToOne(() => MaintenancePart)
  @JoinColumn({ name: 'part_id' })
  part: MaintenancePart;

  @Column({ name: 'schedule_id', type: 'uuid' })
  scheduleId: string;

  @ManyToOne(() => MaintenanceSchedule, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'schedule_id' })
  schedule: MaintenanceSchedule;

  @Column({ name: 'due_date', type: 'date' })
  dueDate: string;

  @Column({ type: 'enum', enum: TICKET_STATUSES, default: 'ROUTINE' })
  status: TicketStatus;

  @Column({ type: 'enum', enum: TASK_PRIORITIES, default: 'Normal' })
  priority: TaskPriority;

  @Column({ type: 'text', nullable: true })
  note?: string | null;

  /** Set once a Work Order has been raised — a ticket yields at most one task. */
  @Column({ name: 'resulting_task_id', type: 'uuid', nullable: true })
  resultingTaskId?: string | null;

  @ManyToOne(() => TaskInstance, { nullable: true })
  @JoinColumn({ name: 'resulting_task_id' })
  resultingTask?: TaskInstance | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
