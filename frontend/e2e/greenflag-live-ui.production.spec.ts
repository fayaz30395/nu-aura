/**
 * Green-flag live UI smoke — runs against the deployed Vercel+Railway stack.
 *
 * Drives a real Chromium browser through login + broad protected routes for every
 * RBAC sample account in `allDemoUsers`.  Collects console errors and HTTP 5xx
 * per route and reports a full matrix summary.
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
import {allDemoUsers, DEMO_PASSWORD, type DemoRole} from './fixtures/testData';
import {isNoise} from './generated/known-noise';
import * as fs from 'fs';
import * as path from 'path';

// ─── Config ─────────────────────────────────────────────────────────────────

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
  '/admin',
  '/admin/roles',
  '/admin/permissions',
  '/payroll/runs',
  '/recruitment/candidates',
  '/settings/security',
];

const KNOWN_UNSEEDED_ACCOUNTS = new Set(['tenant.admin@nulogic.io']);

// ─── Types ───────────────────────────────────────────────────────────────────

interface RouteResult {
  path: string;
  ok: boolean;
  status: number;
  consoleErrors: number;
  api5xx: number;
  redirectedToLogin: boolean;
  denied: boolean;
  errorSamples: string[];
}

interface RoleSummary {
  role: DemoRole;
  email: string;
  loginOk: boolean;
  skipped: boolean;
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
 * Admin role access expectation used to distinguish legitimate RBAC denies.
 */
function hasAdminAccess(role: DemoRole): boolean {
  return role === 'SUPER_ADMIN' || role === 'TENANT_ADMIN';
}

function isAllowedDeny(role: DemoRole, result: RouteResult): boolean {
  const isAdminRoute = result.path.startsWith('/admin') || result.path.startsWith('/admin/');
  return result.denied && (isAdminRoute || result.status === 403 || result.status === 401) && !hasAdminAccess(role);
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
  await context.clearCookies();
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
  role: DemoRole,
  routePath: string,
  consoleErrors: string[],
  api5xxUrls: string[],
): Promise<RouteResult> {
  // Snapshot array lengths before navigation so we count incremental errors
  const errsBefore = consoleErrors.length;
  const fivexxBefore = api5xxUrls.length;
  let ok = false;
  let status = 0;
  let redirectedToLogin = false;
  let denied = false;
  const errorSamples: string[] = [];

  try {
    const response = await page.goto(routePath, {waitUntil: 'domcontentloaded', timeout: 30_000});
    status = response?.status() ?? 0;
    await page.waitForLoadState('domcontentloaded');

    redirectedToLogin = page.url().includes('/auth/login');
    const body = page.locator('body');
    const isVisible = await body.isVisible().catch(() => false);
    const text = await body.innerText().catch(() => '');

    denied =
      status === 401 ||
      status === 403 ||
      /403|Forbidden|Access Denied|not authorized|not allowed|unauthorized|not authorized/i.test(text);

    ok = isVisible && text.trim().length > 0;

    if (role !== 'SUPER_ADMIN' && denied && !hasAdminAccess(role) && routePath.startsWith('/admin')) {
      // Expected RBAC-deny behaviour on admin scope for non-admin roles.
      ok = true;
    }
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
    status,
    consoleErrors: newConsoleErrors.length,
    api5xx: new5xx.length,
    redirectedToLogin,
    denied,
    errorSamples,
  };
}

// ─── Test suite ──────────────────────────────────────────────────────────────

test.use({
  storageState: {cookies: [], origins: []},
});

for (const roleConfig of allDemoUsers) {
  test(`green-flag smoke — ${roleConfig.role} (${roleConfig.email})`, async ({browser}) => {
    const context = await browser.newContext({
      storageState: {cookies: [], origins: []},
    });
    const page = await context.newPage();

    const {consoleErrors, api5xxUrls} = attachCollectors(page);

    const summary: RoleSummary = {
      role: roleConfig.role,
      email: roleConfig.email,
      loginOk: false,
      skipped: false,
      routes: [],
    };

    // ── Login ──────────────────────────────────────────────────────────────
    await test.step(`login as ${roleConfig.role}`, async () => {
      summary.loginOk = await loginViaForm(context, page, roleConfig.email);
      console.log(
        `[greenflag] ${roleConfig.role} (${roleConfig.email}) login: ${summary.loginOk ? 'OK' : 'FAILED'}`,
      );
      if (!summary.loginOk && KNOWN_UNSEEDED_ACCOUNTS.has(roleConfig.email)) {
        summary.skipped = true;
        return;
      }
      expect(summary.loginOk).toBe(true);
    });

    if (summary.skipped) {
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
      await test.step(`probe ${routePath}`, async () => {
        const result = await probeRoute(page, roleConfig.role, routePath, consoleErrors, api5xxUrls);
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
    const severeRouteFailures = summary.routes.filter(
      (result) => result.status >= 500 || (result.redirectedToLogin && result.path !== '/auth/login'),
    );
    if (severeRouteFailures.length > 0) {
      console.log(
        `[greenflag] ${roleConfig.role} severe route failures: ${JSON.stringify(severeRouteFailures)}`,
      );
    }
    expect(
      severeRouteFailures.length,
      `${roleConfig.role} has ${severeRouteFailures.length} severe route failures`,
    ).toBe(0);

    await context.close();
  });
}
