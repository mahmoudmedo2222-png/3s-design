# Backend Phase 03 Service Correctness

## Scope

This phase reviews backend service-layer correctness for money and delivery flows:

- Cart-to-order checkout conversion.
- Payment state transitions.
- Provider webhook idempotency boundaries.
- Refund approval/rejection transitions.
- Download entitlement usage and delivery limits.

Frontend files are out of scope.

## Confirmed Risks Fixed

| Priority | Area      | Risk                                                                                                                                  | Resolution                                                                                                                                                                         |
| -------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P0       | Checkout  | Concurrent checkout submissions could read the same cart before it was cleared and create duplicate pending orders.                   | `createPendingOrder` now takes a per-user transaction advisory lock before idempotency lookup, cart read, order creation, order-item insert, and cart clearing.                    |
| P0       | Downloads | Concurrent download requests could pass the limit check before `downloads_used` was incremented.                                      | `createDownloadUrl` now takes a per-entitlement transaction advisory lock and uses a conditional `downloads_used < maxDownloads` increment before recording an allowed event.      |
| P0       | Payments  | `markPaymentPaid` and `failPayment` read a payment status first, then updated by ID only. A race could transition from a stale state. | Payment transitions now include status predicates in the update itself. Paid races read back the current payment and remain idempotent when another worker already marked it paid. |

## Existing Safeguards Confirmed

- Refund approval already updates the refund request conditionally inside the transaction.
- Refund approval updates payment status from `paid` to `refunded` with a status predicate.
- Entitlement grants are idempotent by `order_item_id` unique index and `onConflictDoNothing`.
- Webhook event storage is unique by provider/event ID and sanitizes sensitive provider payload fields.

## Regression Protection

Added `apps/api/test/service-transaction-policy.test.ts`.

The test asserts:

- Checkout keeps the per-user advisory lock before cart-to-order conversion.
- Downloads keep the per-entitlement advisory lock and conditional usage increment.
- Payment paid/failed transitions keep status predicates in their update conditions.

## Verification

Commands run:

```powershell
corepack pnpm --filter @3s-design/api typecheck
corepack pnpm --filter @3s-design/api test
```

Result:

- API typecheck passes.
- API tests pass, including service transaction policy tests.

## Remaining Follow-Ups

| Priority | Item                                                                      | Why It Remains                                                                                                                     |
| -------- | ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| P1       | Add integration coverage for checkout double-submit with a real database. | Current regression protection is static policy plus existing endpoint regression; true concurrency needs a DB-backed test harness. |
| P1       | Add provider webhook replay integration tests.                            | Webhook idempotency is partly covered by policy tests, but duplicate delivery behavior should be verified against a real database. |
| P2       | Add rollback/repair runbooks for production data fixes.                   | Phase 2/3 migrations now fail clearly on dirty financial data; ops still needs documented repair steps.                            |

## Phase 3 Status

Status: completed for the confirmed P0 service correctness fixes.
