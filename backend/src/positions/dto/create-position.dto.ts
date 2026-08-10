import { IsInt, IsOptional, IsString } from 'class-validator';

export class CreatePositionDto {
  @IsString()
  code: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsInt()
  rank?: number;
}
