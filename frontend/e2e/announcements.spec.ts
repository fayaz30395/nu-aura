import {expect, test} from '@playwright/test';
import {seedLocalStoredAuth} from './fixtures/helpers';
import {testUsers} from './fixtures/testData';

/**
 * Announcements Page Smoke Tests
 * Verifies the Announcements page loads and displays key elements.
 */

test.describe('Announcements Page', () => {
  test.describe.configure({mode: 'serial', timeout: 300000});

  test.beforeEach(async ({page}) => {
    const heading = page.getByRole('heading', {name: 'Announcements', exact: true});
    await page.goto('/announcements', {waitUntil: 'domcontentloaded', timeout: 90000});
    if (await heading.isVisible({timeout: 120000}).catch(() => false)) {
      return;
    }

    await seedLocalStoredAuth(page, testUsers.admin.email);
    await page.goto('/announcements', {waitUntil: 'domcontentloaded', timeout: 90000});
    await expect(heading).toBeVisible({timeout: 120000});
  });

  test('should display announcements page with heading', async ({page}) => {
    await expect(page.getByRole('heading', {name: 'Announcements', exact: true})).toBeVisible();
  });

  test('should not show application error', async ({page}) => {
    await expect(page.locator('body')).not.toContainText('Application error');
  });

  test('should display announcements list or empty state', async ({page}) => {
    await page.waitForTimeout(1000);

    const hasAnnouncements = await page.locator('[class*="card"], [class*="Card"]').first().isVisible().catch(() => false);
    const hasEmpty = await page.locator('text=/no.*announcement|empty/i').first().isVisible().catch(() => false);

    expect(hasAnnouncements || hasEmpty).toBe(true);
  });

  test('should show create announcement button for admin', async ({page}) => {
    await page.waitForTimeout(500);

    const createBtn = page.locator('button:has-text("Create"), button:has-text("New"), button:has-text("Add"), button:has-text("Post")').first();
    const hasCreate = await createBtn.isVisible().catch(() => false);

    expect(hasCreate).toBe(true);
  });

  test('should display search or filter controls', async ({page}) => {
    await page.waitForTimeout(500);

    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]').first();
    const hasSearch = await searchInput.isVisible().catch(() => false);

    if (hasSearch) {
      await searchInput.fill('test');
      await page.waitForTimeout(500);
      await expect(page.locator('body')).not.toContainText('Uncaught');
    }

    expect(hasSearch).toBe(true);
  });
});
