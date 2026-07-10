import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const srcDir = path.resolve(process.cwd(), 'src');

void test('service transaction policy: checkout serializes cart-to-order conversion per user', async () => {
  const source = await readFile(path.join(srcDir, 'orders/orders.service.ts'), 'utf8');
  const checkoutLock = source.indexOf('pg_advisory_xact_lock(hashtext(${`checkout:${userId}`}))');
  const cartRead = source.indexOf('const cart = await this.getOrCreateCart(userId, tx)');
  const cartClear = source.indexOf('await tx.delete(cartItems).where(eq(cartItems.cartId, cart.id))');

  assert.ok(checkoutLock >= 0, 'Checkout must take a per-user transaction lock before reading cart lines.');
  assert.ok(cartRead > checkoutLock, 'Checkout cart read must happen after the transaction lock.');
  assert.ok(cartClear > cartRead, 'Checkout must clear the same locked cart after order item creation.');
});

void test('service transaction policy: downloads serialize and conditionally increment entitlement usage', async () => {
  const source = await readFile(path.join(srcDir, 'downloads/downloads.service.ts'), 'utf8');
  const downloadLock = source.indexOf('pg_advisory_xact_lock(hashtext(${`download:${entitlementId}`}))');
  const conditionalIncrement = source.indexOf('sql`${entitlements.downloadsUsed} < ${maxDownloads}`');
  const allowedEvent = source.indexOf("recordDownloadEvent(tx, entitlement.id, userId, asset.id, 'allowed'");

  assert.ok(downloadLock >= 0, 'Download URL creation must take a per-entitlement transaction lock.');
  assert.ok(conditionalIncrement > downloadLock, 'Download usage increment must remain conditional after the lock.');
  assert.ok(allowedEvent > conditionalIncrement, 'Allowed download events must be recorded only after usage is incremented.');
});

void test('service transaction policy: payment state transitions are conditional', async () => {
  const source = await readFile(path.join(srcDir, 'payments/payments.service.ts'), 'utf8');

  assert.ok(
    source.includes("inArray(payments.status, ['pending', 'failed', 'expired'])"),
    'Mark-paid must only transition from pending/failed/expired inside the update predicate.',
  );
  assert.ok(
    source.includes("where(and(eq(payments.id, payment.id), eq(payments.status, 'pending')))"),
    'Mark-failed must only transition from pending inside the update predicate.',
  );
});

void test('service transaction policy: payment webhooks serialize event processing', async () => {
  const paymentSource = await readFile(path.join(srcDir, 'payments/payments.service.ts'), 'utf8');
  const downloadsSource = await readFile(path.join(srcDir, 'downloads/downloads.service.ts'), 'utf8');
  const auditSource = await readFile(path.join(srcDir, 'audit/audit.service.ts'), 'utf8');

  const webhookLock = paymentSource.indexOf('pg_advisory_xact_lock(hashtext(${`payment-webhook:${provider}:${event.eventId}`}))');
  const eventInsert = paymentSource.indexOf('.insert(paymentWebhookEvents)');
  const processWithTx = paymentSource.indexOf('await this.processProviderWebhook(provider, event, tx)');
  const markProcessed = paymentSource.indexOf('isNull(paymentWebhookEvents.processedAt)');
  const grantWithExecutor = paymentSource.indexOf('grantEntitlementsForPaidOrder(payment.orderId, executor)');
  const auditCall = paymentSource.indexOf('await this.audit.record(', grantWithExecutor);
  const auditWithExecutor = paymentSource.indexOf('executor,', auditCall);

  assert.ok(webhookLock >= 0, 'Webhook processing must take a per-provider/event transaction lock.');
  assert.ok(eventInsert > webhookLock, 'Webhook event persistence must happen after the event lock.');
  assert.ok(processWithTx > webhookLock, 'Webhook payment processing must use the same transaction executor.');
  assert.ok(markProcessed > webhookLock, 'Webhook processedAt must be set conditionally inside the locked transaction.');
  assert.ok(grantWithExecutor > processWithTx, 'Paid webhook delivery unlock must use the webhook transaction executor.');
  assert.ok(auditWithExecutor > auditCall, 'Webhook-triggered payment audit writes must use the webhook transaction executor.');
  assert.ok(
    downloadsSource.includes('async grantEntitlementsForPaidOrder(orderId: string, executor = this.database.requireDb())'),
    'Entitlement grants must accept a caller transaction executor.',
  );
  assert.ok(
    auditSource.includes('async record(input: AuditPayload, executor = this.database.requireDb())'),
    'Audit records must accept a caller transaction executor.',
  );
});
