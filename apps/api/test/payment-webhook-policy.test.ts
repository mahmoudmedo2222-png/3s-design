import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import test from 'node:test';
import { BadRequestException, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
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

const paymobPayload = {
  obj: {
    amount_cents: 2800,
    created_at: '2026-07-09T12:00:00.000000',
    currency: 'EGP',
    error_occured: false,
    has_parent_transaction: false,
    id: 123456,
    integration_id: 98765,
    is_3d_secure: true,
    is_auth: false,
    is_capture: false,
    is_refunded: false,
    is_standalone_payment: true,
    is_voided: false,
    order: {
      id: 5555,
      merchant_order_id: 'paymob_test_payment',
    },
    owner: 112233,
    pending: false,
    source_data: {
      pan: '2346',
      sub_type: 'MasterCard',
      type: 'card',
    },
    success: true,
  },
};

function paymobHmac(secret: string) {
  const obj = paymobPayload.obj;
  const source = [
    obj.amount_cents,
    obj.created_at,
    obj.currency,
    obj.error_occured,
    obj.has_parent_transaction,
    obj.id,
    obj.integration_id,
    obj.is_3d_secure,
    obj.is_auth,
    obj.is_capture,
    obj.is_refunded,
    obj.is_standalone_payment,
    obj.is_voided,
    obj.order.id,
    obj.owner,
    obj.pending,
    obj.source_data.pan,
    obj.source_data.sub_type,
    obj.source_data.type,
    obj.success,
  ]
    .map(String)
    .join('');

  return createHmac('sha512', secret).update(source).digest('hex');
}

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

void test('payment webhook policy: paymob hmac must match', async () => {
  const service = createService({
    NODE_ENV: 'production',
    PAYMOB_HMAC_SECRET: 'expected-paymob-hmac-secret',
  });

  await assert.rejects(() => service.handleProviderWebhook('paymob', paymobPayload, undefined, 'bad-hmac'), UnauthorizedException);
});

void test('payment webhook policy: valid paymob hmac passes the authenticity gate', async () => {
  const service = createService({
    NODE_ENV: 'production',
    PAYMOB_HMAC_SECRET: 'expected-paymob-hmac-secret',
  });

  await assert.rejects(
    () => service.handleProviderWebhook('paymob', paymobPayload, undefined, paymobHmac('expected-paymob-hmac-secret')),
    /database should not be reached/,
  );
});

void test('payment webhook policy: paymob amount mismatch is rejected before delivery unlock', () => {
  const service = createService({
    NODE_ENV: 'production',
    PAYMOB_HMAC_SECRET: 'expected-paymob-hmac-secret',
  });

  assert.throws(
    () =>
      (
        service as unknown as {
          assertProviderWebhookMatchesPayment(provider: string, input: unknown, payment: unknown): void;
        }
      ).assertProviderWebhookMatchesPayment(
        'paymob',
        {
          providerPaymentId: 'paymob_test_payment',
          status: 'paid',
          payload: paymobPayload,
        },
        {
          provider: 'paymob',
          providerPaymentId: 'paymob_test_payment',
          amount: '27.00',
          currency: 'EGP',
        },
      ),
    BadRequestException,
  );
});

void test('payment webhook policy: paymob currency mismatch is rejected before delivery unlock', () => {
  const service = createService({
    NODE_ENV: 'production',
    PAYMOB_HMAC_SECRET: 'expected-paymob-hmac-secret',
  });

  assert.throws(
    () =>
      (
        service as unknown as {
          assertProviderWebhookMatchesPayment(provider: string, input: unknown, payment: unknown): void;
        }
      ).assertProviderWebhookMatchesPayment(
        'paymob',
        {
          providerPaymentId: 'paymob_test_payment',
          status: 'paid',
          payload: paymobPayload,
        },
        {
          provider: 'paymob',
          providerPaymentId: 'paymob_test_payment',
          amount: '28.00',
          currency: 'USD',
        },
      ),
    BadRequestException,
  );
});
