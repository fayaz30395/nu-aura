import {Locator, Page} from '@playwright/test';
import {BasePage} from './BasePage';

/**
 * Leave Page Object Model
 * Handles all interactions with the leave management page
 */
export class LeavePage extends BasePage {
  // Locators
  readonly pageHeading: Locator;
  readonly applyLeaveButton: Locator;
  readonly leaveTable: Locator;
  readonly tableRows: Locator;

  // Leave balances
  readonly annualLeaveBalance: Locator;
  readonly sickLeaveBalance: Locator;
  readonly casualLeaveBalance: Locator;

  // Apply leave modal
  readonly leaveModal: Locator;
  readonly leaveTypeSelect: Locator;
  readonly startDateInput: Locator;
  readonly endDateInput: Locator;
  readonly halfDayCheckbox: Locator;
  readonly reasonTextarea: Locator;
  readonly submitLeaveButton: Locator;
  readonly cancelLeaveButton: Locator;

  // Filters
  readonly statusFilter: Locator;
  readonly typeFilter: Locator;
  readonly dateRangeFilter: Locator;

  // Actions
  readonly viewDetailsButton: Locator;
  readonly cancelRequestButton: Locator;
  readonly withdrawButton: Locator;

  // Leave calendar
  readonly leaveCalendar: Locator;

  constructor(page: Page) {
    super(page);

    // Page elements
    this.pageHeading = page.locator('h1').filter({hasText: /Leave|My Leaves/i});
    this.applyLeaveButton = page.locator('button:has-text("Apply Leave")');
    this.leaveTable = page.locator('table');
    this.tableRows = page.locator('tbody tr');

    // Leave balances
    this.annualLeaveBalance = page.locator('text=/Annual Leave/i').locator('..');
    this.sickLeaveBalance = page.locator('text=/Sick Leave/i').locator('..');
    this.casualLeaveBalance = page.locator('text=/Casual Leave/i').locator('..');

    // Apply leave modal
    this.leaveModal = page.locator('div.fixed.inset-0').filter({hasText: /Apply Leave|Leave Request/i});
    this.leaveTypeSelect = page.locator('label:has-text("Leave Type")').locator('..').locator('select');
    this.startDateInput = page.locator('label:has-text("Start Date")').locator('..').locator('input');
    this.endDateInput = page.locator('label:has-text("End Date")').locator('..').locator('input');
    this.halfDayCheckbox = page.locator('label:has-text("Half Day")').locator('..').locator('input[type="checkbox"]');
    this.reasonTextarea = page.locator('textarea[placeholder*="reason"]');
    this.submitLeaveButton = page.locator('button:has-text("Submit Request")');
    this.cancelLeaveButton = page.locator('button:has-text("Cancel")');

    // Filters
    this.statusFilter = page.locator('select').filter({hasText: /Status|All Status/});
    this.typeFilter = page.locator('select').filter({hasText: /Type|All Types/});
    this.dateRangeFilter = page.locator('input[type="date"]').first();

    // Actions
    this.viewDetailsButton = page.locator('button:has-text("View")').first();
    this.cancelRequestButton = page.locator('button:has-text("Cancel Request")');
    this.withdrawButton = page.locator('button:has-text("Withdraw")');

    // Calendar
    this.leaveCalendar = page.locator('[class*="calendar"]');
  }

  /**
   * Navigate to leave page
   */
  async navigate() {
    await this.goto('/leave');
    await this.waitForPageLoad();
  }

  /**
   * Navigate to my leaves page
   */
  async navigateToMyLeaves() {
    await this.goto('/leave/my-leaves');
    await this.waitForPageLoad();
  }

  /**
   * Navigate to team leaves page
   */
  async navigateToTeamLeaves() {
    await this.goto('/leave/team');
    await this.waitForPageLoad();
  }

  /**
   * Click apply leave button
   */
  async clickApplyLeave() {
    await this.applyLeaveButton.click();
    await this.leaveModal.waitFor({state: 'visible'});
  }

  /**
   * Apply for leave
   */
  async applyLeave(data: {
    leaveType: string;
    startDate: string;
    endDate: string;
    halfDay?: boolean;
    reason: string;
  }) {
    await this.clickApplyLeave();
    await this.leaveTypeSelect.selectOption(data.leaveType);
    await this.startDateInput.fill(data.startDate);
    await this.endDateInput.fill(data.endDate);

    if (data.halfDay) {
      await this.halfDayCheckbox.check();
    }

    await this.reasonTextarea.fill(data.reason);
    await this.submitLeaveButton.click();
    await this.wait(1000);
  }

  /**
   * Get leave balance by type
   */
  async getLeaveBalance(type: 'annual' | 'sick' | 'casual'): Promise<string> {
    let balance: Locator;

    switch (type) {
      case 'annual':
        balance = this.annualLeaveBalance;
        break;
      case 'sick':
        balance = this.sickLeaveBalance;
        break;
      case 'casual':
        balance = this.casualLeaveBalance;
        break;
    }

    return await balance.textContent() || '0';
  }

  /**
   * Get leave request count
   */
  async getLeaveRequestCount(): Promise<number> {
    return await this.tableRows.count();
  }

  /**
   * Filter by status
   */
  async filterByStatus(status: string) {
    await this.statusFilter.selectOption(status);
    await this.waitForPageLoad();
  }

  /**
   * Filter by type
   */
  async filterByType(type: string) {
    await this.typeFilter.selectOption(type);
    await this.waitForPageLoad();
  }

  /**
   * Get leave request details by index
   */
  async getLeaveRequest(index: number = 0): Promise<{
    type: string;
    startDate: string;
    endDate: string;
    days: string;
    status: string;
  }> {
    const row = this.tableRows.nth(index);
    const cells = row.locator('td');

    return {
      type: await cells.nth(0).textContent() || '',
      startDate: await cells.nth(1).textContent() || '',
      endDate: await cells.nth(2).textContent() || '',
      days: await cells.nth(3).textContent() || '',
      status: await cells.nth(4).textContent() || '',
    };
  }

  /**
   * View leave request details
   */
  async viewLeaveRequest(index: number = 0) {
    await this.tableRows.nth(index).locator('button:has-text("View")').click();
    await this.wait(1000);
  }

  /**
   * Cancel leave request
   */
  async cancelLeaveRequest(index: number = 0) {
    await this.tableRows.nth(index).locator('button:has-text("Cancel")').click();
    await this.wait(1000);
  }

  /**
   * Get status badge color
   */
  async getStatusBadgeText(index: number = 0): Promise<string> {
    const row = this.tableRows.nth(index);
    const statusBadge = row.locator('[class*="badge"]');
    return await statusBadge.textContent() || '';
  }

  /**
   * Close leave modal
   */
  async closeModal() {
    await this.cancelLeaveButton.click();
  }

  /**
   * Verify leave modal is visible
   */
  async isLeaveModalVisible(): Promise<boolean> {
    return await this.leaveModal.isVisible();
  }
}
