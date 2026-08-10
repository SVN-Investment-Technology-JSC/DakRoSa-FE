import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsOptional,
  IsUUID,
  Matches,
  ValidateNested,
} from 'class-validator';
import { MAINTENANCE_FREQUENCIES } from '../maintenance-frequency';
import type { MaintenanceFrequency } from '../maintenance-frequency';

export class ScheduleInputDto {
  @IsIn(MAINTENANCE_FREQUENCIES as unknown as string[])
  frequency: MaintenanceFrequency;

  /** Defaults to today when omitted (Q2 — the cycle is anchored on this date). */
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'anchorDate phải có dạng YYYY-MM-DD' })
  anchorDate?: string;

  @IsOptional()
  @IsUUID()
  workflowId?: string;
}

export class SetSchedulesDto {
  @IsArray()
  @ArrayMaxSize(MAINTENANCE_FREQUENCIES.length)
  @ValidateNested({ each: true })
  @Type(() => ScheduleInputDto)
  schedules: ScheduleInputDto[];
}
