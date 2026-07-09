---
title: PR Review Packet
status: active
updated: 2026-07-09
---

# PR Review Packet

Use this packet when opening the pull request from:

```txt
feature/luxury-frontend-and-commerce-foundation
```

into:

```txt
main
```

## Summary

This branch establishes the first production-grade foundation for 3S Design:

- Luxury storefront and buyer-memory personalization.
- Customer account delivery, refund, and post-order guidance.
- Admin payment, refund, publishing, and reconciliation surfaces.
- Paymob-ready provider checkout and webhook authenticity checks.
- Database-backed buyer profile persistence.
- CI, release process, environment contract, migration rules, frontend QA, and payment runbook.
- Site-quality tooling with Lighthouse and Playwright.

## Main User-Facing Changes

- Customers can continue discovery from taste/buyer memory.
- Product cards and product pages carry personal fit signals forward.
- Checkout can choose provider checkout when Paymob is configured, with manual review as fallback.
- Payment status has a dedicated page and status path.
- Account dashboard explains order/payment/download/refund states more clearly.
- Delivery vault explains why a download is unavailable.

## Backend Changes

- Adds `customer-profile` API for buyer profile sync.
- Adds refund request and admin refund review workflow.
- Adds stale payment reconciliation endpoint.
- Adds Paymob checkout session creation.
- Adds Paymob HMAC verification and amount/currency checks before delivery unlock.
- Adds latest webhook visibility for admin payment review.

## Database Changes

Migration:

```txt
packages/db/drizzle/0008_account_buyer_profile.sql
```

Adds:

```sql
ALTER TABLE "user_profiles" ADD COLUMN "buyer_profile" jsonb DEFAULT '{}'::jsonb NOT NULL;
```

Review note: this is additive and uses a safe default for existing rows.

## Environment Changes

Paymob now uses API/HMAC/iframe configuration:

```env
PAYMOB_API_KEY=""
PAYMOB_API_BASE_URL="https://accept.paymob.com/api"
PAYMOB_INTEGRATION_ID_CARD=""
PAYMOB_IFRAME_ID=""
PAYMOB_HMAC_SECRET=""
PAYMOB_PAYMENT_KEY_TTL_SECONDS="3600"
```

Payment expiry settings:

```env
PAYMENT_PENDING_EXPIRY_MINUTES="120"
PAYMENT_PENDING_EXPIRY_MINUTES_MANUAL="2880"
```

See `docs/ops/environment.md`.

## Required Review Focus

- Paymob sandbox behavior with real credentials.
- Webhook HMAC field order and amount/currency matching.
- Refund approval effects on entitlements.
- Stale payment reconciliation does not touch paid/refunded payments.
- Buyer profile JSON stays bounded and privacy-safe.
- Mobile readability on home, search, product, checkout, account, and admin.
- Production Docker env wiring matches `.env.production.example`.

## Verification Already Run

```bash
pnpm quality
pnpm build
```

Known local notes:

- `pnpm quality` passes with one existing docs script lint warning for `console`.
- `pnpm build` passes.
- Turbo/Windows may warn about `.next/dev/lock` symlink metadata after build; it does not fail the build.

## Extra Verification Before Merge

When local API/database are running:

```bash
pnpm test:auth
pnpm test:cart
pnpm test:checkout
pnpm test:sales-flow
pnpm test:admin-flow
```

When the web app is running:

```bash
pnpm quality:site
```

## PR Body

Copy this into GitHub if the PR is opened manually:

````md
## What

Builds the first production-grade 3S Design foundation: premium storefront, buyer memory, provider-aware checkout, refunds, admin review surfaces, and quality/release operations.

## Why

The project needs a reviewable foundation before more frontend and commerce work lands on `main`.

## How

- Added GitHub Actions quality/build gate.
- Added buyer profile sync and taste-memory recovery.
- Added refund request and admin refund review.
- Added Paymob provider checkout/status/webhook verification.
- Added stale payment reconciliation.
- Added post-order guidance, payment status page, and clearer delivery states.
- Added ops docs, payment runbook, frontend QA checklist, and site-quality tooling.

## Database

- Adds `packages/db/drizzle/0008_account_buyer_profile.sql`.

## Testing

```bash
pnpm quality
pnpm build
```
````

## Risks

- Paymob must be validated with sandbox credentials before production.
- Migration must run before deploying buyer-profile code.
- Site-quality scripts require a running web server and browser runtime.

```

```
