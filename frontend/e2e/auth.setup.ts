import {expect, test as setup, type APIRequestContext, type Page} from '@playwright/test';
import {DEMO_PASSWORD, E2E_LOCK_USER_EMAIL, roleAliases, type RoleAlias} from './fixtures/testData';
import {gotoWithRetry, loginAs} from './fixtures/helpers';

const AUTH_DIR = 'playwright/.auth';
// Legacy single-state file still read by the current playwright.config.ts projects (until T1-01).
const legacyAuthFile = `${AUTH_DIR}/user.json`;

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api/v1';

const REMEDY = [
  'REMEDY — the demo password is on the same 90-day expiry clock as a real one:',
  '  1. Backend must run with DEMO_CREDENTIALS_ENABLED=true (dev/demo/e2e profile).',
  '     With that flag on, AuthService exempts the seeded demo hashes from expiry',
  '     (AuthService.isExpiryExemptDemoAccount) — if this failure says "expired"',
  '     while the flag is on, the account hash is not one of the seeded demo hashes.',
  '  2. To reset the clock on an already-migrated database, run against it:',
  "       UPDATE users SET password_changed_at = NOW() WHERE email LIKE '%@nulogic.io';",
  '     (this is exactly what migration V331 did — do NOT add another dated migration,',
  '      it only defers the same failure by another 90 days.)',
].join('\n');

/**
 * Probe the login API before handing off to `loginAs`, so a credential problem
 * reports its own cause instead of surfacing as "0 tests ran". Every Playwright
 * project declares `dependencies: ['setup']`, so anything thrown here skips the
 * entire suite — the message has to say why on its own.
 */
async function assertDemoCredentialsUsable(
  request: APIRequestContext,
  email: string,
  password: string,
): Promise<void> {
  let status: number;
  let body: string;
  try {
    const response = await request.post(`${API_BASE}/auth/login`, {
      data: {email, password},
      failOnStatusCode: false,
      timeout: 60000,
    });
    status = response.status();
    body = await response.text().catch(() => '<unreadable body>');
    if (response.ok()) return;
  } catch (error) {
    throw new Error(
      `E2E AUTH SETUP FAILED — BACKEND UNREACHABLE.\n` +
        `POST ${API_BASE}/auth/login as ${email} did not complete: ` +
        `${error instanceof Error ? error.message : String(error)}\n` +
        `Check the backend is up on the host in NEXT_PUBLIC_API_URL (default http://localhost:8080/api/v1).`,
    );
  }

  const expired = /expired/i.test(body);
  const headline = expired
    ? 'DEMO CREDENTIALS EXPIRED (password age policy), not a wrong password'
    : status === 401
      ? 'CREDENTIALS REJECTED — wrong password, or the account is locked / demo credentials are disabled on the backend'
      : 'LOGIN REJECTED';

  throw new Error(
    `E2E AUTH SETUP FAILED — ${headline}.\n` +
      `POST ${API_BASE}/auth/login as ${email} → HTTP ${status}\n` +
      `Response body: ${body}\n` +
      `${REMEDY}\n`,
  );
}

/**
 * Create the throwaway lockout user via API as HRA (idempotent: an existing
 * account is fine). Lockout/brute-force specs must target this user only.
 */
async function ensureLockUser(page: Page): Promise<void> {
  const csrf = (await page.context().cookies()).find((c) => c.name === 'XSRF-TOKEN')?.value;
  const response = await page.request.post(`${API_BASE}/employees`, {
    data: {
      firstName: 'NUAURA_TEST_E2E',
      lastName: 'lock',
      workEmail: E2E_LOCK_USER_EMAIL,
      password: DEMO_PASSWORD,
      joiningDate: '2024-01-01',
      designation: 'NUAURA_TEST_E2E lock user',
      employmentType: 'FULL_TIME',
    },
    headers: csrf ? {'X-XSRF-TOKEN': csrf} : {},
    failOnStatusCode: false,
  });
  // 4xx other than "already exists" is surfaced as a warning, not a setup failure.
  if (!response.ok()) {
    console.warn(`lock user create: HTTP ${response.status()} (ok if it already exists)`);
  }
}

/**
 * Authentication Setup
 *
 * Logs in once per role alias (see roleAliases) and writes
 * `playwright/.auth/<alias>.json`. `loginAs` spaces API logins by
 * E2E_API_LOGIN_RATE_LIMIT_DELAY_MS (default 15 s) to stay under the 5/min
 * login limit. SUPER_ADMIN is skipped unless E2E_ALLOW_SUPER_ADMIN=true.
 */
setup('authenticate', async ({page}) => {
  setup.setTimeout(1800000); // dev auth can stall behind Neon/Kafka/Hikari recovery in local E2E

  const aliases = (Object.keys(roleAliases) as RoleAlias[]).filter(
    (alias) => alias !== 'sa' || process.env.E2E_ALLOW_SUPER_ADMIN === 'true',
  );

  for (const [index, alias] of aliases.entries()) {
    const user = roleAliases[alias];

    // Fail with the cause named rather than letting loginAs report "0 tests ran".
    // Probe only the first role; a bad shared password fails every role the same way.
    if (index === 0 && process.env.E2E_AUTH_MODE !== 'local') {
      await assertDemoCredentialsUsable(page.request, user.email, user.password);
    }

    await loginAs(page, user.email, {verifyDashboard: false});

    if (alias === 'hra') {
      await ensureLockUser(page);
    }

    if (index === 0) {
      await warmRoutes(page);
    }

    await page.context().storageState({path: `${AUTH_DIR}/${alias}.json`});
    if (alias === (process.env.E2E_ALLOW_SUPER_ADMIN === 'true' ? 'sa' : 'hra')) {
      await page.context().storageState({path: legacyAuthFile});
    }
  }
});

/**
 * Warm high-traffic protected routes before worker fan-out. In next dev,
 * first compile + hydration of these route chunks can exceed a normal test
 * assertion budget when three or four workers hit cold routes at once.
 */
async function warmRoutes(page: Page): Promise<void> {
  if (process.env.E2E_SKIP_ROUTE_WARMUP === 'true') return;
  const routes = [
    {path: '/me/dashboard', marker: /Dashboard|My Dashboard|Home/i},
    {path: '/analytics', marker: /Analytics/i},
    {path: '/announcements', marker: /Announcements/i},
    {path: '/employees', marker: /Employees/i},
    {path: '/recruitment', marker: /Recruitment/i},
    {path: '/calendar', marker: /Calendar|Today/i},
    {path: '/calendar/new', marker: /Calendar|Schedule|Event|Today/i},
    {path: '/performance', marker: /Performance/i},
    {path: '/admin/roles', marker: /Role Management/i},
    {path: '/admin/permissions', marker: /Permission/i},
    {path: '/admin/shifts', marker: /Shift Management/i},
    {path: '/admin/implicit-roles', marker: /Implicit Roles/i},
    {path: '/approvals', marker: /requests awaiting your decision/i},
    {path: '/approvals/inbox', marker: /requests awaiting your decision/i},
    {path: '/workflows', marker: /Workflow Builder/i},
    {path: '/workflows/new', marker: /Create Workflow/i},
    {path: '/employees/change-requests', marker: /Employment Change Requests/i},
  ];

  for (const route of routes) {
    await gotoWithRetry(page, route.path);
    await expect(page.locator('body')).toContainText(route.marker, {timeout: 180000});
  }
}
