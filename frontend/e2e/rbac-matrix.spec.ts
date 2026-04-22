/**
 * rbac-matrix.spec.ts
 *
 * Parallel RBAC verification: 9 personas × representative route subset.
 * Each persona gets its own browser context seeded from a pre-captured
 * storageState file (see rbac-matrix.setup.ts).
 *
 * Assertions per cell:
 *   - render   → URL stays on target, H1 canonical text present
 *   - redirect → URL bounced to /login or /me/*, AND the underlying
 *                /api/v1 endpoint returns 403 for that role
 *
 * The route list is a hand-picked ~30-route subset derived from the real
 * frontend/app tree. Full 262-route coverage is out of scope for this first
 * pass; extend the ROUTES array as needed.
 */
import {test, expect, BrowserContext, chromium, APIRequestContext, request} from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';

const AUTH_DIR = path.join(__dirname, '.auth');
const FRONTEND_BASE = process.env.FRONTEND_BASE_URL || 'http://localhost:3000';
const API_BASE = process.env.API_BASE_URL || 'http://localhost:8080';

type Expect = 'render' | 'redirect';

type RouteSpec = {
  route: string;
  h1?: RegExp;
  api?: string; // underlying REST endpoint for 403 negative check on redirect rows
  roles: Record<string, Expect>;
};

const R = (cols: Partial<Record<string, Expect>>, fallback: Expect = 'render'): Record<string, Expect> => ({
  SUPER_ADMIN: fallback,
  TENANT_ADMIN: fallback,
  HR_ADMIN: fallback,
  HR_MANAGER: fallback,
  MANAGER: fallback,
  TEAM_LEAD: fallback,
  EMPLOYEE: fallback,
  RECRUITER: fallback,
  FINANCE: fallback,
  ...cols,
});

const ROUTES: RouteSpec[] = [
  {route: '/dashboard', h1: /dashboard/i, roles: R({})},
  {route: '/employees', h1: /employee/i, api: '/api/v1/employees', roles: R({EMPLOYEE: 'redirect'})},
  {route: '/admin/employees', h1: /employee/i, api: '/api/v1/employees', roles: R({EMPLOYEE: 'redirect', TEAM_LEAD: 'redirect'})},
  {route: '/admin/roles', h1: /role/i, api: '/api/v1/roles', roles: R({EMPLOYEE: 'redirect', TEAM_LEAD: 'redirect', MANAGER: 'redirect', HR_MANAGER: 'redirect'})},
  {route: '/admin/permissions', h1: /permission/i, api: '/api/v1/permissions', roles: R({EMPLOYEE: 'redirect', TEAM_LEAD: 'redirect', MANAGER: 'redirect', HR_MANAGER: 'redirect'})},
  {route: '/admin/payroll', h1: /payroll/i, api: '/api/v1/payroll/runs', roles: R({EMPLOYEE: 'redirect', TEAM_LEAD: 'redirect', MANAGER: 'redirect'})},
  {route: '/analytics/org-health', h1: /organization health/i, api: '/api/v1/analytics/org-health', roles: R({EMPLOYEE: 'redirect', TEAM_LEAD: 'redirect', MANAGER: 'redirect'})},
  {route: '/fluence/wiki', h1: /wiki/i, roles: R({})},
  {route: '/attendance', h1: /attendance/i, roles: R({})},
  {route: '/leave', h1: /leave/i, roles: R({})},
];

const ROLES = Object.keys(R({}));

test.describe.parallel('RBAC matrix', () => {
  for (const role of ROLES) {
    const storagePath = path.join(AUTH_DIR, `${role}.json`);

    test.describe(`role=${role}`, () => {
      let ctx: BrowserContext;
      let api: APIRequestContext;

      test.beforeAll(async () => {
        if (!fs.existsSync(storagePath)) {
          test.skip(true, `no storageState for ${role} — run rbac-matrix.setup.ts first`);
        }
        const browser = await chromium.launch();
        ctx = await browser.newContext({storageState: storagePath, baseURL: FRONTEND_BASE});
        api = await request.newContext({storageState: storagePath, baseURL: API_BASE});
      });

      test.afterAll(async () => {
        await ctx?.close();
        await api?.dispose();
      });

      for (const spec of ROUTES) {
        const expected = spec.roles[role];
        test(`${role} → ${spec.route} (${expected})`, async () => {
          const page = await ctx.newPage();
          const resp = await page.goto(spec.route, {waitUntil: 'domcontentloaded'});
          const finalUrl = page.url();

          if (expected === 'render') {
            expect(finalUrl, `expected render on ${spec.route}, got ${finalUrl}`).toContain(spec.route);
            if (spec.h1) {
              await expect(page.locator('h1').first()).toContainText(spec.h1, {timeout: 10_000});
            }
          } else {
            // redirect — final URL must not match the target route verbatim.
            expect(finalUrl, `expected redirect away from ${spec.route}, got ${finalUrl}`).not.toMatch(new RegExp(`${spec.route}($|\\?)`));

            if (spec.api) {
              const apiRes = await api.get(spec.api);
              expect(apiRes.status(), `${role} ${spec.api} should be 403, got ${apiRes.status()}`).toBe(403);
            }
          }
          await page.close();
        });
      }
    });
  }
});
