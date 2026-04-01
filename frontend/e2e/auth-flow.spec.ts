import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { testUsers, demoUsers } from './fixtures/testData';
import { AuthHelper } from './utils/helpers';

/**
 * Authentication Flow E2E Tests
 *
 * Covers: login, logout, session redirect, and invalid credentials.
 * Auth setup provides stored state; tests that need a fresh session
 * clear cookies first.
 */

test.describe('Auth Flow — Login', () => {
  test('should display login page with sign-in form', async ({ page }) => {
    // Clear auth state so we land on login
    await page.context().clearCookies();
    await page.goto('/auth/login');
    await page.waitForLoadState('networkidle');

    // Verify core login elements
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible();
    const headingText = await heading.textContent();
    expect(headingText?.toLowerCase()).toMatch(/sign in|login|welcome/);
  });

  test('should login successfully with valid admin credentials', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.navigate();
    await loginPage.login(testUsers.admin.email, testUsers.admin.password);

    // Should redirect to dashboard
    await page.waitForURL('**/dashboard', { timeout: 30000 });
    expect(page.url()).toContain('/dashboard');
  });

  test('should login successfully with employee credentials', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.navigate();
    await loginPage.login(testUsers.employee.email, testUsers.employee.password);

    await page.waitForURL('**/dashboard', { timeout: 30000 });
    expect(page.url()).toContain('/dashboard');
  });

  test('should show error with invalid credentials', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.navigate();
    await loginPage.login('invalid@example.com', 'WrongPassword!1');

    // Should remain on login page
    expect(page.url()).toContain('/auth/login');

    // Error message should be visible
    const hasError = await loginPage.errorMessage.isVisible().catch(() => false);
    const hasErrorText = await page.locator('text=/invalid|error|failed|incorrect/i').first().isVisible().catch(() => false);
    expect(hasError || hasErrorText).toBe(true);
  });
});

test.describe('Auth Flow — Logout', () => {
  test('should logout and redirect to login page', async ({ page }) => {
    // First login
    const loginPage = new LoginPage(page);
    await loginPage.navigate();
    await loginPage.login(testUsers.employee.email, testUsers.employee.password);
    await page.waitForURL('**/dashboard', { timeout: 30000 });

    // Logout
    await AuthHelper.logout(page);

    // Should be on login page
    await page.waitForURL('**/auth/login', { timeout: 15000 });
    expect(page.url()).toContain('/auth/login');
  });
});

test.describe('Auth Flow — Session Redirect', () => {
  test('should redirect unauthenticated user to login when accessing protected route', async ({ page }) => {
    // Clear all auth state
    await page.context().clearCookies();
    await page.evaluate(() => {
      try {
        sessionStorage.clear();
        localStorage.clear();
      } catch { /* ignore */ }
    });

    // Try to access a protected route
    await page.goto('/employees');
    await page.waitForLoadState('networkidle');

    // Should redirect to login
    await page.waitForURL('**/auth/login**', { timeout: 15000 });
    expect(page.url()).toContain('/auth/login');
  });

  test('should redirect back to original URL after login', async ({ page }) => {
    // Clear auth state
    await page.context().clearCookies();
    await page.evaluate(() => {
      try {
        sessionStorage.clear();
        localStorage.clear();
      } catch { /* ignore */ }
    });

    // Try to access employees page
    await page.goto('/employees');
    await page.waitForURL('**/auth/login**', { timeout: 15000 });

    // Login
    const loginPage = new LoginPage(page);
    await loginPage.login(testUsers.admin.email, testUsers.admin.password);

    // Should redirect back to employees page
    await page.waitForURL('**/employees', { timeout: 30000 });
    expect(page.url()).toContain('/employees');
  });
});

test.describe('Auth Flow — Demo Accounts', () => {
  test('should login via demo account button', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.navigate();
    await loginPage.loginWithDemoCredentials('Admin');

    await page.waitForURL('**/dashboard', { timeout: 30000 });
    expect(page.url()).toContain('/dashboard');
  });
});
