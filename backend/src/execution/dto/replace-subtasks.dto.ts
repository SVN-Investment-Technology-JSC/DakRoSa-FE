import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsNumber, IsOptional, IsString, IsUUID, Max, Min, ValidateNested } from 'class-validator';

export class SubtaskInputDto {
  @IsUUID()
  assigneeUserId: string;

  @IsString()
  title: string;

  /**
   * Percentage of the parent Node E. Omit on every row to let the server split
   * evenly (BRD 2 US 1.3 AC1); supply on every row for a manual split, which
   * must then total exactly 100 (AC2).
   */
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(100)
  weight?: number;
}

export class ReplaceSubtasksDto {
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => SubtaskInputDto)
  subtasks: SubtaskInputDto[];
}
