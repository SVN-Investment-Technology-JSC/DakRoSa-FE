import { IsBoolean, IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { ASSET_CONDITIONS } from '../asset';
import type { AssetCondition } from '../asset';

/**
 * Không cho sửa `parentId`/`assetKind` qua đây: đổi cha là chuyển nhánh cả một
 * cây con và phải kiểm lại cấp bậc của mọi hậu duệ — một thao tác riêng, không
 * phải một field của form sửa thông tin.
 */
export class UpdatePartDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

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
