import {expect, Page} from '@playwright/test';
import {allDemoUsers, DEMO_PASSWORD, DemoUser, demoUsers} from './testData';

/**
 * E2E Test Helpers — Playwright fixtures for multi-user approval flow testing.
 *
 * These helpers support the demo-account login flow used by the NU-AURA platform.
 * The login page (NEXT_PUBLIC_DEMO_MODE=true) shows one-click demo account buttons.
 * For tests that need to switch between users (e.g., submit → approve), we use
 * API-based login to avoid slow UI round-trips.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api/v1';

/**
 * Authenticate via the backend API and inject auth state into the browser.
 * This is the fastest way to log in for non-auth-focused tests.
 *
 * @param page - Playwright Page instance
 * @param email - Email of the demo user to log in as
 */
export async function loginAs(page: Page, email: string): Promise<void> {
  const user = allDemoUsers.find((u) => u.email === email);
  const password = user?.password ?? DEMO_PASSWORD;

  // Call the backend login API directly
  const response = await page.request.post(`${API_BASE}/auth/login`, {
    data: {email, password},
    failOnStatusCode: false,
  });

  if (!response.ok()) {
    const body = await response.text().catch(() => 'unknown error');
    throw new Error(`loginAs(${email}) failed: HTTP ${response.status()} — ${body}`);
  }

  // The backend sets httpOnly cookies via Set-Cookie headers.
  // Playwright's page.request automatically handles those.
  // Navigate to dashboard to initialize the frontend Zustand store.
  await page.goto('/me/dashboard');
  await waitForDashboard(page);
}

/**
 * Log in via the demo account button on the login page UI.
 * Use this when testing the actual login flow or when API login is not suitable.
 *
 * @param page - Playwright Page instance
 * @param email - Email of the demo user (must be one of the 8 demo accounts shown on the login page)
 */
export async function loginViaUI(page: Page, email: string): Promise<void> {
  const user = allDemoUsers.find((u) => u.email === email);
  if (!user) {
    throw new Error(`loginViaUI: unknown demo user ${email}`);
  }

  await page.goto('/auth/login');
  await page.waitForLoadState('networkidle');

  // Find and click the demo account button by user name
  const demoButton = page.locator('button').filter({hasText: user.name});

  // The demo accounts panel might be collapsed; expand it if needed
  const demoToggle = page.locator('button').filter({hasText: 'Demo Accounts'});
  if (await demoToggle.isVisible()) {
    // Check if accounts are already visible
    if (!(await demoButton.isVisible({timeout: 2000}).catch(() => false))) {
      await demoToggle.click();
      await page.waitForTimeout(300);
    }
  }

  await expect(demoButton).toBeVisible({timeout: 10000});
  await demoButton.click();

  // Wait for redirect to dashboard
  await page.waitForURL('**/dashboard', {timeout: 45000});
  await page.waitForLoadState('networkidle');
}

/**
 * Wait for the dashboard to be fully loaded.
 *
 * @param page - Playwright Page instance
 * @param timeout - Max time to wait in milliseconds
 */
export async function waitForDashboard(page: Page, timeout = 30000): Promise<void> {
  // Wait for URL to settle on a dashboard path
  try {
    await page.waitForURL('**/dashboard', {timeout});
  } catch {
    const currentUrl = page.url();
    // If redirected to login, auth failed
    if (currentUrl.includes('/auth/login')) {
      throw new Error('waitForDashboard: redirected to login — auth state may be missing');
    }
    // Otherwise we might already be on a non-dashboard page that's fine
  }
  await page.waitForLoadState('networkidle');

  // Verify content is visible (heading or main content area)
  const content = page.locator('h1, h2, main, [data-testid="dashboard-heading"]').first();
  await expect(content).toBeVisible({timeout: 15000});
}

/**
 * Log out the current user by clearing cookies and navigating to login.
 *
 * @param page - Playwright Page instance
 */
export async function logout(page: Page): Promise<void> {
  // Clear all cookies to invalidate httpOnly auth cookies
  await page.context().clearCookies();

  // Clear sessionStorage/localStorage auth state
  await page.evaluate(() => {
    try {
      sessionStorage.removeItem('auth-storage');
      sessionStorage.removeItem('user');
      localStorage.removeItem('tenantId');
      localStorage.removeItem('loginAttempts');
      localStorage.removeItem('lockoutUntil');
    } catch {
      // Ignore errors in case storage is not accessible
    }
  });

  // Navigate to login to confirm logout
  await page.goto('/auth/login');
  await page.waitForLoadState('networkidle');
}

/**
 * Switch from one user to another. Logs out current user and logs in as the new one.
 *
 * @param page - Playwright Page instance
 * @param _fromEmail - Email of the currently logged-in user (for clarity / logging)
 * @param toEmail - Email of the user to switch to
 */
export async function switchUser(
  page: Page,
  _fromEmail: string,
  toEmail: string
): Promise<void> {
  await logout(page);
  await loginAs(page, toEmail);
}

/**
 * Approval flow action types
 */
export type ApprovalAction = 'approve' | 'reject' | 'send-back';

/**
 * Multi-user approval flow helper.
 *
 * 1. Logs in as `submitAs` user
 * 2. Executes the `submitFn` callback (e.g., submit a leave request)
 * 3. Switches to `approveAs` user
 * 4. Executes the `approveFn` callback (e.g., click approve button)
 *
 * This abstracts the user-switching pattern common in approval flow tests.
 *
 * @param page - Playwright Page instance
 * @param submitAs - Email of the user who submits the request
 * @param approveAs - Email of the user who approves/rejects
 * @param submitFn - Async callback that performs the submission action
 * @param approveFn - Async callback that performs the approval action
 */
export async function submitAndApprove(
  page: Page,
  submitAs: string,
  approveAs: string,
  submitFn: (page: Page) => Promise<void>,
  approveFn: (page: Page) => Promise<void>
): Promise<void> {
  // Step 1: Log in as submitter and perform submission
  await loginAs(page, submitAs);
  await submitFn(page);

  // Step 2: Switch to approver and perform approval action
  await switchUser(page, submitAs, approveAs);
  await approveFn(page);
}

/**
 * Get a DemoUser by email address.
 *
 * @param email - The email to look up
 * @returns The DemoUser or undefined if not found
 */
export function getDemoUser(email: string): DemoUser | undefined {
  return allDemoUsers.find((u) => u.email === email);
}

/**
 * Navigate to a path relative to the base URL and wait for network idle.
 *
 * @param page - Playwright Page instance
 * @param path - Relative path (e.g., '/leave', '/me/dashboard')
 */
export async function navigateTo(page: Page, path: string): Promise<void> {
  await page.goto(path);
  await page.waitForLoadState('networkidle');
}

/**
 * Quick-access demo user aliases for common test scenarios.
 */
export const users = {
  ceo: demoUsers.superAdmin,
  engineeringManager: demoUsers.managerEng,
  engineeringLead: demoUsers.teamLeadEng,
  hrManager: demoUsers.hrManager,
  recruitmentAdmin: demoUsers.recruitmentAdmin,
  hrLead: demoUsers.teamLeadHR,
  employee: demoUsers.employeeSaran,
  employeeRaj: demoUsers.employeeRaj,
} as const;

/**
 * Approval chain test personas — grouped by the approval hierarchy they
 * participate in. Use these in approval flow E2E tests.
 *
 * Engineering leave chain:  raj (submit) → mani (TL approve) → sumit (Mgr approve) → fayaz (CEO)
 * Engineering alt chain:    saran (submit) → sumit (Mgr approve) → fayaz (CEO)
 * HR leave chain:           arun/bharath (submit) → suresh (Recruitment Admin) → jagadeesh (HR Mgr) → fayaz (CEO)
 */
export const approvalChain = {
  /** Employee who submits requests — reports to Mani (Team Lead) */
  submitterRaj: demoUsers.employeeRaj,
  /** Employee who submits requests — reports to Sumit (Manager) */
  submitterSaran: demoUsers.employeeSaran,
  /** Team Lead who approves first-level — reports to Sumit */
  teamLead: demoUsers.teamLeadEng,
  /** Engineering Manager who approves second-level — reports to Fayaz */
  engineeringManager: demoUsers.managerEng,
  /** HR Manager who approves HR-related requests */
  hrManager: demoUsers.hrManager,
  /** CEO / SuperAdmin — final approver */
  ceo: demoUsers.superAdmin,
} as const;
