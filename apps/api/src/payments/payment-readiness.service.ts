import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { paymentProviders } from './payment-providers';
import type { PaymentProvider } from './payment-providers';

@Injectable()
export class PaymentReadinessService {
  constructor(@Inject(ConfigService) private readonly config: ConfigService) {}

  getProvidersReadiness() {
    return {
      items: paymentProviders.map((provider) => this.getProviderReadiness(provider)),
    };
  }

  getProviderReadiness(provider: PaymentProvider) {
    if (provider === 'manual') {
      return {
        provider,
        configured: true,
        mode: 'manual_review',
        missing: [] as string[],
        blocking: [] as string[],
        riskLevel: 'controlled',
        nextAction: 'Manual review is available as a fallback. Use provider checkout when a live provider is configured.',
      };
    }

    const required = this.providerRequiredEnv(provider);
    const missing = required.filter((key) => !this.config.get<string>(key));
    const blocking = this.providerBlockingReadiness(provider, missing);

    return {
      provider,
      configured: missing.length === 0,
      mode: 'provider_checkout',
      missing,
      blocking,
      riskLevel: blocking.length ? 'blocked' : 'ready',
      nextAction: blocking.length
        ? this.providerNextAction(provider, blocking)
        : `${provider} checkout is ready for sandbox/live verification.`,
    };
  }

  private providerBlockingReadiness(provider: PaymentProvider, missing: string[]) {
    if (provider === 'paymob') {
      return missing.filter((key) =>
        ['PAYMOB_API_KEY', 'PAYMOB_INTEGRATION_ID_CARD', 'PAYMOB_IFRAME_ID', 'PAYMOB_HMAC_SECRET'].includes(key),
      );
    }

    return missing;
  }

  private providerNextAction(provider: PaymentProvider, blocking: string[]) {
    if (provider === 'paymob') {
      return `Add ${blocking.join(', ')} to enable Paymob sandbox checkout and verified webhooks.`;
    }

    return `Add ${blocking.join(', ')} to enable ${provider} checkout.`;
  }

  private providerRequiredEnv(provider: PaymentProvider) {
    if (provider === 'manual') {
      return [];
    }

    if (provider === 'paymob') {
      return ['PAYMOB_API_KEY', 'PAYMOB_INTEGRATION_ID_CARD', 'PAYMOB_IFRAME_ID', 'PAYMOB_HMAC_SECRET'];
    }

    return [`${provider.toUpperCase()}_CHECKOUT_URL_TEMPLATE`, `PAYMENT_WEBHOOK_SECRET_${provider.toUpperCase()}`];
  }
}
