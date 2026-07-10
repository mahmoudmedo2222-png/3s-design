---
title: Beta Execution Roadmap
status: active
updated: 2026-07-10
---

# Beta Execution Roadmap

This roadmap turns 3S Design from a strong local demo into a controlled paid beta.

## Current Position

Estimated project readiness: 60%.

Reason:

- Core marketplace flows exist.
- Auth, cart, checkout, payments, refunds, downloads, admin operations, and AI discovery are represented.
- Backend tests and operational docs exist.
- The project is still blocked from paid beta by provider credentials, staging verification, storage verification, and full browser E2E coverage.

## Phase 0: Baseline and Safety

Status: active.

Exit criteria:

- Working tree changes are understood.
- Backend module map and route surface are documented.
- Critical flows are listed.
- Existing tests pass.
- Release/runtime checks run on Node `22.x`.
- `pnpm runtime:check:strict` passes before release-quality gates.

Evidence:

- `docs/ops/backend-phase-01-baseline.md`
- `docs/ops/backend-phase-02-db-contract.md`
- `pnpm --filter @3s-design/api test`
- `.nvmrc`
- `.node-version`
- `scripts/verify-runtime.mjs`

Current implementation note:

- Node `22.x` is now the pinned project runtime.
- Current local machine is still running Node `24.18.0`, so `pnpm runtime:check` warns and `pnpm runtime:check:strict` correctly fails until the runtime is switched.
- Web `typecheck`, `lint`, and `test` still pass under the current local runtime, but release-quality gates should not be trusted until the strict runtime check passes.

## Phase 1: Database Contract

Status: complete for beta baseline.

Goal:

Make database constraints match business rules, so concurrency and dirty data do not break paid flows.

Done:

- Migration journal/snapshot drift repaired.
- Migration policy test added.
- One-cart-per-user constraint added.
- `0009_woozy_rictor.sql` now cleans duplicate cart items, merges duplicate user carts, deletes duplicate carts, then creates the unique indexes.
- Seed scripts are production-guarded and covered by regression tests.
- Hot indexes were added for public listing, assets/variants, orders, payments, entitlements, downloads, and refunds.
- Open refund request uniqueness is enforced by DB index with a dirty-data preflight.
- Core status fields now have DB check constraints with dirty-data preflights.

Exit criteria:

- `pnpm --filter @3s-design/db db:generate` reports no schema changes.
- `pnpm --filter @3s-design/db typecheck` passes.
- `pnpm --filter @3s-design/api test` passes.

Deferred:

- Analytics-specific indexes should be adjusted after real dashboard filters and event volume exist.
- Production rollback/repair playbooks must be attached to the release PR before paid traffic.

## Phase 2: Staging Readiness

Status: blocked by environment.

Goal:

Run the application in a production-like environment before real users.

Blockers:

- `PAYMOB_API_KEY`
- `PAYMOB_INTEGRATION_ID_CARD`
- `PAYMOB_IFRAME_ID`
- `PAYMOB_HMAC_SECRET`
- R2 bucket credentials for real upload/download verification.
- A staging database and staging domain.

Exit criteria:

- `pnpm phase2:env:staging` passes against the real staging env file.
- `pnpm phase2:migration-preflight:staging` passes before pending migrations are applied.
- `pnpm phase2:paymob-readiness` passes.
- Staging API returns `GET /api/health/beta-readiness` with `ok=true`.
- Admin user exists only through controlled seed flow.

## Phase 3: Full Purchase Flow

Status: not complete.

Goal:

Prove the money path end to end.

Required flow:

1. Customer registers or logs in.
2. Customer adds a product to cart.
3. Customer creates checkout.
4. Customer creates `paymob` payment session.
5. Paymob sandbox payment returns to the site.
6. Paymob webhook marks payment paid.
7. Entitlement unlocks.
8. Customer downloads via signed URL.
9. Refund approval deactivates entitlement.

Exit criteria:

- Manual regression passes.
- Paymob sandbox regression evidence is recorded.
- Download stays locked before payment and after refund.

## Phase 4: Security Hardening

Status: partial.

Goal:

Reduce abuse and operational risk before beta traffic.

Required:

- Complete rate-limit matrix for auth, analytics, AI discovery, checkout, payments, and downloads.
- Confirm email verification policy before paid delivery.
- Confirm refresh-token reuse detection.
- Confirm webhook replay behavior.
- Confirm all admin money actions require step-up password.
- Run a scoped security review over auth, checkout, payments, downloads, refunds, and admin operations.

Exit criteria:

- Security findings are fixed or explicitly deferred.
- Sensitive logs do not expose tokens, card data, or secrets.
- Tests cover every critical policy.

## Phase 5: Customer and Admin Beta UX

Status: partial.

Goal:

Make the beta understandable and trustworthy for customers and operationally useful for the admin.

Required:

- Product detail page clarity.
- Checkout/status clarity.
- Account downloads and refund status clarity.
- Admin payment/refund/vault review clarity.
- Mobile pass for home, search, product, checkout, account, and admin.
- Dark mode pass.

Exit criteria:

- `pnpm quality:site` passes against staging.
- Manual mobile review passes.

## Phase 6: Deployment and Operations

Status: not complete.

Goal:

Prepare controlled production launch.

Required:

- Docker/compose production verification.
- Caddy domain verification.
- Postgres backup and restore test.
- Rollback plan.
- Sentry or equivalent error tracking.
- Release checklist and go/no-go notes.

Exit criteria:

- Staging release passes.
- Backup restore is tested.
- Known risks are documented.

## Target Readiness

- After Phase 1: 58%.
- After Phase 2: 65%.
- After Phase 3: 75%.
- After Phase 4: 82%.
- After Phase 5: 88%.
- After Phase 6: 92% beta-ready.

Remaining 8% depends on real payment-provider behavior, real customer feedback, production monitoring, and support operations.
