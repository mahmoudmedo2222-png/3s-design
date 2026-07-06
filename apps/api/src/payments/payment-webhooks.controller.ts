import { Body, Controller, Headers, Inject, Param, Post } from '@nestjs/common';
import { PaymentWebhookEventDto } from './dto/payment-webhook-event.dto';
import { PaymentsService } from './payments.service';

@Controller('webhooks/payments')
export class PaymentWebhooksController {
  constructor(@Inject(PaymentsService) private readonly payments: PaymentsService) {}

  @Post(':provider')
  handleWebhook(
    @Param('provider') provider: string,
    @Headers('x-webhook-secret') secret: string | undefined,
    @Body() input: PaymentWebhookEventDto,
  ) {
    return this.payments.handleProviderWebhook(provider, input, secret);
  }
}
