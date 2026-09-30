import {expect, test as setup, type APIRequestContext} from '@playwright/test';
import {demoUsers} from './fixtures/testData';
import {gotoWithRetry, loginAs} from './fixtures/helpers';

const authFile = 'playwright/.auth/user.json';

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
 * Authentication Setup
 *
 * Runs once before all tests and stores authentication state. Uses the
 * API-backed login helper because the production login bundle may omit
 * the demo account panel and UI form failures should not block non-auth
 * suites that only need a valid session.
 *
 * Authenticates as SUPER_ADMIN (fayaz.m@nulogic.io) for broadest
 * permission coverage downstream.
 */
setup('authenticate', async ({page}) => {
  setup.setTimeout(1800000); // dev auth can stall behind Neon/Kafka/Hikari recovery in local E2E

  const defaultUser = demoUsers.superAdmin;

  // Fail here, with the cause named, rather than letting a credential problem
  // reach `loginAs` — which can fall back to synthetic local auth state
  // (E2E_ALLOW_LOCAL_AUTH_FALLBACK) and let the suite "pass" against a session
  // the backend never issued. Skipped only in the explicitly offline auth mode.
  if (process.env.E2E_AUTH_MODE !== 'local') {
    await assertDemoCredentialsUsable(page.request, defaultUser.email, defaultUser.password);
  }

  await loginAs(page, defaultUser.email, {verifyDashboard: false});

  // Warm high-traffic protected routes before worker fan-out. In next dev,
  // first compile + hydration of these route chunks can exceed a normal test
  // assertion budget when three or four workers hit cold routes at once.
  const warmRoutes = process.env.E2E_SKIP_ROUTE_WARMUP === 'true' ? [] : [
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

  for (const route of warmRoutes) {
    await gotoWithRetry(page, route.path);
    await expect(page.locator('body')).toContainText(route.marker, {timeout: 180000});
  }

  // Store authenticated state
  await page.context().storageState({path: authFile});
});
