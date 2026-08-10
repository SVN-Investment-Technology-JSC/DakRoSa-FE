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
import { TaskInstance } from './task-instance.entity';
import { WorkflowStep } from '../workflows/workflow-step.entity';
import { TaskStepAssignee } from './task-step-assignee.entity';
import { TASK_STEP_STATUSES } from './task-status';
import type { TaskStepStatus } from './task-status';
import { E_TASK_SOURCES } from '../raci/e-task-source';
import type { ETaskSource } from '../raci/e-task-source';
import type { EquipmentTaskTemplate } from '../maintenance/asset';

@Entity('task_step_instances')
@Index(['taskId', 'stepOrder'], { unique: true })
export class TaskStepInstance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'task_id', type: 'uuid' })
  taskId: string;

  @ManyToOne(() => TaskInstance, (task) => task.steps, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'task_id' })
  task: TaskInstance;

  @Column({ name: 'workflow_step_id', type: 'uuid', nullable: true })
  workflowStepId?: string | null;

  @ManyToOne(() => WorkflowStep, { nullable: true })
  @JoinColumn({ name: 'workflow_step_id' })
  workflowStep?: WorkflowStep | null;

  @Column({ name: 'step_order', type: 'int' })
  stepOrder: number;

  @Column({ name: 'step_name' })
  stepName: string;

  @Column({ name: 'role_assigned_summary', type: 'varchar', nullable: true })
  roleAssignedSummary?: string | null;

  @Column({ type: 'enum', enum: TASK_STEP_STATUSES, default: 'Pending' })
  status: TaskStepStatus;

  @Column({ type: 'int', default: 0 })
  progress: number;

  @Column({ name: 'is_derivative', default: false })
  isDerivative: boolean;

  /**
   * BRD 3 US 3.1 — cấu hình nguồn công việc của Node E, đông cứng lại từ tag `E`
   * của bước mẫu ngay lúc tạo đơn. Đọc lại từ template lúc chạy sẽ khiến một
   * đơn đang dở dang đổi cách giao việc chỉ vì ai đó sửa ma trận.
   */
  @Column({ name: 'e_task_source', type: 'enum', enum: E_TASK_SOURCES, nullable: true })
  eTaskSource?: ETaskSource | null;

  @Column({ name: 'e_task_list', type: 'jsonb', nullable: true })
  eTaskList?: EquipmentTaskTemplate | null;

  @Column({ name: 'linked_sub_flow_task_id', type: 'uuid', nullable: true })
  linkedSubFlowTaskId?: string | null;

  @ManyToOne(() => TaskInstance, { nullable: true })
  @JoinColumn({ name: 'linked_sub_flow_task_id' })
  linkedSubFlowTask?: TaskInstance | null;

  @OneToMany(() => TaskStepAssignee, (assignee) => assignee.taskStepInstance)
  assignees: TaskStepAssignee[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
