import { IsBoolean, IsIn, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';
import { allowedAssetTypes } from '../../assets/asset-upload-policy';

const assetStatuses = ['uploaded', 'processing', 'ready', 'rejected'] as const;
const scanStatuses = ['pending', 'passed', 'failed', 'skipped'] as const;

export class CreateProductAssetDto {
  @IsOptional()
  @IsUUID()
  variantId?: string;

  @IsString()
  @IsIn([...allowedAssetTypes])
  @MaxLength(80)
  assetType!: string;

  @IsString()
  @MaxLength(500)
  storageKey!: string;

  @IsString()
  @MaxLength(240)
  fileName!: string;

  @IsString()
  @MaxLength(120)
  mimeType!: string;

  @IsInt()
  @Min(1)
  fileSize!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  width?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  height?: number;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  checksum?: string;

  @IsOptional()
  @IsString()
  @IsIn([...assetStatuses])
  assetStatus = 'ready';

  @IsOptional()
  @IsString()
  @IsIn([...scanStatuses])
  scanStatus = 'skipped';

  @IsOptional()
  @IsString()
  @MaxLength(240)
  altText?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10000)
  sortOrder = 0;

  @IsOptional()
  @IsBoolean()
  isPrimary = false;

  @IsOptional()
  @IsBoolean()
  isPublicPreview = false;
}
