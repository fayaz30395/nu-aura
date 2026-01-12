import { test as setup, expect } from '@playwright/test';
import { testUsers } from './fixtures/testData';

const authFile = 'playwright/.auth/user.json';

/**
 * Authentication Setup
 * This runs once before all tests and stores authentication state
 * so tests don't need to log in repeatedly.
 */
setup('authenticate', async ({ page }) => {
  // Set longer timeout for auth setup
  setup.setTimeout(120000);

  // Navigate to login page
  await page.goto('/auth/login');
  await page.waitForLoadState('networkidle');

  // Get email and password inputs
  const emailInput = page.locator('input[type="email"]');
  const passwordInput = page.locator('input[type="password"]');
  const submitButton = page.locator('button[type="submit"]');

  // Fill email - clear first to ensure clean state
  await emailInput.click();
  await emailInput.fill(testUsers.employee.email);

  // Fill password
  await passwordInput.click();
  await passwordInput.fill(testUsers.employee.password);

  // Wait for form validation to complete (react-hook-form)
  await page.waitForTimeout(500);

  // Wait for submit button to be enabled and click
  await expect(submitButton).toBeEnabled({ timeout: 5000 });
  await submitButton.click();

  // Wait for successful login - either dashboard URL or redirect
  // Use a longer timeout and handle potential errors
  try {
    await page.waitForURL('**/dashboard', { timeout: 60000 });
  } catch {
    // If dashboard redirect fails, check if we're already on dashboard or got an error
    const currentUrl = page.url();
    if (!currentUrl.includes('dashboard')) {
      // Take a screenshot for debugging
      await page.screenshot({ path: 'test-results/auth-debug.png' });
      throw new Error(`Login failed - current URL: ${currentUrl}`);
    }
  }

  // Wait for page to load with content
  await page.waitForLoadState('networkidle');

  // Verify we're on the dashboard (look for common dashboard elements)
  const dashboardContent = page.locator('text=Welcome').first();
  await expect(dashboardContent).toBeVisible({ timeout: 15000 });

  // Store authenticated state
  await page.context().storageState({ path: authFile });
});
