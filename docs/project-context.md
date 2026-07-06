---
title: 3S Design Project Context
status: active
created: 2026-07-04
updated: 2026-07-04
source: codex-bmad-bootstrap
---

# 3S Design Project Context

## Product Snapshot

3S Design is a branded ecommerce and digital design platform. It currently combines a public storefront, authenticated customer accounts, AI-assisted product discovery, cart and checkout foundations, payment/session handling, digital entitlements, downloads, and admin catalog/product/asset management.

## Current Technical Shape

- Monorepo using pnpm and Turbo.
- Web app: Next.js in `apps/web`.
- API: NestJS in `apps/api`.
- Database package: Drizzle + PostgreSQL in `packages/db`.
- Local database: PostgreSQL on `127.0.0.1:55432`.
- Local API: `http://localhost:4000/api`.
- Local web: `http://localhost:3000`.

## Current Product Surfaces

- Public home and product discovery.
- Product detail pages.
- Login and registration.
- Customer account dashboard.
- Admin dashboard.
- AI discovery panel/search.

## Current API Modules

- `auth`: registration, login, refresh-token rotation, logout, logout-all, email verification, password reset, role guards, audit-sensitive events.
- `products`: public product listing, best sellers, product details, design DNA/search support.
- `ai-discovery`: AI-assisted product discovery sessions and messages.
- `orders`: cart, checkout, order list, order detail.
- `payments`: user payments, payment sessions, provider readiness, admin payment marking, webhooks.
- `downloads`: entitlement listing and signed download URL creation.
- `admin/catalog`: categories, tags, licenses.
- `admin/products`: product, variant, attribute, asset, license-price, category, and tag management.
- `admin/assets`: asset upload policy and admin asset workflow.
- `database`, `audit`, `health`.

## Current Data Domains

- `catalog`: products, variants, licenses, assets, categories, tags, product metadata.
- `commerce`: carts, cart items, coupons, orders, order items, payments, payment webhooks, entitlements, downloads, refunds.
- `security`: auth sessions, verification/reset tokens, audit/security-related tables.
- `engagement`, `support`, `users`.

## Guardrails

- Do not modify production behavior without a story or clear user request.
- For risky changes, create or update BMAD artifacts first: PRD, architecture spine, story, and TEA test design.
- Auth, cart, checkout, payment, entitlement, downloads, and admin flows are high-risk and require negative-path testing.
- Prefer existing project patterns over new abstractions.
- Keep implementation changes small and story-scoped.

## BMAD Operating Mode

- Conversation with the user should be in Arabic.
- Project artifacts should be in English for code-agent and repository consistency.
- Default workflow: Product Brief -> PRD -> Architecture Spine -> Epics/Stories -> TEA Test Design -> Dev Story -> Review.
