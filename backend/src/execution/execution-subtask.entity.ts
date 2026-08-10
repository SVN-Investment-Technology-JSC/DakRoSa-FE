import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { TaskStepInstance } from '../tasks/task-step-instance.entity';
import { User } from '../users/user.entity';
import { ExecutionAttachment } from './execution-attachment.entity';

export const SUBTASK_STATUSES = ['Pending', 'Submitted'] as const;
export type SubtaskStatus = (typeof SUBTASK_STATUSES)[number];

/**
 * An E(x) sub-task under an aggregate Node E (BRD 2 US 1.3 / 1.4).
 *
 * Deliberately NOT modelled as a `task_step_instance`: BRD 2 Rule 3 says E(x)
 * must never appear as its own node on the flow canvas. Keeping them in a nested
 * table means any future canvas renderer cannot accidentally draw them.
 */
@Entity('execution_subtasks')
@Index(['taskStepInstanceId', 'assigneeUserId', 'title'], { unique: true })
export class ExecutionSubtask {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'task_step_instance_id', type: 'uuid' })
  taskStepInstanceId: string;

  @ManyToOne(() => TaskStepInstance, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'task_step_instance_id' })
  taskStepInstance: TaskStepInstance;

  @Column({ name: 'assignee_user_id', type: 'uuid' })
  assigneeUserId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'assignee_user_id' })
  assignee: User;

  @Column()
  title: string;

  /**
   * Percentage of the parent Node E this sub-task carries. Stored as numeric so
   * 33.33 stays exact; `transformer` keeps it a JS number instead of the string
   * pg returns for numeric columns.
   */
  @Column({
    type: 'numeric',
    precision: 5,
    scale: 2,
    transformer: {
      to: (value: number) => value,
      from: (value: string | null) => (value === null ? 0 : Number(value)),
    },
  })
  weight: number;

  @Column({ type: 'enum', enum: SUBTASK_STATUSES, default: 'Pending' })
  status: SubtaskStatus;

  @Column({ name: 'submitted_at', type: 'timestamp', nullable: true })
  submittedAt?: Date | null;

  @Column({ type: 'text', nullable: true })
  note?: string | null;

  @OneToMany(() => ExecutionAttachment, (attachment) => attachment.subtask)
  attachments: ExecutionAttachment[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
