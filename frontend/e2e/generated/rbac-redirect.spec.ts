import {test, expect, request} from '@playwright/test';
import matrix from './rbac-matrix.json';
import {demoUsers} from '../fixtures/testData';

// Map YAML role codes → testData fixture keys.
const ROLE_MAP: Record<string, keyof typeof demoUsers> = {
  SUPER_ADMIN: 'superAdmin',
  TENANT_ADMIN: 'tenantAdmin' as keyof typeof demoUsers,
  HR_ADMIN: 'hrAdmin' as keyof typeof demoUsers,
  HR_MANAGER: 'hrManager',
  RECRUITMENT_ADMIN: 'recruitmentAdmin',
  FINANCE_ADMIN: 'financeAdmin' as keyof typeof demoUsers,
  MANAGER: 'managerEng',
  TEAM_LEAD: 'teamLead' as keyof typeof demoUsers,
  EMPLOYEE: 'employeeSaran',
};

// Admin-scoped route prefixes — low-priv roles MUST be denied (403/redirect).
// Anything else under `expected: observe` we don't fail on; just record.
const ADMIN_PREFIXES = [
  /^\/admin(\/|$)/,
  /^\/payroll\/runs/,
  /^\/payroll\/settings/,
  /^\/recruitment\/(jobs|candidates|agencies|pipeline)/,
  /^\/settings\/(tenants|roles|permissions|integrations|api-keys)/,
];
const LOW_PRIV = new Set(['EMPLOYEE', 'TEAM_LEAD', 'MANAGER']);

const isAdminScoped = (route: string) => ADMIN_PREFIXES.some((re) => re.test(route));

// Negative cells only: low-priv role × admin-scoped route. ~30-50 cells.
const negativeCells = (matrix as Array<{role: string; route: string; id: string}>).filter(
  (c) => LOW_PRIV.has(c.role) && isAdminScoped(c.route),
);

test.describe.parallel('@rbac low-priv denied on admin scope', () => {
  // Use storageState=undefined (anonymous), then login per role inside each test.
  // We don't share storage across tests — RBAC cells need clean per-role context.
  test.use({storageState: {cookies: [], origins: []}});

  for (const cell of negativeCells) {
    const fixtureKey = ROLE_MAP[cell.role];
    const user = (demoUsers as Record<string, {email: string; password?: string; name: string}>)[
      fixtureKey as string
    ];
    if (!user) continue; // role missing from fixtures — skip rather than crash

    test(`${cell.role} → ${cell.route} (deny)`, async ({page}) => {
      test.setTimeout(120000);
      // Demo-mode one-click login (same flow as auth.setup.ts).
      await page.goto('/auth/login');
      await page.waitForLoadState('networkidle');
      const btn = page.locator('button').filter({hasText: user.name});
      await expect(btn, `demo button for ${user.name}`).toBeVisible({timeout: 15000});
      await btn.click();
      // Wait for the post-login redirect. Under parallel load the navigation
      // can take longer than 30s, so we widen the budget AND fall back to
      // checking the access_token cookie if the URL never matches (e.g. when
      // the redirect lands on /me/dashboard via client-side router.replace).
      try {
        await page.waitForURL(/\/dashboard|\/me\//, {timeout: 60000});
      } catch {
        await page.waitForLoadState('networkidle').catch(() => {});
        const cookies = await page.context().cookies();
        const hasToken = cookies.some((c) => c.name === 'access_token' && !!c.value);
        if (!hasToken) throw new Error(`login flow did not set access_token for ${user.name}`);
      }

      // Now attempt the admin-scoped route.
      const res = await page.goto(cell.route, {waitUntil: 'domcontentloaded'});
      const status = res?.status() ?? 0;
      const finalUrl = page.url();

      // Pass criteria (any one):
      //   - HTTP 401/403
      //   - server-side redirect away from the requested path
      //   - client-side redirect (final URL does not contain the requested route)
      //   - "access denied" / "unauthorized" / "forbidden" in body
      const denied403 = status === 401 || status === 403;
      const redirected = !finalUrl.includes(cell.route);
      const body = (await page.locator('body').innerText().catch(() => '')).toLowerCase();
      const denialCopy = /access denied|unauthorized|forbidden|not authorized/.test(body);

      expect(
        denied403 || redirected || denialCopy,
        `expected ${cell.role} to be denied at ${cell.route} — got status=${status} finalUrl=${finalUrl}`,
      ).toBe(true);
    });
  }
});
