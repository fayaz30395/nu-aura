import { defineConfig } from '@playwright/test';

// Standalone Playwright config for the Agent OS browser E2E (separate from the
// frontend app's config). Run from frontend/ so the installed browsers resolve:
//   cd frontend && npx playwright test --config ../scripts/playwright.config.ts
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  reporter: 'line',
  use: { headless: true, browserName: 'chromium' },
});
