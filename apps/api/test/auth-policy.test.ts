import assert from 'node:assert/strict';
import test from 'node:test';
import { isEnglishEmail, normalizeEmail } from '../src/auth/email-policy';
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
