import { IsBoolean, IsInt, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateOrgUnitDto {
  @IsOptional()
  @IsUUID()
  parentId?: string;

  @IsUUID()
  typeId: string;

  @IsString()
  title: string;

  @IsOptional()
  @IsUUID()
  headUserId?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}
