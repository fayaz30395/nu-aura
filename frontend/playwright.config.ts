import {defineConfig, devices} from '@playwright/test';

process.env.NEXT_PUBLIC_E2E_AUTH_STORAGE ??= 'localStorage';

const IS_CI = !!process.env.CI;
const USE_BUILD = process.env.PLAYWRIGHT_USE_BUILD === '1';
const AUTH_DIR = 'playwright/.auth';

// Role aliases match roleAliases in e2e/fixtures/testData.ts (written by e2e/auth.setup.ts).
// Specs live in e2e/roles/<alias>/ ; sa has no role project (it backs `smoke`).
const ROLE_PROJECTS = ['emp', 'tl', 'mgr', 'hrm', 'hra', 'rec', 'fin', 'ta'] as const;
const VIEWPORTS = [
  {name: 'ui-1440', width: 1440, height: 900},
  {name: 'ui-1280', width: 1280, height: 800},
  {name: 'ui-768', width: 768, height: 1024},
  {name: 'ui-390', width: 390, height: 844},
] as const;
// SA state exists only when E2E_ALLOW_SUPER_ADMIN=true; otherwise fall back to the HRA state.
const SMOKE_STATE = `${AUTH_DIR}/${process.env.E2E_ALLOW_SUPER_ADMIN === 'true' ? 'sa' : 'hra'}.json`;

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

  // Maximum time one test can run.
  // Bumped 60s → 120s: Next.js `next dev` first-compile of a fresh route on a
  // cold server takes 30-60s under the Studio Slate v2 token graph. A 60s
  // budget made `page.goto('/attendance')` etc. flake on every spec until
  // routes warmed up. Production-build runs (PLAYWRIGHT_USE_BUILD=1) can
  // shorten this back to 60s once we wire `next build && next start` into
  // the test webServer.
  timeout: (USE_BUILD ? 60 : 120) * 1000,

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

  // A test that needs a retry is flaky: quarantine it with @flaky + an issue id.
  retries: IS_CI ? 1 : 0,

  // Number of parallel workers
  workers: process.env.CI ? 2 : 4,

  // Reporter to use
  // Tags: @smoke @regression @security @ui @a11y @perf @rbac @journey (select with --grep).
  reporter: IS_CI
    ? [['blob'], ['list']]
    : [
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

    // Credential-free smoke — deliberately has NO `dependencies: ['setup']`.
    // If the shared demo password expires (auth.setup.ts fails), every other
    // project below is skipped by Playwright and the suite reports zero
    // signal. This project can't go dark that way: it only exercises public
    // routes and the unauthenticated redirect. See e2e/credential-free.smoke.spec.ts.
    {
      name: 'cred-free',
      use: {...devices['Desktop Chrome']},
      testMatch: /credential-free\.smoke\.spec\.ts/,
    },

    // SA (or HRA fallback) smoke: route-smoke + critical journeys.
    {
      name: 'smoke',
      use: {...devices['Desktop Chrome'], storageState: SMOKE_STATE},
      dependencies: ['setup'],
      testIgnore: [/roles\//, /security\//, /ui\//, /accessibility\//, /mobile\//, /security-.*\.spec\.ts/, /auth-.*\.spec\.ts/, /ui-ux-.*\.spec\.ts/],
    },

    // One project per role, each with its own storageState from auth.setup.ts.
    ...ROLE_PROJECTS.map((role) => ({
      name: role,
      use: {...devices['Desktop Chrome'], storageState: `${AUTH_DIR}/${role}.json`},
      dependencies: ['setup'],
      testMatch: new RegExp(`roles/${role}/.*\\.spec\\.ts`),
    })),

    // Fresh context, no stored auth. Login/lockout specs create their own sessions.
    {
      name: 'security',
      use: {...devices['Desktop Chrome'], storageState: {cookies: [], origins: []}},
      testMatch: /security\/.*\.spec\.ts|security-.*\.spec\.ts|auth-.*\.spec\.ts/,
    },

    // Overflow / visual checks at four viewports, authenticated as HRA.
    ...VIEWPORTS.map(({name, width, height}) => ({
      name,
      use: {...devices['Desktop Chrome'], viewport: {width, height}, storageState: `${AUTH_DIR}/hra.json`},
      dependencies: ['setup'],
      testMatch: /ui\/.*\.spec\.ts|ui-ux-.*\.spec\.ts/,
    })),

    {
      name: 'a11y',
      use: {...devices['Desktop Chrome'], storageState: `${AUTH_DIR}/hra.json`},
      dependencies: ['setup'],
      testMatch: /accessibility\/.*\.spec\.ts/,
    },

    // Firefox is opt-in: PW_FIREFOX=1
    ...(process.env.PW_FIREFOX === '1'
      ? [
          {
            name: 'firefox',
            use: {...devices['Desktop Firefox'], storageState: SMOKE_STATE},
            dependencies: ['setup'],
          },
        ]
      : []),
  ],

  // Run your local dev server before starting the tests
  webServer: {
    command: USE_BUILD ? 'next build && next start -p 3000' : 'npm run dev',
    env: {
      NEXT_PUBLIC_E2E_AUTH_STORAGE: 'localStorage',
    },
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
