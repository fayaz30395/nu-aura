import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Employee Page Object Model
 * Handles all interactions with the employee management page
 */
export class EmployeePage extends BasePage {
  // Locators
  readonly pageHeading: Locator;
  readonly addEmployeeButton: Locator;
  readonly importButton: Locator;
  readonly searchInput: Locator;
  readonly searchButton: Locator;
  readonly statusFilter: Locator;
  readonly employeeTable: Locator;
  readonly tableRows: Locator;

  // Modal locators
  readonly modal: Locator;
  readonly modalTitle: Locator;
  readonly closeModalButton: Locator;

  // Form locators - Basic Info Tab
  readonly employeeCodeInput: Locator;
  readonly firstNameInput: Locator;
  readonly middleNameInput: Locator;
  readonly lastNameInput: Locator;
  readonly workEmailInput: Locator;
  readonly passwordInput: Locator;

  // Form locators - Personal Details Tab
  readonly personalTab: Locator;
  readonly personalEmailInput: Locator;
  readonly phoneNumberInput: Locator;
  readonly emergencyContactInput: Locator;
  readonly dateOfBirthInput: Locator;
  readonly genderSelect: Locator;
  readonly addressInput: Locator;
  readonly cityInput: Locator;
  readonly stateInput: Locator;
  readonly postalCodeInput: Locator;
  readonly countryInput: Locator;

  // Form locators - Employment Tab
  readonly employmentTab: Locator;
  readonly designationInput: Locator;
  readonly employmentTypeSelect: Locator;
  readonly departmentSelect: Locator;
  readonly levelSelect: Locator;
  readonly jobRoleSelect: Locator;
  readonly joiningDateInput: Locator;
  readonly confirmationDateInput: Locator;
  readonly managerSelect: Locator;

  // Form locators - Banking Tab
  readonly bankingTab: Locator;
  readonly bankAccountNumberInput: Locator;
  readonly bankNameInput: Locator;
  readonly bankIfscCodeInput: Locator;
  readonly taxIdInput: Locator;

  // Action buttons
  readonly submitButton: Locator;
  readonly cancelButton: Locator;

  // Delete modal
  readonly deleteModal: Locator;
  readonly deleteConfirmButton: Locator;
  readonly deleteCancelButton: Locator;

  constructor(page: Page) {
    super(page);

    // Page elements
    this.pageHeading = page.locator('h1:has-text("Employee Management")');
    this.addEmployeeButton = page.locator('button:has-text("Add Employee")');
    this.importButton = page.locator('button:has-text("Import")');
    this.searchInput = page.locator('input[placeholder*="Search employees"]');
    this.searchButton = page.locator('button:has-text("Search")');
    this.statusFilter = page.locator('select').filter({ hasText: 'All Status' });
    this.employeeTable = page.locator('table');
    this.tableRows = page.locator('tbody tr');

    // Modal
    this.modal = page.locator('div.fixed.inset-0').filter({ hasText: 'Add New Employee' });
    this.modalTitle = page.locator('h2:has-text("Add New Employee")');
    this.closeModalButton = this.modal.locator('button').first();

    // Basic Info Tab
    this.employeeCodeInput = page.locator('input[placeholder*="EMP"]');
    this.firstNameInput = page.locator('label:has-text("First Name")').locator('..').locator('input');
    this.middleNameInput = page.locator('label:has-text("Middle Name")').locator('..').locator('input');
    this.lastNameInput = page.locator('label:has-text("Last Name")').locator('..').locator('input');
    this.workEmailInput = page.locator('input[type="email"]').first();
    this.passwordInput = page.locator('label:has-text("Initial Password")').locator('..').locator('input');

    // Personal Details Tab
    this.personalTab = page.locator('button:has-text("Personal Details")');
    this.personalEmailInput = page.locator('input[placeholder*="personal@email.com"]');
    this.phoneNumberInput = page.locator('label:has-text("Phone Number")').locator('..').locator('input');
    this.emergencyContactInput = page.locator('label:has-text("Emergency Contact")').locator('..').locator('input');
    this.dateOfBirthInput = page.locator('label:has-text("Date of Birth")').locator('..').locator('input');
    this.genderSelect = page.locator('label:has-text("Gender")').locator('..').locator('select');
    this.addressInput = page.locator('textarea[placeholder*="Street address"]');
    this.cityInput = page.locator('label:has-text("City")').locator('..').locator('input');
    this.stateInput = page.locator('label:has-text("State/Province")').locator('..').locator('input');
    this.postalCodeInput = page.locator('label:has-text("Postal Code")').locator('..').locator('input');
    this.countryInput = page.locator('label:has-text("Country")').locator('..').locator('input');

    // Employment Tab
    this.employmentTab = page.locator('button:has-text("Employment")');
    this.designationInput = page.locator('input[placeholder*="Senior Software Engineer"]');
    this.employmentTypeSelect = page.locator('label:has-text("Employment Type")').locator('..').locator('select');
    this.departmentSelect = page.locator('label:has-text("Department")').locator('..').locator('select');
    this.levelSelect = page.locator('label:has-text("Employee Level")').locator('..').locator('select');
    this.jobRoleSelect = page.locator('label:has-text("Job Role")').locator('..').locator('select');
    this.joiningDateInput = page.locator('label:has-text("Joining Date")').locator('..').locator('input');
    this.confirmationDateInput = page.locator('label:has-text("Confirmation Date")').locator('..').locator('input');
    this.managerSelect = page.locator('label:has-text("Reporting Manager")').locator('..').locator('select');

    // Banking Tab
    this.bankingTab = page.locator('button:has-text("Banking & Tax")');
    this.bankAccountNumberInput = page.locator('input[placeholder*="1234567890"]');
    this.bankNameInput = page.locator('input[placeholder*="Bank of America"]');
    this.bankIfscCodeInput = page.locator('input[placeholder*="HDFC"]');
    this.taxIdInput = page.locator('input[placeholder*="XXX-XX-XXXX"]');

    // Action buttons
    this.submitButton = page.locator('button:has-text("Add Employee")').last();
    this.cancelButton = page.locator('button:has-text("Cancel")');

    // Delete modal
    this.deleteModal = page.locator('div.fixed.inset-0').filter({ hasText: 'Delete Employee' });
    this.deleteConfirmButton = page.locator('button:has-text("Delete")').last();
    this.deleteCancelButton = this.deleteModal.locator('button:has-text("Cancel")');
  }

  /**
   * Navigate to employees page
   */
  async navigate() {
    await this.goto('/employees');
    await this.waitForPageLoad();
  }

  /**
   * Click add employee button
   */
  async clickAddEmployee() {
    await this.addEmployeeButton.click();
    await this.modalTitle.waitFor({ state: 'visible' });
  }

  /**
   * Fill basic info tab
   */
  async fillBasicInfo(data: {
    employeeCode: string;
    firstName: string;
    middleName?: string;
    lastName?: string;
    workEmail: string;
    password: string;
  }) {
    await this.employeeCodeInput.fill(data.employeeCode);
    await this.firstNameInput.fill(data.firstName);
    if (data.middleName) await this.middleNameInput.fill(data.middleName);
    if (data.lastName) await this.lastNameInput.fill(data.lastName);
    await this.workEmailInput.fill(data.workEmail);
    await this.passwordInput.fill(data.password);
  }

  /**
   * Navigate to personal details tab and fill
   */
  async fillPersonalDetails(data: {
    personalEmail?: string;
    phoneNumber?: string;
    emergencyContact?: string;
    dateOfBirth?: string;
    gender?: string;
    address?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  }) {
    await this.personalTab.click();
    await this.wait(500);

    if (data.personalEmail) await this.personalEmailInput.fill(data.personalEmail);
    if (data.phoneNumber) await this.phoneNumberInput.fill(data.phoneNumber);
    if (data.emergencyContact) await this.emergencyContactInput.fill(data.emergencyContact);
    if (data.dateOfBirth) await this.dateOfBirthInput.fill(data.dateOfBirth);
    if (data.gender) await this.genderSelect.selectOption(data.gender);
    if (data.address) await this.addressInput.fill(data.address);
    if (data.city) await this.cityInput.fill(data.city);
    if (data.state) await this.stateInput.fill(data.state);
    if (data.postalCode) await this.postalCodeInput.fill(data.postalCode);
    if (data.country) await this.countryInput.fill(data.country);
  }

  /**
   * Navigate to employment tab and fill
   */
  async fillEmploymentDetails(data: {
    designation: string;
    employmentType?: string;
    department?: string;
    level?: string;
    jobRole?: string;
    joiningDate?: string;
    confirmationDate?: string;
    manager?: string;
  }) {
    await this.employmentTab.click();
    await this.wait(500);

    await this.designationInput.fill(data.designation);
    if (data.employmentType) await this.employmentTypeSelect.selectOption(data.employmentType);
    if (data.department) await this.departmentSelect.selectOption(data.department);
    if (data.level) await this.levelSelect.selectOption(data.level);
    if (data.jobRole) await this.jobRoleSelect.selectOption(data.jobRole);
    if (data.joiningDate) await this.joiningDateInput.fill(data.joiningDate);
    if (data.confirmationDate) await this.confirmationDateInput.fill(data.confirmationDate);
    if (data.manager) await this.managerSelect.selectOption(data.manager);
  }

  /**
   * Navigate to banking tab and fill
   */
  async fillBankingDetails(data: {
    bankAccountNumber?: string;
    bankName?: string;
    bankIfscCode?: string;
    taxId?: string;
  }) {
    await this.bankingTab.click();
    await this.wait(500);

    if (data.bankAccountNumber) await this.bankAccountNumberInput.fill(data.bankAccountNumber);
    if (data.bankName) await this.bankNameInput.fill(data.bankName);
    if (data.bankIfscCode) await this.bankIfscCodeInput.fill(data.bankIfscCode);
    if (data.taxId) await this.taxIdInput.fill(data.taxId);
  }

  /**
   * Submit employee form
   */
  async submitForm() {
    await this.submitButton.click();
    await this.wait(1000);
  }

  /**
   * Close modal
   */
  async closeModal() {
    await this.cancelButton.click();
  }

  /**
   * Search for employee
   */
  async searchEmployee(query: string) {
    await this.searchInput.fill(query);
    await this.searchButton.click();
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
   * Get employee count from table
   */
  async getEmployeeCount(): Promise<number> {
    return await this.tableRows.count();
  }

  /**
   * Click view employee by index
   */
  async viewEmployee(index: number = 0) {
    await this.tableRows.nth(index).locator('button:has-text("View")').click();
    await this.waitForNavigation();
  }

  /**
   * Click delete employee by index
   */
  async deleteEmployee(index: number = 0) {
    await this.tableRows.nth(index).locator('button:has-text("Delete")').click();
    await this.deleteModal.waitFor({ state: 'visible' });
  }

  /**
   * Confirm delete
   */
  async confirmDelete() {
    await this.deleteConfirmButton.click();
    await this.wait(1000);
  }

  /**
   * Cancel delete
   */
  async cancelDelete() {
    await this.deleteCancelButton.click();
  }

  /**
   * Get employee name by index
   */
  async getEmployeeName(index: number = 0): Promise<string> {
    return await this.tableRows.nth(index).locator('td').first().textContent() || '';
  }
}
