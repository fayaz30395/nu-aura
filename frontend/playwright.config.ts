import {defineConfig, devices} from '@playwright/test';

/**
 * Playwright E2E Test Configuration for HRMS Frontend
 *
 * Features:
 * - Multi-browser testing (Chromium, Firefox)
 * - Screenshot on failure
 * - Video recording for failed tests
 * - Trace collection for debugging
 * - Visual regression testing support
 * - Parallel test execution with shared auth state
 */
export default defineConfig({
  // Test directory
  testDir: './e2e',

  // Maximum time one test can run
  timeout: 60 * 1000,

  // Maximum time to wait for each assertion
  expect: {
    timeout: 10000,
    // Visual comparison threshold
    toHaveScreenshot: {
      maxDiffPixels: 500,
    },
  },

  // Run tests in files in parallel
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 1,

  // Number of parallel workers
  workers: process.env.CI ? 2 : 4,

  // Reporter to use
  reporter: [
    ['html', {outputFolder: 'playwright-report'}],
    ['json', {outputFile: 'playwright-report/results.json'}],
    ['list'],
  ],

  // Shared settings for all projects
  use: {
    // Base URL for navigation
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',

    // Collect trace when retrying the failed test
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Video on failure
    video: 'retain-on-failure',

    // Maximum time for actions
    actionTimeout: 15000,

    // Browser context options
    viewport: {width: 1280, height: 720},

    // Ignore HTTPS errors
    ignoreHTTPSErrors: true,

    // Accept downloads
    acceptDownloads: true,
  },

  // Configure projects for major browsers
  projects: [
    // Setup project - runs auth setup once
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },

    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Use stored auth state
        storageState: 'playwright/.auth/user.json',
        launchOptions: {
          args: ['--disable-web-security'],
        },
      },
      dependencies: ['setup'],
    },

    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        // Use stored auth state
        storageState: 'playwright/.auth/user.json',
      },
      dependencies: ['setup'],
    },

    // Mobile viewport projects
    {
      name: 'mobile-chrome',
      use: {
        ...devices['Pixel 5'],
        storageState: 'playwright/.auth/user.json',
      },
      dependencies: ['setup'],
      testMatch: /.*\.mobile\.spec\.ts/,
    },

    {
      name: 'mobile-safari',
      use: {
        ...devices['iPhone 13'],
        storageState: 'playwright/.auth/user.json',
      },
      dependencies: ['setup'],
      testMatch: /.*\.mobile\.spec\.ts/,
    },

    // Tablet viewport project
    {
      name: 'tablet',
      use: {
        ...devices['iPad Pro 11'],
        storageState: 'playwright/.auth/user.json',
      },
      dependencies: ['setup'],
      testMatch: /.*\.mobile\.spec\.ts/,
    },
  ],

  // Run your local dev server before starting the tests
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
