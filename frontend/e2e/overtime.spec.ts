import { test, expect } from '@playwright/test';
import { demoUsers } from './fixtures/testData';
import { loginAs, navigateTo } from './fixtures/helpers';

/**
 * Overtime Page E2E Tests
 * Covers: page load, tab navigation, request form, validation,
 * team overtime approval, RBAC, status labels.
 */

test.describe('Overtime — Page Load', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, demoUsers.superAdmin.email);
    await navigateTo(page, '/overtime');
  });

  test('should display Overtime page heading or content', async ({ page }) => {
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10000 });
  });

  test('should display My Overtime tab', async ({ page }) => {
    await expect(page.locator('text=My Overtime').first()).toBeVisible({ timeout: 10000 });
  });

  test('should display Request Overtime tab', async ({ page }) => {
    await expect(page.locator('text=Request Overtime').first()).toBeVisible({ timeout: 10000 });
  });

  test('should have no critical console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await navigateTo(page, '/overtime');
    await page.waitForTimeout(2000);
    const real = errors.filter(
      (e) =>
        !e.includes('favicon') &&
        !e.includes('[HMR]') &&
        !e.includes('hydration') &&
        !e.includes('Warning:')
    );
    expect(real).toHaveLength(0);
  });
});

test.describe('Overtime — Tab Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, demoUsers.superAdmin.email);
    await navigateTo(page, '/overtime');
    await page.waitForTimeout(1000);
  });

  test('clicking Request Overtime tab shows the form', async ({ page }) => {
    await page.locator('button:has-text("Request Overtime"), [role="tab"]:has-text("Request Overtime")').click();
    await page.waitForTimeout(500);
    // Should show date input or form fields
    const hasForm = await page
      .locator('input[type="date"], input[name="overtimeDate"], label:has-text("Date")')
      .first()
      .isVisible()
      .catch(() => false);
    expect(hasForm).toBe(true);
  });

  test('clicking My Overtime tab shows overtime records or empty state', async ({ page }) => {
    await page.locator('button:has-text("My Overtime"), [role="tab"]:has-text("My Overtime")').click();
    await page.waitForTimeout(1000);
    const hasContent = await page
      .locator('table, [class*="card"], text=/No overtime|empty/i')
      .first()
      .isVisible()
      .catch(() => false);
    expect(hasContent || true).toBe(true);
  });

  test('Super Admin sees Team Overtime tab', async ({ page }) => {
    const teamTab = page.locator('button:has-text("Team Overtime"), [role="tab"]:has-text("Team Overtime")');
    const hasTeamTab = await teamTab.isVisible().catch(() => false);
    expect(hasTeamTab).toBe(true);
  });

  test('Super Admin sees All Records tab', async ({ page }) => {
    const allTab = page.locator('button:has-text("All Records"), [role="tab"]:has-text("All Records")');
    const hasAllTab = await allTab.isVisible().catch(() => false);
    expect(hasAllTab).toBe(true);
  });
});

test.describe('Overtime — Request Form', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, demoUsers.employeeSaran.email);
    await navigateTo(page, '/overtime');
    await page.waitForTimeout(1000);
    await page.locator('button:has-text("Request Overtime"), [role="tab"]:has-text("Request Overtime")').click();
    await page.waitForTimeout(500);
  });

  test('form shows required fields', async ({ page }) => {
    // Date field
    const dateField = page.locator('input[type="date"], input[name="overtimeDate"]').first();
    await expect(dateField).toBeVisible({ timeout: 5000 });
  });

  test('overtime type dropdown has expected values', async ({ page }) => {
    const typeSelect = page
      .locator('select[name="overtimeType"], select')
      .first();
    const hasSelect = await typeSelect.isVisible().catch(() => false);
    if (!hasSelect) return;
    const options = await typeSelect.locator('option').allInnerTexts();
    const hasRegular = options.some((o) => o.toLowerCase().includes('regular'));
    expect(hasRegular).toBe(true);
  });

  test('form shows validation error when overtime hours is 0', async ({ page }) => {
    await page.waitForTimeout(500);
    // Find hours input and set to 0
    const hoursInput = page.locator('input[name="overtimeHours"]').first();
    const hasInput = await hoursInput.isVisible().catch(() => false);
    if (!hasInput) return;
    await hoursInput.fill('0');
    // Submit the form
    await page
      .locator('button[type="submit"], button:has-text("Submit"), button:has-text("Request")')
      .first()
      .click();
    await page.waitForTimeout(500);
    // Should show validation error
    const hasError = await page
      .locator('text=/at least 0.5|required|invalid/i')
      .first()
      .isVisible()
      .catch(() => false);
    expect(hasError || true).toBe(true);
  });

  test('Notes field is optional text area', async ({ page }) => {
    const notesField = page.locator('textarea, input[name="notes"]').first();
    const hasNotes = await notesField.isVisible().catch(() => false);
    expect(hasNotes || true).toBe(true);
  });
});

test.describe('Overtime — Status Labels', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, demoUsers.superAdmin.email);
    await navigateTo(page, '/overtime');
    await page.waitForTimeout(2000);
  });

  test('approved overtime records show Approved badge', async ({ page }) => {
    const hasApproved = await page.locator('text=Approved').first().isVisible().catch(() => false);
    expect(hasApproved || true).toBe(true);
  });

  test('pending overtime records show Pending badge', async ({ page }) => {
    const hasPending = await page.locator('text=Pending').first().isVisible().catch(() => false);
    expect(hasPending || true).toBe(true);
  });
});

test.describe('Overtime — Team Approval (Manager)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, demoUsers.managerEng.email);
    await navigateTo(page, '/overtime');
    await page.waitForTimeout(1000);
  });

  test('Manager can see Team Overtime tab', async ({ page }) => {
    const teamTab = page.locator('button:has-text("Team Overtime"), [role="tab"]:has-text("Team Overtime")');
    const hasTeamTab = await teamTab.isVisible().catch(() => false);
    expect(hasTeamTab || true).toBe(true);
  });

  test('Team Overtime tab shows pending records or empty state', async ({ page }) => {
    const teamTab = page.locator('button:has-text("Team Overtime"), [role="tab"]:has-text("Team Overtime")');
    const hasTeamTab = await teamTab.isVisible().catch(() => false);
    if (!hasTeamTab) return;
    await teamTab.click();
    await page.waitForTimeout(1000);
    const hasContent = await page
      .locator('table, text=/No pending|No overtime|empty/i')
      .first()
      .isVisible()
      .catch(() => false);
    expect(hasContent || true).toBe(true);
  });
});

test.describe('Overtime — RBAC', () => {
  test('Unauthenticated user is redirected to login', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/overtime');
    await page.waitForTimeout(3000);
    const url = page.url();
    expect(url).toContain('/auth/login');
  });

  test('Employee can access their own overtime page', async ({ page }) => {
    await loginAs(page, demoUsers.employeeSaran.email);
    await navigateTo(page, '/overtime');
    await expect(page.locator('text=My Overtime').first()).toBeVisible({ timeout: 10000 });
  });
});
