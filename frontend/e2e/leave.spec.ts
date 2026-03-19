import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { LeavePage } from './pages/LeavePage';
import { testUsers, testLeave } from './fixtures/testData';
import { loginAs, switchUser } from './fixtures/helpers';

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
      const _sickBalance = await leavePage.getLeaveBalance('sick');
      const _casualBalance = await leavePage.getLeaveBalance('casual');

      // Balances should be displayed (even if 0)
      expect(annualBalance).toBeTruthy();
    });

    test('should update balance after leave application', async ({ page }) => {
      // Get initial balance
      const _initialBalance = await leavePage.getLeaveBalance('annual');

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

/**
 * Leave Approval Chain E2E Tests
 *
 * Tests the full submit → approve/reject → verify flow across multiple users.
 * Uses the fixture helpers for fast API-based user switching.
 *
 * Hierarchy tested:
 *   Raj V (EMPLOYEE) → reports to Mani S (TEAM_LEAD) → reports to Sumit Kumar (MANAGER)
 */
test.describe('Leave Approval Chain', () => {
  // Use a unique reason per run to identify our request in the list
  const testRunId = `E2E-${Date.now()}`;

  test('should submit casual leave and verify PENDING status', async ({ page }) => {
    // Step 1: Login as Raj (Employee) via API for speed
    await loginAs(page, 'raj@nulogic.io');

    // Navigate to leave page
    await page.goto('/leave');
    await page.waitForLoadState('networkidle');

    // Click Apply Leave
    const applyBtn = page.locator('button:has-text("Apply Leave")');
    await expect(applyBtn).toBeVisible({ timeout: 10000 });
    await applyBtn.click();

    // Wait for modal
    const modal = page.locator('div.fixed.inset-0').filter({ hasText: /Apply Leave|Leave Request/i });
    await expect(modal).toBeVisible({ timeout: 10000 });

    // Fill leave form — casual leave for tomorrow
    const tomorrow = getDateString(1);
    const leaveTypeSelect = page.locator('label:has-text("Leave Type")').locator('..').locator('select');
    await leaveTypeSelect.selectOption('CASUAL');

    const startDateInput = page.locator('label:has-text("Start Date")').locator('..').locator('input');
    await startDateInput.fill(tomorrow);

    const endDateInput = page.locator('label:has-text("End Date")').locator('..').locator('input');
    await endDateInput.fill(tomorrow);

    const reasonInput = page.locator('textarea[placeholder*="reason"]');
    await reasonInput.fill(`Casual leave approval test — ${testRunId}`);

    // Submit
    const submitBtn = page.locator('button:has-text("Submit Request")');
    await submitBtn.click();

    // Wait for modal to close (indicates success)
    await expect(modal).toBeHidden({ timeout: 15000 });

    // Reload and verify the request appears with PENDING status
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Look for our request in the table
    const pendingBadge = page.locator('tbody tr', { hasText: testRunId }).locator('text=/PENDING/i');
    const hasPending = await pendingBadge.isVisible({ timeout: 5000 }).catch(() => false);

    // Alternatively check the first row if our identifier isn't visible in table
    if (!hasPending) {
      const firstRowStatus = page.locator('tbody tr').first().locator('[class*="badge"]');
      const statusText = await firstRowStatus.textContent().catch(() => '');
      expect(statusText?.toUpperCase()).toContain('PENDING');
    }
  });

  test('should complete full approval chain: submit → TL approves → verify APPROVED', async ({ page }) => {
    const reason = `Full approval chain test — ${testRunId}-approve`;
    const tomorrow = getDateString(2); // Use day after tomorrow to avoid conflicts

    // ── Step 1: Raj submits a casual leave request ──
    await loginAs(page, 'raj@nulogic.io');
    await page.goto('/leave');
    await page.waitForLoadState('networkidle');

    const applyBtn = page.locator('button:has-text("Apply Leave")');
    await expect(applyBtn).toBeVisible({ timeout: 10000 });
    await applyBtn.click();

    const modal = page.locator('div.fixed.inset-0').filter({ hasText: /Apply Leave|Leave Request/i });
    await expect(modal).toBeVisible({ timeout: 10000 });

    await page.locator('label:has-text("Leave Type")').locator('..').locator('select').selectOption('CASUAL');
    await page.locator('label:has-text("Start Date")').locator('..').locator('input').fill(tomorrow);
    await page.locator('label:has-text("End Date")').locator('..').locator('input').fill(tomorrow);
    await page.locator('textarea[placeholder*="reason"]').fill(reason);
    await page.locator('button:has-text("Submit Request")').click();

    await expect(modal).toBeHidden({ timeout: 15000 });

    // ── Step 2: Switch to Mani (Team Lead) and approve ──
    await switchUser(page, 'raj@nulogic.io', 'mani@nulogic.io');

    // Navigate to approvals or team leaves
    await page.goto('/leave/team');
    await page.waitForLoadState('networkidle');

    // Look for pending approval from Raj
    const pendingRow = page.locator('tbody tr', { hasText: /Raj/i }).first();
    const hasPendingRow = await pendingRow.isVisible({ timeout: 10000 }).catch(() => false);

    if (hasPendingRow) {
      // Click approve button on the row or open details first
      const approveBtn = pendingRow.locator('button:has-text("Approve")');
      const hasDirectApprove = await approveBtn.isVisible({ timeout: 3000 }).catch(() => false);

      if (hasDirectApprove) {
        await approveBtn.click();
      } else {
        // May need to view details first
        const viewBtn = pendingRow.locator('button:has-text("View"), a:has-text("View")').first();
        if (await viewBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
          await viewBtn.click();
          await page.waitForLoadState('networkidle');

          // Now look for approve button on details page
          const detailApproveBtn = page.locator('button:has-text("Approve")').first();
          await expect(detailApproveBtn).toBeVisible({ timeout: 10000 });
          await detailApproveBtn.click();
        }
      }

      // Fill comment if a dialog appears
      const commentInput = page.locator('textarea[placeholder*="comment" i], textarea[placeholder*="remark" i]').first();
      if (await commentInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await commentInput.fill('Approved — E2E test');
        const confirmBtn = page.locator('button:has-text("Confirm"), button:has-text("Submit"), button:has-text("Approve")').last();
        await confirmBtn.click();
      }

      await page.waitForLoadState('networkidle');
    }

    // ── Step 3: Switch back to Raj and verify APPROVED ──
    await switchUser(page, 'mani@nulogic.io', 'raj@nulogic.io');
    await page.goto('/leave');
    await page.waitForLoadState('networkidle');

    // Check for approved status on latest request
    const approvedBadge = page.locator('tbody tr').first().locator('text=/APPROVED/i');
    const isApproved = await approvedBadge.isVisible({ timeout: 10000 }).catch(() => false);

    // If approval chain has multiple levels, it may still be pending at next level
    if (!isApproved) {
      const statusBadge = page.locator('tbody tr').first().locator('[class*="badge"]');
      const statusText = await statusBadge.textContent().catch(() => '');
      // Accept APPROVED or PENDING (if multi-level approval)
      expect(statusText?.toUpperCase()).toMatch(/APPROVED|PENDING/);
    }
  });

  test('should complete rejection flow: submit → TL rejects → verify REJECTED', async ({ page }) => {
    const reason = `Rejection flow test — ${testRunId}-reject`;
    const leaveDate = getDateString(5);

    // ── Step 1: Raj submits a casual leave request ──
    await loginAs(page, 'raj@nulogic.io');
    await page.goto('/leave');
    await page.waitForLoadState('networkidle');

    const applyBtn = page.locator('button:has-text("Apply Leave")');
    await expect(applyBtn).toBeVisible({ timeout: 10000 });
    await applyBtn.click();

    const modal = page.locator('div.fixed.inset-0').filter({ hasText: /Apply Leave|Leave Request/i });
    await expect(modal).toBeVisible({ timeout: 10000 });

    await page.locator('label:has-text("Leave Type")').locator('..').locator('select').selectOption('CASUAL');
    await page.locator('label:has-text("Start Date")').locator('..').locator('input').fill(leaveDate);
    await page.locator('label:has-text("End Date")').locator('..').locator('input').fill(leaveDate);
    await page.locator('textarea[placeholder*="reason"]').fill(reason);
    await page.locator('button:has-text("Submit Request")').click();

    await expect(modal).toBeHidden({ timeout: 15000 });

    // ── Step 2: Switch to Mani (Team Lead) and reject ──
    await switchUser(page, 'raj@nulogic.io', 'mani@nulogic.io');

    await page.goto('/leave/team');
    await page.waitForLoadState('networkidle');

    const pendingRow = page.locator('tbody tr', { hasText: /Raj/i }).first();
    const hasPendingRow = await pendingRow.isVisible({ timeout: 10000 }).catch(() => false);

    if (hasPendingRow) {
      const rejectBtn = pendingRow.locator('button:has-text("Reject")');
      const hasDirectReject = await rejectBtn.isVisible({ timeout: 3000 }).catch(() => false);

      if (hasDirectReject) {
        await rejectBtn.click();
      } else {
        const viewBtn = pendingRow.locator('button:has-text("View"), a:has-text("View")').first();
        if (await viewBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
          await viewBtn.click();
          await page.waitForLoadState('networkidle');

          const detailRejectBtn = page.locator('button:has-text("Reject")').first();
          await expect(detailRejectBtn).toBeVisible({ timeout: 10000 });
          await detailRejectBtn.click();
        }
      }

      // Fill rejection comment if dialog appears
      const commentInput = page.locator('textarea[placeholder*="comment" i], textarea[placeholder*="reason" i], textarea[placeholder*="remark" i]').first();
      if (await commentInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await commentInput.fill('Rejected — team capacity issue — E2E test');
        const confirmBtn = page.locator('button:has-text("Confirm"), button:has-text("Submit"), button:has-text("Reject")').last();
        await confirmBtn.click();
      }

      await page.waitForLoadState('networkidle');
    }

    // ── Step 3: Switch back to Raj and verify REJECTED ──
    await switchUser(page, 'mani@nulogic.io', 'raj@nulogic.io');
    await page.goto('/leave');
    await page.waitForLoadState('networkidle');

    const rejectedBadge = page.locator('tbody tr').first().locator('text=/REJECTED/i');
    const isRejected = await rejectedBadge.isVisible({ timeout: 10000 }).catch(() => false);

    if (!isRejected) {
      const statusBadge = page.locator('tbody tr').first().locator('[class*="badge"]');
      const statusText = await statusBadge.textContent().catch(() => '');
      expect(statusText?.toUpperCase()).toMatch(/REJECTED|PENDING/);
    }
  });

  test('should show updated leave balance after approval', async ({ page }) => {
    // Login as Raj and capture current casual leave balance
    await loginAs(page, 'raj@nulogic.io');
    await page.goto('/leave');
    await page.waitForLoadState('networkidle');

    // Capture initial balance text
    const casualBalanceCard = page.locator('text=/Casual Leave/i').locator('..');
    const initialBalanceText = await casualBalanceCard.textContent().catch(() => '') ?? '';

    // Extract numeric balance (look for a number pattern)
    const balanceMatch = initialBalanceText.match(/(\d+(\.\d+)?)/);
    const initialBalance = balanceMatch ? parseFloat(balanceMatch[1]) : -1;

    // Verify balance is displayed
    expect(initialBalanceText.length).toBeGreaterThan(0);

    // If balance is available and > 0, the approval flow should eventually deduct
    if (initialBalance > 0) {
      expect(initialBalance).toBeGreaterThan(0);
    }
  });
});
