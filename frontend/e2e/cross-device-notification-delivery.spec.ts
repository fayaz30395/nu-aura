import {expect, test} from '@playwright/test';
import {loginAs} from './fixtures/helpers';
import {demoUsers} from './fixtures/testData';

/**
 * Phase 5 (release-readiness /goal): smallest realistic cross-device notification
 * delivery + isolation test, using existing authorized infrastructure only —
 * no new backend endpoint, no elaborate new test framework.
 *
 * Path: a real authorized action (POST /notifications, NOTIFICATIONS:CREATE,
 * used by NotificationController.createNotification -> persists via
 * NotificationService, tenant-scoped) targets employeeSaran's userId. Two
 * separate browser contexts logged in as employeeSaran (simulating Device A /
 * Device B) both read it back via GET /notifications/unread — proving delivery
 * reaches a second session for the SAME user, not just the session that
 * triggered it. A third context logged in as a DIFFERENT user (managerEng)
 * confirms the notification is NOT visible there — tenant isolation via
 * NotificationRepository's userId scoping.
 */
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api/v1';
const NULOGIC_TENANT_ID = '660e8400-e29b-41d4-a716-446655440001';

interface LoginResult {
  userId: string;
  tenantId: string;
  accessToken?: string | null;
}

async function apiLogin(request: import('@playwright/test').APIRequestContext, email: string, password: string): Promise<LoginResult> {
  const response = await request.post(`${API_BASE}/auth/login`, {
    data: {email, password},
    failOnStatusCode: true,
  });
  const body = await response.json();
  return {userId: body.userId, tenantId: body.tenantId};
}

function csrfHeader(cookies: {name: string; value: string}[]): Record<string, string> {
  const token = cookies.find((c) => c.name === 'XSRF-TOKEN')?.value;
  return token ? {'X-XSRF-TOKEN': token} : {};
}

test.describe('Cross-device notification delivery (Phase 5)', () => {
  test('same-user notification reaches a second device session and is invisible to a different user', async ({browser, request}) => {
    test.setTimeout(90000);

    const marker = `e2e-cross-device-${Date.now()}`;
    const title = `Cross-device delivery ${marker}`;
    const message = `Notification targeted at employeeSaran for ${marker}`;

    // 1. Log in as SUPER_ADMIN (NOTIFICATIONS:CREATE) to discover employeeSaran's
    //    userId and create the targeted notification via the real authorized endpoint.
    const adminContext = await browser.newContext();
    const adminPage = await adminContext.newPage();
    await loginAs(adminPage, demoUsers.superAdmin.email, {verifyDashboard: false});
    const adminCookies = await adminContext.cookies();

    const targetLogin = await apiLogin(request, demoUsers.employeeSaran.email, demoUsers.employeeSaran.password);

    const createResponse = await adminPage.evaluate(async ({url, tenantId, headers, data}) => {
      const result = await fetch(url, {
        method: 'POST',
        credentials: 'include',
        headers: {'Content-Type': 'application/json', 'X-Tenant-ID': tenantId, ...headers},
        body: JSON.stringify(data),
      });
      return {status: result.status, body: await result.text().catch(() => '')};
    }, {
      url: `${API_BASE}/notifications`,
      tenantId: NULOGIC_TENANT_ID,
      headers: csrfHeader(adminCookies),
      data: {
        userId: targetLogin.userId,
        type: 'GENERAL',
        title,
        message,
      },
    });
    expect(createResponse.status, createResponse.body).toBe(201);
    await adminContext.close();

    // 2. Device A: employeeSaran, first session.
    const deviceAContext = await browser.newContext();
    const deviceAPage = await deviceAContext.newPage();
    await loginAs(deviceAPage, demoUsers.employeeSaran.email, {verifyDashboard: false});
    const deviceACookies = await deviceAContext.cookies();

    const deviceAUnread = await deviceAPage.evaluate(async ({url, headers}) => {
      const result = await fetch(url, {method: 'GET', credentials: 'include', headers});
      return (await result.json()) as Array<{title: string; message: string}>;
    }, {url: `${API_BASE}/notifications/unread`, headers: csrfHeader(deviceACookies)});

    expect(deviceAUnread.some((n) => n.title === title)).toBe(true);
    await deviceAContext.close();

    // 3. Device B: employeeSaran, SEPARATE browser context (simulates a second
    //    device/session for the same user) — must see the same notification.
    const deviceBContext = await browser.newContext();
    const deviceBPage = await deviceBContext.newPage();
    await loginAs(deviceBPage, demoUsers.employeeSaran.email, {verifyDashboard: false});
    const deviceBCookies = await deviceBContext.cookies();

    const deviceBUnread = await deviceBPage.evaluate(async ({url, headers}) => {
      const result = await fetch(url, {method: 'GET', credentials: 'include', headers});
      return (await result.json()) as Array<{title: string; message: string}>;
    }, {url: `${API_BASE}/notifications/unread`, headers: csrfHeader(deviceBCookies)});

    expect(deviceBUnread.some((n) => n.title === title), 'Device B (same user, second session) did not see the notification').toBe(true);
    await deviceBContext.close();

    // 4. A DIFFERENT user must never see employeeSaran's notification.
    const otherUserContext = await browser.newContext();
    const otherUserPage = await otherUserContext.newPage();
    await loginAs(otherUserPage, demoUsers.managerEng.email, {verifyDashboard: false});
    const otherUserCookies = await otherUserContext.cookies();

    const otherUserUnread = await otherUserPage.evaluate(async ({url, headers}) => {
      const result = await fetch(url, {method: 'GET', credentials: 'include', headers});
      return (await result.json()) as Array<{title: string; message: string}>;
    }, {url: `${API_BASE}/notifications/unread`, headers: csrfHeader(otherUserCookies)});

    expect(otherUserUnread.some((n) => n.title === title), 'A different user saw employeeSaran\'s notification — isolation broken').toBe(false);
    await otherUserContext.close();
  });
});
