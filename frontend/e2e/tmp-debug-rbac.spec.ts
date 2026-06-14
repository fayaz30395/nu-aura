import {expect, test} from '@playwright/test';
import {loginAs} from './fixtures/helpers';
import {demoUsers} from './fixtures/testData';

async function dumpState(page, label: string) {
  const state = await page.evaluate(() => ({
    hasHydrated: (window as any).__NU_AUTH_HAS_HYDRATED__ || null,
    body: (document.body?.textContent || '').slice(0, 700),
  }));

  const authState = await page.evaluate(() => ({
    hasHydrated: (window as any).nuAuraAuthState?.hasHydrated ?? 'na',
    isAuthenticated: (window as any).nuAuraAuthState?.isAuthenticated ?? 'na',
    user: (window as any).nuAuraAuthState?.user ?? null,
    tenantId: localStorage.getItem('tenantId'),
  }));

  const body = await page.textContent('body');
  console.log(`STATE ${label}`,
    'URL=', page.url(),
    'HAS_HYDRATED=', state.hasHydrated,
    'body_has_session_restoring=', body?.includes('Session restoring'),
    'body_has_employees=', body?.includes('Employees'),
    'body_has_access=', body?.includes('Access Restricted'),
    'body_has_dashboard=', body?.includes('Dashboard'),
  );
  console.log(`BODY ${label}:`, (body || '').slice(0, 420));
  console.log(`AUTH ${label}:`, JSON.stringify(authState));
}

test('debug superadmin route rendering', async ({page}) => {
  test.setTimeout(120000);
  await loginAs(page, demoUsers.superAdmin.email, {verifyDashboard: true});

  await dumpState(page, 'after-login');

  await page.waitForTimeout(1200);
  await page.goto('/employees');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(3000);
  await dumpState(page, 'after-employees');

  const buttons = await page.$$eval('button', (buttons) => buttons.map((button) => button.textContent?.trim()).filter(Boolean).slice(0, 200));
  const visibleButtons = await page.$$eval('button', (buttons) => buttons.filter((button) => {
    const rect = button.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }).map((button) => button.textContent?.trim()).filter(Boolean).slice(0, 200));

  console.log('BUTTONS', buttons.join(' | '));
  console.log('VISIBLE_BUTTONS', visibleButtons.join(' | '));

  await expect(page.locator('body')).toBeVisible();
});
