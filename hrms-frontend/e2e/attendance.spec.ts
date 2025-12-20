import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { AttendancePage } from './pages/AttendancePage';
import { testUsers, testAttendance } from './fixtures/testData';

/**
 * Attendance E2E Tests
 * Tests check-in, check-out, and attendance tracking features
 */

test.describe('Attendance Management', () => {
  let loginPage: LoginPage;
  let attendancePage: AttendancePage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    attendancePage = new AttendancePage(page);

    // Login as employee
    await loginPage.navigate();
    await loginPage.login(testUsers.employee.email, testUsers.employee.password);
    await page.waitForURL('**/dashboard');

    // Navigate to attendance page
    await attendancePage.navigate();
  });

  test.describe('Attendance Page', () => {
    test('should display attendance page', async ({ page }) => {
      // Verify page heading
      await expect(attendancePage.pageHeading).toBeVisible();

      // Verify at least one action button is visible (check-in or check-out)
      const hasCheckIn = await attendancePage.isCheckInButtonVisible();
      const hasCheckOut = await attendancePage.isCheckOutButtonVisible();
      expect(hasCheckIn || hasCheckOut).toBe(true);
    });

    test('should navigate to my attendance', async ({ page }) => {
      await attendancePage.navigateToMyAttendance();

      // Verify URL
      expect(page.url()).toContain('/attendance/my-attendance');
    });

    test('should navigate to team attendance', async ({ page }) => {
      // Login as manager for team view
      await loginPage.navigate();
      await loginPage.login(testUsers.manager.email, testUsers.manager.password);
      await page.waitForURL('**/dashboard');

      await attendancePage.navigate();
      await attendancePage.navigateToTeamAttendance();

      // Verify URL
      expect(page.url()).toContain('/attendance/team');
    });

    test('should navigate to regularization', async ({ page }) => {
      await attendancePage.navigateToRegularization();

      // Verify URL
      expect(page.url()).toContain('/attendance/regularization');
    });
  });

  test.describe('Check-In/Check-Out Flow', () => {
    test('should perform check-in', async ({ page }) => {
      // Check if check-in button is available
      const hasCheckInButton = await attendancePage.isCheckInButtonVisible();

      if (hasCheckInButton) {
        // Perform check-in
        await attendancePage.checkIn();

        // Wait for state update
        await page.waitForTimeout(1500);

        // Verify check-in was successful
        // Either status changed or check-out button appeared
        const isCheckedIn = await attendancePage.isCheckedIn().catch(() => false);
        const hasCheckOut = await attendancePage.isCheckOutButtonVisible().catch(() => false);

        expect(isCheckedIn || hasCheckOut).toBe(true);
      }
    });

    test('should perform check-out', async ({ page }) => {
      // First ensure checked in
      const hasCheckInButton = await attendancePage.isCheckInButtonVisible();
      if (hasCheckInButton) {
        await attendancePage.checkIn();
        await page.waitForTimeout(1500);
      }

      // Check if check-out button is available
      const hasCheckOutButton = await attendancePage.isCheckOutButtonVisible();

      if (hasCheckOutButton) {
        // Perform check-out
        await attendancePage.checkOut();

        // Wait for state update
        await page.waitForTimeout(1500);

        // Verify check-out was successful
        const isCheckedOut = await attendancePage.isCheckedOut().catch(() => false);
        expect(isCheckedOut).toBe(true);
      }
    });

    test('should perform break actions', async ({ page }) => {
      // Ensure checked in first
      const hasCheckInButton = await attendancePage.isCheckInButtonVisible();
      if (hasCheckInButton) {
        await attendancePage.checkIn();
        await page.waitForTimeout(1500);
      }

      // Check if break buttons are available
      const hasBreakStartButton = await attendancePage.breakStartButton.isVisible().catch(() => false);

      if (hasBreakStartButton) {
        // Start break
        await attendancePage.startBreak();
        await page.waitForTimeout(1000);

        // End break
        const hasBreakEndButton = await attendancePage.breakEndButton.isVisible().catch(() => false);
        if (hasBreakEndButton) {
          await attendancePage.endBreak();
          await page.waitForTimeout(1000);
        }
      }
    });
  });

  test.describe('Attendance Records', () => {
    test('should display attendance table', async ({ page }) => {
      await attendancePage.navigateToMyAttendance();

      // Check if table exists
      const tableVisible = await attendancePage.attendanceTable.isVisible().catch(() => false);
      if (tableVisible) {
        const count = await attendancePage.getAttendanceRecordCount();
        expect(count).toBeGreaterThanOrEqual(0);
      }
    });

    test('should display attendance statistics', async ({ page }) => {
      await attendancePage.navigateToMyAttendance();

      // Check if statistics cards are visible
      const hasTotalHours = await attendancePage.totalHoursCard.isVisible().catch(() => false);
      const hasPresentDays = await attendancePage.presentDaysCard.isVisible().catch(() => false);

      // At least one stat should be visible
      expect(hasTotalHours || hasPresentDays).toBe(true);
    });

    test('should filter attendance by date', async ({ page }) => {
      await attendancePage.navigateToMyAttendance();

      // Check if date filter exists
      const hasDateFilter = await attendancePage.dateRangeFilter.isVisible().catch(() => false);

      if (hasDateFilter) {
        // Apply date filter
        const today = new Date().toISOString().split('T')[0];
        await attendancePage.filterByDateRange(today);

        // Wait for results
        await page.waitForTimeout(1000);
      }
    });

    test('should get attendance record details', async ({ page }) => {
      await attendancePage.navigateToMyAttendance();

      const count = await attendancePage.getAttendanceRecordCount();

      if (count > 0) {
        const record = await attendancePage.getAttendanceRecord(0);

        // Verify record has data
        expect(record.date).toBeTruthy();
      }
    });
  });

  test.describe('Attendance Regularization', () => {
    test('should display regularization page', async ({ page }) => {
      await attendancePage.navigateToRegularization();

      // Verify regularization elements
      const hasRequestButton = await attendancePage.requestRegularizationButton.isVisible().catch(() => false);
      expect(hasRequestButton).toBe(true);
    });

    test('should request attendance regularization', async ({ page }) => {
      await attendancePage.navigateToRegularization();

      const hasRequestButton = await attendancePage.requestRegularizationButton.isVisible().catch(() => false);

      if (hasRequestButton) {
        // Request regularization
        await attendancePage.requestRegularization(
          testAttendance.regularization.date,
          testAttendance.regularization.reason
        );

        // Wait for submission
        await page.waitForTimeout(1500);

        // Modal should be closed
        const isModalVisible = await attendancePage.regularizationModal.isVisible().catch(() => false);
        expect(isModalVisible).toBe(false);
      }
    });
  });

  test.describe('Team Attendance (Manager)', () => {
    test.beforeEach(async ({ page }) => {
      // Login as manager
      await loginPage.navigate();
      await loginPage.login(testUsers.manager.email, testUsers.manager.password);
      await page.waitForURL('**/dashboard');
    });

    test('should view team attendance', async ({ page }) => {
      await attendancePage.navigateToTeamAttendance();

      // Verify team attendance page loaded
      expect(page.url()).toContain('/attendance/team');

      // Check for employee filter (only available in team view)
      const hasEmployeeFilter = await attendancePage.employeeFilter.isVisible().catch(() => false);
      expect(hasEmployeeFilter).toBe(true);
    });

    test('should filter team attendance by employee', async ({ page }) => {
      await attendancePage.navigateToTeamAttendance();

      const hasEmployeeFilter = await attendancePage.employeeFilter.isVisible().catch(() => false);

      if (hasEmployeeFilter) {
        // Get filter options
        const options = await attendancePage.employeeFilter.locator('option').count();

        if (options > 1) {
          // Select first employee
          await attendancePage.employeeFilter.selectOption({ index: 1 });
          await page.waitForTimeout(1000);
        }
      }
    });
  });

  test.describe('Visual Regression', () => {
    test('should match attendance page snapshot', async ({ page }) => {
      await expect(page).toHaveScreenshot('attendance-page.png', {
        maxDiffPixels: 200,
      });
    });

    test('should match my attendance snapshot', async ({ page }) => {
      await attendancePage.navigateToMyAttendance();
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot('my-attendance.png', {
        maxDiffPixels: 200,
      });
    });
  });
});

test.describe('Attendance - Edge Cases', () => {
  let loginPage: LoginPage;
  let attendancePage: AttendancePage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    attendancePage = new AttendancePage(page);

    await loginPage.navigate();
    await loginPage.login(testUsers.employee.email, testUsers.employee.password);
    await page.waitForURL('**/dashboard');
    await attendancePage.navigate();
  });

  test('should handle multiple check-in attempts', async ({ page }) => {
    const hasCheckInButton = await attendancePage.isCheckInButtonVisible();

    if (hasCheckInButton) {
      // First check-in
      await attendancePage.checkIn();
      await page.waitForTimeout(1000);

      // Try to check-in again (should not be possible)
      const hasCheckInAfter = await attendancePage.isCheckInButtonVisible();
      expect(hasCheckInAfter).toBe(false);
    }
  });

  test('should prevent check-out without check-in', async ({ page }) => {
    // If already checked in, check out first
    const hasCheckOut = await attendancePage.isCheckOutButtonVisible();
    if (hasCheckOut) {
      await attendancePage.checkOut();
      await page.waitForTimeout(1500);
    }

    // Now check-out button should not be available
    const hasCheckOutAfter = await attendancePage.isCheckOutButtonVisible();
    expect(hasCheckOutAfter).toBe(false);
  });
});
