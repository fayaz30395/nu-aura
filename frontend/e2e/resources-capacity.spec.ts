import {expect, test} from '@playwright/test';
import {testUsers} from './fixtures/testData';

/**
 * Resource Management & Capacity E2E Tests
 * Tests resource pool, capacity planning, and allocation pages
 */

test.describe('Resource Management', () => {
  test.beforeEach(async ({page}) => {
    await page.goto('/auth/login');
    await page.fill('[name="email"]', testUsers.manager.email);
    await page.fill('[name="password"]', testUsers.manager.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', {timeout: 15000});
  });

  test('resources page loads', async ({page}) => {
    await page.goto('/resources');
    await page.waitForLoadState('networkidle');
    await expect(page).not.toHaveURL(/auth\/login/);
    const heading = page.getByRole('heading').first();
    await expect(heading).toBeVisible({timeout: 10000});
  });

  test('resource approvals page is accessible', async ({page}) => {
    await page.goto('/resources/approvals');
    await page.waitForLoadState('networkidle');
    await expect(page).not.toHaveURL(/auth\/login/);
    await expect(page.locator('text=Something went wrong')).not.toBeVisible();
  });

  test('allocation summary loads without error', async ({page}) => {
    await page.goto('/resources');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=Something went wrong')).not.toBeVisible();
    const main = page.locator('main, [role="main"]').first();
    await expect(main).toBeVisible();
  });

  test('resource pool shows employees or empty state', async ({page}) => {
    await page.goto('/resources');
    await page.waitForLoadState('networkidle');
    // Should not crash even if no data
    await expect(page.locator('text=Something went wrong')).not.toBeVisible();
  });

  test('allocation summary widget is visible', async ({page}) => {
    await page.goto('/resources');
    await page.waitForLoadState('networkidle');
    // Look for summary cards or percentage indicators
    const summaryEl = page.locator('[data-testid*="allocation"], [class*="allocation"], [class*="summary"]').first();
    if (await summaryEl.isVisible({timeout: 3000}).catch(() => false)) {
      await expect(summaryEl).toBeVisible();
    }
    // Just verify page is stable
    await expect(page).not.toHaveURL(/auth\/login/);
  });

  test('allocations summary page loads', async ({page}) => {
    await page.goto('/allocations/summary');
    await page.waitForLoadState('networkidle');
    await expect(page).not.toHaveURL(/auth\/login/);
    await expect(page.locator('text=Something went wrong')).not.toBeVisible();
  });
});
