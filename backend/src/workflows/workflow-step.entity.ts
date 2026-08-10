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
import { Workflow } from './workflow.entity';
import { RaciAssignment } from '../raci/raci-assignment.entity';

@Entity('workflow_steps')
@Index(['workflowId', 'stepOrder'], { unique: true })
export class WorkflowStep {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'workflow_id', type: 'uuid' })
  workflowId: string;

  @ManyToOne(() => Workflow, (workflow) => workflow.steps, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workflow_id' })
  workflow: Workflow;

  @Column({ name: 'step_order', type: 'int' })
  stepOrder: number;

  @Column({ name: 'step_code' })
  stepCode: string;

  @Column({ name: 'step_name' })
  stepName: string;

  @Column({ type: 'varchar', nullable: true })
  icon?: string | null;

  @Column({ name: 'linked_sub_flow_id', type: 'uuid', nullable: true })
  linkedSubFlowId?: string | null;

  @ManyToOne(() => Workflow, { nullable: true })
  @JoinColumn({ name: 'linked_sub_flow_id' })
  linkedSubFlow?: Workflow | null;

  @OneToMany(() => RaciAssignment, (assignment) => assignment.step)
  raciAssignments: RaciAssignment[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
