import { test, expect } from '@playwright/test';
import { testUsers } from './fixtures/testData';

/**
 * Performance Calibration & Nine-Box E2E Tests
 * Tests calibration, nine-box grid, and performance management pages
 */

test.describe('Performance Calibration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login');
    await page.fill('[name="email"]', testUsers.hrManager.email);
    await page.fill('[name="password"]', testUsers.hrManager.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 15000 });
  });

  test('performance page loads', async ({ page }) => {
    await page.goto('/performance');
    await expect(page).not.toHaveURL(/auth\/login/);
    const heading = page.getByRole('heading').first();
    await expect(heading).toBeVisible({ timeout: 10000 });
  });

  test('calibration page loads without error', async ({ page }) => {
    await page.goto('/performance/calibration');
    await page.waitForLoadState('networkidle');
    await expect(page).not.toHaveURL(/auth\/login/);
    await expect(page.locator('text=Something went wrong')).not.toBeVisible();
    const heading = page.getByRole('heading').first();
    await expect(heading).toBeVisible({ timeout: 10000 });
  });

  test('nine-box grid page loads', async ({ page }) => {
    await page.goto('/performance/nine-box');
    await page.waitForLoadState('networkidle');
    await expect(page).not.toHaveURL(/auth\/login/);
    await expect(page.locator('text=Something went wrong')).not.toBeVisible();
    const heading = page.getByRole('heading').first();
    await expect(heading).toBeVisible({ timeout: 10000 });
  });

  test('nine-box grid renders cells or empty state', async ({ page }) => {
    await page.goto('/performance/nine-box');
    await page.waitForLoadState('networkidle');
    const main = page.locator('main, [role="main"]').first();
    await expect(main).toBeVisible();
  });

  test('calibration shows review cycles or empty state', async ({ page }) => {
    await page.goto('/performance/calibration');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=Something went wrong')).not.toBeVisible();
  });

  test('performance reviews page loads', async ({ page }) => {
    await page.goto('/performance/reviews');
    await page.waitForLoadState('networkidle');
    await expect(page).not.toHaveURL(/auth\/login/);
    await expect(page.locator('text=Something went wrong')).not.toBeVisible();
  });

  test('PIP (performance improvement plans) page loads', async ({ page }) => {
    await page.goto('/performance/pip');
    await page.waitForLoadState('networkidle');
    await expect(page).not.toHaveURL(/auth\/login/);
    await expect(page.locator('text=Something went wrong')).not.toBeVisible();
  });

  test('OKR goals page loads', async ({ page }) => {
    await page.goto('/performance/goals');
    await page.waitForLoadState('networkidle');
    await expect(page).not.toHaveURL(/auth\/login/);
    await expect(page.locator('text=Something went wrong')).not.toBeVisible();
  });
});
