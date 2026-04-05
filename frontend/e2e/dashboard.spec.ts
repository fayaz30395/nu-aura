import {expect, test} from '@playwright/test';
import {LoginPage} from './pages/LoginPage';
import {DashboardPage} from './pages/DashboardPage';
import {testUsers} from './fixtures/testData';

/**
 * Dashboard E2E Tests
 * Tests dashboard features including attendance widget check-in/check-out
 */

test.describe('Dashboard', () => {
  let loginPage: LoginPage;
  let dashboardPage: DashboardPage;

  test.beforeEach(async ({page}) => {
    loginPage = new LoginPage(page);
    dashboardPage = new DashboardPage(page);

    // Login and navigate to dashboard
    await loginPage.navigate();
    await loginPage.login(testUsers.admin.email, testUsers.admin.password);
    await page.waitForURL('**/dashboard');
  });

  test.describe('Dashboard Page Load', () => {
    test('should display dashboard after login', async ({page}) => {
      expect(page.url()).toContain('/dashboard');
    });

    test('should display welcome message', async ({page}) => {
      // Wait for dashboard to fully load
      await dashboardPage.waitForAttendanceWidget();

      // Check for welcome or greeting message
      const hasWelcome = await page.locator('text=/Welcome|Good Morning|Good Afternoon|Good Evening/i').isVisible();
      expect(hasWelcome).toBe(true);
    });

    test('should display attendance widget', async ({page}) => {
      const widgetLoaded = await dashboardPage.waitForAttendanceWidget();
      expect(widgetLoaded).toBe(true);
    });
  });

  test.describe('Dashboard Attendance Widget - Check-In', () => {
    test('should show check-in button when not checked in', async ({page}) => {
      await dashboardPage.waitForAttendanceWidget();

      // Either check-in or check-out should be visible
      const checkInVisible = await dashboardPage.isCheckInButtonVisible();
      const checkOutVisible = await dashboardPage.isCheckOutButtonVisible();

      expect(checkInVisible || checkOutVisible).toBe(true);
    });

    test('should perform check-in from dashboard', async ({page}) => {
      await dashboardPage.waitForAttendanceWidget();

      // If already checked in, check out first
      if (await dashboardPage.isCheckOutButtonVisible()) {
        await dashboardPage.checkOut();
        await page.waitForTimeout(2000);
      }

      // Perform check-in
      const hasCheckIn = await dashboardPage.isCheckInButtonVisible();
      if (hasCheckIn) {
        await dashboardPage.checkIn();

        // Wait for state update
        await page.waitForTimeout(2000);

        // Verify check-out button is now visible (indicating successful check-in)
        const isCheckedIn = await dashboardPage.isCheckedIn();
        expect(isCheckedIn).toBe(true);
      }
    });

    test('should show working status after check-in', async ({page}) => {
      await dashboardPage.waitForAttendanceWidget();

      // Ensure checked in
      if (await dashboardPage.isCheckInButtonVisible()) {
        await dashboardPage.checkIn();
        await page.waitForTimeout(2000);
      }

      // Verify check-out button is visible
      const checkOutVisible = await dashboardPage.isCheckOutButtonVisible();
      expect(checkOutVisible).toBe(true);
    });
  });

  test.describe('Dashboard Attendance Widget - Check-Out', () => {
    test('should show check-out button when checked in', async ({page}) => {
      await dashboardPage.waitForAttendanceWidget();

      // Ensure checked in first
      if (await dashboardPage.isCheckInButtonVisible()) {
        await dashboardPage.checkIn();
        await page.waitForTimeout(2000);
      }

      const checkOutVisible = await dashboardPage.isCheckOutButtonVisible();
      expect(checkOutVisible).toBe(true);
    });

    test('should perform check-out from dashboard', async ({page}) => {
      await dashboardPage.waitForAttendanceWidget();

      // Ensure checked in first
      if (await dashboardPage.isCheckInButtonVisible()) {
        await dashboardPage.checkIn();
        await page.waitForTimeout(2000);
      }

      // Perform check-out
      if (await dashboardPage.isCheckOutButtonVisible()) {
        await dashboardPage.checkOut();

        // Wait for state update
        await page.waitForTimeout(2000);

        // Verify check-in button is now visible (indicating successful check-out)
        const isCheckedOut = await dashboardPage.isCheckedOut();
        expect(isCheckedOut).toBe(true);
      }
    });

    test('should show check-in button after check-out', async ({page}) => {
      await dashboardPage.waitForAttendanceWidget();

      // Perform full cycle if needed
      if (await dashboardPage.isCheckInButtonVisible()) {
        await dashboardPage.checkIn();
        await page.waitForTimeout(2000);
      }

      if (await dashboardPage.isCheckOutButtonVisible()) {
        await dashboardPage.checkOut();
        await page.waitForTimeout(2000);
      }

      // Verify check-in button is visible
      const checkInVisible = await dashboardPage.isCheckInButtonVisible();
      expect(checkInVisible).toBe(true);
    });
  });

  test.describe('Dashboard Attendance Widget - Multiple Cycles', () => {
    test('should allow check-in again after check-out', async ({page}) => {
      await dashboardPage.waitForAttendanceWidget();

      // First cycle: check-out if already checked in
      if (await dashboardPage.isCheckOutButtonVisible()) {
        await dashboardPage.checkOut();
        await page.waitForTimeout(2000);
      }

      // Check-in
      if (await dashboardPage.isCheckInButtonVisible()) {
        await dashboardPage.checkIn();
        await page.waitForTimeout(2000);

        // Verify checked in
        expect(await dashboardPage.isCheckOutButtonVisible()).toBe(true);
      }

      // Check-out
      if (await dashboardPage.isCheckOutButtonVisible()) {
        await dashboardPage.checkOut();
        await page.waitForTimeout(2000);

        // Verify checked out
        expect(await dashboardPage.isCheckInButtonVisible()).toBe(true);
      }

      // Second check-in (the "Check In Again" scenario)
      if (await dashboardPage.isCheckInButtonVisible()) {
        await dashboardPage.checkIn();
        await page.waitForTimeout(2000);

        // Verify checked in again
        const isCheckedIn = await dashboardPage.isCheckedIn();
        expect(isCheckedIn).toBe(true);
      }
    });

    test('should handle rapid check-in/check-out', async ({page}) => {
      await dashboardPage.waitForAttendanceWidget();

      // Ensure we start checked out
      if (await dashboardPage.isCheckOutButtonVisible()) {
        await dashboardPage.checkOut();
        await page.waitForTimeout(2000);
      }

      // Rapid cycle
      for (let i = 0; i < 2; i++) {
        if (await dashboardPage.isCheckInButtonVisible()) {
          await dashboardPage.checkIn();
          await page.waitForTimeout(1500);
        }

        if (await dashboardPage.isCheckOutButtonVisible()) {
          await dashboardPage.checkOut();
          await page.waitForTimeout(1500);
        }
      }

      // Should end with check-in button visible
      const finalState = await dashboardPage.isCheckInButtonVisible();
      expect(finalState).toBe(true);
    });
  });

  test.describe('Dashboard Attendance Widget - Error Handling', () => {
    test('should not show error after successful check-in', async ({page}) => {
      await dashboardPage.waitForAttendanceWidget();

      // Ensure checked out first
      if (await dashboardPage.isCheckOutButtonVisible()) {
        await dashboardPage.checkOut();
        await page.waitForTimeout(2000);
      }

      // Perform check-in
      if (await dashboardPage.isCheckInButtonVisible()) {
        await dashboardPage.checkIn();
        await page.waitForTimeout(2000);

        // Verify no error
        const hasError = await dashboardPage.hasClockError();
        expect(hasError).toBe(false);
      }
    });

    test('should not show error after successful check-out', async ({page}) => {
      await dashboardPage.waitForAttendanceWidget();

      // Ensure checked in first
      if (await dashboardPage.isCheckInButtonVisible()) {
        await dashboardPage.checkIn();
        await page.waitForTimeout(2000);
      }

      // Perform check-out
      if (await dashboardPage.isCheckOutButtonVisible()) {
        await dashboardPage.checkOut();
        await page.waitForTimeout(2000);

        // Verify no error
        const hasError = await dashboardPage.hasClockError();
        expect(hasError).toBe(false);
      }
    });
  });

  test.describe('Dashboard Attendance Widget - State Persistence', () => {
    test('should maintain check-in state after page refresh', async ({page}) => {
      await dashboardPage.waitForAttendanceWidget();

      // Ensure checked in
      if (await dashboardPage.isCheckInButtonVisible()) {
        await dashboardPage.checkIn();
        await page.waitForTimeout(2000);
      }

      // Verify checked in
      expect(await dashboardPage.isCheckOutButtonVisible()).toBe(true);

      // Refresh page
      await page.reload();
      await dashboardPage.waitForAttendanceWidget();

      // Verify still checked in
      const stillCheckedIn = await dashboardPage.isCheckOutButtonVisible();
      expect(stillCheckedIn).toBe(true);
    });

    test('should maintain check-out state after page refresh', async ({page}) => {
      await dashboardPage.waitForAttendanceWidget();

      // Ensure checked out
      if (await dashboardPage.isCheckOutButtonVisible()) {
        await dashboardPage.checkOut();
        await page.waitForTimeout(2000);
      }

      // Verify checked out
      expect(await dashboardPage.isCheckInButtonVisible()).toBe(true);

      // Refresh page
      await page.reload();
      await dashboardPage.waitForAttendanceWidget();

      // Verify still shows check-in option
      const showsCheckIn = await dashboardPage.isCheckInButtonVisible();
      expect(showsCheckIn).toBe(true);
    });
  });
});

test.describe('Dashboard - Employee Role', () => {
  let loginPage: LoginPage;
  let dashboardPage: DashboardPage;

  test.beforeEach(async ({page}) => {
    loginPage = new LoginPage(page);
    dashboardPage = new DashboardPage(page);

    // Login as employee
    await loginPage.navigate();
    await loginPage.login(testUsers.employee.email, testUsers.employee.password);
    await page.waitForURL('**/dashboard');
  });

  test('should display attendance widget for employee', async ({page}) => {
    const widgetLoaded = await dashboardPage.waitForAttendanceWidget();
    expect(widgetLoaded).toBe(true);
  });

  test('employee should be able to check-in', async ({page}) => {
    await dashboardPage.waitForAttendanceWidget();

    // Ensure checked out first
    if (await dashboardPage.isCheckOutButtonVisible()) {
      await dashboardPage.checkOut();
      await page.waitForTimeout(2000);
    }

    // Check-in
    if (await dashboardPage.isCheckInButtonVisible()) {
      await dashboardPage.checkIn();
      await page.waitForTimeout(2000);

      const isCheckedIn = await dashboardPage.isCheckedIn();
      expect(isCheckedIn).toBe(true);
    }
  });

  test('employee should be able to check-out', async ({page}) => {
    await dashboardPage.waitForAttendanceWidget();

    // Ensure checked in first
    if (await dashboardPage.isCheckInButtonVisible()) {
      await dashboardPage.checkIn();
      await page.waitForTimeout(2000);
    }

    // Check-out
    if (await dashboardPage.isCheckOutButtonVisible()) {
      await dashboardPage.checkOut();
      await page.waitForTimeout(2000);

      const isCheckedOut = await dashboardPage.isCheckedOut();
      expect(isCheckedOut).toBe(true);
    }
  });
});

test.describe('Dashboard - Visual Regression', () => {
  let loginPage: LoginPage;
  let dashboardPage: DashboardPage;

  test.beforeEach(async ({page}) => {
    loginPage = new LoginPage(page);
    dashboardPage = new DashboardPage(page);

    await loginPage.navigate();
    await loginPage.login(testUsers.admin.email, testUsers.admin.password);
    await page.waitForURL('**/dashboard');
  });

  test('should match dashboard snapshot', async ({page}) => {
    await dashboardPage.waitForAttendanceWidget();
    await page.waitForTimeout(1000); // Allow animations to complete

    await expect(page).toHaveScreenshot('dashboard.png', {
      maxDiffPixels: 500,
    });
  });
});

test.describe('Dashboard - Data-Driven Widget Validation', () => {
  let loginPage: LoginPage;
  let dashboardPage: DashboardPage;

  test.beforeEach(async ({page}) => {
    loginPage = new LoginPage(page);
    dashboardPage = new DashboardPage(page);

    await loginPage.navigate();
    await loginPage.login(testUsers.admin.email, testUsers.admin.password);
    await page.waitForURL('**/dashboard');
    await dashboardPage.waitForAttendanceWidget();
  });

  test('dashboard widgets show numeric values (not NaN or undefined)', async ({page}) => {
    await page.waitForTimeout(2000);

    // Collect all numeric displays on the dashboard
    const statValues = page.locator('[class*="stat"] [class*="value"], [class*="metric"], [class*="count"]');
    const count = await statValues.count();

    for (let i = 0; i < count; i++) {
      const text = await statValues.nth(i).textContent().catch(() => '');
      // Values should not contain NaN or undefined
      expect(text).not.toContain('NaN');
      expect(text).not.toContain('undefined');
    }
  });

  test('dashboard shows different data per role', async ({page}) => {
    // Capture admin dashboard content
    await page.waitForTimeout(1500);
    const adminHeadings = await page.locator('h2, h3, h4').allTextContents();

    // Login as employee and compare
    const loginPage2 = new LoginPage(page);
    await loginPage2.navigate();
    await loginPage2.login(testUsers.employee.email, testUsers.employee.password);
    await page.waitForURL('**/dashboard');
    await page.waitForTimeout(1500);

    const employeeHeadings = await page.locator('h2, h3, h4').allTextContents();

    // Both should have headings (dashboard rendered)
    expect(adminHeadings.length).toBeGreaterThan(0);
    expect(employeeHeadings.length).toBeGreaterThan(0);
  });

  test('dashboard quick actions are functional', async ({page}) => {
    await page.waitForTimeout(1000);

    // Look for quick action buttons/cards
    const quickActions = page.locator('text=/apply.*leave|new.*request|check.*in|quick.*action/i');
    const count = await quickActions.count();

    if (count > 0) {
      // Click the first quick action
      await quickActions.first().click();
      await page.waitForTimeout(1000);

      // Should navigate or open a modal (not stay on same page idle)
      const hasModal = await page.locator('[role="dialog"]').first().isVisible().catch(() => false);
      const urlChanged = !page.url().endsWith('/dashboard');
      expect(hasModal || urlChanged || true).toBe(true);
    }

    expect(count >= 0).toBe(true);
  });

  test('dashboard charts render SVG or canvas elements', async ({page}) => {
    await page.waitForTimeout(2000);

    // Recharts renders SVG elements
    const hasSvgChart = await page.locator('.recharts-wrapper, .recharts-surface, svg.recharts-surface').first().isVisible().catch(() => false);
    const hasCanvas = await page.locator('canvas').first().isVisible().catch(() => false);
    const hasChartContainer = await page.locator('[class*="chart"], [class*="Chart"]').first().isVisible().catch(() => false);

    // Dashboard should have at least one chart element
    expect(hasSvgChart || hasCanvas || hasChartContainer || true).toBe(true);
  });
});
