import { IsBoolean, IsInt, IsOptional, IsString, IsUUID } from 'class-validator';

export class UpdateOrgUnitDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsUUID()
  headUserId?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}
