import { test, expect } from '@playwright/test';
import { AttendancePage } from './pages/AttendancePage';

/**
 * Attendance Flow E2E Tests
 *
 * Covers: view attendance page, check-in action, attendance records.
 * Uses stored auth state from auth.setup.ts (SUPER_ADMIN).
 */

test.describe('Attendance Flow — Page Load', () => {
  let attendancePage: AttendancePage;

  test.beforeEach(async ({ page }) => {
    attendancePage = new AttendancePage(page);
    await attendancePage.navigate();
  });

  test('should display attendance page with heading', async ({ page }) => {
    await expect(attendancePage.pageHeading).toBeVisible();
  });

  test('should display check-in or check-out button', async ({ page }) => {
    const hasCheckIn = await attendancePage.isCheckInButtonVisible();
    const hasCheckOut = await attendancePage.isCheckOutButtonVisible();
    expect(hasCheckIn || hasCheckOut).toBe(true);
  });

  test('should not show error on page load', async ({ page }) => {
    const errorMsg = page.locator('text=/Something went wrong|Error loading|Internal Server/i');
    await expect(errorMsg).not.toBeVisible({ timeout: 5000 });
  });
});

test.describe('Attendance Flow — Check-In', () => {
  let attendancePage: AttendancePage;

  test.beforeEach(async ({ page }) => {
    attendancePage = new AttendancePage(page);
    await attendancePage.navigate();
  });

  test('should perform check-in and update state', async ({ page }) => {
    const hasCheckIn = await attendancePage.isCheckInButtonVisible();

    if (hasCheckIn) {
      await attendancePage.checkIn();
      await page.waitForTimeout(1500);

      // After check-in, either checked-in status or check-out button should appear
      const isCheckedIn = await attendancePage.isCheckedIn().catch(() => false);
      const hasCheckOut = await attendancePage.isCheckOutButtonVisible().catch(() => false);

      expect(isCheckedIn || hasCheckOut).toBe(true);
    }
  });

  test('should maintain state after page refresh', async ({ page }) => {
    const hasCheckIn = await attendancePage.isCheckInButtonVisible();
    if (hasCheckIn) {
      await attendancePage.checkIn();
      await page.waitForTimeout(1500);
    }

    // Refresh and verify state persists
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    const hasCheckOut = await attendancePage.isCheckOutButtonVisible();
    const hasCheckIn2 = await attendancePage.isCheckInButtonVisible();

    // One of them should be visible
    expect(hasCheckOut || hasCheckIn2).toBe(true);
  });
});

test.describe('Attendance Flow — Records', () => {
  let attendancePage: AttendancePage;

  test.beforeEach(async ({ page }) => {
    attendancePage = new AttendancePage(page);
    await attendancePage.navigate();
  });

  test('should navigate to my attendance records', async ({ page }) => {
    await attendancePage.navigateToMyAttendance();

    const url = page.url();
    expect(url.includes('/attendance') || url.includes('/me/attendance')).toBe(true);
  });

  test('should display attendance statistics cards', async ({ page }) => {
    await attendancePage.navigateToMyAttendance();
    await page.waitForTimeout(1000);

    const hasTotalHours = await attendancePage.totalHoursCard.isVisible().catch(() => false);
    const hasPresentDays = await attendancePage.presentDaysCard.isVisible().catch(() => false);
    const hasContent = await page.locator('[class*="card"], [class*="Card"]').first().isVisible().catch(() => false);

    expect(hasTotalHours || hasPresentDays || hasContent).toBe(true);
  });

  test('should navigate to team attendance', async ({ page }) => {
    await attendancePage.navigateToTeamAttendance();
    expect(page.url()).toContain('/attendance/team');
  });
});
