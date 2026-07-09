import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class ResolveRefundRequestDto {
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  adminPassword!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1200)
  adminNote?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  providerRefundId?: string;
}
