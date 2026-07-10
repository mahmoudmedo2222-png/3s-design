import { users } from '@3s-design/db/schema';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { requireConfirmation, requireDatabaseUrl } from './seed-policy';

dotenv.config({ path: fileURLToPath(new URL('../../../../.env', import.meta.url)) });

const CONFIRMATION_TEXT = 'CREATE_3S_DESIGN_ADMIN';

function requireEnv(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }

  return value;
}

function assertStrongPassword(password: string) {
  const checks = [
    password.length >= 14,
    /[a-z]/.test(password),
    /[A-Z]/.test(password),
    /\d/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ];

  if (checks.some((ok) => !ok)) {
    throw new Error('ADMIN_PASSWORD must be at least 14 chars and include lowercase, uppercase, number, and symbol.');
  }
}

function assertEmail(email: string) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('ADMIN_EMAIL must be a valid email address.');
  }
}

async function main() {
  const databaseUrl = requireDatabaseUrl();
  const email = requireEnv('ADMIN_EMAIL').toLowerCase();
  const fullName = requireEnv('ADMIN_FULL_NAME');
  const password = requireEnv('ADMIN_PASSWORD');

  requireConfirmation('ADMIN_SEED_CONFIRM', CONFIRMATION_TEXT);
  assertStrongPassword(password);
  assertEmail(email);

  const pool = new pg.Pool({ connectionString: databaseUrl });
  const db = drizzle(pool);

  try {
    const [existingAdmin] = await db.select({ id: users.id }).from(users).where(eq(users.role, 'admin')).limit(1);

    if (existingAdmin) {
      throw new Error('Admin user already exists. Refusing to create another admin via seed.');
    }

    const [existingEmail] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);

    if (existingEmail) {
      throw new Error('A user with ADMIN_EMAIL already exists.');
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const [created] = await db
      .insert(users)
      .values({
        email,
        fullName,
        passwordHash,
        role: 'admin',
        isEmailVerified: true,
      })
      .returning({
        id: users.id,
        email: users.email,
        role: users.role,
      });

    if (!created) {
      throw new Error('Admin seed failed.');
    }

    console.log(`Created admin user: ${created.email} (${created.id})`);
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown seed error';
  console.error(message);
  process.exitCode = 1;
});
