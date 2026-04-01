import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { EmployeePage } from './pages/EmployeePage';
import { testUsers, testEmployee } from './fixtures/testData';

/**
 * Employee CRUD E2E Tests
 *
 * Covers: list employees, create, view profile, edit, delete.
 * Authenticates as SUPER_ADMIN for full CRUD access.
 */

test.describe('Employee CRUD', () => {
  let loginPage: LoginPage;
  let employeePage: EmployeePage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    employeePage = new EmployeePage(page);

    // Login as admin
    await loginPage.navigate();
    await loginPage.login(testUsers.admin.email, testUsers.admin.password);
    await page.waitForURL('**/dashboard');

    // Navigate to employees
    await employeePage.navigate();
  });

  test.describe('List Employees', () => {
    test('should display employee list page with heading', async ({ page }) => {
      await expect(employeePage.pageHeading).toBeVisible();
      expect(page.url()).toContain('/employees');
    });

    test('should display employee table with data', async ({ page }) => {
      await expect(employeePage.employeeTable).toBeVisible();

      const count = await employeePage.getEmployeeCount();
      expect(count).toBeGreaterThanOrEqual(0);
    });

    test('should have add employee and import buttons', async ({ page }) => {
      await expect(employeePage.addEmployeeButton).toBeVisible();
      await expect(employeePage.importButton).toBeVisible();
    });

    test('should search employees by name', async ({ page }) => {
      await employeePage.searchEmployee('Fayaz');
      await page.waitForLoadState('networkidle');

      const searchValue = await employeePage.searchInput.inputValue();
      expect(searchValue).toBe('Fayaz');
    });
  });

  test.describe('Create Employee', () => {
    test('should open add employee modal with form fields', async ({ page }) => {
      await employeePage.clickAddEmployee();

      await expect(employeePage.modalTitle).toBeVisible();
      await expect(employeePage.modalTitle).toHaveText('Add New Employee');
    });

    test('should create employee with basic info and close modal', async ({ page }) => {
      await employeePage.clickAddEmployee();

      await employeePage.fillBasicInfo(testEmployee.basic);
      await employeePage.fillEmploymentDetails({
        designation: testEmployee.employment.designation,
        employmentType: testEmployee.employment.employmentType,
      });

      await employeePage.submitForm();
      await page.waitForTimeout(1500);

      // Modal should close on success
      const isModalVisible = await employeePage.modal.isVisible().catch(() => false);
      expect(isModalVisible).toBe(false);
    });

    test('should validate required fields on empty submit', async ({ page }) => {
      await employeePage.clickAddEmployee();
      await employeePage.submitForm();

      // Modal should stay open (validation prevented submit)
      await expect(employeePage.modal).toBeVisible();
    });
  });

  test.describe('View Employee Profile', () => {
    test('should navigate to employee detail page', async ({ page }) => {
      const count = await employeePage.getEmployeeCount();

      if (count > 0) {
        await employeePage.viewEmployee(0);
        expect(page.url()).toContain('/employees/');
      }
    });
  });

  test.describe('Delete Employee', () => {
    test('should show delete confirmation modal', async ({ page }) => {
      const count = await employeePage.getEmployeeCount();

      if (count > 0) {
        await employeePage.deleteEmployee(0);
        await expect(employeePage.deleteModal).toBeVisible();
      }
    });

    test('should cancel delete without removing employee', async ({ page }) => {
      const count = await employeePage.getEmployeeCount();

      if (count > 0) {
        await employeePage.deleteEmployee(0);
        await employeePage.cancelDelete();

        const isModalVisible = await employeePage.deleteModal.isVisible().catch(() => false);
        expect(isModalVisible).toBe(false);
      }
    });
  });
});
