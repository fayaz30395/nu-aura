import {expect, test, type Page} from '@playwright/test';
import {DEMO_PASSWORD, demoUsers} from './fixtures/testData';

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
    if (message.type() === 'error') {
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
  await page.goto('/auth/login', {waitUntil: 'domcontentloaded'});
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(DEMO_PASSWORD);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL((url) => !url.pathname.includes('/auth/login'), {timeout: 90000});
}

test.describe('Production readiness smoke @critical @production', () => {
  test.use({storageState: {cookies: [], origins: []}});

  for (const route of CRITICAL_PUBLIC_ROUTES) {
    test(`public route renders without critical browser errors: ${route}`, async ({page}) => {
      const health = await collectPageHealth(page);
      const response = await page.goto(route, {waitUntil: 'domcontentloaded'});
      expect(response?.status() ?? 0, `HTTP status for ${route}`).toBeLessThan(500);
      await assertRenderable(page);
      expect(health.pageErrors).toEqual([]);
      expect(health.apiFailures).toEqual([]);
    });
  }

  test('authentication and protected critical routes render for SuperAdmin', async ({page}) => {
    const health = await collectPageHealth(page);

    await loginViaUi(page, demoUsers.superAdmin.email);
    await assertRenderable(page);

    for (const route of CRITICAL_PROTECTED_ROUTES) {
      const response = await page.goto(route, {waitUntil: 'domcontentloaded'});
      expect(response?.status() ?? 0, `HTTP status for ${route}`).toBeLessThan(500);
      await assertRenderable(page);
    }

    expect(health.pageErrors).toEqual([]);
    expect(health.apiFailures).toEqual([]);
  });

  test('employee direct URL access is denied for privileged routes', async ({page}) => {
    await loginViaUi(page, demoUsers.employeeSaran.email);

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
