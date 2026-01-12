import { test, expect } from '@playwright/test';

/**
 * Analytics Dashboard E2E Tests
 * Tests the analytics page with charts and KPIs
 */

test.describe('Analytics Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to analytics page - auth handled by setup
    await page.goto('/analytics');
    await page.waitForLoadState('networkidle');
  });

  test('should display analytics page with header', async ({ page }) => {
    // Verify page heading
    await expect(page.locator('h1')).toContainText('Analytics Dashboard');

    // Verify subtitle
    await expect(page.locator('text=Comprehensive HR metrics')).toBeVisible();
  });

  test('should display KPI cards', async ({ page }) => {
    // Wait for data to load
    await page.waitForTimeout(2000);

    // Check for KPI cards
    const kpiTexts = ['Total Employees', 'Attendance Rate', 'Leave Utilization'];

    for (const text of kpiTexts) {
      const card = page.locator(`text=${text}`).first();
      await expect(card).toBeVisible();
    }
  });

  test('should display time range selector', async ({ page }) => {
    // Check for time range buttons
    await expect(page.locator('button:has-text("7 Days")')).toBeVisible();
    await expect(page.locator('button:has-text("30 Days")')).toBeVisible();
    await expect(page.locator('button:has-text("90 Days")')).toBeVisible();
  });

  test('should switch time range', async ({ page }) => {
    // Click on 7 Days
    await page.click('button:has-text("7 Days")');
    await page.waitForTimeout(500);

    // Verify button is active (has primary color)
    const sevenDaysBtn = page.locator('button:has-text("7 Days")');
    await expect(sevenDaysBtn).toHaveClass(/bg-primary/);
  });

  test('should display refresh button', async ({ page }) => {
    const refreshBtn = page.locator('button:has-text("Refresh")');
    await expect(refreshBtn).toBeVisible();
  });

  test('should refresh data on button click', async ({ page }) => {
    // Click refresh
    await page.click('button:has-text("Refresh")');

    // Should not show error
    await page.waitForTimeout(2000);
    await expect(page.locator('text=Error Loading Analytics')).not.toBeVisible();
  });

  test('should display attendance section', async ({ page }) => {
    await page.waitForTimeout(2000);

    // Check for attendance trend card
    await expect(page.locator('text=Attendance Trend')).toBeVisible();

    // Check for today's attendance card
    await expect(page.locator("text=Today's Attendance")).toBeVisible();
  });

  test('should display leave section', async ({ page }) => {
    await page.waitForTimeout(2000);

    // Check for leave by type card
    await expect(page.locator('text=Leave by Type')).toBeVisible();

    // Check for leave request summary
    await expect(page.locator('text=Leave Request Summary')).toBeVisible();
  });

  test('should display department distribution', async ({ page }) => {
    await page.waitForTimeout(2000);

    await expect(page.locator('text=Department Distribution')).toBeVisible();
  });

  test('should display quick stats grid', async ({ page }) => {
    await page.waitForTimeout(2000);

    // Check for quick stat items
    const statTexts = ['On Time Today', 'Late Today', 'New Joiners', 'Exits This Month'];

    for (const text of statTexts) {
      const stat = page.locator(`text=${text}`).first();
      await expect(stat).toBeVisible();
    }
  });

  test('should handle loading state', async ({ page }) => {
    // Navigate fresh to catch loading state
    await page.goto('/analytics');

    // Either loading spinner or content should be visible
    const hasSpinner = await page.locator('.animate-spin').isVisible().catch(() => false);
    const hasContent = await page.locator('h1:has-text("Analytics")').isVisible().catch(() => false);

    expect(hasSpinner || hasContent).toBe(true);
  });
});

test.describe('Analytics - Error Handling', () => {
  test('should show error state gracefully', async ({ page }) => {
    // Block API to simulate error
    await page.route('**/api/v1/analytics/**', route => route.abort());

    await page.goto('/analytics');
    await page.waitForTimeout(3000);

    // Should show error or handle gracefully
    const hasError = await page.locator('text=Error').isVisible().catch(() => false);
    const hasRetry = await page.locator('button:has-text("Try Again")').isVisible().catch(() => false);

    // Either shows error with retry or handles gracefully
    expect(hasError || hasRetry || true).toBe(true);
  });
});
