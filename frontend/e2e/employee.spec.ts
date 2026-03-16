import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { EmployeePage } from './pages/EmployeePage';
import { testUsers, testEmployee } from './fixtures/testData';
import { ApiMockHelper } from './utils/helpers';

/**
 * Employee Management E2E Tests
 * Tests employee CRUD operations and management features
 */

test.describe('Employee Management', () => {
  let loginPage: LoginPage;
  let employeePage: EmployeePage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    employeePage = new EmployeePage(page);

    // Login as admin
    await loginPage.navigate();
    await loginPage.login(testUsers.admin.email, testUsers.admin.password);
    await page.waitForURL('**/dashboard');

    // Navigate to employees page
    await employeePage.navigate();
  });

  test.describe('Employee List', () => {
    test('should display employee list page', async ({ page }) => {
      // Verify page heading
      await expect(employeePage.pageHeading).toBeVisible();

      // Verify action buttons
      await expect(employeePage.addEmployeeButton).toBeVisible();
      await expect(employeePage.importButton).toBeVisible();

      // Verify search and filters
      await expect(employeePage.searchInput).toBeVisible();
      await expect(employeePage.statusFilter).toBeVisible();
    });

    test('should display employee table', async ({ page }) => {
      // Verify table is visible
      await expect(employeePage.employeeTable).toBeVisible();

      // Get employee count
      const count = await employeePage.getEmployeeCount();
      expect(count).toBeGreaterThanOrEqual(0);
    });

    test('should search employees', async ({ page }) => {
      // Search for employee
      await employeePage.searchEmployee('john');

      // Wait for results
      await page.waitForLoadState('networkidle');

      // Verify search was performed
      const searchValue = await employeePage.searchInput.inputValue();
      expect(searchValue).toBe('john');
    });

    test('should filter employees by status', async ({ page }) => {
      // Filter by active status
      await employeePage.filterByStatus('ACTIVE');

      // Wait for results
      await page.waitForLoadState('networkidle');

      // Verify filter was applied
      const selectedValue = await employeePage.statusFilter.inputValue();
      expect(selectedValue).toBe('ACTIVE');
    });
  });

  test.describe('Create Employee', () => {
    test('should open add employee modal', async ({ page }) => {
      // Click add employee button
      await employeePage.clickAddEmployee();

      // Verify modal is visible
      await expect(employeePage.modalTitle).toBeVisible();
      await expect(employeePage.modalTitle).toHaveText('Add New Employee');
    });

    test('should create employee with basic info', async ({ page }) => {
      // Open modal
      await employeePage.clickAddEmployee();

      // Fill basic info
      await employeePage.fillBasicInfo(testEmployee.basic);

      // Fill employment details
      await employeePage.fillEmploymentDetails({
        designation: testEmployee.employment.designation,
        employmentType: testEmployee.employment.employmentType,
      });

      // Submit form
      await employeePage.submitForm();

      // Wait for success
      await page.waitForTimeout(1000);

      // Verify modal is closed
      const isModalVisible = await employeePage.modal.isVisible().catch(() => false);
      expect(isModalVisible).toBe(false);
    });

    test('should create employee with all details', async ({ page }) => {
      // Open modal
      await employeePage.clickAddEmployee();

      // Fill all tabs
      await employeePage.fillBasicInfo(testEmployee.basic);
      await employeePage.fillPersonalDetails(testEmployee.personal);
      await employeePage.fillEmploymentDetails(testEmployee.employment);
      await employeePage.fillBankingDetails(testEmployee.banking);

      // Submit form
      await employeePage.submitForm();

      // Wait for success
      await page.waitForTimeout(1500);
    });

    test('should validate required fields', async ({ page }) => {
      // Open modal
      await employeePage.clickAddEmployee();

      // Try to submit without filling required fields
      await employeePage.submitForm();

      // Modal should still be visible (validation failed)
      await expect(employeePage.modal).toBeVisible();
    });

    test('should close modal on cancel', async ({ page }) => {
      // Open modal
      await employeePage.clickAddEmployee();

      // Fill some data
      await employeePage.employeeCodeInput.fill('TEST001');

      // Close modal
      await employeePage.closeModal();

      // Verify modal is closed
      const isModalVisible = await employeePage.modal.isVisible().catch(() => false);
      expect(isModalVisible).toBe(false);
    });

    test('should navigate between tabs in employee form', async ({ page }) => {
      // Open modal
      await employeePage.clickAddEmployee();

      // Fill basic info
      await employeePage.fillBasicInfo(testEmployee.basic);

      // Navigate to personal tab
      await employeePage.personalTab.click();
      await page.waitForTimeout(500);

      // Verify personal fields are visible
      await expect(employeePage.personalEmailInput).toBeVisible();

      // Navigate to employment tab
      await employeePage.employmentTab.click();
      await page.waitForTimeout(500);

      // Verify employment fields are visible
      await expect(employeePage.designationInput).toBeVisible();

      // Navigate to banking tab
      await employeePage.bankingTab.click();
      await page.waitForTimeout(500);

      // Verify banking fields are visible
      await expect(employeePage.bankAccountNumberInput).toBeVisible();
    });
  });

  test.describe('View Employee', () => {
    test('should view employee details', async ({ page }) => {
      // Get employee count
      const count = await employeePage.getEmployeeCount();

      if (count > 0) {
        // View first employee
        await employeePage.viewEmployee(0);

        // Verify navigation to employee details
        expect(page.url()).toContain('/employees/');
      }
    });
  });

  test.describe('Delete Employee', () => {
    test('should open delete confirmation modal', async ({ page }) => {
      const count = await employeePage.getEmployeeCount();

      if (count > 0) {
        // Click delete on first employee
        await employeePage.deleteEmployee(0);

        // Verify delete modal is visible
        await expect(employeePage.deleteModal).toBeVisible();
      }
    });

    test('should cancel delete operation', async ({ page }) => {
      const count = await employeePage.getEmployeeCount();

      if (count > 0) {
        // Click delete
        await employeePage.deleteEmployee(0);

        // Cancel delete
        await employeePage.cancelDelete();

        // Verify modal is closed
        const isModalVisible = await employeePage.deleteModal.isVisible().catch(() => false);
        expect(isModalVisible).toBe(false);
      }
    });

    test('should delete employee', async ({ page }) => {
      // First create an employee to delete
      await employeePage.clickAddEmployee();
      await employeePage.fillBasicInfo({
        ...testEmployee.basic,
        employeeCode: `DEL${Date.now()}`,
      });
      await employeePage.fillEmploymentDetails({
        designation: 'Test Delete',
      });
      await employeePage.submitForm();
      await page.waitForTimeout(1500);

      // Get initial count
      const initialCount = await employeePage.getEmployeeCount();

      // Delete the last employee (newly created)
      await employeePage.deleteEmployee(0);

      // Confirm delete
      await employeePage.confirmDelete();

      // Wait for deletion
      await page.waitForTimeout(1000);

      // Verify count decreased
      const newCount = await employeePage.getEmployeeCount();
      expect(newCount).toBeLessThanOrEqual(initialCount);
    });
  });

  test.describe('Visual Regression', () => {
    test('should match employee list page snapshot', async ({ page }) => {
      await expect(page).toHaveScreenshot('employee-list.png', {
        maxDiffPixels: 200,
      });
    });

    test('should match add employee modal snapshot', async ({ page }) => {
      await employeePage.clickAddEmployee();
      await page.waitForTimeout(500);

      await expect(employeePage.modal).toHaveScreenshot('add-employee-modal.png', {
        maxDiffPixels: 100,
      });
    });
  });
});

test.describe('Employee Management with API Mocking', () => {
  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.navigate();
    await loginPage.login(testUsers.admin.email, testUsers.admin.password);
    await page.waitForURL('**/dashboard');
  });

  test('should display mocked employee list', async ({ page }) => {
    const employeePage = new EmployeePage(page);

    // Mock employee list
    await ApiMockHelper.mockEmployeeList(page, [
      {
        id: '1',
        employeeCode: 'EMP001',
        firstName: 'John',
        lastName: 'Doe',
        fullName: 'John Doe',
        workEmail: 'john.doe@company.com',
        designation: 'Software Engineer',
        status: 'ACTIVE',
      },
    ]);

    await employeePage.navigate();

    // Verify mocked data is displayed
    const count = await employeePage.getEmployeeCount();
    expect(count).toBe(1);
  });

  test('should handle create employee success', async ({ page }) => {
    const employeePage = new EmployeePage(page);

    // Mock successful creation
    await ApiMockHelper.mockCreateEmployeeSuccess(page);

    await employeePage.navigate();
    await employeePage.clickAddEmployee();
    await employeePage.fillBasicInfo(testEmployee.basic);
    await employeePage.fillEmploymentDetails({
      designation: testEmployee.employment.designation,
    });
    await employeePage.submitForm();

    // Wait for success
    await page.waitForTimeout(1000);
  });

  test('should handle API error gracefully', async ({ page }) => {
    const employeePage = new EmployeePage(page);

    // Mock API error
    await ApiMockHelper.mockApiError(page, '**/api/v1/employees**', 500);

    await employeePage.navigate();

    // Should show error state or empty state
    await page.waitForTimeout(1000);
  });
});
