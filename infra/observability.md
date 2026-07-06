# Observability rollout

Phase 1:

- Add `SENTRY_DSN`, `SENTRY_ENVIRONMENT`, and release version env vars.
- Capture API exceptions and payment webhook failures.
- Enable replay sampling only for frontend errors first.

Phase 2:

- Track AI discovery events: query, inferred brief, result count, selected product.
- Track checkout conversion: cart created, order created, payment session created, paid, entitlement granted.
- Track fraud risk level distribution.

Phase 3:

- Add alerts for failed payments, webhook signature failures, R2 upload failures, and repeated download denials.

Privacy rule: never send raw payment data, JWTs, signed URLs, full download URLs, or uploaded file keys to third-party telemetry.
