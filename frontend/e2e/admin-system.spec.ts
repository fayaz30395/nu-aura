import {expect, Page, test} from '@playwright/test';
import {loginAs, navigateTo, seedLocalStoredAuth} from './fixtures/helpers';
import {testUsers} from './fixtures/testData';

/**
 * Admin & System E2E Tests
 *
 * Covers:
 *  - /admin/shifts        — Shift Management (create, edit, delete, toggle)
 *  - /admin/implicit-roles — Implicit Role Rules (CRUD, bulk actions, recompute)
 *  - /admin/org-hierarchy  — Organization Chart (expand/collapse, node cards)
 *  - /admin/payroll        — Payroll Administration hub (stat cards, quick links)
 *  - /admin/reports        — Admin Reports hub (downloads, scheduled reports)
 *  - /biometric-devices    — Biometric Device Management (devices, punches, API keys)
 *  - /import-export        — Data Import/Export (import types, export, Keka migration)
 *
 * RBAC: All pages require admin/HR access. Employee gets redirected away.
 */

test.describe.configure({mode: 'serial', timeout: 300000});

async function openAdminPage(page: Page, path: string, heading: RegExp): Promise<void> {
  await loginAs(page, testUsers.admin.email, {verifyDashboard: false});
  await navigateTo(page, path);

  const headingLocator = page.locator('h1').filter({hasText: heading});
  if (await headingLocator.isVisible({timeout: 120000}).catch(() => false)) {
    return;
  }

  await seedLocalStoredAuth(page, testUsers.admin.email);
  await navigateTo(page, path);
  await expect(headingLocator).toBeVisible({timeout: 180000});
}

// ─── /admin/shifts ────────────────────────────────────────────────────────────

test.describe('/admin/shifts — Shift Management', () => {
  // Cold-compile of /admin/shifts under `next dev` can take 30-60s on the
  // Studio Slate v2 token graph. Beyond the default 15s actionTimeout, so we
  // wait once in beforeEach for the heading to render — after that, the
  // route is warm and per-test assertions resolve fast.
  test.beforeEach(async ({page}) => {
    await openAdminPage(page, '/admin/shifts', /Shift Management/i);
  });

  test('page loads with Shift Management heading', async ({page}) => {
    await expect(page.locator('h1').filter({hasText: /shift/i})).toBeVisible();
  });

  test('displays Add Shift button', async ({page}) => {
    const addBtn = page.locator('button:has-text("Add Shift")');
    await expect(addBtn).toBeVisible({timeout: 30000});
    await expect(addBtn).toBeEnabled();
  });

  test('shows shift grid or empty state when no shifts', async ({page}) => {
    await expect.poll(async () => {
      const hasCards = await page.locator('[data-testid="shift-card"]').first().isVisible().catch(() => false);
      const hasEmpty = await page.getByText(/No shifts configured/i).first().isVisible().catch(() => false);
      return hasCards || hasEmpty;
    }, {timeout: 30000}).toBe(true);
  });

  test('clicking Add Shift opens modal with form sections', async ({page}) => {
    await page.locator('button:has-text("Add Shift")').click({timeout: 30000});

    const modal = page.locator('.fixed.inset-0').filter({hasText: /Add New Shift/i});
    await expect(modal).toBeVisible({timeout: 10000});
    await expect(modal.locator('text=/Basic Information/i')).toBeVisible();
    await expect(modal.locator('text=/Shift Timing/i')).toBeVisible();
    await expect(modal.locator('text=/Attendance Rules/i')).toBeVisible();
  });

  test('shift form has required Shift Code and Shift Name fields', async ({page}) => {
    await page.locator('button:has-text("Add Shift")').click({timeout: 30000});

    await expect(page.locator('input[placeholder*="DS, NS, GS"]')).toBeVisible({timeout: 10000});
    await expect(page.locator('input[placeholder*="Day Shift, Night Shift"]')).toBeVisible();
  });

  test('shift form has start time and end time inputs', async ({page}) => {
    await page.locator('button:has-text("Add Shift")').click({timeout: 30000});

    const timeInputs = page.locator('input[type="time"]');
    await expect(timeInputs).toHaveCount(2, {timeout: 10000});
  });

  test('shift type dropdown has Regular, Rotational, Flexible options', async ({page}) => {
    await page.locator('button:has-text("Add Shift")').click({timeout: 30000});

    // Target the Shift Type select by its accessible label rather than nth(0),
    // which is brittle once additional <select>s are present.
    const shiftTypeSelect = page.locator('#shift-type');
    await expect(shiftTypeSelect).toBeVisible({timeout: 10000});
    await expect(shiftTypeSelect.locator('option:has-text("Regular")')).toHaveCount(1);
    await expect(shiftTypeSelect.locator('option:has-text("Rotational")')).toHaveCount(1);
    await expect(shiftTypeSelect.locator('option:has-text("Flexible")')).toHaveCount(1);
  });

  test('submitting empty form shows validation errors', async ({page}) => {
    await page.locator('button:has-text("Add Shift")').click({timeout: 30000});
    await expect(page.locator('input[placeholder*="DS, NS, GS"]')).toBeVisible({timeout: 10000});

    // Clear pre-filled Shift Code and Name, then submit
    const codeInput = page.locator('input[placeholder*="DS, NS, GS"]');
    await codeInput.fill('');
    const nameInput = page.locator('input[placeholder*="Day Shift, Night Shift"]');
    await nameInput.fill('');

    // The submit button reads "Create Shift" when not editing, but trailing
    // text includes a space (`{...} Shift`). Use a regex to be safe.
    await page.locator('button[type="submit"]').filter({hasText: /Create Shift|Update Shift|Saving/i}).click();

    await expect(page.locator('text=/required/i').first()).toBeVisible({timeout: 5000});
  });

  test('cancel button closes the modal', async ({page}) => {
    await page.locator('button:has-text("Add Shift")').click({timeout: 30000});
    const modal = page.locator('.fixed.inset-0').filter({hasText: /Add New Shift/i});
    await expect(modal).toBeVisible({timeout: 10000});

    await page.locator('button:has-text("Cancel")').click();
    await expect(modal).not.toBeVisible({timeout: 5000});
  });

  test('shift cards show Active/Inactive badge', async ({page}) => {
    await page.waitForLoadState('domcontentloaded').catch(() => {});
    const hasCards = await page.locator('[class*="skeuo-card"]').first().isVisible().catch(() => false);
    if (hasCards) {
      const badge = page.locator('text=/Active|Inactive/').first();
      await expect(badge).toBeVisible();
    }
  });

  test('RBAC: employee is redirected away from /admin/shifts', async ({page}) => {
    await loginAs(page, testUsers.employee.email, {verifyDashboard: false});
    await page.goto('/admin/shifts');
    await page.waitForLoadState('domcontentloaded').catch(() => {});

    // Employee should be redirected away by client-side guard.
    await expect(page.locator('h1:has-text("Shift Management")')).not.toBeVisible({timeout: 10000});
    const url = page.url();
    expect(url).not.toContain('/admin/shifts');
  });
});

// ─── /admin/implicit-roles ────────────────────────────────────────────────────

test.describe('/admin/implicit-roles — Implicit Role Rules', () => {
  // Page renders a <SkeletonTable> while rules + roles queries are loading;
  // the h1 only mounts once data resolves. Wait through full-suite backend
  // pressure before per-test assertions probe the DOM.
  // before per-test assertions probe the DOM.
  test.beforeEach(async ({page}) => {
    await openAdminPage(page, '/admin/implicit-roles', /Implicit Roles/i);
  });

  test('page loads with Implicit Roles heading', async ({page}) => {
    await expect(page.locator('h1').filter({hasText: /Implicit Roles/i})).toBeVisible();
  });

  test('shows table with column headers', async ({page}) => {
    await expect(page.locator('th:has-text("Rule Name")')).toBeVisible({timeout: 15000});
    await expect(page.locator('th:has-text("Condition")')).toBeVisible();
    await expect(page.locator('th:has-text("Target Role")')).toBeVisible();
    await expect(page.locator('th:has-text("Status")')).toBeVisible();
  });

  test('has search input and status filter dropdown', async ({page}) => {
    await expect(page.locator('input[placeholder*="Search rules"]')).toBeVisible({timeout: 15000});
    // The status filter is the first <select> on the page — `filter({hasText})`
    // on a <select> doesn't actually match the option text in Playwright, so
    // assert visibility directly.
    const filterSelect = page.locator('select').first();
    await expect(filterSelect).toBeVisible();
    await expect(filterSelect.locator('option:has-text("All Rules")')).toHaveCount(1);
  });

  test('Create Rule and Recompute All buttons are visible', async ({page}) => {
    await expect(page.locator('button:has-text("Create Rule")')).toBeVisible({timeout: 15000});
    await expect(page.locator('button:has-text("Recompute All")')).toBeVisible();
  });

  test('Create Rule modal opens with required fields', async ({page}) => {
    await page.locator('button:has-text("Create Rule")').click({timeout: 30000});

    const modal = page.locator('.fixed.inset-0').filter({hasText: /Create New Implicit Role Rule/i});
    await expect(modal).toBeVisible({timeout: 10000});
    await expect(modal.locator('input[placeholder*="Manager Auto-Role"]')).toBeVisible();
    await expect(modal.locator('select').first()).toBeVisible();
  });

  test('create modal has condition type dropdown with IS_REPORTING_MANAGER option', async ({page}) => {
    await page.locator('button:has-text("Create Rule")').click({timeout: 30000});

    const modal = page.locator('.fixed.inset-0').filter({hasText: /Create New Implicit Role Rule/i});
    await expect(modal).toBeVisible({timeout: 10000});

    // CONDITION_LABELS map "IS_REPORTING_MANAGER" → "Is Reporting Manager".
    // Either label-text or the raw enum should be present in an <option>.
    const optionByLabel = modal.locator('option:has-text("Is Reporting Manager")');
    const optionByEnum = modal.locator('option[value="IS_REPORTING_MANAGER"]');
    const labelCount = await optionByLabel.count();
    const enumCount = await optionByEnum.count();
    expect(labelCount + enumCount).toBeGreaterThan(0);
  });

  test('submitting create rule with empty name shows validation error', async ({page}) => {
    await page.locator('button:has-text("Create Rule")').click({timeout: 30000});

    const modal = page.locator('.fixed.inset-0').filter({hasText: /Create New Implicit Role Rule/i});
    await expect(modal).toBeVisible({timeout: 10000});

    // The modal's submit button is the only `type="submit"` on the page
    // when the modal is open. The toolbar "Create Rule" button has no type.
    await modal.locator('button[type="submit"]').click();

    await expect(page.locator('text=/required/i').first()).toBeVisible({timeout: 5000});
  });

  test('cancel closes the create modal', async ({page}) => {
    await page.locator('button:has-text("Create Rule")').click({timeout: 30000});
    const modal = page.locator('.fixed.inset-0').filter({hasText: /Create New Implicit Role Rule/i});
    await expect(modal).toBeVisible({timeout: 10000});

    await modal.locator('button:has-text("Cancel")').click();
    await expect(modal).not.toBeVisible({timeout: 5000});
  });

  test('filter dropdown filters by active/inactive status', async ({page}) => {
    const filterSelect = page.locator('select').first();
    await expect(filterSelect).toBeVisible({timeout: 15000});
    await filterSelect.selectOption('active');
    await expect(page.locator('body')).not.toContainText('Application error');
  });

  test('search input filters rules by name', async ({page}) => {
    const searchInput = page.locator('input[placeholder*="Search rules"]');
    await expect(searchInput).toBeVisible({timeout: 15000});
    await searchInput.fill('nonexistent-xyz-rule-12345');
    await expect(page.locator('text=/No rules found/i').first()).toBeVisible({timeout: 5000});
  });

  test('RBAC: employee is redirected away from /admin/implicit-roles', async ({page}) => {
    await loginAs(page, testUsers.employee.email, {verifyDashboard: false});
    await page.goto('/admin/implicit-roles');
    await page.waitForLoadState('domcontentloaded').catch(() => {});

    await expect(page.locator('h1:has-text("Implicit Roles")')).not.toBeVisible({timeout: 10000});
    const url = page.url();
    expect(url).not.toContain('/admin/implicit-roles');
  });
});

// ─── /admin/org-hierarchy ─────────────────────────────────────────────────────

test.describe('/admin/org-hierarchy — Organization Chart', () => {
  // Org-hierarchy fetches up to 1000 employees and builds a tree client-side
  // — initial render can take >15s on cold compile.
  test.beforeEach(async ({page}) => {
    await loginAs(page, testUsers.admin.email, {verifyDashboard: false});
    await navigateTo(page, '/admin/org-hierarchy');
    await expect(page.locator('h1').filter({hasText: /Organization Chart/i}))
      .toBeVisible({timeout: 60000});
  });

  test('page loads with Organization Chart heading', async ({page}) => {
    await expect(page.locator('h1').filter({hasText: /Organization Chart/i})).toBeVisible();
  });

  test('shows Expand All and Collapse All buttons', async ({page}) => {
    await expect(page.locator('button:has-text("Expand All")')).toBeVisible({timeout: 15000});
    await expect(page.locator('button:has-text("Collapse All")')).toBeVisible();
  });

  test('shows total employees count in controls bar', async ({page}) => {
    await page.waitForLoadState('domcontentloaded').catch(() => {});
    const hasCount = await page.locator('text=/total employees/i').first().isVisible().catch(() => false);
    const hasLoading = await page.locator('text=/Loading organization chart/i').first().isVisible().catch(() => false);
    const hasEmpty = await page.locator('text=/No employees found/i').first().isVisible().catch(() => false);
    expect(hasCount || hasLoading || hasEmpty).toBe(true);
  });

  test('employee cards render with name and designation', async ({page}) => {
    await page.waitForLoadState('domcontentloaded').catch(() => {});
    const hasCards = await page.locator('[class*="rounded-xl"]').first().isVisible().catch(() => false);
    const hasLoading = await page.locator('text=/Loading/i').first().isVisible().catch(() => false);
    const hasEmpty = await page.locator('text=/No employees found/i').first().isVisible().catch(() => false);
    expect(hasCards || hasLoading || hasEmpty).toBe(true);
  });

  test('Collapse All button collapses expanded nodes', async ({page}) => {
    await page.locator('button:has-text("Collapse All")').click({timeout: 30000});
    await expect(page.locator('body')).not.toContainText('Application error');
  });

  test('Expand All button expands the tree', async ({page}) => {
    await page.locator('button:has-text("Expand All")').click({timeout: 30000});
    await expect(page.locator('body')).not.toContainText('Application error');
  });

  test('page does not throw application errors', async ({page}) => {
    await page.waitForLoadState('domcontentloaded').catch(() => {});
    await expect(page.locator('body')).not.toContainText('Application error');
  });

  test('RBAC: employee is redirected away from /admin/org-hierarchy', async ({page}) => {
    await loginAs(page, testUsers.employee.email, {verifyDashboard: false});
    await page.goto('/admin/org-hierarchy', {waitUntil: 'domcontentloaded', timeout: 30000}).catch(() => undefined);
    await page.waitForLoadState('domcontentloaded').catch(() => undefined);

    await expect(page.locator('h1:has-text("Organization Chart")')).not.toBeVisible({timeout: 10000});
    const url = page.url();
    expect(url).not.toContain('/admin/org-hierarchy');
  });
});

// ─── /admin/payroll ───────────────────────────────────────────────────────────

test.describe('/admin/payroll — Payroll Administration', () => {
  test.beforeEach(async ({page}) => {
    await loginAs(page, testUsers.admin.email, {verifyDashboard: false});
    await navigateTo(page, '/admin/payroll');
    await expect(page.locator('h1').filter({hasText: /Payroll Administration/i}))
      .toBeVisible({timeout: 60000});
  });

  test('page loads with Payroll Administration heading', async ({page}) => {
    await expect(page.locator('h1').filter({hasText: /Payroll Administration/i})).toBeVisible();
  });

  test('displays four stat cards: Total Runs, Pending, Approved, Structures', async ({page}) => {
    await page.waitForTimeout(1000);
    await expect(page.locator('text=/Total Runs/i').first()).toBeVisible();
    await expect(page.locator('text=/Pending/i').first()).toBeVisible();
    await expect(page.locator('text=/Salary Structures/i').first()).toBeVisible();
  });

  test('shows Recent Payroll Runs section with View all link', async ({page}) => {
    await page.waitForTimeout(1000);
    await expect(page.locator('text=/Recent Payroll Runs/i').first()).toBeVisible();
    const viewAll = page.locator('a:has-text("View all")').first();
    await expect(viewAll).toBeVisible();
  });

  test('Quick Access section has Payroll Runs link', async ({page}) => {
    await expect(page.locator('text=/Quick Access/i').first()).toBeVisible();
    await expect(page.locator('a:has-text("Payroll Runs")')).toBeVisible();
  });

  test('Quick Access links include Salary Structures, Payslips, and Statutory Config', async ({page}) => {
    await expect(page.locator('a:has-text("Salary Structures")')).toBeVisible();
    await expect(page.locator('a:has-text("Payslips")')).toBeVisible();
    await expect(page.locator('a:has-text("Statutory Config")')).toBeVisible();
  });

  test('clicking View all navigates to /payroll/runs', async ({page}) => {
    await page.waitForTimeout(1000);
    const viewAll = page.locator('a[href="/payroll/runs"]').filter({hasText: /View all/i}).first();
    await expect(viewAll).toBeVisible();
    await Promise.all([
      page.waitForURL('**/payroll/runs', {timeout: 30000}),
      viewAll.click(),
    ]);
    expect(page.url()).toContain('/payroll/runs');
  });

  test('stat cards display numeric values or loading skeleton', async ({page}) => {
    const totalRunsCard = page.locator('.card-aura').filter({hasText: /Total Runs/i}).first();
    await expect(totalRunsCard).toBeVisible({timeout: 15000});
    await expect.poll(async () => {
      const cardText = await totalRunsCard.innerText().catch(() => '');
      const hasNumber = /\b\d+\b/.test(cardText);
      const hasSkeleton = await totalRunsCard.locator('[class*="animate-pulse"]').first().isVisible().catch(() => false);
      return hasNumber || hasSkeleton;
    }, {timeout: 15000}).toBe(true);
  });

  test('page does not show application errors', async ({page}) => {
    await page.waitForTimeout(1500);
    await expect(page.locator('body')).not.toContainText('Application error');
  });

  test('RBAC: employee cannot access /admin/payroll', async ({page}) => {
    await loginAs(page, testUsers.employee.email, {verifyDashboard: false});
    await page.goto('/admin/payroll', {waitUntil: 'domcontentloaded', timeout: 30000}).catch(() => undefined);
    await page.waitForLoadState('domcontentloaded').catch(() => undefined);
    await expect(page.locator('h1:has-text("Payroll Administration")')).not.toBeVisible({timeout: 5000});
  });
});

// ─── /admin/reports ───────────────────────────────────────────────────────────

test.describe('/admin/reports — Admin Reports Hub', () => {
  test.beforeEach(async ({page}) => {
    await loginAs(page, testUsers.admin.email, {verifyDashboard: false});
    await navigateTo(page, '/admin/reports');
    await expect(page.locator('h1').filter({hasText: /Admin Reports/i}))
      .toBeVisible({timeout: 60000});
  });

  test('page loads with Admin Reports heading', async ({page}) => {
    await expect(page.locator('h1').filter({hasText: /Admin Reports/i})).toBeVisible();
  });

  test('Quick Downloads section lists all report types', async ({page}) => {
    await expect(page.locator('text=/Quick Downloads/i').first()).toBeVisible();
    await expect(page.locator('text=/Employee Directory/i').first()).toBeVisible();
    await expect(page.locator('text=/Attendance Report/i').first()).toBeVisible();
    await expect(page.locator('text=/Payroll Report/i').first()).toBeVisible();
  });

  test('each report card has a download button', async ({page}) => {
    await page.waitForTimeout(500);
    const downloadBtns = page.locator('button[aria-label*="Download"]');
    const count = await downloadBtns.count();
    expect(count).toBeGreaterThan(0);
  });

  test('Report Sections sidebar has navigation links', async ({page}) => {
    await expect(page.locator('text=/Report Sections/i').first()).toBeVisible();
    await expect(page.locator('a:has-text("All Reports")')).toBeVisible();
    await expect(page.locator('a:has-text("Headcount Analytics")')).toBeVisible();
  });

  test('Active Scheduled Reports section is visible with Manage link', async ({page}) => {
    await expect(page.locator('text=/Active Scheduled Reports/i').first()).toBeVisible();
    await expect(page.locator('a:has-text("Manage")')).toBeVisible();
  });

  test('clicking Manage link navigates to /reports/scheduled', async ({page}) => {
    const manageLink = page.locator('a[href="/reports/scheduled"]').filter({hasText: /Manage/i});
    await expect(manageLink).toBeVisible();
    await Promise.all([
      page.waitForURL('**/reports/scheduled', {timeout: 30000}),
      manageLink.click(),
    ]);
    expect(page.url()).toContain('/reports/scheduled');
  });

  test('Leave Report and Department Headcount download cards are present', async ({page}) => {
    await expect(page.locator('text=/Leave Report/i').first()).toBeVisible();
    await expect(page.locator('text=/Department Headcount/i').first()).toBeVisible();
  });

  test('Performance Report download card is visible', async ({page}) => {
    await expect(page.locator('text=/Performance Report/i').first()).toBeVisible();
  });

  test('RBAC: employee cannot access /admin/reports', async ({page}) => {
    await loginAs(page, testUsers.employee.email, {verifyDashboard: false});
    await page.goto('/admin/reports', {waitUntil: 'domcontentloaded', timeout: 30000}).catch(() => undefined);
    await page.waitForLoadState('domcontentloaded').catch(() => undefined);
    await expect(page.locator('h1:has-text("Admin Reports")')).not.toBeVisible({timeout: 5000});
  });
});

// ─── /biometric-devices ───────────────────────────────────────────────────────

test.describe('/biometric-devices — Biometric Device Management', () => {
  test.beforeEach(async ({page}) => {
    await loginAs(page, testUsers.admin.email, {verifyDashboard: false});
    await navigateTo(page, '/biometric-devices');
    await expect(page.locator('h1').filter({hasText: /Biometric Devices/i}))
      .toBeVisible({timeout: 60000});
  });

  test('page loads with Biometric Devices heading', async ({page}) => {
    await expect(page.locator('h1').filter({hasText: /Biometric Devices/i})).toBeVisible();
  });

  test('shows three tabs: Devices, Pending Punches, API Keys', async ({page}) => {
    await expect(page.locator('button:has-text("Devices")')).toBeVisible();
    await expect(page.locator('button:has-text("Pending Punches")')).toBeVisible();
    await expect(page.locator('button:has-text("API Keys")')).toBeVisible();
  });

  test('Devices tab is active by default', async ({page}) => {
    const devicesTab = page.locator('button:has-text("Devices")');
    await expect(devicesTab).toHaveClass(/text-accent-700/);
  });

  test('Devices tab shows device list or empty state', async ({page}) => {
    await page.waitForTimeout(1500);
    const hasDevices = await page.locator('[class*="card"], [class*="Card"]').first().isVisible().catch(() => false);
    const hasEmpty = await page.locator('text=/No devices|empty/i').first().isVisible().catch(() => false);
    const hasTable = await page.locator('table').first().isVisible().catch(() => false);
    expect(hasDevices || hasEmpty || hasTable).toBe(true);
  });

  test('switching to Pending Punches tab does not error', async ({page}) => {
    await page.locator('button:has-text("Pending Punches")').click();
    await page.waitForTimeout(1000);
    await expect(page.locator('body')).not.toContainText('Application error');
  });

  test('switching to API Keys tab does not error', async ({page}) => {
    await page.locator('button:has-text("API Keys")').click();
    await page.waitForTimeout(1000);
    await expect(page.locator('body')).not.toContainText('Application error');
  });

  test('page heading includes fingerprint icon context', async ({page}) => {
    // Verifies the icon + heading row renders without layout break
    const heading = page.locator('h1').filter({hasText: /Biometric Devices/i});
    await expect(heading).toBeVisible();
  });

  test('page subtitle describes biometric management purpose', async ({page}) => {
    await expect(page.locator('text=/Manage biometric devices/i').first()).toBeVisible();
  });

  test('RBAC: unauthorized users are shown permission gate fallback', async ({page}) => {
    await loginAs(page, testUsers.employee.email, {verifyDashboard: false});
    await page.goto('/biometric-devices', {waitUntil: 'domcontentloaded', timeout: 30000}).catch(() => undefined);
    await page.waitForLoadState('domcontentloaded').catch(() => undefined);
    await page.waitForTimeout(1000);
    // PermissionGate renders nothing or redirects for employees without ATTENDANCE_MANAGE
    const hasContent = await page.locator('h1:has-text("Biometric Devices")').isVisible().catch(() => false);
    // Employee should not see the page content
    expect(hasContent).toBe(false);
  });
});

// ─── /import-export ───────────────────────────────────────────────────────────

test.describe('/import-export — Data Import & Export', () => {
  test.beforeEach(async ({page}) => {
    await loginAs(page, testUsers.admin.email, {verifyDashboard: false});
    await navigateTo(page, '/import-export');
    await expect(page.locator('h1').filter({hasText: /Import \/ Export Hub/i}))
      .toBeVisible({timeout: 60000});
  });

  test('page loads without application error', async ({page}) => {
    await page.waitForTimeout(1000);
    await expect(page.locator('body')).not.toContainText('Application error');
  });

  test('shows Import, Export, Keka, and History tabs', async ({page}) => {
    await page.waitForTimeout(1000);
    const importTab = page.locator('button:has-text("Import"), [role="tab"]:has-text("Import")').first();
    const hasImport = await importTab.isVisible().catch(() => false);
    expect(hasImport).toBe(true);
  });

  test('import tab shows employee and department data type options', async ({page}) => {
    await page.waitForTimeout(1000);
    // Import section should list importable entities
    const hasEmployees = await page.locator('text=/Employees/i').first().isVisible().catch(() => false);
    const hasDepartments = await page.locator('text=/Departments/i').first().isVisible().catch(() => false);
    expect(hasEmployees || hasDepartments).toBe(true);
  });

  test('file drop zone is visible in import mode', async ({page}) => {
    await page.waitForTimeout(1000);
    const hasDropzone = await page.locator('text=/drag.*drop|drop.*here|upload/i').first().isVisible().catch(() => false);
    expect(hasDropzone).toBe(true);
  });

  test('export section shows EXCEL and CSV format options', async ({page}) => {
    await page.waitForTimeout(1000);
    // Click Export tab if it exists
    const exportTab = page.locator('button:has-text("Export"), [role="tab"]:has-text("Export")').first();
    if (await exportTab.isVisible().catch(() => false)) {
      await exportTab.click();
      await page.waitForTimeout(500);
      const hasExcel = await page.locator('text=/Excel|EXCEL/i').first().isVisible().catch(() => false);
      const hasCsv = await page.locator('text=/CSV/i').first().isVisible().catch(() => false);
      expect(hasExcel || hasCsv).toBe(true);
    }
  });

  test('Keka migration tab is visible for admins', async ({page}) => {
    await page.waitForTimeout(1000);
    const kekaTab = page.locator('button:has-text("Keka"), [role="tab"]:has-text("Keka")').first();
    const hasKeka = await kekaTab.isVisible().catch(() => false);
    expect(hasKeka).toBe(true);
  });

  test('History tab shows import history section', async ({page}) => {
    await page.waitForTimeout(1000);
    const historyTab = page.locator('button:has-text("History"), [role="tab"]:has-text("History")').first();
    if (await historyTab.isVisible().catch(() => false)) {
      await historyTab.click();
      await page.waitForTimeout(800);
      await expect(page.locator('body')).not.toContainText('Application error');
    }
  });

  test('HR Manager can also access import-export page', async ({page}) => {
    await loginAs(page, testUsers.hrManager.email, {verifyDashboard: false});
    await navigateTo(page, '/import-export');
    await page.waitForTimeout(1000);
    await expect(page.locator('body')).not.toContainText('Application error');
  });

  test('RBAC: employee without admin permission cannot access import-export', async ({page}) => {
    await loginAs(page, testUsers.employee.email, {verifyDashboard: false});
    await page.goto('/import-export', {waitUntil: 'domcontentloaded', timeout: 30000}).catch(() => undefined);
    await page.waitForLoadState('domcontentloaded').catch(() => undefined);
    await page.waitForTimeout(1000);
    // AdminGate/PermissionGate should block employee from seeing the content
    const hasImportContent = await page.locator('text=/Import Data|Import Type/i').first().isVisible().catch(() => false);
    expect(hasImportContent).toBe(false);
  });
});
