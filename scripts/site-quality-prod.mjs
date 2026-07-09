import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

const port = process.env.SITE_AUDIT_PORT ?? '3100';
const baseUrl = process.env.SITE_AUDIT_BASE_URL ?? `http://127.0.0.1:${port}`;
const webDir = path.resolve('apps/web');
const nextBin = path.join(webDir, 'node_modules/next/dist/bin/next');

cleanupStaleProjectBuilds();
runTypecheck({
  cwd: webDir,
  env: {
    ...process.env,
    NODE_OPTIONS: process.env.NODE_OPTIONS ?? '--max-old-space-size=4096',
  },
});
await removeStaleBuildLock();
const buildStartedAt = Date.now();
runNextBuild({
  cwd: webDir,
  env: {
    ...process.env,
    NEXT_PRIVATE_BUILD_WORKER: '0',
    NODE_OPTIONS: process.env.NODE_OPTIONS ?? '--max-old-space-size=4096',
    SITE_AUDIT_SKIP_NEXT_TYPECHECK: 'true',
  },
});
await waitForProductionBuild(buildStartedAt);

const server = spawn(process.execPath, [nextBin, 'start', '-H', '127.0.0.1', '-p', port], {
  cwd: webDir,
  env: { ...process.env, PORT: port },
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
  stopProcessTree(server.pid);
}

function runTypecheck(options = {}) {
  const result = spawnSync(process.execPath, ['../../node_modules/typescript/bin/tsc', '-p', 'tsconfig.json', '--noEmit'], {
    stdio: 'inherit',
    ...options,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function runNextBuild(options = {}) {
  const result = spawnSync(process.execPath, [nextBin, 'build'], { stdio: 'inherit', ...options });
  if (result.status !== 0) {
    console.warn(`next build exited with ${result.status ?? 1}; verifying production build files before failing.`);
  }
}

function cleanupStaleProjectBuilds() {
  if (process.platform !== 'win32') {
    return;
  }

  const projectPath = path.resolve('.').replaceAll("'", "''").toLowerCase();
  const command = `
    $projectPath = '${projectPath}';
    Get-CimInstance Win32_Process -Filter "name = 'node.exe'" |
      Where-Object {
        $commandLine = ($_.CommandLine ?? '').ToLowerInvariant();
        $_.ProcessId -ne ${process.pid} -and
          $commandLine.Contains($projectPath) -and
          (
            ($commandLine.Contains('next') -and $commandLine.Contains('build')) -or
            $commandLine.Contains('.next\\build')
          )
      } |
      ForEach-Object { taskkill.exe /PID $_.ProcessId /T /F | Out-Null }
  `;
  spawnSync('powershell.exe', ['-NoProfile', '-Command', command], { stdio: 'ignore' });
}

async function removeStaleBuildLock() {
  await fs.rm(path.join(webDir, '.next/lock'), { force: true });
}

async function waitForProductionBuild(buildStartedAt) {
  const deadline = Date.now() + 30_000;
  const requiredFiles = ['.next/BUILD_ID', '.next/routes-manifest.json', '.next/server'];

  while (Date.now() < deadline) {
    const checks = await Promise.all(
      requiredFiles.map(async (file) => {
        try {
          const stat = await fs.stat(path.join(webDir, file));
          return stat.mtimeMs >= buildStartedAt;
        } catch {
          return false;
        }
      }),
    );

    if (checks.every(Boolean)) {
      await new Promise((resolve) => setTimeout(resolve, 1_000));
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error('Fresh production build files were not ready after next build completed.');
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

function stopProcessTree(pid) {
  if (!pid) {
    return;
  }

  if (process.platform === 'win32') {
    spawnSync('taskkill.exe', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore' });
    return;
  }

  try {
    process.kill(-pid);
  } catch {
    try {
      process.kill(pid);
    } catch {
      // The server may already be gone after a failed startup.
    }
  }
}
