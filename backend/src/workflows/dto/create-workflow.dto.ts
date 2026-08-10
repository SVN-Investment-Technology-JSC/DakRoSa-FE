import { IsIn, IsOptional, IsString } from 'class-validator';
import { WORKFLOW_KINDS } from '../workflow-kind';
import type { WorkflowKind } from '../workflow-kind';

export class CreateWorkflowDto {
  @IsString()
  code: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsIn(WORKFLOW_KINDS)
  kind: WorkflowKind;
}
