# Backend Phase 04 Auth And Admin Security

## Scope

This phase reviews backend authentication, session, token, and privileged admin action flows:

- Bearer access-token validation.
- Refresh-token rotation and reuse detection.
- Email verification and password reset token consumption.
- Admin password step-up checks.
- Auth/session lookup indexes needed for production-scale behavior.

Frontend files are out of scope.

## Confirmed Risks Fixed

| Priority | Area                | Risk                                                                                                                            | Resolution                                                                                                                                                  |
| -------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P0       | Access tokens       | A valid JWT could keep authorizing a deleted user or a user whose role changed after the token was issued.                      | `JwtAuthGuard` now loads the current user record from the database, rejects deleted/missing users, and uses the current role from the database.             |
| P0       | Refresh sessions    | Refresh-token reuse handling could be rolled back when throwing inside the same transaction, leaving the session family active. | Refresh rotation now uses a per-token advisory lock and returns transaction outcomes before throwing outside the transaction boundary.                      |
| P0       | Refresh sessions    | Concurrent refresh requests could both observe the old session as usable before rotation completed.                             | Refresh rotation now locks by refresh token hash and conditionally replaces only sessions that are still unrevoked and not already replaced.                |
| P0       | Verification tokens | Email verification and password reset tokens could be consumed concurrently before `used_at` was written.                       | Verification-token consumption now uses a per-token advisory lock and a conditional update requiring `used_at IS NULL` and the token still being unexpired. |
| P1       | Admin step-up       | Password step-up checks for privileged admin actions had no brute-force limiter.                                                | Step-up checks now enforce a 15-minute failure window, record failures, and write audit entries for failed attempts.                                        |
| P1       | Auth persistence    | Refresh and verification token hashes had no explicit unique indexes, and hot auth lookups had weak indexing.                   | Added unique token-hash indexes plus session-family, user/session, token-purpose, and rate-limit lookup indexes.                                            |

## Migration Work

Added migration `packages/db/drizzle/0012_dashing_songbird.sql`.

The migration includes preflight checks before creating unique token-hash indexes:

- Duplicate `auth_sessions.refresh_token_hash` values fail clearly.
- Duplicate `auth_verification_tokens.token_hash` values fail clearly.

Indexes added:

- `auth_sessions_refresh_token_hash_idx`
- `auth_sessions_family_idx`
- `auth_sessions_user_revoked_idx`
- `auth_verification_tokens_token_hash_idx`
- `auth_verification_tokens_user_purpose_created_idx`
- `rate_limit_events_key_action_window_idx`

## Regression Protection

Updated `apps/api/test/auth-policy.test.ts`.

The tests assert:

- Bearer auth loads the current user from the database.
- Deleted users are rejected by the guard.
- JWT role claims cannot override the current database role.
- Refresh rotation uses advisory locking and conditional replacement.
- Refresh-token family revocation survives invalid/reuse outcomes.
- Verification tokens are single-use under concurrent consumption pressure.
- Admin step-up has a brute-force limiter and audit trail.

Updated `apps/api/test/db-migration-policy.test.ts`.

The test asserts:

- Auth token-hash uniqueness migrations have dirty-data preflight checks.
- Auth/session lookup indexes remain present in the migration file.

## Verification

Commands run:

```powershell
corepack pnpm --filter @3s-design/api typecheck
corepack pnpm --filter @3s-design/db typecheck
corepack pnpm --filter @3s-design/api test
corepack pnpm --filter @3s-design/db db:generate
```

Result:

- API typecheck passes.
- DB typecheck passes.
- API policy tests pass: 41/41.
- Drizzle reports no schema changes after the migration.
- `pnpm --filter @3s-design/api test:auth` was attempted but could not reach the local API (`ECONNREFUSED`), so endpoint-level auth regression remains pending until the API server is running.

Note: local verification currently shows a Node engine warning because the machine is running Node `v24.18.0`, while the project declares `>=22 <23`.

## Remaining Follow-Ups

| Priority | Item                                                                   | Why It Remains                                                                                                                |
| -------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| P1       | Add DB-backed concurrent refresh and verification-token tests.         | Current regression protection combines static policy tests and endpoint regression; true parallel DB tests would be stronger. |
| P1       | Define trusted proxy behavior for client IP extraction.                | Auth and rate limits depend on request identity; production proxy configuration should be explicit before launch.             |
| P1       | Add explicit role/session invalidation policy for high-risk changes.   | The guard now reads the current user role, but product policy still needs to decide when all sessions should be revoked.      |
| P2       | Replace dev token exposure with real email-provider verification flow. | The API supports development tokens for regression tests; production email delivery still needs operational validation.       |

## Phase 4 Status

Status: completed for the confirmed P0/P1 auth and admin security fixes.
