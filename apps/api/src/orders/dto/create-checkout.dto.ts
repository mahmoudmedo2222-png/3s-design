import { Type } from 'class-transformer';
import { IsObject, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';

export class CheckoutAttributionDto {
  @IsOptional()
  @IsString()
  @MaxLength(180)
  source?: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  campaign?: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  medium?: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  intent?: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  brief?: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  referrer?: string;

  @IsOptional()
  @IsString()
  @MaxLength(260)
  landingPath?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  firstSeenAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  lastSeenAt?: string;
}

export class CreateCheckoutDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  idempotencyKey?: string;

  @IsOptional()
  @IsObject()
  billing?: {
    country?: string;
    city?: string;
    preferredCurrency?: string;
  };

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => CheckoutAttributionDto)
  attribution?: CheckoutAttributionDto;
}
