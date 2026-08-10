import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { TaskStepInstance } from './task-step-instance.entity';
import { User } from '../users/user.entity';
import { ROLE_LETTERS } from '../raci/role-letter';
import type { RoleLetter } from '../raci/role-letter';

@Entity('task_step_assignees')
export class TaskStepAssignee {
  @PrimaryColumn({ name: 'task_step_instance_id', type: 'uuid' })
  taskStepInstanceId: string;

  @ManyToOne(() => TaskStepInstance, (step) => step.assignees, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'task_step_instance_id' })
  taskStepInstance: TaskStepInstance;

  @PrimaryColumn({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @PrimaryColumn({ name: 'role_letter', type: 'enum', enum: ROLE_LETTERS })
  roleLetter: RoleLetter;

  /** True if this assignee was resolved by walking up the org tree because the target unit had no head ("Xử lý thay thế"). */
  @Column({ name: 'is_escalated', default: false })
  isEscalated: boolean;

  /** Set when this assignment was handed off via delegation rather than resolved from RACI at task creation. */
  @Column({ name: 'delegated_from_user_id', type: 'uuid', nullable: true })
  delegatedFromUserId?: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'delegated_from_user_id' })
  delegatedFromUser?: User | null;
}
