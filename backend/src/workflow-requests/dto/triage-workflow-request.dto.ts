import { IsUUID } from 'class-validator';

export class TriageWorkflowRequestDto {
  @IsUUID()
  workflowId: string;

  /**
   * Deviation from plan.md's triage payload (which only lists `workflowId`):
   * task_instances.org_unit_id is required and workflow_requests has no org
   * unit of its own, so the triager must supply which org unit the resulting
   * task belongs to.
   */
  @IsUUID()
  orgUnitId: string;
}
