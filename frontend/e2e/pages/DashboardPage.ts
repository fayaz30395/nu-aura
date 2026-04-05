import {Locator, Page} from '@playwright/test';
import {BasePage} from './BasePage';

/**
 * Dashboard Page Object Model
 * Handles all interactions with the dashboard page including attendance widget
 */
export class DashboardPage extends BasePage {
  // Attendance Widget Locators
  readonly attendanceWidget: Locator;
  readonly checkInButton: Locator;
  readonly checkOutButton: Locator;
  readonly attendanceStatus: Locator;
  readonly currentTime: Locator;
  readonly workDuration: Locator;
  readonly clockError: Locator;

  // Quick Stats Locators
  readonly quickStatsSection: Locator;
  readonly pendingLeavesCard: Locator;
  readonly presentTodayCard: Locator;
  readonly upcomingHolidaysCard: Locator;

  // Announcements
  readonly announcementsSection: Locator;

  // Navigation
  readonly sidebarNav: Locator;
  readonly userMenu: Locator;
  readonly logoutButton: Locator;

  // Welcome message
  readonly welcomeMessage: Locator;

  constructor(page: Page) {
    super(page);

    // Attendance Widget
    this.attendanceWidget = page.locator('[data-testid="attendance-widget"]').or(
      page.locator('text=/Check In|Check Out|Working/i').locator('..')
    );
    this.checkInButton = page.locator('button:has-text("Check In")');
    this.checkOutButton = page.locator('button:has-text("Check Out")');
    this.attendanceStatus = page.locator('[data-testid="attendance-status"]').or(
      page.locator('text=/Checked In|Not Checked In|Working/i')
    );
    this.currentTime = page.locator('[data-testid="current-time"]').or(
      page.locator('text=/\\d{1,2}:\\d{2}:\\d{2}/').first()
    );
    this.workDuration = page.locator('[data-testid="work-duration"]').or(
      page.locator('text=/\\d+h \\d+m|Working for/i')
    );
    this.clockError = page.locator('[data-testid="clock-error"]').or(
      page.locator('text=/Failed to check|error/i')
    );

    // Quick Stats
    this.quickStatsSection = page.locator('[data-testid="quick-stats"]').or(
      page.locator('section').filter({hasText: /Statistics|Overview/i})
    );
    this.pendingLeavesCard = page.locator('text=/Pending Leaves|Leave Requests/i').locator('..');
    this.presentTodayCard = page.locator('text=/Present Today|Attendance/i').locator('..');
    this.upcomingHolidaysCard = page.locator('text=/Upcoming Holidays|Holidays/i').locator('..');

    // Announcements
    this.announcementsSection = page.locator('[data-testid="announcements"]').or(
      page.locator('section').filter({hasText: /Announcements/i})
    );

    // Navigation
    this.sidebarNav = page.locator('nav').or(page.locator('[data-testid="sidebar"]'));
    this.userMenu = page.locator('[data-testid="user-menu"]').or(
      page.locator('button').filter({hasText: /@|avatar/i})
    );
    this.logoutButton = page.locator('button:has-text("Logout")').or(
      page.locator('button:has-text("Sign Out")')
    );

    // Welcome
    this.welcomeMessage = page.locator('h1, h2').filter({hasText: /Welcome|Good Morning|Good Afternoon|Good Evening/i});
  }

  /**
   * Navigate to dashboard
   */
  async navigate() {
    await this.goto('/dashboard');
    await this.waitForPageLoad();
  }

  /**
   * Perform check-in from dashboard
   */
  async checkIn() {
    await this.checkInButton.click();
    await this.wait(2000); // Wait for API response
  }

  /**
   * Perform check-out from dashboard
   */
  async checkOut() {
    await this.checkOutButton.click();
    await this.wait(2000); // Wait for API response
  }

  /**
   * Check if check-in button is visible
   */
  async isCheckInButtonVisible(): Promise<boolean> {
    return await this.checkInButton.isVisible();
  }

  /**
   * Check if check-out button is visible
   */
  async isCheckOutButtonVisible(): Promise<boolean> {
    return await this.checkOutButton.isVisible();
  }

  /**
   * Check if user is currently checked in
   */
  async isCheckedIn(): Promise<boolean> {
    const checkOutVisible = await this.checkOutButton.isVisible();
    return checkOutVisible;
  }

  /**
   * Check if user is currently checked out
   */
  async isCheckedOut(): Promise<boolean> {
    const checkInVisible = await this.checkInButton.isVisible();
    const checkOutVisible = await this.checkOutButton.isVisible();
    return checkInVisible && !checkOutVisible;
  }

  /**
   * Get current attendance status text
   */
  async getAttendanceStatusText(): Promise<string> {
    try {
      return await this.attendanceStatus.textContent() || '';
    } catch {
      return '';
    }
  }

  /**
   * Get work duration text
   */
  async getWorkDurationText(): Promise<string> {
    try {
      return await this.workDuration.textContent() || '';
    } catch {
      return '';
    }
  }

  /**
   * Check if there's a clock error displayed
   */
  async hasClockError(): Promise<boolean> {
    return await this.clockError.isVisible();
  }

  /**
   * Get clock error message
   */
  async getClockErrorMessage(): Promise<string> {
    try {
      return await this.clockError.textContent() || '';
    } catch {
      return '';
    }
  }

  /**
   * Wait for attendance status to update
   */
  async waitForAttendanceUpdate(expectedState: 'checked-in' | 'checked-out', timeout: number = 5000) {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      if (expectedState === 'checked-in') {
        if (await this.isCheckedIn()) return true;
      } else {
        if (await this.isCheckedOut()) return true;
      }
      await this.wait(500);
    }
    return false;
  }

  /**
   * Get welcome message text
   */
  async getWelcomeMessage(): Promise<string> {
    try {
      return await this.welcomeMessage.textContent() || '';
    } catch {
      return '';
    }
  }

  /**
   * Check if quick stats section is visible
   */
  async isQuickStatsVisible(): Promise<boolean> {
    return await this.quickStatsSection.isVisible();
  }

  /**
   * Check if announcements section is visible
   */
  async isAnnouncementsVisible(): Promise<boolean> {
    return await this.announcementsSection.isVisible();
  }

  /**
   * Logout from dashboard
   */
  async logout() {
    // Try direct logout button first
    const logoutVisible = await this.logoutButton.isVisible();
    if (logoutVisible) {
      await this.logoutButton.click();
      return;
    }

    // Otherwise try user menu
    const userMenuVisible = await this.userMenu.isVisible();
    if (userMenuVisible) {
      await this.userMenu.click();
      await this.wait(500);
      await this.logoutButton.click();
    }
  }

  /**
   * Navigate to a section via sidebar
   */
  async navigateToSection(sectionName: string) {
    const link = this.page.locator(`a:has-text("${sectionName}")`).first();
    await link.click();
    await this.waitForPageLoad();
  }

  /**
   * Check if attendance widget is fully loaded
   */
  async isAttendanceWidgetLoaded(): Promise<boolean> {
    // Either check-in or check-out button should be visible
    const checkIn = await this.checkInButton.isVisible();
    const checkOut = await this.checkOutButton.isVisible();
    return checkIn || checkOut;
  }

  /**
   * Wait for attendance widget to load
   */
  async waitForAttendanceWidget(timeout: number = 10000) {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      if (await this.isAttendanceWidgetLoaded()) return true;
      await this.wait(500);
    }
    return false;
  }

  /**
   * Perform full check-in/check-out cycle
   */
  async performCheckInCheckOutCycle(): Promise<{ checkInSuccess: boolean; checkOutSuccess: boolean }> {
    let checkInSuccess = false;
    let checkOutSuccess = false;

    // Check-in
    if (await this.isCheckInButtonVisible()) {
      await this.checkIn();
      checkInSuccess = await this.waitForAttendanceUpdate('checked-in', 5000);
    }

    // Check-out
    if (await this.isCheckOutButtonVisible()) {
      await this.checkOut();
      checkOutSuccess = await this.waitForAttendanceUpdate('checked-out', 5000);
    }

    return {checkInSuccess, checkOutSuccess};
  }
}
