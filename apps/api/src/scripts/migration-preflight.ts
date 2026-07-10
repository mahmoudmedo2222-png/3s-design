import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

type QueryCheck = {
  key: string;
  title: string;
  severity: 'blocker' | 'warning';
  sql: string;
};

type CheckResult = QueryCheck & {
  count: number;
  samples: string[];
};

const args = new Map(
  process.argv.slice(2).flatMap((arg, index, allArgs) => {
    if (!arg.startsWith('--')) {
      return [];
    }

    const [name, inlineValue] = arg.split('=', 2);
    const value = inlineValue ?? allArgs[index + 1];
    return [[name, value]];
  }),
);

const envFile = args.get('--env-file') ?? process.env.MIGRATION_PREFLIGHT_ENV_FILE;
const defaultEnvPath = fileURLToPath(new URL('../../../../.env', import.meta.url));
dotenv.config({ path: envFile ?? defaultEnvPath });

const databaseUrl = process.env.DATABASE_URL?.trim();

if (!databaseUrl) {
  throw new Error('Missing DATABASE_URL');
}

const checks: QueryCheck[] = [
  {
    key: 'duplicate_user_carts',
    title: 'duplicate carts per user',
    severity: 'blocker',
    sql: `
      select user_id::text as sample, count(*)::int as duplicate_count
      from carts
      group by user_id
      having count(*) > 1
      order by duplicate_count desc
      limit 10
    `,
  },
  {
    key: 'duplicate_cart_lines_no_variant',
    title: 'duplicate cart lines without variant',
    severity: 'blocker',
    sql: `
      select concat(cart_id, ':', product_id, ':', license_id) as sample, count(*)::int as duplicate_count
      from cart_items
      where variant_id is null
      group by cart_id, product_id, license_id
      having count(*) > 1
      order by duplicate_count desc
      limit 10
    `,
  },
  {
    key: 'duplicate_cart_lines_with_variant',
    title: 'duplicate cart lines with variant',
    severity: 'blocker',
    sql: `
      select concat(cart_id, ':', product_id, ':', variant_id, ':', license_id) as sample, count(*)::int as duplicate_count
      from cart_items
      where variant_id is not null
      group by cart_id, product_id, variant_id, license_id
      having count(*) > 1
      order by duplicate_count desc
      limit 10
    `,
  },
  {
    key: 'duplicate_asset_storage_keys',
    title: 'duplicate product asset storage keys',
    severity: 'blocker',
    sql: `
      select storage_key as sample, count(*)::int as duplicate_count
      from product_assets
      group by storage_key
      having count(*) > 1
      order by duplicate_count desc
      limit 10
    `,
  },
  {
    key: 'duplicate_open_refunds',
    title: 'duplicate open refund requests per order',
    severity: 'blocker',
    sql: `
      select order_id::text as sample, count(*)::int as duplicate_count
      from refund_requests
      where status in ('requested', 'under_review', 'approved')
      group by order_id
      having count(*) > 1
      order by duplicate_count desc
      limit 10
    `,
  },
  {
    key: 'invalid_product_statuses',
    title: 'invalid product statuses',
    severity: 'blocker',
    sql: `
      select status as sample, count(*)::int as duplicate_count
      from products
      where status not in ('draft', 'published', 'archived')
      group by status
      order by duplicate_count desc
      limit 10
    `,
  },
  {
    key: 'invalid_product_asset_statuses',
    title: 'invalid product asset statuses',
    severity: 'blocker',
    sql: `
      select asset_status as sample, count(*)::int as duplicate_count
      from product_assets
      where asset_status not in ('uploaded', 'processing', 'ready', 'rejected')
      group by asset_status
      order by duplicate_count desc
      limit 10
    `,
  },
  {
    key: 'invalid_product_asset_scan_statuses',
    title: 'invalid product asset scan statuses',
    severity: 'blocker',
    sql: `
      select scan_status as sample, count(*)::int as duplicate_count
      from product_assets
      where scan_status not in ('pending', 'passed', 'failed', 'skipped')
      group by scan_status
      order by duplicate_count desc
      limit 10
    `,
  },
  {
    key: 'invalid_download_event_statuses',
    title: 'invalid download event statuses',
    severity: 'blocker',
    sql: `
      select status as sample, count(*)::int as duplicate_count
      from download_events
      where status not in ('allowed', 'denied')
      group by status
      order by duplicate_count desc
      limit 10
    `,
  },
  {
    key: 'invalid_order_statuses',
    title: 'invalid order statuses',
    severity: 'blocker',
    sql: `
      select status as sample, count(*)::int as duplicate_count
      from orders
      where status not in ('pending', 'paid', 'refunded')
      group by status
      order by duplicate_count desc
      limit 10
    `,
  },
  {
    key: 'invalid_payment_statuses',
    title: 'invalid payment statuses',
    severity: 'blocker',
    sql: `
      select status as sample, count(*)::int as duplicate_count
      from payments
      where status not in ('pending', 'paid', 'failed', 'expired', 'refunded')
      group by status
      order by duplicate_count desc
      limit 10
    `,
  },
  {
    key: 'invalid_refund_request_statuses',
    title: 'invalid refund request statuses',
    severity: 'blocker',
    sql: `
      select status as sample, count(*)::int as duplicate_count
      from refund_requests
      where status not in ('requested', 'under_review', 'approved', 'rejected')
      group by status
      order by duplicate_count desc
      limit 10
    `,
  },
  {
    key: 'invalid_refund_statuses',
    title: 'invalid refund statuses',
    severity: 'blocker',
    sql: `
      select status as sample, count(*)::int as duplicate_count
      from refunds
      where status not in ('requested', 'approved', 'failed')
      group by status
      order by duplicate_count desc
      limit 10
    `,
  },
];

async function main() {
  const pool = new pg.Pool({ connectionString: databaseUrl, max: 1 });

  try {
    const results: CheckResult[] = [];
    for (const check of checks) {
      const queryResult = await pool.query<{ sample: string | null; duplicate_count: number | string }>(check.sql);
      const samples = queryResult.rows.map((row) => `${row.sample ?? '<null>'} (${Number(row.duplicate_count)})`);
      const count = queryResult.rows.reduce((sum, row) => sum + Number(row.duplicate_count), 0);
      results.push({ ...check, count, samples });
    }

    printReport(results);
    const blockerCount = results.filter((result) => result.severity === 'blocker' && result.count > 0).length;
    if (blockerCount > 0) {
      process.exitCode = 1;
    }
  } finally {
    await pool.end();
  }
}

function printReport(results: CheckResult[]) {
  console.log('Migration preflight report');
  console.log(`Env file: ${envFile ?? defaultEnvPath}`);
  console.log(`Checks: ${results.length}`);
  console.log('');

  for (const result of results) {
    const state = result.count > 0 ? result.severity.toUpperCase() : 'OK';
    console.log(`[${state}] ${result.title}: ${result.count}`);
    for (const sample of result.samples) {
      console.log(`  - ${sample}`);
    }
  }

  const blockers = results.filter((result) => result.severity === 'blocker' && result.count > 0);
  console.log('');
  if (blockers.length > 0) {
    console.log(`Migration preflight failed with ${blockers.length} blocker group(s).`);
    console.log('Stop deployment, export the affected rows, repair with a reviewed script, then rerun this check.');
    return;
  }

  console.log('Migration preflight passed.');
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Migration preflight failed: ${message}`);
  process.exitCode = 1;
});
