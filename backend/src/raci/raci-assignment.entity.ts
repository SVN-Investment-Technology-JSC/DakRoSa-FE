import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { WorkflowStep } from '../workflows/workflow-step.entity';
import { OrgUnit } from '../org-units/org-unit.entity';
import { Position } from '../positions/position.entity';
import { User } from '../users/user.entity';
import { ROLE_LETTERS } from './role-letter';
import type { RoleLetter } from './role-letter';
import { E_TASK_SOURCES } from './e-task-source';
import type { ETaskSource } from './e-task-source';
import type { EquipmentTaskTemplate } from '../maintenance/asset';

/**
 * A RACI tag always anchors to an org unit, and optionally narrows to a position
 * within it or to one exact person. This mirrors the BRD's 3-layer matrix columns:
 *
 *  - orgUnitId only .................. TH1 — whole unit, routes to its head
 *  - orgUnitId + positionId .......... routes to EVERY member holding that position there
 *  - orgUnitId + userId .............. TH2 — routes to that exact individual
 *
 * Keeping orgUnitId populated in all three cases is deliberate: the matrix's
 * subtree aggregation/auto-hide logic stays a simple org-unit query.
 */
@Entity('raci_assignments')
@Check(`"role_letter" <> 'C' OR "fixed_rollback_step_id" IS NOT NULL`)
@Check(`"role_letter" <> 'A' OR "fixed_rollback_step_id" IS NULL`)
@Check(`"position_id" IS NULL OR "user_id" IS NULL`)
@Check(`"role_letter" = 'E' OR "e_task_source" IS NULL`)
export class RaciAssignment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'step_id', type: 'uuid' })
  stepId: string;

  @ManyToOne(() => WorkflowStep, (step) => step.raciAssignments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'step_id' })
  step: WorkflowStep;

  /** The org unit this tag anchors to (any level). Always set. */
  @Column({ name: 'org_unit_id', type: 'uuid' })
  orgUnitId: string;

  @ManyToOne(() => OrgUnit)
  @JoinColumn({ name: 'org_unit_id' })
  orgUnit: OrgUnit;

  /** Narrows the target to holders of this position within `orgUnitId`. */
  @Column({ name: 'position_id', type: 'uuid', nullable: true })
  positionId?: string | null;

  @ManyToOne(() => Position, { nullable: true })
  @JoinColumn({ name: 'position_id' })
  position?: Position | null;

  /** Narrows the target to exactly this person. */
  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId?: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user?: User | null;

  @Column({ name: 'role_letter', type: 'enum', enum: ROLE_LETTERS })
  roleLetter: RoleLetter;

  /**
   * BRD 3 US 3.1 AC2 — chỉ có nghĩa với tag `E`. Rỗng = `manual`, tức hành vi
   * có sẵn từ trước BRD 3 (người giữ Node E tự gõ danh sách lúc phân rã), nên
   * mọi tag E đã tồn tại không đổi cách chạy.
   */
  @Column({ name: 'e_task_source', type: 'enum', enum: E_TASK_SOURCES, nullable: true })
  eTaskSource?: ETaskSource | null;

  /** Danh sách công việc gõ sẵn, chỉ dùng khi `eTaskSource = 'task_list'`. */
  @Column({ name: 'e_task_list', type: 'jsonb', nullable: true })
  eTaskList?: EquipmentTaskTemplate | null;

  @Column({ name: 'fixed_rollback_step_id', type: 'uuid', nullable: true })
  fixedRollbackStepId?: string | null;

  @ManyToOne(() => WorkflowStep, { nullable: true })
  @JoinColumn({ name: 'fixed_rollback_step_id' })
  fixedRollbackStep?: WorkflowStep | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
