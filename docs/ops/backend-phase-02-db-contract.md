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

| Priority | Item                                              | Resolution                                                                                                                                                                                    |
| -------- | ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P0       | `carts.user_id` DB-level uniqueness               | Added `carts_user_id_idx` in `0009_woozy_rictor.sql` and `packages/db/src/schema/commerce.ts`.                                                                                                |
| P0       | Existing duplicate carts before migration         | `0009_woozy_rictor.sql` now de-duplicates duplicate cart items, collapses duplicate user-cart lines before reassignment, merges duplicate user carts into the latest cart, then adds indexes. |
| P0       | Duplicate cart lines where `variant_id` is `NULL` | Added a partial unique index for no-variant cart lines and a separate partial unique index for non-null variant cart lines.                                                                   |
| P1       | Cart creation race handling                       | `getOrCreateCart` now uses conflict-tolerant insert/readback logic so concurrent calls converge on the existing cart.                                                                         |
| P1       | Demo seed production safety                       | `seed:demo` and `seed:launch-starter` now fail in production-like environments through `seed-policy.ts`.                                                                                      |
| P1       | Admin seed confirmation                           | `seed-admin` uses the shared seed confirmation helper and still requires a strong admin password plus explicit `ADMIN_SEED_CONFIRM`.                                                          |
| P1       | Open refund request uniqueness                    | Added `refund_requests_open_order_idx` in `0010_absurd_hammerhead.sql` so only one requested/under-review/approved refund request can exist per order.                                        |
| P1       | Existing duplicate open refunds before migration  | `0010_absurd_hammerhead.sql` fails with a clear preflight error if duplicate open refund requests exist, so financial/customer requests are resolved manually before enforcing uniqueness.    |
| P1       | `product_assets.storage_key` uniqueness           | Added `product_assets_storage_key_idx` and a pre-index duplicate check with a clear migration error if dirty storage keys already exist.                                                      |
| P1       | Hot read/list indexes                             | Added indexes for product listing, product assets/variants, orders, order items, payments, entitlements, download events, and refund request list lookups.                                    |
| P1       | Core status DB checks                             | Added preflighted DB check constraints for product asset, product, download event, order, payment, refund request, and refund statuses.                                                       |

### Gaps Found

| Priority | Gap                                                                           | Why It Matters                                                                         | Proposed Phase |
| -------- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | -------------- |
| P1       | Analytics-specific indexes need production-volume validation                  | Event-query indexes should follow real dashboard filters once enough event data exists | Phase 7        |
| P2       | Migration process for existing non-empty DBs needs a documented rollback path | Constraints can fail if dirty data exists                                              | Phase 9        |

## Seed Scripts To Audit Next

- `seed-admin.ts`
- `seed-demo.ts`
- `seed-launch-starter.ts`

Required checks:

- Idempotency.
- Environment safety.
- No accidental production demo data.
- Required baseline records for tests and staging.

Audit result:

- `seed-demo.ts` and `seed-launch-starter.ts` are blocked in production-like environments through `assertNonProductionSeed`.
- `seed-admin.ts` requires exact `ADMIN_SEED_CONFIRM` confirmation, validates email/password strength, refuses to create a second admin, and refuses duplicate admin email.
- Seed policy behavior is covered by `apps/api/test/seed-policy.test.ts`.
- `seed-launch-starter.ts` is idempotent for catalog, tags, product prices, variants, categories, tags, and attributes.
- `seed-demo.ts` is idempotent for current data shape and remains non-production only.

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
- API policy tests pass, including DB migration policy tests.
- API policy tests pass, including seed policy tests.
- Local API ownership check passes for port 4000.
- Cart regression test passes against the running API.

## Phase 2 Status

Status: completed.

Completed:

- Fixed migration metadata drift.
- Added regression test for migration/journal drift.
- Added a safe duplicate-cart merge migration before enforcing one cart per user.
- Added DB-level cart uniqueness for user carts and no-variant cart lines.
- Added seed policy guards and regression tests.
- Added DB-level uniqueness for active refund requests per order.
- Added DB-level uniqueness for product asset storage keys.
- Added indexes for the current hot read/list paths.
- Added DB-level check constraints for core status values with explicit dirty-data preflights.
- Audited seed scripts and confirmed production safety gates are covered by tests.

Next:

- Document rollback/repair playbooks for non-empty production migrations.
- Review analytics-specific indexes once real event volume and dashboard filters are known.
