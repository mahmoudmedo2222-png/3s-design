import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.SITE_AUDIT_BASE_URL ?? 'http://localhost:3000';

export default defineConfig({
  testDir: './apps/web/test',
  testMatch: '**/site-quality.spec.ts',
  timeout: 45_000,
  expect: {
    timeout: 5_000,
  },
  reporter: [['list'], ['html', { outputFolder: 'reports/site-quality/playwright', open: 'never' }]],
  webServer: {
    command: 'corepack pnpm --filter @3s-design/web dev',
    url: baseURL,
    reuseExistingServer: true,
    timeout: 120_000,
  },
  use: {
    baseURL,
    trace: 'off',
  },
  projects: [
    {
      name: 'desktop-chrome',
      use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    },
  ],
});
