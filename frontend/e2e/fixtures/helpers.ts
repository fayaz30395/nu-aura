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
const AUTH_MODE = process.env.E2E_AUTH_MODE ?? 'api';
const API_LOGIN_TIMEOUT_MS = Number(process.env.E2E_API_LOGIN_TIMEOUT_MS ?? 60000);
const API_LOGIN_PAGE_TIMEOUT_MS = Number(process.env.E2E_AUTH_PAGE_TIMEOUT_MS ?? 90000);
const API_LOGIN_ATTEMPTS = Number(process.env.E2E_API_LOGIN_ATTEMPTS ?? 3);
const API_LOGIN_RATE_LIMIT_DELAY_MS = Number(process.env.E2E_API_LOGIN_RATE_LIMIT_DELAY_MS ?? 15000);
const ALLOW_LOCAL_AUTH_FALLBACK = AUTH_MODE === 'local' || process.env.E2E_ALLOW_LOCAL_AUTH_FALLBACK === 'true';

interface ApiLoginResponse {
  accessToken?: string | null;
  refreshToken?: string | null;
  userId: string;
  employeeId?: string;
  tenantId: string;
  email: string;
  fullName: string;
  profilePictureUrl?: string;
  roles: string[];
  permissions?: string[];
}

const NULOGIC_TENANT_ID = '660e8400-e29b-41d4-a716-446655440001';
const AUTH_COOKIE_NAMES = new Set([
  'access_token',
  'refresh_token',
  '__Host-hrms-access',
  '__Host-hrms-refresh',
  'XSRF-TOKEN',
]);

type BrowserCookie = Awaited<ReturnType<ReturnType<Page['context']>['cookies']>>[number];

interface CachedAuthState {
  auth: ApiLoginResponse;
  cookies: BrowserCookie[];
}

interface LoginAsOptions {
  verifyDashboard?: boolean;
}

const authStateCache = new Map<string, CachedAuthState>();
let lastApiLoginAt = 0;

const ROLE_PERMISSIONS: Record<DemoUser['role'], string[]> = {
  SUPER_ADMIN: [],
  HR_MANAGER: [
    'DASHBOARD:VIEW',
    'EMPLOYEE:READ',
    'EMPLOYEE:VIEW_ALL',
    'LEAVE:VIEW_ALL',
    'LEAVE:MANAGE',
    'ATTENDANCE:VIEW_ALL',
    'ATTENDANCE:MANAGE',
    'WORKFLOW:VIEW',
    'WORKFLOW:EXECUTE',
    'EMPLOYMENT_CHANGE:VIEW',
    'EMPLOYMENT_CHANGE:VIEW_ALL',
    'EMPLOYMENT_CHANGE:APPROVE',
    'NOTIFICATION:VIEW',
    'DOCUMENT:VIEW',
    'REPORT:VIEW',
  ],
  MANAGER: [
    'DASHBOARD:VIEW',
    'DASHBOARD:MANAGER',
    'EMPLOYEE:VIEW_TEAM',
    'LEAVE:VIEW_TEAM',
    'LEAVE:APPROVE',
    'ATTENDANCE:VIEW_TEAM',
    'WORKFLOW:VIEW',
    'NOTIFICATION:VIEW',
  ],
  TEAM_LEAD: [
    'DASHBOARD:VIEW',
    'DASHBOARD:MANAGER',
    'EMPLOYEE:VIEW_TEAM',
    'LEAVE:VIEW_TEAM',
    'ATTENDANCE:VIEW_TEAM',
    'NOTIFICATION:VIEW',
  ],
  RECRUITMENT_ADMIN: [
    'DASHBOARD:VIEW',
    'RECRUITMENT:VIEW',
    'RECRUITMENT:MANAGE',
    'CANDIDATE:VIEW',
    'CANDIDATE:EVALUATE',
    'WORKFLOW:VIEW',
    'NOTIFICATION:VIEW',
  ],
  EMPLOYEE: [
    'DASHBOARD:VIEW',
    'DASHBOARD:EMPLOYEE',
    'EMPLOYEE:VIEW_SELF',
    'EMPLOYMENT_CHANGE:VIEW',
    'LEAVE:VIEW_SELF',
    'LEAVE:REQUEST',
    'ATTENDANCE:VIEW_SELF',
    'PAYROLL:VIEW_SELF',
    'DOCUMENT:VIEW',
    'NOTIFICATION:VIEW',
    'WORKFLOW:VIEW',
  ],
};

function base64UrlEncode(value: string): string {
  return Buffer.from(value)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function createUnsignedJwt(user: DemoUser): string {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const header = base64UrlEncode(JSON.stringify({alg: 'none', typ: 'JWT'}));
  const payload = base64UrlEncode(JSON.stringify({
    sub: user.email,
    email: user.email,
    role: user.role,
    roles: [user.role],
    tenantId: NULOGIC_TENANT_ID,
    exp: nowSeconds + 60 * 60,
    iat: nowSeconds,
  }));
  return `${header}.${payload}.e2e`;
}

function buildFallbackAuth(user: DemoUser): ApiLoginResponse {
  const slug = user.email.replace(/[^a-z0-9]/gi, '-').toLowerCase();
  return {
    userId: `e2e-user-${slug}`,
    employeeId: `e2e-employee-${slug}`,
    tenantId: NULOGIC_TENANT_ID,
    email: user.email,
    fullName: user.name,
    roles: [user.role],
    permissions: ROLE_PERMISSIONS[user.role],
  };
}

function buildStoredUser(auth: ApiLoginResponse) {
  const hasSuperAdminRole = auth.roles
    .filter(Boolean)
    .some((roleCode) => roleCode.replace(/^ROLE_/, '') === 'SUPER_ADMIN');

  return {
    id: auth.userId,
    employeeId: auth.employeeId,
    tenantId: auth.tenantId,
    email: auth.email,
    firstName: auth.fullName.split(' ')[0] || '',
    lastName: auth.fullName.split(' ').slice(1).join(' ') || '',
    fullName: auth.fullName,
    status: 'ACTIVE',
    roles: auth.roles.filter(Boolean).map((roleCode) => ({
      id: roleCode,
      code: roleCode,
      name: roleCode.replace(/_/g, ' '),
      permissions: getStoredPermissionsForRole(roleCode, auth.permissions, hasSuperAdminRole).map((permCode) => ({
        id: permCode,
        code: permCode,
        name: permCode,
        resource: permCode.split(':')[0] || '',
        action: permCode.split(':')[1] || '',
      })),
    })),
    profilePictureUrl: auth.profilePictureUrl,
  };
}

function getStoredPermissionsForRole(roleCode: string, apiPermissions?: string[], hasSuperAdminRole = false): string[] {
  if (hasSuperAdminRole) {
    return [];
  }

  const normalizedApiPermissions = apiPermissions?.filter(Boolean) ?? [];
  if (normalizedApiPermissions.length > 0) {
    return normalizedApiPermissions;
  }

  const normalizedRole = roleCode.replace(/^ROLE_/, '') as DemoUser['role'];
  if (Object.prototype.hasOwnProperty.call(ROLE_PERMISSIONS, normalizedRole)) {
    return ROLE_PERMISSIONS[normalizedRole];
  }
  return [];
}

async function seedStoredAuth(page: Page, auth: ApiLoginResponse, verifyDashboard: boolean): Promise<void> {
  const storedUser = buildStoredUser(auth);
  const useLocalAuthStorage = process.env.NEXT_PUBLIC_E2E_AUTH_STORAGE === 'localStorage';

  await page.evaluate(({tenantId, user, useLocalStorage}) => {
    const authEnvelope = JSON.stringify({
      state: {
        isAuthenticated: true,
        user,
      },
      version: 0,
    });
    localStorage.setItem('tenantId', tenantId);
    sessionStorage.setItem('tenantId', tenantId);

    const storages = useLocalStorage
      ? [localStorage, sessionStorage]
      : [sessionStorage];

    for (const storage of storages) {
      storage.setItem('nu-aura-user', JSON.stringify(user));
      storage.setItem('auth-storage', authEnvelope);
    }
  }, {tenantId: auth.tenantId, user: storedUser, useLocalStorage: useLocalAuthStorage});

  if (!verifyDashboard) {
    return;
  }

  // Navigate to dashboard to initialize the frontend Zustand store.
  await gotoWithRetry(page, '/me/dashboard');
  await waitForDashboard(page, 60000);
  await page.waitForFunction(
    (markers) => markers.some((marker) => document.body.innerText.includes(marker)),
    [storedUser.fullName, storedUser.email, storedUser.firstName].filter(Boolean),
    {timeout: 5000}
  ).catch(() => {
    // Some pages show skeleton content while slow dashboard queries finish.
    // The app shell visibility above is the hard auth readiness gate.
  });
}

export async function seedLocalStoredAuth(page: Page, email: string): Promise<void> {
  const user = allDemoUsers.find((u) => u.email === email);
  if (!user) {
    throw new Error(`seedLocalStoredAuth: unknown demo user ${email}`);
  }

  const cachedAuth = authStateCache.get(email);
  await seedStoredAuth(page, cachedAuth?.auth ?? buildFallbackAuth(user), false);
}

async function seedFallbackCookies(page: Page, user: DemoUser): Promise<void> {
  const appUrl = new URL(page.url());
  await page.context().addCookies([
    {
      name: 'access_token',
      value: createUnsignedJwt(user),
      domain: appUrl.hostname,
      path: '/',
      httpOnly: true,
      secure: appUrl.protocol === 'https:',
      sameSite: 'Lax',
      expires: Math.floor(Date.now() / 1000) + 60 * 60,
    },
    {
      name: 'refresh_token',
      value: `e2e-refresh-${Date.now()}`,
      domain: appUrl.hostname,
      path: '/',
      httpOnly: true,
      secure: appUrl.protocol === 'https:',
      sameSite: 'Lax',
      expires: Math.floor(Date.now() / 1000) + 60 * 60,
    },
  ]);
}

async function waitForApiLoginSlot(page: Page): Promise<void> {
  if (API_LOGIN_RATE_LIMIT_DELAY_MS <= 0) {
    return;
  }

  const now = Date.now();
  const elapsed = now - lastApiLoginAt;
  const waitMs = Math.max(0, API_LOGIN_RATE_LIMIT_DELAY_MS - elapsed);

  if (waitMs > 0) {
    await page.waitForTimeout(waitMs);
  }

  lastApiLoginAt = Date.now();
}

export async function gotoWithRetry(page: Page, path: string): Promise<void> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await page.goto(path, {waitUntil: 'domcontentloaded', timeout: 90000});
      await page.waitForLoadState('domcontentloaded');
      await page.getByText('Compiling', {exact: false}).first()
        .waitFor({state: 'hidden', timeout: 180000})
        .catch(() => {});
      return;
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : '';
      const retryable = message.includes('net::ERR_ABORTED')
        || message.includes('net::ERR_CONNECTION_REFUSED')
        || message.includes('net::ERR_EMPTY_RESPONSE')
        || message.includes('net::ERR_NETWORK_IO_SUSPENDED')
        || message.includes('Timeout');
      if (!retryable || attempt === 3) break;
      await page.waitForTimeout(1000 * attempt);
    }
  }
  throw lastError;
}

async function openAuthOriginForApiLogin(page: Page): Promise<void> {
  if (page.url().includes('/auth/login')) {
    return;
  }

  try {
    await page.goto('/auth/login', {waitUntil: 'domcontentloaded', timeout: API_LOGIN_PAGE_TIMEOUT_MS});
    await page.waitForLoadState('domcontentloaded', {timeout: 15000}).catch(() => {});
  } catch (error) {
    if (!process.env.E2E_AUTH_IGNORE_LOGIN_PAGE_FAILURES) {
      throw error;
    }
    // Some hosted environments intermittently stall authentication shell startup.
    // In that mode, continue with best-effort authentication state fallbacks.
    console.warn('openAuthOriginForApiLogin: login page open failed; continuing with fallback auth path.');
  }
}

/**
 * Authenticate via the backend API and inject auth state into the browser.
 * This is the fastest way to log in for non-auth-focused tests.
 *
 * @param page - Playwright Page instance
 * @param email - Email of the demo user to log in as
 */
export async function loginAs(page: Page, email: string, options: LoginAsOptions = {}): Promise<void> {
  const user = allDemoUsers.find((u) => u.email === email);
  const password = user?.password ?? DEMO_PASSWORD;
  const verifyDashboard = options.verifyDashboard ?? true;
  if (!user) {
    throw new Error(`loginAs: unknown demo user ${email}`);
  }

  await page.context().clearCookies();
  await openAuthOriginForApiLogin(page);
  await page.evaluate(() => {
    sessionStorage.clear();
    localStorage.removeItem('auth-storage');
    localStorage.removeItem('nu-aura-user');
    localStorage.removeItem('tenantId');
    localStorage.removeItem('loginAttempts');
    localStorage.removeItem('lockoutUntil');
  });

  const cachedAuth = authStateCache.get(email);
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (cachedAuth && cachedAuth.cookies.some((cookie) => (
    cookie.name === 'access_token' && (cookie.expires === -1 || cookie.expires > nowSeconds + 60)
  ))) {
    await page.context().addCookies(cachedAuth.cookies);
    await seedStoredAuth(page, cachedAuth.auth, verifyDashboard);
    return;
  }

  // Call the backend login API directly with a small retry loop. Keep the
  // probe short: UI/RBAC tests can still run with local auth-state fallback
  // when the dev backend is pointed at a slow/unavailable cloud database.
  let response;
  let lastBody = '';
  for (let attempt = 1; AUTH_MODE !== 'local' && attempt <= API_LOGIN_ATTEMPTS; attempt++) {
    try {
      if (attempt === 1) {
        await waitForApiLoginSlot(page);
      }
      response = await page.request.post(`${API_BASE}/auth/login`, {
        data: {email, password},
        failOnStatusCode: false,
        timeout: API_LOGIN_TIMEOUT_MS,
      });
    } catch (error) {
      lastBody = error instanceof Error ? error.message : 'unknown error';
    }
    if (response?.ok()) break;
    if (response) {
      lastBody = await response.text().catch(() => 'unknown error');
    }
    // Retry on optimistic-lock conflict or transient 5xx. Keep waits short so
    // UI/RBAC specs can fall back to local auth state instead of timing out.
    if (response && response.status() !== 409 && response.status() < 500) break;
    if (attempt < API_LOGIN_ATTEMPTS) {
      await page.waitForTimeout(250 * attempt);
    }
  }

  if (AUTH_MODE !== 'local' && response && !response.ok() && response.status() < 500) {
    throw new Error(`loginAs(${email}) failed: HTTP ${response.status()} — ${lastBody}`);
  }

  if (!response?.ok() && !ALLOW_LOCAL_AUTH_FALLBACK) {
    throw new Error(`loginAs(${email}) failed: API login did not return usable auth state. Last response: HTTP ${response?.status() ?? 'none'} — ${lastBody}`);
  }

  const auth = response?.ok()
    ? await response.json() as ApiLoginResponse
    : buildFallbackAuth(user);
  const authCookies = response?.ok()
    ? (await page.context().cookies()).filter((cookie) => AUTH_COOKIE_NAMES.has(cookie.name) && cookie.value)
    : [];
  const hasBackendAccessCookie = authCookies.some((cookie) => cookie.name === 'access_token');

  if (response?.ok() && hasBackendAccessCookie) {
    authStateCache.set(email, {auth, cookies: authCookies});
  } else {
    if (!ALLOW_LOCAL_AUTH_FALLBACK) {
      throw new Error(`loginAs(${email}) failed: API login succeeded but no backend access cookie was stored.`);
    }
    if (AUTH_MODE !== 'local') {
      console.warn(`loginAs(${email}) API login failed; using local E2E auth state fallback. HTTP ${response?.status()} — ${lastBody}`);
    }
    await seedFallbackCookies(page, user);
  }

  await seedStoredAuth(page, auth, verifyDashboard);
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
  await page.waitForLoadState('domcontentloaded');

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
  await page.waitForURL(
    (url) => url.pathname === '/dashboard' || url.pathname === '/me/dashboard',
    {timeout: 90000}
  );
  await page.waitForLoadState('domcontentloaded');
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
    await page.waitForURL(
      (url) => url.pathname === '/dashboard' || url.pathname === '/me/dashboard',
      {timeout}
    );
  } catch {
    const currentUrl = page.url();
    // If redirected to login, auth failed
    if (currentUrl.includes('/auth/login')) {
      throw new Error('waitForDashboard: redirected to login — auth state may be missing');
    }
    // Otherwise we might already be on a non-dashboard page that's fine
  }
  await page.waitForLoadState('domcontentloaded');

  // Verify the authenticated app shell is visible. Prefer the sidebar nav so
  // hidden headings or skeleton-only content cannot become the first match.
  const nav = page.locator('nav[aria-label="Main navigation"]');
  if (await nav.isVisible({timeout}).catch(() => false)) {
    return;
  }

  const main = page.locator('main').first();
  await expect(main).toBeVisible({timeout: 5000});
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
  await page.waitForLoadState('domcontentloaded');
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
  await gotoWithRetry(page, path);
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
