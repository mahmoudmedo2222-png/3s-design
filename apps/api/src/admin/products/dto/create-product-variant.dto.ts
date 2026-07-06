import { IsArray, IsBoolean, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class CreateProductVariantDto {
  @IsString()
  @MaxLength(160)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  fileFormats: string[] = [];

  @IsOptional()
  @IsArray()
  dimensions: Array<{ label: string; width?: number; height?: number; unit?: string }> = [];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  softwareCompatibility: string[] = [];

  @IsOptional()
  @IsString()
  priceDelta = '0';

  @IsOptional()
  @IsBoolean()
  isDefault = false;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10000)
  sortOrder = 0;
}
