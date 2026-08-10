import { IsIn, IsOptional, IsString } from 'class-validator';
import { WORKFLOW_KINDS } from '../../workflows/workflow-kind';
import type { WorkflowKind } from '../../workflows/workflow-kind';
import { WORKFLOW_REQUEST_PRIORITIES } from '../workflow-request-status';
import type { WorkflowRequestPriority } from '../workflow-request-status';

export class CreateWorkflowRequestDto {
  @IsIn(WORKFLOW_KINDS)
  workflowKind: WorkflowKind;

  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsIn(WORKFLOW_REQUEST_PRIORITIES)
  priority: WorkflowRequestPriority;

  @IsOptional()
  @IsString()
  attachedFileName?: string;
}
