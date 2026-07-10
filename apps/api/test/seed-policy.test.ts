import assert from 'node:assert/strict';
import test from 'node:test';
import { assertNonProductionSeed, isProductionLikeEnvironment, requireConfirmation } from '../src/scripts/seed-policy';

void test('seed policy: detects production-like environments', () => {
  assert.equal(isProductionLikeEnvironment('production', undefined), true);
  assert.equal(isProductionLikeEnvironment('prod', undefined), true);
  assert.equal(isProductionLikeEnvironment('development', 'production'), true);
  assert.equal(isProductionLikeEnvironment('staging', undefined), false);
  assert.equal(isProductionLikeEnvironment(undefined, undefined), false);
});

void test('seed policy: demo seeds are blocked in production-like environments', () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousAppEnv = process.env.APP_ENV;

  try {
    process.env.NODE_ENV = 'production';
    delete process.env.APP_ENV;
    assert.throws(() => assertNonProductionSeed('seed:demo'), /blocked in production-like environments/);

    process.env.NODE_ENV = 'development';
    process.env.APP_ENV = 'staging';
    assert.doesNotThrow(() => assertNonProductionSeed('seed:demo'));
  } finally {
    setOptionalEnv('NODE_ENV', previousNodeEnv);
    setOptionalEnv('APP_ENV', previousAppEnv);
  }
});

void test('seed policy: privileged seeds require exact confirmation', () => {
  const previous = process.env.ADMIN_SEED_CONFIRM;

  try {
    process.env.ADMIN_SEED_CONFIRM = 'wrong';
    assert.throws(() => requireConfirmation('ADMIN_SEED_CONFIRM', 'CREATE_3S_DESIGN_ADMIN'), /ADMIN_SEED_CONFIRM/);

    process.env.ADMIN_SEED_CONFIRM = 'CREATE_3S_DESIGN_ADMIN';
    assert.doesNotThrow(() => requireConfirmation('ADMIN_SEED_CONFIRM', 'CREATE_3S_DESIGN_ADMIN'));
  } finally {
    setOptionalEnv('ADMIN_SEED_CONFIRM', previous);
  }
});

function setOptionalEnv(name: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[name];
    return;
  }

  process.env[name] = value;
}
