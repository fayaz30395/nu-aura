import {expect, test, type Page} from '@playwright/test';
import {isNoise} from './generated/known-noise';

const PROD_SUPERADMIN_EMAIL = process.env.E2E_PROD_SUPERADMIN_EMAIL;
const PROD_EMPLOYEE_EMAIL = process.env.E2E_PROD_EMPLOYEE_EMAIL;
const PROD_PASSWORD = process.env.E2E_PROD_PASSWORD;
const DEMO_PASSWORD_SENTINEL = 'Welcome@123';

const CRITICAL_PUBLIC_ROUTES = [
  '/',
  '/auth/login',
  '/about',
  '/features',
  '/pricing',
];

const CRITICAL_PROTECTED_ROUTES = [
  '/me/dashboard',
  '/dashboard',
  '/recruitment',
  '/performance',
  '/fluence',
  '/announcements',
  '/reports',
  '/settings',
];

async function collectPageHealth(page: Page) {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const apiFailures: string[] = [];

  page.on('console', (message) => {
    if (message.type() === 'error' && !isNoise(message.text())) {
      consoleErrors.push(message.text());
    }
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('response', (response) => {
    if (response.status() >= 500) {
      apiFailures.push(`${response.status()} ${response.url()}`);
    }
  });

  return {consoleErrors, pageErrors, apiFailures};
}

async function assertRenderable(page: Page) {
  await page.waitForLoadState('domcontentloaded');
  await expect(page.locator('body')).toBeVisible();
  await expect(page.locator('body')).not.toBeEmpty();
}

async function loginViaUi(page: Page, email: string) {
  if (!PROD_PASSWORD) {
    throw new Error('E2E_PROD_PASSWORD is required for authenticated production smoke.');
  }
  if (PROD_PASSWORD === DEMO_PASSWORD_SENTINEL) {
    throw new Error('Refusing to run production smoke with the shared demo password.');
  }

  await page.goto('/auth/login', {waitUntil: 'domcontentloaded'});
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(PROD_PASSWORD);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL((url) => !url.pathname.includes('/auth/login'), {timeout: 90000});
}

test.describe('Production readiness smoke @critical @production', () => {
  test.use({storageState: {cookies: [], origins: []}});

  for (const route of CRITICAL_PUBLIC_ROUTES) {
    test(`public route renders without critical browser errors: ${route}`, async ({page}) => {
      const health = await collectPageHealth(page);
      const response = await page.goto(route, {waitUntil: 'domcontentloaded'});
      expect(response?.status() ?? 0, `HTTP status for ${route}`).toBeLessThan(400);
      await assertRenderable(page);
      expect(health.consoleErrors).toEqual([]);
      expect(health.pageErrors).toEqual([]);
      expect(health.apiFailures).toEqual([]);
    });
  }

  test('authentication and protected critical routes render for SuperAdmin', async ({page}) => {
    if (!PROD_SUPERADMIN_EMAIL) {
      throw new Error('E2E_PROD_SUPERADMIN_EMAIL is required for SuperAdmin production smoke.');
    }

    const health = await collectPageHealth(page);

    await loginViaUi(page, PROD_SUPERADMIN_EMAIL);
    await assertRenderable(page);

    for (const route of CRITICAL_PROTECTED_ROUTES) {
      const response = await page.goto(route, {waitUntil: 'domcontentloaded'});
      expect(response?.status() ?? 0, `HTTP status for ${route}`).toBeLessThan(400);
      await assertRenderable(page);
    }

    expect(health.consoleErrors).toEqual([]);
    expect(health.pageErrors).toEqual([]);
    expect(health.apiFailures).toEqual([]);
  });

  test('employee direct URL access is denied for privileged routes', async ({page}) => {
    if (!PROD_EMPLOYEE_EMAIL) {
      throw new Error('E2E_PROD_EMPLOYEE_EMAIL is required for employee RBAC production smoke.');
    }

    await loginViaUi(page, PROD_EMPLOYEE_EMAIL);

    for (const route of ['/admin/roles', '/admin/permissions', '/payroll/runs', '/recruitment/candidates']) {
      const response = await page.goto(route, {waitUntil: 'domcontentloaded'});
      const status = response?.status() ?? 0;
      const currentUrl = page.url();
      const body = (await page.locator('body').innerText().catch(() => '')).toLowerCase();

      expect(
        [401, 403, 404].includes(status)
        || !currentUrl.includes(route)
        || /access denied|unauthorized|forbidden|not authorized|permission/.test(body),
        `Expected EMPLOYEE to be denied at ${route}; status=${status}; url=${currentUrl}`
      ).toBe(true);
    }
  });
});
