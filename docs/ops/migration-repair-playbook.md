---
title: Migration Repair Playbook
status: active
updated: 2026-07-10
---

# Migration Repair Playbook

Use this playbook when `pnpm phase2:migration-preflight:staging` or a migration preflight inside SQL fails.

## Rule

Do not silently repair customer, payment, refund, entitlement, or order data inside generated migrations.

For financial/customer-impacting rows, prefer:

1. Stop deploy.
2. Export evidence.
3. Decide the business outcome.
4. Apply a reviewed repair script.
5. Rerun the preflight.

## Required Evidence

For every repair, capture:

- Environment name.
- Migration or preflight check that failed.
- Read-only query used to identify rows.
- Row count.
- Sample IDs.
- Proposed repair.
- Reviewer name.
- Backup timestamp.
- Post-repair preflight output.

## Command Flow

```powershell
pnpm phase2:env:staging
pnpm phase2:migration-preflight:staging
```

If clean, continue with migration deploy.

If blocked:

```powershell
pnpm phase2:migration-preflight:staging *> reports/staging-migration-preflight.txt
```

Keep `reports/` local unless it is intentionally attached to release evidence.

## Repair Rules By Area

### Duplicate User Carts

Risk:

- Multiple pending carts for the same user can duplicate checkout lines or confuse order creation.

Preferred repair:

- Keep the newest cart.
- Move non-duplicate cart lines to the kept cart.
- Merge duplicate cart lines by business rule.
- Delete empty old carts.

Allowed in migration:

- Yes, if the operation is deterministic and not financial.

### Duplicate Cart Lines

Risk:

- Unique indexes on cart lines will fail.
- Cart totals may be inflated.

Preferred repair:

- Keep one line per cart/product/variant/license.
- Set quantity to `1` because digital products are sold once per license.
- Delete duplicates.

Allowed in migration:

- Yes, if it only touches carts before checkout.

### Duplicate Product Asset Storage Keys

Risk:

- Multiple asset rows point to the same R2 object.
- Publishing or delivery can expose the wrong file.

Preferred repair:

- Identify whether duplicates are accidental metadata clones or real assets.
- Keep the row tied to the intended product/variant.
- Re-upload or assign a new storage key for the other row.

Allowed in migration:

- No. Requires admin/catalog decision.

### Duplicate Open Refund Requests

Risk:

- Two admins or workflows may resolve conflicting outcomes for the same order.
- Customer support history can become legally/financially ambiguous.

Preferred repair:

- Review each affected order.
- Keep one active request.
- Resolve the others manually with an explicit admin note and customer-safe status.

Allowed in migration:

- No. Requires support/admin decision.

### Invalid Status Values

Risk:

- DB check constraints will fail.
- Application code may not understand legacy/custom status values.

Preferred repair:

- Map each invalid status to a supported value only after confirming meaning.
- For money records, require reviewer approval.

Allowed in migration:

- No for `orders`, `payments`, `refund_requests`, `refunds`, and `entitlements`.
- Maybe for non-customer catalog data after review.

### Duplicate Auth Token Hashes

Risk:

- Duplicate refresh-token hashes or verification-token hashes break single-use token guarantees.
- A collision or duplicated seed/test row can make token rotation and verification ambiguous.

Preferred repair:

- Treat duplicates as a security incident until proven to be test data.
- Revoke the affected session family for duplicated `auth_sessions.refresh_token_hash`.
- Mark duplicated verification tokens as used or delete only if they are known test data and expired.
- Ask affected users to log in again if sessions are revoked.

Allowed in migration:

- No. Requires security/admin decision.

## Go/No-Go

You can continue a staging migration only when:

- `pnpm phase2:migration-preflight:staging` passes.
- Backup exists.
- Any repair has evidence.
- API typecheck and tests pass after the migration branch.

Do not continue to production if staging required an undocumented manual repair.
