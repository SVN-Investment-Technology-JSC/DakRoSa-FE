import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsIn, IsOptional, IsUUID, ValidateNested } from 'class-validator';
import { ROLE_LETTERS } from '../role-letter';
import type { RoleLetter } from '../role-letter';
import { E_TASK_SOURCES } from '../e-task-source';
import type { ETaskSource } from '../e-task-source';
import { EquipmentTaskItemDto } from '../../maintenance/dto/set-task-template.dto';

export class RaciTagDto {
  @IsIn(ROLE_LETTERS)
  roleLetter: RoleLetter;

  @IsOptional()
  @IsUUID()
  fixedRollbackStepId?: string;

  /** BRD 3 US 3.1 AC2 — chỉ có nghĩa khi `roleLetter = 'E'`. */
  @IsOptional()
  @IsIn(E_TASK_SOURCES as unknown as string[])
  eTaskSource?: ETaskSource;

  /** Bắt buộc (và chỉ dùng) khi `eTaskSource = 'task_list'`. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => EquipmentTaskItemDto)
  eTaskList?: EquipmentTaskItemDto[];
}

export class UpsertRaciCellDto {
  /** The org unit these tags anchor to (any level). Always required. */
  @IsUUID()
  orgUnitId: string;

  /** Narrow the target to holders of this position within `orgUnitId`. Mutually exclusive with userId. */
  @IsOptional()
  @IsUUID()
  positionId?: string;

  /** Narrow the target to exactly this person. Mutually exclusive with positionId. */
  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RaciTagDto)
  tags: RaciTagDto[];
}
