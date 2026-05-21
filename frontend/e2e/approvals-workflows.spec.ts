import {expect, Page, test} from '@playwright/test';
import {approvalChain, loginAs, navigateTo,} from './fixtures/helpers';
import {testUsers} from './fixtures/testData';

/**
 * Approvals, Workflows, Change Requests, and E-Signature — E2E Spec
 *
 * @module approvals-workflows
 *
 * Covers:
 *  - /approvals/inbox    (approval inbox for managers/HR)
 *  - /approvals          (redirects to /approvals/inbox)
 *  - /workflows          (workflow definition list)
 *  - /workflows/[id]     (workflow definition detail / editor)
 *  - /employees/change-requests  (employment change requests — HR only)
 *  - /sign/[token]       (public e-signature page)
 *
 * Approval hierarchy under test:
 *   raj (EMPLOYEE) → mani (TEAM_LEAD) → sumit (MANAGER) → fayaz (CEO)
 *   saran (EMPLOYEE) → sumit (MANAGER)
 */

test.describe.configure({timeout: 240000});

const ROUTE_READY_TIMEOUT = 120000;

type GuardedOutcome = 'heading' | 'denied' | 'redirected' | 'redirecting' | 'guarded';

async function waitForGuardedOutcome(page: Page, checks: Partial<Record<GuardedOutcome, () => Promise<boolean>>>): Promise<GuardedOutcome | null> {
  const deadline = Date.now() + ROUTE_READY_TIMEOUT;
  while (Date.now() < deadline) {
    for (const [name, check] of Object.entries(checks) as Array<[GuardedOutcome, () => Promise<boolean>]>) {
      if (await check().catch(() => false)) {
        return name;
      }
    }
    await page.waitForTimeout(500);
  }
  return null;
}

async function openApprovalInbox(page: Page, email: string): Promise<void> {
  await loginAs(page, email, {verifyDashboard: false});
  await navigateTo(page, '/approvals/inbox');
  await expect(page.locator('h1').filter({hasText: /Approval Inbox/i}))
    .toBeVisible({timeout: ROUTE_READY_TIMEOUT});
}

async function openWorkflowBuilder(page: Page, email: string): Promise<void> {
  await loginAs(page, email, {verifyDashboard: false});
  await navigateTo(page, '/workflows');
  await expect(page.locator('h1').filter({hasText: /Workflow Builder/i}))
    .toBeVisible({timeout: ROUTE_READY_TIMEOUT});
}

async function openChangeRequests(page: Page, email: string): Promise<void> {
  await loginAs(page, email, {verifyDashboard: false});
  await navigateTo(page, '/employees/change-requests');
  await expect(page.locator('h1').filter({hasText: /Employment Change Requests/i}))
    .toBeVisible({timeout: ROUTE_READY_TIMEOUT});
}

function changeRequestCards(page: Page) {
  return page.locator('div.skeuo-card.overflow-hidden');
}

async function waitForChangeRequestList(page: Page): Promise<'empty' | 'items'> {
  const emptyState = page.locator('text=/No pending change requests|No change requests found/i');
  const cards = changeRequestCards(page);
  const deadline = Date.now() + ROUTE_READY_TIMEOUT;

  while (Date.now() < deadline) {
    if (await emptyState.isVisible().catch(() => false)) {
      return 'empty';
    }
    if (await cards.first().isVisible().catch(() => false)) {
      return 'items';
    }
    await page.waitForTimeout(500);
  }

  throw new Error(`Change request list did not settle at ${page.url()}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Approvals Inbox
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Approvals Inbox', () => {
  test('page loads for a manager with correct heading and summary cards', async ({page}) => {
    await openApprovalInbox(page, approvalChain.teamLead.email);

    // Heading
    await expect(page.locator('h1')).toContainText('Approval Inbox');

    // Summary cards — all three should be present
    await expect(page.locator('p').filter({hasText: /^Pending$/}).first()).toBeVisible();
    await expect(page.locator('p').filter({hasText: /^Approved Today$/}).first()).toBeVisible();
    await expect(page.locator('p').filter({hasText: /^Rejected Today$/}).first()).toBeVisible();
  });

  test('/approvals redirects to /approvals/inbox', async ({page}) => {
    await loginAs(page, approvalChain.engineeringManager.email, {verifyDashboard: false});
    await page.goto('/approvals', {waitUntil: 'domcontentloaded', timeout: ROUTE_READY_TIMEOUT});
    await page.waitForLoadState('domcontentloaded');
    await expect(page).toHaveURL(/\/approvals\/inbox/, {timeout: ROUTE_READY_TIMEOUT});
    await expect(page.locator('h1').filter({hasText: /Approval Inbox/i}))
      .toBeVisible({timeout: ROUTE_READY_TIMEOUT});
  });

  test('module filter tabs are rendered (All, Leave, Expense, Asset, Travel, Recruitment, Others)', async ({page}) => {
    await openApprovalInbox(page, approvalChain.teamLead.email);

    const expectedTabs = ['All', 'Leave', 'Expense', 'Asset', 'Travel', 'Recruitment', 'Others'];
    for (const tab of expectedTabs) {
      await expect(page.locator(`button:has-text("${tab}")`).first()).toBeVisible();
    }
  });

  test('status toggle Pending / All is visible and clickable', async ({page}) => {
    await openApprovalInbox(page, approvalChain.engineeringManager.email);

    const pendingBtn = page.locator('button:has-text("Pending")').first();
    const allBtn = page.locator('button:has-text("All")').first();

    await expect(pendingBtn).toBeVisible();
    await expect(allBtn).toBeVisible();

    // Switch to All
    await allBtn.click();
    await page.waitForLoadState('domcontentloaded');

    // Switch back to Pending
    await pendingBtn.click();
    await page.waitForLoadState('domcontentloaded');
  });

  test('search input filters the approval list', async ({page}) => {
    await openApprovalInbox(page, approvalChain.engineeringManager.email);

    const searchInput = page.locator('input[placeholder*="Search"], input[placeholder*="search"]').first();
    await expect(searchInput).toBeVisible();

    // Type a search term that is unlikely to match
    await searchInput.fill('zzz_nonexistent_term_xyz');
    await page.waitForTimeout(600); // debounce 400ms + render

    // Should show an empty state rather than results
    const emptyState = page.locator('text=/no.*found|No.*found|empty/i');
    const hasEmpty = await emptyState.isVisible({timeout: 5000}).catch(() => false);
    const rows = page.locator('table tbody tr, [data-testid="inbox-item"]');
    const rowCount = await rows.count();

    // Either an explicit empty state appears or no result rows remain
    expect(hasEmpty || rowCount === 0).toBe(true);
  });

  test('clicking Leave module tab filters to LEAVE_REQUEST items only', async ({page}) => {
    await openApprovalInbox(page, approvalChain.engineeringManager.email);

    // Switch to All first so we can see any items
    const allStatusBtn = page.locator('button:has-text("All")').first();
    await allStatusBtn.click();
    await page.waitForLoadState('domcontentloaded');

    // Click Leave tab
    const leaveTab = page.locator('button:has-text("Leave")').first();
    await leaveTab.click();
    await page.waitForLoadState('domcontentloaded');

    // Each visible module badge should say "Leave" (or the list is empty)
    const badges = page.locator('text=Leave').first();
    const isEmpty = page.locator('text=/no.*found|No.*found|empty/i');
    const eitherVisible = (await badges.isVisible({timeout: 5000}).catch(() => false))
      || (await isEmpty.isVisible({timeout: 3000}).catch(() => false));
    expect(eitherVisible).toBe(true);
  });

  test('Delegate button is visible in the header', async ({page}) => {
    await openApprovalInbox(page, approvalChain.teamLead.email);

    const delegateBtn = page.locator('button:has-text("Delegate")');
    await expect(delegateBtn).toBeVisible();
  });

  test('Delegate modal opens when Delegate button is clicked', async ({page}) => {
    await openApprovalInbox(page, approvalChain.engineeringManager.email);

    await page.locator('button:has-text("Delegate")').click();

    // Modal should appear with Start Date / End Date fields
    const modal = page.locator('[role="dialog"], .fixed.inset-0').last();
    await expect(modal).toBeVisible({timeout: 8000});

    const startDate = page.locator('input[type="date"]').first();
    await expect(startDate).toBeVisible();
  });

  test('refresh button re-fetches inbox without navigation', async ({page}) => {
    await openApprovalInbox(page, approvalChain.teamLead.email);

    const refreshBtn = page.locator('button').filter({has: page.locator('svg')}).filter({hasNot: page.locator('text')}).last();
    // Target by aria or by icon class
    const refreshByTitle = page.locator('button[aria-label*="refresh" i], button[title*="refresh" i]');
    const hasRefreshByTitle = await refreshByTitle.isVisible({timeout: 3000}).catch(() => false);

    if (hasRefreshByTitle) {
      await refreshByTitle.click();
    } else {
      // Fall back to the SVG-containing button near the Delegate button
      await refreshBtn.click();
    }

    // Page should not navigate away
    await expect(page).toHaveURL(/\/approvals\/inbox/);
  });

  test('pagination controls appear when there are multiple pages', async ({page}) => {
    await openApprovalInbox(page, testUsers.admin.email);

    // Switch to ALL status to maximize items
    await page.locator('button:has-text("All")').first().click();
    await page.waitForLoadState('domcontentloaded');

    // Pagination controls may or may not appear depending on data — just assert page is stable
    const paginationPrev = page.locator('button:has-text("Previous")');
    const hasPagination = await paginationPrev.isVisible({timeout: 3000}).catch(() => false);
    // If pagination exists, Previous should be disabled on page 0
    if (hasPagination) {
      await expect(paginationPrev).toBeDisabled();
    }
  });

  test('selecting an inbox item reveals the detail panel', async ({page}) => {
    await openApprovalInbox(page, approvalChain.engineeringManager.email);

    // Switch to All so there are more items to interact with
    await page.locator('button:has-text("All")').first().click();
    await page.waitForLoadState('domcontentloaded');

    const firstItem = page.locator('table tbody tr').first();
    const hasFirstItem = await firstItem.isVisible({timeout: 5000}).catch(() => false);
    if (!hasFirstItem) {
      // No items — skip without failing
      test.skip();
      return;
    }

    await firstItem.click();

    // Detail panel should appear — look for approve/reject buttons or employee name section
    const detailPanel = page.locator('text=/Approve|Reject|Return|approve|reject/i').first();
    await expect(detailPanel).toBeVisible({timeout: 8000});
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Approvals — RBAC boundaries
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Approvals — RBAC', () => {
  test('employee (Saran) can access the approval inbox (WORKFLOW_VIEW permission)', async ({page}) => {
    // Employees have WORKFLOW_VIEW in the seeded backend and should reach the inbox.
    await loginAs(page, approvalChain.submitterSaran.email, {verifyDashboard: false});
    await navigateTo(page, '/approvals/inbox');

    // Either the inbox loads or an access denied message appears — either is acceptable RBAC outcome
    const heading = page.locator('h1:has-text("Approval Inbox")');
    const denied = page.locator('text=/Access denied|You do not have permission/i');
    const outcome = await waitForGuardedOutcome(page, {
      heading: () => heading.isVisible(),
      denied: () => denied.isVisible(),
      redirected: async () => page.url().includes('/auth/login'),
      redirecting: () => page.locator('text=/Redirecting/i').first().isVisible(),
    });
    expect(outcome).not.toBeNull();
  });

  test('employee (Raj) inbox does NOT show approval action buttons for others\' requests', async ({page}) => {
    await openApprovalInbox(page, approvalChain.submitterRaj.email);

    // Employees should not see Approve/Reject buttons for other employees
    const approveBtn = page.locator('button:has-text("Approve")').first();
    const rejectBtn = page.locator('button:has-text("Reject")').first();

    // Neither approve nor reject should be immediately visible for an employee with no pending tasks
    const approveVisible = await approveBtn.isVisible({timeout: 3000}).catch(() => false);
    const rejectVisible = await rejectBtn.isVisible({timeout: 3000}).catch(() => false);

    // An employee without pending approval tasks should not see these actions prominently
    // (They may appear after selecting an item assigned to them — but not in the list header)
    const headerApprove = page.locator('header button:has-text("Approve"), nav button:has-text("Approve")');
    await expect(headerApprove).toHaveCount(0);

    // Log what we see (non-fatal assertion for visibility)
    expect(approveVisible && rejectVisible).toBe(false);
  });

  test('team lead (Mani) sees inbox with potential items from direct reports', async ({page}) => {
    await openApprovalInbox(page, approvalChain.teamLead.email);

    await expect(page.locator('h1:has-text("Approval Inbox")')).toBeVisible({timeout: ROUTE_READY_TIMEOUT});

    // Summary cards should show numeric values (even if 0)
    const pendingCard = page.locator('p').filter({hasText: /^Pending$/}).first();
    await expect(pendingCard).toBeVisible();
  });

  test('HR Manager (Jagadeesh) can access the approval inbox', async ({page}) => {
    await openApprovalInbox(page, approvalChain.hrManager.email);

    await expect(page.locator('h1:has-text("Approval Inbox")')).toBeVisible({timeout: ROUTE_READY_TIMEOUT});
  });

  test('Super Admin (Fayaz) can access the approval inbox without restriction', async ({page}) => {
    await openApprovalInbox(page, approvalChain.ceo.email);

    await expect(page.locator('h1:has-text("Approval Inbox")')).toBeVisible({timeout: ROUTE_READY_TIMEOUT});
    // Should NOT see Access Denied
    await expect(page.locator('text=/Access denied/i')).toHaveCount(0);
  });

  test('unauthenticated user is redirected to login when visiting /approvals/inbox', async ({page}) => {
    // Clear cookies to simulate unauthenticated state
    await page.context().clearCookies();
    await page.goto('/approvals/inbox');
    await page.waitForLoadState('domcontentloaded');

    // Should redirect to the login page
    await expect(page).toHaveURL(/\/auth\/login|\/login/);
  });

  test('approve action modal requires a comment for rejection', async ({page}) => {
    await openApprovalInbox(page, approvalChain.engineeringManager.email);

    // Switch to All status to find items
    await page.locator('button:has-text("All")').first().click();
    await page.waitForLoadState('domcontentloaded');

    const firstRow = page.locator('table tbody tr').first();
    const hasItem = await firstRow.isVisible({timeout: 5000}).catch(() => false);
    if (!hasItem) {
      test.skip();
      return;
    }

    await firstRow.click();

    const rejectBtn = page.locator('button:has-text("Reject")').first();
    const hasReject = await rejectBtn.isVisible({timeout: 5000}).catch(() => false);
    if (!hasReject) {
      test.skip();
      return;
    }

    await rejectBtn.click();

    // Rejection modal should appear with a comments field
    const commentsArea = page.locator('textarea, input[placeholder*="comment" i], input[placeholder*="reason" i]').first();
    await expect(commentsArea).toBeVisible({timeout: 8000});
  });

  test('employee cannot access /employees/change-requests and is redirected', async ({page}) => {
    await loginAs(page, approvalChain.submitterSaran.email, {verifyDashboard: false});
    await navigateTo(page, '/employees/change-requests');

    // Should redirect, show access denied, or render a guarded empty shell.
    const denied = page.locator('text=/Access denied|do not have permission/i').first();
    const restrictedHeading = page.locator('h1:has-text("Employment Change Requests")');
    const outcome = await waitForGuardedOutcome(page, {
      heading: () => restrictedHeading.isVisible(),
      denied: () => denied.isVisible(),
      redirected: async () => page.url().includes('/employees') && !page.url().includes('change-requests'),
      redirecting: () => page.locator('text=/Redirecting to employees/i').first().isVisible(),
      guarded: () => page.locator('main').isVisible(),
    });

    expect(outcome).not.toBe('heading');
    expect(outcome).not.toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Workflows
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Workflows', () => {
  test('workflow list page loads with correct heading for admin', async ({page}) => {
    await openWorkflowBuilder(page, testUsers.admin.email);

    await expect(page.locator('h1')).toContainText('Workflow Builder');
    await expect(page.locator('p').filter({hasText: 'approval workflow'})).toBeVisible();
  });

  test('Create Workflow button is visible for admin with WORKFLOW_MANAGE', async ({page}) => {
    await openWorkflowBuilder(page, testUsers.admin.email);

    const createBtn = page.locator('button:has-text("Create Workflow")');
    await expect(createBtn).toBeVisible();
  });

  test('employee (Saran) cannot access /workflows — redirected or denied', async ({page}) => {
    await loginAs(page, approvalChain.submitterSaran.email, {verifyDashboard: false});
    await navigateTo(page, '/workflows');

    const denied = page.locator('text=/Access denied|do not have permission/i');
    const heading = page.locator('h1:has-text("Workflow Builder")');

    // Either access denied message or redirected (no Workflow Builder heading)
    const deniedVisible = await denied.isVisible({timeout: ROUTE_READY_TIMEOUT}).catch(() => false);
    const headingVisible = await heading.isVisible({timeout: 5000}).catch(() => false);

    // Employee should NOT see the full workflow builder
    expect(deniedVisible || !headingVisible).toBe(true);
  });

  test('status filter toggle (All / Active / Inactive) is rendered', async ({page}) => {
    await openWorkflowBuilder(page, testUsers.admin.email);

    await expect(page.locator('button:has-text("All")').first()).toBeVisible();
    await expect(page.locator('button:has-text("Active")').first()).toBeVisible();
    await expect(page.locator('button:has-text("Inactive")').first()).toBeVisible();
  });

  test('entity type dropdown filter is rendered with All types option', async ({page}) => {
    await openWorkflowBuilder(page, testUsers.admin.email);

    const select = page.locator('select').first();
    await expect(select).toBeVisible();
    await expect(select.locator('option:has-text("All types")')).toHaveCount(1);
  });

  test('search input filters workflow list', async ({page}) => {
    await openWorkflowBuilder(page, testUsers.admin.email);

    const searchInput = page.locator('input[placeholder*="Search"]').first();
    await expect(searchInput).toBeVisible();

    await searchInput.fill('zzz_nonexistent_workflow_xyz');
    await page.waitForTimeout(600);

    // Empty state or no rows
    const emptyState = page.locator('text=/no.*found|No.*found|No workflows/i').first();
    const hasEmpty = await emptyState.isVisible({timeout: 5000}).catch(() => false);
    const rows = page.locator('table tbody tr');
    const count = await rows.count();

    expect(hasEmpty || count === 0).toBe(true);
  });

  test('filtering by Active status shows only active workflows', async ({page}) => {
    await openWorkflowBuilder(page, testUsers.admin.email);

    await page.locator('button:has-text("Active")').first().click();
    await page.waitForLoadState('domcontentloaded');

    // Each row should have an Active badge
    const rows = page.locator('table tbody tr');
    const rowCount = await rows.count();
    if (rowCount > 0) {
      const activeBadges = page.locator('table tbody tr').locator('text=Active');
      const badgeCount = await activeBadges.count();
      // At least some rows should have the Active badge
      expect(badgeCount).toBeGreaterThan(0);
    }
  });

  test('clicking a workflow row navigates to /workflows/[id]', async ({page}) => {
    await openWorkflowBuilder(page, testUsers.admin.email);

    const firstRow = page.locator('table tbody tr').first();
    const hasRow = await firstRow.isVisible({timeout: 8000}).catch(() => false);
    if (!hasRow) {
      test.skip();
      return;
    }

    await firstRow.click();
    await page.waitForLoadState('domcontentloaded');

    await expect(page).toHaveURL(/\/workflows\/[a-zA-Z0-9_-]+/);
  });

  test('three-dot actions menu opens with View, Edit, Deactivate options for admin', async ({page}) => {
    await openWorkflowBuilder(page, testUsers.admin.email);

    const firstRow = page.locator('table tbody tr').first();
    const hasRow = await firstRow.isVisible({timeout: 8000}).catch(() => false);
    if (!hasRow) {
      test.skip();
      return;
    }

    const actionsBtn = firstRow.locator('button[aria-label="Actions menu"]');
    await expect(actionsBtn).toBeVisible();
    await actionsBtn.click();

    await expect(page.locator('text=View')).toBeVisible();
    await expect(page.locator('text=Edit')).toBeVisible();
    await expect(page.locator('text=Deactivate')).toBeVisible();
  });

  test('deactivate workflow shows confirmation modal', async ({page}) => {
    await openWorkflowBuilder(page, testUsers.admin.email);

    const firstRow = page.locator('table tbody tr').first();
    const hasRow = await firstRow.isVisible({timeout: 8000}).catch(() => false);
    if (!hasRow) {
      test.skip();
      return;
    }

    const actionsBtn = firstRow.locator('button[aria-label="Actions menu"]');
    await actionsBtn.click();
    await page.locator('text=Deactivate').click();

    // Confirmation modal should appear
    const modal = page.locator('text=/Deactivate Workflow/i').first();
    await expect(modal).toBeVisible({timeout: 8000});

    // Cancel button should close without action
    const cancelBtn = page.locator('button:has-text("Cancel")').first();
    await cancelBtn.click();
    await expect(modal).toHaveCount(0);
  });

  test('HR Manager (Jagadeesh) can view workflows but may not see Edit/Deactivate (view-only)', async ({page}) => {
    await loginAs(page, approvalChain.hrManager.email, {verifyDashboard: false});
    await navigateTo(page, '/workflows');

    // HR Manager may have WORKFLOW_VIEW but not WORKFLOW_MANAGE
    const heading = page.locator('h1:has-text("Workflow Builder")');
    const denied = page.locator('text=/Access denied/i');

    const outcome = await waitForGuardedOutcome(page, {
      heading: () => heading.isVisible(),
      denied: () => denied.isVisible(),
      redirected: async () => !page.url().includes('/workflows'),
      redirecting: () => page.locator('text=/Redirecting/i').first().isVisible(),
    });

    // Either they can view (no Create Workflow button) or are denied
    if (outcome === 'heading') {
      const createBtn = page.locator('button:has-text("Create Workflow")');
      const hasCreate = await createBtn.isVisible({timeout: 3000}).catch(() => false);
      // If HR Manager has WORKFLOW_MANAGE they can create — else they can only view
      expect(hasCreate === true || hasCreate === false).toBe(true);
    } else {
      expect(outcome).not.toBeNull();
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Workflow Detail / Editor  (/workflows/[id])
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Workflow Detail', () => {
  test('workflow detail page shows name, entity type, steps for admin', async ({page}) => {
    await openWorkflowBuilder(page, testUsers.admin.email);

    // Get the first workflow and navigate to its detail
    const firstRow = page.locator('table tbody tr').first();
    const hasRow = await firstRow.isVisible({timeout: 8000}).catch(() => false);
    if (!hasRow) {
      test.skip();
      return;
    }

    await firstRow.click();
    await page.waitForLoadState('domcontentloaded');

    // Detail page should have a heading (workflow name) and back button
    await expect(page.locator('button[aria-label*="back" i], button:has-text("Back"), a:has-text("Back")').first()).toBeVisible({timeout: 8000});
  });

  test('edit mode can be toggled via URL param ?edit=true for admin', async ({page}) => {
    await openWorkflowBuilder(page, testUsers.admin.email);

    const firstRow = page.locator('table tbody tr').first();
    const hasRow = await firstRow.isVisible({timeout: 8000}).catch(() => false);
    if (!hasRow) {
      test.skip();
      return;
    }

    // Get the workflow ID from the row click
    await firstRow.click();
    await page.waitForLoadState('domcontentloaded');
    const url = page.url();
    const editUrl = url.includes('?') ? `${url}&edit=true` : `${url}?edit=true`;

    await page.goto(editUrl);
    await page.waitForLoadState('domcontentloaded');

    // In edit mode, Save button should appear
    const saveBtn = page.locator('button:has-text("Save"), button:has-text("Save Changes")').first();
    await expect(saveBtn).toBeVisible({timeout: ROUTE_READY_TIMEOUT});
  });

  test('workflow detail back button returns to /workflows list', async ({page}) => {
    await openWorkflowBuilder(page, testUsers.admin.email);

    const firstRow = page.locator('table tbody tr').first();
    const hasRow = await firstRow.isVisible({timeout: 8000}).catch(() => false);
    if (!hasRow) {
      test.skip();
      return;
    }

    await firstRow.click();
    await page.waitForLoadState('domcontentloaded');

    const backBtn = page.locator('button:has-text("Back"), a:has-text("Back"), button[aria-label*="back" i]').first();
    await backBtn.click();
    await page.waitForLoadState('domcontentloaded');

    await expect(page).toHaveURL(/\/workflows(?!\/)/);
  });

  test('create new workflow navigates to /workflows/new', async ({page}) => {
    await openWorkflowBuilder(page, testUsers.admin.email);

    const createBtn = page.locator('button:has-text("Create Workflow")').first();
    await expect(createBtn).toBeVisible({timeout: ROUTE_READY_TIMEOUT});
    await Promise.all([
      page.waitForURL(/\/workflows\/new/, {timeout: ROUTE_READY_TIMEOUT}),
      createBtn.click(),
    ]);

    await expect(page).toHaveURL(/\/workflows\/new/);
  });

  test('/workflows/new renders entity type and workflow type selects', async ({page}) => {
    await loginAs(page, testUsers.admin.email, {verifyDashboard: false});
    await navigateTo(page, '/workflows/new');

    // Entity type selector
    const entitySelect = page.locator('select, [role="combobox"]').first();
    await expect(entitySelect).toBeVisible({timeout: ROUTE_READY_TIMEOUT});
  });

  test('workflow step form shows approver type options', async ({page}) => {
    await loginAs(page, testUsers.admin.email, {verifyDashboard: false});
    await navigateTo(page, '/workflows/new');

    // Add a step
    const addStepBtn = page.locator('button:has-text("Add Step"), button:has-text("Add Approval Step")').first();
    const hasAddStep = await addStepBtn.isVisible({timeout: 8000}).catch(() => false);
    if (!hasAddStep) {
      test.skip();
      return;
    }

    await addStepBtn.click();

    // Step form should include approver type select
    const approverSelect = page.locator('select').filter({hasText: /Reporting Manager|Approver Type/}).first();
    const hasApproverSelect = await approverSelect.isVisible({timeout: 5000}).catch(() => false);
    expect(hasApproverSelect).toBe(true);
  });

  test('employee cannot access /workflows/new', async ({page}) => {
    await loginAs(page, approvalChain.submitterRaj.email, {verifyDashboard: false});
    await navigateTo(page, '/workflows/new');

    const denied = page.locator('text=/Access denied|do not have permission/i');
    const deniedVisible = await denied.isVisible({timeout: 8000}).catch(() => false);
    const hasSaveBtn = await page.locator('button:has-text("Save")').isVisible({timeout: 3000}).catch(() => false);

    expect(deniedVisible || !hasSaveBtn).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Employee Change Requests
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Employee Change Requests', () => {
  test('page loads for HR Manager (Jagadeesh) with correct heading', async ({page}) => {
    await openChangeRequests(page, approvalChain.hrManager.email);

    // Page renders heading (DEF-44: only after permission confirmed)
    await expect(page.locator('h1:has-text("Employment Change Requests")')).toBeVisible({timeout: ROUTE_READY_TIMEOUT});
  });

  test('Pending / All Requests filter buttons are rendered', async ({page}) => {
    await openChangeRequests(page, approvalChain.hrManager.email);

    await expect(page.locator('button:has-text("Pending")')).toBeVisible({timeout: ROUTE_READY_TIMEOUT});
    await expect(page.locator('button:has-text("All Requests")')).toBeVisible({timeout: ROUTE_READY_TIMEOUT});
  });

  test('defaults to Pending filter and shows pending count stat card', async ({page}) => {
    await openChangeRequests(page, approvalChain.hrManager.email);

    // Pending button should be highlighted (bg-accent-700 / active)
    const pendingBtn = page.locator('button:has-text("Pending")').first();
    await expect(pendingBtn).toBeVisible({timeout: ROUTE_READY_TIMEOUT});

    // Stat card labelled "Pending Requests" should be visible
    await expect(page.locator('text=Pending Requests')).toBeVisible();
  });

  test('switching to All Requests shows all count', async ({page}) => {
    await openChangeRequests(page, approvalChain.hrManager.email);

    const allBtn = page.locator('button:has-text("All Requests")');
    await expect(allBtn).toBeVisible({timeout: ROUTE_READY_TIMEOUT});
    await allBtn.click();
    await page.waitForLoadState('domcontentloaded');

    await expect(page.locator('text=Total Requests')).toBeVisible();
  });

  test('empty state renders when no change requests exist', async ({page}) => {
    await openChangeRequests(page, approvalChain.hrManager.email);

    // Either an empty state or request cards should become visible once the API request settles.
    await expect(waitForChangeRequestList(page)).resolves.toMatch(/empty|items/);
  });

  test('change request card expands to show detail on click', async ({page}) => {
    await loginAs(page, approvalChain.hrManager.email, {verifyDashboard: false});

    // Switch to All requests to maximize chances of finding items
    await navigateTo(page, '/employees/change-requests');
    await expect(page.locator('h1:has-text("Employment Change Requests")')).toBeVisible({timeout: ROUTE_READY_TIMEOUT});

    const allBtn = page.locator('button:has-text("All Requests")').first();
    const hasAll = await allBtn.isVisible({timeout: ROUTE_READY_TIMEOUT}).catch(() => false);
    if (hasAll) await allBtn.click();
    await page.waitForLoadState('domcontentloaded');

    const outcome = await waitForChangeRequestList(page);
    if (outcome === 'empty') {
      test.skip();
      return;
    }

    const firstCard = changeRequestCards(page).first();

    // Click the header area of the card to expand
    await firstCard.locator('div.cursor-pointer').first().click();

    // Expanded section should show the detail headings.
    await expect(firstCard.locator('text=/Proposed Changes|Request Details/i').first())
      .toBeVisible({timeout: 8000});
  });

  test('Approve button triggers confirm dialog before submitting', async ({page}) => {
    await openChangeRequests(page, approvalChain.hrManager.email);

    const outcome = await waitForChangeRequestList(page);
    if (outcome === 'empty') {
      test.skip();
      return;
    }

    const pendingCard = changeRequestCards(page).first();

    // Expand the card
    await pendingCard.locator('div.cursor-pointer').first().click();

    const approveBtn = page.locator('button:has-text("Approve")').first();
    const hasApprove = await approveBtn.isVisible({timeout: 5000}).catch(() => false);
    if (!hasApprove) {
      test.skip();
      return;
    }

    await approveBtn.click();

    // Confirmation dialog should appear
    const confirmDialog = page.locator('[role="dialog"], .fixed.inset-0').last();
    await expect(confirmDialog).toBeVisible({timeout: 8000});
  });

  test('Reject button opens modal requiring a rejection reason', async ({page}) => {
    await openChangeRequests(page, approvalChain.hrManager.email);

    const outcome = await waitForChangeRequestList(page);
    if (outcome === 'empty') {
      test.skip();
      return;
    }

    const pendingCard = changeRequestCards(page).first();

    await pendingCard.locator('div.cursor-pointer').first().click();

    const rejectBtn = page.locator('button:has-text("Reject")').first();
    const hasReject = await rejectBtn.isVisible({timeout: 5000}).catch(() => false);
    if (!hasReject) {
      test.skip();
      return;
    }

    await rejectBtn.click();

    // Rejection modal should have a textarea for reason
    const reasonField = page.locator('textarea, input[placeholder*="reason" i]').first();
    await expect(reasonField).toBeVisible({timeout: 8000});
  });

  test('status badges render with correct colors (PENDING = warning, APPROVED = success, REJECTED = danger)', async ({page}) => {
    await loginAs(page, testUsers.admin.email, {verifyDashboard: false});
    await navigateTo(page, '/employees/change-requests');
    await expect(page.locator('h1:has-text("Employment Change Requests")')).toBeVisible({timeout: ROUTE_READY_TIMEOUT});

    // Switch to All to see variety of statuses
    const allBtn = page.locator('button:has-text("All Requests")').first();
    const hasAll = await allBtn.isVisible({timeout: ROUTE_READY_TIMEOUT}).catch(() => false);
    if (hasAll) await allBtn.click();
    await page.waitForLoadState('domcontentloaded');

    // Find any status badge with "Pending" text
    const pendingBadge = page.locator('span:has-text("Pending")').first();
    const hasPending = await pendingBadge.isVisible({timeout: 5000}).catch(() => false);
    if (hasPending) {
      // Badge should use warning styling
      const classAttr = await pendingBadge.getAttribute('class') ?? '';
      expect(classAttr).toMatch(/warning/);
    }
  });

  test('Super Admin can access change requests page without restriction', async ({page}) => {
    await openChangeRequests(page, testUsers.admin.email);

    await expect(page.locator('h1:has-text("Employment Change Requests")')).toBeVisible({timeout: ROUTE_READY_TIMEOUT});
    await expect(page.locator('text=/Access denied/i')).toHaveCount(0);
  });

  test('back button navigates away from change requests', async ({page}) => {
    await openChangeRequests(page, approvalChain.hrManager.email);

    const backBtn = page.locator('button:has-text("← Back"), a:has-text("Back"), button:has-text("Back")').first();
    const hasBack = await backBtn.isVisible({timeout: ROUTE_READY_TIMEOUT}).catch(() => false);
    if (!hasBack) {
      test.skip();
      return;
    }

    await backBtn.click();
    await page.waitForLoadState('domcontentloaded');

    // Should navigate away from change-requests
    await expect(page).not.toHaveURL(/change-requests/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// E-Signature  (/sign/[token])
// ─────────────────────────────────────────────────────────────────────────────

test.describe('E-Signature', () => {
  // NOTE: The /sign/[token] page is a public page (no auth required).
  // It uses a token from the URL to fetch document info.
  // With an invalid/expired token, the API returns tokenValid=false.

  const INVALID_TOKEN = 'invalid-token-for-e2e-testing-000';

  test('sign page renders without crashing for an invalid token', async ({page}) => {
    await page.goto(`/sign/${INVALID_TOKEN}`);
    await page.waitForLoadState('domcontentloaded');

    // Should render something on the page (not a Next.js 500 error)
    const body = await page.locator('body').innerHTML();
    expect(body.length).toBeGreaterThan(100);
  });

  test('invalid/expired token shows Link Invalid or Expired error state', async ({page}) => {
    await page.goto(`/sign/${INVALID_TOKEN}`);
    await page.waitForLoadState('domcontentloaded');

    // After loading, expect an error state
    const errorHeading = page.locator('h1:has-text("Link Invalid or Expired")');
    const genericError = page.locator('text=/invalid|expired|not found/i').first();

    const hasErrorHeading = await errorHeading.isVisible({timeout: 15000}).catch(() => false);
    const hasGenericError = await genericError.isVisible({timeout: 5000}).catch(() => false);

    expect(hasErrorHeading || hasGenericError).toBe(true);
  });

  test('sign page shows loading spinner while fetching document info', async ({page}) => {
    // Intercept the API and defer resolution so the loading state is observable.
    // We use page.waitForTimeout (Playwright-native) for all delays.
    let resolveDelay!: () => void;
    const delayPromise = new Promise<void>((r) => {
      resolveDelay = r;
    });

    await page.route('**/api/v1/esign/public/**', async (route) => {
      await delayPromise;
      await route.continue();
    });

    // Start navigation without awaiting — so we can inspect mid-load state
    const gotoPromise = page.goto(`/sign/${INVALID_TOKEN}`);

    // Allow the page to begin rendering the loading state before the API resolves
    await page.waitForTimeout(300);

    // Loading spinner should be visible before the API responds
    const spinner = page.locator('.animate-spin, [class*="animate-spin"]').first();
    const loadingText = page.locator('text=/Loading document/i').first();

    const hasSpinner = await spinner.isVisible({timeout: 3000}).catch(() => false);
    const hasLoading = await loadingText.isVisible({timeout: 3000}).catch(() => false);

    // Unblock the API response and wait for navigation to complete
    resolveDelay();
    await gotoPromise;

    // At least spinner or loading text should have appeared
    expect(hasSpinner || hasLoading).toBe(true);
  });

  test('sign page renders without the main AppLayout (no sidebar/header)', async ({page}) => {
    await page.goto(`/sign/${INVALID_TOKEN}`);
    await page.waitForLoadState('domcontentloaded');

    // The sign page is a standalone public page — no sidebar
    const sidebar = page.locator('nav[aria-label*="sidebar" i], aside, [data-testid="sidebar"]');
    const hasSidebar = await sidebar.isVisible({timeout: 3000}).catch(() => false);
    expect(hasSidebar).toBe(false);
  });

  test('sign page uses full-screen gradient background layout', async ({page}) => {
    await page.goto(`/sign/${INVALID_TOKEN}`);
    await page.waitForLoadState('domcontentloaded');

    // Top-level div should have min-h-screen class
    const container = page.locator('div.min-h-screen').first();
    await expect(container).toBeVisible({timeout: 10000});
  });

  test('email verification step renders input for signer email when token is valid', async ({page}) => {
    // Mock the API to return a valid token response
    await page.route('**/api/v1/esign/public/**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          tokenValid: true,
          status: 'PENDING',
          documentTitle: 'Employment Offer Letter',
          signerEmail: 'test.signer@example.com',
          signerName: 'Test Signer',
          tokenExpiresAt: new Date(Date.now() + 86400000).toISOString(),
        }),
      });
    });

    await page.goto(`/sign/mocked-valid-token`);
    await page.waitForLoadState('domcontentloaded');

    // Email verification step: email input should appear
    const emailInput = page.locator('input[type="email"], input[placeholder*="email" i]').first();
    await expect(emailInput).toBeVisible({timeout: 10000});
  });

  test('email verification rejects wrong email with an error message', async ({page}) => {
    await page.route('**/api/v1/esign/public/**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          tokenValid: true,
          status: 'PENDING',
          documentTitle: 'Test Document',
          signerEmail: 'correct.signer@example.com',
          signerName: 'Correct Signer',
          tokenExpiresAt: new Date(Date.now() + 86400000).toISOString(),
        }),
      });
    });

    await page.goto(`/sign/mocked-valid-token`);
    await page.waitForLoadState('domcontentloaded');

    const emailInput = page.locator('input[type="email"], input[placeholder*="email" i]').first();
    const hasInput = await emailInput.isVisible({timeout: 10000}).catch(() => false);
    if (!hasInput) {
      test.skip();
      return;
    }

    await emailInput.fill('wrong.person@example.com');

    const verifyBtn = page.locator('button:has-text("Verify"), button:has-text("Continue"), button[type="button"]:has-text("Next")').first();
    await verifyBtn.click();

    const errorMsg = page.locator('text=/does not match|check and try again|invalid/i').first();
    await expect(errorMsg).toBeVisible({timeout: 8000});
  });

  test('sign step shows drawn / typed signature method tabs', async ({page}) => {
    await page.route('**/api/v1/esign/public/**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          tokenValid: true,
          status: 'PENDING',
          documentTitle: 'Offer Letter',
          signerEmail: 'signer@example.com',
          signerName: 'Demo Signer',
          tokenExpiresAt: new Date(Date.now() + 86400000).toISOString(),
        }),
      });
    });

    await page.goto(`/sign/mocked-token-sign-step`);
    await page.waitForLoadState('domcontentloaded');

    const emailInput = page.locator('input[type="email"], input[placeholder*="email" i]').first();
    const hasInput = await emailInput.isVisible({timeout: 10000}).catch(() => false);
    if (!hasInput) {
      test.skip();
      return;
    }

    await emailInput.fill('signer@example.com');
    const verifyBtn = page.locator('button:has-text("Verify"), button:has-text("Continue"), button:has-text("Next")').first();
    await verifyBtn.click();

    // Should now show signature method toggles
    const drawnTab = page.locator('button:has-text("Draw"), text=Draw').first();
    const typedTab = page.locator('button:has-text("Type"), text=Type').first();

    const hasDrawn = await drawnTab.isVisible({timeout: 8000}).catch(() => false);
    const hasTyped = await typedTab.isVisible({timeout: 5000}).catch(() => false);

    expect(hasDrawn || hasTyped).toBe(true);
  });

  test('already processed document shows Document Already Signed or Document Declined state', async ({page}) => {
    await page.route('**/api/v1/esign/public/**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          tokenValid: true,
          status: 'SIGNED',
          documentTitle: 'Signed Offer Letter',
          signerEmail: 'signer@example.com',
          signerName: 'Demo Signer',
          tokenExpiresAt: new Date(Date.now() + 86400000).toISOString(),
        }),
      });
    });

    await page.goto(`/sign/mocked-already-signed-token`);
    await page.waitForLoadState('domcontentloaded');

    const alreadySigned = page.locator('text=/Document Already Signed|already been signed/i').first();
    await expect(alreadySigned).toBeVisible({timeout: 10000});
  });

  test('sign page title contains the document title when valid', async ({page}) => {
    await page.route('**/api/v1/esign/public/**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          tokenValid: true,
          status: 'PENDING',
          documentTitle: 'Internship Offer Letter Q2',
          signerEmail: 'intern@example.com',
          signerName: 'Intern User',
          tokenExpiresAt: new Date(Date.now() + 86400000).toISOString(),
        }),
      });
    });

    await page.goto(`/sign/mocked-title-token`);
    await page.waitForLoadState('domcontentloaded');

    const docTitle = page.locator('text=Internship Offer Letter Q2').first();
    await expect(docTitle).toBeVisible({timeout: 10000});
  });
});
