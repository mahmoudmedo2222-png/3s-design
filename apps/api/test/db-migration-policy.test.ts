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
