import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { ASSET_CONDITIONS, ASSET_KINDS } from '../asset';
import type { AssetCondition, AssetKind } from '../asset';

export class CreatePartDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  code: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  /** Rỗng = node gốc của cây (Công ty). */
  @IsOptional()
  @IsUUID()
  parentId?: string;

  /** Mặc định `part` để lối tạo thiết bị cũ (không khai loại) vẫn chạy y nguyên. */
  @IsOptional()
  @IsIn(ASSET_KINDS as unknown as string[])
  assetKind?: AssetKind;

  /** Không bắt buộc: node Công ty / Nhà máy có thể chưa gắn đơn vị phụ trách. */
  @IsOptional()
  @IsUUID()
  orgUnitId?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  symbol?: string;

  @IsOptional()
  @IsIn(ASSET_CONDITIONS as unknown as string[])
  condition?: AssetCondition;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string;

  @IsOptional()
  @IsString()
  specifications?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  manufacturer?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
