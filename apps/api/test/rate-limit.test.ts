import assert from 'node:assert/strict';
import test from 'node:test';
import { HttpException } from '@nestjs/common';
import { RateLimitService } from '../src/rate-limit/rate-limit.service';

function createService(existingCount: number) {
  let inserted = false;
  let locked = false;
  const service = new RateLimitService({
    requireDb: () => ({
      transaction: async (callback: (tx: unknown) => Promise<void>) =>
        callback({
          execute: async () => {
            locked = true;
          },
          select: () => ({
            from: () => ({
              where: async () => [{ count: existingCount }],
            }),
          }),
          insert: () => ({
            values: async () => {
              inserted = true;
            },
          }),
        }),
    }),
  } as never);

  return {
    service,
    state: () => ({ inserted, locked }),
  };
}

void test('rate limit: records usage when the key is below the limit', async () => {
  const { service, state } = createService(2);

  await service.assertAllowed({
    key: 'ip:127.0.0.1',
    action: 'payments.webhook',
    limit: 3,
    windowMs: 60_000,
  });

  assert.deepEqual(state(), { inserted: true, locked: true });
});

void test('rate limit: rejects requests at the configured limit', async () => {
  const { service, state } = createService(3);

  await assert.rejects(
    () =>
      service.assertAllowed({
        key: 'ip:127.0.0.1',
        action: 'payments.webhook',
        limit: 3,
        windowMs: 60_000,
      }),
    (error) => error instanceof HttpException && error.getStatus() === 429,
  );

  assert.deepEqual(state(), { inserted: false, locked: true });
});
