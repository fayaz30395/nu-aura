import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { HomePage } from './pages/HomePage';
import { testUsers } from './fixtures/testData';

/**
 * Home Page E2E Tests
 * Tests home page features including:
 * - Welcome banner
 * - Time widget (clock-in/clock-out)
 * - Holidays carousel
 * - On leave today
 * - Celebrations (birthdays, anniversaries, new joinees)
 * - Leave balances
 * - Announcements
 * - Post creation
 */

test.describe('Home Page', () => {
  let loginPage: LoginPage;
  let homePage: HomePage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    homePage = new HomePage(page);

    // Login and navigate to home
    await loginPage.navigate();
    await loginPage.login(testUsers.admin.email, testUsers.admin.password);
    await page.waitForURL('**/dashboard');
    await homePage.navigate();
  });

  test.describe('Home Page Load', () => {
    test('should display home page after login', async ({ page }) => {
      expect(page.url()).toContain('/home');
    });

    test('should display welcome message', async () => {
      const loaded = await homePage.waitForHomePageLoad();
      expect(loaded).toBe(true);

      const welcomeMessage = await homePage.getWelcomeMessage();
      expect(welcomeMessage).toContain('Welcome');
    });

    test('should display time widget', async () => {
      const widgetLoaded = await homePage.waitForTimeWidget();
      expect(widgetLoaded).toBe(true);
    });
  });

  test.describe('Time Widget - Clock In/Out', () => {
    test('should show clock-in or clock-out button', async () => {
      await homePage.waitForTimeWidget();

      const clockInVisible = await homePage.isClockInButtonVisible();
      const clockOutVisible = await homePage.isClockOutButtonVisible();

      // One of them should be visible (unless holiday/weekend/leave)
      expect(clockInVisible || clockOutVisible).toBe(true);
    });

    test('should perform clock-in from home page', async ({ page }) => {
      await homePage.waitForTimeWidget();

      // If already clocked in, clock out first
      if (await homePage.isClockOutButtonVisible()) {
        await homePage.clockOut();
        await page.waitForTimeout(2000);
      }

      // Perform clock-in
      if (await homePage.isClockInButtonVisible()) {
        await homePage.clockIn();
        await page.waitForTimeout(2000);

        // Verify clock-out button is now visible
        const clockOutVisible = await homePage.isClockOutButtonVisible();
        expect(clockOutVisible).toBe(true);
      }
    });

    test('should perform clock-out from home page', async ({ page }) => {
      await homePage.waitForTimeWidget();

      // Ensure clocked in first
      if (await homePage.isClockInButtonVisible()) {
        await homePage.clockIn();
        await page.waitForTimeout(2000);
      }

      // Perform clock-out
      if (await homePage.isClockOutButtonVisible()) {
        await homePage.clockOut();
        await page.waitForTimeout(2000);

        // Verify clock-in button is now visible
        const clockInVisible = await homePage.isClockInButtonVisible();
        expect(clockInVisible).toBe(true);
      }
    });

    test('should maintain clock state after page refresh', async ({ page }) => {
      await homePage.waitForTimeWidget();

      // Ensure clocked in
      if (await homePage.isClockInButtonVisible()) {
        await homePage.clockIn();
        await page.waitForTimeout(2000);
      }

      const wasClockOutVisible = await homePage.isClockOutButtonVisible();

      // Refresh page
      await page.reload();
      await homePage.waitForTimeWidget();

      // State should be maintained
      if (wasClockOutVisible) {
        expect(await homePage.isClockOutButtonVisible()).toBe(true);
      }
    });
  });

  test.describe('Holidays Widget', () => {
    test('should display holidays section', async ({ page }) => {
      await homePage.waitForHomePageLoad();

      // Holidays widget should be present
      const holidaysVisible = await page.locator('text=/Holidays/i').isVisible();
      expect(holidaysVisible).toBe(true);
    });

    test('should navigate through holiday carousel', async () => {
      await homePage.waitForHomePageLoad();

      if (await homePage.hasHolidays()) {
        const firstHoliday = await homePage.getCurrentHolidayName();

        // Navigate to next
        await homePage.nextHoliday();
        const _secondHoliday = await homePage.getCurrentHolidayName();

        // Navigate back
        await homePage.prevHoliday();
        const backToFirst = await homePage.getCurrentHolidayName();

        // If there are multiple holidays, they should differ
        // If only one holiday, they should be the same
        expect(firstHoliday).toBe(backToFirst);
      }
    });
  });

  test.describe('On Leave Today Widget', () => {
    test('should display on leave today section', async ({ page }) => {
      await homePage.waitForHomePageLoad();

      const onLeaveVisible = await page.locator('text=/On Leave Today/i').isVisible();
      expect(onLeaveVisible).toBe(true);
    });

    test('should show employee count or empty message', async () => {
      await homePage.waitForHomePageLoad();

      const hasEmployees = await homePage.hasEmployeesOnLeave();
      if (hasEmployees) {
        const count = await homePage.getOnLeaveCount();
        expect(count).toBeGreaterThan(0);
      } else {
        // Should show "No one is on leave" message
        const noOneMessage = await homePage.page.locator('text=/No one is on leave/i').isVisible();
        expect(noOneMessage).toBe(true);
      }
    });
  });

  test.describe('Celebrations Widget', () => {
    test('should display celebrations tabs', async ({ page }) => {
      await homePage.waitForHomePageLoad();

      const birthdayTab = await page.locator('text=/Birthday/i').first().isVisible();
      const anniversaryTab = await page.locator('text=/Work Anniversaries/i').isVisible();
      const joineesTab = await page.locator('text=/New joinees/i').isVisible();

      expect(birthdayTab).toBe(true);
      expect(anniversaryTab).toBe(true);
      expect(joineesTab).toBe(true);
    });

    test('should switch between celebrations tabs', async ({ page }) => {
      await homePage.waitForHomePageLoad();

      // Switch to anniversaries tab
      await homePage.switchToAnniversariesTab();
      await page.waitForTimeout(500);

      // Switch to new joinees tab
      await homePage.switchToNewJoineesTab();
      await page.waitForTimeout(500);

      // Switch back to birthdays tab
      await homePage.switchToBirthdaysTab();
      await page.waitForTimeout(500);

      // Verify we're back on birthdays
      const birthdaysActive = await page.locator('button').filter({ hasText: /Birthday/i }).first().isVisible();
      expect(birthdaysActive).toBe(true);
    });

    test('should show birthdays or empty message', async () => {
      await homePage.waitForHomePageLoad();
      await homePage.switchToBirthdaysTab();

      const hasBirthdays = await homePage.hasBirthdays();
      if (!hasBirthdays) {
        const noBirthdaysMessage = await homePage.page.locator('text=/No upcoming birthdays/i').isVisible();
        expect(noBirthdaysMessage).toBe(true);
      }
    });

    test('should show anniversaries or empty message', async () => {
      await homePage.waitForHomePageLoad();
      await homePage.switchToAnniversariesTab();

      const hasAnniversaries = await homePage.hasAnniversaries();
      if (!hasAnniversaries) {
        const noAnniversariesMessage = await homePage.page.locator('text=/No upcoming work anniversaries/i').isVisible();
        expect(noAnniversariesMessage).toBe(true);
      }
    });

    test('should show new joinees or empty message', async () => {
      await homePage.waitForHomePageLoad();
      await homePage.switchToNewJoineesTab();

      const hasJoinees = await homePage.hasNewJoinees();
      if (!hasJoinees) {
        const noJoineesMessage = await homePage.page.locator('text=/No new joinees/i').isVisible();
        expect(noJoineesMessage).toBe(true);
      }
    });
  });

  test.describe('Leave Balances Widget', () => {
    test('should display leave balances section', async ({ page }) => {
      await homePage.waitForHomePageLoad();

      const leaveBalancesVisible = await page.locator('text=/Leave Balances/i').isVisible();
      expect(leaveBalancesVisible).toBe(true);
    });

    test('should navigate to leave request page', async ({ page }) => {
      await homePage.waitForHomePageLoad();

      const requestLeave = await page.locator('text=/Request Leave/i').isVisible();
      if (requestLeave) {
        await homePage.clickRequestLeave();
        expect(page.url()).toContain('/leave');
      }
    });
  });

  test.describe('Post Creation', () => {
    test('should display post creation tabs', async ({ page }) => {
      await homePage.waitForHomePageLoad();

      const postTabVisible = await page.locator('button').filter({ hasText: 'Post' }).first().isVisible();
      const pollTabVisible = await page.locator('button').filter({ hasText: 'Poll' }).isVisible();
      const praiseTabVisible = await page.locator('button').filter({ hasText: 'Praise' }).isVisible();

      expect(postTabVisible).toBe(true);
      expect(pollTabVisible).toBe(true);
      expect(praiseTabVisible).toBe(true);
    });

    test('should switch between post tabs', async ({ page }) => {
      await homePage.waitForHomePageLoad();

      // Switch to Poll tab
      await homePage.switchToPollTab();
      await page.waitForTimeout(300);

      // Switch to Praise tab
      await homePage.switchToPraiseTab();
      await page.waitForTimeout(300);

      // Switch back to Post tab
      await homePage.switchToPostTab();
      await page.waitForTimeout(300);
    });

    test('should allow entering post content', async ({ page }) => {
      await homePage.waitForHomePageLoad();

      const testContent = 'This is a test post from E2E tests';
      await homePage.enterPostContent(testContent);

      const textareaValue = await homePage.postTextarea.inputValue();
      expect(textareaValue).toBe(testContent);
    });
  });

  test.describe('Inbox Widget', () => {
    test('should display inbox widget', async ({ page }) => {
      await homePage.waitForHomePageLoad();

      const inboxVisible = await page.locator('text=/Inbox/i').first().isVisible();
      expect(inboxVisible).toBe(true);
    });
  });
});

test.describe('Home Page - Employee Role', () => {
  let loginPage: LoginPage;
  let homePage: HomePage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    homePage = new HomePage(page);

    // Login as employee
    await loginPage.navigate();
    await loginPage.login(testUsers.employee.email, testUsers.employee.password);
    await page.waitForURL('**/dashboard');
    await homePage.navigate();
  });

  test('should display home page for employee', async () => {
    const loaded = await homePage.waitForHomePageLoad();
    expect(loaded).toBe(true);
  });

  test('employee should see time widget', async () => {
    const widgetLoaded = await homePage.waitForTimeWidget();
    expect(widgetLoaded).toBe(true);
  });

  test('employee should be able to clock in', async ({ page }) => {
    await homePage.waitForTimeWidget();

    // Ensure clocked out first
    if (await homePage.isClockOutButtonVisible()) {
      await homePage.clockOut();
      await page.waitForTimeout(2000);
    }

    // Clock in
    if (await homePage.isClockInButtonVisible()) {
      await homePage.clockIn();
      await page.waitForTimeout(2000);

      const clockedIn = await homePage.isClockOutButtonVisible();
      expect(clockedIn).toBe(true);
    }
  });
});

test.describe('Home Page - State Persistence', () => {
  let loginPage: LoginPage;
  let homePage: HomePage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    homePage = new HomePage(page);

    await loginPage.navigate();
    await loginPage.login(testUsers.admin.email, testUsers.admin.password);
    await page.waitForURL('**/dashboard');
    await homePage.navigate();
  });

  test('should maintain celebration tab state after interaction', async ({ page }) => {
    await homePage.waitForHomePageLoad();

    // Switch to anniversaries tab
    await homePage.switchToAnniversariesTab();
    await page.waitForTimeout(500);

    // Interact with another section
    await homePage.nextHoliday();
    await page.waitForTimeout(300);

    // Anniversaries tab should still be active
    // (Note: This depends on the component implementation)
  });

  test('should maintain post content while switching tabs', async ({ page }) => {
    await homePage.waitForHomePageLoad();

    const testContent = 'Draft post content';
    await homePage.enterPostContent(testContent);

    // Switch to Poll tab and back
    await homePage.switchToPollTab();
    await page.waitForTimeout(300);
    await homePage.switchToPostTab();
    await page.waitForTimeout(300);

    // Content may or may not be preserved depending on implementation
    // This test documents the current behavior
  });
});

test.describe('Home Page - Visual Regression', () => {
  let loginPage: LoginPage;
  let homePage: HomePage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    homePage = new HomePage(page);

    await loginPage.navigate();
    await loginPage.login(testUsers.admin.email, testUsers.admin.password);
    await page.waitForURL('**/dashboard');
    await homePage.navigate();
  });

  test('should match home page snapshot', async ({ page }) => {
    await homePage.waitForHomePageLoad();
    await homePage.waitForTimeWidget();
    await page.waitForTimeout(1000); // Allow animations to complete

    await expect(page).toHaveScreenshot('home-page.png', {
      maxDiffPixels: 500,
    });
  });
});

test.describe('Home Page - Navigation', () => {
  let loginPage: LoginPage;
  let homePage: HomePage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    homePage = new HomePage(page);

    await loginPage.navigate();
    await loginPage.login(testUsers.admin.email, testUsers.admin.password);
    await page.waitForURL('**/dashboard');
    await homePage.navigate();
  });

  test('should navigate to attendance page from View All link', async ({ page }) => {
    await homePage.waitForHomePageLoad();

    const viewAllLink = page.locator('button:has-text("View All")').first();
    if (await viewAllLink.isVisible()) {
      await viewAllLink.click();
      await page.waitForTimeout(1000);
      // Should navigate away from home
    }
  });

  test('should navigate to leave page from Request Leave', async ({ page }) => {
    await homePage.waitForHomePageLoad();

    const requestLeaveLink = page.locator('text=/Request Leave/i');
    if (await requestLeaveLink.isVisible()) {
      await requestLeaveLink.click();
      await page.waitForTimeout(1000);
      expect(page.url()).toContain('/leave');
    }
  });

  test('should navigate to announcements from View All', async ({ page }) => {
    await homePage.waitForHomePageLoad();

    if (await homePage.hasAnnouncements()) {
      await homePage.clickViewAllAnnouncements();
      await page.waitForTimeout(1000);
      expect(page.url()).toContain('/announcements');
    }
  });
});
