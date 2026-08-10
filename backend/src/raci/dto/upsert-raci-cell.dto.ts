import { Type } from 'class-transformer';
import { IsArray, IsIn, IsOptional, IsUUID, ValidateNested } from 'class-validator';
import { ROLE_LETTERS } from '../role-letter';
import type { RoleLetter } from '../role-letter';

export class RaciTagDto {
  @IsIn(ROLE_LETTERS)
  roleLetter: RoleLetter;

  @IsOptional()
  @IsUUID()
  fixedRollbackStepId?: string;
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
