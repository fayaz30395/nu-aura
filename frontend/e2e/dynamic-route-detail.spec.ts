import {expect, Page, test} from '@playwright/test';

/**
 * Spec-authoring gap closure for dynamic ([id]/[slug]/[token]) routes.
 *
 * e2e/generated/route-smoke.spec.ts drives e2e/generated/routes.json, which is
 * a STATIC route list — Next.js dynamic segments were never enumerable into it,
 * so 40 detail-page routes (frontend/app/**\/[id|slug|token]/page.tsx) had zero
 * spec coverage. See qa-reports/verification-2026-09-24/dynamic-route-specs.md.
 *
 * Each test here resolves a REAL record id (Flyway-seeded where one exists, an
 * API list lookup otherwise — never a created-in-test row, to avoid the
 * order-dependency that bit PayrollE2ETest) and asserts the detail page renders
 * a field belonging to THAT record, not merely a 200 status.
 *
 * Runs under the `chromium` project (SUPER_ADMIN storageState — see
 * playwright.config.ts / e2e/auth.setup.ts), so no login step is needed here.
 */

// Flyway V49__org_chart_demo_data.sql — tenant 660e8400-e29b-41d4-a716-446655440001.
// Sumit Kumar, EMP-0002, Engineering Manager — reports to Fayaz M. Stable seed id.
const SEEDED_EMPLOYEE_ID = '48000000-e001-0000-0000-000000000001';
const SEEDED_EMPLOYEE_NAME = 'Sumit';
const SEEDED_EMPLOYEE_CODE = 'EMP-0002';

// Flyway V76__seed_projects_allocations.sql — same tenant. Stable seed id.
const SEEDED_PROJECT_ID = '48000000-0e03-0000-0000-000000000001';
const SEEDED_PROJECT_NAME = 'NU-AURA Platform V2.0';

/**
 * Fetches the first item of a paginated (Spring Data `Page<T>`) or plain-array
 * list endpoint via the authenticated browser session (same cookies as `page`,
 * routed through the Next.js /api/v1 rewrite — same path the app itself uses).
 * Returns null ONLY when the list is genuinely empty, so callers skip on missing
 * test data. A non-2xx or unparseable response THROWS — conflating "module has
 * no rows" with "the list endpoint is broken" would let a real API defect show
 * up as a green skip.
 */
async function firstListItem(page: Page, apiPath: string): Promise<Record<string, string> | null> {
  const res = await page.request.get(apiPath);
  if (!res.ok()) {
    throw new Error(`GET ${apiPath} returned ${res.status()} ${res.statusText()} — list endpoint broken, not empty`);
  }
  const body = await res.json();
  if (!body) throw new Error(`GET ${apiPath} returned an empty body`);
  const list = Array.isArray(body) ? body : (body.content ?? body.data ?? []);
  return Array.isArray(list) && list.length > 0 ? list[0] : null;
}

test.describe('@dynamic-route detail pages', () => {
  test('/employees/[id] renders the seeded employee record', async ({page}) => {
    await page.goto(`/employees/${SEEDED_EMPLOYEE_ID}`);
    await expect(page.getByText(SEEDED_EMPLOYEE_NAME, {exact: false}).first()).toBeVisible({timeout: 20000});
    await expect(page.getByText(SEEDED_EMPLOYEE_CODE, {exact: false}).first()).toBeVisible();
  });

  test('/projects/[id] renders the seeded project record', async ({page}) => {
    await page.goto(`/projects/${SEEDED_PROJECT_ID}`);
    await expect(page.getByText(SEEDED_PROJECT_NAME, {exact: false}).first()).toBeVisible({timeout: 20000});
  });

  test('/payroll/runs/[id] renders a real payroll run', async ({page}) => {
    const run = await firstListItem(page, '/api/v1/payroll/runs?size=1');
    test.skip(!run, 'No payroll run exists in this environment (empty list) — cannot resolve a real id.');
    await page.goto(`/payroll/runs/${run!.id}`);
    await expect(page.getByText(String(run!.status), {exact: false}).first()).toBeVisible({timeout: 20000});
  });

  test('/recruitment/candidates/[id] renders a real candidate', async ({page}) => {
    const candidate = await firstListItem(page, '/api/v1/recruitment/candidates?size=1');
    test.skip(!candidate, 'No candidate exists in this environment (empty list) — cannot resolve a real id.');
    await page.goto(`/recruitment/candidates/${candidate!.id}`);
    await expect(page.getByText(String(candidate!.fullName), {exact: false}).first()).toBeVisible({timeout: 20000});
  });

  test('/learning/courses/[id] renders a real course', async ({page}) => {
    const course = await firstListItem(page, '/api/v1/lms/courses?size=1');
    test.skip(!course, 'No course exists in this environment (empty list) — cannot resolve a real id.');
    await page.goto(`/learning/courses/${course!.id}`);
    await expect(page.getByText(String(course!.title), {exact: false}).first()).toBeVisible({timeout: 20000});
  });

  test('/fluence/wiki/[slug] renders a real wiki page', async ({page}) => {
    const wikiPage = await firstListItem(page, '/api/v1/knowledge/wiki/pages?size=1');
    test.skip(!wikiPage, 'No wiki page exists in this environment (empty list) — cannot resolve a real id.');
    // Route param is named [slug] but the page actually treats it as the page id.
    await page.goto(`/fluence/wiki/${wikiPage!.id}`);
    await expect(page.getByText(String(wikiPage!.title), {exact: false}).first()).toBeVisible({timeout: 20000});
  });

  test('/fluence/blogs/[slug] renders a real blog post', async ({page}) => {
    const post = await firstListItem(page, '/api/v1/knowledge/blogs?size=1');
    test.skip(!post, 'No blog post exists in this environment (empty list) — cannot resolve a real id.');
    // Route param is named [slug] but the page actually treats it as the post id.
    await page.goto(`/fluence/blogs/${post!.id}`);
    await expect(page.getByText(String(post!.title), {exact: false}).first()).toBeVisible({timeout: 20000});
  });

  test('/onboarding/[id] renders a real onboarding process', async ({page}) => {
    const process = await firstListItem(page, '/api/v1/onboarding/processes?size=1');
    test.skip(!process, 'No onboarding process exists in this environment (empty list) — cannot resolve a real id.');
    await page.goto(`/onboarding/${process!.id}`);
    await expect(page.getByText(String(process!.employeeName), {exact: false}).first()).toBeVisible({timeout: 20000});
  });

  test('/offboarding/[id] renders a real offboarding process', async ({page}) => {
    const process = await firstListItem(page, '/api/v1/offboarding?size=1');
    test.skip(!process, 'No offboarding process exists in this environment (empty list) — cannot resolve a real id.');
    await page.goto(`/offboarding/${process!.id}`);
    await expect(page.getByText(String(process!.employeeName), {exact: false}).first()).toBeVisible({timeout: 20000});
  });

  test('/surveys/[id] renders a real survey', async ({page}) => {
    const survey = await firstListItem(page, '/api/v1/surveys?size=1');
    test.skip(!survey, 'No survey exists in this environment (empty list) — cannot resolve a real id.');
    await page.goto(`/surveys/${survey!.id}`);
    await expect(page.getByText(String(survey!.title), {exact: false}).first()).toBeVisible({timeout: 20000});
  });
});
