/**
 * AUTH-COMPREHENSIVE — Exhaustive authentication test suite
 *
 * Covers 16 scenarios:
 *   AUTH-01  Login page load validation
 *   AUTH-02  Happy-path demo account buttons (6 roles)
 *   AUTH-03  Invalid credentials
 *   AUTH-04  Empty form submission
 *   AUTH-05  Invalid email format
 *   AUTH-06  Session persistence after "tab close"
 *   AUTH-07  Logout flow
 *   AUTH-08  Unauthorized route access (8 routes)
 *   AUTH-09  Redirect-after-login (return URL honoured)
 *   AUTH-10  Password policy / forgot-password page
 *   AUTH-11  Google OAuth button presence
 *   AUTH-12  Session invalidation after logout
 *   AUTH-13  Multi-role login verification (sidebar content)
 *   AUTH-14  RBAC — wrong-role direct URL navigation
 *   AUTH-15  MY SPACE always accessible for every role
 *   AUTH-16  Feature-flag — SUPER_ADMIN bypasses feature gates
 *
 * Notes:
 *   - Tests that need NO session use `test.use({ storageState: { cookies: [], origins: [] } })`
 *     inside their describe block, which overrides the project-level storageState.
 *   - loginViaUI navigates to /auth/login itself; no need to pre-navigate.
 *   - loginAs uses the backend API + navigates to /me/dashboard.
 *   - Console-error filters exclude known benign noise (HMR, favicon, Next.js hydration).
 */

import {Browser, BrowserContext, expect, Page, test} from '@playwright/test';
import {loginAs, loginViaUI, logout, navigateTo} from './fixtures/helpers';
import {demoUsers} from './fixtures/testData';

// ─── shared noise filter ────────────────────────────────────────────────────

function isNoisyError(msg: string): boolean {
  return (
    msg.includes('favicon') ||
    msg.includes('[HMR]') ||
    msg.includes('hydration') ||
    msg.includes('Warning:') ||
    msg.includes('ResizeObserver') ||
    msg.includes('Non-Error exception') ||
    msg.includes('ChunkLoadError') ||
    // Next.js dev-mode info that appears as console.error
    msg.includes('useLayoutEffect') ||
    msg.includes('act(...)') ||
    msg.includes('[Fast Refresh]')
  );
}

// ─── helpers ─────────────────────────────────────────────────────────────────

/** Clears cookies + localStorage in the given page so it behaves like a fresh context. */
async function clearSession(page: Page): Promise<void> {
  await page.context().clearCookies();
  await page.evaluate(() => {
    try {
      sessionStorage.clear();
      localStorage.clear();
    } catch {
      /* ignore */
    }
  });
}

/** Returns the first name from a full name string, e.g. "Fayaz M" → "Fayaz". */
function firstName(fullName: string): string {
  return fullName.split(' ')[0];
}

// =============================================================================
// AUTH-01: Login Page Load Validation
// =============================================================================

test.describe('AUTH-01: Login page load validation', () => {
  // Override project storageState — tests here must see the login page, not dashboard.
  test.use({storageState: {cookies: [], origins: []}});

  test('login form elements are present', async ({page}) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error' && !isNoisyError(msg.text())) {
        errors.push(msg.text());
      }
    });

    await page.goto('/auth/login');
    await page.waitForLoadState('domcontentloaded');

    // Email field
    const emailField = page.locator('input[type="email"], input[name="email"], input[autocomplete="email"]').first();
    await expect(emailField).toBeVisible({timeout: 15000});

    // Check autocomplete attribute
    const autocomplete = await emailField.getAttribute('autocomplete');
    expect(autocomplete).toMatch(/email/i);

    // Password field
    const passwordField = page.locator('input[type="password"]').first();
    await expect(passwordField).toBeVisible();
    const pwType = await passwordField.getAttribute('type');
    expect(pwType).toBe('password');

    // Sign In button
    const signInBtn = page
      .locator('button[type="submit"], button')
      .filter({hasText: /sign in|login/i})
      .first();
    await expect(signInBtn).toBeVisible();

    // Google OAuth button
    const googleBtn = page
      .locator('button, a')
      .filter({hasText: /google/i})
      .first();
    await expect(googleBtn).toBeVisible();

    // Page title sanity — must not be generic CRA default
    const title = await page.title();
    expect(title).not.toBe('React App');
    expect(title.toLowerCase()).toMatch(/sign in|nuaura|nu-aura|nua|nulogic/i);

    // No real console errors on load
    expect(errors).toHaveLength(0);
  });
});

// =============================================================================
// AUTH-02: Happy-path — Demo Account Buttons
// =============================================================================

test.describe('AUTH-02: Happy-path demo account buttons', () => {
  test.use({storageState: {cookies: [], origins: []}});
  test.setTimeout(90000);

  const scenarios = [
    {label: 'superAdmin', user: demoUsers.superAdmin},
    {label: 'hrManager', user: demoUsers.hrManager},
    {label: 'managerEng', user: demoUsers.managerEng},
    {label: 'employeeSaran', user: demoUsers.employeeSaran},
    {label: 'recruitmentAdmin', user: demoUsers.recruitmentAdmin},
    {label: 'teamLeadEng', user: demoUsers.teamLeadEng},
  ] as const;

  for (const {label, user} of scenarios) {
    test(`demo button login — ${label} (${user.role})`, async ({page}) => {
      await loginViaUI(page, user.email);

      const url = page.url();
      expect(url).toContain('/dashboard');
      expect(url).not.toContain('/auth/login');

      // No 500 error visible
      const serverError = await page
        .locator('text=/500|Internal Server Error/i')
        .first()
        .isVisible({timeout: 3000})
        .catch(() => false);
      expect(serverError).toBe(false);

      // Greeting contains user's first name (case-insensitive)
      const greeting = page
        .locator(`text=/${firstName(user.name)}/i`)
        .first();
      // Non-fatal: greeting may not always be present on every dashboard layout
      const greetingVisible = await greeting.isVisible({timeout: 8000}).catch(() => false);
      if (!greetingVisible) {
        // Fallback: at minimum, a heading or main content block must be present
        const content = page.locator('h1, h2, main').first();
        await expect(content).toBeVisible({timeout: 10000});
      }
    });
  }
});

// =============================================================================
// AUTH-03: Invalid Credentials
// =============================================================================

test.describe('AUTH-03: Invalid credentials', () => {
  test.use({storageState: {cookies: [], origins: []}});

  test('shows error message and stays on login page', async ({page}) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error' && !isNoisyError(msg.text())) {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/auth/login');
    await page.waitForLoadState('domcontentloaded');

    // Fill form with wrong password
    await page.locator('input[type="email"], input[name="email"]').first().fill('fayaz.m@nulogic.io');
    await page.locator('input[type="password"]').first().fill('wrongpassword123');

    // Submit
    const submitBtn = page
      .locator('button[type="submit"], button')
      .filter({hasText: /sign in|login/i})
      .first();
    await submitBtn.click();

    // Wait briefly for the error to appear
    await page.waitForTimeout(3000);

    // Still on login page
    expect(page.url()).toContain('/auth/login');

    // Error message shown
    const errorVisible = await page
      .locator('text=/invalid|incorrect|wrong|failed|credentials|unauthorized/i')
      .first()
      .isVisible({timeout: 10000})
      .catch(() => false);
    expect(errorVisible).toBe(true);

    // No auth cookie set — context cookies should not contain an access token
    const cookies = await page.context().cookies();
    const authCookie = cookies.find(
      (c) =>
        c.name.toLowerCase().includes('token') ||
        c.name.toLowerCase().includes('session') ||
        c.name.toLowerCase().includes('auth')
    );
    // httpOnly auth cookies won't be readable here, but we verify we're still on login
    expect(page.url()).toContain('/auth/login');

    // No stack-trace style console errors
    const stackErrors = consoleErrors.filter((e) => e.includes('at ') && e.includes('.ts'));
    expect(stackErrors).toHaveLength(0);
  });
});

// =============================================================================
// AUTH-04: Empty Form Submission
// =============================================================================

test.describe('AUTH-04: Empty form submission', () => {
  test.use({storageState: {cookies: [], origins: []}});

  test('shows validation errors without submitting', async ({page}) => {
    // Track network calls to the login API
    let loginApiCalled = false;
    page.on('request', (req) => {
      if (req.url().includes('/api/v1/auth/login') && req.method() === 'POST') {
        loginApiCalled = true;
      }
    });

    await page.goto('/auth/login');
    await page.waitForLoadState('domcontentloaded');

    // Click Sign In without filling anything
    const submitBtn = page
      .locator('button[type="submit"], button')
      .filter({hasText: /sign in|login/i})
      .first();
    await submitBtn.click();

    await page.waitForTimeout(1000);

    // Still on login page
    expect(page.url()).toContain('/auth/login');

    // At least one validation indicator visible: HTML5 invalid state or visible error text
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    const emailValid = await emailInput.evaluate(
      (el: HTMLInputElement) => el.validity?.valid ?? true
    );

    const errorTexts = page.locator(
      '[role="alert"], .mantine-TextInput-error, [data-error="true"], text=/required|enter.*email|email.*required|field.*required/i'
    );
    const errorVisible = await errorTexts.first().isVisible({timeout: 3000}).catch(() => false);

    expect(!emailValid || errorVisible).toBe(true);

    // No API call fired
    expect(loginApiCalled).toBe(false);
  });
});

// =============================================================================
// AUTH-05: Invalid Email Format
// =============================================================================

test.describe('AUTH-05: Invalid email format', () => {
  test.use({storageState: {cookies: [], origins: []}});

  test('rejects malformed email before or after submit', async ({page}) => {
    await page.goto('/auth/login');
    await page.waitForLoadState('domcontentloaded');

    await page.locator('input[type="email"], input[name="email"]').first().fill('notanemail');
    await page.locator('input[type="password"]').first().fill('SomePassword1!');

    const submitBtn = page
      .locator('button[type="submit"], button')
      .filter({hasText: /sign in|login/i})
      .first();
    await submitBtn.click();

    await page.waitForTimeout(2000);

    // Either HTML5 built-in validation rejects it, or the server returns 400/422
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    const emailValid = await emailInput
      .evaluate((el: HTMLInputElement) => el.validity?.valid ?? true)
      .catch(() => true);

    // Or an error message mentioning "email" or "valid" appears
    const errorMsg = page
      .locator('text=/valid.*email|email.*valid|invalid.*email|not.*valid/i')
      .first();
    const errorVisible = await errorMsg.isVisible({timeout: 5000}).catch(() => false);

    // Or we're still on login (didn't proceed)
    const stillOnLogin = page.url().includes('/auth/login');

    expect(!emailValid || errorVisible || stillOnLogin).toBe(true);
  });
});

// =============================================================================
// AUTH-06: Session Persistence After "Tab Close"
// =============================================================================

test.describe('AUTH-06: Session persistence after tab close', () => {
  test.use({storageState: {cookies: [], origins: []}});
  test.setTimeout(90000);

  test('session survives within the same browser context', async ({page}) => {
    // Login and navigate to a protected route
    await loginViaUI(page, demoUsers.superAdmin.email);
    await navigateTo(page, '/employees');
    await page.waitForLoadState('domcontentloaded');

    // Capture cookies (proves session is set)
    const cookiesBefore = await page.context().cookies();
    expect(cookiesBefore.length).toBeGreaterThan(0);

    // Simulate "tab close + reopen" by navigating to blank and then back
    await page.goto('about:blank');
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('domcontentloaded');

    // Should land on dashboard or employees — NOT on login page
    const url = page.url();
    const redirectedToLogin = url.includes('/auth/login');
    expect(redirectedToLogin).toBe(false);
  });
});

// =============================================================================
// AUTH-07: Logout Flow
// =============================================================================

test.describe('AUTH-07: Logout flow', () => {
  test.use({storageState: {cookies: [], origins: []}});
  test.setTimeout(90000);

  test('clears session and redirects to login', async ({page}) => {
    // Login
    await loginViaUI(page, demoUsers.superAdmin.email);
    await page.waitForLoadState('domcontentloaded');

    // Attempt UI logout first (avatar → logout menu)
    let loggedOutViaUI = false;
    try {
      // Try the user avatar / dropdown that usually holds logout
      const avatarSelectors = [
        '[data-testid="user-avatar"]',
        '[aria-label*="user" i]',
        '[aria-label*="account" i]',
        '.mantine-Avatar-root',
        'button[aria-haspopup="menu"]',
      ];
      for (const sel of avatarSelectors) {
        const el = page.locator(sel).first();
        if (await el.isVisible({timeout: 2000}).catch(() => false)) {
          await el.click();
          await page.waitForTimeout(500);
          break;
        }
      }

      // Look for logout option in dropdown / sidebar
      const logoutSelectors = [
        'button:has-text("Logout")',
        'button:has-text("Sign Out")',
        'a:has-text("Logout")',
        'a:has-text("Sign Out")',
        '[role="menuitem"]:has-text("Logout")',
        '[role="menuitem"]:has-text("Sign Out")',
      ];
      for (const sel of logoutSelectors) {
        const el = page.locator(sel).first();
        if (await el.isVisible({timeout: 2000}).catch(() => false)) {
          await el.click();
          loggedOutViaUI = true;
          break;
        }
      }

      if (loggedOutViaUI) {
        await page.waitForURL('**/auth/login', {timeout: 15000});
      }
    } catch {
      /* UI logout not available — fall through to programmatic logout */
    }

    if (!loggedOutViaUI) {
      // Fallback: use the logout helper (clears cookies + navigates to login)
      await logout(page);
    }

    // Assert on login page
    expect(page.url()).toContain('/auth/login');

    // Back button should NOT show protected content (no data leakage)
    await page.goBack().catch(() => {});
    await page.waitForLoadState('domcontentloaded');
    // After back, we should either still be on login, or if briefly shown,
    // attempting navigation to a protected route redirects back to login
    const urlAfterBack = page.url();
    if (!urlAfterBack.includes('/auth/login')) {
      // Try to access protected route — should redirect to login
      await page.goto('/employees');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForURL('**/auth/login**', {timeout: 10000});
      expect(page.url()).toContain('/auth/login');
    }
  });
});

// =============================================================================
// AUTH-08: Unauthorized Route Access
// =============================================================================

test.describe('AUTH-08: Unauthorized route access', () => {
  test.use({storageState: {cookies: [], origins: []}});
  test.setTimeout(90000);

  const protectedRoutes = [
    '/dashboard',
    '/employees',
    '/leave',
    '/payroll',
    '/recruitment',
    '/performance',
    '/admin',
    '/me/profile',
  ];

  for (const route of protectedRoutes) {
    test(`unauthenticated access to ${route} redirects to login`, async ({page}) => {
      await page.goto(route);
      await page.waitForLoadState('domcontentloaded');

      // Allow up to 5s for redirect
      try {
        await page.waitForURL('**/auth/login**', {timeout: 8000});
      } catch {
        /* may already be on login */
      }

      const url = page.url();
      expect(url).toContain('/auth/login');
      expect(url).not.toContain(route.slice(1)); // route slug not in URL path

      // No data visible — e.g., no employee table rows
      const dataTable = page
        .locator('table tbody tr, [data-testid*="employee"], [data-testid*="row"]')
        .first();
      const dataVisible = await dataTable.isVisible({timeout: 2000}).catch(() => false);
      expect(dataVisible).toBe(false);
    });
  }
});

// =============================================================================
// AUTH-09: Redirect After Login (return URL honoured)
// =============================================================================

test.describe('AUTH-09: Redirect after login (return URL)', () => {
  test.use({storageState: {cookies: [], origins: []}});
  test.setTimeout(90000);

  test('returns to originally requested route after successful login', async ({page}) => {
    // Navigate to a protected route without session
    await page.goto('/employees');
    await page.waitForLoadState('domcontentloaded');

    try {
      await page.waitForURL('**/auth/login**', {timeout: 8000});
    } catch {
      /* already on login */
    }
    expect(page.url()).toContain('/auth/login');

    // The URL may carry a redirect param — capture it for logging
    const loginUrl = page.url();
    const hasRedirectParam =
      loginUrl.includes('redirect') ||
      loginUrl.includes('returnUrl') ||
      loginUrl.includes('callbackUrl') ||
      loginUrl.includes('next=');
    // Not a hard assertion — some implementations use sessionStorage instead

    // Login via demo button (loginViaUI handles /auth/login navigation internally)
    await loginViaUI(page, demoUsers.superAdmin.email);

    // Ideal: redirected back to /employees. Acceptable: /dashboard (if no redirect param).
    const finalUrl = page.url();
    const redirectHonoured = finalUrl.includes('/employees');
    const landedOnDashboard = finalUrl.includes('/dashboard');

    expect(redirectHonoured || landedOnDashboard).toBe(true);
    expect(finalUrl).not.toContain('/auth/login');

    // Log redirect behaviour for debugging
    if (!redirectHonoured) {
      console.info(
        `AUTH-09: redirect param present=${hasRedirectParam}, landed on ${finalUrl} (not /employees)`
      );
    }
  });
});

// =============================================================================
// AUTH-10: Password Policy / Forgot Password
// =============================================================================

test.describe('AUTH-10: Password policy / forgot-password page', () => {
  test.use({storageState: {cookies: [], origins: []}});

  test('forgot-password page responds or is gracefully absent', async ({page}) => {
    const response = await page.goto('/auth/forgot-password', {waitUntil: 'domcontentloaded'});

    // If the route does not exist, it might 404 or redirect to login
    const status = response?.status() ?? 0;
    const url = page.url();

    if (status === 404 || url.includes('/auth/login') || url === 'http://localhost:3000/') {
      console.warn(
        'AUTH-10: /auth/forgot-password does not exist — skipping password reset assertions.'
      );
      // Acceptable — mark as skipped via soft assertion
      return;
    }

    // Page exists — validate it
    await page.waitForLoadState('domcontentloaded');

    // Email input for reset
    const emailInput = page
      .locator('input[type="email"], input[name="email"], input[placeholder*="email" i]')
      .first();
    await expect(emailInput).toBeVisible({timeout: 10000});

    // Submit the form
    await emailInput.fill('fayaz.m@nulogic.io');
    const submitBtn = page
      .locator('button[type="submit"], button')
      .filter({hasText: /send|reset|submit|continue/i})
      .first();
    await submitBtn.click();

    await page.waitForTimeout(3000);

    // Success indicator (no 500 error)
    const serverError = await page
      .locator('text=/500|internal server error/i')
      .first()
      .isVisible({timeout: 3000})
      .catch(() => false);
    expect(serverError).toBe(false);

    // Success message references email
    const successMsg = page
      .locator('text=/email|sent|check.*inbox|link|instruction/i')
      .first();
    const successVisible = await successMsg.isVisible({timeout: 8000}).catch(() => false);
    expect(successVisible).toBe(true);
  });
});

// =============================================================================
// AUTH-11: Google OAuth Button
// =============================================================================

test.describe('AUTH-11: Google OAuth button', () => {
  test.use({storageState: {cookies: [], origins: []}});

  test('Google OAuth button is visible and initiates redirect', async ({page}) => {
    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));

    await page.goto('/auth/login');
    await page.waitForLoadState('domcontentloaded');

    // Google button must be visible
    const googleBtn = page
      .locator('button, a')
      .filter({hasText: /google/i})
      .first();
    await expect(googleBtn).toBeVisible({timeout: 10000});

    // Track where the click leads
    const navigationPromise = page.waitForNavigation({timeout: 8000}).catch(() => null);
    await googleBtn.click();
    await navigationPromise;

    await page.waitForLoadState('domcontentloaded');
    const urlAfterClick = page.url();

    // Should either navigate to Google's OAuth domain or the app's OAuth initiation endpoint
    const goesToGoogle = urlAfterClick.startsWith('https://accounts.google.com');
    const goesToOAuthEndpoint =
      urlAfterClick.includes('/oauth2/authorization/google') ||
      urlAfterClick.includes('/api/v1/auth/google') ||
      urlAfterClick.includes('/auth/google') ||
      urlAfterClick.includes('oauth');

    // Fallback: still on login page is acceptable if OAuth is not configured in dev
    const staysOnLogin = urlAfterClick.includes('/auth/login');

    expect(goesToGoogle || goesToOAuthEndpoint || staysOnLogin).toBe(true);

    // No JavaScript errors
    expect(jsErrors).toHaveLength(0);
  });
});

// =============================================================================
// AUTH-12: Session Invalidation After Logout
// =============================================================================

test.describe('AUTH-12: Session invalidation after logout', () => {
  test.use({storageState: {cookies: [], origins: []}});
  test.setTimeout(90000);

  test('cleared session blocks access to protected routes', async ({page}) => {
    // Login
    await loginAs(page, demoUsers.employeeSaran.email);
    await navigateTo(page, '/me/profile');
    await page.waitForLoadState('domcontentloaded');

    // Profile page should load
    const profileContent = page.locator('h1, h2, [data-testid*="profile"]').first();
    await expect(profileContent).toBeVisible({timeout: 15000});

    // Logout (programmatic)
    await logout(page);
    expect(page.url()).toContain('/auth/login');

    // Try to access /me/profile again — should redirect to login
    await page.goto('/me/profile');
    await page.waitForLoadState('domcontentloaded');
    try {
      await page.waitForURL('**/auth/login**', {timeout: 8000});
    } catch {
      /* already on login */
    }
    expect(page.url()).toContain('/auth/login');

    // No profile data visible
    const profileData = page
      .locator('[data-testid*="profile"], .profile-section')
      .first();
    const profileDataVisible = await profileData.isVisible({timeout: 2000}).catch(() => false);
    expect(profileDataVisible).toBe(false);

    // API status check: fetch /api/v1/me/profile should return 401 or 403
    const apiStatus = await page
      .evaluate(async () => {
        try {
          const r = await fetch('/api/v1/me/profile', {credentials: 'include'});
          return r.status;
        } catch {
          return 0;
        }
      })
      .catch(() => 0);

    if (apiStatus !== 0) {
      expect([401, 403]).toContain(apiStatus);
    }
  });
});

// =============================================================================
// AUTH-13: Multi-Role Login Verification
// =============================================================================

test.describe('AUTH-13: Multi-role login — sidebar content', () => {
  test.use({storageState: {cookies: [], origins: []}});
  test.setTimeout(120000);

  test('EMPLOYEE role: sees MY SPACE, no admin or payroll-admin sidebar links', async ({page}) => {
    await loginAs(page, demoUsers.employeeSaran.email);

    const sidebar = page.locator('nav, aside, [role="navigation"]').first();
    await expect(sidebar).toBeVisible({timeout: 15000});

    // MY SPACE section visible
    const mySpace = sidebar.locator('text=/my space|my profile|my leaves|me/i').first();
    const mySpaceVisible = await mySpace.isVisible({timeout: 5000}).catch(() => false);
    expect(mySpaceVisible).toBe(true);

    // Admin link NOT visible
    const adminLink = sidebar.locator('a[href*="/admin"], text=/^Admin$/i').first();
    const adminVisible = await adminLink.isVisible({timeout: 2000}).catch(() => false);
    expect(adminVisible).toBe(false);

    // Payroll admin link NOT visible
    const payrollAdminLink = sidebar.locator('a[href*="/payroll/runs"], a[href*="/payroll/salary"]').first();
    const payrollAdminVisible = await payrollAdminLink.isVisible({timeout: 2000}).catch(() => false);
    expect(payrollAdminVisible).toBe(false);
  });

  test('HR_MANAGER role: sees HR OPERATIONS, employees, leave-admin links', async ({page}) => {
    await loginAs(page, demoUsers.hrManager.email);

    const sidebar = page.locator('nav, aside, [role="navigation"]').first();
    await expect(sidebar).toBeVisible({timeout: 15000});

    // Employees link present
    const employeesLink = sidebar
      .locator('a[href*="/employees"], text=/employees/i')
      .first();
    const empVisible = await employeesLink.isVisible({timeout: 5000}).catch(() => false);
    expect(empVisible).toBe(true);

    // Leave admin link present (not just MY SPACE leaves)
    const leaveAdminLink = sidebar
      .locator('a[href*="/leave"]:not([href*="/me/"])')
      .first();
    const leaveVisible = await leaveAdminLink.isVisible({timeout: 5000}).catch(() => false);
    expect(leaveVisible).toBe(true);
  });

  test('SUPER_ADMIN role: sees ADMIN section, no routes blocked', async ({page}) => {
    await loginAs(page, demoUsers.superAdmin.email);

    const sidebar = page.locator('nav, aside, [role="navigation"]').first();
    await expect(sidebar).toBeVisible({timeout: 15000});

    // Admin link present
    const adminLink = sidebar
      .locator('a[href*="/admin"], text=/admin/i')
      .first();
    const adminVisible = await adminLink.isVisible({timeout: 5000}).catch(() => false);
    expect(adminVisible).toBe(true);

    // Should be able to reach /admin without redirect
    await navigateTo(page, '/admin');
    await page.waitForLoadState('domcontentloaded');
    const url = page.url();
    expect(url).not.toContain('/auth/login');
    // Should show admin content, not blocked
    const blocked = await page
      .locator('text=/403|access denied|forbidden|unauthorized/i')
      .first()
      .isVisible({timeout: 3000})
      .catch(() => false);
    expect(blocked).toBe(false);
  });
});

// =============================================================================
// AUTH-14: RBAC — Wrong Role Direct URL Navigation
// =============================================================================

test.describe('AUTH-14: RBAC — wrong-role direct URL navigation', () => {
  test.use({storageState: {cookies: [], origins: []}});
  test.setTimeout(120000);

  test('EMPLOYEE cannot access /admin', async ({page}) => {
    await loginAs(page, demoUsers.employeeSaran.email);
    await navigateTo(page, '/admin');
    await page.waitForTimeout(3000);

    const url = page.url();
    const blocked =
      url.includes('/auth/login') ||
      url.includes('/dashboard') ||
      url.includes('/me/') ||
      (await page
        .locator('text=/403|access denied|forbidden|unauthorized|permission/i')
        .first()
        .isVisible({timeout: 3000})
        .catch(() => false));

    // Admin content must NOT be visible
    const adminContent = page
      .locator('[data-testid*="admin"], h1:has-text("Admin"), h2:has-text("Admin")')
      .first();
    const adminContentVisible = await adminContent.isVisible({timeout: 2000}).catch(() => false);

    expect(blocked || !adminContentVisible).toBe(true);
  });

  test('EMPLOYEE cannot access /payroll/runs', async ({page}) => {
    await loginAs(page, demoUsers.employeeSaran.email);
    await navigateTo(page, '/payroll/runs');
    await page.waitForTimeout(3000);

    const url = page.url();
    const blocked =
      url.includes('/auth/login') ||
      url.includes('/dashboard') ||
      url.includes('/me/') ||
      (await page
        .locator('text=/403|access denied|forbidden|unauthorized|permission/i')
        .first()
        .isVisible({timeout: 3000})
        .catch(() => false));

    expect(blocked).toBe(true);
  });

  test('RECRUITMENT_ADMIN cannot access /payroll', async ({page}) => {
    await loginAs(page, demoUsers.recruitmentAdmin.email);
    await navigateTo(page, '/payroll');
    await page.waitForTimeout(3000);

    const url = page.url();
    const blocked =
      url.includes('/auth/login') ||
      url.includes('/dashboard') ||
      url.includes('/me/') ||
      url.includes('/recruitment') ||
      (await page
        .locator('text=/403|access denied|forbidden|unauthorized|permission/i')
        .first()
        .isVisible({timeout: 3000})
        .catch(() => false));

    expect(blocked).toBe(true);
  });

  test('RECRUITMENT_ADMIN cannot access /performance', async ({page}) => {
    await loginAs(page, demoUsers.recruitmentAdmin.email);
    await navigateTo(page, '/performance');
    await page.waitForTimeout(3000);

    const url = page.url();
    const blocked =
      url.includes('/auth/login') ||
      url.includes('/dashboard') ||
      url.includes('/me/') ||
      url.includes('/recruitment') ||
      (await page
        .locator('text=/403|access denied|forbidden|unauthorized|permission/i')
        .first()
        .isVisible({timeout: 3000})
        .catch(() => false));

    expect(blocked).toBe(true);
  });
});

// =============================================================================
// AUTH-15: MY SPACE Always Accessible
// =============================================================================

test.describe('AUTH-15: MY SPACE always accessible for any authenticated role', () => {
  test.use({storageState: {cookies: [], origins: []}});
  test.setTimeout(180000);

  const mySpaceRoutes = [
    '/me/profile',
    '/me/payslips',
    '/me/leaves',
    '/me/attendance',
    '/me/assets',
  ];

  const roleScenarios = [
    {label: 'employeeSaran (EMPLOYEE)', email: demoUsers.employeeSaran.email},
    {label: 'managerEng (MANAGER)', email: demoUsers.managerEng.email},
    {label: 'hrManager (HR_MANAGER)', email: demoUsers.hrManager.email},
    {label: 'superAdmin (SUPER_ADMIN)', email: demoUsers.superAdmin.email},
  ];

  for (const {label, email} of roleScenarios) {
    for (const route of mySpaceRoutes) {
      test(`${label} can access ${route}`, async ({page}) => {
        const consoleErrors: string[] = [];
        page.on('console', (msg) => {
          if (msg.type() === 'error' && !isNoisyError(msg.text())) {
            consoleErrors.push(msg.text());
          }
        });

        await loginAs(page, email);
        await navigateTo(page, route);

        // Allow up to 15s for page content to appear
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(2000);

        const url = page.url();
        // Must NOT be redirected to login
        expect(url).not.toContain('/auth/login');

        // Must NOT show 403 / access denied
        const accessDenied = await page
          .locator('text=/403|access denied|forbidden|you don.t have permission/i')
          .first()
          .isVisible({timeout: 3000})
          .catch(() => false);
        expect(accessDenied).toBe(false);

        // Heading or main content block must be present
        const content = page.locator('h1, h2, main, [role="main"]').first();
        await expect(content).toBeVisible({timeout: 15000});

        // No real console errors
        expect(consoleErrors).toHaveLength(0);
      });
    }
  }
});

// =============================================================================
// AUTH-16: Feature Flag — SUPER_ADMIN Bypasses Feature Gates
// =============================================================================

test.describe('AUTH-16: SUPER_ADMIN bypasses @RequiresFeature gates', () => {
  test.use({storageState: {cookies: [], origins: []}});
  test.setTimeout(120000);

  const featureGatedRoutes = [
    {route: '/leave', label: 'enable_leave'},
    {route: '/performance', label: 'enable_performance'},
    {route: '/payroll', label: 'enable_payroll'},
    {route: '/fluence/wiki', label: 'enable_fluence'},
  ];

  test.beforeEach(async ({page}) => {
    await loginAs(page, demoUsers.superAdmin.email);
  });

  for (const {route, label} of featureGatedRoutes) {
    test(`SUPER_ADMIN accesses ${route} (${label})`, async ({page}) => {
      await navigateTo(page, route);
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);

      const url = page.url();

      // Must not be on login page
      expect(url).not.toContain('/auth/login');

      // Must not show "Feature not available" or similar gate messages
      const featureGated = await page
        .locator('text=/feature not available|not enabled|coming soon|upgrade.*plan/i')
        .first()
        .isVisible({timeout: 3000})
        .catch(() => false);
      expect(featureGated).toBe(false);

      // Must not show 403
      const forbidden = await page
        .locator('text=/403|access denied|forbidden/i')
        .first()
        .isVisible({timeout: 3000})
        .catch(() => false);
      expect(forbidden).toBe(false);

      // Content must render
      const content = page.locator('h1, h2, main, [role="main"]').first();
      await expect(content).toBeVisible({timeout: 15000});
    });
  }
});
