import { Page, expect } from '@playwright/test';
import { testUsers } from '../fixtures/testData';

/**
 * Authentication Helper
 * Provides reusable authentication utilities
 */
export class AuthHelper {
  /**
   * Login with credentials
   */
  static async login(page: Page, email: string, password: string) {
    await page.goto('/auth/login');
    await page.locator('input[type="email"]').fill(email);
    await page.locator('input[type="password"]').fill(password);
    await page.locator('button[type="submit"]').click();
    await page.waitForLoadState('networkidle');
  }

  /**
   * Login as admin
   */
  static async loginAsAdmin(page: Page) {
    await this.login(page, testUsers.admin.email, testUsers.admin.password);
  }

  /**
   * Login as HR manager
   */
  static async loginAsHRManager(page: Page) {
    await this.login(page, testUsers.hrManager.email, testUsers.hrManager.password);
  }

  /**
   * Login as manager
   */
  static async loginAsManager(page: Page) {
    await this.login(page, testUsers.manager.email, testUsers.manager.password);
  }

  /**
   * Login as employee
   */
  static async loginAsEmployee(page: Page) {
    await this.login(page, testUsers.employee.email, testUsers.employee.password);
  }

  /**
   * Logout
   */
  static async logout(page: Page) {
    // Click on user menu/profile icon
    const userMenu = page.locator('[aria-label*="user menu"], button:has-text("Logout")').first();
    if (await userMenu.isVisible()) {
      await userMenu.click();
      const logoutButton = page.locator('button:has-text("Logout"), a:has-text("Logout")');
      if (await logoutButton.isVisible()) {
        await logoutButton.click();
        await page.waitForURL('**/auth/login');
      }
    }
  }

  /**
   * Check if user is authenticated
   */
  static async isAuthenticated(page: Page): Promise<boolean> {
    const currentUrl = page.url();
    return !currentUrl.includes('/auth/login');
  }
}

/**
 * API Mock Helper
 * Provides utilities for mocking API responses
 */
export class ApiMockHelper {
  /**
   * Mock successful login response
   */
  static async mockLoginSuccess(page: Page) {
    await page.route('**/api/v1/auth/login', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          token: 'mock-jwt-token',
          user: {
            id: '1',
            email: 'test@company.com',
            firstName: 'Test',
            lastName: 'User',
            roles: [{ code: 'EMPLOYEE', name: 'Employee' }],
          },
        }),
      });
    });
  }

  /**
   * Mock login failure
   */
  static async mockLoginFailure(page: Page, message: string = 'Invalid credentials') {
    await page.route('**/api/v1/auth/login', (route) => {
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          message: message,
        }),
      });
    });
  }

  /**
   * Mock employee list response
   */
  static async mockEmployeeList(page: Page, employees: any[]) {
    await page.route('**/api/v1/employees**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          content: employees,
          totalElements: employees.length,
          totalPages: 1,
        }),
      });
    });
  }

  /**
   * Mock create employee success
   */
  static async mockCreateEmployeeSuccess(page: Page) {
    await page.route('**/api/v1/employees', (route) => {
      if (route.request().method() === 'POST') {
        route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'new-employee-id',
            message: 'Employee created successfully',
          }),
        });
      } else {
        route.continue();
      }
    });
  }

  /**
   * Mock API error
   */
  static async mockApiError(page: Page, endpoint: string, statusCode: number = 500) {
    await page.route(endpoint, (route) => {
      route.fulfill({
        status: statusCode,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'Internal server error',
        }),
      });
    });
  }
}

/**
 * Wait Helper
 * Provides custom wait utilities
 */
export class WaitHelper {
  /**
   * Wait for API call to complete
   */
  static async waitForApiCall(page: Page, endpoint: string, timeout: number = 5000) {
    await page.waitForResponse((response) => response.url().includes(endpoint), {
      timeout,
    });
  }

  /**
   * Wait for navigation to complete
   */
  static async waitForNavigation(page: Page) {
    await page.waitForLoadState('networkidle');
  }

  /**
   * Wait for element to be visible and stable
   */
  static async waitForElementStable(page: Page, selector: string, timeout: number = 5000) {
    const element = page.locator(selector);
    await element.waitFor({ state: 'visible', timeout });
    await page.waitForTimeout(300); // Wait for animations
  }
}

/**
 * Screenshot Helper
 * Provides utilities for taking screenshots
 */
export class ScreenshotHelper {
  /**
   * Take full page screenshot
   */
  static async takeFullPage(page: Page, name: string) {
    await page.screenshot({
      path: `screenshots/${name}-${Date.now()}.png`,
      fullPage: true,
    });
  }

  /**
   * Take element screenshot
   */
  static async takeElement(page: Page, selector: string, name: string) {
    const element = page.locator(selector);
    await element.screenshot({
      path: `screenshots/${name}-${Date.now()}.png`,
    });
  }

  /**
   * Take screenshot on failure
   */
  static async onFailure(page: Page, testInfo: any) {
    if (testInfo.status !== testInfo.expectedStatus) {
      await page.screenshot({
        path: `screenshots/failure-${testInfo.title}-${Date.now()}.png`,
        fullPage: true,
      });
    }
  }
}

/**
 * Form Helper
 * Provides utilities for form interactions
 */
export class FormHelper {
  /**
   * Fill form field by label
   */
  static async fillFieldByLabel(page: Page, label: string, value: string) {
    const field = page.locator(`label:has-text("${label}")`).locator('..').locator('input, textarea, select');
    await field.fill(value);
  }

  /**
   * Select option by label
   */
  static async selectOptionByLabel(page: Page, label: string, value: string) {
    const select = page.locator(`label:has-text("${label}")`).locator('..').locator('select');
    await select.selectOption(value);
  }

  /**
   * Check checkbox by label
   */
  static async checkBoxByLabel(page: Page, label: string) {
    const checkbox = page.locator(`label:has-text("${label}")`).locator('..').locator('input[type="checkbox"]');
    await checkbox.check();
  }

  /**
   * Submit form
   */
  static async submitForm(page: Page, buttonText: string = 'Submit') {
    await page.locator(`button:has-text("${buttonText}")`).click();
  }
}

/**
 * Validation Helper
 * Provides common validation utilities
 */
export class ValidationHelper {
  /**
   * Verify success message
   */
  static async verifySuccessMessage(page: Page, message?: string) {
    const successElement = page.locator('[class*="success"]').first();
    await expect(successElement).toBeVisible();
    if (message) {
      await expect(successElement).toContainText(message);
    }
  }

  /**
   * Verify error message
   */
  static async verifyErrorMessage(page: Page, message?: string) {
    const errorElement = page.locator('[class*="error"]').first();
    await expect(errorElement).toBeVisible();
    if (message) {
      await expect(errorElement).toContainText(message);
    }
  }

  /**
   * Verify URL
   */
  static async verifyUrl(page: Page, expectedPath: string) {
    await expect(page).toHaveURL(new RegExp(expectedPath));
  }

  /**
   * Verify page title
   */
  static async verifyPageTitle(page: Page, title: string) {
    await expect(page.locator('h1, h2').first()).toContainText(title);
  }
}

/**
 * Table Helper
 * Provides utilities for table interactions
 */
export class TableHelper {
  /**
   * Get row count
   */
  static async getRowCount(page: Page): Promise<number> {
    return await page.locator('tbody tr').count();
  }

  /**
   * Get cell value
   */
  static async getCellValue(page: Page, row: number, column: number): Promise<string> {
    const cell = page.locator('tbody tr').nth(row).locator('td').nth(column);
    return (await cell.textContent()) || '';
  }

  /**
   * Click row action button
   */
  static async clickRowAction(page: Page, row: number, action: string) {
    await page.locator('tbody tr').nth(row).locator(`button:has-text("${action}")`).click();
  }

  /**
   * Search in table
   */
  static async searchTable(page: Page, query: string) {
    await page.locator('input[placeholder*="Search"]').fill(query);
    await page.locator('button:has-text("Search")').click();
    await page.waitForLoadState('networkidle');
  }
}
