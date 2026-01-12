import { Page, Locator } from '@playwright/test';

/**
 * Base Page Object Model
 * Contains common methods and properties shared across all pages
 */
export class BasePage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Navigate to a specific URL
   */
  async goto(path: string) {
    await this.page.goto(path);
  }

  /**
   * Wait for page to be fully loaded
   */
  async waitForPageLoad() {
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Get page title
   */
  async getTitle(): Promise<string> {
    return await this.page.title();
  }

  /**
   * Wait for an element to be visible
   */
  async waitForElement(locator: Locator, timeout: number = 5000) {
    await locator.waitFor({ state: 'visible', timeout });
  }

  /**
   * Take a screenshot
   */
  async takeScreenshot(name: string) {
    await this.page.screenshot({ path: `screenshots/${name}.png`, fullPage: true });
  }

  /**
   * Fill form field
   */
  async fillField(locator: Locator, value: string) {
    await locator.clear();
    await locator.fill(value);
  }

  /**
   * Click element
   */
  async clickElement(locator: Locator) {
    await locator.click();
  }

  /**
   * Select dropdown option by value
   */
  async selectOption(locator: Locator, value: string) {
    await locator.selectOption(value);
  }

  /**
   * Wait for navigation
   */
  async waitForNavigation() {
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Check if element is visible
   */
  async isVisible(locator: Locator): Promise<boolean> {
    return await locator.isVisible();
  }

  /**
   * Get element text
   */
  async getText(locator: Locator): Promise<string> {
    return await locator.textContent() || '';
  }

  /**
   * Wait for specific time
   */
  async wait(ms: number) {
    await this.page.waitForTimeout(ms);
  }

  /**
   * Get current URL
   */
  getCurrentUrl(): string {
    return this.page.url();
  }

  /**
   * Reload page
   */
  async reload() {
    await this.page.reload();
  }

  /**
   * Go back
   */
  async goBack() {
    await this.page.goBack();
  }
}
