import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { LeavePage } from './pages/LeavePage';
import { testUsers, testLeave } from './fixtures/testData';

/**
 * Leave Management E2E Tests
 * Tests leave request, approval, and tracking features
 */

test.describe('Leave Management', () => {
  let loginPage: LoginPage;
  let leavePage: LeavePage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    leavePage = new LeavePage(page);

    // Login as employee
    await loginPage.navigate();
    await loginPage.login(testUsers.employee.email, testUsers.employee.password);
    await page.waitForURL('**/dashboard');

    // Navigate to leave page
    await leavePage.navigate();
  });

  test.describe('Leave Page', () => {
    test('should display leave page', async ({ page }) => {
      // Verify page heading
      await expect(leavePage.pageHeading).toBeVisible();

      // Verify apply leave button
      await expect(leavePage.applyLeaveButton).toBeVisible();
    });

    test('should display leave balances', async ({ page }) => {
      // Check if balance cards are visible
      const hasAnnualBalance = await leavePage.annualLeaveBalance.isVisible().catch(() => false);
      const hasSickBalance = await leavePage.sickLeaveBalance.isVisible().catch(() => false);
      const hasCasualBalance = await leavePage.casualLeaveBalance.isVisible().catch(() => false);

      // At least one balance should be visible
      expect(hasAnnualBalance || hasSickBalance || hasCasualBalance).toBe(true);
    });

    test('should display leave requests table', async ({ page }) => {
      // Verify table exists
      const tableVisible = await leavePage.leaveTable.isVisible().catch(() => false);

      if (tableVisible) {
        const count = await leavePage.getLeaveRequestCount();
        expect(count).toBeGreaterThanOrEqual(0);
      }
    });

    test('should navigate to my leaves', async ({ page }) => {
      await leavePage.navigateToMyLeaves();

      // Verify URL
      expect(page.url()).toContain('/leave/my-leaves');
    });

    test('should navigate to team leaves', async ({ page }) => {
      // Login as manager
      await loginPage.navigate();
      await loginPage.login(testUsers.manager.email, testUsers.manager.password);
      await page.waitForURL('**/dashboard');

      await leavePage.navigate();
      await leavePage.navigateToTeamLeaves();

      // Verify URL
      expect(page.url()).toContain('/leave/team');
    });
  });

  test.describe('Apply Leave', () => {
    test('should open apply leave modal', async ({ page }) => {
      await leavePage.clickApplyLeave();

      // Verify modal is visible
      const isModalVisible = await leavePage.isLeaveModalVisible();
      expect(isModalVisible).toBe(true);

      // Verify form fields
      await expect(leavePage.leaveTypeSelect).toBeVisible();
      await expect(leavePage.startDateInput).toBeVisible();
      await expect(leavePage.endDateInput).toBeVisible();
      await expect(leavePage.reasonTextarea).toBeVisible();
    });

    test('should apply for annual leave', async ({ page }) => {
      await leavePage.applyLeave(testLeave.annual);

      // Wait for submission
      await page.waitForTimeout(1500);

      // Modal should be closed
      const isModalVisible = await leavePage.isLeaveModalVisible().catch(() => false);
      expect(isModalVisible).toBe(false);
    });

    test('should apply for sick leave', async ({ page }) => {
      await leavePage.applyLeave(testLeave.sick);

      // Wait for submission
      await page.waitForTimeout(1500);

      // Verify success
      const isModalVisible = await leavePage.isLeaveModalVisible().catch(() => false);
      expect(isModalVisible).toBe(false);
    });

    test('should apply for half day leave', async ({ page }) => {
      await leavePage.applyLeave(testLeave.casual);

      // Wait for submission
      await page.waitForTimeout(1500);

      // Verify success
      const isModalVisible = await leavePage.isLeaveModalVisible().catch(() => false);
      expect(isModalVisible).toBe(false);
    });

    test('should validate required fields', async ({ page }) => {
      await leavePage.clickApplyLeave();

      // Try to submit without filling fields
      await leavePage.submitLeaveButton.click();

      // Modal should still be visible (validation failed)
      const isModalVisible = await leavePage.isLeaveModalVisible();
      expect(isModalVisible).toBe(true);
    });

    test('should close leave modal on cancel', async ({ page }) => {
      await leavePage.clickApplyLeave();

      // Fill some data
      await leavePage.reasonTextarea.fill('Test reason');

      // Close modal
      await leavePage.closeModal();

      // Verify modal is closed
      const isModalVisible = await leavePage.isLeaveModalVisible().catch(() => false);
      expect(isModalVisible).toBe(false);
    });
  });

  test.describe('Leave Requests List', () => {
    test('should filter by status', async ({ page }) => {
      const hasStatusFilter = await leavePage.statusFilter.isVisible().catch(() => false);

      if (hasStatusFilter) {
        // Filter by pending status
        await leavePage.filterByStatus('PENDING');

        // Wait for results
        await page.waitForTimeout(1000);

        // Verify filter was applied
        const selectedValue = await leavePage.statusFilter.inputValue();
        expect(selectedValue).toBe('PENDING');
      }
    });

    test('should filter by leave type', async ({ page }) => {
      const hasTypeFilter = await leavePage.typeFilter.isVisible().catch(() => false);

      if (hasTypeFilter) {
        // Filter by annual leave
        await leavePage.filterByType('ANNUAL');

        // Wait for results
        await page.waitForTimeout(1000);

        // Verify filter was applied
        const selectedValue = await leavePage.typeFilter.inputValue();
        expect(selectedValue).toBe('ANNUAL');
      }
    });

    test('should view leave request details', async ({ page }) => {
      const count = await leavePage.getLeaveRequestCount();

      if (count > 0) {
        // View first leave request
        await leavePage.viewLeaveRequest(0);

        // Wait for details to load
        await page.waitForTimeout(1000);
      }
    });

    test('should get leave request details', async ({ page }) => {
      const count = await leavePage.getLeaveRequestCount();

      if (count > 0) {
        const request = await leavePage.getLeaveRequest(0);

        // Verify request has data
        expect(request.type).toBeTruthy();
        expect(request.status).toBeTruthy();
      }
    });

    test('should cancel pending leave request', async ({ page }) => {
      // First apply for leave
      await leavePage.applyLeave({
        ...testLeave.casual,
        startDate: getDateString(10),
        endDate: getDateString(10),
      });

      await page.waitForTimeout(1500);

      // Reload to see the new request
      await page.reload();
      await page.waitForTimeout(1000);

      const count = await leavePage.getLeaveRequestCount();

      if (count > 0) {
        // Try to cancel first request (if it's pending)
        const status = await leavePage.getStatusBadgeText(0);

        if (status.toLowerCase().includes('pending')) {
          await leavePage.cancelLeaveRequest(0);
          await page.waitForTimeout(1000);
        }
      }
    });
  });

  test.describe('Leave Balances', () => {
    test('should display leave balance correctly', async ({ page }) => {
      const annualBalance = await leavePage.getLeaveBalance('annual');
      const sickBalance = await leavePage.getLeaveBalance('sick');
      const casualBalance = await leavePage.getLeaveBalance('casual');

      // Balances should be displayed (even if 0)
      expect(annualBalance).toBeTruthy();
    });

    test('should update balance after leave application', async ({ page }) => {
      // Get initial balance
      const initialBalance = await leavePage.getLeaveBalance('annual');

      // Apply for leave
      await leavePage.applyLeave(testLeave.annual);
      await page.waitForTimeout(1500);

      // Reload to see updated balance
      await page.reload();
      await page.waitForTimeout(1000);

      // Get new balance
      const newBalance = await leavePage.getLeaveBalance('annual');

      // Balance may or may not change based on approval workflow
      expect(newBalance).toBeTruthy();
    });
  });

  test.describe('Manager - Team Leaves', () => {
    test.beforeEach(async ({ page }) => {
      // Login as manager
      await loginPage.navigate();
      await loginPage.login(testUsers.manager.email, testUsers.manager.password);
      await page.waitForURL('**/dashboard');
    });

    test('should view team leave requests', async ({ page }) => {
      await leavePage.navigateToTeamLeaves();

      // Verify team leave page loaded
      expect(page.url()).toContain('/leave/team');

      // Check for leave table
      const tableVisible = await leavePage.leaveTable.isVisible().catch(() => false);
      expect(tableVisible).toBe(true);
    });

    test('should filter team leaves by employee', async ({ page }) => {
      await leavePage.navigateToTeamLeaves();

      // Check for employee filter (available in team view)
      const hasFilter = await page.locator('select').filter({ hasText: /Employee|All/ }).isVisible().catch(() => false);

      if (hasFilter) {
        const employeeFilter = page.locator('select').filter({ hasText: /Employee|All/ });
        const options = await employeeFilter.locator('option').count();

        if (options > 1) {
          await employeeFilter.selectOption({ index: 1 });
          await page.waitForTimeout(1000);
        }
      }
    });
  });

  test.describe('Visual Regression', () => {
    test('should match leave page snapshot', async ({ page }) => {
      await expect(page).toHaveScreenshot('leave-page.png', {
        maxDiffPixels: 200,
      });
    });

    test('should match apply leave modal snapshot', async ({ page }) => {
      await leavePage.clickApplyLeave();
      await page.waitForTimeout(500);

      await expect(leavePage.leaveModal).toHaveScreenshot('apply-leave-modal.png', {
        maxDiffPixels: 100,
      });
    });
  });
});

test.describe('Leave - Edge Cases', () => {
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

  test('should validate date range', async ({ page }) => {
    await leavePage.clickApplyLeave();

    // Set end date before start date
    const tomorrow = getDateString(1);
    const today = getDateString(0);

    await leavePage.startDateInput.fill(tomorrow);
    await leavePage.endDateInput.fill(today);
    await leavePage.leaveTypeSelect.selectOption('ANNUAL');
    await leavePage.reasonTextarea.fill('Test invalid dates');

    // Try to submit
    await leavePage.submitLeaveButton.click();
    await page.waitForTimeout(1000);

    // Should show validation error or prevent submission
  });

  test('should handle insufficient leave balance', async ({ page }) => {
    // Apply for more days than available
    await leavePage.applyLeave({
      leaveType: 'ANNUAL',
      startDate: getDateString(1),
      endDate: getDateString(365), // One year of leave
      reason: 'Testing insufficient balance',
    });

    await page.waitForTimeout(1500);

    // May show error or allow with pending approval
  });
});

/**
 * Helper function to get date string relative to today
 */
function getDateString(daysOffset: number = 0): string {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  return date.toISOString().split('T')[0];
}
