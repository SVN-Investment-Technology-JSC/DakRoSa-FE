import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TaskInstance } from '../tasks/task-instance.entity';
import { User } from '../users/user.entity';

/**
 * Every meaningful thing that happened to a task, in order.
 *
 * `action` is a free-form slug rather than an enum so a new kind of event never
 * needs a migration; `summary` is written in Vietnamese at write time so the
 * log stays readable even after the referenced rows change or disappear.
 * `metadata` keeps the structured detail for anything that wants to render it
 * richer later.
 */
@Entity('task_activity_logs')
@Index('IDX_task_activity_logs_task_created', ['taskId', 'createdAt'])
export class TaskActivityLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'task_id', type: 'uuid' })
  taskId: string;

  @ManyToOne(() => TaskInstance, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'task_id' })
  task: TaskInstance;

  @Column({ name: 'step_id', type: 'uuid', nullable: true })
  stepId?: string | null;

  /** Null when the system acted on its own (cron, auto-spawn). */
  @Column({ name: 'actor_user_id', type: 'uuid', nullable: true })
  actorUserId?: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'actor_user_id' })
  actor?: User | null;

  @Column()
  action: string;

  @Column({ type: 'text' })
  summary: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
