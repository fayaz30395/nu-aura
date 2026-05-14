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
   * Navigate to login page.
   *
   * Under NEXT_PUBLIC_DEMO_MODE the email/password form sits behind a
   * "Sign in with Email" toggle (login/page.tsx :930): the page-load state
   * shows demo-account buttons only. Most E2E specs assert email/password
   * input visibility directly on the page-load state, so we eagerly expand
   * the form here. Specs that need the demo-button-first state can read
   * the page before this expansion through `goto()` directly.
   */
  async navigate() {
    await this.goto('/auth/login');
    await this.waitForPageLoad();

    const emailVisible = await this.emailInput.isVisible().catch(() => false);
    if (!emailVisible) {
      const toggle = this.page.locator('button:has-text("Sign in with Email")');
      if (await toggle.isVisible().catch(() => false)) {
        await toggle.click();
        await this.emailInput.waitFor({state: 'visible', timeout: 5000}).catch(() => {});
      }
    }
  }

  /**
   * Login with email and password.
   *
   * The login page is button-first under NEXT_PUBLIC_DEMO_MODE: the
   * email/password form sits behind a "Sign in with Email" toggle button
   * (login/page.tsx :930). If the email input isn't visible yet, click the
   * toggle to expand the form, then fill.
   */
  async login(email: string, password: string, rememberMe: boolean = false) {
    const emailVisible = await this.emailInput.isVisible().catch(() => false);
    if (!emailVisible) {
      const toggle = this.page.locator('button:has-text("Sign in with Email")');
      if (await toggle.isVisible().catch(() => false)) {
        await toggle.click();
        await this.emailInput.waitFor({state: 'visible', timeout: 5000});
      }
    }

    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);

    if (rememberMe) {
      await this.rememberMeCheckbox.check();
    }

    await this.loginButton.click();
    await this.waitForNavigation();
  }

  /**
   * Quick login with demo credentials.
   *
   * The demo panel renders one button per demo account, keyed by the person's
   * display name (login/page.tsx DEMO_ACCOUNTS, panel rendered at :347). A
   * single click on the account button posts the login automatically: there
   * is no separate "Demo Credentials" toggle, and no follow-up submit.
   * Map the legacy role keys to a representative demo account name.
   */
  async loginWithDemoCredentials(role: 'Admin' | 'HR Manager' | 'Manager' | 'Employee') {
    const accountByRole: Record<typeof role, string> = {
      'Admin': 'Fayaz M',
      'HR Manager': 'Jagadeesh N',
      'Manager': 'Sumit Kumar',
      'Employee': 'Saran V',
    };
    const name = accountByRole[role];
    await this.page.locator('button').filter({hasText: name}).click();
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
