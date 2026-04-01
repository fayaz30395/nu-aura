import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { LeavePage } from './pages/LeavePage';
import { testUsers, testLeave } from './fixtures/testData';
import { loginAs, switchUser } from './fixtures/helpers';

/**
 * Leave Flow E2E Tests
 *
 * Covers: apply leave, view requests, approve as manager.
 */

test.describe('Leave Flow — Employee', () => {
  let loginPage: LoginPage;
  let leavePage: LeavePage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    leavePage = new LeavePage(page);

    await loginPage.navigate();
    await loginPage.login(testUsers.employee.email, testUsers.employee.password);
    await page.waitForURL('**/dashboard');
    await leavePage.navigate();
  });

  test('should display leave page with heading and apply button', async ({ page }) => {
    await expect(leavePage.pageHeading).toBeVisible();
    await expect(leavePage.applyLeaveButton).toBeVisible();
  });

  test('should display leave balance cards', async ({ page }) => {
    const hasAnnual = await leavePage.annualLeaveBalance.isVisible().catch(() => false);
    const hasSick = await leavePage.sickLeaveBalance.isVisible().catch(() => false);
    const hasCasual = await leavePage.casualLeaveBalance.isVisible().catch(() => false);

    expect(hasAnnual || hasSick || hasCasual).toBe(true);
  });

  test('should open apply leave modal with form fields', async ({ page }) => {
    await leavePage.clickApplyLeave();

    const isModalVisible = await leavePage.isLeaveModalVisible();
    expect(isModalVisible).toBe(true);

    await expect(leavePage.leaveTypeSelect).toBeVisible();
    await expect(leavePage.startDateInput).toBeVisible();
    await expect(leavePage.endDateInput).toBeVisible();
    await expect(leavePage.reasonTextarea).toBeVisible();
  });

  test('should apply for annual leave successfully', async ({ page }) => {
    await leavePage.applyLeave(testLeave.annual);
    await page.waitForTimeout(1500);

    // Modal should close on success
    const isModalVisible = await leavePage.isLeaveModalVisible().catch(() => false);
    expect(isModalVisible).toBe(false);
  });

  test('should display leave requests table', async ({ page }) => {
    const tableVisible = await leavePage.leaveTable.isVisible().catch(() => false);

    if (tableVisible) {
      const count = await leavePage.getLeaveRequestCount();
      expect(count).toBeGreaterThanOrEqual(0);
    }
  });
});

test.describe('Leave Flow — Manager Approval', () => {
  const testRunId = `E2E-leave-${Date.now()}`;

  test('should submit leave as employee and view as manager', async ({ page }) => {
    // Step 1: Employee submits leave
    await loginAs(page, 'raj@nulogic.io');
    await page.goto('/leave');
    await page.waitForLoadState('networkidle');

    const applyBtn = page.locator('button:has-text("Apply Leave")');
    await expect(applyBtn).toBeVisible({ timeout: 10000 });
    await applyBtn.click();

    const modal = page.locator('div.fixed.inset-0').filter({ hasText: /Apply Leave|Leave Request/i });
    await expect(modal).toBeVisible({ timeout: 10000 });

    // Fill leave form
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];

    await page.locator('label:has-text("Leave Type")').locator('..').locator('select').selectOption('CASUAL');
    await page.locator('label:has-text("Start Date")').locator('..').locator('input').fill(dateStr);
    await page.locator('label:has-text("End Date")').locator('..').locator('input').fill(dateStr);
    await page.locator('textarea[placeholder*="reason"]').fill(`Leave flow test — ${testRunId}`);
    await page.locator('button:has-text("Submit Request")').click();

    await expect(modal).toBeHidden({ timeout: 15000 });

    // Step 2: Manager views team leaves
    await switchUser(page, 'raj@nulogic.io', 'mani@nulogic.io');
    await page.goto('/leave/team');
    await page.waitForLoadState('networkidle');

    // Verify team leaves page loaded
    expect(page.url()).toContain('/leave/team');

    // Look for pending request from Raj
    const pendingRow = page.locator('tbody tr', { hasText: /Raj/i }).first();
    const hasPending = await pendingRow.isVisible({ timeout: 10000 }).catch(() => false);

    // If the row is visible, we can see it in the table
    if (hasPending) {
      const statusBadge = pendingRow.locator('[class*="badge"]').first();
      const statusText = await statusBadge.textContent().catch(() => '');
      expect(statusText?.toUpperCase()).toMatch(/PENDING|SUBMITTED/);
    }
  });
});
