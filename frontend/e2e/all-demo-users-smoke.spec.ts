import {expect, test} from '@playwright/test';
import {loginAs, navigateTo} from './fixtures/helpers';
import {allDemoUsers} from './fixtures/testData';

const SELF_SERVICE_ROUTES = [
  '/me/dashboard',
  '/me/profile',
  '/me/attendance',
  '/me/leaves',
  '/me/payslips',
  '/me/assets',
];

test.describe('All demo users — self-service access @critical @rbac', () => {
  test.describe.configure({mode: 'serial'});
  test.use({storageState: {cookies: [], origins: []}});
  test.setTimeout(900000);

  for (const user of allDemoUsers) {
    test(`${user.name} (${user.role}) can sign in and use My Space`, async ({page}) => {
      await loginAs(page, user.email, {verifyDashboard: false});

      for (const route of SELF_SERVICE_ROUTES) {
        await navigateTo(page, route);
        await page.locator('main').first().waitFor({state: 'visible', timeout: 30000}).catch(() => undefined);

        const url = page.url();
        expect(url, `${user.email} should not be sent to login from ${route}`).not.toContain('/auth/login');

        const denied = await page
          .locator('text=/403|Forbidden|Access Denied|not authorized|not allowed/i')
          .first()
          .isVisible({timeout: 2000})
          .catch(() => false);
        expect(denied, `${user.email} should not be denied on ${route}`).toBe(false);

        const bodyText = await page.locator('body').innerText().catch(() => '');
        expect(bodyText.trim().length, `${user.email} should see content on ${route}`).toBeGreaterThan(50);
      }
    });
  }
});
