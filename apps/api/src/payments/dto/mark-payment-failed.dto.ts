import { IsString, MaxLength, MinLength } from 'class-validator';

export class MarkPaymentFailedDto {
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  adminPassword!: string;
}
