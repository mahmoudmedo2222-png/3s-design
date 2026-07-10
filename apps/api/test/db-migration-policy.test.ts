import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

type Journal = {
  entries: Array<{
    idx: number;
    tag: string;
  }>;
};

const drizzleDir = path.resolve(process.cwd(), '../../packages/db/drizzle');
const metaDir = path.join(drizzleDir, 'meta');

void test('db migration policy: SQL files and journal entries stay in sync', async () => {
  const [drizzleFiles, journalText] = await Promise.all([readdir(drizzleDir), readFile(path.join(metaDir, '_journal.json'), 'utf8')]);
  const journal = JSON.parse(journalText) as Journal;
  const sqlTags = drizzleFiles.filter((file) => /^\d{4}_.+\.sql$/.test(file)).map((file) => file.replace(/\.sql$/, ''));
  const journalTags = journal.entries.map((entry) => entry.tag);

  assert.deepEqual([...sqlTags].sort(), [...journalTags].sort(), 'Every migration SQL file must have exactly one matching journal entry.');

  const latest = journal.entries.at(-1);
  assert.ok(latest, 'Journal must have at least one migration entry.');
  assert.ok(await fileExists(path.join(metaDir, `${String(latest.idx).padStart(4, '0')}_snapshot.json`)));
});

async function fileExists(filePath: string) {
  try {
    await readFile(filePath);
    return true;
  } catch {
    return false;
  }
}

void test('db migration policy: cart uniqueness migration cleans duplicates before adding indexes', async () => {
  const migration = await readFile(path.join(drizzleDir, '0009_woozy_rictor.sql'), 'utf8');
  const cartsCleanup = migration.indexOf('DELETE FROM "carts"');
  const cartItemsCleanup = migration.indexOf('DELETE FROM "cart_items"');
  const cartItemsReassignment = migration.indexOf('UPDATE "cart_items"');
  const noVariantUniqueIndex = migration.indexOf('CREATE UNIQUE INDEX "cart_items_cart_product_no_variant_license_idx"');
  const variantUniqueIndex = migration.indexOf('CREATE UNIQUE INDEX "cart_items_cart_product_variant_license_not_null_idx"');
  const cartsUniqueIndex = migration.indexOf('CREATE UNIQUE INDEX "carts_user_id_idx"');

  assert.ok(cartItemsCleanup >= 0, 'Cart uniqueness migration must remove duplicate cart items before unique indexes.');
  assert.ok(cartItemsReassignment >= 0, 'Cart uniqueness migration must reassign duplicate cart items to the kept cart.');
  assert.ok(cartsCleanup >= 0, 'Cart uniqueness migration must remove duplicate carts before the unique user index.');
  assert.ok(noVariantUniqueIndex >= 0, 'Cart uniqueness migration must add the no-variant cart item unique index.');
  assert.ok(variantUniqueIndex >= 0, 'Cart uniqueness migration must add the non-null variant cart item unique index.');
  assert.ok(cartsUniqueIndex >= 0, 'Cart uniqueness migration must create the carts_user_id_idx unique index.');
  assert.ok(cartItemsCleanup < noVariantUniqueIndex, 'Cart item cleanup must run before no-variant cart item uniqueness is created.');
  assert.ok(cartItemsCleanup < variantUniqueIndex, 'Cart item cleanup must run before non-null variant cart item uniqueness is created.');
  assert.ok(cartItemsCleanup < cartsUniqueIndex, 'Cart item cleanup must run before carts_user_id_idx is created.');
  assert.ok(cartItemsReassignment < cartsUniqueIndex, 'Cart item reassignment must run before carts_user_id_idx is created.');
  assert.ok(cartsCleanup < cartsUniqueIndex, 'Duplicate cart cleanup must run before carts_user_id_idx is created.');
});

void test('db migration policy: index migration protects dirty data before adding unique indexes', async () => {
  const migration = await readFile(path.join(drizzleDir, '0010_absurd_hammerhead.sql'), 'utf8');
  const storageDuplicateCheck = migration.indexOf('duplicate product_assets.storage_key values exist');
  const storageUniqueIndex = migration.indexOf('CREATE UNIQUE INDEX "product_assets_storage_key_idx"');
  const refundDuplicateCheck = migration.indexOf('duplicate open/approved refund requests exist');
  const refundUniqueIndex = migration.indexOf('CREATE UNIQUE INDEX "refund_requests_open_order_idx"');

  assert.ok(storageDuplicateCheck >= 0, 'Storage-key uniqueness migration must fail clearly when duplicate storage keys exist.');
  assert.ok(storageUniqueIndex >= 0, 'Storage-key uniqueness migration must create the storage key unique index.');
  assert.ok(refundDuplicateCheck >= 0, 'Refund uniqueness migration must fail clearly when duplicate open refund requests exist.');
  assert.ok(refundUniqueIndex >= 0, 'Refund uniqueness migration must create the open refund request unique index.');
  assert.ok(storageDuplicateCheck < storageUniqueIndex, 'Storage duplicate check must run before storage key uniqueness is created.');
  assert.ok(refundDuplicateCheck < refundUniqueIndex, 'Refund duplicate check must run before open refund uniqueness is created.');
  assert.equal(
    migration.includes('Auto-closed by migration'),
    false,
    'Financial/refund migrations must not auto-close customer requests without an explicit operational decision.',
  );
});

void test('db migration policy: status constraints preflight dirty data before checks', async () => {
  const migration = await readFile(path.join(drizzleDir, '0011_loving_whistler.sql'), 'utf8');
  const preflight = migration.indexOf('invalid product asset status values exist');
  const firstConstraint = migration.indexOf('ALTER TABLE "product_assets" ADD CONSTRAINT "product_assets_asset_status_check"');
  const expectedConstraints = [
    'product_assets_asset_status_check',
    'product_assets_scan_status_check',
    'products_status_check',
    'download_events_status_check',
    'orders_status_check',
    'payments_status_check',
    'refund_requests_status_check',
    'refunds_status_check',
  ];

  assert.ok(preflight >= 0, 'Status constraint migration must preflight invalid existing values.');
  assert.ok(firstConstraint >= 0, 'Status constraint migration must add check constraints.');
  assert.ok(preflight < firstConstraint, 'Status preflight must run before check constraints are added.');

  for (const constraint of expectedConstraints) {
    assert.ok(migration.includes(`ADD CONSTRAINT "${constraint}"`), `Missing status check constraint: ${constraint}`);
  }
});

void test('db migration policy: status check migration preflights existing dirty status values', async () => {
  const migration = await readFile(path.join(drizzleDir, '0011_loving_whistler.sql'), 'utf8');
  const preflight = migration.indexOf('invalid payment status values exist');
  const paymentCheck = migration.indexOf('ALTER TABLE "payments" ADD CONSTRAINT "payments_status_check"');
  const refundRequestPreflight = migration.indexOf('invalid refund request status values exist');
  const refundRequestCheck = migration.indexOf('ALTER TABLE "refund_requests" ADD CONSTRAINT "refund_requests_status_check"');
  const orderPreflight = migration.indexOf('invalid order status values exist');
  const orderCheck = migration.indexOf('ALTER TABLE "orders" ADD CONSTRAINT "orders_status_check"');

  assert.ok(preflight >= 0, 'Payment status check migration must fail clearly when dirty payment statuses exist.');
  assert.ok(refundRequestPreflight >= 0, 'Refund request status check migration must fail clearly when dirty refund statuses exist.');
  assert.ok(orderPreflight >= 0, 'Order status check migration must fail clearly when dirty order statuses exist.');
  assert.ok(preflight < paymentCheck, 'Payment status preflight must run before the payment status check constraint.');
  assert.ok(
    refundRequestPreflight < refundRequestCheck,
    'Refund request status preflight must run before the refund request status check constraint.',
  );
  assert.ok(orderPreflight < orderCheck, 'Order status preflight must run before the order status check constraint.');
});

void test('db migration policy: auth security indexes preflight duplicate token hashes', async () => {
  const migration = await readFile(path.join(drizzleDir, '0012_dashing_songbird.sql'), 'utf8');
  const sessionDuplicateCheck = migration.indexOf('duplicate refresh token hashes exist');
  const sessionUniqueIndex = migration.indexOf('CREATE UNIQUE INDEX "auth_sessions_refresh_token_hash_idx"');
  const verificationDuplicateCheck = migration.indexOf('duplicate verification token hashes exist');
  const verificationUniqueIndex = migration.indexOf('CREATE UNIQUE INDEX "auth_verification_tokens_token_hash_idx"');
  const rateLimitIndex = migration.indexOf('CREATE INDEX "rate_limit_events_key_action_window_idx"');

  assert.ok(sessionDuplicateCheck >= 0, 'Auth session token hash uniqueness must fail clearly when duplicates exist.');
  assert.ok(verificationDuplicateCheck >= 0, 'Auth verification token hash uniqueness must fail clearly when duplicates exist.');
  assert.ok(sessionUniqueIndex >= 0, 'Auth sessions must have a unique refresh token hash index.');
  assert.ok(verificationUniqueIndex >= 0, 'Auth verification tokens must have a unique token hash index.');
  assert.ok(rateLimitIndex >= 0, 'Rate-limit events must have a lookup index for key/action/window checks.');
  assert.ok(sessionDuplicateCheck < sessionUniqueIndex, 'Auth session duplicate preflight must run before unique index creation.');
  assert.ok(
    verificationDuplicateCheck < verificationUniqueIndex,
    'Auth verification duplicate preflight must run before unique index creation.',
  );
});
