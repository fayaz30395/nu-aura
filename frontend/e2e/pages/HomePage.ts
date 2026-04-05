import {Locator, Page} from '@playwright/test';
import {BasePage} from './BasePage';

/**
 * Home Page Object Model
 * Handles all interactions with the home page including:
 * - Attendance widget (clock-in/clock-out)
 * - Celebrations (birthdays, anniversaries, new joinees)
 * - Holidays carousel
 * - On leave today section
 * - Announcements
 */
export class HomePage extends BasePage {
  // Time Widget Locators
  readonly timeWidget: Locator;
  readonly clockInButton: Locator;
  readonly clockOutButton: Locator;
  readonly currentTimeDisplay: Locator;
  readonly attendanceStatus: Locator;

  // Holidays Widget Locators
  readonly holidaysWidget: Locator;
  readonly holidayName: Locator;
  readonly holidayDate: Locator;
  readonly holidayPrevButton: Locator;
  readonly holidayNextButton: Locator;
  readonly viewAllHolidaysButton: Locator;

  // On Leave Today Widget Locators
  readonly onLeaveWidget: Locator;
  readonly onLeaveCount: Locator;
  readonly onLeaveEmployees: Locator;

  // Leave Balances Widget Locators
  readonly leaveBalancesWidget: Locator;
  readonly leaveBalanceValue: Locator;
  readonly requestLeaveButton: Locator;
  readonly viewAllBalancesButton: Locator;

  // Celebrations Widget Locators
  readonly celebrationsWidget: Locator;
  readonly birthdaysTab: Locator;
  readonly anniversariesTab: Locator;
  readonly newJoineesTab: Locator;
  readonly todayBirthdaysSection: Locator;
  readonly upcomingBirthdaysSection: Locator;
  readonly todayAnniversariesSection: Locator;
  readonly upcomingAnniversariesSection: Locator;
  readonly newJoineesList: Locator;

  // Welcome Banner Locators
  readonly welcomeBanner: Locator;
  readonly welcomeMessage: Locator;

  // Inbox Widget Locators
  readonly inboxWidget: Locator;
  readonly inboxStatus: Locator;

  // Post Creation Locators
  readonly postTabs: Locator;
  readonly postTab: Locator;
  readonly pollTab: Locator;
  readonly praiseTab: Locator;
  readonly postTextarea: Locator;
  readonly postButton: Locator;

  // Announcements Locators
  readonly announcementsSection: Locator;
  readonly announcementItems: Locator;
  readonly viewAllAnnouncementsButton: Locator;

  constructor(page: Page) {
    super(page);

    // Time Widget
    this.timeWidget = page.locator('text=/Time Today/i').locator('..').locator('..');
    this.clockInButton = page.locator('button:has-text("Clock-in")');
    this.clockOutButton = page.locator('button:has-text("Clock-out")');
    this.currentTimeDisplay = page.locator('text=/\\d{2}:\\d{2}/').first();
    this.attendanceStatus = page.locator('text=/Working|Not clocked in|Holiday|Weekly Off|On Leave/i');

    // Holidays Widget
    this.holidaysWidget = page.locator('text=/Holidays/i').locator('..').locator('..');
    this.holidayName = this.holidaysWidget.locator('h2').first();
    this.holidayDate = this.holidaysWidget.locator('p').filter({hasText: /\d{1,2}/});
    this.holidayPrevButton = this.holidaysWidget.locator('button').first();
    this.holidayNextButton = this.holidaysWidget.locator('button').last();
    this.viewAllHolidaysButton = page.locator('button:has-text("View All")').filter({hasText: /View All/i}).first();

    // On Leave Today Widget
    this.onLeaveWidget = page.locator('text=/On Leave Today/i').locator('..').locator('..');
    this.onLeaveCount = this.onLeaveWidget.locator('[class*="Badge"]');
    this.onLeaveEmployees = this.onLeaveWidget.locator('[class*="avatar"], [class*="rounded-full"]');

    // Leave Balances Widget
    this.leaveBalancesWidget = page.locator('text=/Leave Balances/i').locator('..').locator('..');
    this.leaveBalanceValue = this.leaveBalancesWidget.locator('text=/\\d+/').first();
    this.requestLeaveButton = page.locator('text=/Request Leave/i');
    this.viewAllBalancesButton = page.locator('text=/View All Balances/i');

    // Celebrations Widget
    this.celebrationsWidget = page.locator('text=/Birthday|Anniversaries|joinees/i').locator('..').locator('..').locator('..');
    this.birthdaysTab = page.locator('button').filter({hasText: /Birthday/i});
    this.anniversariesTab = page.locator('button').filter({hasText: /Work Anniversaries/i});
    this.newJoineesTab = page.locator('button').filter({hasText: /New joinees/i});
    this.todayBirthdaysSection = page.locator('text=/Birthdays today/i').locator('..');
    this.upcomingBirthdaysSection = page.locator('text=/Upcoming Birthdays/i').locator('..');
    this.todayAnniversariesSection = page.locator('text=/Work Anniversaries Today/i').locator('..');
    this.upcomingAnniversariesSection = page.locator('text=/Upcoming Work Anniversaries/i').locator('..');
    this.newJoineesList = this.celebrationsWidget.locator('[class*="space-y"]');

    // Welcome Banner
    this.welcomeBanner = page.locator('[class*="gradient"]').filter({hasText: /Welcome/i});
    this.welcomeMessage = page.locator('h1').filter({hasText: /Welcome/i});

    // Inbox Widget
    this.inboxWidget = page.locator('text=/Inbox/i').locator('..').locator('..');
    this.inboxStatus = this.inboxWidget.locator('text=/Good job|pending/i');

    // Post Creation
    this.postTabs = page.locator('[class*="border-b"]').filter({has: page.locator('button:has-text("Post")')});
    this.postTab = page.locator('button').filter({hasText: 'Post'}).first();
    this.pollTab = page.locator('button').filter({hasText: 'Poll'});
    this.praiseTab = page.locator('button').filter({hasText: 'Praise'});
    this.postTextarea = page.locator('textarea[placeholder*="Write your post"]');
    this.postButton = page.locator('button').filter({hasText: 'Post'}).last();

    // Announcements
    this.announcementsSection = page.locator('text=/Announcements/i').locator('..').locator('..');
    this.announcementItems = this.announcementsSection.locator('[class*="rounded-lg"]');
    this.viewAllAnnouncementsButton = this.announcementsSection.locator('button:has-text("View All")');
  }

  /**
   * Navigate to home page
   */
  async navigate() {
    await this.goto('/home');
    await this.waitForPageLoad();
  }

  /**
   * Wait for home page to fully load
   */
  async waitForHomePageLoad(timeout: number = 10000): Promise<boolean> {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      const welcomeVisible = await this.welcomeMessage.isVisible();
      if (welcomeVisible) return true;
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
   * Check if clock-in button is visible
   */
  async isClockInButtonVisible(): Promise<boolean> {
    return await this.clockInButton.isVisible();
  }

  /**
   * Check if clock-out button is visible
   */
  async isClockOutButtonVisible(): Promise<boolean> {
    return await this.clockOutButton.isVisible();
  }

  /**
   * Perform clock-in
   */
  async clockIn() {
    await this.clockInButton.click();
    await this.wait(2000);
  }

  /**
   * Perform clock-out
   */
  async clockOut() {
    await this.clockOutButton.click();
    await this.wait(2000);
  }

  /**
   * Get current attendance status
   */
  async getAttendanceStatus(): Promise<string> {
    try {
      return await this.attendanceStatus.textContent() || '';
    } catch {
      return '';
    }
  }

  /**
   * Navigate to next holiday in carousel
   */
  async nextHoliday() {
    await this.holidayNextButton.click();
    await this.wait(300);
  }

  /**
   * Navigate to previous holiday in carousel
   */
  async prevHoliday() {
    await this.holidayPrevButton.click();
    await this.wait(300);
  }

  /**
   * Get current holiday name
   */
  async getCurrentHolidayName(): Promise<string> {
    try {
      return await this.holidayName.textContent() || '';
    } catch {
      return '';
    }
  }

  /**
   * Check if holidays widget has content
   */
  async hasHolidays(): Promise<boolean> {
    const noHolidays = await this.page.locator('text=/No upcoming holidays/i').isVisible();
    return !noHolidays;
  }

  /**
   * Get on leave count
   */
  async getOnLeaveCount(): Promise<number> {
    try {
      const text = await this.onLeaveCount.textContent();
      return parseInt(text || '0', 10);
    } catch {
      return 0;
    }
  }

  /**
   * Check if on leave section shows employees
   */
  async hasEmployeesOnLeave(): Promise<boolean> {
    const noOne = await this.page.locator('text=/No one is on leave/i').isVisible();
    return !noOne;
  }

  /**
   * Switch to birthdays tab
   */
  async switchToBirthdaysTab() {
    await this.birthdaysTab.click();
    await this.wait(300);
  }

  /**
   * Switch to anniversaries tab
   */
  async switchToAnniversariesTab() {
    await this.anniversariesTab.click();
    await this.wait(300);
  }

  /**
   * Switch to new joinees tab
   */
  async switchToNewJoineesTab() {
    await this.newJoineesTab.click();
    await this.wait(300);
  }

  /**
   * Check if birthdays section has content
   */
  async hasBirthdays(): Promise<boolean> {
    const noBirthdays = await this.page.locator('text=/No upcoming birthdays/i').isVisible();
    return !noBirthdays;
  }

  /**
   * Check if anniversaries section has content
   */
  async hasAnniversaries(): Promise<boolean> {
    const noAnniversaries = await this.page.locator('text=/No upcoming work anniversaries/i').isVisible();
    return !noAnniversaries;
  }

  /**
   * Check if new joinees section has content
   */
  async hasNewJoinees(): Promise<boolean> {
    const noJoinees = await this.page.locator('text=/No new joinees/i').isVisible();
    return !noJoinees;
  }

  /**
   * Get leave balance value
   */
  async getLeaveBalance(): Promise<string> {
    try {
      return await this.leaveBalanceValue.textContent() || '';
    } catch {
      return '';
    }
  }

  /**
   * Click request leave button
   */
  async clickRequestLeave() {
    await this.requestLeaveButton.click();
    await this.waitForPageLoad();
  }

  /**
   * Click view all balances button
   */
  async clickViewAllBalances() {
    await this.viewAllBalancesButton.click();
    await this.waitForPageLoad();
  }

  /**
   * Switch to post tab
   */
  async switchToPostTab() {
    await this.postTab.click();
    await this.wait(300);
  }

  /**
   * Switch to poll tab
   */
  async switchToPollTab() {
    await this.pollTab.click();
    await this.wait(300);
  }

  /**
   * Switch to praise tab
   */
  async switchToPraiseTab() {
    await this.praiseTab.click();
    await this.wait(300);
  }

  /**
   * Enter post content
   */
  async enterPostContent(content: string) {
    await this.postTextarea.fill(content);
  }

  /**
   * Submit post
   */
  async submitPost() {
    await this.postButton.click();
    await this.wait(1000);
  }

  /**
   * Check if announcements section has content
   */
  async hasAnnouncements(): Promise<boolean> {
    const noAnnouncements = await this.page.locator('text=/No announcements/i').isVisible();
    return !noAnnouncements;
  }

  /**
   * Click view all announcements
   */
  async clickViewAllAnnouncements() {
    await this.viewAllAnnouncementsButton.click();
    await this.waitForPageLoad();
  }

  /**
   * Get announcement count
   */
  async getAnnouncementCount(): Promise<number> {
    try {
      return await this.announcementItems.count();
    } catch {
      return 0;
    }
  }

  /**
   * Check if inbox shows good status
   */
  async isInboxClear(): Promise<boolean> {
    const goodJob = await this.page.locator('text=/Good job/i').isVisible();
    return goodJob;
  }

  /**
   * Check if time widget is loaded
   */
  async isTimeWidgetLoaded(): Promise<boolean> {
    const clockIn = await this.clockInButton.isVisible();
    const clockOut = await this.clockOutButton.isVisible();
    const holiday = await this.page.locator('button:has-text("Holiday")').isVisible();
    const weeklyOff = await this.page.locator('button:has-text("Weekly Off")').isVisible();
    const onLeave = await this.page.locator('button:has-text("On Leave")').isVisible();
    const completed = await this.page.locator('button:has-text("Completed")').isVisible();
    return clockIn || clockOut || holiday || weeklyOff || onLeave || completed;
  }

  /**
   * Wait for time widget to load
   */
  async waitForTimeWidget(timeout: number = 10000): Promise<boolean> {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      if (await this.isTimeWidgetLoaded()) return true;
      await this.wait(500);
    }
    return false;
  }
}
