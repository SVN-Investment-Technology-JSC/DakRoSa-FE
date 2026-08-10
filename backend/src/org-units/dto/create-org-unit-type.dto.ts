import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateOrgUnitTypeDto {
  @IsString()
  code: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  colorClass?: string;

  @IsOptional()
  @IsString()
  hexColor?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  defaultRank?: number;
}
