---
name: nu-e2e
description: Use when asked to write E2E tests, generate Playwright tests, test a specific page/feature, or add automated test coverage for a route. Generates .spec.ts files in frontend/e2e/ following the project's Page Object Model pattern.
---

# Playwright E2E Test Generator

## When to Use

- "Write E2E tests for X"
- "Test the Y page"
- "Add Playwright tests for Z"
- "Generate tests for this feature"
- "Cover the expenses page with E2E tests"

**This skill generates test FILES for individual features/pages.** It does NOT:

- Run manual Chrome MCP QA (that is `nu-aura-full-platform-qa`)
- Test cross-module workflows like hire-to-retire (that is `nu-aura-e2e-lifecycle`)

## Inputs

Before generating, gather from the user (or infer from context):

| Input             | Required                       | Example                                            |
|-------------------|--------------------------------|----------------------------------------------------|
| Feature/page name | Yes                            | "Leave Management", "Expenses", "Training Catalog" |
| Route path        | Yes (infer from `apps.ts`)     | `/leave`, `/expenses`, `/training`                 |
| Roles to test     | No (default: Employee + Admin) | Employee, Manager, HR Admin, SuperAdmin            |
| CRUD operations   | No (auto-detect from page)     | Create, Read, Update, Delete                       |
| Has modals/forms  | No (auto-detect)               | Yes — "Apply Leave" modal                          |

## Pre-Generation Steps

1. **Read the target page** to understand its UI structure:
   ```
   frontend/app/<module>/page.tsx
   frontend/app/<module>/<sub>/page.tsx
   ```

2. **Check for an existing Page Object** in `frontend/e2e/pages/`:

- Existing: `LoginPage.ts`, `LeavePage.ts`, `EmployeePage.ts`, `AttendancePage.ts`,
  `DashboardPage.ts`, `HomePage.ts`, `ProjectsPage.ts`, `BasePage.ts`
- If one exists for this module, import and use it
- If not, create a new Page Object alongside the spec file

3. **Check for existing test coverage** — `frontend/e2e/<feature>.spec.ts`

- If file exists, extend it rather than overwriting

4. **Read fixture data** — `frontend/e2e/fixtures/testData.ts`

- Use existing test data constants (`testUsers`, `testEmployee`, `testLeave`, etc.)
- Add new fixture data to `testData.ts` if needed for the feature

## Generated File Structure

### Spec File: `frontend/e2e/<feature-name>.spec.ts`

```typescript
import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { testUsers, demoUsers } from './fixtures/testData';
import { loginAs, switchUser, navigateTo } from './fixtures/helpers';

/**
 * <Feature Name> E2E Tests
 * Tests <brief description of what is tested>
 */

test.describe('<Feature Name>', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);

    // Login as appropriate role
    await loginPage.navigate();
    await loginPage.login(testUsers.admin.email, testUsers.admin.password);
    await page.waitForURL('**/dashboard');

    // Navigate to feature page
    await page.goto('/<route>');
    await page.waitForLoadState('networkidle');
  });

  // ── Page Load ──────────────────────────────────────────────────────────
  test.describe('Page Load', () => {
    test('should display page heading and primary action', async ({ page }) => {
      // ...
    });

    test('should have no console errors on load', async ({ page }) => {
      const errors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') errors.push(msg.text());
      });

      await page.goto('/<route>');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // Filter out known benign errors (e.g., favicon, HMR)
      const realErrors = errors.filter(
        (e) => !e.includes('favicon') && !e.includes('[HMR]') && !e.includes('hydration')
      );
      expect(realErrors).toHaveLength(0);
    });
  });

  // ── RBAC ───────────────────────────────────────────────────────────────
  test.describe('RBAC', () => {
    test('should allow <authorized role> to access page', async ({ page }) => {
      // ...
    });

    test('should redirect unauthorized role', async ({ page }) => {
      // Login as employee (lowest role)
      await loginAs(page, demoUsers.employeeSaran.email);
      await page.goto('/<admin-only-route>');
      await page.waitForLoadState('networkidle');

      // Should redirect to dashboard or show 403
      const url = page.url();
      expect(url).not.toContain('/<admin-only-route>');
    });
  });

  // ── CRUD Operations ────────────────────────────────────────────────────
  test.describe('Create', () => { /* ... */ });
  test.describe('Read / List', () => { /* ... */ });
  test.describe('Update', () => { /* ... */ });
  test.describe('Delete', () => { /* ... */ });

  // ── Form Validation ────────────────────────────────────────────────────
  test.describe('Form Validation', () => { /* ... */ });

  // ── Table / List ───────────────────────────────────────────────────────
  test.describe('Table', () => { /* ... */ });

  // ── Edge Cases ─────────────────────────────────────────────────────────
  test.describe('Edge Cases', () => { /* ... */ });

  // ── Visual Regression ──────────────────────────────────────────────────
  test.describe('Visual Regression', () => { /* ... */ });
});
```

## Test Categories (Include All That Apply)

### 1. Page Load (ALWAYS include)

```typescript
test('should display page heading', async ({ page }) => {
  const heading = page.locator('h1, h2').first();
  await expect(heading).toBeVisible({ timeout: 10000 });
});

test('should have no console errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  await page.goto('/<route>');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  const realErrors = errors.filter(
    (e) => !e.includes('favicon') && !e.includes('[HMR]') && !e.includes('hydration')
  );
  expect(realErrors).toHaveLength(0);
});
```

### 2. RBAC Boundary Tests

Test with these demo users from `fixtures/testData.ts`:

| Alias                        | Email                  | Role              | Use For                   |
|------------------------------|------------------------|-------------------|---------------------------|
| `demoUsers.superAdmin`       | `fayaz.m@nulogic.io`   | SUPER_ADMIN       | Full access, bypasses all |
| `demoUsers.managerEng`       | `sumit@nulogic.io`     | MANAGER           | Team management views     |
| `demoUsers.teamLeadEng`      | `mani@nulogic.io`      | TEAM_LEAD         | Team-level access         |
| `demoUsers.hrManager`        | `jagadeesh@nulogic.io` | HR_MANAGER        | HR admin views            |
| `demoUsers.recruitmentAdmin` | `suresh@nulogic.io`    | RECRUITMENT_ADMIN | Hire module only          |
| `demoUsers.employeeSaran`    | `saran@nulogic.io`     | EMPLOYEE          | Self-service only         |
| `demoUsers.employeeRaj`      | `raj@nulogic.io`       | EMPLOYEE          | Reports to Mani (TL)      |

```typescript
test('Employee cannot access admin-only feature', async ({ page }) => {
  await loginAs(page, 'saran@nulogic.io');
  await page.goto('/admin/roles');
  await page.waitForLoadState('networkidle');
  // Should redirect away or show forbidden
  expect(page.url()).not.toContain('/admin/roles');
});
```

### 3. CRUD Operations

```typescript
// CREATE — open modal, fill form, submit
test('should create <resource> via modal', async ({ page }) => {
  const addButton = page.locator('button:has-text("Add"), button:has-text("Create"), button:has-text("New")').first();
  await expect(addButton).toBeVisible();
  await addButton.click();

  // Wait for modal
  const modal = page.locator('[role="dialog"], div.fixed.inset-0').filter({ hasText: /<Title>/i });
  await expect(modal).toBeVisible({ timeout: 10000 });

  // Fill form fields (adapt selectors to the actual page)
  await page.locator('input[name="name"], label:has-text("Name") + input').fill('E2E Test Item');

  // Submit
  const submitBtn = page.locator('button[type="submit"], button:has-text("Save"), button:has-text("Submit")').first();
  await submitBtn.click();

  // Modal should close on success
  await page.waitForTimeout(1500);
  const isModalVisible = await modal.isVisible().catch(() => false);
  expect(isModalVisible).toBe(false);
});

// READ — verify table/list
test('should display <resource> table with data', async ({ page }) => {
  const table = page.locator('table, [role="table"]').first();
  await expect(table).toBeVisible({ timeout: 10000 });

  const rowCount = await table.locator('tbody tr').count();
  expect(rowCount).toBeGreaterThanOrEqual(0);
});

// DELETE — confirmation dialog
test('should show delete confirmation', async ({ page }) => {
  const deleteBtn = page.locator('button[aria-label*="delete" i], button:has-text("Delete")').first();
  if (await deleteBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await deleteBtn.click();
    // Confirm dialog should appear
    const confirmDialog = page.locator('text=/Are you sure|Confirm|Delete/i');
    await expect(confirmDialog).toBeVisible({ timeout: 5000 });
  }
});
```

### 4. Form Validation

```typescript
test('should validate required fields on empty submit', async ({ page }) => {
  // Open form
  await page.locator('button:has-text("Add"), button:has-text("Create")').first().click();
  const modal = page.locator('[role="dialog"], div.fixed.inset-0').first();
  await expect(modal).toBeVisible({ timeout: 10000 });

  // Submit empty
  await page.locator('button[type="submit"], button:has-text("Save")').first().click();

  // Modal should stay open (validation prevented submit)
  await expect(modal).toBeVisible();
});

test('should show validation error for invalid input', async ({ page }) => {
  // Fill with invalid data and check for error message
  // e.g., email field with non-email value
});
```

### 5. Table / List Interactions

```typescript
test('should search/filter items', async ({ page }) => {
  const searchInput = page.locator('input[placeholder*="search" i], input[placeholder*="filter" i]').first();
  if (await searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    await searchInput.fill('test');
    await page.waitForLoadState('networkidle');
    // Results should update
  }
});

test('should paginate results', async ({ page }) => {
  const nextPageBtn = page.locator('button:has-text("Next"), button[aria-label="Next page"]').first();
  if (await nextPageBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await nextPageBtn.click();
    await page.waitForLoadState('networkidle');
  }
});

test('should sort by column', async ({ page }) => {
  const sortableHeader = page.locator('th').filter({ hasText: /Name|Date|Status/ }).first();
  if (await sortableHeader.isVisible({ timeout: 3000 }).catch(() => false)) {
    await sortableHeader.click();
    await page.waitForLoadState('networkidle');
  }
});
```

### 6. Empty / Loading / Error States

```typescript
test('should display loading skeleton before data', async ({ page }) => {
  // Navigate with slow network simulation if needed
  const skeleton = page.locator('[class*="skeleton"], [class*="Skeleton"], [data-testid*="skeleton"]');
  // Skeleton may flash briefly — check within first 2 seconds
});

test('should display empty state when no data', async ({ page }) => {
  // Search for something that returns no results
  const searchInput = page.locator('input[placeholder*="search" i]').first();
  if (await searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    await searchInput.fill('zzz_nonexistent_item_xyz');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    const emptyState = page.locator('text=/No .* found|No results|No data/i');
    const hasEmpty = await emptyState.isVisible({ timeout: 5000 }).catch(() => false);
    expect(hasEmpty).toBe(true);
  }
});
```

### 7. Modal Interactions

```typescript
test('should close modal on cancel/X button', async ({ page }) => {
  // Open modal
  await page.locator('button:has-text("Add"), button:has-text("Create")').first().click();
  const modal = page.locator('[role="dialog"], div.fixed.inset-0').first();
  await expect(modal).toBeVisible({ timeout: 10000 });

  // Close via X button or Cancel
  const closeBtn = page.locator('button:has-text("Cancel"), button[aria-label="Close"]').first();
  await closeBtn.click();

  const isModalVisible = await modal.isVisible().catch(() => false);
  expect(isModalVisible).toBe(false);
});
```

### 8. Visual Regression (Optional)

```typescript
test('should match page snapshot', async ({ page }) => {
  await expect(page).toHaveScreenshot('<feature>-page.png', {
    maxDiffPixels: 200,
  });
});
```

## Auth Patterns

Use the fastest auth method for the test context:

```typescript
// Pattern 1: UI login via LoginPage (when testing auth flow itself)
await loginPage.navigate();
await loginPage.login(testUsers.admin.email, testUsers.admin.password);
await page.waitForURL('**/dashboard');

// Pattern 2: API login via helper (fastest, for non-auth tests)
import { loginAs } from './fixtures/helpers';
await loginAs(page, 'fayaz.m@nulogic.io');

// Pattern 3: Switch between users for approval flows
import { switchUser } from './fixtures/helpers';
await switchUser(page, 'raj@nulogic.io', 'mani@nulogic.io');
```

## Selector Priorities

Use selectors in this order of preference:

1. `[data-testid="..."]` — best, but not always available
2. `[role="..."]` — semantic, stable
3. `button:has-text("...")`, `h1:has-text("...")` — text-based, readable
4. `label:has-text("...") + input`, `label:has-text("...") .. input` — form fields via label
5. `input[name="..."]`, `input[placeholder*="..."]` — attribute-based
6. `[class*="badge"]`, `[class*="skeleton"]` — class fragments (last resort)

Avoid:

- Fragile CSS class selectors (`div.bg-accent-600.p-4`)
- Index-based selectors unless intentional (`nth(0)` for "first row")

## Naming Convention

- Spec file: `frontend/e2e/<feature-kebab-case>.spec.ts`
- Page object: `frontend/e2e/pages/<FeatureName>Page.ts`
- Describe blocks: `test.describe('<Feature Name>', () => { ... })`
- Test names: `test('should <verb> <what>', async ({ page }) => { ... })`

## Route Reference (from apps.ts)

### NU-HRMS

`/me`, `/dashboard`, `/employees`, `/departments`, `/attendance`, `/leave`, `/payroll`,
`/compensation`, `/benefits`, `/expenses`, `/loans`, `/travel`, `/assets`, `/letters`, `/statutory`,
`/tax`, `/helpdesk`, `/approvals`, `/announcements`, `/org-chart`, `/timesheets`, `/time-tracking`,
`/projects`, `/resources`, `/allocations`, `/calendar`, `/shifts`, `/reports`, `/analytics`,
`/settings`, `/admin`, `/overtime`, `/probation`

### NU-Hire

`/recruitment`, `/onboarding`, `/preboarding`, `/offboarding`, `/offer-portal`, `/careers`,
`/referrals`

### NU-Grow

`/performance`, `/okr`, `/feedback360`, `/training`, `/learning`, `/recognition`, `/surveys`,
`/wellness`, `/one-on-one`

### NU-Fluence

`/fluence/wiki`, `/fluence/blogs`, `/fluence/templates`, `/fluence/drive`, `/fluence/search`,
`/fluence/my-content`, `/fluence/wall`, `/fluence/dashboard`, `/fluence/analytics`

## Output

After generating the test file, report:

1. **File path**: `frontend/e2e/<feature>.spec.ts`
2. **Tests generated**: count of test cases by category
3. **Run command**:
   ```bash
   npx playwright test e2e/<feature>.spec.ts --project=chromium
   ```
4. **Watch command**:
   ```bash
   npx playwright test e2e/<feature>.spec.ts --ui
   ```
5. **New fixtures added** (if any): what was added to `testData.ts`
6. **New Page Object created** (if any): `frontend/e2e/pages/<Feature>Page.ts`

## Rate Limiting Warning

The backend rate-limits `/api/v1/auth/**` at 5 requests/minute. If the test suite has multiple
`test.beforeEach` blocks that each log in, consider:

- Using `loginAs()` (API-based, still counts toward rate limit)
- Grouping tests that share the same role into one `test.describe` with a single `beforeEach`
- Adding `await page.waitForTimeout(15000)` between role switches if tests fail with 429
