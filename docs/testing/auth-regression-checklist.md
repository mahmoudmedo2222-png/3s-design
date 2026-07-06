---
title: Auth Regression Checklist
status: active
created: 2026-07-04
updated: 2026-07-04
owner: TEA
story: 2.1-auth-regression-checklist
---

# Auth Regression Checklist

## Purpose

Use this checklist before and after changes to authentication, account session handling, guarded customer flows, or admin authorization. It is written for manual API verification first, then automation.

## Preconditions

- API is running at `http://localhost:4000/api`.
- Database is running and migrations are applied.
- Use a fresh test email per run, for example `auth-test+<timestamp>@example.com`.
- Use a strong password such as `StrongPass1234`.
- If dev token responses are enabled, registration/reset responses may include development-only verification/reset tokens.

## Endpoint Map

| Behavior                   | Method | Path                                   | Auth               |
| -------------------------- | ------ | -------------------------------------- | ------------------ |
| Register                   | POST   | `/api/auth/register`                   | Public             |
| Login                      | POST   | `/api/auth/login`                      | Public             |
| Refresh                    | POST   | `/api/auth/refresh`                    | Refresh token      |
| Logout                     | POST   | `/api/auth/logout`                     | Refresh token body |
| Logout all                 | POST   | `/api/auth/logout-all`                 | Access token       |
| Request email verification | POST   | `/api/auth/email/verification/request` | Access token       |
| Verify email               | POST   | `/api/auth/email/verify`               | Token body         |
| Request password reset     | POST   | `/api/auth/password/reset/request`     | Public             |
| Reset password             | POST   | `/api/auth/password/reset`             | Token body         |
| Current user               | GET    | `/api/auth/me`                         | Access token       |

## Positive Regression Path

### AUTH-P1: Register a new user

Request:

```json
{
  "email": "auth-test+<timestamp>@example.com",
  "fullName": "Auth Test User",
  "password": "StrongPass1234"
}
```

Expected:

- Response succeeds.
- Response includes user identity and auth/session payload.
- Access token can call `GET /api/auth/me`.
- Refresh token is returned with an expiry timestamp.
- In development, email verification token may be included only when dev token mode is enabled.

### AUTH-P2: Login with valid credentials

Expected:

- Response succeeds.
- New access token and refresh token are returned.
- `GET /api/auth/me` succeeds with the access token.

### AUTH-P3: Refresh token rotation

Steps:

1. Call `POST /api/auth/refresh` with the current refresh token.
2. Store the new refresh token returned by the response.
3. Call `GET /api/auth/me` with the new access token.

Expected:

- Refresh succeeds.
- New access token works.
- New refresh token is different from the old refresh token.

### AUTH-P4: Logout current session

Steps:

1. Call `POST /api/auth/logout` with the current refresh token.
2. Try `POST /api/auth/refresh` with the same refresh token.

Expected:

- Logout succeeds.
- Refresh with logged-out token fails.

### AUTH-P5: Logout all sessions

Steps:

1. Login twice and keep both refresh tokens.
2. Call `POST /api/auth/logout-all` with a valid access token.
3. Try refreshing both sessions.

Expected:

- Logout-all succeeds.
- Both refresh attempts fail.

### AUTH-P6: Email verification

Steps:

1. Register or login.
2. Call `POST /api/auth/email/verification/request` with access token.
3. If a dev verification token is returned, call `POST /api/auth/email/verify`.

Expected:

- Request succeeds for authenticated user.
- Verification succeeds with valid unused token.
- Reusing the same verification token fails.

### AUTH-P7: Password reset

Steps:

1. Call `POST /api/auth/password/reset/request` with the user's email.
2. If a dev reset token is returned, call `POST /api/auth/password/reset` with `AnotherStrong123`.
3. Login with old password.
4. Login with new password.

Expected:

- Reset request does not leak whether arbitrary emails exist.
- Reset succeeds with valid token and strong password.
- Old password fails after reset.
- New password succeeds.
- Previous refresh sessions are revoked by reset.

## Negative Regression Path

### AUTH-N1: Weak registration password is rejected

Try passwords missing one rule:

- Fewer than 12 characters.
- No uppercase letter.
- No lowercase letter.
- No number.

Expected:

- Registration fails.
- User is not created.

### AUTH-N2: Weak reset password is rejected

Expected:

- Reset fails for weak password.
- Token should not result in a password change.

### AUTH-N3: Invalid login fails safely

Expected:

- Invalid email/password returns unauthorized.
- Response does not reveal whether the email exists.
- Audit/rate-limit event is recorded for known users.

### AUTH-N4: Login lockout after repeated failures

Steps:

1. Use an existing user.
2. Submit 5 failed logins within 15 minutes.
3. Submit a 6th failed login.
4. Submit the correct password before the lockout window expires.

Expected:

- Failed attempts are rejected.
- After 5 failures in 15 minutes, login is temporarily locked.
- Correct password is also blocked until the lockout window expires.

### AUTH-N5: Refresh-token reuse detection

Steps:

1. Login and store refresh token A.
2. Refresh with token A and store refresh token B.
3. Reuse token A.
4. Try refreshing with token B.

Expected:

- Step 2 succeeds.
- Step 3 fails with refresh reuse behavior.
- Step 4 fails because the session family was revoked.

### AUTH-N6: Invalid or expired verification token fails

Expected:

- Invalid email verification token fails.
- Reused verification token fails.
- Expired verification token fails.

### AUTH-N7: Invalid or expired reset token fails

Expected:

- Invalid reset token fails.
- Reused reset token fails.
- Expired reset token fails.

### AUTH-N8: Guarded auth routes require access token

Routes:

- `GET /api/auth/me`
- `POST /api/auth/logout-all`
- `POST /api/auth/email/verification/request`

Expected:

- Missing token fails.
- Malformed token fails.
- Expired token fails.

## Automation Priority

Implemented in `apps/api/test/auth-regression.test.ts`:

1. API regression: weak registration password rejection.
2. API regression: register/login/me/refresh/logout/logout-all.
3. API regression: refresh-token reuse revokes session family.
4. API regression: lockout after 5 failed attempts within 15 minutes.
5. API regression: password reset enforces strong password and revokes sessions.
6. API regression: email verification token is single-use.

Run:

```powershell
pnpm --filter @3s-design/api test:auth
```

Remaining future automation:

- Expired email verification token.
- Expired password reset token.
- Malformed and expired access token guards.
- Direct database assertions for audit logs and session family fields.

## Manual Notes

- Keep test users isolated by timestamped email.
- Do not use real customer emails in local/dev checks.
- Do not log refresh tokens in committed files.
- If a test requires database time manipulation for expiry, automate it as an integration test instead of doing it manually.
