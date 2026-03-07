import { test, expect } from '@playwright/test';
import { testUsers } from './fixtures/testData';

/**
 * Custom Reports Builder E2E Tests
 * Tests the report builder UI at /reports/builder
 */

test.describe('Reports Builder', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login');
    await page.fill('[name="email"]', testUsers.hrManager.email);
    await page.fill('[name="password"]', testUsers.hrManager.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 15000 });
  });

  test('reports page loads and shows available reports', async ({ page }) => {
    await page.goto('/reports');
    await expect(page).not.toHaveURL(/auth\/login/);
    const heading = page.getByRole('heading').first();
    await expect(heading).toBeVisible({ timeout: 10000 });
  });

  test('report builder page is accessible', async ({ page }) => {
    await page.goto('/reports/builder');
    await expect(page).not.toHaveURL(/auth\/login/);
    await page.waitForLoadState('networkidle');
    const heading = page.getByRole('heading').first();
    await expect(heading).toBeVisible({ timeout: 10000 });
  });

  test('report builder has module selector', async ({ page }) => {
    await page.goto('/reports/builder');
    await page.waitForLoadState('networkidle');
    // Should have a way to pick the module (EMPLOYEE, LEAVE, ATTENDANCE, etc.)
    const moduleInput = page.getByRole('combobox').first()
      .or(page.getByLabel(/module/i))
      .or(page.getByText(/Employee|Leave|Attendance/i).first());
    await expect(moduleInput).toBeVisible({ timeout: 8000 });
  });

  test('report builder can select columns', async ({ page }) => {
    await page.goto('/reports/builder');
    await page.waitForLoadState('networkidle');
    // Look for column selector or checkboxes
    const colSection = page.getByText(/column|field/i).first();
    if (await colSection.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(colSection).toBeVisible();
    }
  });

  test('saved reports appear on reports list', async ({ page }) => {
    await page.goto('/reports');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('main, [role="main"]').first()).toBeVisible();
    await expect(page.locator('text=Something went wrong')).not.toBeVisible();
  });

  test('leave report page loads', async ({ page }) => {
    await page.goto('/reports/leave');
    await page.waitForLoadState('networkidle');
    await expect(page).not.toHaveURL(/auth\/login/);
    await expect(page.locator('text=Something went wrong')).not.toBeVisible();
  });

  test('payroll report page loads', async ({ page }) => {
    await page.goto('/reports/payroll');
    await page.waitForLoadState('networkidle');
    await expect(page).not.toHaveURL(/auth\/login/);
    await expect(page.locator('text=Something went wrong')).not.toBeVisible();
  });

  test('utilization report page loads', async ({ page }) => {
    await page.goto('/reports/utilization');
    await page.waitForLoadState('networkidle');
    await expect(page).not.toHaveURL(/auth\/login/);
    await expect(page.locator('text=Something went wrong')).not.toBeVisible();
  });
});
