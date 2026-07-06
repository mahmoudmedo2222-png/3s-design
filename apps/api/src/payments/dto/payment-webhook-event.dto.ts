import { IsIn, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export const paymentWebhookStatuses = ['paid', 'failed'] as const;

export type PaymentWebhookStatus = (typeof paymentWebhookStatuses)[number];

export class PaymentWebhookEventDto {
  @IsString()
  @MaxLength(180)
  eventId!: string;

  @IsString()
  @MaxLength(120)
  eventType!: string;

  @IsString()
  @MaxLength(180)
  providerPaymentId!: string;

  @IsIn([...paymentWebhookStatuses])
  status!: PaymentWebhookStatus;

  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;
}
