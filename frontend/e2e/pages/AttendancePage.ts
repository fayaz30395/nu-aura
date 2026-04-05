import {Locator, Page} from '@playwright/test';
import {BasePage} from './BasePage';

/**
 * Attendance Page Object Model
 * Handles all interactions with the attendance page
 */
export class AttendancePage extends BasePage {
  // Locators
  readonly pageHeading: Locator;
  readonly checkInButton: Locator;
  readonly checkOutButton: Locator;
  readonly breakStartButton: Locator;
  readonly breakEndButton: Locator;
  readonly statusBadge: Locator;
  readonly currentTimeDisplay: Locator;
  readonly attendanceCalendar: Locator;
  readonly attendanceTable: Locator;
  readonly tableRows: Locator;

  // Filters
  readonly dateRangeFilter: Locator;
  readonly statusFilter: Locator;
  readonly employeeFilter: Locator;

  // My Attendance specific
  readonly myAttendanceLink: Locator;
  readonly teamAttendanceLink: Locator;
  readonly regularizationLink: Locator;

  // Statistics cards
  readonly totalHoursCard: Locator;
  readonly presentDaysCard: Locator;
  readonly absentDaysCard: Locator;
  readonly lateDaysCard: Locator;

  // Regularization
  readonly requestRegularizationButton: Locator;
  readonly regularizationModal: Locator;
  readonly regularizationDateInput: Locator;
  readonly regularizationReasonInput: Locator;
  readonly submitRegularizationButton: Locator;

  constructor(page: Page) {
    super(page);

    // Page elements
    this.pageHeading = page.locator('h1').filter({hasText: /Attendance|My Attendance/i});
    this.checkInButton = page.locator('button:has-text("Check In")');
    this.checkOutButton = page.locator('button:has-text("Check Out")');
    this.breakStartButton = page.locator('button:has-text("Start Break")');
    this.breakEndButton = page.locator('button:has-text("End Break")');
    this.statusBadge = page.locator('[class*="badge"]').filter({hasText: /Checked In|Checked Out|On Break/});
    this.currentTimeDisplay = page.locator('[class*="time"]').first();

    // Calendar and table
    this.attendanceCalendar = page.locator('[class*="calendar"]');
    this.attendanceTable = page.locator('table');
    this.tableRows = page.locator('tbody tr');

    // Filters
    this.dateRangeFilter = page.locator('input[type="date"]').first();
    this.statusFilter = page.locator('select').filter({hasText: /Status|All/});
    this.employeeFilter = page.locator('select').filter({hasText: /Employee|All Employees/});

    // Navigation links
    this.myAttendanceLink = page.locator('a[href*="/attendance/my-attendance"]');
    this.teamAttendanceLink = page.locator('a[href*="/attendance/team"]');
    this.regularizationLink = page.locator('a[href*="/attendance/regularization"]');

    // Statistics
    this.totalHoursCard = page.locator('text=/Total Hours/i').locator('..');
    this.presentDaysCard = page.locator('text=/Present Days/i').locator('..');
    this.absentDaysCard = page.locator('text=/Absent Days/i').locator('..');
    this.lateDaysCard = page.locator('text=/Late Days/i').locator('..');

    // Regularization
    this.requestRegularizationButton = page.locator('button:has-text("Request Regularization")');
    this.regularizationModal = page.locator('div.fixed.inset-0').filter({hasText: 'Regularization'});
    this.regularizationDateInput = page.locator('label:has-text("Date")').locator('..').locator('input');
    this.regularizationReasonInput = page.locator('textarea[placeholder*="regularization"], textarea[placeholder*="explain"]');
    this.submitRegularizationButton = page.locator('button:has-text("Submit Request")');
  }

  /**
   * Navigate to attendance page
   */
  async navigate() {
    await this.goto('/me/attendance');
    await this.waitForPageLoad();
  }

  /**
   * Navigate to my attendance page
   */
  async navigateToMyAttendance() {
    await this.goto('/me/attendance');
    await this.waitForPageLoad();
  }

  /**
   * Navigate to team attendance page
   */
  async navigateToTeamAttendance() {
    await this.goto('/attendance/team');
    await this.waitForPageLoad();
  }

  /**
   * Navigate to regularization page
   */
  async navigateToRegularization() {
    await this.goto('/attendance/regularization');
    await this.waitForPageLoad();
  }

  /**
   * Perform check-in
   */
  async checkIn() {
    await this.checkInButton.click();
    await this.wait(1000);
  }

  /**
   * Perform check-out
   */
  async checkOut() {
    await this.checkOutButton.click();
    await this.wait(1000);
  }

  /**
   * Start break
   */
  async startBreak() {
    await this.breakStartButton.click();
    await this.wait(1000);
  }

  /**
   * End break
   */
  async endBreak() {
    await this.breakEndButton.click();
    await this.wait(1000);
  }

  /**
   * Get current status
   */
  async getCurrentStatus(): Promise<string> {
    return await this.statusBadge.textContent() || '';
  }

  /**
   * Check if checked in (check-out button is visible)
   */
  async isCheckedIn(): Promise<boolean> {
    // If check-out button is visible, user is checked in
    return await this.checkOutButton.isVisible();
  }

  /**
   * Check if checked out (check-in button is visible, no open sessions)
   */
  async isCheckedOut(): Promise<boolean> {
    // If check-in button is visible and check-out is not, user is checked out
    const checkInVisible = await this.checkInButton.isVisible();
    const checkOutVisible = await this.checkOutButton.isVisible();
    return checkInVisible && !checkOutVisible;
  }

  /**
   * Get attendance count from table
   */
  async getAttendanceRecordCount(): Promise<number> {
    return await this.tableRows.count();
  }

  /**
   * Get total hours worked
   */
  async getTotalHours(): Promise<string> {
    return await this.totalHoursCard.textContent() || '0';
  }

  /**
   * Get present days count
   */
  async getPresentDays(): Promise<string> {
    return await this.presentDaysCard.textContent() || '0';
  }

  /**
   * Get absent days count
   */
  async getAbsentDays(): Promise<string> {
    return await this.absentDaysCard.textContent() || '0';
  }

  /**
   * Filter by date range
   */
  async filterByDateRange(startDate: string, endDate?: string) {
    await this.dateRangeFilter.fill(startDate);
    if (endDate) {
      const endDateFilter = this.page.locator('input[type="date"]').nth(1);
      await endDateFilter.fill(endDate);
    }
    await this.waitForPageLoad();
  }

  /**
   * Filter by status
   */
  async filterByStatus(status: string) {
    await this.statusFilter.selectOption(status);
    await this.waitForPageLoad();
  }

  /**
   * Request regularization
   */
  async requestRegularization(date: string, reason: string) {
    await this.requestRegularizationButton.click();
    await this.regularizationModal.waitFor({state: 'visible'});
    await this.regularizationDateInput.fill(date);
    await this.regularizationReasonInput.fill(reason);
    await this.submitRegularizationButton.click();
    await this.wait(1000);
  }

  /**
   * Get attendance record details by index
   */
  async getAttendanceRecord(index: number = 0): Promise<{
    date: string;
    checkIn: string;
    checkOut: string;
    hours: string;
    status: string;
  }> {
    const row = this.tableRows.nth(index);
    const cells = row.locator('td');

    return {
      date: await cells.nth(0).textContent() || '',
      checkIn: await cells.nth(1).textContent() || '',
      checkOut: await cells.nth(2).textContent() || '',
      hours: await cells.nth(3).textContent() || '',
      status: await cells.nth(4).textContent() || '',
    };
  }

  /**
   * Verify check-in button is visible
   */
  async isCheckInButtonVisible(): Promise<boolean> {
    return await this.checkInButton.isVisible();
  }

  /**
   * Verify check-out button is visible
   */
  async isCheckOutButtonVisible(): Promise<boolean> {
    return await this.checkOutButton.isVisible();
  }
}
