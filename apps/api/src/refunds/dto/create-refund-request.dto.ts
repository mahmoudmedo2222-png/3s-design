import { IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateRefundRequestDto {
  @IsUUID()
  orderId!: string;

  @IsString()
  @MinLength(20)
  @MaxLength(1200)
  reason!: string;
}
