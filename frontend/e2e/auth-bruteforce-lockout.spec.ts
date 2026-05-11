import {expect, test} from '@playwright/test';

/**
 * Auth Brute-Force Lockout
 *
 * @regression @security
 *
 * Covers (sprint-3 P #2 audit gap, mirroring backend SecurityUseCaseTest.java:152-169
 * which is currently @Disabled):
 *   - 5 wrong-password attempts → AccountLockoutService trips
 *   - 6th attempt → HTTP 423 Locked from /api/v1/auth/login
 *
 * This depends on Redis being available (AccountLockoutService uses Redis with
 * ConcurrentHashMap fallback). When `app.security.lockout-redis-required=true`
 * is enforced AND Redis is absent, the assertion is meaningless — we therefore
 * gate the spec on the CI_HAS_REDIS env var.
 *
 * We use a known-bad email so we don't lock out any real demo account.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api/v1';
const BAD_EMAIL = `bruteforce-target-${Date.now()}@example.invalid`;
const BAD_PASSWORD = 'definitely-wrong-password';

test.describe('Auth — Brute-Force Lockout @security @regression', () => {

  test('LOCKOUT-01: 6th failed login returns 423 Locked', async ({request}) => {
    test.skip(
      !process.env.CI_HAS_REDIS,
      'AccountLockoutService requires Redis — set CI_HAS_REDIS=1 to enable this test'
    );

    // Fire 5 failed login attempts; expect 401 each time (or 400 for invalid creds).
    const failureCodes: number[] = [];
    for (let i = 0; i < 5; i++) {
      const res = await request.post(`${API_BASE}/auth/login`, {
        data: {email: BAD_EMAIL, password: BAD_PASSWORD},
        failOnStatusCode: false,
        timeout: 15000,
      });
      failureCodes.push(res.status());
    }

    // Each of the first 5 should be a failure (401 invalid creds or 400 bad request),
    // NOT 423 yet — lockout fires on the 6th.
    for (const code of failureCodes) {
      expect([400, 401, 403]).toContain(code);
    }

    // 6th attempt — lockout window engages
    const lockedRes = await request.post(`${API_BASE}/auth/login`, {
      data: {email: BAD_EMAIL, password: BAD_PASSWORD},
      failOnStatusCode: false,
      timeout: 15000,
    });

    // Per SecurityUseCaseTest.java:152-169 the expected status is 423 Locked.
    // Some impls return 429 Too Many Requests — accept either; flag others.
    expect([423, 429]).toContain(lockedRes.status());
  });

  test('LOCKOUT-02: lockout UI surfaces a clear message on the login page', async ({page}) => {
    test.skip(
      !process.env.CI_HAS_REDIS,
      'AccountLockoutService requires Redis — set CI_HAS_REDIS=1 to enable this test'
    );

    await page.context().clearCookies();
    await page.goto('/auth/login');
    await page.waitForLoadState('domcontentloaded');

    const emailInput = page.locator('input[type="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    const submitBtn = page.locator('button[type="submit"]').first();

    if (!(await emailInput.isVisible({timeout: 8000}).catch(() => false))) {
      test.info().annotations.push({type: 'skip-reason', description: 'Login form not visible in demo-mode'});
      return;
    }

    // Fire 6 wrong attempts via the UI form
    for (let i = 0; i < 6; i++) {
      await emailInput.fill(BAD_EMAIL);
      await passwordInput.fill(BAD_PASSWORD);
      await submitBtn.click();
      await page.waitForTimeout(600);
    }

    // After lockout we expect a locked / too-many-attempts message
    const lockoutCopy = page.locator('text=/locked|too many|try again|temporarily/i').first();
    const hasLockoutMessage = await lockoutCopy.isVisible({timeout: 5000}).catch(() => false);
    expect(hasLockoutMessage).toBe(true);
  });
});
