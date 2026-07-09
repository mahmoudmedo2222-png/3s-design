import assert from 'node:assert/strict';
import test from 'node:test';
import { isEnglishEmail, normalizeEmail } from '../src/auth/email-policy';
import { resolveJwtAccessSecret } from '../src/auth/auth.module';
import { isStrongPassword } from '../src/auth/password-policy';

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
