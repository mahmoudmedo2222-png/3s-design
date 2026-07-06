import { IsIn, IsInt, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';
import { allowedAssetTypes } from '../asset-upload-policy';
import type { UploadAssetType } from '../asset-upload-policy';

export class CreateAssetUploadUrlDto {
  @IsUUID()
  productId!: string;

  @IsOptional()
  @IsUUID()
  variantId?: string;

  @IsIn([...allowedAssetTypes])
  assetType!: UploadAssetType;

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
  @IsString()
  @MaxLength(128)
  checksum?: string;
}
