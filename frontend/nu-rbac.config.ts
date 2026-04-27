import {defineConfig, devices} from '@playwright/test';

// Standalone config for the nu-chrome-e2e Playwright RBAC sweep.
// Uses the already-running dev server on :3000, no auth setup project,
// single chromium project — pure RBAC URL/redirect verification.
export default defineConfig({
  testDir: './e2e',
  testMatch: /nu-rbac\.spec\.ts/,
  timeout: 45 * 1000,
  expect: {timeout: 8000},
  fullyParallel: true,
  retries: 0,
  workers: Number(process.env.NU_RBAC_WORKERS || 4),
  reporter: [['list'], ['json', {outputFile: 'nu-rbac-report.json'}]],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
    actionTimeout: 8000,
    navigationTimeout: 20000,
  },
  projects: [{name: 'chromium', use: {...devices['Desktop Chrome']}}],
});
