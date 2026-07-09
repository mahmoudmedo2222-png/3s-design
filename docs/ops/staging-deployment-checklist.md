---
title: Staging Deployment Checklist
status: active
updated: 2026-07-09
---

# Staging Deployment Checklist

Do not deploy production before this staging checklist passes.

## 1. Repository

- Open a draft PR from `feature/luxury-frontend-and-commerce-foundation` into `main`.
- Confirm GitHub Actions quality/build check passes.
- Confirm all environment and migration changes are listed in the PR.
- Confirm no generated reports are committed.

## 2. Staging Infrastructure

Required services:

- Web runtime.
- API runtime.
- PostgreSQL database.
- Redis, if enabled in the target environment.
- Object storage bucket for previews and delivery files.
- Public domain or preview URL.

Recommended first staging shape:

- Web: Vercel or Docker web container.
- API: Render, Railway, or Docker API container.
- Database: managed Postgres or isolated staging Postgres.
- Storage: separate staging R2 bucket.

## 3. Staging Secrets

Create staging secrets from `.env.production.example`, never from production values.

Required before API deploy:

- `DATABASE_URL`
- `JWT_ACCESS_SECRET`
- `OPENAI_API_KEY` if AI discovery should use OpenAI
- R2 credentials and bucket values
- payment webhook secrets
- Paymob sandbox credentials if Paymob is tested
- Sentry DSN if observability is enabled

Paymob sandbox set:

```env
PAYMOB_API_KEY=""
PAYMOB_API_BASE_URL="https://accept.paymob.com/api"
PAYMOB_INTEGRATION_ID_CARD=""
PAYMOB_IFRAME_ID=""
PAYMOB_HMAC_SECRET=""
PAYMOB_PAYMENT_KEY_TTL_SECONDS="3600"
```

## 4. Database

Before deploying API code:

1. Backup staging database if it already has useful data.
2. Apply pending migrations.
3. Confirm `user_profiles.buyer_profile` exists.
4. Confirm API starts cleanly after migration.

Current migration:

```txt
packages/db/drizzle/0008_account_buyer_profile.sql
```

## 5. Deploy Order

1. Deploy database migration.
2. Deploy API.
3. Deploy web.
4. Seed or confirm admin user.
5. Run smoke tests.

## 6. Smoke Test

Run manually in staging:

- Open home.
- Run search.
- Open product detail.
- Add product to cart.
- Register/login.
- Create checkout.
- Create payment session.
- Complete manual approval or Paymob sandbox payment.
- Confirm payment status page updates.
- Confirm delivery vault unlocks only after paid status.
- Request refund.
- Resolve refund from admin.
- Confirm entitlement becomes inactive.

Run readiness command after API deploy:

```bash
pnpm phase2:beta-readiness
```

For the current Paymob-first rollout:

```bash
pnpm phase2:paymob-readiness
```

Use `pnpm phase2:beta-readiness:manual` only for controlled manual-flow demos. It is not enough for paid beta approval.

## 7. Admin Smoke Test

- Login to `/admin`.
- Confirm product table loads.
- Confirm publishing checks load.
- Confirm payment desk loads.
- Confirm latest webhook field is understandable.
- Confirm refund desk loads.
- Confirm stale payment reconciliation requires password.

## 8. Site Quality

With staging web running:

```bash
SITE_AUDIT_BASE_URL="https://STAGING_DOMAIN" pnpm quality:site
```

Keep reports local unless they are intentionally attached to release evidence.

## 9. Exit Criteria

Staging is ready for production review only when:

- CI passes.
- Staging deploy succeeds.
- Migration is applied.
- Payment flow is verified.
- Refund flow is verified.
- Download lock/unlock behavior is verified.
- Mobile pass is reviewed on home, search, product, checkout, account, and admin.
- Known risks are written in the PR.
