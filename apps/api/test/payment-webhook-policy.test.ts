import assert from 'node:assert/strict';
import test from 'node:test';
import { ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { PaymentsService } from '../src/payments/payments.service';

function createService(config: Record<string, string | undefined>) {
  const database = {
    requireDb() {
      throw new Error('database should not be reached before webhook secret policy passes');
    },
  };

  const downloads = {};
  const audit = {};
  const configService = {
    get(key: string) {
      return config[key];
    },
  };

  return new PaymentsService(database as never, downloads as never, audit as never, configService as never);
}

const validWebhook = {
  eventId: 'evt_test',
  eventType: 'payment.paid',
  providerPaymentId: 'manual_test',
  status: 'paid' as const,
};

void test('payment webhook policy: production fails closed when provider secret is missing', async () => {
  const service = createService({ NODE_ENV: 'production' });

  await assert.rejects(() => service.handleProviderWebhook('manual', validWebhook, undefined), ServiceUnavailableException);
});

void test('payment webhook policy: configured provider secret must match', async () => {
  const service = createService({
    NODE_ENV: 'production',
    PAYMENT_WEBHOOK_SECRET_MANUAL: 'expected-secret',
  });

  await assert.rejects(() => service.handleProviderWebhook('manual', validWebhook, 'wrong-secret'), UnauthorizedException);
});
