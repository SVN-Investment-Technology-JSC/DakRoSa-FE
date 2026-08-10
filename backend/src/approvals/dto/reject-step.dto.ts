import { IsIn, IsOptional, IsString, IsUUID } from 'class-validator';
import { ROLE_LETTERS } from '../../raci/role-letter';
import type { RoleLetter } from '../../raci/role-letter';

export class RejectStepDto {
  @IsString()
  notes: string;

  /** Required (and validated against valid-rollback-targets) only when acting as Role A. Ignored for Role C. */
  @IsOptional()
  @IsUUID()
  targetStepId?: string;

  @IsOptional()
  @IsIn(ROLE_LETTERS)
  roleLetter?: RoleLetter;
}
