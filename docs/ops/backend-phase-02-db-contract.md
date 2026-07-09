# Backend Phase 02 Database Contract

## Scope

This phase reviews the database contract behind backend flows:

- Drizzle schema files in `packages/db/src/schema/**`
- SQL migrations in `packages/db/drizzle/*.sql`
- Drizzle migration metadata in `packages/db/drizzle/meta/**`
- Seed scripts in `apps/api/src/scripts/**`
- Backend tests that protect database invariants

Frontend files are out of scope.

## Completed Work

### Migration Metadata Repair

Problem:

- `packages/db/drizzle/0008_account_buyer_profile.sql` existed.
- `packages/db/drizzle/meta/_journal.json` did not include the `0008_account_buyer_profile` entry.
- `packages/db/drizzle/meta/0008_snapshot.json` was missing.
- Running `drizzle-kit generate` created a duplicate migration containing changes from both `0007_customer_radar` and `0008_account_buyer_profile`.

Fix:

- Added a `0008_account_buyer_profile` journal entry.
- Added the current `0008_snapshot.json`.
- Removed the duplicate generated SQL migration.
- Verified `corepack pnpm --filter @3s-design/db db:generate` now reports no schema changes.

Protection:

- Added `apps/api/test/db-migration-policy.test.ts`.
- The test requires every migration SQL file to have a matching journal entry.
- The test requires the latest journal entry to have a matching snapshot.

## Current Database Contract Notes

### Strong Existing Constraints

- `users.email` is unique.
- `products.slug`, `categories.slug`, `tags.slug`, and `licenses.license_type` are unique.
- `product_license_prices` is unique by product/license.
- Product category/tag join tables are unique by pair.
- `orders.order_number` and `orders.checkout_session_id` are unique.
- Payment provider IDs and payment idempotency keys have unique indexes.
- Payment webhook events are unique by provider/event ID.
- Entitlements are unique by order item.
- Cart items are unique by cart/product/variant/license.

### Resolved During Phase 2

| Priority | Item                                      | Resolution                                                                                                                                                                |
| -------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P0       | `carts.user_id` DB-level uniqueness       | Added `carts_user_id_idx` in `0009_woozy_rictor.sql` and `packages/db/src/schema/commerce.ts`.                                                                            |
| P0       | Existing duplicate carts before migration | `0009_woozy_rictor.sql` now de-duplicates duplicate cart items, collapses duplicate user-cart lines before reassignment, merges duplicate user carts into the latest cart, then adds indexes. |
| P0       | Duplicate cart lines where `variant_id` is `NULL` | Added a partial unique index for no-variant cart lines and a separate partial unique index for non-null variant cart lines. |
| P1       | Cart creation race handling | `getOrCreateCart` now uses conflict-tolerant insert/readback logic so concurrent calls converge on the existing cart. |

### Gaps Found

| Priority | Gap                                                                           | Why It Matters                                                                              | Proposed Phase    |
| -------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ----------------- |
| P1       | Refund requests have no DB-level uniqueness for open/approved order requests  | Service locks now reduce race risk, but DB cannot enforce the invariant directly            | Phase 2/5         |
| P1       | Several status fields are plain text without DB check constraints             | Invalid status values are blocked by DTO/service code, not DB                               | Phase 2 follow-up |
| P1       | `product_assets.storage_key` is not unique                                    | Duplicate asset records can point to one storage object                                     | Phase 6           |
| P1       | List/read hot queries need index review                                       | Admin payments/refunds, public products, downloads, and analytics may degrade as data grows | Phase 2 follow-up |
| P2       | Migration process for existing non-empty DBs needs a documented rollback path | Constraints can fail if dirty data exists                                                   | Phase 9           |

## Seed Scripts To Audit Next

- `seed-admin.ts`
- `seed-demo.ts`
- `seed-launch-starter.ts`

Required checks:

- Idempotency.
- Environment safety.
- No accidental production demo data.
- Required baseline records for tests and staging.

## Verification

Commands run:

```powershell
corepack pnpm --filter @3s-design/db db:generate
corepack pnpm --filter @3s-design/db typecheck
corepack pnpm --filter @3s-design/api typecheck
corepack pnpm --filter @3s-design/api test
corepack pnpm dev:api:verify-running
corepack pnpm --filter @3s-design/api test:cart
```

Result:

- `db:generate` reports no schema changes.
- DB package typecheck passes.
- API typecheck passes.
- API policy tests pass, including the new DB migration policy test.
- Local API ownership check passes for port 4000.
- Cart regression test passes against the running API.

## Phase 2 Status

Status: in progress.

Completed:

- Fixed migration metadata drift.
- Added regression test for migration/journal drift.
- Added a safe duplicate-cart merge migration before enforcing one cart per user.
- Added DB-level cart uniqueness for user carts and no-variant cart lines.

Next:

- Audit seed scripts.
- Review indexes for hot list/reporting queries.
- Add DB-level invariants for refund request lifecycle and status values where practical.
