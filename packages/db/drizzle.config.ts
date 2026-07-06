import { defineConfig } from 'drizzle-kit';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

function readRootEnv(name: string) {
  if (process.env[name]) {
    return process.env[name];
  }

  const rootEnvPath = fileURLToPath(new URL('../../.env', import.meta.url));

  if (!existsSync(rootEnvPath)) {
    return undefined;
  }

  const line = readFileSync(rootEnvPath, 'utf8')
    .split(/\r?\n/)
    .find((entry) => entry.trim().startsWith(`${name}=`));

  return line?.split('=').slice(1).join('=').trim().replace(/^"|"$/g, '');
}

export default defineConfig({
  schema: './src/schema/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: readRootEnv('DATABASE_URL') ?? 'postgres://postgres:postgres@localhost:5432/3s_design',
  },
  strict: true,
  verbose: true,
});
