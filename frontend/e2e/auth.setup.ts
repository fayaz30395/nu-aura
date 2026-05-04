import {expect, test as setup} from '@playwright/test';
import {demoUsers} from './fixtures/testData';

const authFile = 'playwright/.auth/user.json';

/**
 * Authentication Setup
 *
 * Runs once before all tests and stores authentication state.
 * Uses the demo account button click flow (NEXT_PUBLIC_DEMO_MODE=true required).
 * Authenticates as SUPER_ADMIN (fayaz.m@nulogic.io) for broadest permission coverage.
 */
setup('authenticate', async ({page}) => {
  setup.setTimeout(240000); // Bumped 120s → 240s for dev-mode first-compile (~30-50s/page)

  const defaultUser = demoUsers.superAdmin;

  await page.goto('/auth/login');
  await page.waitForLoadState('networkidle', {timeout: 60000});

  const demoButton = page.locator('button').filter({hasText: defaultUser.name});
  await expect(demoButton).toBeVisible({timeout: 30000});
  await demoButton.click();

  try {
    await page.waitForURL('**/dashboard', {timeout: 90000});
  } catch {
    const currentUrl = page.url();
    if (!currentUrl.includes('dashboard')) {
      await page.screenshot({path: 'test-results/auth-debug.png'});
      const errorText = await page
        .locator('text=Authentication Failed')
        .locator('..')
        .textContent()
        .catch(() => 'no error text found');
      throw new Error(
        `Login failed - current URL: ${currentUrl}. Error on page: ${errorText}`
      );
    }
  }

  await page.waitForLoadState('networkidle', {timeout: 60000});

  // Heading bumped 15s → 60s for first-compile latency under Studio Slate v2
  const heading = page.locator('h1, h2, [data-testid="dashboard-heading"]').first();
  await expect(heading).toBeVisible({timeout: 60000});

  // Store authenticated state
  await page.context().storageState({path: authFile});
});
