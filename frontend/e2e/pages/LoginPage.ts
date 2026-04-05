import {Locator, Page} from '@playwright/test';
import {BasePage} from './BasePage';

/**
 * Login Page Object Model
 * Handles all interactions with the login page
 */
export class LoginPage extends BasePage {
  // Locators
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly rememberMeCheckbox: Locator;
  readonly loginButton: Locator;
  readonly googleLoginButton: Locator;
  readonly forgotPasswordLink: Locator;
  readonly errorMessage: Locator;
  readonly showPasswordButton: Locator;
  readonly demoCredentialsToggle: Locator;
  readonly lockoutMessage: Locator;

  constructor(page: Page) {
    super(page);

    // Initialize locators
    this.emailInput = page.locator('input[type="email"]');
    this.passwordInput = page.locator('input[type="password"]');
    this.rememberMeCheckbox = page.locator('input[type="checkbox"]');
    this.loginButton = page.locator('button[type="submit"]');
    this.googleLoginButton = page.locator('button:has-text("Sign in with Google")');
    this.forgotPasswordLink = page.locator('a:has-text("Forgot password?")');
    this.errorMessage = page.locator('text=Authentication Failed').locator('..');
    this.showPasswordButton = page.locator('button').filter({has: page.locator('svg')}).nth(1);
    this.demoCredentialsToggle = page.locator('button:has-text("Demo Credentials")');
    this.lockoutMessage = page.locator('text=Account Temporarily Locked');
  }

  /**
   * Navigate to login page
   */
  async navigate() {
    await this.goto('/auth/login');
    await this.waitForPageLoad();
  }

  /**
   * Login with email and password
   */
  async login(email: string, password: string, rememberMe: boolean = false) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);

    if (rememberMe) {
      await this.rememberMeCheckbox.check();
    }

    await this.loginButton.click();
    await this.waitForNavigation();
  }

  /**
   * Quick login with demo credentials
   */
  async loginWithDemoCredentials(role: 'Admin' | 'HR Manager' | 'Manager' | 'Employee') {
    await this.demoCredentialsToggle.click();
    await this.page.locator(`button:has-text("${role}")`).click();
    await this.loginButton.click();
    await this.waitForNavigation();
  }

  /**
   * Toggle password visibility
   */
  async togglePasswordVisibility() {
    await this.showPasswordButton.click();
  }

  /**
   * Click forgot password link
   */
  async clickForgotPassword() {
    await this.forgotPasswordLink.click();
    await this.waitForNavigation();
  }

  /**
   * Click Google login button
   */
  async clickGoogleLogin() {
    await this.googleLoginButton.click();
  }

  /**
   * Get error message text
   */
  async getErrorMessage(): Promise<string> {
    return await this.errorMessage.textContent() || '';
  }

  /**
   * Check if error is displayed
   */
  async isErrorDisplayed(): Promise<boolean> {
    return await this.errorMessage.isVisible();
  }

  /**
   * Check if lockout message is displayed
   */
  async isLockedOut(): Promise<boolean> {
    return await this.lockoutMessage.isVisible();
  }

  /**
   * Check if login button is disabled
   */
  async isLoginButtonDisabled(): Promise<boolean> {
    return await this.loginButton.isDisabled();
  }

  /**
   * Verify login page loaded
   */
  async verifyLoginPageLoaded(): Promise<boolean> {
    return await this.emailInput.isVisible() && await this.passwordInput.isVisible();
  }

  /**
   * Get page heading
   */
  async getPageHeading(): Promise<string> {
    return await this.page.locator('h1, h2').first().textContent() || '';
  }
}
