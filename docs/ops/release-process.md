---
title: Release Process
status: active
updated: 2026-07-09
---

# Release Process

This is the release path for 3S Design once a feature branch is ready to review.

## Branch Strategy

- `main`: production-ready code.
- `feature/*`: isolated work branches.
- No direct commits to `main` once GitHub branch protection is enabled.

Current working branch:

```txt
feature/luxury-frontend-and-commerce-foundation
```

## Pull Request Requirements

Every PR should include:

- Summary of user-facing changes.
- Backend/API changes.
- Database migrations.
- Environment variable changes.
- Testing commands.
- Known risks or follow-up work.

Use `.github/pull_request_template.md` as the minimum structure.

## Required Checks

Release checks must run on the pinned project runtime:

```bash
pnpm runtime:check:strict
```

The combined release gate is:

```bash
pnpm release:check
```

It runs the strict runtime check, full quality gate, and production build in order.

The GitHub quality workflow must pass the same runtime check before quality/build:

```bash
pnpm quality
pnpm build
```

Local verification before pushing can use the combined gate:

```bash
pnpm release:check
```

On a Windows machine where the active system Node is not 22.x but cached Node 22 is available, use the local wrapper:

```powershell
pnpm with:node22 "corepack pnpm release:check"
```

This prepends Node 22 to `PATH` for the command. You may still see pnpm's outer engine warning if pnpm itself was launched from Node 24, but the strict runtime check inside the wrapper must pass.

High-risk domains require extra regression tests when the API and database are running:

```bash
pnpm test:auth
pnpm test:cart
pnpm test:checkout
pnpm test:sales-flow
pnpm test:admin-flow
```

High-risk domains include:

- Authentication and sessions.
- Cart and checkout.
- Payments and webhooks.
- Refunds.
- Entitlements and downloads.
- Admin authorization.
- Database schema changes.

## Staging Release

Before production:

1. Merge the feature branch into a staging branch or deploy preview.
2. Apply migrations to staging.
3. Deploy API and web.
4. Run smoke tests:
   - Register/login.
   - Browse/search products.
   - Add to cart.
   - Create checkout.
   - Create payment session.
   - Admin payment review.
   - Download vault.
   - Refund request and admin review.
5. Review mobile layouts for home, search, product, checkout, account, and admin.

## Production Release

1. Confirm `main` is green in GitHub Actions.
2. Confirm `.env.production` has every required variable from `docs/ops/environment.md`.
3. Backup the production database.
4. Run required migrations.
5. Deploy using:

```bash
sh scripts/deploy-prod.sh
```

6. Verify:

```bash
curl https://YOUR_DOMAIN/api/health
curl https://YOUR_DOMAIN
```

7. Smoke test core flows manually.

## Rollback

Application rollback:

1. Redeploy the previous known-good image tag.
2. Confirm API health.
3. Confirm checkout and account pages load.

Database rollback:

- Prefer forward fixes.
- Only reverse migrations when a tested rollback SQL exists and a backup is available.
- If a new additive column caused an issue, disable the feature in application code first.

## Release Notes

For each production release, record:

- Git SHA.
- Migration IDs applied.
- Deployment time.
- Operator.
- Smoke test result.
- Known issues.
