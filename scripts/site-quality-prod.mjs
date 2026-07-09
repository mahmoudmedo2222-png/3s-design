import { spawn, spawnSync } from 'node:child_process';

const port = process.env.SITE_AUDIT_PORT ?? '3100';
const baseUrl = process.env.SITE_AUDIT_BASE_URL ?? `http://localhost:${port}`;

run('corepack', ['pnpm', '--filter', '@3s-design/web', 'build']);

const server = spawn('corepack', ['pnpm', '--filter', '@3s-design/web', 'exec', 'next', 'start', '-p', port], {
  env: { ...process.env, PORT: port },
  shell: true,
  stdio: ['ignore', 'pipe', 'pipe'],
});

let serverOutput = '';
server.stdout.on('data', (chunk) => {
  serverOutput += chunk.toString();
});
server.stderr.on('data', (chunk) => {
  serverOutput += chunk.toString();
});

try {
  await waitForServer(baseUrl);
  process.env.SITE_AUDIT_BASE_URL = baseUrl;
  await import('./site-quality.mjs');
} finally {
  server.kill();
}

function run(command, args) {
  const result = spawnSync(command, args, { shell: true, stdio: 'inherit' });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

async function waitForServer(url) {
  const deadline = Date.now() + 60_000;
  let lastError;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(2_000) });
      if (response.ok) {
        return;
      }
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }

    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }

  console.error(`Production site did not become ready at ${url}.`);
  if (serverOutput.trim()) {
    console.error(serverOutput.trim());
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}
