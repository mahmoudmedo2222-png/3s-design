import { Body, Controller, Headers, Inject, Param, Post, Query, Req } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { RequestWithUser } from '../auth/auth.types';
import { RateLimitService } from '../rate-limit/rate-limit.service';
import { PaymentsService } from './payments.service';

@Controller('webhooks/payments')
export class PaymentWebhooksController {
  constructor(
    @Inject(PaymentsService) private readonly payments: PaymentsService,
    @Inject(RateLimitService) private readonly rateLimit: RateLimitService,
    @Inject(ConfigService) private readonly config: ConfigService,
  ) {}

  @Post(':provider')
  async handleWebhook(
    @Param('provider') provider: string,
    @Headers('x-webhook-secret') secret: string | undefined,
    @Query('hmac') hmac: string | undefined,
    @Body() input: Record<string, unknown>,
    @Req() request: RequestWithUser,
  ) {
    await this.rateLimit.assertAllowed({
      key: `ip:${this.getIpAddress(request) ?? 'unknown'}:provider:${provider}`,
      action: 'payments.webhook',
      limit: this.numberConfig('WEBHOOK_RATE_LIMIT_MAX', 30),
      windowMs: this.numberConfig('WEBHOOK_RATE_LIMIT_WINDOW_SECONDS', 60) * 1000,
    });

    return this.payments.handleProviderWebhook(provider, input, secret, hmac);
  }

  private getIpAddress(request: RequestWithUser) {
    const forwardedFor = this.getHeader(request, 'x-forwarded-for');
    return forwardedFor?.split(',')[0]?.trim();
  }

  private getHeader(request: RequestWithUser, name: string) {
    const value = request.headers[name];
    return Array.isArray(value) ? value[0] : value;
  }

  private numberConfig(name: string, fallback: number) {
    const value = Number(this.config.get<string>(name) ?? fallback);
    return Number.isFinite(value) ? value : fallback;
  }
}
