---
title: Database Migrations
status: active
updated: 2026-07-09
---

# Database Migrations

3S Design uses Drizzle and PostgreSQL. Schema code lives in `packages/db/src/schema`, and generated SQL migrations live in `packages/db/drizzle`.

## Current Migration

The latest migration is:

```txt
packages/db/drizzle/0012_dashing_songbird.sql
```

Current migration chain summary:

- `0009_woozy_rictor.sql`: cleans duplicate carts/cart items, then enforces one cart per user and unique cart lines.
- `0010_absurd_hammerhead.sql`: adds hot read/list indexes, enforces unique product asset storage keys, and enforces one open/approved refund request per order.
- `0011_loving_whistler.sql`: adds DB check constraints for core status fields.
- `0012_dashing_songbird.sql`: adds auth token uniqueness and lookup indexes for refresh rotation, verification tokens, session families, and rate-limit checks.

`0010`, `0011`, and `0012` include explicit dirty-data preflights. If they fail, do not edit production data blindly. Export the failing rows, decide the business resolution, apply a reviewed repair script, then rerun the migration.

## Local Development

Start the local database:

```powershell
pnpm db:dev:start
```

Apply schema changes during local development:

```bash
pnpm db:push
```

Generate a migration after changing schema files:

```bash
pnpm db:generate
```

Then inspect the generated SQL before committing it.

## Production Rule

Production migrations must be run before deploying application code that depends on the new columns or tables.

For each migration PR, document:

- What table/column/index changes.
- Whether existing rows are backfilled.
- Whether the migration is additive or destructive.
- Whether the application can run during a rolling deploy.
- How to roll forward if the migration partially applies.
- The exact preflight queries or expected failure messages for dirty existing data.

## Safe Migration Checklist

- Prefer additive changes: new nullable columns, defaulted columns, new tables, or new indexes.
- Avoid dropping or renaming columns in the same release that changes application code.
- Avoid long table locks during peak traffic.
- Keep defaults explicit when application code expects non-null values.
- Never run migrations against production without a database backup.
- Never auto-close, refund, reject, or otherwise mutate customer money/support records inside a migration unless the action has a reviewed operational decision attached.
- Prefer explicit preflight failure over silent repair for financial records.

## Dirty-Data Repair Rule

If a migration fails on a preflight:

1. Stop the deploy.
2. Snapshot the affected rows with `SELECT ... FOR SHARE` or an exported read-only report.
3. Classify rows as duplicate test data, customer-impacting data, or operational mistake.
4. Prepare a small reviewed repair script.
5. Backup database again if the repair touches financial/customer records.
6. Apply repair in staging first.
7. Rerun migrations.

Do not change `refund_requests`, `payments`, `orders`, or `entitlements` from a generated migration unless the change is purely structural.

Detailed repair rules live in `docs/ops/migration-repair-playbook.md`.

## Preflight Command

Run this before applying pending migrations to any non-empty staging database:

```powershell
pnpm phase2:migration-preflight:staging
```

The command checks data that can break `0009`, `0010`, and `0011`:

- Duplicate carts per user.
- Duplicate cart lines.
- Duplicate product asset storage keys.
- Duplicate open refund requests per order.
- Invalid status values for products, assets, downloads, orders, payments, refund requests, and refunds.
- Duplicate auth refresh-token hashes and verification-token hashes.

The command prints counts and sample identifiers, not secrets.

## Release Order

For additive migrations:

1. Backup database.
2. Run migration.
3. Deploy API.
4. Deploy web.
5. Run smoke tests.

For destructive migrations:

1. Ship code that stops using the old field.
2. Verify no reads/writes depend on it.
3. Backup database.
4. Run destructive migration in a later release.

## Smoke Checks After Migration

Run these against staging before production:

```bash
pnpm --filter @3s-design/db typecheck
pnpm --filter @3s-design/api test
pnpm --filter @3s-design/web typecheck
pnpm --filter @3s-design/web test
```

When a staging API and database are running:

```bash
pnpm test:auth
pnpm test:cart
pnpm test:checkout
pnpm test:sales-flow
pnpm test:admin-flow
```
