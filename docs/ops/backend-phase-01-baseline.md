# Backend Phase 01 Baseline

## Scope

Backend scope for the next phases is limited to:

- `apps/api/**`
- `packages/db/**`
- backend-related operational scripts and docs

Frontend files are out of scope unless a backend verification gate is blocked by formatting only and the change is explicitly approved.

## Phase Plan

1. Baseline audit
   - Produce module map, route surface, critical flows, and first risk register.
2. Database contract
   - Review schema, constraints, indexes, foreign keys, cascade rules, migrations, and seed idempotency.
3. API contract
   - Standardize response shapes, error shape, validation behavior, pagination, filtering, and status codes.
4. Security and authorization
   - Review auth/session rules, role matrix, public endpoint rate limits, secret validation, and PII handling.
5. Business flow hardening
   - Validate auth, cart, checkout, payments, downloads, refunds, and entitlement concurrency.
6. Admin operations
   - Validate catalog, product publishing, assets lifecycle, manual payment review, and refund review.
7. Observability
   - Validate audit logs, operational events, structured logs, health/readiness, and failure visibility.
8. Testing gates
   - Stabilize backend unit, integration, regression, and launch-readiness gates.
9. Deployment readiness
   - Validate env contracts, Docker/compose, migration workflow, backup/restore, and runbooks.
10. Final backend launch review
    - Produce go/no-go risks, known gaps, and the remaining launch checklist.

## Module Map

| Module             | Responsibility                                                         | Risk Level |
| ------------------ | ---------------------------------------------------------------------- | ---------- |
| `auth`             | Registration, login, refresh rotation, password reset, role guards     | Critical   |
| `orders`           | Cart, checkout, order ownership, order reads                           | Critical   |
| `payments`         | Payment sessions, provider webhooks, admin review, reconciliation      | Critical   |
| `downloads`        | Entitlements, delivery assets, signed download URLs, quotas            | Critical   |
| `refunds`          | User refund requests, admin approval/rejection, entitlement revocation | High       |
| `admin/products`   | Product lifecycle, publishing checks, variants, assets, attributes     | High       |
| `admin/catalog`    | Categories, tags, licenses                                             | High       |
| `admin/assets`     | Signed upload URL policy                                               | High       |
| `products`         | Public catalog queries and product details                             | Medium     |
| `analytics`        | Public event ingestion and admin reporting                             | Medium     |
| `customer-profile` | Buyer profile persistence                                              | Medium     |
| `ai-discovery`     | Discovery sessions and product suggestions                             | Medium     |
| `health`           | Liveness, readiness, beta readiness                                    | High       |
| `rate-limit`       | DB-backed throttling for sensitive/public endpoints                    | High       |
| `audit`            | Sensitive action audit logs                                            | High       |
| `storage`          | R2 signed URLs and public URL generation                               | High       |
| `database`         | Postgres/Drizzle connection and readiness ping                         | Critical   |

## Route Surface

Public:

- `GET /health`
- `GET /health/ready`
- `GET /health/beta-readiness`
- `GET /products`
- `GET /products/best-sellers`
- `GET /products/:slug`
- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/email/verify`
- `POST /auth/password/reset/request`
- `POST /auth/password/reset`
- `POST /analytics/events`
- `POST /webhooks/payments/:provider`
- `POST /ai/discovery/*`

Authenticated:

- `GET /auth/me`
- `POST /auth/logout`
- `POST /auth/logout-all`
- `POST /auth/email/verification/request`
- `GET/PATCH /customer/profile/*`
- `GET/POST/PATCH/DELETE /cart/*`
- `POST /checkout`
- `GET /orders`
- `GET /orders/:id`
- `GET /payments`
- `GET /payments/providers`
- `POST /payments/sessions`
- `GET /payments/:paymentId`
- `GET /downloads`
- `POST /downloads/:entitlementId/assets/:assetId/url`
- `GET/POST /refunds`

Admin:

- `admin/catalog`
- `admin/products`
- `admin/assets`
- `admin/payments`
- `admin/refunds`
- `admin/analytics`

## Critical Flows

1. Register/login/refresh/logout/password reset.
2. Product discovery to cart to checkout.
3. Payment session creation to webhook/admin review to paid order.
4. Paid order to entitlement grant to signed download URL.
5. Refund request to approval/rejection to entitlement revocation.
6. Admin product creation to asset registration to publishing.
7. Analytics ingestion to admin reporting.
8. Health/readiness to deploy gating.

## Current Strengths

- Regression tests exist for auth, cart, checkout, sales flow, and admin-to-buyer flow.
- Sensitive flows already use audit logs in multiple places.
- Webhooks, downloads, analytics, and rate-limit policy tests exist.
- Admin catalog and product asset policy tests exist.
- Backend quality gate includes typecheck, policy tests, and integration regression tests.

## First Risk Register

| Priority | Risk                                                               | Evidence                                                                                                      | Next Phase |
| -------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- | ---------- |
| P0       | Migration metadata appears incomplete for latest SQL migration     | `0008_account_buyer_profile.sql` exists, but `_journal.json` lists entries only through `0007_customer_radar` | Phase 2    |
| P0       | Database constraints/indexes need full contract review             | Business rules are mostly enforced in services/tests, not yet fully audited against DB constraints            | Phase 2    |
| P1       | Public endpoints need a complete rate-limit matrix                 | Some sensitive endpoints are covered, but public discovery/auth/analytics need matrix verification            | Phase 4    |
| P1       | API error shape is not documented as a contract                    | Controllers rely on Nest defaults and service exceptions                                                      | Phase 3    |
| P1       | Pagination/filtering contract is not uniform across list endpoints | Admin and public list endpoints use different implicit limits                                                 | Phase 3    |
| P1       | Storage lifecycle needs explicit state contract                    | Signed upload URL, asset metadata, scan status, and publish readiness exist but need one lifecycle contract   | Phase 6    |
| P2       | Observability is distributed rather than standardized              | Audit logs exist, but request correlation and operational event taxonomy are not documented                   | Phase 7    |
| P2       | Seed scripts need full idempotency and environment-safety review   | `seed-admin`, `seed-demo`, and `seed-launch-starter` exist but have not been audited as a set                 | Phase 2    |

## Phase 1 Exit Criteria

- Backend module map is documented.
- Route surface is categorized by access level.
- Critical flows are listed.
- First risk register is created.
- Next phase is clearly selected.

Status: complete.

Next phase: Database contract.
