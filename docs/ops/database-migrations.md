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
packages/db/drizzle/0008_account_buyer_profile.sql
```

It adds `user_profiles.buyer_profile` as a non-null JSONB column with an empty object default. This is safe for existing rows because the default backfills the new column.

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

## Safe Migration Checklist

- Prefer additive changes: new nullable columns, defaulted columns, new tables, or new indexes.
- Avoid dropping or renaming columns in the same release that changes application code.
- Avoid long table locks during peak traffic.
- Keep defaults explicit when application code expects non-null values.
- Never run migrations against production without a database backup.

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
pnpm quality
pnpm build
```

When a staging API and database are running:

```bash
pnpm test:auth
pnpm test:cart
pnpm test:checkout
pnpm test:sales-flow
pnpm test:admin-flow
```
