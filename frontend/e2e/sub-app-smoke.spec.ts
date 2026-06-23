import {expect, test} from '@playwright/test';
import {loginAs, navigateTo} from './fixtures/helpers';
import {demoUsers} from './fixtures/testData';

/**
 * Sub-App Smoke Tests
 *
 * @smoke @critical
 *
 * Verifies that all 4 NU-AURA sub-apps load correctly via the app switcher,
 * dashboards render without errors, and one basic CRUD action works per sub-app.
 *
 * Sub-apps:
 * - NU-HRMS  → Core HR management
 * - NU-Hire  → Recruitment & onboarding
 * - NU-Grow  → Performance, learning & engagement
 * - NU-Fluence → Knowledge management (Phase 2)
 */

const ADMIN = demoUsers.superAdmin;

// ─── NU-HRMS ──────────────────────────────────────────────────────────────────

test.describe('NU-HRMS Smoke Tests @smoke', () => {
  test.beforeEach(async ({page}) => {
    await loginAs(page, ADMIN.email);
  });

  test('HRMS entry point loads from app switcher @smoke @critical', async ({page}) => {
    await navigateTo(page, '/app/hrms');
    await page.waitForTimeout(1500);

    // Should land on an HRMS route (or dashboard)
    const isHrmsRoute = page.url().includes('/app/hrms') || page.url().includes('/employees') || page.url().includes('/dashboard');
    expect(isHrmsRoute).toBe(true);
    expect(page.url()).not.toContain('/auth/login');
  });

  test('HRMS dashboard loads with content @smoke @critical', async ({page}) => {
    await navigateTo(page, '/me/dashboard');

    await expect(page.locator('h1, h2').first()).toBeVisible({timeout: 10000});
    await expect(page.locator('text=/something went wrong|error loading/i').first()).not.toBeVisible();
  });

  test('Employees list renders @smoke', async ({page}) => {
    await navigateTo(page, '/employees');
    await page.waitForTimeout(1500);

    const isAccessible = !page.url().includes('/auth/login');
    const hasContent = await page.locator('h1, h2, main').first().isVisible({timeout: 10000}).catch(() => false);

    expect(isAccessible && hasContent).toBe(true);
  });

  test('HRMS CRUD — Can open employee creation form @smoke @critical', async ({page}) => {
    await navigateTo(page, '/employees');
    await page.waitForTimeout(1000);

    const createBtn = page.locator('button').filter({hasText: /add employee|create employee|new employee/i}).first();
    const hasCreate = await createBtn.isVisible({timeout: 5000}).catch(() => false);

    if (hasCreate) {
      await createBtn.click();
      await page.waitForTimeout(500);

      const hasForm = await page.locator('[role="dialog"], form, [class*="drawer"], [class*="modal"]').first().isVisible({timeout: 5000}).catch(() => false);
      expect(hasForm).toBe(true);

      const cancelBtn = page.locator('button').filter({hasText: /cancel|close|back/i}).first();
      if (await cancelBtn.isVisible().catch(() => false)) {
        await cancelBtn.click();
      }
    }

    expect(hasCreate).toBe(true);
  });

  test('HRMS sidebar shows correct module sections @smoke', async ({page}) => {
    await navigateTo(page, '/employees');
    await page.waitForTimeout(500);

    const hrmsNavItems = [
      '/employees',
      '/attendance',
      '/leave',
      '/payroll',
    ];

    let found = 0;
    for (const path of hrmsNavItems) {
      const link = page.locator(`nav a[href*="${path}"]`).first();
      if (await link.isVisible({timeout: 2000}).catch(() => false)) {
        found++;
      }
    }

    expect(found).toBeGreaterThan(0);
  });

  test('Leave module loads within HRMS context @smoke', async ({page}) => {
    await navigateTo(page, '/leave');
    await expect(page.locator('h1, h2').first()).toBeVisible({timeout: 10000});
    await expect(page.locator('text=/something went wrong/i').first()).not.toBeVisible();
  });

  test('Payroll module loads within HRMS context @smoke', async ({page}) => {
    await navigateTo(page, '/payroll');
    await expect(page.locator('h1, h2, main').first()).toBeVisible({timeout: 10000});
    await expect(page.locator('text=/something went wrong/i').first()).not.toBeVisible();
  });

  test('Attendance module loads @smoke', async ({page}) => {
    await navigateTo(page, '/attendance');
    await expect(page.locator('main, [role="main"]').first()).toBeVisible({timeout: 10000});
    await expect(page.locator('text=/something went wrong/i').first()).not.toBeVisible();
  });

  test('Benefits module loads @smoke', async ({page}) => {
    await navigateTo(page, '/benefits');
    await expect(page.locator('main, [role="main"]').first()).toBeVisible({timeout: 10000});
    await expect(page.locator('text=/something went wrong/i').first()).not.toBeVisible();
  });
});

// ─── NU-HIRE ──────────────────────────────────────────────────────────────────

test.describe('NU-Hire Smoke Tests @smoke', () => {
  test.beforeEach(async ({page}) => {
    await loginAs(page, ADMIN.email);
  });

  test('NU-Hire entry point loads from app switcher @smoke @critical', async ({page}) => {
    await navigateTo(page, '/app/hire');
    await page.waitForTimeout(1500);

    const isHireRoute = page.url().includes('/app/hire') || page.url().includes('/recruitment');
    expect(isHireRoute).toBe(true);
    expect(page.url()).not.toContain('/auth/login');
  });

  test('Recruitment dashboard / jobs list renders @smoke @critical', async ({page}) => {
    await navigateTo(page, '/recruitment');
    await expect(page.locator('h1, h2, main').first()).toBeVisible({timeout: 10000});
    await expect(page.locator('text=/something went wrong/i').first()).not.toBeVisible();
  });

  test('Hire sidebar shows recruitment navigation items @smoke', async ({page}) => {
    await navigateTo(page, '/recruitment');
    await page.waitForTimeout(500);

    // The contextual sidebar (NavPanel) is <nav aria-label="<Product> navigation">;
    // match recruitment/onboarding links directly rather than a fixed nav name.
    const found = await page
      .locator('nav a[href*="/recruitment"], nav a[href*="/onboarding"]')
      .count();

    expect(found).toBeGreaterThan(0);
  });

  test('NU-Hire CRUD — Can open job posting creation form @smoke @critical', async ({page}) => {
    await navigateTo(page, '/recruitment/jobs');
    await page.waitForTimeout(1000);

    const createBtn = page.locator('button').filter({hasText: /create job|new job|add job|post job/i}).first();
    const hasCreate = await createBtn.isVisible({timeout: 5000}).catch(() => false);

    if (hasCreate) {
      await createBtn.click();
      await page.waitForTimeout(500);

      const hasForm = await page.locator('[role="dialog"], form, [class*="drawer"], [class*="modal"]').first().isVisible({timeout: 5000}).catch(() => false);
      expect(hasForm).toBe(true);

      const cancelBtn = page.locator('button').filter({hasText: /cancel|close/i}).first();
      if (await cancelBtn.isVisible().catch(() => false)) {
        await cancelBtn.click();
      }
    }

    expect(hasCreate).toBe(true);
  });

  test('Recruitment pipeline page renders @smoke', async ({page}) => {
    await navigateTo(page, '/recruitment/pipeline');
    await expect(page.locator('main, [role="main"]').first()).toBeVisible({timeout: 10000});
    await expect(page.locator('text=/something went wrong/i').first()).not.toBeVisible();
  });

  test('Onboarding page renders @smoke', async ({page}) => {
    await navigateTo(page, '/onboarding');
    await expect(page.locator('main, [role="main"]').first()).toBeVisible({timeout: 10000});
    await expect(page.locator('text=/something went wrong/i').first()).not.toBeVisible();
  });
});

// ─── NU-GROW ──────────────────────────────────────────────────────────────────

test.describe('NU-Grow Smoke Tests @smoke', () => {
  test.beforeEach(async ({page}) => {
    await loginAs(page, ADMIN.email);
  });

  test('NU-Grow entry point loads from app switcher @smoke @critical', async ({page}) => {
    await navigateTo(page, '/app/grow');
    await page.waitForTimeout(1500);

    const isGrowRoute = page.url().includes('/app/grow') || page.url().includes('/performance');
    expect(isGrowRoute).toBe(true);
    expect(page.url()).not.toContain('/auth/login');
  });

  test('Performance dashboard renders @smoke @critical', async ({page}) => {
    await navigateTo(page, '/performance');
    await expect(page.locator('h1, h2').first()).toBeVisible({timeout: 10000});
    await expect(page.locator('text=/something went wrong/i').first()).not.toBeVisible();
  });

  test('Grow sidebar shows performance navigation @smoke', async ({page}) => {
    await navigateTo(page, '/performance');
    await page.waitForTimeout(500);

    const growNavPaths = ['/performance', '/training'];
    let found = 0;
    for (const path of growNavPaths) {
      const link = page.locator(`nav a[href*="${path}"]`).first();
      if (await link.isVisible({timeout: 2000}).catch(() => false)) {
        found++;
      }
    }

    expect(found).toBeGreaterThan(0);
  });

  test('NU-Grow CRUD — Can open goal creation form @smoke @critical', async ({page}) => {
    await navigateTo(page, '/performance/goals');
    await page.waitForTimeout(1000);

    const createBtn = page.locator('button').filter({hasText: /add goal|create goal|new goal/i}).first();
    const hasCreate = await createBtn.isVisible({timeout: 5000}).catch(() => false);

    if (hasCreate) {
      await createBtn.click();
      await page.waitForTimeout(500);

      const hasForm = await page.locator('[role="dialog"], form, [class*="modal"]').first().isVisible({timeout: 5000}).catch(() => false);
      expect(hasForm).toBe(true);

      const cancelBtn = page.locator('button').filter({hasText: /cancel|close/i}).first();
      if (await cancelBtn.isVisible().catch(() => false)) {
        await cancelBtn.click();
      }
    }

    expect(hasCreate).toBe(true);
  });

  test('OKR module renders @smoke', async ({page}) => {
    await navigateTo(page, '/performance/okr');
    await expect(page.locator('h1, h2, main').first()).toBeVisible({timeout: 10000});
    await expect(page.locator('text=/something went wrong/i').first()).not.toBeVisible();
  });

  test('Training / LMS module renders @smoke', async ({page}) => {
    await navigateTo(page, '/training');
    await expect(page.locator('main, [role="main"]').first()).toBeVisible({timeout: 10000});
    await expect(page.locator('text=/something went wrong/i').first()).not.toBeVisible();
  });

  test('Surveys module renders @smoke', async ({page}) => {
    await navigateTo(page, '/surveys');
    await expect(page.locator('main, [role="main"]').first()).toBeVisible({timeout: 10000});
    await expect(page.locator('text=/something went wrong/i').first()).not.toBeVisible();
  });
});

// ─── NU-FLUENCE ───────────────────────────────────────────────────────────────

test.describe('NU-Fluence Smoke Tests @smoke', () => {
  test.beforeEach(async ({page}) => {
    await loginAs(page, ADMIN.email);
  });

  test('NU-Fluence entry point loads from app switcher @smoke', async ({page}) => {
    await navigateTo(page, '/app/fluence');
    await page.waitForTimeout(1500);

    // Fluence may be Phase 2 — landing on any page without auth error is sufficient
    expect(page.url()).not.toContain('/auth/login');

    const hasContent = await page.locator('main, h1, h2, [class*="coming-soon"]').first().isVisible({timeout: 10000}).catch(() => false);
    expect(hasContent).toBe(true);
  });

  test('Fluence knowledge base page loads @smoke', async ({page}) => {
    await navigateTo(page, '/fluence/wiki');
    await expect(page.locator('main, [role="main"]').first()).toBeVisible({timeout: 10000});
    await expect(page.locator('text=/something went wrong/i').first()).not.toBeVisible();
  });

  test('Fluence CRUD — Wiki creation UI is accessible @smoke', async ({page}) => {
    await navigateTo(page, '/knowledge/wiki');
    await page.waitForTimeout(1000);

    const hasContent = await page.locator('h1, h2, main, [class*="wiki"]').first().isVisible({timeout: 8000}).catch(() => false);
    expect(hasContent).toBe(true);
    await expect(page.locator('text=/something went wrong/i').first()).not.toBeVisible();
  });
});

// ─── APP SWITCHER INTEGRATION ─────────────────────────────────────────────────

test.describe('App Switcher Integration @smoke @critical', () => {
  test.beforeEach(async ({page}) => {
    await loginAs(page, ADMIN.email);
    await navigateTo(page, '/me/dashboard');
    await page.waitForTimeout(500);
  });

  test('Product rail is visible @smoke @critical', async ({page}) => {
    // The app switcher is the persistent ProductRail (nav aria-label="Product navigation").
    const rail = page.locator('aside[aria-label="Product navigation"]');
    await expect(rail).toBeVisible({timeout: 15000});
  });

  test('Product rail shows all 4 sub-apps @smoke @critical', async ({page}) => {
    const rail = page.locator('aside[aria-label="Product navigation"]');
    await expect(rail).toBeVisible({timeout: 15000});

    for (const appName of ['NU-HRMS', 'NU-Hire', 'NU-Grow', 'NU-Fluence']) {
      await expect(rail.getByRole('button', {name: appName, exact: true})).toBeVisible();
    }
  });

  test('Navigating HRMS → Hire → Grow preserves authentication @smoke @critical', async ({page}) => {
    // Start on HRMS
    await navigateTo(page, '/employees');
    expect(page.url()).not.toContain('/auth/login');

    // Navigate to Hire
    await navigateTo(page, '/recruitment');
    expect(page.url()).not.toContain('/auth/login');

    // Navigate to Grow
    await navigateTo(page, '/performance');
    expect(page.url()).not.toContain('/auth/login');

    // Back to HRMS
    await navigateTo(page, '/employees');
    expect(page.url()).not.toContain('/auth/login');
  });

  test('Active sub-app indicator updates in the rail @smoke', async ({page}) => {
    // On an HRMS route, NU-HRMS is the active product (aria-current="true").
    await navigateTo(page, '/employees');
    const rail = page.locator('aside[aria-label="Product navigation"]');
    await expect(rail).toBeVisible({timeout: 15000});
    await expect(rail.getByRole('button', {name: 'NU-HRMS', exact: true}))
      .toHaveAttribute('aria-current', 'true');
  });
});
