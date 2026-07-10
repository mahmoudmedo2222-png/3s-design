import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const scriptPath = path.resolve(process.cwd(), 'src/scripts/migration-preflight.ts');

void test('migration preflight policy: checks dirty data that can block beta migrations', async () => {
  const source = await readFile(scriptPath, 'utf8');

  const requiredSignals = [
    'duplicate carts per user',
    'duplicate cart lines without variant',
    'duplicate cart lines with variant',
    'duplicate product asset storage keys',
    'duplicate open refund requests per order',
    "status not in ('pending', 'paid', 'failed', 'expired', 'refunded')",
    "status not in ('requested', 'under_review', 'approved', 'rejected')",
    "asset_status not in ('uploaded', 'processing', 'ready', 'rejected')",
    "scan_status not in ('pending', 'passed', 'failed', 'skipped')",
    'duplicate auth session refresh token hashes',
    'duplicate auth verification token hashes',
  ];

  for (const signal of requiredSignals) {
    assert.ok(source.includes(signal), `Missing migration preflight signal: ${signal}`);
  }

  assert.equal(source.includes('process.env.DATABASE_URL'), true, 'Preflight must use DATABASE_URL from env/config.');
  assert.equal(source.includes('connectionString: databaseUrl'), true, 'Preflight must not print or decompose the database secret.');
});
