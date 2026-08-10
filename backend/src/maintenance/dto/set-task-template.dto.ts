import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

/** Một dòng của "Danh sách nhiệm vụ" (BRD 3 US 2.1 AC2). */
export class EquipmentTaskItemDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  title: string;

  /** "Thời gian thực hiện từng nhiệm vụ", tính bằng phút. Trần = 30 ngày. */
  @IsInt()
  @Min(1)
  @Max(43200)
  durationMinutes: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class SetTaskTemplateDto {
  /** Gửi mảng rỗng để gỡ toàn bộ cấu hình công việc của thiết bị. */
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => EquipmentTaskItemDto)
  tasks: EquipmentTaskItemDto[];
}
