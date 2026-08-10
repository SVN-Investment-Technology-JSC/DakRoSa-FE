import { IsIn, IsOptional, IsUUID } from 'class-validator';
import { ROLE_LETTERS } from '../../raci/role-letter';
import type { RoleLetter } from '../../raci/role-letter';

export class DelegateStepDto {
  @IsUUID()
  toUserId: string;

  /** Only needed if the caller holds both R and C on this step. */
  @IsOptional()
  @IsIn(ROLE_LETTERS)
  roleLetter?: RoleLetter;
}
