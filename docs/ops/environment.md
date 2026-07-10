---
title: Environment Contract
status: active
updated: 2026-07-09
---

# Environment Contract

This document defines the environment variables required to run 3S Design locally, in staging, and in production.

## Source Files

- Local template: `.env.example`
- Staging template: `.env.staging.example`
- Production template: `.env.production.example`
- Docker production wiring: `docker-compose.prod.yml`
- Deploy script: `scripts/deploy-prod.sh`

Never commit real secrets. Templates should contain placeholders only.

## Runtime Groups

### Core

| Variable               | Used by                 | Required      | Notes                                       |
| ---------------------- | ----------------------- | ------------- | ------------------------------------------- |
| `APP_ENV`              | API, scripts            | staging/prod  | Must be `staging` or `production`.          |
| `DATABASE_URL`         | API, DB scripts         | yes           | PostgreSQL connection string.               |
| `REDIS_URL`            | API, production compose | production    | Reserved for cache/session infrastructure.  |
| `JWT_ACCESS_SECRET`    | API                     | yes           | Use a long random production secret.        |
| `JWT_ACCESS_TTL`       | API                     | yes           | Current default: `15m`.                     |
| `JWT_REFRESH_TTL_DAYS` | API                     | local/staging | Required when refresh sessions are enabled. |

### AI Discovery

| Variable                    | Used by | Required                               | Notes                                                         |
| --------------------------- | ------- | -------------------------------------- | ------------------------------------------------------------- |
| `OPENAI_API_KEY`            | API     | optional locally, required for AI mode | Empty key falls back to rule-based discovery where supported. |
| `OPENAI_AI_DISCOVERY_MODEL` | API     | yes                                    | Example: `gpt-5.4-mini`.                                      |

### Storage and Delivery

| Variable                         | Used by          | Required                                   | Notes |
| -------------------------------- | ---------------- | ------------------------------------------ | ----- |
| `R2_ACCOUNT_ID`                  | API              | production                                 |
| `R2_ACCESS_KEY_ID`               | API              | production                                 |
| `R2_SECRET_ACCESS_KEY`           | API              | production                                 |
| `R2_BUCKET_NAME`                 | API              | production                                 |
| `R2_PUBLIC_BASE_URL`             | API/web previews | production when public previews are served |
| `R2_SIGNED_UPLOAD_TTL_SECONDS`   | API              | yes                                        |
| `R2_SIGNED_DOWNLOAD_TTL_SECONDS` | API              | yes                                        |
| `R2_REQUIRE_UPLOAD_CHECKSUM`     | API              | production should be `true`                |

### Payments

| Variable                                | Used by | Required                               | Notes                                                            |
| --------------------------------------- | ------- | -------------------------------------- | ---------------------------------------------------------------- |
| `PAYMENT_WEBHOOK_SECRET_MANUAL`         | API     | production                             |
| `PAYMENT_WEBHOOK_SECRET_PAYPAL`         | API     | when PayPal is enabled                 |
| `PAYMENT_WEBHOOK_SECRET_PAYMOB`         | API     | legacy/shared Paymob secret path       |
| `PAYMENT_WEBHOOK_SECRET_FAWRY`          | API     | when Fawry is enabled                  |
| `PAYMENT_PENDING_EXPIRY_MINUTES`        | API     | yes                                    | Default expiry for provider checkout sessions.                   |
| `PAYMENT_PENDING_EXPIRY_MINUTES_MANUAL` | API     | yes                                    | Manual review should usually stay longer than provider checkout. |
| `PAYPAL_CHECKOUT_URL_TEMPLATE`          | API     | when PayPal redirect mode is enabled   |
| `PAYMOB_API_KEY`                        | API     | when Paymob checkout is enabled        |
| `PAYMOB_API_BASE_URL`                   | API     | when Paymob checkout is enabled        |
| `PAYMOB_INTEGRATION_ID_CARD`            | API     | when Paymob card checkout is enabled   |
| `PAYMOB_IFRAME_ID`                      | API     | when Paymob iframe checkout is enabled |
| `PAYMOB_HMAC_SECRET`                    | API     | production Paymob webhooks             |
| `PAYMOB_PAYMENT_KEY_TTL_SECONDS`        | API     | when Paymob checkout is enabled        |
| `FAWRY_CHECKOUT_URL_TEMPLATE`           | API     | when Fawry redirect mode is enabled    |

Payment provider readiness can be checked without exposing secrets at `GET /api/health/beta-readiness`.

### Observability

| Variable                            | Used by | Required                             | Notes |
| ----------------------------------- | ------- | ------------------------------------ | ----- |
| `SENTRY_DSN`                        | web/API | optional until observability rollout |
| `SENTRY_ENVIRONMENT`                | web/API | yes once Sentry is enabled           |
| `SENTRY_REPLAY_ERROR_SAMPLE_RATE`   | web     | optional                             |
| `SENTRY_REPLAY_SESSION_SAMPLE_RATE` | web     | optional; keep low in production.    |

### Production Deployment

| Variable             | Used by         | Required           | Notes |
| -------------------- | --------------- | ------------------ | ----- |
| `APP_DOMAIN`         | Caddy           | production         |
| `ACME_EMAIL`         | Caddy           | production         |
| `POSTGRES_DB`        | Docker Postgres | production compose |
| `POSTGRES_USER`      | Docker Postgres | production compose |
| `POSTGRES_PASSWORD`  | Docker Postgres | production compose |
| `REGISTRY_IMAGE_API` | Docker compose  | production         |
| `REGISTRY_IMAGE_WEB` | Docker compose  | production         |
| `ADMIN_SEED_CONFIRM` | admin seed      | first deploy only  |
| `ADMIN_EMAIL`        | admin seed      | first deploy only  |
| `ADMIN_FULL_NAME`    | admin seed      | first deploy only  |
| `ADMIN_PASSWORD`     | admin seed      | first deploy only  |

## Change Rule

When adding or renaming an environment variable, update all relevant places in the same pull request:

1. `.env.example`
2. `.env.production.example`
3. `docker-compose.prod.yml` if the API or web container needs it
4. This document
5. Any deployment secret checklist or provider dashboard notes

## Verification

Before merging environment changes:

```bash
pnpm phase2:env:staging-template
pnpm --filter @3s-design/api test
pnpm --filter @3s-design/web typecheck
```

For production-like Docker checks:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml config
```

Before staging or production deploys, run the relevant secret contract check against the real, uncommitted env file:

```powershell
pnpm phase2:env:staging
pnpm phase2:env:production
```

These checks print variable names only. They must not print secret values.
