import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateLicenseDto {
  @IsString()
  @MaxLength(80)
  licenseType!: string;

  @IsString()
  @MaxLength(160)
  name!: string;

  @IsString()
  @MaxLength(1000)
  description!: string;

  @IsOptional()
  @IsString()
  priceMultiplier = '1';

  @IsOptional()
  @IsBoolean()
  allowsCommercialUse = false;

  @IsOptional()
  @IsBoolean()
  allowsResale = false;

  @IsOptional()
  @IsBoolean()
  allowsModification = true;

  @IsString()
  termsMarkdown!: string;
}
