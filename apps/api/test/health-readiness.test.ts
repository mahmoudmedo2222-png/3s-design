import assert from 'node:assert/strict';
import test from 'node:test';
import { HealthController } from '../src/health/health.controller';

void test('health readiness: ready pings the database before returning ok', async () => {
  let pinged = false;
  const controller = new HealthController({
    isConfigured: true,
    ping: async () => {
      pinged = true;
    },
  } as never);

  const result = await controller.ready();

  assert.equal(pinged, true);
  assert.deepEqual(result, {
    ok: true,
    service: 'api',
    database: 'ready',
  });
});

void test('health readiness: failed database ping prevents ready response', async () => {
  const controller = new HealthController({
    isConfigured: true,
    ping: async () => {
      throw new Error('database unavailable');
    },
  } as never);

  await assert.rejects(() => controller.ready(), /database unavailable/);
});

void test('health beta readiness: blocks beta when only manual payment is ready', () => {
  const controller = new HealthController(
    {
      isConfigured: true,
      ping: async () => undefined,
    } as never,
    {
      getProvidersReadiness: () => ({
        items: [
          {
            provider: 'manual',
            configured: true,
            mode: 'manual_review',
            missing: [],
            blocking: [],
            riskLevel: 'controlled',
            nextAction: 'Manual review is available as a fallback.',
          },
          {
            provider: 'paymob',
            configured: false,
            mode: 'provider_checkout',
            missing: ['PAYMOB_API_KEY'],
            blocking: ['PAYMOB_API_KEY'],
            riskLevel: 'blocked',
            nextAction: 'Add PAYMOB_API_KEY to enable Paymob sandbox checkout and verified webhooks.',
          },
        ],
      }),
    } as never,
  );

  const result = controller.betaReadiness();

  assert.equal(result.ok, false);
  assert.equal(result.providerCheckoutReady, false);
  assert.deepEqual(result.blockers, [
    {
      provider: 'paymob',
      blocking: ['PAYMOB_API_KEY'],
      nextAction: 'Add PAYMOB_API_KEY to enable Paymob sandbox checkout and verified webhooks.',
    },
  ]);
  assert.match(result.checkedAt, /^\d{4}-\d{2}-\d{2}T/);
});

void test('health beta readiness: passes when database and provider checkout are ready', () => {
  const controller = new HealthController(
    {
      isConfigured: true,
      ping: async () => undefined,
    } as never,
    {
      getProvidersReadiness: () => ({
        items: [
          {
            provider: 'paymob',
            configured: true,
            mode: 'provider_checkout',
            missing: [],
            blocking: [],
            riskLevel: 'ready',
            nextAction: 'paymob checkout is ready for sandbox/live verification.',
          },
        ],
      }),
    } as never,
  );

  const result = controller.betaReadiness();

  assert.equal(result.ok, true);
  assert.equal(result.providerCheckoutReady, true);
  assert.deepEqual(result.blockers, []);
});
