import { Body, Controller, Headers, Inject, Param, Post, Query } from '@nestjs/common';
import { PaymentsService } from './payments.service';

@Controller('webhooks/payments')
export class PaymentWebhooksController {
  constructor(@Inject(PaymentsService) private readonly payments: PaymentsService) {}

  @Post(':provider')
  handleWebhook(
    @Param('provider') provider: string,
    @Headers('x-webhook-secret') secret: string | undefined,
    @Query('hmac') hmac: string | undefined,
    @Body() input: Record<string, unknown>,
  ) {
    return this.payments.handleProviderWebhook(provider, input, secret, hmac);
  }
}
