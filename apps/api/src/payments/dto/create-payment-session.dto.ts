import { IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { paymentProviders } from '../payment-providers';
import type { PaymentProvider } from '../payment-providers';

export class CreatePaymentSessionDto {
  @IsUUID()
  orderId!: string;

  @IsIn([...paymentProviders])
  provider!: PaymentProvider;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  idempotencyKey?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  successUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  cancelUrl?: string;
}
