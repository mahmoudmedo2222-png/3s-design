import { IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

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
}
