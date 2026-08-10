import { IsOptional, IsString, IsUUID, ValidateIf } from 'class-validator';

export class UpdateWorkflowStepDto {
  @IsOptional()
  @IsString()
  stepName?: string;

  @IsOptional()
  @IsString()
  icon?: string;

  /**
   * The workflow to run as this step's Execution Flow. Pass `null` explicitly
   * to unlink — `undefined` (field omitted) leaves the current link untouched.
   */
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsUUID()
  linkedSubFlowId?: string | null;
}
