import assert from 'node:assert/strict';
import test from 'node:test';
import { RefundsService } from '../src/refunds/refunds.service';

void test('refund policy: approve is conditional on the request still being open', async () => {
  const inserts: unknown[] = [];
  const request = {
    id: 'refund-request-1',
    orderId: 'order-1',
    status: 'requested',
  };
  const payment = {
    id: 'payment-1',
    orderId: 'order-1',
    status: 'paid',
    amount: '25.00',
    currency: 'USD',
  };
  let selectCount = 0;
  const selectChain = {
    from: () => selectChain,
    where: () => selectChain,
    orderBy: () => selectChain,
    limit: async () => (selectCount++ === 0 ? [request] : [payment]),
  };
  const tx = {
    update: () => ({
      set: () => ({
        where: () => ({
          returning: async () => [],
        }),
      }),
    }),
    insert: () => ({
      values: (value: unknown) => {
        inserts.push(value);
      },
    }),
  };
  const db = {
    select: () => selectChain,
    transaction: async (callback: (value: typeof tx) => Promise<unknown>) => callback(tx),
  };
  const service = new RefundsService(
    { requireDb: () => db } as never,
    {
      record: async () => undefined,
    } as never,
  );

  await assert.rejects(
    () => service.approveRefundRequest('refund-request-1', 'admin-1', { adminPassword: 'StrongPass1234' }),
    /Refund request is not open/,
  );
  assert.equal(inserts.length, 0);
});
