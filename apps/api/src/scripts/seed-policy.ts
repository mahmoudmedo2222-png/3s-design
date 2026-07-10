const productionNames = new Set(['production', 'prod']);

export function isProductionLikeEnvironment(nodeEnv = process.env.NODE_ENV, appEnv = process.env.APP_ENV) {
  return productionNames.has((nodeEnv ?? '').trim().toLowerCase()) || productionNames.has((appEnv ?? '').trim().toLowerCase());
}

export function requireDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new Error('Missing DATABASE_URL');
  }

  return databaseUrl;
}

export function assertNonProductionSeed(seedName: string) {
  if (isProductionLikeEnvironment()) {
    throw new Error(`${seedName} is blocked in production-like environments. Use controlled admin/product workflows instead.`);
  }
}

export function requireConfirmation(name: string, expected: string) {
  const value = process.env[name]?.trim();
  if (value !== expected) {
    throw new Error(`${name} must equal ${expected}`);
  }
}
