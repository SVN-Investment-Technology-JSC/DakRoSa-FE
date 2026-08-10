import { IsDateString, IsIn, IsOptional, IsString, IsUUID } from 'class-validator';
import { TASK_PRIORITIES } from '../task-status';
import type { TaskPriority } from '../task-status';

export class CreateTaskDto {
  @IsUUID()
  workflowId: string;

  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  referenceCode?: string;

  @IsOptional()
  @IsString()
  referenceTitle?: string;

  @IsUUID()
  orgUnitId: string;

  @IsIn(TASK_PRIORITIES)
  priority: TaskPriority;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsString()
  description?: string;
}
