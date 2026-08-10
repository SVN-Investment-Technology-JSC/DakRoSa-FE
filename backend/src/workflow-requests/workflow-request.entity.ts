import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../users/user.entity';
import { TaskInstance } from '../tasks/task-instance.entity';
import { WORKFLOW_KINDS } from '../workflows/workflow-kind';
import type { WorkflowKind } from '../workflows/workflow-kind';
import {
  WORKFLOW_REQUEST_PRIORITIES,
  WORKFLOW_REQUEST_STATUSES,
} from './workflow-request-status';
import type { WorkflowRequestPriority, WorkflowRequestStatus } from './workflow-request-status';

@Entity('workflow_requests')
export class WorkflowRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'workflow_kind', type: 'enum', enum: WORKFLOW_KINDS })
  workflowKind: WorkflowKind;

  @Column()
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'enum', enum: WORKFLOW_REQUEST_PRIORITIES, default: 'normal' })
  priority: WorkflowRequestPriority;

  @Column({ type: 'enum', enum: WORKFLOW_REQUEST_STATUSES, default: 'Initiated' })
  status: WorkflowRequestStatus;

  @Column({ name: 'attached_file_name', type: 'varchar', nullable: true })
  attachedFileName?: string | null;

  @Column({ name: 'submitted_by_user_id', type: 'uuid' })
  submittedByUserId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'submitted_by_user_id' })
  submittedBy: User;

  @Column({ name: 'resulting_task_id', type: 'uuid', nullable: true })
  resultingTaskId?: string | null;

  @ManyToOne(() => TaskInstance, { nullable: true })
  @JoinColumn({ name: 'resulting_task_id' })
  resultingTask?: TaskInstance | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
