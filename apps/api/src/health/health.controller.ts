import { Controller, Get, Inject } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { PaymentReadinessService } from '../payments/payment-readiness.service';

@Controller('health')
export class HealthController {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(PaymentReadinessService) private readonly paymentReadiness?: PaymentReadinessService,
  ) {}

  @Get()
  health() {
    return {
      ok: true,
      service: 'api',
      databaseConfigured: this.database.isConfigured,
    };
  }

  @Get('ready')
  async ready() {
    await this.database.ping();

    return {
      ok: true,
      service: 'api',
      database: 'ready',
    };
  }

  @Get('beta-readiness')
  betaReadiness() {
    const paymentProviders = this.paymentReadiness?.getProvidersReadiness().items ?? [];
    const providerCheckoutReady = paymentProviders.some((item) => item.mode === 'provider_checkout' && item.configured);
    const blockers = paymentProviders
      .filter((item) => item.mode === 'provider_checkout' && item.blocking.length)
      .map((item) => ({
        provider: item.provider,
        blocking: item.blocking,
        nextAction: item.nextAction,
      }));

    return {
      ok: this.database.isConfigured && providerCheckoutReady,
      service: 'api',
      databaseConfigured: this.database.isConfigured,
      providerCheckoutReady,
      paymentProviders,
      blockers,
      checkedAt: new Date().toISOString(),
    };
  }
}
