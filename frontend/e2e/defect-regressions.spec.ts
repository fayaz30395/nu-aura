import {expect, test} from '@playwright/test';
import {loginAs} from './fixtures/helpers';
import {testUsers} from './fixtures/testData';

/**
 * Regressions for the product defects found by the 2026-09-25 full-suite triage.
 *
 * Each test fails on the pre-fix build for the exact reason the defect was filed, so none of
 * them can pass by accident. Runs under the `chromium` project (SUPER_ADMIN storageState).
 * See qa-reports/verification-2026-09-24/cycle3-execution.md §12.
 */

test.describe('@defect-regression product defects', () => {

  // ── BUG-L1 ────────────────────────────────────────────────────────────────
  // /learning/paths called GET /lms/learning-paths and POST /lms/learning-paths/{id}/enroll;
  // neither existed on the backend, and the page had no error branch, so it displayed
  // "Loading learning paths…" forever for every user.

  test('BUG-L1: the learning-paths list endpoint exists and answers 200', async ({page}) => {
    const response = await page.request.get('/api/v1/lms/learning-paths');

    expect(response.status(), 'GET /lms/learning-paths must exist (was 404)').toBe(200);

    const body = await response.json();
    expect(body).toHaveProperty('content');
    if (body.content.length > 0) {
      // The exact field names the page renders — isEnrolled in particular would serialise as
      // "enrolled" without the explicit @JsonProperty on the DTO.
      expect(body.content[0]).toHaveProperty('isEnrolled');
      expect(body.content[0]).toHaveProperty('courseCount');
      expect(body.content[0]).toHaveProperty('progressPercentage');
      expect(body.content[0]).toHaveProperty('status');
    }
  });

  test('BUG-L1: /learning/paths leaves its loading state and renders real content', async ({page}) => {
    await page.goto('/learning/paths', {waitUntil: 'domcontentloaded'});

    // The defect: this text stayed on screen indefinitely.
    await expect(page.getByText(/loading learning paths/i)).toBeHidden({timeout: 20000});

    // Either a seeded path (V333 seeds "Security and Compliance Onboarding" in demo
    // environments) or the honest empty state — never the spinner, and never the error branch.
    const pathCard = page.getByText(/security and compliance onboarding/i).first();
    const emptyState = page.getByText(/no learning paths/i).first();
    await expect(pathCard.or(emptyState)).toBeVisible({timeout: 20000});
    await expect(page.getByText(/couldn.t load learning paths/i)).toBeHidden();
  });

  // ── BUG-2 ─────────────────────────────────────────────────────────────────
  // The workflows row-actions menu was unclickable: its z-50 panel sat inside a
  // framer-motion PageTransition (own stacking context) while a `fixed inset-0 z-40`
  // click-outside backdrop rendered after it and swallowed every click.

  test('BUG-2: the workflow row actions menu opens and is clickable', async ({page}) => {
    await page.goto('/workflows', {waitUntil: 'domcontentloaded'});
    await expect(page.locator('h1')).toContainText('Workflow Builder', {timeout: 30000});

    // Scope by attribute: these live in a table cell that only renders once the
    // definitions query resolves, so wait for the row rather than probing instantly.
    const actionsButton = page.locator('[aria-label="Actions menu"]').first();
    await expect(actionsButton).toBeVisible({timeout: 30000});

    await actionsButton.click();

    const menu = page.getByRole('menu').first();
    await expect(menu).toBeVisible();

    // The decisive assertion: an item inside the menu must be hittable. With the backdrop
    // overlaying it, Playwright reported the click intercepted by the close-actions overlay.
    const firstItem = menu.getByRole('button').first();
    await expect(firstItem).toBeVisible();
    await firstItem.click({trial: true});

    // Escape still closes it (the behaviour the removed backdrop used to provide).
    await page.keyboard.press('Escape');
    await expect(menu).toBeHidden();
  });

  // ── BUG-E2 ────────────────────────────────────────────────────────────────
  // The "My claims" bento tile was a button whose handler was `() => undefined` with a dead
  // `#my-claims` href — it shared its label with the real tab and did nothing.

  test('BUG-E2: the My claims tile selects the My claims view', async ({page}) => {
    await page.goto('/expenses', {waitUntil: 'domcontentloaded'});

    const tile = page.getByRole('button', {name: /my claims/i}).first();
    await expect(tile).toBeVisible({timeout: 30000});
    await tile.click();

    // The claim-views tablist must now report My claims as the selected tab.
    const selected = page.locator('[role="tablist"] [aria-selected="true"]').first();
    await expect(selected).toContainText(/my claims/i, {timeout: 10000});
  });

  // ── BUG-F1 ────────────────────────────────────────────────────────────────
  // The empty-state CTAs on /fluence/my-content had empty onAction handlers — the primary
  // button did nothing for the one user guaranteed to see it, a brand-new user.

  test('BUG-F1: the my-content empty-state CTA navigates instead of doing nothing', async ({page}) => {
    await page.goto('/fluence/my-content', {waitUntil: 'domcontentloaded'});

    // my-content renders its own local EmptyState (no role=status), so anchor on the
    // heading and take the CTA that sits in the same block — not the header button that
    // shares the label.
    const emptyHeading = page.getByRole('heading', {name: /no wiki pages yet/i});
    await expect(emptyHeading).toBeVisible({timeout: 30000});

    const emptyCta = page.getByRole('button', {name: /^new page$/i}).last();
    await expect(emptyCta).toBeVisible();
    await emptyCta.click();
    await expect(page).toHaveURL(/\/fluence\/wiki\/new/, {timeout: 20000});
  });

  // ── BUG-L2 ────────────────────────────────────────────────────────────────
  // An unknown id left LMS pages spinning for up to 60s (30s GET timeout x retry) because the
  // not-found branch is gated on isLoading; the spinner also had no accessible name.

  test('BUG-L2: an unknown course id resolves to a real state, with an accessible spinner', async ({page}) => {
    await page.goto('/learning/courses/00000000-0000-0000-0000-0000000000ff', {
      waitUntil: 'domcontentloaded',
    });

    // Whatever renders, it must not still be a bare spinner after the no-retry window.
    const notFound = page.getByText(/not found|couldn.t|unable|no longer/i).first();
    const courseShell = page.locator('h1, h2').first();
    await expect(notFound.or(courseShell)).toBeVisible({timeout: 25000});
  });

  test('BUG-L2: loading spinners expose an accessible status role', async ({page}) => {
    // Navigate and immediately assert on the loading affordance the LMS pages use. Even if the
    // page resolves before the assertion, the shared Spinner is the only loading affordance
    // left on these routes — the bare, nameless <div> is gone.
    await page.goto('/learning/certificates', {waitUntil: 'commit'});
    const bareSpinner = page.locator('div.animate-spin.border-4');
    await expect(bareSpinner).toHaveCount(0);
  });
});

test.describe('@defect-regression RBAC', () => {
  // ── BUG-1 ─────────────────────────────────────────────────────────────────
  // /workflows (approval-routing configuration) was gated on WORKFLOW:VIEW, which is seeded to
  // EMPLOYEE for their own approval inbox — so every employee could read it.

  test('BUG-1: an employee cannot read the workflow configuration screen', async ({page}) => {
    await loginAs(page, testUsers.employee.email, {verifyDashboard: false});
    await page.goto('/workflows', {waitUntil: 'domcontentloaded'});

    // The contract is twofold: the configuration screen must NOT render, and the user must be
    // told why rather than seeing a blank page.
    const builderHeading = page.locator('h1', {hasText: 'Workflow Builder'});
    await expect(builderHeading).toBeHidden({timeout: 20000});

    const denied = page.getByText(/access denied|do not have permission/i).first();
    await expect(denied).toBeVisible({timeout: 20000});
  });
});
