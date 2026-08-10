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
import { Workflow } from '../workflows/workflow.entity';
import { OrgUnit } from '../org-units/org-unit.entity';
import { User } from '../users/user.entity';
import { TaskStepInstance } from './task-step-instance.entity';
import { TASK_PRIORITIES, TASK_STATUSES } from './task-status';
import type { TaskPriority, TaskStatus } from './task-status';
import { TASK_ORIGINS } from './task-origin';
import type { TaskOrigin } from './task-origin';
import { WORKFLOW_KINDS } from '../workflows/workflow-kind';
import type { WorkflowKind } from '../workflows/workflow-kind';
import type { EquipmentTaskTemplate } from '../maintenance/asset';

@Entity('task_instances')
export class TaskInstance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'workflow_id', type: 'uuid', nullable: true })
  workflowId?: string | null;

  @ManyToOne(() => Workflow, { nullable: true })
  @JoinColumn({ name: 'workflow_id' })
  workflow?: Workflow | null;

  @Column({ name: 'workflow_kind', type: 'enum', enum: WORKFLOW_KINDS })
  workflowKind: WorkflowKind;

  @Column()
  title: string;

  @Column({ name: 'reference_code', type: 'varchar', nullable: true })
  referenceCode?: string | null;

  @Column({ name: 'reference_title', type: 'varchar', nullable: true })
  referenceTitle?: string | null;

  @Column({ type: 'enum', enum: TASK_STATUSES, default: 'Active' })
  status: TaskStatus;

  @Column({ name: 'due_date', type: 'date', nullable: true })
  dueDate?: string | null;

  @Column({ name: 'initiator_user_id', type: 'uuid' })
  initiatorUserId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'initiator_user_id' })
  initiator: User;

  @Column({ name: 'org_unit_id', type: 'uuid' })
  orgUnitId: string;

  @ManyToOne(() => OrgUnit)
  @JoinColumn({ name: 'org_unit_id' })
  orgUnit: OrgUnit;

  @Column({ type: 'enum', enum: TASK_PRIORITIES, default: 'Normal' })
  priority: TaskPriority;

  @Column({ name: 'task_code', unique: true })
  taskCode: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ name: 'checker_role', type: 'varchar', nullable: true })
  checkerRole?: string | null;

  /**
   * BRD 2 Rule 1 — "Parent_Workflow_ID": an Execution Flow always points back at
   * whatever produced it, so the origin form can be re-opened from the child.
   * (Replaces the old `derivative_task_id`, which pointed parent→child and was
   * never written by any code.)
   */
  @Column({ name: 'parent_task_id', type: 'uuid', nullable: true })
  parentTaskId?: string | null;

  @ManyToOne(() => TaskInstance, { nullable: true })
  @JoinColumn({ name: 'parent_task_id' })
  parentTask?: TaskInstance | null;

  @Column({ name: 'origin', type: 'enum', enum: TASK_ORIGINS, default: 'manual' })
  origin: TaskOrigin;

  /**
   * BRD 2 US 2.3 — set when this task was raised as a Work Order from a
   * maintenance ticket. Kept separate from `parentTaskId` because the parent
   * here is a ticket, not a task; conflating the two would make "re-open the
   * originating form" ambiguous.
   */
  @Column({ name: 'parent_maintenance_ticket_id', type: 'uuid', nullable: true })
  parentMaintenanceTicketId?: string | null;

  /**
   * BRD 3 US 2.1 AC2 — "payload sinh ra lệnh làm việc sẽ tự động đính kèm chuỗi
   * JSON này". Chép chứ không tham chiếu: sửa cấu hình thiết bị về sau không
   * được phép đổi nội dung một Lệnh công việc đã phát ra.
   */
  @Column({ name: 'maintenance_part_id', type: 'uuid', nullable: true })
  maintenancePartId?: string | null;

  @Column({ name: 'equipment_task_template', type: 'jsonb', nullable: true })
  equipmentTaskTemplate?: EquipmentTaskTemplate | null;

  @OneToMany(() => TaskStepInstance, (step) => step.task)
  steps: TaskStepInstance[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
