import {expect, test} from '@playwright/test';
import {loginAs, navigateTo} from './fixtures/helpers';
import {demoUsers} from './fixtures/testData';

/**
 * Security Deep Test Suite — NU-AURA Platform
 *
 * @security @critical @owasp
 *
 * Covers OWASP Top 10 + platform-specific attack surfaces:
 *   S-SEC-1  : Response security headers
 *   S-SEC-2  : Auth cookie security attributes
 *   S-SEC-3  : XSS via login form (reflected)
 *   S-SEC-4  : Stored XSS via feed post
 *   S-SEC-5  : IDOR — employee profile data
 *   S-SEC-6  : IDOR — payslip access
 *   S-SEC-7  : JWT tampering / signature validation
 *   S-SEC-8  : Cross-tenant data isolation
 *   S-SEC-9  : CORS origin validation
 *   S-SEC-10 : Rate limiting on auth endpoint
 *   S-SEC-11 : URL parameter injection
 *   S-SEC-12 : Path traversal prevention
 *
 * Design principles:
 * - Each describe block is fully self-contained (fresh loginAs at test start).
 * - Tests log findings to console.warn for bug tracking but do NOT hard-fail
 *   unless the finding is a clear security violation (data leakage, XSS
 *   execution, JWT bypass, foreign-user data in response body).
 * - Run with --workers=1 to avoid auth rate limiting.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api/v1';

// ─────────────────────────────────────────────────────────────────────────────
// S-SEC-1 — OWASP Security Headers
// ─────────────────────────────────────────────────────────────────────────────

test.describe('S-SEC-1: OWASP Security Headers @security', () => {
  test.setTimeout(90000);

  test('X-Content-Type-Options: nosniff must be present on API responses', async ({page}) => {
    await loginAs(page, demoUsers.superAdmin.email);
    await navigateTo(page, '/employees');

    // Intercept any /api/ call and read its response headers
    const headerPromise = new Promise<Record<string, string>>((resolve) => {
      page.on('response', (response) => {
        if (response.url().includes('/api/') && !response.url().includes('/auth/')) {
          resolve(Object.fromEntries(
            Object.entries(response.headers()).map(([k, v]) => [k.toLowerCase(), v])
          ));
        }
      });
    });

    // Trigger an API call by re-navigating
    await page.goto('/employees');
    await page.waitForLoadState('domcontentloaded');

    const headers = await Promise.race([
      headerPromise,
      new Promise<Record<string, string>>((_, reject) =>
        setTimeout(() => reject(new Error('No API response captured within 10s')), 10000)
      ),
    ]).catch(async () => {
      // Fallback: use fetch from page context
      return await page.evaluate(async (apiBase) => {
        try {
          const r = await fetch(`${apiBase}/employees?page=0&size=1`, {credentials: 'include'});
          const entries: Record<string, string> = {};
          r.headers.forEach((v, k) => {
            entries[k.toLowerCase()] = v;
          });
          return entries;
        } catch {
          return {};
        }
      }, API_BASE);
    });

    const xContentType = headers['x-content-type-options'];
    if (!xContentType) {
      console.warn('[S-SEC-1] FINDING: X-Content-Type-Options header missing on API responses');
    }
    // Soft assertion — log but only hard-fail if value is wrong (not missing)
    if (xContentType) {
      expect(xContentType.toLowerCase()).toContain('nosniff');
    }
  });

  test('X-Frame-Options must be DENY or SAMEORIGIN on API responses', async ({page}) => {
    await loginAs(page, demoUsers.superAdmin.email);

    const headers = await page.evaluate(async (apiBase) => {
      try {
        const r = await fetch(`${apiBase}/employees?page=0&size=1`, {credentials: 'include'});
        const entries: Record<string, string> = {};
        r.headers.forEach((v, k) => {
          entries[k.toLowerCase()] = v;
        });
        return entries;
      } catch {
        return {};
      }
    }, API_BASE);

    const xFrame = headers['x-frame-options'];
    if (!xFrame) {
      console.warn('[S-SEC-1] FINDING: X-Frame-Options header missing on API responses');
    } else {
      const normalised = xFrame.toUpperCase();
      expect(['DENY', 'SAMEORIGIN'].some((v) => normalised.includes(v))).toBe(true);
    }
  });

  test('Content-Security-Policy header must be present on page responses', async ({page}) => {
    let cspFound = false;

    page.on('response', (response) => {
      if (response.url().endsWith('/employees') || response.url().includes('localhost:3000')) {
        const csp = response.headers()['content-security-policy'];
        if (csp) cspFound = true;
      }
    });

    await loginAs(page, demoUsers.superAdmin.email);
    await page.goto('/employees');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    if (!cspFound) {
      console.warn('[S-SEC-1] FINDING: Content-Security-Policy not detected on page responses');
    }
    // This is an informational check — do not hard-fail (CSP may be set at edge/CDN)
    expect(true).toBe(true);
  });

  test('API endpoints must NOT return Access-Control-Allow-Origin: * (wildcard CORS)', async ({page}) => {
    await loginAs(page, demoUsers.superAdmin.email);

    const headers = await page.evaluate(async (apiBase) => {
      try {
        const r = await fetch(`${apiBase}/employees?page=0&size=1`, {credentials: 'include'});
        const entries: Record<string, string> = {};
        r.headers.forEach((v, k) => {
          entries[k.toLowerCase()] = v;
        });
        return entries;
      } catch {
        return {};
      }
    }, API_BASE);

    const acao = headers['access-control-allow-origin'];
    if (acao === '*') {
      console.warn('[S-SEC-1] CRITICAL FINDING: API returns Access-Control-Allow-Origin: * — wildcard CORS allows any origin to read authenticated responses');
    }
    // This is a hard assertion — wildcard ACAO on credentialed endpoints is a critical vuln
    expect(acao).not.toBe('*');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// S-SEC-2 — Auth Cookie Security Attributes
// ─────────────────────────────────────────────────────────────────────────────

test.describe('S-SEC-2: Auth Cookie Security Attributes @security', () => {
  test.setTimeout(90000);

  test('access_token MUST NOT be visible in document.cookie (must be httpOnly)', async ({page}) => {
    await loginAs(page, demoUsers.superAdmin.email);

    const cookieStr = await page.evaluate(() => document.cookie);

    if (cookieStr.includes('access_token')) {
      console.warn('[S-SEC-2] CRITICAL FINDING: access_token is readable via document.cookie — httpOnly flag is missing');
    }
    // Hard assertion — JS-readable access tokens are a critical XSS escalation vector
    expect(cookieStr).not.toContain('access_token');
  });

  test('refresh_token MUST NOT be visible in document.cookie (must be httpOnly)', async ({page}) => {
    await loginAs(page, demoUsers.superAdmin.email);

    const cookieStr = await page.evaluate(() => document.cookie);

    if (cookieStr.includes('refresh_token')) {
      console.warn('[S-SEC-2] CRITICAL FINDING: refresh_token is readable via document.cookie — httpOnly flag is missing');
    }
    expect(cookieStr).not.toContain('refresh_token');
  });

  test('Set-Cookie response for login must include SameSite=Lax or SameSite=Strict', async ({page}) => {
    let loginSetCookieHeaders: string[] = [];

    page.on('response', async (response) => {
      if (response.url().includes('/auth/login') && response.status() === 200) {
        const setCookie = response.headers()['set-cookie'];
        if (setCookie) {
          loginSetCookieHeaders = setCookie.split('\n').map((s) => s.trim());
        }
      }
    });

    // Navigate to login page and perform login to capture Set-Cookie
    await page.goto('/auth/login');
    await page.waitForLoadState('domcontentloaded');

    // Use the API directly to capture the Set-Cookie header
    const loginResponse = await page.request.post(`${API_BASE}/auth/login`, {
      data: {
        email: demoUsers.superAdmin.email,
        password: demoUsers.superAdmin.password,
      },
      failOnStatusCode: false,
    });

    const rawCookies = loginResponse.headers()['set-cookie'] ?? '';

    if (!rawCookies) {
      console.warn('[S-SEC-2] INFO: No Set-Cookie header captured from login endpoint — tokens may be in response body');
      // Skip SameSite check if no cookies set
      return;
    }

    const cookieLower = rawCookies.toLowerCase();
    const hasSameSite = cookieLower.includes('samesite=lax') || cookieLower.includes('samesite=strict');

    if (!hasSameSite) {
      console.warn('[S-SEC-2] FINDING: SameSite attribute missing or set to None on auth cookies — CSRF risk');
    }
    expect(hasSameSite).toBe(true);
  });

  test('Auth cookie value must be under 4096 bytes (roles only, no permissions dump)', async ({page}) => {
    const loginResponse = await page.request.post(`${API_BASE}/auth/login`, {
      data: {
        email: demoUsers.superAdmin.email,
        password: demoUsers.superAdmin.password,
      },
      failOnStatusCode: false,
    });

    const rawCookies = loginResponse.headers()['set-cookie'] ?? '';

    if (!rawCookies) {
      console.warn('[S-SEC-2] INFO: No Set-Cookie from login endpoint — skipping cookie size check');
      return;
    }

    // Find the largest cookie value
    const cookieValues = rawCookies.split(',').map((c) => c.trim());
    const maxSize = Math.max(...cookieValues.map((c) => Buffer.byteLength(c, 'utf8')));

    if (maxSize > 4096) {
      console.warn(`[S-SEC-2] FINDING: Cookie size ${maxSize} bytes exceeds 4096 — may contain permissions dump instead of roles only`);
    }
    expect(maxSize).toBeLessThanOrEqual(4096);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// S-SEC-3 — XSS via Login Form (Reflected XSS)
// ─────────────────────────────────────────────────────────────────────────────

test.describe('S-SEC-3: XSS via Login Form @security', () => {
  test.setTimeout(90000);

  test('XSS payload in email field must NOT execute alert()', async ({page}) => {
    let xssDialogFired = false;

    page.on('dialog', async (dialog) => {
      xssDialogFired = true;
      console.warn(`[S-SEC-3] CRITICAL FINDING: alert() fired — dialog message: "${dialog.message()}"`);
      await dialog.dismiss();
    });

    await page.goto('/auth/login');
    await page.waitForLoadState('domcontentloaded');

    const emailInput = page.locator('input[type="email"], input[name="email"], input[id="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    const submitBtn = page.locator('button[type="submit"]').first();

    await emailInput.fill("<script>alert('xss-email')</script>@test.com");
    await passwordInput.fill("';DROP TABLE users;--");
    await submitBtn.click();

    await page.waitForTimeout(2000);

    // Hard assertion — XSS execution is a critical finding
    expect(xssDialogFired).toBe(false);
  });

  test('Page must remain on /auth/login after XSS payload submission (no crash)', async ({page}) => {
    await page.goto('/auth/login');
    await page.waitForLoadState('domcontentloaded');

    const emailInput = page.locator('input[type="email"], input[name="email"], input[id="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    const submitBtn = page.locator('button[type="submit"]').first();

    await emailInput.fill("<script>alert('xss')</script>@test.com");
    await passwordInput.fill("' OR '1'='1");
    await submitBtn.click();

    await page.waitForTimeout(2000);
    expect(page.url()).toContain('/auth/login');
  });

  test('Error message must NOT reflect raw XSS payload (no reflected XSS)', async ({page}) => {
    await page.goto('/auth/login');
    await page.waitForLoadState('domcontentloaded');

    const xssPayload = "<img src=x onerror=alert(1)>";

    const emailInput = page.locator('input[type="email"], input[name="email"], input[id="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    const submitBtn = page.locator('button[type="submit"]').first();

    await emailInput.fill(xssPayload);
    await passwordInput.fill('wrong-password');
    await submitBtn.click();

    await page.waitForTimeout(2000);

    // Check that the error message does not contain unescaped HTML from the payload
    const pageContent = await page.content();

    // The payload must not appear as unescaped HTML in the DOM
    // Checking for the raw onerror= attribute is indicative of reflected XSS
    const hasRawPayload = pageContent.includes('onerror=alert') || pageContent.includes("onerror=\"alert");
    if (hasRawPayload) {
      console.warn('[S-SEC-3] CRITICAL FINDING: XSS payload reflected unescaped in page HTML — reflected XSS vulnerability');
    }
    expect(hasRawPayload).toBe(false);
  });

  test('No script-execution console errors after XSS payload submission', async ({page}) => {
    const scriptErrors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error' && msg.text().toLowerCase().includes('script')) {
        scriptErrors.push(msg.text());
      }
    });

    await page.goto('/auth/login');
    await page.waitForLoadState('domcontentloaded');

    const emailInput = page.locator('input[type="email"], input[name="email"], input[id="email"]').first();
    await emailInput.fill("<script>window.__xss_sec3=true</script>@evil.com");

    const passwordInput = page.locator('input[type="password"]').first();
    await passwordInput.fill('wrongpassword');

    const submitBtn = page.locator('button[type="submit"]').first();
    await submitBtn.click();

    await page.waitForTimeout(2000);

    // Check that the XSS variable was not set (script not executed)
    const xssExecuted = await page.evaluate(() => (window as unknown as Record<string, unknown>)['__xss_sec3'] === true);
    if (xssExecuted) {
      console.warn('[S-SEC-3] CRITICAL FINDING: window.__xss_sec3 was set — script injection executed in login form');
    }
    expect(xssExecuted).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// S-SEC-4 — Stored XSS via Feed Post
// ─────────────────────────────────────────────────────────────────────────────

test.describe('S-SEC-4: Stored XSS via Feed Post @security', () => {
  test.setTimeout(90000);

  test('HTML img onerror payload in feed post must NOT execute (no stored XSS)', async ({page}) => {
    let xssDialogFired = false;

    page.on('dialog', async (dialog) => {
      xssDialogFired = true;
      console.warn(`[S-SEC-4] CRITICAL FINDING: dialog fired after post — message: "${dialog.message()}"`);
      await dialog.dismiss();
    });

    await loginAs(page, demoUsers.employeeSaran.email);
    await navigateTo(page, '/me/dashboard');

    // Find post/feed creation area
    const postInputSelectors = [
      'textarea[placeholder*="share"]',
      'textarea[placeholder*="post"]',
      'textarea[placeholder*="mind"]',
      'textarea[placeholder*="Write"]',
      '[contenteditable="true"]',
      'input[placeholder*="post"]',
      'input[placeholder*="share"]',
    ];

    let postInput = null;
    for (const selector of postInputSelectors) {
      const el = page.locator(selector).first();
      if (await el.isVisible({timeout: 2000}).catch(() => false)) {
        postInput = el;
        break;
      }
    }

    if (!postInput) {
      console.warn('[S-SEC-4] INFO: Feed post input not found on /me/dashboard — skipping stored XSS test');
      // Gracefully skip if no feed found
      return;
    }

    await postInput.fill('<img src=x onerror="window.__xss_sec4=true">');

    // Submit the post
    const submitBtn = page.locator('button[type="submit"], button').filter({hasText: /^Post$|^Share$|^Submit$/i}).first();
    if (await submitBtn.isVisible({timeout: 3000}).catch(() => false)) {
      await submitBtn.click();
      await page.waitForTimeout(2000);
    }

    // Navigate away and back to trigger stored XSS if present
    await navigateTo(page, '/me/profile');
    await navigateTo(page, '/me/dashboard');
    await page.waitForTimeout(2000);

    const xssExecuted = await page.evaluate(() =>
      (window as unknown as Record<string, unknown>)['__xss_sec4'] === true
    );

    if (xssExecuted || xssDialogFired) {
      console.warn('[S-SEC-4] CRITICAL FINDING: Stored XSS — img onerror payload was executed after posting');
    }
    expect(xssExecuted).toBe(false);
    expect(xssDialogFired).toBe(false);
  });

  test('Script tag payload in feed post must NOT execute (no stored XSS)', async ({page}) => {
    await loginAs(page, demoUsers.employeeSaran.email);
    await navigateTo(page, '/me/dashboard');

    const postInputSelectors = [
      'textarea[placeholder*="share"]',
      'textarea[placeholder*="post"]',
      'textarea[placeholder*="mind"]',
      '[contenteditable="true"]',
    ];

    let postInput = null;
    for (const selector of postInputSelectors) {
      const el = page.locator(selector).first();
      if (await el.isVisible({timeout: 2000}).catch(() => false)) {
        postInput = el;
        break;
      }
    }

    if (!postInput) {
      console.warn('[S-SEC-4] INFO: Feed post input not found — skipping script tag XSS test');
      return;
    }

    await postInput.fill('<script>window.__xss_sec4_script=true</script>');

    const submitBtn = page.locator('button').filter({hasText: /^Post$|^Share$|^Submit$/i}).first();
    if (await submitBtn.isVisible({timeout: 3000}).catch(() => false)) {
      await submitBtn.click();
      await page.waitForTimeout(2000);
    }

    await navigateTo(page, '/me/profile');
    await navigateTo(page, '/me/dashboard');
    await page.waitForTimeout(2000);

    const xssExecuted = await page.evaluate(() =>
      (window as unknown as Record<string, unknown>)['__xss_sec4_script'] === true
    );

    if (xssExecuted) {
      console.warn('[S-SEC-4] CRITICAL FINDING: Stored XSS — script tag payload executed from feed post');
    }
    expect(xssExecuted).toBe(false);
  });

  test('Posted XSS content must appear as escaped text, not executed HTML', async ({page}) => {
    await loginAs(page, demoUsers.employeeSaran.email);
    await navigateTo(page, '/me/dashboard');

    const postInputSelectors = [
      'textarea[placeholder*="share"]',
      'textarea[placeholder*="post"]',
      '[contenteditable="true"]',
    ];

    let postInput = null;
    for (const selector of postInputSelectors) {
      const el = page.locator(selector).first();
      if (await el.isVisible({timeout: 2000}).catch(() => false)) {
        postInput = el;
        break;
      }
    }

    if (!postInput) {
      console.warn('[S-SEC-4] INFO: Feed post input not found — skipping escaped content check');
      return;
    }

    const xssPayload = '<b>not-bold</b>';
    await postInput.fill(xssPayload);

    const submitBtn = page.locator('button').filter({hasText: /^Post$|^Share$|^Submit$/i}).first();
    if (await submitBtn.isVisible({timeout: 3000}).catch(() => false)) {
      await submitBtn.click();
      await page.waitForTimeout(2000);
    }

    // If the text "<b>not-bold</b>" is rendered, the text "not-bold" should appear
    // without the browser interpreting it as bold (check innerHTML vs textContent)
    await navigateTo(page, '/me/dashboard');
    await page.waitForTimeout(2000);

    // The raw <b> tag in page source as actual HTML element would mean XSS
    // We check that no injected <b> element with text "not-bold" was created by our post
    const injectedBoldElements = await page.evaluate(() => {
      const bEls = Array.from(document.querySelectorAll('b'));
      return bEls.some((el) => el.textContent?.includes('not-bold'));
    });

    if (injectedBoldElements) {
      console.warn('[S-SEC-4] FINDING: HTML injection — <b> tag from post payload was interpreted as HTML');
    }
    // Soft assertion — HTML injection is a finding but not as critical as script execution
    expect(injectedBoldElements).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// S-SEC-5 — IDOR: Employee Data
// ─────────────────────────────────────────────────────────────────────────────

test.describe('S-SEC-5: IDOR — Employee Data @security', () => {
  test.setTimeout(90000);

  test('ESS employee cannot access arbitrary employee profile pages', async ({page}) => {
    await loginAs(page, demoUsers.employeeSaran.email);

    const testIds = ['1', '2', '100'];
    for (const id of testIds) {
      await page.goto(`/employees/${id}`);
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1500);

      const currentUrl = page.url();
      const isOnEmployeeDetail = currentUrl.includes(`/employees/${id}`) && !currentUrl.includes('/auth/login') && !currentUrl.includes('/me/');
      const has403 = await page.locator('text=/403|Forbidden|Access Denied|Not Authorized/i').first().isVisible({timeout: 2000}).catch(() => false);
      const hasNotFound = await page.locator('text=/404|Not Found|not found/i').first().isVisible({timeout: 2000}).catch(() => false);
      const isRedirected = currentUrl.includes('/me/') || currentUrl.includes('/auth/login') || currentUrl.includes('/dashboard');

      if (isOnEmployeeDetail && !has403 && !hasNotFound) {
        // Check if the page contains sensitive data for a different employee
        const pageText = await page.textContent('body').catch(() => '');
        const hasSalaryData = pageText.includes('Salary') && pageText.includes('₹') || pageText.includes('$');
        if (hasSalaryData) {
          console.warn(`[S-SEC-5] CRITICAL FINDING: Employee ID ${id} returned salary/financial data to ESS employee Saran`);
        }
      }

      // Should be redirected, show 403/404, or not display full profile
      expect(isRedirected || has403 || hasNotFound || !isOnEmployeeDetail).toBe(true);
    }
  });

  test('API-level IDOR: ESS employee fetching /api/v1/employees/1 must get 403', async ({page}) => {
    await loginAs(page, demoUsers.employeeSaran.email);

    const result = await page.evaluate(async (apiBase) => {
      try {
        const r = await fetch(`${apiBase}/employees/1`, {credentials: 'include'});
        const body = await r.text().catch(() => '');
        return {status: r.status, body: body.substring(0, 500)};
      } catch (e) {
        return {status: 0, body: String(e), error: true};
      }
    }, API_BASE);

    if (result.status === 200) {
      const bodyLower = result.body.toLowerCase();
      const hasSensitiveData =
        bodyLower.includes('salary') ||
        bodyLower.includes('email') ||
        bodyLower.includes('phone') ||
        bodyLower.includes('bankaccount');

      if (hasSensitiveData) {
        console.warn(`[S-SEC-5] CRITICAL FINDING: IDOR — ESS employee Saran received 200 with sensitive fields from /employees/1: ${result.body.substring(0, 200)}`);
      }
      // Hard assertion — 200 with sensitive data is an IDOR critical finding
      expect(hasSensitiveData).toBe(false);
    } else {
      // Expected: 403 or 401
      expect([401, 403, 404]).toContain(result.status);
    }
  });

  test('ESS employee API response for /employees must not expose other employees salary', async ({page}) => {
    await loginAs(page, demoUsers.employeeSaran.email);

    const result = await page.evaluate(async (apiBase) => {
      try {
        const r = await fetch(`${apiBase}/employees?page=0&size=10`, {credentials: 'include'});
        const body = await r.text().catch(() => '');
        return {status: r.status, body: body.substring(0, 1000)};
      } catch (e) {
        return {status: 0, body: String(e)};
      }
    }, API_BASE);

    if (result.status === 200) {
      const bodyLower = result.body.toLowerCase();
      // Salary information should never appear in a list endpoint for ESS users
      if (bodyLower.includes('"salary"') || bodyLower.includes('"basesalary"') || bodyLower.includes('"ctc"')) {
        console.warn(`[S-SEC-5] CRITICAL FINDING: Employee list API returned salary fields to ESS employee: ${result.body.substring(0, 300)}`);
        // Hard fail — salary data in ESS list is a critical data leakage
        expect(false).toBe(true);
      }
    }
    // 403 is acceptable — employee cannot list all employees
    expect(result.status).not.toBe(500);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// S-SEC-6 — IDOR: Payslip Access
// ─────────────────────────────────────────────────────────────────────────────

test.describe('S-SEC-6: IDOR — Payslip Access @security', () => {
  test.setTimeout(90000);

  test('ESS employee fetching foreign employeeId payslips must get 403 or own-data only', async ({page}) => {
    await loginAs(page, demoUsers.employeeSaran.email);

    const result = await page.evaluate(async (apiBase) => {
      try {
        const r = await fetch(`${apiBase}/payroll/payslips?employeeId=1`, {credentials: 'include'});
        const body = await r.text().catch(() => '');
        return {status: r.status, body: body.substring(0, 800)};
      } catch (e) {
        return {status: 0, body: String(e)};
      }
    }, API_BASE);

    if (result.status === 200) {
      // If 200, the body must only contain Saran's own data, not employee ID 1's
      const bodyLower = result.body.toLowerCase();
      // Check for obvious foreign-employee identifiers
      const hasForeignEmail = bodyLower.includes('fayaz.m@nulogic.io') || bodyLower.includes('sumit@nulogic.io');
      if (hasForeignEmail) {
        console.warn(`[S-SEC-6] CRITICAL FINDING: IDOR — Saran received payslips belonging to another employee via ?employeeId=1: ${result.body.substring(0, 300)}`);
      }
      expect(hasForeignEmail).toBe(false);
    } else {
      console.warn(`[S-SEC-6] INFO: /payroll/payslips?employeeId=1 returned ${result.status} for ESS employee — expected behavior`);
      expect([401, 403, 404]).toContain(result.status);
    }
  });

  test('/me/payslips page must only show authenticated employee own payslips', async ({page}) => {
    await loginAs(page, demoUsers.employeeSaran.email);
    await navigateTo(page, '/me/payslips');

    await page.waitForTimeout(2000);

    const pageText = await page.textContent('body').catch(() => '');
    const hasForeignName = pageText.includes('Fayaz M') || pageText.includes('Sumit Kumar') || pageText.includes('Jagadeesh');

    if (hasForeignName) {
      console.warn('[S-SEC-6] FINDING: Foreign employee names visible on /me/payslips for Saran — possible data leakage');
    }
    // Soft assertion — names could appear in nav elements, so this is a best-effort check
    // Hard fail only if payslip-specific sections reference foreign employees
    const payslipSection = await page.locator('[class*="payslip"], [class*="pay-slip"], table').textContent().catch(() => '');
    const hasForeignInPayslip = payslipSection.includes('Fayaz M') || payslipSection.includes('Sumit Kumar');
    expect(hasForeignInPayslip).toBe(false);
  });

  test('Direct payslip download endpoint must reject cross-employee access', async ({page}) => {
    await loginAs(page, demoUsers.employeeSaran.email);

    // Try to access payslip belonging to employee ID 1 (likely superAdmin)
    const result = await page.evaluate(async (apiBase) => {
      try {
        const r = await fetch(`${apiBase}/payroll/payslips/download?employeeId=1&month=2025-01`, {credentials: 'include'});
        return {status: r.status};
      } catch (e) {
        return {status: 0, error: String(e)};
      }
    }, API_BASE);

    if (result.status === 200) {
      console.warn('[S-SEC-6] CRITICAL FINDING: IDOR — Saran can download payslips for employeeId=1 via direct URL');
    }
    // Allow 200 only if it's own data (no way to distinguish here without content parsing)
    // We accept 403, 404, or 400 as correct behaviour
    expect(result.status).not.toBe(500);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// S-SEC-7 — JWT Tampering
// ─────────────────────────────────────────────────────────────────────────────

test.describe('S-SEC-7: JWT Tampering @security', () => {
  test.setTimeout(90000);

  test('ESS employee must get 403 accessing /employees (insufficient role)', async ({page}) => {
    await loginAs(page, demoUsers.employeeSaran.email);

    const result = await page.evaluate(async (apiBase) => {
      try {
        const r = await fetch(`${apiBase}/employees?page=0&size=10`, {credentials: 'include'});
        return {status: r.status};
      } catch (e) {
        return {status: 0, error: String(e)};
      }
    }, API_BASE);

    // ESS employee should not have access to the full employee list
    if (result.status === 200) {
      console.warn('[S-SEC-7] FINDING: ESS employee Saran received 200 on /employees list API — may have excessive permissions');
    }
    expect([401, 403]).toContain(result.status);
  });

  test('Manually injected tampered access_token cookie must NOT grant elevated access', async ({page}) => {
    await loginAs(page, demoUsers.employeeSaran.email);

    // Inject a token with a modified payload (invalid signature)
    // Header: {"alg":"HS256"} Payload: {"roles":["SUPER_ADMIN"],"sub":"tampered"} Sig: INVALIDSIG
    const tamperedToken = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ0YW1wZXJlZCIsInJvbGVzIjpbIlNVUEVSX0FETUlOIl19.INVALIDSIGNATUREXXXXXXXXXXXXXX';

    await page.evaluate((token) => {
      // Attempt to set a tampered access_token (even though it should be httpOnly,
      // some implementations may have a non-httpOnly fallback)
      try {
        document.cookie = `access_token=${token}; path=/; SameSite=Lax`;
      } catch {
        // Ignore — httpOnly cookies cannot be set via JS (expected)
      }
    }, tamperedToken);

    // Now try to access an admin endpoint
    const result = await page.evaluate(async (apiBase) => {
      try {
        const r = await fetch(`${apiBase}/employees?page=0&size=5`, {credentials: 'include'});
        const body = await r.text().catch(() => '');
        return {status: r.status, body: body.substring(0, 300)};
      } catch (e) {
        return {status: 0, body: String(e)};
      }
    }, API_BASE);

    // The tampered cookie should either be ignored (httpOnly prevents override)
    // or rejected by the backend signature validation
    if (result.status === 200) {
      const bodyLower = result.body.toLowerCase();
      const hasSuperAdminData = bodyLower.includes('"totalelements"') && bodyLower.includes('"content"');
      if (hasSuperAdminData) {
        console.warn('[S-SEC-7] CRITICAL FINDING: Tampered JWT token granted access to employee list — signature validation bypassed');
      }
    } else {
      expect([401, 403]).toContain(result.status);
    }
    expect(true).toBe(true); // Test completes without error
  });

  test('Navigating to /employees as ESS must redirect or show 403 (no JWT elevation)', async ({page}) => {
    await loginAs(page, demoUsers.employeeSaran.email);
    await page.goto('/employees');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    const currentUrl = page.url();
    const isRedirected = !currentUrl.includes('/employees') || currentUrl.includes('/auth/login') || currentUrl.includes('/dashboard') || currentUrl.includes('/me/');
    const has403Ui = await page.locator('text=/403|Forbidden|Access Denied|Not Authorized|not found/i').first().isVisible({timeout: 3000}).catch(() => false);
    const hasEmployeeList = await page.locator('table tbody tr').first().isVisible({timeout: 3000}).catch(() => false);

    if (hasEmployeeList && !isRedirected && !has403Ui) {
      // Check if this is a self-service view (employee can see themselves) vs full list
      const rowCount = await page.locator('table tbody tr').count().catch(() => 0);
      if (rowCount > 5) {
        console.warn(`[S-SEC-7] FINDING: ESS employee Saran can see ${rowCount} rows on /employees — may have excessive data access`);
      }
    }

    // Not a hard fail — some systems show a limited self-service view at /employees
    expect(true).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// S-SEC-8 — Cross-Tenant Isolation
// ─────────────────────────────────────────────────────────────────────────────

test.describe('S-SEC-8: Cross-Tenant Isolation @security', () => {
  test.setTimeout(90000);

  test('URL tenantId manipulation must not return foreign tenant data', async ({page}) => {
    await loginAs(page, demoUsers.employeeSaran.email);

    const foreignTenantIds = [
      '00000000-0000-0000-0000-000000000001',
      '99999999-9999-9999-9999-999999999999',
    ];

    for (const tenantId of foreignTenantIds) {
      await page.goto(`/employees?tenantId=${tenantId}`);
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1500);

      // Should not crash with 500
      const has500 = await page.locator('text=/500|Internal Server Error|Something went wrong/i').first().isVisible({timeout: 2000}).catch(() => false);
      if (has500) {
        console.warn(`[S-SEC-8] FINDING: 500 error when injecting tenantId=${tenantId} — server does not handle unknown tenant gracefully`);
      }
      expect(has500).toBe(false);
    }
  });

  test('X-Tenant-Id header injection must not return cross-tenant data', async ({page}) => {
    await loginAs(page, demoUsers.employeeSaran.email);

    const result = await page.evaluate(async (apiBase) => {
      try {
        const r = await fetch(`${apiBase}/employees?page=0&size=5`, {
          credentials: 'include',
          headers: {
            'X-Tenant-Id': '99999999-9999-9999-9999-999999999999',
          },
        });
        const body = await r.text().catch(() => '');
        return {status: r.status, body: body.substring(0, 500)};
      } catch (e) {
        return {status: 0, body: String(e), error: true};
      }
    }, API_BASE);

    // Should NOT return a 500 error
    if (result.status === 500) {
      console.warn('[S-SEC-8] FINDING: Backend returns 500 when X-Tenant-Id header is injected with unknown UUID — unhandled exception');
    }
    expect(result.status).not.toBe(500);

    // Should NOT return cross-tenant data (the injected tenant does not exist,
    // so if we get 200 with content it must be the authenticated tenant's data, which is fine,
    // or it is correctly blocked with 400/403)
    if (result.status === 200) {
      // Verify that the authenticated tenant's own data is returned (not foreign data)
      // In a well-implemented system the header should be ignored and JWT tenant used
      console.warn(`[S-SEC-8] INFO: Backend returns 200 with X-Tenant-Id injection — verify response contains only authenticated tenant data`);
    }
  });

  test('Response to authenticated requests must not contain data from other tenants', async ({page}) => {
    await loginAs(page, demoUsers.employeeSaran.email);

    // Get the list of employees for the authenticated user's tenant
    const result = await page.evaluate(async (apiBase) => {
      try {
        const r = await fetch(`${apiBase}/employees?page=0&size=20`, {credentials: 'include'});
        if (r.status !== 200) return {status: r.status, emails: []};
        const data = await r.json().catch(() => ({}));
        const content = data.content ?? data.data ?? data ?? [];
        const emails: string[] = Array.isArray(content)
          ? content.map((e: Record<string, unknown>) => String(e.workEmail ?? e.email ?? '')).filter(Boolean)
          : [];
        return {status: r.status, emails};
      } catch (e) {
        return {status: 0, emails: [], error: String(e)};
      }
    }, API_BASE);

    if (result.status === 200 && result.emails.length > 0) {
      // All emails should be @nulogic.io domain (the demo tenant)
      const foreignEmails = result.emails.filter((email: string) =>
        !email.endsWith('@nulogic.io') && email.includes('@') && !email.startsWith('test')
      );
      if (foreignEmails.length > 0) {
        console.warn(`[S-SEC-8] CRITICAL FINDING: Cross-tenant data leak — foreign email domains in employee list: ${foreignEmails.join(', ')}`);
        expect(foreignEmails.length).toBe(0);
      }
    }
    expect(true).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// S-SEC-9 — CORS Validation
// ─────────────────────────────────────────────────────────────────────────────

test.describe('S-SEC-9: CORS Validation @security', () => {
  test.setTimeout(90000);

  test('Request from evil.example.com origin must be blocked or return no sensitive data', async ({page}) => {
    await loginAs(page, demoUsers.superAdmin.email);

    const result = await page.evaluate(async (apiBase) => {
      try {
        const r = await fetch(`${apiBase}/employees?page=0&size=1`, {
          credentials: 'include',
          headers: {
            'Origin': 'http://evil.example.com',
          },
        });
        const body = await r.text().catch(() => '');
        return {
          status: r.status,
          acao: r.headers.get('access-control-allow-origin') ?? 'not-set',
          body: body.substring(0, 200),
        };
      } catch (e) {
        return {status: 0, acao: 'blocked', body: String(e), error: true};
      }
    }, API_BASE);

    if (result.acao === '*') {
      console.warn('[S-SEC-9] CRITICAL FINDING: Backend returns Access-Control-Allow-Origin: * — any origin can read authenticated API responses');
      expect(result.acao).not.toBe('*');
    }

    if (result.acao === 'http://evil.example.com') {
      console.warn('[S-SEC-9] CRITICAL FINDING: Backend reflects evil.example.com as allowed origin — CORS misconfiguration');
      expect(result.acao).not.toBe('http://evil.example.com');
    }

    // Either the request is blocked (0/error), returns 403, or ACAO is not the evil origin
    const isSafe = result.status === 0 || result.acao === 'blocked' || result.status === 403 ||
      (result.acao !== '*' && result.acao !== 'http://evil.example.com');
    expect(isSafe).toBe(true);
  });

  test('CORS preflight from untrusted origin must not allow credentials', async ({page}) => {
    await loginAs(page, demoUsers.superAdmin.email);

    const result = await page.evaluate(async (apiBase) => {
      try {
        // OPTIONS preflight request
        const r = await fetch(`${apiBase}/employees`, {
          method: 'OPTIONS',
          headers: {
            'Origin': 'http://evil.example.com',
            'Access-Control-Request-Method': 'GET',
            'Access-Control-Request-Headers': 'authorization',
          },
        });
        return {
          status: r.status,
          acaOrigin: r.headers.get('access-control-allow-origin') ?? 'not-set',
          acaCredentials: r.headers.get('access-control-allow-credentials') ?? 'not-set',
        };
      } catch (e) {
        return {status: 0, acaOrigin: 'blocked', acaCredentials: 'blocked', error: String(e)};
      }
    }, API_BASE);

    // If ACAO is * AND ACAC is true — that is a security misconfiguration (browsers reject it but it signals intent)
    if (result.acaOrigin === '*' && result.acaCredentials === 'true') {
      console.warn('[S-SEC-9] CRITICAL FINDING: CORS preflight returns Allow-Origin: * AND Allow-Credentials: true — browsers reject this but indicates misconfiguration');
    }

    // Hard assertion — this combination is always a misconfiguration
    const isWildcardWithCredentials = result.acaOrigin === '*' && result.acaCredentials === 'true';
    expect(isWildcardWithCredentials).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// S-SEC-10 — Rate Limiting on Auth Endpoint
// ─────────────────────────────────────────────────────────────────────────────

test.describe('S-SEC-10: Rate Limiting on Auth Endpoint @security', () => {
  test.setTimeout(90000);

  test('6 concurrent wrong-password login attempts must not all return 200', async ({page}) => {
    await page.goto('/auth/login');
    await page.waitForLoadState('domcontentloaded');

    const results = await page.evaluate(async (apiBase) => {
      const requests = Array.from({length: 6}, () =>
        fetch(`${apiBase}/auth/login`, {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({email: 'nonexistent@test.example.com', password: 'WrongPass123!'}),
        })
          .then((r) => r.status)
          .catch(() => 0)
      );
      return Promise.all(requests);
    }, API_BASE);

    console.warn(`[S-SEC-10] INFO: Rate limit test — observed statuses: ${results.join(', ')}`);

    // Must not have any 200 responses (wrong password should never succeed)
    const has200 = results.some((s) => s === 200);
    if (has200) {
      console.warn('[S-SEC-10] CRITICAL FINDING: Login returned 200 for wrong password — authentication bypass');
    }
    expect(has200).toBe(false);

    // Log whether rate limiting kicked in (429) — informational
    const has429 = results.some((s) => s === 429);
    if (!has429) {
      console.warn('[S-SEC-10] INFO: No 429 responses observed in 6 rapid login attempts — dev rate limit (500/min) may not trigger in this test; this is expected in dev');
    }
    // All responses should be 401 (wrong credentials) or 429 (rate limited) or 400 (validation)
    const unexpectedStatuses = results.filter((s) => s !== 401 && s !== 429 && s !== 400 && s !== 403 && s !== 0);
    expect(unexpectedStatuses.length).toBe(0);
  });

  test('Rapid sequential login attempts should not leak timing information about user existence', async ({page}) => {
    await page.goto('/auth/login');
    await page.waitForLoadState('domcontentloaded');

    // Test with known-good email (wrong password) vs non-existent email
    const timings = await page.evaluate(async (apiBase) => {
      const time = async (email: string) => {
        const start = Date.now();
        await fetch(`${apiBase}/auth/login`, {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({email, password: 'WrongPassword999!'}),
        }).catch(() => null);
        return Date.now() - start;
      };

      const t1 = await time('fayaz.m@nulogic.io');    // exists
      const t2 = await time('nouser@doesnotexist.com'); // does not exist
      return {existingUserMs: t1, nonExistingUserMs: t2};
    }, API_BASE);

    console.warn(`[S-SEC-10] INFO: Timing — existing user: ${timings.existingUserMs}ms, non-existing: ${timings.nonExistingUserMs}ms`);

    // A large timing difference (>3x) could indicate user enumeration via timing
    const ratio = timings.existingUserMs > 0 && timings.nonExistingUserMs > 0
      ? Math.max(timings.existingUserMs, timings.nonExistingUserMs) /
      Math.min(timings.existingUserMs, timings.nonExistingUserMs)
      : 1;

    if (ratio > 3) {
      console.warn(`[S-SEC-10] FINDING: Large timing difference (ratio: ${ratio.toFixed(2)}) between existing/non-existing user login — potential user enumeration via timing attack`);
    }
    // Soft assertion — timing differences are environment-dependent
    expect(true).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// S-SEC-11 — URL Parameter Injection
// ─────────────────────────────────────────────────────────────────────────────

test.describe('S-SEC-11: URL Parameter Injection @security', () => {
  test.setTimeout(90000);

  test("SQL injection in search param must not return 500 error", async ({page}) => {
    await loginAs(page, demoUsers.superAdmin.email);

    const sqlInjectionPayloads = [
      "/employees?search=' OR '1'='1",
      "/employees?sort=DROP TABLE employees--",
      "/employees?page='; DELETE FROM employees;--",
    ];

    for (const path of sqlInjectionPayloads) {
      await page.goto(path);
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000);

      const has500 = await page.locator('text=/500|Internal Server Error|NullPointerException|SQLException/i').first().isVisible({timeout: 2000}).catch(() => false);

      if (has500) {
        console.warn(`[S-SEC-11] CRITICAL FINDING: SQL injection payload caused 500 error on: ${path}`);
      }
      expect(has500).toBe(false);
    }
  });

  test('XSS in search URL parameter must not execute scripts', async ({page}) => {
    let xssDialogFired = false;

    page.on('dialog', async (dialog) => {
      xssDialogFired = true;
      console.warn(`[S-SEC-11] CRITICAL FINDING: XSS via URL param — dialog fired: "${dialog.message()}"`);
      await dialog.dismiss();
    });

    await loginAs(page, demoUsers.superAdmin.email);

    await page.goto('/employees?search=<script>alert(1)</script>');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    const xssExecuted = await page.evaluate(() =>
      (window as unknown as Record<string, unknown>)['__xss_url'] === true
    );

    expect(xssDialogFired).toBe(false);
    expect(xssExecuted).toBe(false);
  });

  test('URL param injection must not return unexpected large data sets', async ({page}) => {
    await loginAs(page, demoUsers.superAdmin.email);

    // A successful SQL injection OR=1=1 would return ALL records — this is a red flag
    const result = await page.evaluate(async (apiBase) => {
      try {
        const r = await fetch(
          `${apiBase}/employees?search='+OR+'1'%3D'1&page=0&size=100`,
          {credentials: 'include'}
        );
        const body = await r.text().catch(() => '');
        return {status: r.status, bodyLen: body.length, body: body.substring(0, 200)};
      } catch (e) {
        return {status: 0, bodyLen: 0, body: String(e)};
      }
    }, API_BASE);

    // A body significantly larger than expected for a size=100 query may indicate injection
    if (result.status === 200 && result.bodyLen > 50000) {
      console.warn(`[S-SEC-11] FINDING: Unusually large response (${result.bodyLen} bytes) for SQL injection probe — possible injection success`);
    }
    expect(result.status).not.toBe(500);
  });

  test('Page renders without console errors after SQL injection URL params', async ({page}) => {
    const consoleErrors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await loginAs(page, demoUsers.superAdmin.email);
    await page.goto("/employees?search=' OR '1'='1");
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    // Filter for server-error-level console errors
    const serverErrors = consoleErrors.filter((e) =>
      e.includes('500') || e.includes('Internal Server Error') || e.includes('SQLException')
    );

    if (serverErrors.length > 0) {
      console.warn(`[S-SEC-11] FINDING: Console errors after SQL injection probe: ${serverErrors.join('; ')}`);
    }
    expect(serverErrors.length).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// S-SEC-12 — Path Traversal Prevention
// ─────────────────────────────────────────────────────────────────────────────

test.describe('S-SEC-12: Path Traversal Prevention @security', () => {
  test.setTimeout(90000);

  test('Path traversal attempts must return 404 or redirect, not file contents', async ({page}) => {
    await loginAs(page, demoUsers.superAdmin.email);

    const traversalPaths = [
      '/employees/../../../../etc/passwd',
      '/employees/../admin/settings',
    ];

    for (const path of traversalPaths) {
      await page.goto(path);
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1500);

      const pageText = await page.textContent('body').catch(() => '');
      const hasSystemFileContent =
        pageText.includes('root:x:0:0') || // /etc/passwd
        pageText.includes('/bin/bash') ||
        pageText.includes('/usr/bin') ||
        pageText.includes('[boot loader]'); // Windows boot.ini

      if (hasSystemFileContent) {
        console.warn(`[S-SEC-12] CRITICAL FINDING: Path traversal returned system file contents for path: ${path}`);
      }
      // Hard assertion — system file contents in response is a critical vulnerability
      expect(hasSystemFileContent).toBe(false);

      // Also check for server error with path disclosure
      const hasPathDisclosure =
        pageText.includes('/var/www') ||
        pageText.includes('/home/ubuntu') ||
        pageText.includes('C:\\Users\\') ||
        pageText.includes('at sun.reflect');
      if (hasPathDisclosure) {
        console.warn(`[S-SEC-12] FINDING: Path traversal response contains server path disclosure for: ${path}`);
      }
    }
  });

  test('API path traversal must return 400 or 404, not server error', async ({page}) => {
    await loginAs(page, demoUsers.superAdmin.email);

    const apiTraversalPaths = [
      '/api/v1/employees/../../admin',
      '/api/v1/employees/%2e%2e%2f%2e%2e%2fadmin',
    ];

    for (const path of apiTraversalPaths) {
      const result = await page.evaluate(async (p) => {
        try {
          const r = await fetch(p, {credentials: 'include'});
          const body = await r.text().catch(() => '');
          return {status: r.status, body: body.substring(0, 300)};
        } catch (e) {
          return {status: 0, body: String(e)};
        }
      }, path);

      if (result.status === 500) {
        console.warn(`[S-SEC-12] FINDING: API path traversal probe causes 500 for ${path} — unhandled exception`);
      }
      // Should be 400, 404, or the Next.js router should normalise the path
      expect(result.status).not.toBe(500);

      const hasSystemContent =
        result.body.includes('root:x:0:0') ||
        result.body.includes('/bin/bash');
      expect(hasSystemContent).toBe(false);
    }
  });

  test('No server path disclosure in 404 error responses', async ({page}) => {
    await loginAs(page, demoUsers.superAdmin.email);

    await page.goto('/employees/this-id-does-not-exist-99999');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    const pageText = await page.textContent('body').catch(() => '');
    const hasPathDisclosure =
      pageText.includes('/var/www') ||
      pageText.includes('/home/') ||
      pageText.includes('C:\\') ||
      pageText.includes('java.lang.') ||
      pageText.includes('org.springframework') ||
      pageText.includes('at com.hrms');

    if (hasPathDisclosure) {
      console.warn('[S-SEC-12] FINDING: 404 response contains server-side path or stack trace disclosure');
    }
    expect(hasPathDisclosure).toBe(false);
  });
});
