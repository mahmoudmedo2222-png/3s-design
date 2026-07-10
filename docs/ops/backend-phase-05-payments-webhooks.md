# Backend Phase 05 Payments And Webhooks

## Scope

This phase reviews backend payment and webhook correctness around money and delivery unlocks:

- Provider webhook idempotency.
- Duplicate webhook replay behavior.
- Payment status transitions.
- Entitlement grants after a paid webhook.
- Audit/event consistency around provider-driven payment changes.

Frontend files are out of scope.

## Confirmed Risks Fixed

| Priority | Area              | Risk                                                                                                                            | Resolution                                                                                                                                         |
| -------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| P0       | Webhook replay    | Two concurrent copies of the same webhook could both observe an unprocessed event and attempt processing before `processed_at`. | Webhook handling now takes a per-provider/event transaction advisory lock before event lookup, event insert, payment processing, and marking done. |
| P0       | Delivery unlock   | Webhook payment processing and entitlement grants were not guaranteed to use the same database executor.                        | Paid webhook processing now updates payment/order state and grants entitlements through the same transaction executor.                             |
| P1       | Audit consistency | Audit writes during transaction-scoped payment processing could run outside the caller transaction.                             | `AuditService.record` now accepts an optional executor so transaction-scoped flows can write audit rows in the same unit of work.                  |
| P1       | Processed marker  | `processed_at` updates were unconditional after processing attempts.                                                            | `processed_at` is now set with `processed_at IS NULL` predicates inside the locked transaction.                                                    |

## Implementation Notes

Updated `apps/api/src/payments/payments.service.ts`.

- `handleProviderWebhook` now wraps the event path in a database transaction.
- The transaction takes `pg_advisory_xact_lock(hashtext(...))` using `provider + eventId`.
- Duplicate unprocessed events are processed only while the event lock is held.
- New internal helpers process paid/failed payment rows with a supplied executor.
- Paid webhook processing calls `grantEntitlementsForPaidOrder(payment.orderId, executor)`.

Updated `apps/api/src/downloads/downloads.service.ts`.

- `grantEntitlementsForPaidOrder` now accepts an optional executor.
- The method remains idempotent through the existing `entitlements.orderItemId` conflict protection.

Updated `apps/api/src/audit/audit.service.ts`.

- `record` now accepts an optional executor for transaction-scoped audit writes.

## Regression Protection

Updated `apps/api/test/service-transaction-policy.test.ts`.

The new policy test asserts:

- Payment webhooks use a per-provider/event advisory transaction lock.
- Webhook event persistence happens after the event lock.
- Webhook payment processing uses the transaction executor.
- `processed_at` is set conditionally inside the locked path.
- Entitlement grants and audit writes accept caller executors.

Existing payment webhook policy tests still cover:

- Production fails closed when webhook secrets are missing.
- Configured provider secrets must match.
- Paymob HMAC validation.
- Paymob amount/currency mismatch rejection before delivery unlock.
- Paymob payload redaction before storage.

## Verification

Commands run:

```powershell
corepack pnpm --filter @3s-design/api typecheck
corepack pnpm --filter @3s-design/api test
corepack pnpm phase3:payment-correctness:node22
```

Result:

- API typecheck passes.
- API policy tests pass: 42/42.
- Payment correctness gate passes under cached Node `22.23.1`.

Note: direct local shell verification still shows a Node engine warning because the machine is running Node `v24.18.0`, while the project declares `>=22 <23`. Use `pnpm phase3:payment-correctness:node22` until the active shell runtime is switched to Node 22.

## Remaining Follow-Ups

| Priority | Item                                                           | Why It Remains                                                                                                           |
| -------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| P1       | Add a DB-backed concurrent duplicate-webhook integration test. | Current sales regression covers duplicate webhooks, but a true parallel DB stress test would prove the lock under load.  |
| P1       | Add provider-specific Paymob sandbox contract tests.           | HMAC and payload shape are covered locally; a sandbox callback test is still needed before production checkout.          |
| P1       | Add explicit rejected-webhook storage or metric path.          | Invalid provider payloads currently fail before marking processed; ops visibility for bad provider callbacks is limited. |
| P2       | Define payment-event retention and replay runbook.             | The system stores events idempotently, but operations still needs documented replay and investigation steps.             |

## Phase 5 Status

Status: completed for the confirmed P0/P1 payment webhook correctness fixes.
