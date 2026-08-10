import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { TaskStepInstance } from '../tasks/task-step-instance.entity';
import { User } from '../users/user.entity';
import { ROLE_LETTERS } from '../raci/role-letter';
import type { RoleLetter } from '../raci/role-letter';

export const APPROVAL_ACTIONS = ['APPROVE', 'REJECT'] as const;
export type ApprovalActionType = (typeof APPROVAL_ACTIONS)[number];

@Entity('approval_actions')
export class ApprovalAction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'task_step_instance_id', type: 'uuid' })
  taskStepInstanceId: string;

  @ManyToOne(() => TaskStepInstance, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'task_step_instance_id' })
  taskStepInstance: TaskStepInstance;

  @Column({ name: 'actor_user_id', type: 'uuid' })
  actorUserId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'actor_user_id' })
  actor: User;

  @Column({ type: 'enum', enum: APPROVAL_ACTIONS })
  action: ApprovalActionType;

  @Column({ name: 'role_letter_acted_as', type: 'enum', enum: ROLE_LETTERS })
  roleLetterActedAs: RoleLetter;

  @Column({ name: 'target_step_instance_id', type: 'uuid', nullable: true })
  targetStepInstanceId?: string | null;

  @ManyToOne(() => TaskStepInstance, { nullable: true })
  @JoinColumn({ name: 'target_step_instance_id' })
  targetStepInstance?: TaskStepInstance | null;

  @Column({ type: 'text', nullable: true })
  notes?: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
