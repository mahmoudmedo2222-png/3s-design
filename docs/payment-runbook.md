# Payment Runbook

## Current Providers

- `manual`: admin-reviewed payments for local testing and fallback operations.
- `paymob`: sandbox-ready card checkout through Paymob Accept iframe.
- `fawry` and `paypal`: provider slots are reserved; checkout adapters are not live yet.

## Beta Readiness Check

Use the API readiness endpoint before beta tests or sales demos:

```http
GET /api/health/beta-readiness
```

The response includes:

- `databaseConfigured`: whether the API has database wiring.
- `providerCheckoutReady`: whether at least one non-manual checkout provider is configured.
- `paymentProviders`: provider readiness without secret values.
- `blockers`: missing provider checkout requirements and the next action.

Beta is blocked when only `manual` payment is ready. Manual review is a fallback, not a provider checkout substitute.

Local command:

```bash
pnpm phase2:beta-readiness
```

Paymob-focused command:

```bash
pnpm phase2:paymob-readiness
```

For a controlled manual-flow demo only:

```bash
pnpm phase2:beta-readiness:manual
```

The manual command does not mean paid beta is ready. It only accepts the manual fallback while provider checkout is still missing.

## Paymob Environment

Required for `paymob` readiness:

```env
PAYMOB_API_KEY=""
PAYMOB_API_BASE_URL="https://accept.paymob.com/api"
PAYMOB_INTEGRATION_ID_CARD=""
PAYMOB_IFRAME_ID=""
PAYMOB_HMAC_SECRET=""
PAYMOB_PAYMENT_KEY_TTL_SECONDS="3600"
```

`PAYMOB_HMAC_SECRET` is mandatory in production. Without it, Paymob webhooks fail closed.

## Payment State Rules

- `pending -> paid`: allowed from trusted webhook or admin step-up approval.
- `pending -> failed`: allowed from trusted webhook or admin action.
- `pending -> expired`: allowed from admin stale-session reconciliation.
- `expired -> paid`: allowed only from trusted provider confirmation.
- `failed -> paid`: allowed only from trusted provider confirmation.
- `paid -> failed`: ignored for late provider noise.
- `paid -> refunded`: allowed only through refund approval.
- `refunded -> paid`: not allowed.

## Webhook Rules

Paymob webhooks must pass:

- Valid `hmac` query value.
- Known `merchant_order_id`.
- Matching `amount_cents`.
- Matching `currency`.
- `success=true` and `pending=false` before unlocking delivery.

Duplicate webhooks are accepted but processed once.

## Stale Payment Reconciliation

Admin endpoint:

```http
POST /api/admin/payments/reconcile-stale
```

Body:

```json
{
  "adminPassword": "..."
}
```

Default expiry:

- `PAYMENT_PENDING_EXPIRY_MINUTES=120`
- `PAYMENT_PENDING_EXPIRY_MINUTES_MANUAL=2880`

Reconciliation never changes `paid`, `refunded`, or already failed payments.

## Incident Checklist

If a customer says money was deducted but files are locked:

1. Search admin payment desk by order number and provider payment id.
2. Check latest webhook event payload and status.
3. Confirm amount and currency match the order.
4. If provider confirms success but webhook did not arrive, trigger provider-side resend.
5. Use manual `mark paid` only with admin step-up and a real provider reference.
6. Record the final provider reference before unlocking delivery.
