/**
 * Green-flag live UI smoke — runs against the deployed Vercel+Railway stack.
 *
 * Drives a real Chromium browser through login + 15 protected routes for
 * each of three demo roles.  Collects console errors and HTTP 5xx signals
 * per route without hard-failing on a single route, so the full matrix is
 * always reported.
 *
 * Run with:
 *   cd frontend && \
 *   PLAYWRIGHT_BASE_URL=https://hrms-frontend-vert.vercel.app \
 *   NEXT_PUBLIC_E2E_AUTH_STORAGE=cookie \
 *   npx playwright test e2e/greenflag-live-ui.production.spec.ts \
 *     --config playwright.production.config.ts \
 *     --project=production-chromium
 */
import {expect, test, type BrowserContext, type Page} from '@playwright/test';
import {isNoise} from './generated/known-noise';
import * as fs from 'fs';
import * as path from 'path';

// ─── Config ─────────────────────────────────────────────────────────────────

const DEMO_PASSWORD = 'Welcome@123';
const LOGIN_TIMEOUT = 90_000; // Railway cold-start can take up to 60 s

const ROUTES = [
  '/me/dashboard',
  '/dashboard',
  '/employees',
  '/attendance',
  '/leave',
  '/payroll',
  '/expenses',
  '/performance',
  '/recruitment',
  '/reports',
  '/settings',
  '/fluence',
  '/announcements',
  '/assets',
  '/org-chart',
];

interface RoleConfig {
  role: string;
  email: string;
}

const ROLES: RoleConfig[] = [
  {role: 'SUPER_ADMIN', email: 'fayaz.m@nulogic.io'},
  {role: 'MANAGER', email: 'sumit@nulogic.io'},
  {role: 'EMPLOYEE', email: 'saran@nulogic.io'},
];

// ─── Types ───────────────────────────────────────────────────────────────────

interface RouteResult {
  path: string;
  ok: boolean;
  consoleErrors: number;
  api5xx: number;
  errorSamples: string[];
}

interface RoleSummary {
  role: string;
  email: string;
  loginOk: boolean;
  routes: RouteResult[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function ensureTestResultsDir(): string {
  const dir = path.join(process.cwd(), 'test-results');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, {recursive: true});
  }
  return dir;
}

/**
 * Attach per-page error collectors to an already-open page.
 * Returns arrays that are populated as events arrive.
 */
function attachCollectors(page: Page): {
  consoleErrors: string[];
  api5xxUrls: string[];
} {
  const consoleErrors: string[] = [];
  const api5xxUrls: string[] = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error' && !isNoise(msg.text())) {
      consoleErrors.push(msg.text());
    }
  });

  page.on('response', (response) => {
    if (response.status() >= 500) {
      api5xxUrls.push(`${response.status()} ${response.url()}`);
    }
  });

  return {consoleErrors, api5xxUrls};
}

/**
 * Perform form-based login for a single role in a fresh browser context.
 * Returns true if login succeeded (URL left /auth/login).
 */
async function loginViaForm(
  context: BrowserContext,
  page: Page,
  email: string,
): Promise<boolean> {
  await page.goto('/auth/login', {waitUntil: 'domcontentloaded'});

  // Fill email and password
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(DEMO_PASSWORD);
  await page.locator('button[type="submit"]').click();

  try {
    await page.waitForURL((url) => !url.pathname.startsWith('/auth/login'), {
      timeout: LOGIN_TIMEOUT,
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Visit a single route, assert body visible+non-empty (soft), capture errors.
 */
async function probeRoute(
  page: Page,
  routePath: string,
  consoleErrors: string[],
  api5xxUrls: string[],
): Promise<RouteResult> {
  // Snapshot array lengths before navigation so we count incremental errors
  const errsBefore = consoleErrors.length;
  const fivexxBefore = api5xxUrls.length;
  let ok = false;
  const errorSamples: string[] = [];

  try {
    await page.goto(routePath, {waitUntil: 'domcontentloaded', timeout: 30_000});
    await page.waitForLoadState('domcontentloaded');

    // Soft assertion — record failure but continue
    const body = page.locator('body');
    const isVisible = await body.isVisible().catch(() => false);
    const text = await body.innerText().catch(() => '');
    ok = isVisible && text.trim().length > 0;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    errorSamples.push(`navigation error: ${msg}`);
    ok = false;
  }

  const newConsoleErrors = consoleErrors.slice(errsBefore);
  const new5xx = api5xxUrls.slice(fivexxBefore);

  // Collect samples for reporting
  newConsoleErrors.slice(0, 3).forEach((e) => errorSamples.push(`console: ${e}`));
  new5xx.slice(0, 3).forEach((e) => errorSamples.push(`5xx: ${e}`));

  return {
    path: routePath,
    ok,
    consoleErrors: newConsoleErrors.length,
    api5xx: new5xx.length,
    errorSamples,
  };
}

// ─── Test suite ──────────────────────────────────────────────────────────────

test.use({
  storageState: {cookies: [], origins: []},
});

for (const roleConfig of ROLES) {
  test(`green-flag smoke — ${roleConfig.role} (${roleConfig.email})`, async ({
    browser,
  }) => {
    const context = await browser.newContext({
      storageState: {cookies: [], origins: []},
    });
    const page = await context.newPage();

    const {consoleErrors, api5xxUrls} = attachCollectors(page);

    const summary: RoleSummary = {
      role: roleConfig.role,
      email: roleConfig.email,
      loginOk: false,
      routes: [],
    };

    // ── Login ──────────────────────────────────────────────────────────────
    await test.step(`login as ${roleConfig.role}`, async () => {
      summary.loginOk = await loginViaForm(context, page, roleConfig.email);
      console.log(
        `[greenflag] ${roleConfig.role} login: ${summary.loginOk ? 'OK' : 'FAILED'}`,
      );
      expect(summary.loginOk).toBe(true);
    });

    if (!summary.loginOk) {
      console.log(`___GFLAG___ ${JSON.stringify(summary)}`);
      await context.close();
      return;
    }

    // Screenshot of /me/dashboard after login
    await test.step('screenshot /me/dashboard', async () => {
      try {
        await page.goto('/me/dashboard', {waitUntil: 'domcontentloaded', timeout: 30_000});
        const dir = ensureTestResultsDir();
        const screenshotPath = path.join(
          dir,
          `dashboard-${roleConfig.role.toLowerCase()}.png`,
        );
        await page.screenshot({path: screenshotPath, fullPage: false});
        console.log(`[greenflag] screenshot saved: ${screenshotPath}`);
      } catch (err: unknown) {
        console.log(
          `[greenflag] screenshot failed: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    });

    // ── Route probes ───────────────────────────────────────────────────────
    for (const routePath of ROUTES) {
      // Skip /me/dashboard duplicate — already probed above for screenshot;
      // we still probe it here so the matrix is complete.
      await test.step(`probe ${routePath}`, async () => {
        const result = await probeRoute(page, routePath, consoleErrors, api5xxUrls);
        summary.routes.push(result);
        const status = result.ok ? 'OK' : 'FAIL';
        console.log(
          `[greenflag] ${roleConfig.role} ${routePath}: ${status}` +
            (result.consoleErrors > 0 ? ` consoleErrors=${result.consoleErrors}` : '') +
            (result.api5xx > 0 ? ` 5xx=${result.api5xx}` : ''),
        );
      });
    }

    // ── Emit structured summary ────────────────────────────────────────────
    console.log(`___GFLAG___ ${JSON.stringify(summary)}`);

    await context.close();

    // Non-blocking: test passes even if individual routes had issues.
    // The summary JSON is the source of truth for the caller.
  });
}
