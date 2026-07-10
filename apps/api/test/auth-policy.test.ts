import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { isEnglishEmail, normalizeEmail } from '../src/auth/email-policy';
import { resolveJwtAccessSecret } from '../src/auth/auth.module';
import { isStrongPassword } from '../src/auth/password-policy';

const srcDir = path.resolve(process.cwd(), 'src');

void test('auth policy: email normalization keeps login identity predictable', () => {
  assert.equal(normalizeEmail('  USER+Demo@Example.COM  '), 'user+demo@example.com');
  assert.equal(isEnglishEmail('user@example.com'), true);
  assert.equal(isEnglishEmail('مستخدم@example.com'), false);
  assert.equal(isEnglishEmail('user@مثال.com'), false);
});

void test('auth policy: password requires length, lower, upper, and number', () => {
  assert.equal(isStrongPassword('StrongPass1234'), true);
  assert.equal(isStrongPassword('Short1'), false);
  assert.equal(isStrongPassword('lowercase1234'), false);
  assert.equal(isStrongPassword('UPPERCASE1234'), false);
  assert.equal(isStrongPassword('NoNumberPassword'), false);
});

void test('auth policy: production JWT secret fails closed when missing or weak', () => {
  assert.throws(() => resolveJwtAccessSecret(undefined, 'production'), /JWT_ACCESS_SECRET is required/);
  assert.throws(() => resolveJwtAccessSecret('change-me-in-production', 'production'), /strong production secret/);
  assert.throws(() => resolveJwtAccessSecret('short-secret', 'production'), /strong production secret/);
  assert.equal(resolveJwtAccessSecret('x'.repeat(64), 'production'), 'x'.repeat(64));
  assert.equal(resolveJwtAccessSecret(undefined, 'development'), 'dev-only-change-me');
});

void test('auth policy: bearer guard validates the current user record', async () => {
  const source = await readFile(path.join(srcDir, 'auth/jwt-auth.guard.ts'), 'utf8');

  assert.ok(source.includes('.from(users)'), 'JWT guard must check the current users table, not only token claims.');
  assert.ok(source.includes('deletedAt'), 'JWT guard must reject deleted users.');
  assert.ok(source.includes('role: user.role'), 'JWT guard must use the current database role for authorization.');
});

void test('auth policy: refresh and verification tokens are race-safe single-use flows', async () => {
  const source = await readFile(path.join(srcDir, 'auth/auth.service.ts'), 'utf8');

  assert.ok(source.includes('auth-refresh:'), 'Refresh token rotation must serialize by refresh token hash.');
  assert.ok(source.includes("return { error: 'reuse' as const }"), 'Refresh reuse handling must persist family revocation before throwing.');
  assert.ok(source.includes("return { error: 'expired' as const }"), 'Expired refresh handling must persist session revocation before throwing.');
  assert.ok(
    source.includes('isNull(authSessions.revokedAt), isNull(authSessions.replacedBySessionId)'),
    'Refresh token rotation must conditionally revoke only an unused session.',
  );
  assert.ok(source.includes('auth-token:${purpose}'), 'Verification/password reset token consumption must serialize by token hash.');
  assert.ok(
    source.includes('isNull(authVerificationTokens.usedAt), gt(authVerificationTokens.expiresAt, now)'),
    'Verification/password reset token consumption must conditionally mark only an unused, unexpired token.',
  );
});

void test('auth policy: admin step-up has a brute-force limiter', async () => {
  const source = await readFile(path.join(srcDir, 'auth/auth.service.ts'), 'utf8');

  assert.ok(source.includes('assertStepUpAllowed(userId, action)'), 'Admin step-up must check rate limits before password comparison.');
  assert.ok(source.includes('recordStepUpFailure(user.id, action)'), 'Admin step-up failures must be recorded for rate limiting.');
  assert.ok(source.includes('auth.step_up_failed'), 'Admin step-up failures must use a stable rate-limit action.');
});
