import { Entity, PrimaryColumn } from 'typeorm';
import { WORKFLOW_KINDS } from '../workflows/workflow-kind';
import type { WorkflowKind } from '../workflows/workflow-kind';
import { ROLE_LETTERS } from './role-letter';
import type { RoleLetter } from './role-letter';

@Entity('role_letter_allowlist')
export class RoleLetterAllowlist {
  @PrimaryColumn({ name: 'workflow_kind', type: 'enum', enum: WORKFLOW_KINDS })
  workflowKind: WorkflowKind;

  @PrimaryColumn({ name: 'role_letter', type: 'enum', enum: ROLE_LETTERS })
  roleLetter: RoleLetter;
}
