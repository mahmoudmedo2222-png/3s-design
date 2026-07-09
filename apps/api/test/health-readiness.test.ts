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
