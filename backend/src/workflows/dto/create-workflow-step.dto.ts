import { IsInt, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateWorkflowStepDto {
  @IsInt()
  stepOrder: number;

  @IsString()
  stepCode: string;

  @IsString()
  stepName: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsUUID()
  linkedSubFlowId?: string;
}
