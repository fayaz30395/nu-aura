import { test, expect } from '@playwright/test';

test.describe('Performance Improvement Plans (PIP)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/performance/pip');
  });

  test('should display PIP page with correct heading', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: /improvement plan/i })
    ).toBeVisible();
  });

  test('should show create PIP button', async ({ page }) => {
    await expect(
      page.getByRole('button', { name: /new pip|create pip/i })
    ).toBeVisible();
  });

  test('should open create PIP modal on button click', async ({ page }) => {
    await page.getByRole('button', { name: /new pip|create pip/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
  });

  test('should show required fields in create PIP form', async ({ page }) => {
    await page.getByRole('button', { name: /new pip|create pip/i }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    // At minimum: employee selector and date fields should be present
    await expect(dialog.getByText(/employee/i).first()).toBeVisible();
    await expect(dialog.getByText(/start date/i).first()).toBeVisible();
  });

  test('should close modal on cancel', async ({ page }) => {
    await page.getByRole('button', { name: /new pip|create pip/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('button', { name: /cancel/i }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });

  test('should display status filter options', async ({ page }) => {
    // Status filter chips or dropdown should be available
    const filterArea = page.locator('text=/all|active|completed/i').first();
    await expect(filterArea).toBeVisible();
  });
});
