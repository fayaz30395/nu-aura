import {Locator, Page} from '@playwright/test';
import {BasePage} from './BasePage';

/**
 * Leave Page Object Model
 * Leave application is a dedicated page (/leave/apply), not a modal.
 */
export class LeavePage extends BasePage {
  // Locators — leave list page
  readonly pageHeading: Locator;
  readonly applyLeaveButton: Locator;
  readonly leaveTable: Locator;
  readonly tableRows: Locator;

  // Leave balances
  readonly annualLeaveBalance: Locator;
  readonly sickLeaveBalance: Locator;
  readonly casualLeaveBalance: Locator;

  // Apply leave page (/leave/apply) — dedicated page, NOT a modal
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

    // Leave list page
    this.pageHeading = page.locator('h1').filter({hasText: /Leave|My Leaves/i});
    this.applyLeaveButton = page.locator('button:has-text("Apply Leave"), a:has-text("Apply Leave")');
    this.leaveTable = page.locator('table');
    this.tableRows = page.locator('tbody tr');

    // Leave balances — names match V72 seeds (EL=Earned Leave, SL=Sick Leave, CL=Casual Leave)
    this.annualLeaveBalance = page.locator('text=/Earned Leave/i').locator('..');
    this.sickLeaveBalance = page.locator('text=/Sick Leave/i').locator('..');
    this.casualLeaveBalance = page.locator('text=/Casual Leave/i').locator('..');

    // Apply leave page form elements
    this.leaveTypeSelect = page.locator('select[name="leaveTypeId"]');
    this.startDateInput = page.locator('label:has-text("Start Date")').locator('..').locator('input');
    this.endDateInput = page.locator('label:has-text("End Date")').locator('..').locator('input');
    this.halfDayCheckbox = page.locator('input[name="isHalfDay"]');
    this.reasonTextarea = page.locator('textarea[placeholder*="reason"]');
    this.submitLeaveButton = page.locator('button:has-text("Submit Leave Request")');
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

  async navigate() {
    await this.goto('/leave');
    await this.waitForPageLoad();
  }

  async navigateToMyLeaves() {
    await this.goto('/leave/my-leaves');
    await this.waitForPageLoad();
  }

  async navigateToTeamLeaves() {
    await this.goto('/leave/team');
    await this.waitForPageLoad();
  }

  /** Navigate to the dedicated /leave/apply page */
  async clickApplyLeave() {
    await this.goto('/leave/apply');
    await this.page.waitForSelector('h1:has-text("Apply for Leave")', {timeout: 15000});
  }

  /**
   * Fill and submit the leave application form on /leave/apply.
   * After submit the app redirects back to /leave.
   */
  async applyLeave(data: {
    leaveType: string;
    startDate: string;
    endDate: string;
    halfDay?: boolean;
    reason: string;
  }) {
    await this.clickApplyLeave();

    // Select leave type
    await this.leaveTypeSelect.selectOption({label: data.leaveType}).catch(async () => {
      // Fall back to selecting by visible text match
      await this.leaveTypeSelect.selectOption(data.leaveType);
    });

    // Fill dates (Mantine DateInput renders a plain <input> under the label)
    await this.startDateInput.fill(data.startDate);
    await this.endDateInput.fill(data.endDate);

    if (data.halfDay) {
      await this.halfDayCheckbox.check();
    }

    await this.reasonTextarea.fill(data.reason);
    await this.submitLeaveButton.click();
    await this.wait(1000);
  }

  async getLeaveBalance(type: 'annual' | 'sick' | 'casual'): Promise<string> {
    const balanceMap = {
      annual: this.annualLeaveBalance,
      sick: this.sickLeaveBalance,
      casual: this.casualLeaveBalance,
    };
    return await balanceMap[type].textContent() || '0';
  }

  async getLeaveRequestCount(): Promise<number> {
    return await this.tableRows.count();
  }

  async filterByStatus(status: string) {
    await this.statusFilter.selectOption(status);
    await this.waitForPageLoad();
  }

  async filterByType(type: string) {
    await this.typeFilter.selectOption(type);
    await this.waitForPageLoad();
  }

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

  async viewLeaveRequest(index: number = 0) {
    await this.tableRows.nth(index).locator('button:has-text("View")').click();
    await this.wait(1000);
  }

  async cancelLeaveRequest(index: number = 0) {
    await this.tableRows.nth(index).locator('button:has-text("Cancel")').click();
    await this.wait(1000);
  }

  async getStatusBadgeText(index: number = 0): Promise<string> {
    const row = this.tableRows.nth(index);
    return await row.locator('[class*="badge"]').textContent() || '';
  }

  /** Go back from /leave/apply without submitting */
  async closeModal() {
    await this.cancelLeaveButton.click();
    await this.wait(500);
  }

  /** True when the /leave/apply page heading is visible */
  async isLeaveModalVisible(): Promise<boolean> {
    return this.page.url().includes('/leave/apply');
  }
}
