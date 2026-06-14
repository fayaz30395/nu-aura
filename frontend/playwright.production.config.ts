import {defineConfig, devices} from '@playwright/test';
import baseConfig from './playwright.config';

const chromiumExecutablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
const productionBaseUrl = process.env.PLAYWRIGHT_BASE_URL ?? 'https://hrms-frontend-vert.vercel.app';

/**
 * Production/deployed-environment Playwright profile.
 *
 * The default config starts `npm run dev`, which is correct for local feature
 * QA but wrong for deployed smoke because it can mask environment-specific
 * Vercel/Railway routing and CORS issues. This profile intentionally has no
 * webServer and runs a small critical shard against PLAYWRIGHT_BASE_URL.
 */
export default defineConfig({
  ...baseConfig,
  testDir: './e2e',
  webServer: undefined,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : 1,
  reporter: [
    ['html', {outputFolder: 'playwright-report-production'}],
    ['json', {outputFile: 'playwright-report-production/results.json'}],
    ['list'],
  ],
  use: {
    ...baseConfig.use,
    baseURL: productionBaseUrl,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'production-chromium',
      use: {
        ...devices['Desktop Chrome'],
        ...(chromiumExecutablePath
          ? {launchOptions: {executablePath: chromiumExecutablePath}}
          : {}),
      },
      testMatch: /.*\.production\.spec\.ts/,
    },
    {
      name: 'production-mobile',
      use: {
        ...devices['Pixel 5'],
      },
      testMatch: /.*\.production\.spec\.ts/,
    },
  ],
});
