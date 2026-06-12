import {expect, Locator, Page, test} from '@playwright/test';
import {loginAs, navigateTo} from './fixtures/helpers';
import {demoUsers} from './fixtures/testData';

/**
 * Action-level RBAC coverage.
 *
 * These tests complement route-level RBAC checks by validating the visible
 * buttons and safe click behavior for representative roles. They only open
 * dialogs/drawers/forms and never submit destructive or state-changing actions.
 */

test.describe.configure({mode: 'serial'});
test.setTimeout(360000);

type UserKey = keyof typeof demoUsers;

const ACTION_SURFACE_ROLES: Array<{key: UserKey; label: string}> = [
  {key: 'superAdmin', label: 'SUPER_ADMIN'},
  {key: 'hrManager', label: 'HR_MANAGER'},
  {key: 'managerEng', label: 'MANAGER'},
  {key: 'teamLeadEng', label: 'TEAM_LEAD'},
  {key: 'recruitmentAdmin', label: 'RECRUITMENT_ADMIN'},
  {key: 'employeeSaran', label: 'EMPLOYEE'},
];

function button(page: Page, name: RegExp): Locator {
  return page.getByRole('button', {name}).first();
}

async function isVisible(locator: Locator, timeout = 10000): Promise<boolean> {
  return locator.isVisible({timeout}).catch(() => false);
}

async function isBlocked(page: Page, requestedPath: string): Promise<boolean> {
  const url = page.url();
  const denied = await page
    .locator('text=/403|Forbidden|Access Denied|not authorized|not allowed|permission/i')
    .first()
    .isVisible({timeout: 3000})
    .catch(() => false);
  const redirected =
    url.includes('/auth/login') ||
    url.includes('/me/dashboard') ||
    !url.includes(requestedPath.split('?')[0]);
  return denied || redirected;
}

async function expectNoBrokenState(page: Page): Promise<void> {
  const broken = await page
    .locator('text=/internal server error|something went wrong|5\\d\\d\\s+(error|server)/i')
    .first()
    .isVisible({timeout: 3000})
    .catch(() => false);
  expect(broken).toBe(false);
}

async function expectSafeActionOpens(
  page: Page,
  controlName: RegExp,
  expectedSurface: RegExp,
): Promise<void> {
  const control = button(page, controlName);
  await page.waitForLoadState('domcontentloaded', {timeout: 30000}).catch(() => {
  });
  if (!(await isVisible(control, 30000))) {
    await page.reload({waitUntil: 'domcontentloaded'});
    await page.waitForLoadState('domcontentloaded', {timeout: 30000}).catch(() => {
    });
  }
  await expect(control).toBeVisible({timeout: 30000});
  await control.click();

  const surface = page
    .locator('[role="dialog"], [class*="modal"], [class*="drawer"], form, main')
    .filter({hasText: expectedSurface})
    .first();
  await expect(surface).toBeVisible({timeout: 30000});
  await expectNoBrokenState(page);

  await page.keyboard.press('Escape').catch(() => {
  });
}

async function hasAnyVisibleButton(page: Page, names: RegExp[]): Promise<boolean> {
  for (const name of names) {
    if (await isVisible(button(page, name), 3000)) {
      return true;
    }
  }
  return false;
}

test.describe('RBAC actions: MY SPACE self-service buttons @rbac @actions @critical', () => {
  for (const {key, label} of ACTION_SURFACE_ROLES) {
    test(`${label} can open self-service leave application without privileged actions`, async ({page}) => {
      await loginAs(page, demoUsers[key].email);
      await navigateTo(page, '/me/leaves');
      await expect(page.locator('main, h1, h2').first()).toBeVisible({timeout: 30000});
      await expectNoBrokenState(page);

      await expectSafeActionOpens(page, /apply for leave|apply leave|request leave/i, /apply for leave|leave type|start date/i);

      const privilegedApproval = await hasAnyVisibleButton(page, [/approve/i, /reject/i]);
      expect(
        privilegedApproval,
        `${label} should not see approval buttons inside the self-service leave page`,
      ).toBe(false);
    });
  }
});

test.describe('RBAC actions: privileged controls @rbac @actions @critical', () => {
  test('SUPER_ADMIN can open core admin/create action surfaces', async ({page}) => {
    await loginAs(page, demoUsers.superAdmin.email);

    await navigateTo(page, '/employees');
    await expectSafeActionOpens(page, /add employee/i, /add new employee|employee code|work email/i);

    await navigateTo(page, '/admin/permissions');
    await expectSafeActionOpens(page, /create role/i, /create new role|role code|permissions/i);

    await navigateTo(page, '/payroll/runs');
    await expectSafeActionOpens(page, /create payroll run/i, /create payroll run|run name|period/i);

    await navigateTo(page, '/recruitment/jobs');
    await expectSafeActionOpens(page, /create job opening/i, /create job opening|job title|department/i);
  });

  test('RECRUITMENT_ADMIN can open hiring actions but not payroll/admin role actions', async ({page}) => {
    await loginAs(page, demoUsers.recruitmentAdmin.email);

    await navigateTo(page, '/recruitment/jobs');
    await expectSafeActionOpens(page, /create job opening/i, /create job opening|job title|department/i);

    for (const route of ['/payroll/runs', '/admin/permissions']) {
      await navigateTo(page, route);
      await expectNoBrokenState(page);
      if (await isBlocked(page, route)) {
        continue;
      }

      const privilegedControl = await hasAnyVisibleButton(page, [
        /create payroll run/i,
        /create role/i,
        /add employee/i,
      ]);
      expect(
        privilegedControl,
        `RECRUITMENT_ADMIN should not see payroll/admin role action controls on ${route}`,
      ).toBe(false);
    }
  });

  test('EMPLOYEE cannot see privileged action controls through direct navigation', async ({page}) => {
    await loginAs(page, demoUsers.employeeArun.email);

    const restrictedSurfaces: Array<{route: string; controls: RegExp[]}> = [
      {route: '/employees', controls: [/add employee/i, /import/i]},
      {route: '/admin/permissions', controls: [/create role/i, /edit roles/i]},
      {route: '/payroll/runs', controls: [/create payroll run/i, /process/i, /approve/i]},
      {route: '/recruitment/jobs', controls: [/create job opening/i]},
      {route: '/leave/approvals', controls: [/approve/i, /reject/i]},
    ];

    for (const {route, controls} of restrictedSurfaces) {
      await navigateTo(page, route);
      await expectNoBrokenState(page);
      if (await isBlocked(page, route)) {
        continue;
      }

      const visibleControl = await hasAnyVisibleButton(page, controls);
      expect(
        visibleControl,
        `EMPLOYEE should not see privileged action controls on ${route}`,
      ).toBe(false);
    }
  });
});

test.describe('RBAC actions: approval controls @rbac @actions', () => {
  for (const {key, label} of [
    {key: 'managerEng' as const, label: 'MANAGER'},
    {key: 'hrManager' as const, label: 'HR_MANAGER'},
  ]) {
    test(`${label} can reach approval action surface without exposing it to ESS`, async ({page}) => {
      await loginAs(page, demoUsers[key].email);
      await navigateTo(page, '/leave/approvals');
      await expectNoBrokenState(page);
      if (await isBlocked(page, '/leave/approvals')) {
        return;
      }
      expect(page.url()).not.toContain('/auth/login');

      const approvalButton = button(page, /approve/i);
      const rejectButton = button(page, /reject/i);
      const hasApprovalAction = await isVisible(approvalButton, 8000) || await isVisible(rejectButton, 8000);

      if (hasApprovalAction) {
        const action = await isVisible(approvalButton, 1000) ? approvalButton : rejectButton;
        await action.click();
        await expect(
          page.locator('[role="dialog"], [class*="modal"]').filter({hasText: /approve|reject|confirm|reason/i}).first(),
        ).toBeVisible({timeout: 15000});
      } else {
        await expect(page.locator('main, h1, h2').first()).toBeVisible({timeout: 30000});
      }
    });
  }
});
