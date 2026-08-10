import { IsIn, IsOptional, IsString, Matches } from 'class-validator';
import { TASK_PRIORITIES } from '../../tasks/task-status';
import type { TaskPriority } from '../../tasks/task-status';

export class UpdateTicketDto {
  /** "Change Maintenance" (US 2.2) — move the job to a different date. */
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'dueDate phải có dạng YYYY-MM-DD' })
  dueDate?: string;

  @IsOptional()
  @IsIn(TASK_PRIORITIES as unknown as string[])
  priority?: TaskPriority;

  @IsOptional()
  @IsString()
  note?: string;
}
