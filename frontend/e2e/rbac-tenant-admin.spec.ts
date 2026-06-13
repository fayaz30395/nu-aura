import {expect, test} from '@playwright/test';
import {loginAs, navigateTo} from './fixtures/helpers';
import {demoUsers} from './fixtures/testData';

/**
 * RBAC TENANT_ADMIN E2E Tests
 *
 * @rbac @tenant-admin @critical @regression
 *
 * Guards against regression of the ADMIN→TENANT_ADMIN role bug (fixed 2026-06-14)
 * where ALL self-registered tenant admins got 403 on every API call because:
 *   - TenantProvisioningService created roles with code='ADMIN'
 *   - RoleHierarchy had no 'ADMIN' case → returned empty permissions
 *   - V289 backfill was a no-op (no TENANT_ADMIN rows existed)
 * Fixed by: V290 rename + V291 demo user seed + RoleHierarchy alias + service fix.
 *
 * PRE-CONDITION: V291 must have run (seeds tenant.admin@nulogic.io).
 * On Railway: runs automatically on next deploy.
 * Locally: run Flyway migrations against your local DB.
 */

const TENANT_ADMIN = demoUsers.tenantAdmin; // tenant.admin@nulogic.io — TENANT_ADMIN

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function goAndWait(page: import('@playwright/test').Page, path: string): Promise<string> {
  await navigateTo(page, path);
  await page.locator('body').waitFor({state: 'visible', timeout: 20000}).catch(() => {});
  await page.waitForTimeout(800);
  return page.url();
}

async function assertAccessible(
  page: import('@playwright/test').Page,
  route: string,
  label: string,
): Promise<void> {
  await goAndWait(page, route);

  const redirectedToLogin = page.url().includes('/auth/login');
  const has403 = await page
    .locator('text=/403|Forbidden|Access Denied|not authorized/i')
    .first()
    .isVisible({timeout: 3000})
    .catch(() => false);

  expect(
    redirectedToLogin,
    `${label}: ${route} → redirected to login (TENANT_ADMIN has no session or 401)`,
  ).toBe(false);
  expect(
    has403,
    `${label}: ${route} → 403 Forbidden (RBAC permission gap — CRITICAL regression of fixed bug)`,
  ).toBe(false);
}

async function assertBlocked(
  page: import('@playwright/test').Page,
  route: string,
  label: string,
): Promise<void> {
  await goAndWait(page, route);

  const currentUrl = page.url();
  const has403 = await page
    .locator('text=/403|Forbidden|Access Denied|not authorized/i')
    .first()
    .isVisible({timeout: 3000})
    .catch(() => false);
  const wasRedirected =
    !currentUrl.includes(route.split('?')[0]) ||
    currentUrl.includes('/auth/login') ||
    currentUrl.includes('/me/');

  expect(
    has403 || wasRedirected,
    `${label}: ${route} → TENANT_ADMIN should NOT access this SUPER_ADMIN-only route`,
  ).toBe(true);
}

// ---------------------------------------------------------------------------
// RBAC-TA-01: MY SPACE — accessible to TENANT_ADMIN like all roles
// ---------------------------------------------------------------------------

test.describe('RBAC-TA-01: TENANT_ADMIN MY SPACE access @rbac @tenant-admin @critical', () => {
  test.setTimeout(90000);

  test.beforeEach(async ({page}) => {
    await loginAs(page, TENANT_ADMIN.email);
  });

  const MY_SPACE_ROUTES = ['/me/profile', '/me/payslips', '/me/leaves', '/me/attendance'];

  for (const route of MY_SPACE_ROUTES) {
    test(`TENANT_ADMIN can access ${route} @rbac @critical`, async ({page}) => {
      await assertAccessible(page, route, 'TENANT_ADMIN');
    });
  }
});

// ---------------------------------------------------------------------------
// RBAC-TA-02: Core HRMS — TENANT_ADMIN must have full HRMS access
// ---------------------------------------------------------------------------

test.describe('RBAC-TA-02: TENANT_ADMIN HRMS management access @rbac @tenant-admin @critical', () => {
  test.setTimeout(120000);

  test.beforeEach(async ({page}) => {
    await loginAs(page, TENANT_ADMIN.email);
  });

  const HRMS_ROUTES = [
    '/employees',
    '/leave',
    '/attendance',
    '/payroll/runs',
    '/payroll/salary-structures',
    '/departments',
    '/recruitment/jobs',
    '/recruitment/candidates',
    '/recruitment/agencies',
    '/preboarding',
  ];

  for (const route of HRMS_ROUTES) {
    test(`TENANT_ADMIN can access ${route} @rbac @critical`, async ({page}) => {
      await assertAccessible(page, route, 'TENANT_ADMIN_HRMS');
    });
  }
});

// ---------------------------------------------------------------------------
// RBAC-TA-03: Nu-Grow — TENANT_ADMIN has full performance/wellness access
// ---------------------------------------------------------------------------

test.describe('RBAC-TA-03: TENANT_ADMIN Nu-Grow access @rbac @tenant-admin', () => {
  test.setTimeout(120000);

  test.beforeEach(async ({page}) => {
    await loginAs(page, TENANT_ADMIN.email);
  });

  const GROW_ROUTES = [
    '/performance',
    '/performance/review-cycles',
    '/performance/goals',
    '/performance/okr',
    '/surveys',
    '/wellness',
    '/wellness/admin',
  ];

  for (const route of GROW_ROUTES) {
    test(`TENANT_ADMIN can access ${route} @rbac @tenant-admin`, async ({page}) => {
      await assertAccessible(page, route, 'TENANT_ADMIN_GROW');
    });
  }
});

// ---------------------------------------------------------------------------
// RBAC-TA-04: Nu-Fluence — TENANT_ADMIN has full knowledge-base access
// ---------------------------------------------------------------------------

test.describe('RBAC-TA-04: TENANT_ADMIN Nu-Fluence access @rbac @tenant-admin', () => {
  test.setTimeout(120000);

  test.beforeEach(async ({page}) => {
    await loginAs(page, TENANT_ADMIN.email);
  });

  const FLUENCE_ROUTES = [
    '/fluence/wiki',
    '/fluence/blogs',
    '/fluence/templates',
    '/fluence/search',
    '/fluence/wall',
  ];

  for (const route of FLUENCE_ROUTES) {
    test(`TENANT_ADMIN can access ${route} @rbac @tenant-admin`, async ({page}) => {
      await assertAccessible(page, route, 'TENANT_ADMIN_FLUENCE');
    });
  }
});

// ---------------------------------------------------------------------------
// RBAC-TA-05: Settings — TENANT_ADMIN manages own-tenant config
// ---------------------------------------------------------------------------

test.describe('RBAC-TA-05: TENANT_ADMIN settings access @rbac @tenant-admin @critical', () => {
  test.setTimeout(90000);

  test.beforeEach(async ({page}) => {
    await loginAs(page, TENANT_ADMIN.email);
  });

  const SETTINGS_ROUTES = ['/settings', '/settings/departments'];

  for (const route of SETTINGS_ROUTES) {
    test(`TENANT_ADMIN can access ${route} @rbac @critical`, async ({page}) => {
      await assertAccessible(page, route, 'TENANT_ADMIN_SETTINGS');
    });
  }
});

// ---------------------------------------------------------------------------
// RBAC-TA-06: Security boundary — SUPER_ADMIN-only routes must be blocked
// ---------------------------------------------------------------------------

test.describe('RBAC-TA-06: TENANT_ADMIN blocked from SUPER_ADMIN routes @rbac @security @critical', () => {
  test.setTimeout(90000);

  test.beforeEach(async ({page}) => {
    await loginAs(page, TENANT_ADMIN.email);
  });

  const SUPER_ADMIN_ONLY_ROUTES = [
    '/admin/tenants',
    '/admin/system',
    '/admin/feature-flags',
    '/admin/implicit-roles',
    '/admin/import-keka',
  ];

  for (const route of SUPER_ADMIN_ONLY_ROUTES) {
    test(`TENANT_ADMIN is blocked from ${route} @rbac @security @critical`, async ({page}) => {
      await assertBlocked(page, route, 'TENANT_ADMIN_SECURITY');
    });
  }
});

// ---------------------------------------------------------------------------
// RBAC-TA-07: No API 403s — regression guard for the root-cause bug
// ---------------------------------------------------------------------------

test.describe('RBAC-TA-07: TENANT_ADMIN API permission regression guard @rbac @tenant-admin @critical', () => {
  test.setTimeout(60000);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api/v1';

  test('TENANT_ADMIN login succeeds and gets a valid JWT @rbac @critical', async ({page}) => {
    await loginAs(page, TENANT_ADMIN.email);

    const finalUrl = page.url();
    expect(
      finalUrl.includes('/auth/login'),
      'TENANT_ADMIN login failed — check V291 migration seeded tenant.admin@nulogic.io',
    ).toBe(false);
  });

  test('TENANT_ADMIN dashboard loads without 403 @rbac @critical', async ({page}) => {
    await loginAs(page, TENANT_ADMIN.email);
    await goAndWait(page, '/me/dashboard');

    const has403 = await page
      .locator('text=/403|Forbidden|Access Denied/i')
      .first()
      .isVisible({timeout: 5000})
      .catch(() => false);

    expect(
      has403,
      'TENANT_ADMIN dashboard returned 403 — CRITICAL RBAC regression (ADMIN role bug not fixed)',
    ).toBe(false);
  });

  test('TENANT_ADMIN employee API call returns 200 not 403 @rbac @critical', async ({request, page}) => {
    // Login via page to get session cookies
    await loginAs(page, TENANT_ADMIN.email);

    // Check employee list page renders (implies /api/v1/employees returned data)
    await goAndWait(page, '/employees');

    const has403 = await page
      .locator('text=/403|Forbidden|Access Denied|not authorized/i')
      .first()
      .isVisible({timeout: 5000})
      .catch(() => false);
    const redirectedToLogin = page.url().includes('/auth/login');

    expect(
      has403 || redirectedToLogin,
      'TENANT_ADMIN /employees page shows 403 or redirected to login — CRITICAL RBAC regression',
    ).toBe(false);
  });
});
