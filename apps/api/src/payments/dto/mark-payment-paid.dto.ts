import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class MarkPaymentPaidDto {
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  adminPassword!: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  providerPaymentId?: string;
}
