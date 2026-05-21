import {expect, test as setup} from '@playwright/test';
import {demoUsers} from './fixtures/testData';

const authFile = 'playwright/.auth/user.json';

/**
 * Authentication Setup
 *
 * Runs once before all tests and stores authentication state. Uses the
 * email + password form path rather than the demo-account button: the
 * demo panel is only rendered when NEXT_PUBLIC_DEMO_MODE=true is set at
 * BUILD time (it's a webpack DefinePlugin replacement, not a runtime
 * env), and CI / production builds drop it from the bundle. The form
 * path works under every build flavour as long as the user exists with
 * the demo password seeded on the target tenant.
 *
 * Authenticates as SUPER_ADMIN (fayaz.m@nulogic.io) for broadest
 * permission coverage downstream.
 */
setup('authenticate', async ({page}) => {
  setup.setTimeout(240000); // bumped for dev-mode first-compile + bcrypt + Neon RTT

  const defaultUser = demoUsers.superAdmin;

  await page.goto('/auth/login');
  await page.waitForLoadState('domcontentloaded', {timeout: 60000});

  // Expand the email form (it sits behind a "Sign in with Email" toggle
  // under DEMO_MODE; under prod-style builds the form is the default and
  // the toggle is absent, in which case this is a no-op).
  const toggle = page.locator('button:has-text("Sign in with Email")');
  if (await toggle.isVisible().catch(() => false)) {
    await toggle.click();
  }

  await page.locator('input[type="email"]').waitFor({state: 'visible', timeout: 30000});
  await page.locator('input[type="email"]').fill(defaultUser.email);
  await page.locator('input[type="password"]').fill(defaultUser.password);
  await page.locator('button[type="submit"]').click();

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

  await page.waitForLoadState('domcontentloaded', {timeout: 60000});

  // Heading bumped 15s → 60s for first-compile latency under Studio Slate v2
  const heading = page.locator('h1, h2, [data-testid="dashboard-heading"]').first();
  await expect(heading).toBeVisible({timeout: 60000});

  // Store authenticated state
  await page.context().storageState({path: authFile});
});
