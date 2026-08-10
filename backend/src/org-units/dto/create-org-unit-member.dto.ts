import { IsUUID } from 'class-validator';

export class CreateOrgUnitMemberDto {
  @IsUUID()
  orgUnitId: string;

  @IsUUID()
  userId: string;

  @IsUUID()
  positionId: string;
}
