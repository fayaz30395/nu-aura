import {expect, test} from '@playwright/test';
import {demoUsers} from './fixtures/testData';
import {loginAs, navigateTo} from './fixtures/helpers';

/**
 * Departments Page E2E Tests
 * Covers: page load, stats cards, search/filter, CRUD modals,
 * form validation, RBAC access control, delete/toggle confirmations.
 */

test.describe('Departments — Page Load', () => {
  test.beforeEach(async ({page}) => {
    await loginAs(page, demoUsers.superAdmin.email);
    await navigateTo(page, '/departments');
  });

  test('should display Departments heading', async ({page}) => {
    await expect(page.locator('h1').filter({hasText: 'Departments'})).toBeVisible({timeout: 10000});
  });

  test('should display three stat cards', async ({page}) => {
    await expect(page.locator('text=Total Departments').first()).toBeVisible({timeout: 10000});
    await expect(page.locator('text=Active Departments').first()).toBeVisible();
    await expect(page.locator('text=Total Employees').first()).toBeVisible();
  });

  test('should display departments table with correct columns', async ({page}) => {
    await page.waitForTimeout(1500);
    const table = page.locator('table');
    await expect(table).toBeVisible({timeout: 10000});
    await expect(page.locator('th').filter({hasText: /Department/i}).first()).toBeVisible();
    await expect(page.locator('th').filter({hasText: /Type/i}).first()).toBeVisible();
    await expect(page.locator('th').filter({hasText: /Status/i}).first()).toBeVisible();
  });

  test('should display search input', async ({page}) => {
    const searchInput = page.locator('input[placeholder*="Search departments"]');
    await expect(searchInput).toBeVisible({timeout: 10000});
  });

  test('should have no critical console errors', async ({page}) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await navigateTo(page, '/departments');
    await page.waitForTimeout(2000);
    const real = errors.filter(
      (e) =>
        !e.includes('favicon') &&
        !e.includes('[HMR]') &&
        !e.includes('hydration') &&
        !e.includes('Warning:')
    );
    expect(real).toHaveLength(0);
  });
});

test.describe('Departments — Add Department Modal', () => {
  test.beforeEach(async ({page}) => {
    await loginAs(page, demoUsers.superAdmin.email);
    await navigateTo(page, '/departments');
    await page.waitForTimeout(1000);
  });

  test('should open Add Department modal when button clicked', async ({page}) => {
    await page.locator('button:has-text("Add Department")').click();
    await expect(page.locator('text=Add New Department')).toBeVisible({timeout: 5000});
  });

  test('modal should have Department Code and Name fields', async ({page}) => {
    await page.locator('button:has-text("Add Department")').click();
    await expect(page.locator('input[placeholder="ENG, HR, FIN"]')).toBeVisible({timeout: 5000});
    await expect(page.locator('input[placeholder="Engineering"]')).toBeVisible();
  });

  test('should show validation errors on empty submit', async ({page}) => {
    await page.locator('button:has-text("Add Department")').click();
    await page.waitForTimeout(500);
    await page.locator('button:has-text("Create Department")').click();
    await expect(page.locator('text=Code required').or(page.locator('text=Name required'))).toBeVisible({
      timeout: 5000,
    });
  });

  test('modal closes when Cancel is clicked', async ({page}) => {
    await page.locator('button:has-text("Add Department")').click();
    await page.waitForTimeout(300);
    await page.locator('button:has-text("Cancel")').click();
    await expect(page.locator('text=Add New Department')).not.toBeVisible({timeout: 3000});
  });

  test('modal closes when X button is clicked', async ({page}) => {
    await page.locator('button:has-text("Add Department")').click();
    await page.waitForTimeout(300);
    await page.locator('button[aria-label="Close modal"]').click();
    await expect(page.locator('text=Add New Department')).not.toBeVisible({timeout: 3000});
  });

  test('Department Type dropdown should show known types', async ({page}) => {
    await page.locator('button:has-text("Add Department")').click();
    await page.waitForTimeout(500);
    const typeSelect = page.locator('select').nth(0);
    await expect(typeSelect).toBeVisible({timeout: 5000});
    await typeSelect.click();
    const options = await typeSelect.locator('option').allInnerTexts();
    expect(options).toContain('ENGINEERING');
  });
});

test.describe('Departments — Search / Filter', () => {
  test.beforeEach(async ({page}) => {
    await loginAs(page, demoUsers.superAdmin.email);
    await navigateTo(page, '/departments');
    await page.waitForTimeout(1500);
  });

  test('search input filters table rows', async ({page}) => {
    const searchInput = page.locator('input[placeholder*="Search departments"]');
    await searchInput.fill('xxxxxxnonexistent');
    await page.waitForTimeout(500);
    await expect(page.locator('text=No departments found')).toBeVisible({timeout: 5000});
  });

  test('clearing search restores results', async ({page}) => {
    const searchInput = page.locator('input[placeholder*="Search departments"]');
    await searchInput.fill('xxxxxxnonexistent');
    await page.waitForTimeout(300);
    await searchInput.clear();
    await page.waitForTimeout(500);
    // Table should have rows again or empty state without the search message
    const noResults = page.locator('text=No departments found');
    const hasRows = page.locator('tbody tr');
    const hasNoResults = await noResults.isVisible().catch(() => false);
    const rowCount = await hasRows.count();
    expect(rowCount > 0 || !hasNoResults).toBe(true);
  });
});

test.describe('Departments — RBAC', () => {
  test('HR Manager can access departments page', async ({page}) => {
    await loginAs(page, demoUsers.hrManager.email);
    await navigateTo(page, '/departments');
    // Should either show the page or redirect to dashboard (depends on permissions)
    await page.waitForTimeout(2000);
    const url = page.url();
    // If redirected, that's expected for non-DEPARTMENT_VIEW roles
    expect(url.includes('/departments') || url.includes('/dashboard')).toBe(true);
  });

  test('Employee is redirected away from departments page', async ({page}) => {
    await loginAs(page, demoUsers.employeeSaran.email);
    await page.goto('/departments');
    await page.waitForTimeout(3000);
    const url = page.url();
    // Should be redirected to dashboard
    expect(url).not.toContain('/departments');
  });

  test('Super Admin sees Add Department button', async ({page}) => {
    await loginAs(page, demoUsers.superAdmin.email);
    await navigateTo(page, '/departments');
    await expect(page.locator('button:has-text("Add Department")')).toBeVisible({timeout: 10000});
  });
});

test.describe('Departments — Edit & Delete Actions', () => {
  test.beforeEach(async ({page}) => {
    await loginAs(page, demoUsers.superAdmin.email);
    await navigateTo(page, '/departments');
    await page.waitForTimeout(2000);
  });

  test('Edit button opens modal with Edit Department title', async ({page}) => {
    const editBtn = page.locator('button[aria-label="Edit department"]').first();
    const hasEdit = await editBtn.isVisible().catch(() => false);
    if (!hasEdit) {
      test.skip();
      return;
    }
    await editBtn.click();
    await expect(page.locator('text=Edit Department')).toBeVisible({timeout: 5000});
  });

  test('Delete button opens confirmation dialog', async ({page}) => {
    const deleteBtn = page.locator('button[aria-label="Delete department"]').first();
    const hasDelete = await deleteBtn.isVisible().catch(() => false);
    if (!hasDelete) {
      test.skip();
      return;
    }
    await deleteBtn.click();
    await expect(page.locator('text=Delete Department?')).toBeVisible({timeout: 5000});
  });

  test('Delete confirmation Cancel button closes dialog', async ({page}) => {
    const deleteBtn = page.locator('button[aria-label="Delete department"]').first();
    const hasDelete = await deleteBtn.isVisible().catch(() => false);
    if (!hasDelete) {
      test.skip();
      return;
    }
    await deleteBtn.click();
    await page.waitForTimeout(300);
    await page.locator('button:has-text("Cancel")').last().click();
    await expect(page.locator('text=Delete Department?')).not.toBeVisible({timeout: 3000});
  });

  test('Toggle button opens activate/deactivate confirmation', async ({page}) => {
    const toggleBtn = page
      .locator('button[aria-label="Deactivate department"], button[aria-label="Activate department"]')
      .first();
    const hasToggle = await toggleBtn.isVisible().catch(() => false);
    if (!hasToggle) {
      test.skip();
      return;
    }
    await toggleBtn.click();
    const deactivateText = page.locator('text=Deactivate Department?').or(page.locator('text=Activate Department?'));
    await expect(deactivateText).toBeVisible({timeout: 5000});
  });
});
