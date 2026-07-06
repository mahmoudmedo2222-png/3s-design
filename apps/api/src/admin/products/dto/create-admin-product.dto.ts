import { IsBoolean, IsNumberString, IsOptional, IsString, Length, MaxLength } from 'class-validator';

export class CreateAdminProductDto {
  @IsString()
  @Length(3, 160)
  title!: string;

  @IsString()
  @Length(3, 180)
  slug!: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  subtitle?: string;

  @IsString()
  @Length(10, 10000)
  description!: string;

  @IsNumberString()
  basePrice!: string;

  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency = 'USD';

  @IsOptional()
  @IsString()
  status = 'draft';

  @IsOptional()
  @IsBoolean()
  isFeatured = false;
}
