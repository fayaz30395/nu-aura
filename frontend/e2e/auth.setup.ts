import {expect, test as setup} from '@playwright/test';
import {demoUsers} from './fixtures/testData';
import {gotoWithRetry, loginAs} from './fixtures/helpers';

const authFile = 'playwright/.auth/user.json';

/**
 * Authentication Setup
 *
 * Runs once before all tests and stores authentication state. Uses the
 * API-backed login helper because the production login bundle may omit
 * the demo account panel and UI form failures should not block non-auth
 * suites that only need a valid session.
 *
 * Authenticates as SUPER_ADMIN (fayaz.m@nulogic.io) for broadest
 * permission coverage downstream.
 */
setup('authenticate', async ({page}) => {
  setup.setTimeout(1800000); // dev auth can stall behind Neon/Kafka/Hikari recovery in local E2E

  const defaultUser = demoUsers.superAdmin;
  await loginAs(page, defaultUser.email, {verifyDashboard: false});

  // Warm high-traffic protected routes before worker fan-out. In next dev,
  // first compile + hydration of these route chunks can exceed a normal test
  // assertion budget when three or four workers hit cold routes at once.
  const warmRoutes = process.env.E2E_SKIP_ROUTE_WARMUP === 'true' ? [] : [
    {path: '/me/dashboard', marker: /Dashboard|My Dashboard|Home/i},
    {path: '/analytics', marker: /Analytics/i},
    {path: '/announcements', marker: /Announcements/i},
    {path: '/employees', marker: /Employees/i},
    {path: '/recruitment', marker: /Recruitment/i},
    {path: '/calendar', marker: /Calendar|Today/i},
    {path: '/calendar/new', marker: /Calendar|Schedule|Event|Today/i},
    {path: '/performance', marker: /Performance/i},
    {path: '/admin/roles', marker: /Role Management/i},
    {path: '/admin/permissions', marker: /Permission/i},
    {path: '/admin/shifts', marker: /Shift Management/i},
    {path: '/admin/implicit-roles', marker: /Implicit Roles/i},
    {path: '/approvals', marker: /requests awaiting your decision/i},
    {path: '/approvals/inbox', marker: /requests awaiting your decision/i},
    {path: '/workflows', marker: /Workflow Builder/i},
    {path: '/workflows/new', marker: /Create Workflow/i},
    {path: '/employees/change-requests', marker: /Employment Change Requests/i},
  ];

  for (const route of warmRoutes) {
    await gotoWithRetry(page, route.path);
    await expect(page.locator('body')).toContainText(route.marker, {timeout: 180000});
  }

  // Store authenticated state
  await page.context().storageState({path: authFile});
});
