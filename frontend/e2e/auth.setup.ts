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
  setup.setTimeout(120000);

  const defaultUser = demoUsers.superAdmin;

  // Navigate to login page
  await page.goto('/auth/login');
  await page.waitForLoadState('networkidle');

  // The login page shows demo account buttons when DEMO_MODE=true.
  // Each button contains the user's name and triggers a one-click login.
  // Look for the demo account button matching our default user.
  const demoButton = page.locator('button').filter({hasText: defaultUser.name});
  await expect(demoButton).toBeVisible({timeout: 15000});
  await demoButton.click();

  // Wait for redirect to dashboard after login.
  // The login page redirects to /me/dashboard by default.
  try {
    await page.waitForURL('**/dashboard', {timeout: 60000});
  } catch {
    const currentUrl = page.url();
    if (!currentUrl.includes('dashboard')) {
      await page.screenshot({path: 'test-results/auth-debug.png'});
      // Capture any visible error message for better diagnostics
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

  // Wait for page to fully load
  await page.waitForLoadState('networkidle');

  // Verify we reached the dashboard
  const heading = page.locator('h1, h2, [data-testid="dashboard-heading"]').first();
  await expect(heading).toBeVisible({timeout: 15000});

  // Store authenticated state
  await page.context().storageState({path: authFile});
});
