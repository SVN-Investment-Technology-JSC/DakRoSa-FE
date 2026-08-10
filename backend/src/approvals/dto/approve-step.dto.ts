import { IsIn, IsOptional, IsString } from 'class-validator';
import { ROLE_LETTERS } from '../../raci/role-letter';
import type { RoleLetter } from '../../raci/role-letter';

export class ApproveStepDto {
  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsIn(ROLE_LETTERS)
  roleLetter?: RoleLetter;
}
