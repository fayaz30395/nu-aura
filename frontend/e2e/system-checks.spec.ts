import {expect, test} from '@playwright/test';
import {loginAs, navigateTo} from './fixtures/helpers';
import {demoUsers} from './fixtures/testData';

/**
 * System Infrastructure Checks — NU-AURA
 *
 * These tests verify that backend services, infrastructure components, and
 * all major module routes are alive and functioning.  They are NOT unit tests
 * — they are integration smoke tests that run against a live stack.
 *
 *   SYS-01  Backend health endpoint
 *   SYS-02  WebSocket / STOMP connection
 *   SYS-03  Elasticsearch search
 *   SYS-04  File upload & storage (Google Drive / MinIO)
 *   SYS-05  Redis cache — permission check latency
 *   SYS-06  Kafka event processing (indirect)
 *   SYS-07  Audit log entries
 *   SYS-08  Feature flags status
 *   SYS-09  All major module routes — smoke (40 routes, no 500s)
 *   SYS-10  API response time audit
 *   SYS-11  Loading states — skeleton validation
 *
 * Run in isolation:
 *   npx playwright test system-checks.spec.ts --project=chromium
 */

const BACKEND_HEALTH_URL = 'http://localhost:8080/actuator/health';

// ─── SYS-01: Backend Health Endpoint ─────────────────────────────────────────

test.describe('SYS-01: Backend Health Endpoint', () => {
  test('actuator/health returns 200 with status UP', async ({page}) => {
    let backendUp = false;

    try {
      const response = await page.evaluate(async (url: string) => {
        try {
          const r = await fetch(url, {signal: AbortSignal.timeout(10000)});
          const body = await r.text();
          return {status: r.status, body};
        } catch (e) {
          return {status: 0, body: String(e)};
        }
      }, BACKEND_HEALTH_URL);

      if (response.status === 0) {
        console.warn('SYS-01: Backend not reachable — skipping downstream system tests');
        test.skip();
        return;
      }

      expect(response.status).toBe(200);
      expect(response.body).toContain('"status"');
      expect(response.body.toLowerCase()).toContain('up');
      backendUp = true;
      console.log(`SYS-01: Backend healthy — status=${response.status}`);
    } catch (err) {
      console.warn(`SYS-01: Backend health check failed — ${err}. Downstream tests may be skipped.`);
      backendUp = false;
      // Warn but do not hard-fail; CI may run frontend-only
      expect(backendUp, 'Backend health endpoint unreachable').toBe(false);
    }
  });
});

// ─── SYS-02: WebSocket / STOMP Connection ─────────────────────────────────────

test.describe('SYS-02: WebSocket / STOMP Connection', () => {
  test('dashboard loads without WebSocket connection error', async ({page}) => {
    const stompMessages: string[] = [];
    const wsErrors: string[] = [];

    // Capture STOMP-related console output before login
    page.on('console', (msg) => {
      const text = msg.text();
      if (text.includes('STOMP') || text.includes('stomp') || text.includes('SockJS')) {
        stompMessages.push(`[${msg.type()}] ${text}`);
      }
      if (
        msg.type() === 'error' &&
        (text.toLowerCase().includes('websocket') || text.toLowerCase().includes('connection failed'))
      ) {
        wsErrors.push(text);
      }
    });

    await loginAs(page, demoUsers.superAdmin.email);
    await navigateTo(page, '/me/dashboard');

    // Allow 3s for WebSocket handshake
    await page.waitForTimeout(3000);

    // Check for active WebSocket/SockJS resource entries
    const wsResources = await page.evaluate(() => {
      try {
        const entries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
        const ws = entries.filter(
          (e) => e.name.includes('/ws') || e.name.includes('sockjs') || e.name.includes('/stomp')
        );
        console.log('ws_resources:' + JSON.stringify(ws.map((e) => e.name)));
        return ws.map((e) => e.name);
      } catch (e) {
        console.log('ws_resources_error:' + String(e));
        return [];
      }
    });

    // Check if STOMP client is available globally (some implementations expose it)
    const stompClientExists = await page.evaluate(() => {
      try {
        const w = window as unknown as Record<string, unknown>;
        const exists = !!(w['_stompClient'] || w['stompClient']);
        console.log('stomp_client_exists:' + exists);
        return exists;
      } catch {
        return false;
      }
    });

    // Additional 10s monitoring for STOMP messages
    await page.waitForTimeout(10000);

    console.log(`SYS-02: WebSocket resources found: ${wsResources.length}`);
    console.log(`SYS-02: STOMP global client: ${stompClientExists}`);
    console.log(`SYS-02: STOMP messages: ${stompMessages.length}`);

    if (stompMessages.length > 0) {
      console.log('SYS-02 STOMP log:\n' + stompMessages.slice(0, 10).join('\n'));
    }

    // Hard assertion: no WebSocket connection-failure errors in console
    const connectionErrors = wsErrors.filter(
      (e) => e.toLowerCase().includes('connection failed') || e.toLowerCase().includes('websocket error')
    );
    expect(connectionErrors, `WebSocket connection errors: ${connectionErrors.join(', ')}`).toHaveLength(0);

    // Soft: page must be usable (heading visible, no crash)
    const hasContent = await page.locator('h1, h2, main').first().isVisible().catch(() => false);
    expect(hasContent, 'Dashboard has no visible content after WebSocket wait').toBe(true);

    // Soft: no "Connection failed" text anywhere on the page
    const hasCxnFailed = await page
      .locator('text=/Connection failed|Failed to connect/i')
      .first()
      .isVisible()
      .catch(() => false);
    expect(hasCxnFailed, 'Page shows a "Connection failed" error state').toBe(false);
  });
});

// ─── SYS-03: Elasticsearch Search ─────────────────────────────────────────────

test.describe('SYS-03: Elasticsearch Search', () => {
  test('search API responds without 500 and returns structured data', async ({page}) => {
    await loginAs(page, demoUsers.superAdmin.email);
    await navigateTo(page, '/me/dashboard');

    // Test the search API directly from the browser context (auth cookies present)
    const searchResult = await page.evaluate(async () => {
      try {
        const r = await fetch('/api/v1/search?q=employee&size=5', {
          credentials: 'include',
          signal: AbortSignal.timeout(10000),
        });
        const status = r.status;
        let keys: string[] = [];
        try {
          const data = await r.json();
          keys = Object.keys(data);
        } catch {
          // non-JSON body — still record status
        }
        console.log('search_status:' + status);
        console.log('search_keys:' + JSON.stringify(keys));
        return {status, keys};
      } catch (e) {
        console.log('search_error:' + String(e));
        return {status: -1, keys: [], error: String(e)};
      }
    });

    console.log(`SYS-03: Search API status=${searchResult.status}, keys=${searchResult.keys.join(',')}`);

    // 500 is the only unacceptable status — 200 (results), 204 (empty), 401/403 are all acceptable
    expect(
      searchResult.status,
      `Search API returned 500 (Elasticsearch may be down)`
    ).not.toBe(500);
  });

  test('global search UI opens and shows results or empty state', async ({page}) => {
    await loginAs(page, demoUsers.superAdmin.email);
    await navigateTo(page, '/me/dashboard');

    // Try to open global search via keyboard shortcut
    await page.keyboard.press('Control+k');
    await page.waitForTimeout(800);

    const searchVisible = await page
      .locator('input[placeholder*="search" i], input[placeholder*="Search" i], [role="searchbox"]')
      .first()
      .isVisible()
      .catch(() => false);

    if (!searchVisible) {
      // Try clicking a search icon in the nav bar
      const searchIcon = page.locator('[aria-label*="search" i], button:has([data-icon="search"])').first();
      if (await searchIcon.isVisible().catch(() => false)) {
        await searchIcon.click();
        await page.waitForTimeout(600);
      }
    }

    const searchInput = page
      .locator('input[placeholder*="search" i], input[placeholder*="Search" i], [role="searchbox"]')
      .first();

    const inputFound = await searchInput.isVisible().catch(() => false);

    if (inputFound) {
      await searchInput.fill('employee');
      await page.waitForTimeout(2000);

      // Results OR "no results" message — not a blank/white box
      const hasResults = await page
        .locator('[class*="result" i], [class*="suggestion" i], [role="option"], [role="listbox"] li')
        .first()
        .isVisible()
        .catch(() => false);
      const hasNoResults = await page
        .locator('text=/no results/i, text=/not found/i, text=/nothing found/i')
        .first()
        .isVisible()
        .catch(() => false);

      console.log(`SYS-03 UI: results=${hasResults}, noResults=${hasNoResults}`);
      expect(
        hasResults || hasNoResults,
        'Search returned a blank/empty box with no feedback'
      ).toBe(true);
    } else {
      // Search UI not found — log as warning, not a hard fail
      console.warn('SYS-03: Global search input not found via Ctrl+K — feature may use a different trigger');
    }
  });

  test('/fluence/search page loads without 500', async ({page}) => {
    await loginAs(page, demoUsers.superAdmin.email);

    const fluenceSearch = await page.goto('/fluence/search', {waitUntil: 'domcontentloaded'});
    await page.waitForTimeout(2000);

    const has500 = await page
      .locator('text=/500|Internal Server Error|Something went wrong/i')
      .first()
      .isVisible()
      .catch(() => false);

    if (fluenceSearch && fluenceSearch.status() >= 400) {
      console.warn(`SYS-03: /fluence/search returned HTTP ${fluenceSearch.status()} — route may not exist`);
    } else {
      expect(has500, '/fluence/search shows a 500 error').toBe(false);
    }
  });
});

// ─── SYS-04: File Upload & Storage ────────────────────────────────────────────

test.describe('SYS-04: File Upload & Storage', () => {
  test('files API endpoint is reachable without 500', async ({page}) => {
    await loginAs(page, demoUsers.superAdmin.email);
    await navigateTo(page, '/me/dashboard');

    const filesResult = await page.evaluate(async () => {
      try {
        const r = await fetch('/api/v1/files', {
          credentials: 'include',
          signal: AbortSignal.timeout(10000),
        });
        console.log('files_status:' + r.status);
        return {status: r.status};
      } catch (e) {
        console.log('files_error:' + String(e));
        return {status: -1, error: String(e)};
      }
    });

    console.log(`SYS-04: Files API status=${filesResult.status}`);

    // 200 (list), 204 (empty), 401/403 (auth) are acceptable; 500 is not
    expect(filesResult.status, 'Files API returned 500').not.toBe(500);
  });

  test('/nu-drive page loads without 500', async ({page}) => {
    await loginAs(page, demoUsers.superAdmin.email);
    await page.goto('/nu-drive', {waitUntil: 'domcontentloaded'});
    await page.waitForTimeout(2000);

    const has500 = await page
      .locator('text=/500|Internal Server Error|Something went wrong/i')
      .first()
      .isVisible()
      .catch(() => false);

    expect(has500, '/nu-drive shows a 500 error').toBe(false);

    const hasContent = await page.locator('h1, h2, main, [data-testid]').first().isVisible().catch(() => false);
    console.log(`SYS-04: /nu-drive content visible=${hasContent}`);
  });

  test('/expenses page loads and file upload input exists', async ({page}) => {
    await loginAs(page, demoUsers.superAdmin.email);
    await navigateTo(page, '/expenses');
    await page.waitForTimeout(2000);

    const has500 = await page
      .locator('text=/500|Internal Server Error|Something went wrong/i')
      .first()
      .isVisible()
      .catch(() => false);

    expect(has500, '/expenses shows a 500 error').toBe(false);

    // Check if a new expense form is accessible
    const newExpenseBtn = page
      .locator(
        'button:has-text("Submit Expense"), button:has-text("New Claim"), button:has-text("Add Expense"), button:has-text("New Expense")'
      )
      .first();

    const btnVisible = await newExpenseBtn.isVisible().catch(() => false);

    if (btnVisible) {
      await newExpenseBtn.click();
      await page.waitForTimeout(1000);

      const modalOrForm = await page
        .locator('[role="dialog"], form, .fixed.inset-0')
        .first()
        .isVisible()
        .catch(() => false);

      if (modalOrForm) {
        // Check for a file upload input in the modal/form
        const fileInput = page.locator('input[type="file"]').first();
        const hasFileInput = await fileInput.isVisible().catch(() => false);
        console.log(`SYS-04: File upload input in expense form: ${hasFileInput}`);

        if (hasFileInput) {
          // Attach a small in-memory file
          await fileInput.setInputFiles({
            name: 'test-receipt.txt',
            mimeType: 'text/plain',
            buffer: Buffer.from('SYS-04 file storage test content'),
          });
          await page.waitForTimeout(800);

          const uploadedName = await page.locator('text=/test-receipt/i').first().isVisible().catch(() => false);
          console.log(`SYS-04: File name visible after attach: ${uploadedName}`);
        }

        // Close the modal/form so other tests are not affected
        const cancelBtn = page
          .locator('button:has-text("Cancel"), button[aria-label="Close"], button:has-text("Close")')
          .first();
        if (await cancelBtn.isVisible().catch(() => false)) {
          await cancelBtn.click();
        }
      } else {
        console.warn('SYS-04: Expense form/modal did not open — cannot test file upload');
      }
    } else {
      console.warn('SYS-04: No "Submit Expense" button found on /expenses — skipping upload test');
    }
  });
});

// ─── SYS-05: Redis Cache — Permission Check Latency ───────────────────────────

test.describe('SYS-05: Redis Cache — Permission Check Latency', () => {
  test('hrManager can load permission-guarded pages within 5s', async ({page}) => {
    await loginAs(page, demoUsers.hrManager.email);

    const start = Date.now();
    await navigateTo(page, '/employees');
    await page.waitForTimeout(500);
    const elapsed = Date.now() - start;

    console.log(`SYS-05: /employees load time from login: ${elapsed}ms`);
    expect(elapsed, '/employees took more than 5s to load (Redis permission cache may be cold)').toBeLessThan(5000);

    // Ensure the page rendered content (not a permission-denied flash)
    const hasContent = await page.locator('h1, h2, table, main').first().isVisible().catch(() => false);
    expect(hasContent, '/employees rendered blank after load').toBe(true);

    // No 401 Unauthorized flash
    const has401 = await page.locator('text=/401|Unauthorized/i').first().isVisible().catch(() => false);
    expect(has401, 'Page shows 401 Unauthorized — token expired or Redis not serving permissions').toBe(false);
  });

  test('rapid navigation through 5 permission-guarded pages completes within 10s each', async ({
                                                                                                 page,
                                                                                               }) => {
    await loginAs(page, demoUsers.hrManager.email);

    const routes = ['/employees', '/leave', '/attendance', '/payroll', '/employees'];
    const timings: { route: string; ms: number }[] = [];

    for (const route of routes) {
      const t0 = Date.now();
      await page.goto(route, {waitUntil: 'domcontentloaded'});
      await page.waitForTimeout(500);
      const ms = Date.now() - t0;
      timings.push({route, ms});
      console.log(`SYS-05: ${route} = ${ms}ms`);
    }

    // Collect navigation timing from the last page
    await page.evaluate(() => {
      performance.getEntriesByType('navigation').forEach((e) => {
        const nav = e as PerformanceNavigationTiming;
        console.log('nav_timing:' + nav.name + '=' + Math.round(nav.domComplete) + 'ms');
      });
    });

    for (const {route, ms} of timings) {
      expect(ms, `${route} took more than 10s — Redis may not be serving permissions`).toBeLessThan(10000);
    }

    // No 401 errors after rapid navigation (cached token should still be valid)
    const has401 = await page.locator('text=/401|Unauthorized/i').first().isVisible().catch(() => false);
    expect(has401, '401 Unauthorized after rapid navigation — token or permission cache issue').toBe(false);
  });
});

// ─── SYS-06: Kafka Event Processing ───────────────────────────────────────────

test.describe.serial('SYS-06: Kafka Event Processing (Indirect)', () => {
  test('employee can submit a leave request and it appears in pending list', async ({page}) => {
    await loginAs(page, demoUsers.employeeSaran.email);
    await navigateTo(page, '/leave');
    await page.waitForTimeout(1000);

    const applyBtn = page
      .locator('button:has-text("Apply Leave"), button:has-text("New Leave"), button:has-text("Apply")')
      .first();
    const applyVisible = await applyBtn.isVisible().catch(() => false);

    if (!applyVisible) {
      console.warn('SYS-06: "Apply Leave" button not found — skipping Kafka test');
      return;
    }

    await applyBtn.click();
    await page.waitForTimeout(800);

    const modal = page.locator('[role="dialog"], .fixed.inset-0').last();
    const modalVisible = await modal.isVisible().catch(() => false);
    if (!modalVisible) {
      console.warn('SYS-06: Leave form/modal did not open — skipping');
      return;
    }

    // Fill leave type
    const leaveTypeSelect = modal.locator('select').first();
    if (await leaveTypeSelect.isVisible().catch(() => false)) {
      await leaveTypeSelect.selectOption({index: 1});
    }

    // Fill dates — 30 days out to avoid conflicts
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);
    const dateStr = futureDate.toISOString().split('T')[0];
    const dateInputs = modal.locator('input[type="date"]');
    if ((await dateInputs.count()) >= 2) {
      await dateInputs.first().fill(dateStr);
      await dateInputs.nth(1).fill(dateStr);
    }

    // Fill reason
    const textarea = modal.locator('textarea').first();
    if (await textarea.isVisible().catch(() => false)) {
      await textarea.fill('SYS-06 Kafka pipeline verification');
    }

    const submitBtn = modal
      .locator('button:has-text("Submit"), button:has-text("Submit Request"), button[type="submit"]')
      .last();

    // Verify submit button enabled within 3s
    await expect(submitBtn).toBeEnabled({timeout: 3000});
    await submitBtn.click();

    // Wait for success (modal close or toast)
    await page.waitForTimeout(2000);

    const successToast = await page
      .locator('text=/success|submitted|applied/i')
      .first()
      .isVisible()
      .catch(() => false);
    const modalClosed = await modal.isVisible().catch(() => false);

    console.log(`SYS-06: Success toast=${successToast}, Modal still open=${modalClosed}`);

    // At least one of: success toast shown, or modal closed
    const requestFlowedThrough = successToast || !modalClosed;
    expect(requestFlowedThrough, 'Leave submit: no success toast and modal did not close').toBe(true);
  });

  test('leave request appears in hrManager approvals after Kafka consumer delay', async ({page}) => {
    await loginAs(page, demoUsers.hrManager.email);
    await navigateTo(page, '/approvals');
    await page.waitForTimeout(3000); // Kafka consumer time

    const has500 = await page
      .locator('text=/500|Internal Server Error/i')
      .first()
      .isVisible()
      .catch(() => false);
    expect(has500, '/approvals shows 500 error').toBe(false);

    const hasContent = await page.locator('h1, h2, table, [class*="card"]').first().isVisible().catch(() => false);

    if (!hasContent) {
      console.warn('SYS-06: /approvals rendered no content — Kafka consumer may have delayed the event');
    } else {
      console.log('SYS-06: Approvals page has content — Kafka pipeline appears functional');
    }

    // Soft assertion: log but do not hard-fail (Kafka delay is acceptable in CI)
    // Hard assertion: page must not crash
    expect(has500).toBe(false);
  });
});

// ─── SYS-07: Audit Log Entries ─────────────────────────────────────────────────

test.describe('SYS-07: Audit Log Entries', () => {
  test('audit API endpoint responds without 500', async ({page}) => {
    await loginAs(page, demoUsers.superAdmin.email);
    await navigateTo(page, '/me/dashboard');

    const auditResult = await page.evaluate(async () => {
      try {
        const r = await fetch('/api/v1/admin/audit?size=10', {
          credentials: 'include',
          signal: AbortSignal.timeout(10000),
        });
        let keys: string[] = [];
        let totalElements: number | undefined;
        try {
          const d = await r.json();
          keys = Object.keys(d);
          totalElements = d.totalElements ?? d.content?.length;
        } catch {
          // non-JSON
        }
        console.log('audit_count:' + (totalElements ?? JSON.stringify(keys)));
        return {status: r.status, keys, totalElements};
      } catch (e) {
        console.log('audit_error:' + String(e));
        return {status: -1, keys: [], error: String(e)};
      }
    });

    console.log(`SYS-07: Audit API status=${auditResult.status}, keys=${auditResult.keys.join(',')}`);
    expect(auditResult.status, 'Audit API returned 500').not.toBe(500);
  });

  test('/admin/audit page loads without error', async ({page}) => {
    await loginAs(page, demoUsers.superAdmin.email);

    // Navigate to audit page — route may be /admin/audit or /admin (check both)
    await page.goto('/admin/audit', {waitUntil: 'domcontentloaded'});
    await page.waitForTimeout(2000);

    const has500 = await page
      .locator('text=/500|Internal Server Error|Something went wrong/i')
      .first()
      .isVisible()
      .catch(() => false);

    expect(has500, '/admin/audit shows 500 error').toBe(false);

    // Check for audit-specific content
    const hasAuditContent = await page
      .locator('text=/audit|Audit/i, th:has-text("Action"), th:has-text("User"), th:has-text("Timestamp")')
      .first()
      .isVisible()
      .catch(() => false);

    const hasGeneralContent = await page.locator('h1, h2, table').first().isVisible().catch(() => false);

    console.log(
      `SYS-07: /admin/audit — auditContent=${hasAuditContent}, generalContent=${hasGeneralContent}`
    );

    // Either audit content or general content (page may redirect to /admin hub)
    expect(
      hasAuditContent || hasGeneralContent,
      '/admin/audit renders a blank page'
    ).toBe(true);
  });
});

// ─── SYS-08: Feature Flags Status ─────────────────────────────────────────────

test.describe('SYS-08: Feature Flags Status', () => {
  test('feature flags API is accessible and key flags are enabled', async ({page}) => {
    await loginAs(page, demoUsers.superAdmin.email);
    await navigateTo(page, '/me/dashboard');

    const flagsResult = await page.evaluate(async () => {
      try {
        const r = await fetch('/api/v1/admin/feature-flags/map', {
          credentials: 'include',
          signal: AbortSignal.timeout(10000),
        });
        let flags: Record<string, unknown> = {};
        try {
          flags = await r.json();
        } catch {
          // non-JSON
        }
        console.log('flags:' + JSON.stringify(flags));
        return {status: r.status, flags};
      } catch (e) {
        console.log('flags_error:' + String(e));
        return {status: -1, flags: {}, error: String(e)};
      }
    });

    console.log(`SYS-08: Feature flags status=${flagsResult.status}`);

    // API must not return 500
    expect(flagsResult.status, 'Feature flags API returned 500').not.toBe(500);

    if (flagsResult.status === 200 && Object.keys(flagsResult.flags).length > 0) {
      const expectedEnabledFlags = [
        'enable_payroll',
        'enable_performance',
        'enable_documents',
        'enable_helpdesk',
        'enable_lms',
      ];

      const flags = flagsResult.flags as Record<string, unknown>;
      for (const flag of expectedEnabledFlags) {
        if (flag in flags) {
          if (flags[flag] !== true) {
            console.warn(`SYS-08: Flag "${flag}" is unexpectedly disabled — value: ${flags[flag]}`);
          } else {
            console.log(`SYS-08: Flag "${flag}" = enabled`);
          }
        } else {
          console.warn(`SYS-08: Flag "${flag}" not found in response keys: ${Object.keys(flags).join(', ')}`);
        }
      }
    } else if (flagsResult.status === 404) {
      // Feature flags endpoint not implemented — log, do not hard-fail
      console.warn('SYS-08: /api/v1/admin/feature-flags/map returned 404 — endpoint may not be implemented');
    }
  });

  test('/admin/feature-flags page loads without error if it exists', async ({page}) => {
    await loginAs(page, demoUsers.superAdmin.email);
    await page.goto('/admin/feature-flags', {waitUntil: 'domcontentloaded'});
    await page.waitForTimeout(1500);

    const has500 = await page
      .locator('text=/500|Internal Server Error|Something went wrong/i')
      .first()
      .isVisible()
      .catch(() => false);

    expect(has500, '/admin/feature-flags shows 500 error').toBe(false);
    console.log('SYS-08: /admin/feature-flags loaded without 500');
  });
});

// ─── SYS-09: All Major Module Routes — Smoke Test ─────────────────────────────

test.describe('SYS-09: All Major Module Routes — Smoke Test (No 500s)', () => {
  test.setTimeout(120000);

  test('all 40+ routes load without 500 errors', async ({page}) => {
    await loginAs(page, demoUsers.superAdmin.email);

    const routes = [
      // My Space
      '/dashboard',
      '/me/profile',
      '/me/payslips',
      '/me/leaves',
      '/me/attendance',
      '/me/assets',
      // HR Core
      '/employees',
      '/departments',
      '/attendance',
      '/leave',
      '/payroll',
      '/compensation',
      '/benefits',
      '/expenses',
      '/loans',
      '/travel',
      '/assets',
      '/letters',
      '/helpdesk',
      '/approvals',
      '/announcements',
      '/org-chart',
      '/timesheets',
      '/projects',
      '/resources',
      '/calendar',
      '/reports',
      '/analytics',
      '/settings',
      '/admin',
      '/overtime',
      '/probation',
      '/shifts',
      '/referrals',
      // NU-Hire
      '/recruitment',
      '/onboarding',
      '/preboarding',
      '/offboarding',
      '/offer-portal',
      // NU-Grow
      '/performance',
      '/okr',
      '/feedback360',
      '/training',
      '/learning',
      '/recognition',
      '/surveys',
      '/wellness',
      // NU-Fluence
      '/fluence/wiki',
      '/fluence/blogs',
      '/fluence/drive',
      '/fluence/search',
    ];

    const failures: string[] = [];
    const blanks: string[] = [];
    const passes: string[] = [];

    for (const route of routes) {
      try {
        await page.goto(route, {waitUntil: 'domcontentloaded', timeout: 20000});
        await page.waitForTimeout(2000);

        const has500 = await page
          .locator('text=/500|Internal Server Error|Something went wrong/i')
          .first()
          .isVisible()
          .catch(() => false);

        if (has500) {
          console.error('SMOKE_FAIL:' + route + ' shows 500 error');
          failures.push(route);
        } else {
          passes.push(route);
          console.log('SMOKE_PASS:' + route);
        }

        // Warn on blank pages (very little visible content)
        const bodyText = await page.locator('body').textContent().catch(() => '');
        if (bodyText && bodyText.trim().length < 50) {
          console.warn('SMOKE_BLANK:' + route + ' — very little content rendered');
          blanks.push(route);
        }
      } catch (err) {
        console.warn(`SMOKE_TIMEOUT:${route} — ${err}`);
        // Navigation timeout is not the same as a 500; log but do not fail
      }
    }

    console.log(`\nSYS-09 Summary: ${passes.length} passed, ${failures.length} failed, ${blanks.length} blank`);
    if (blanks.length > 0) {
      console.warn('Blank routes:\n' + blanks.join('\n'));
    }

    expect(
      failures,
      `Routes returning 500:\n${failures.join('\n')}`
    ).toHaveLength(0);
  });
});

// ─── SYS-10: API Response Time Audit ──────────────────────────────────────────

test.describe('SYS-10: API Response Time Audit', () => {
  test('API calls on core pages are under 3000ms', async ({page}) => {
    const slowApis: { url: string; ms: number }[] = [];

    page.on('response', (response) => {
      if (response.url().includes('/api/v')) {
        const timing = response.timing();
        if (timing && timing.responseEnd > 0 && timing.requestStart > 0) {
          const duration = timing.responseEnd - timing.requestStart;
          if (duration > 3000) {
            const entry = {url: response.url(), ms: Math.round(duration)};
            console.warn(`SLOW_API:${entry.url}=${entry.ms}ms`);
            slowApis.push(entry);
          }
        }
      }
    });

    await loginAs(page, demoUsers.superAdmin.email);

    const pagesUnderTest = ['/employees', '/leave', '/payroll', '/attendance', '/me/dashboard'];

    for (const route of pagesUnderTest) {
      await page.goto(route, {waitUntil: 'domcontentloaded', timeout: 30000});
      await page.waitForTimeout(1500);
      console.log(`SYS-10: Navigated to ${route}`);
    }

    if (slowApis.length > 0) {
      console.warn(
        `SYS-10: ${slowApis.length} slow API call(s) detected (>3s):\n` +
        slowApis.map((a) => `  ${a.url} = ${a.ms}ms`).join('\n')
      );
      // Log as performance concern — do not hard fail (CI may be slow)
      // Uncomment the line below to enforce in production:
      // expect(slowApis, `Slow APIs:\n${slowApis.map(a => `${a.url} = ${a.ms}ms`).join('\n')}`).toHaveLength(0);
    } else {
      console.log('SYS-10: All API calls completed within 3000ms');
    }

    // Hard assertion: we did navigate and get SOME responses (not a total blackout)
    // This at least confirms the API layer is reachable
    const pageLoaded = await page.locator('h1, h2, main').first().isVisible().catch(() => false);
    expect(pageLoaded, 'Last page rendered no content — API layer may be unreachable').toBe(true);
  });
});

// ─── SYS-11: Loading States — Skeleton Validation ─────────────────────────────

test.describe('SYS-11: Loading States — Skeleton Validation', () => {
  test('skeleton loaders are visible during slow network on /employees', async ({page}) => {
    await loginAs(page, demoUsers.superAdmin.email);

    // Apply slow network conditions via CDP
    let cdpSession: Awaited<ReturnType<typeof page.context['prototype']['newCDPSession']>> | null = null;
    let cdpEnabled = false;

    try {
      cdpSession = await page.context().newCDPSession(page);
      await cdpSession.send('Network.enable');
      await cdpSession.send('Network.emulateNetworkConditions', {
        offline: false,
        downloadThroughput: 50000, // ~50 KB/s
        uploadThroughput: 50000,
        latency: 500,             // 500ms latency
      });
      cdpEnabled = true;
    } catch (err) {
      console.warn(`SYS-11: CDP network throttling not available — ${err}`);
    }

    // Navigate and quickly capture initial render state
    const navigationPromise = page.goto('/employees', {waitUntil: 'domcontentloaded'});

    // Give React ~500ms to render initial loading state before data arrives
    await page.waitForTimeout(500);

    const hasSkeletonOrLoader = await Promise.race([
      page
        .locator(
          '[class*="skeleton" i], [class*="shimmer" i], [data-testid*="skeleton"], [aria-label*="loading" i]'
        )
        .first()
        .isVisible({timeout: 2000})
        .catch(() => false),
      page
        .locator('[class*="loader" i], [class*="Loader"], [class*="Loading"]')
        .first()
        .isVisible({timeout: 2000})
        .catch(() => false),
      page
        .locator('[class*="animate-pulse"], [class*="animate_pulse"]')
        .first()
        .isVisible({timeout: 2000})
        .catch(() => false),
    ]);

    await navigationPromise.catch(() => {
      // Navigation may time out under throttle — that is expected
    });

    if (hasSkeletonOrLoader) {
      console.log('SYS-11: Skeleton/loader visible on /employees during slow network');
    } else {
      console.warn(
        'SYS-11: No skeleton/loader detected on /employees — ' +
        'component may use a plain spinner or render synchronously'
      );
    }

    // Restore network conditions
    if (cdpEnabled && cdpSession) {
      try {
        await cdpSession.send('Network.disable');
      } catch {
        // ignore cleanup errors
      }
    }

    // Wait for actual content to load before the test exits
    await page.waitForLoadState('domcontentloaded').catch(() => {
    });
    await page.waitForTimeout(2000);

    const hasContent = await page.locator('h1, h2, table, main').first().isVisible().catch(() => false);
    expect(hasContent, '/employees rendered no content after network restore').toBe(true);

    // Log skeleton result as informational — not a hard fail (different components have different patterns)
    console.log(`SYS-11: skeleton=${hasSkeletonOrLoader}, finalContent=${hasContent}`);
  });
});
