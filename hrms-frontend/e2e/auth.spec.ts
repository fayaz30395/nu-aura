import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { testUsers } from './fixtures/testData';
import { AuthHelper, ApiMockHelper, ValidationHelper } from './utils/helpers';

/**
 * Authentication E2E Tests
 * Tests login, logout, and authentication flows
 */

test.describe('Authentication Flow', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.navigate();
  });

  test.describe('Login', () => {
    test('should display login page correctly', async ({ page }) => {
      // Verify login page elements
      await expect(loginPage.emailInput).toBeVisible();
      await expect(loginPage.passwordInput).toBeVisible();
      await expect(loginPage.loginButton).toBeVisible();

      // Verify page heading
      const heading = await loginPage.getPageHeading();
      expect(heading).toContain('Sign In');
    });

    test('should login successfully with valid credentials - Admin', async ({ page }) => {
      // Login as admin
      await loginPage.login(testUsers.admin.email, testUsers.admin.password);

      // Verify redirect to dashboard
      await page.waitForURL('**/dashboard');
      expect(page.url()).toContain('/dashboard');
    });

    test('should login successfully with valid credentials - Employee', async ({ page }) => {
      // Login as employee
      await loginPage.login(testUsers.employee.email, testUsers.employee.password);

      // Verify redirect to dashboard
      await page.waitForURL('**/dashboard');
      expect(page.url()).toContain('/dashboard');
    });

    test('should show error with invalid credentials', async ({ page }) => {
      // Try to login with invalid credentials
      await loginPage.login('invalid@email.com', 'wrongpassword');

      // Verify error message is displayed
      await expect(loginPage.errorMessage).toBeVisible();

      // Verify still on login page
      expect(page.url()).toContain('/auth/login');
    });

    test('should validate required fields', async ({ page }) => {
      // Try to submit without filling fields
      await loginPage.loginButton.click();

      // Verify validation errors (HTML5 validation)
      const emailValidity = await loginPage.emailInput.evaluate((el: HTMLInputElement) => el.validity.valid);
      expect(emailValidity).toBe(false);
    });

    test('should validate email format', async ({ page }) => {
      // Enter invalid email format
      await loginPage.emailInput.fill('notanemail');
      await loginPage.passwordInput.fill('password123');

      // Check HTML5 validation
      const emailValidity = await loginPage.emailInput.evaluate((el: HTMLInputElement) => el.validity.valid);
      expect(emailValidity).toBe(false);
    });

    test('should toggle password visibility', async ({ page }) => {
      // Fill password
      await loginPage.passwordInput.fill('testpassword');

      // Initially password should be hidden
      let type = await loginPage.passwordInput.getAttribute('type');
      expect(type).toBe('password');

      // Toggle visibility
      await loginPage.togglePasswordVisibility();

      // Password should be visible
      type = await loginPage.passwordInput.getAttribute('type');
      expect(type).toBe('text');

      // Toggle back
      await loginPage.togglePasswordVisibility();
      type = await loginPage.passwordInput.getAttribute('type');
      expect(type).toBe('password');
    });

    test('should remember me checkbox work', async ({ page }) => {
      // Login with remember me
      await loginPage.emailInput.fill(testUsers.employee.email);
      await loginPage.passwordInput.fill(testUsers.employee.password);
      await loginPage.rememberMeCheckbox.check();

      // Verify checkbox is checked
      await expect(loginPage.rememberMeCheckbox).toBeChecked();

      await loginPage.loginButton.click();
      await page.waitForURL('**/dashboard');
    });

    test('should navigate to forgot password page', async ({ page }) => {
      // Click forgot password link
      await loginPage.clickForgotPassword();

      // Verify navigation
      await page.waitForURL('**/auth/forgot-password');
      expect(page.url()).toContain('/auth/forgot-password');
    });
  });

  test.describe('Demo Credentials', () => {
    test('should login with admin demo credentials', async ({ page }) => {
      // Use demo credentials for admin
      await loginPage.loginWithDemoCredentials('Admin');

      // Verify redirect
      await page.waitForURL('**/dashboard');
      expect(page.url()).toContain('/dashboard');
    });

    test('should login with employee demo credentials', async ({ page }) => {
      // Use demo credentials for employee
      await loginPage.loginWithDemoCredentials('Employee');

      // Verify redirect
      await page.waitForURL('**/dashboard');
      expect(page.url()).toContain('/dashboard');
    });
  });

  test.describe('Rate Limiting', () => {
    test('should lockout after multiple failed attempts', async ({ page }) => {
      // Attempt login 5 times with wrong credentials
      for (let i = 0; i < 5; i++) {
        await loginPage.emailInput.fill('test@test.com');
        await loginPage.passwordInput.fill('wrongpassword');
        await loginPage.loginButton.click();
        await page.waitForTimeout(500);
      }

      // Verify lockout message
      const isLockedOut = await loginPage.isLockedOut();
      expect(isLockedOut).toBe(true);

      // Verify login button is disabled
      const isDisabled = await loginPage.isLoginButtonDisabled();
      expect(isDisabled).toBe(true);
    });
  });

  test.describe('Logout', () => {
    test('should logout successfully', async ({ page }) => {
      // First login
      await loginPage.login(testUsers.employee.email, testUsers.employee.password);
      await page.waitForURL('**/dashboard');

      // Logout
      await AuthHelper.logout(page);

      // Verify redirect to login page
      await page.waitForURL('**/auth/login');
      expect(page.url()).toContain('/auth/login');
    });
  });

  test.describe('Protected Routes', () => {
    test('should redirect to login when accessing protected route without auth', async ({ page }) => {
      // Try to access protected route directly
      await page.goto('/employees');

      // Should redirect to login
      await page.waitForURL('**/auth/login**');
      expect(page.url()).toContain('/auth/login');
    });

    test('should redirect back to original URL after login', async ({ page }) => {
      // Try to access employees page without auth
      await page.goto('/employees');

      // Should redirect to login with returnUrl
      await page.waitForURL('**/auth/login**');

      // Login
      await loginPage.login(testUsers.admin.email, testUsers.admin.password);

      // Should redirect back to employees page
      await page.waitForURL('**/employees');
      expect(page.url()).toContain('/employees');
    });
  });

  test.describe('Visual Regression', () => {
    test('should match login page snapshot', async ({ page }) => {
      // Take screenshot for visual comparison
      await expect(page).toHaveScreenshot('login-page.png', {
        maxDiffPixels: 100,
      });
    });
  });
});

test.describe('Authentication with API Mocking', () => {
  test('should handle successful login with mocked API', async ({ page }) => {
    // Mock successful login
    await ApiMockHelper.mockLoginSuccess(page);

    const loginPage = new LoginPage(page);
    await loginPage.navigate();
    await loginPage.login('test@example.com', 'password');

    // Verify navigation
    await page.waitForURL('**/dashboard');
  });

  test('should handle login failure with mocked API', async ({ page }) => {
    // Mock login failure
    await ApiMockHelper.mockLoginFailure(page, 'Invalid credentials');

    const loginPage = new LoginPage(page);
    await loginPage.navigate();
    await loginPage.login('test@example.com', 'wrongpassword');

    // Verify error message
    const isErrorDisplayed = await loginPage.isErrorDisplayed();
    expect(isErrorDisplayed).toBe(true);
  });
});
