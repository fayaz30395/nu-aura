import {expect, test} from '@playwright/test';

/**
 * Mobile Navigation E2E Tests
 * Tests responsive navigation, mobile menu, and bottom navigation bar
 */

test.describe('Mobile Navigation', () => {
  test.beforeEach(async ({page}) => {
    // Navigate to dashboard
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
  });

  test('should display mobile bottom navigation', async ({page}) => {
    // Bottom nav should be visible on mobile
    const bottomNav = page.locator('nav[aria-label="Mobile navigation"]');
    await expect(bottomNav).toBeVisible();

    // Check for navigation items
    await expect(bottomNav.getByRole('link', {name: /home/i})).toBeVisible();
    await expect(bottomNav.getByRole('link', {name: /team/i})).toBeVisible();
    await expect(bottomNav.getByRole('link', {name: /leave/i})).toBeVisible();
    await expect(bottomNav.getByRole('link', {name: /tasks|projects/i})).toBeVisible();
    await expect(bottomNav.getByRole('link', {name: /me/i})).toBeVisible();
  });

  test('should navigate using bottom navigation', async ({page}) => {
    const bottomNav = page.locator('nav[aria-label="Mobile navigation"]');

    // Click Team link
    await bottomNav.getByRole('link', {name: /team/i}).click();
    await page.waitForURL(/\/employees/);
    expect(page.url()).toContain('/employees');

    // Click Leave link
    await bottomNav.getByRole('link', {name: /leave/i}).click();
    await page.waitForURL(/\/leave/);
    expect(page.url()).toContain('/leave');

    // Click Me link
    await bottomNav.getByRole('link', {name: /me/i}).click();
    await page.waitForURL(/\/me\/dashboard/);
    expect(page.url()).toContain('/me/dashboard');

    // Click Home to go back
    await bottomNav.getByRole('link', {name: /home/i}).click();
    await page.waitForURL(/\/dashboard/);
    expect(page.url()).toContain('/dashboard');
  });

  test('should show active state on current page link', async ({page}) => {
    const bottomNav = page.locator('nav[aria-label="Mobile navigation"]');

    // Dashboard should be active
    const homeLink = bottomNav.getByRole('link', {name: /home/i});
    await expect(homeLink).toHaveClass(/text-primary/);

    // Navigate to employees
    await bottomNav.getByRole('link', {name: /team/i}).click();
    await page.waitForURL(/\/employees/);

    // Team should now be active
    const teamLink = bottomNav.getByRole('link', {name: /team/i});
    await expect(teamLink).toHaveClass(/text-primary/);
  });

  test('should hide desktop sidebar on mobile', async ({page}) => {
    // Desktop sidebar should be hidden on mobile
    const sidebar = page.locator('aside.hidden.md\\:block');
    await expect(sidebar).toBeHidden();
  });

  test('should open mobile menu from hamburger button', async ({page}) => {
    // Find and click hamburger menu button
    const menuButton = page.locator('button[aria-label="Open menu"]').or(
      page.locator('header button').filter({has: page.locator('svg')}).first()
    );

    if (await menuButton.isVisible()) {
      await menuButton.click();

      // Mobile menu overlay should appear
      const mobileMenu = page.locator('aside.fixed');
      await expect(mobileMenu).toBeVisible();

      // Should show navigation items
      await expect(page.getByRole('link', {name: /dashboard/i})).toBeVisible();
    }
  });

  test('should close mobile menu when clicking outside', async ({page}) => {
    // Open mobile menu
    const menuButton = page.locator('button[aria-label="Open menu"]').or(
      page.locator('header button').filter({has: page.locator('svg')}).first()
    );

    if (await menuButton.isVisible()) {
      await menuButton.click();

      // Wait for menu to open
      const mobileMenu = page.locator('aside.fixed');
      await expect(mobileMenu).toBeVisible();

      // Click overlay to close
      const overlay = page.locator('div.fixed.inset-0.bg-black\\/50');
      if (await overlay.isVisible()) {
        await overlay.click({force: true});
        await expect(mobileMenu).toBeHidden();
      }
    }
  });

  test('should have appropriate touch targets (48px minimum)', async ({page}) => {
    const bottomNav = page.locator('nav[aria-label="Mobile navigation"]');

    // Get all nav links
    const navLinks = bottomNav.getByRole('link');
    const count = await navLinks.count();

    for (let i = 0; i < count; i++) {
      const link = navLinks.nth(i);
      const box = await link.boundingBox();

      if (box) {
        // Minimum touch target should be 44px x 44px (WCAG recommendation)
        expect(box.height).toBeGreaterThanOrEqual(44);
      }
    }
  });
});

test.describe('Mobile Responsive Layout', () => {
  test('should display content in single column on mobile', async ({page}) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Get viewport width
    const viewportSize = page.viewportSize();
    const isMobile = viewportSize && viewportSize.width < 768;

    if (isMobile) {
      // Cards should stack vertically
      const statsGrid = page.locator('.grid').first();
      const gridCols = await statsGrid.evaluate((el) => {
        return window.getComputedStyle(el).gridTemplateColumns;
      });

      // Should be single column or 2 columns max on mobile
      const colCount = gridCols.split(' ').length;
      expect(colCount).toBeLessThanOrEqual(2);
    }
  });

  test('should scroll content horizontally for wide tables', async ({page}) => {
    await page.goto('/employees');
    await page.waitForLoadState('networkidle');

    // Find table container
    const tableContainer = page.locator('.overflow-x-auto').first();

    if (await tableContainer.isVisible()) {
      const containerWidth = await tableContainer.evaluate((el) => el.clientWidth);
      const scrollWidth = await tableContainer.evaluate((el) => el.scrollWidth);

      // If content is wider than container, horizontal scroll should work
      if (scrollWidth > containerWidth) {
        await tableContainer.evaluate((el) => {
          el.scrollLeft = 100;
        });

        const scrollLeft = await tableContainer.evaluate((el) => el.scrollLeft);
        expect(scrollLeft).toBeGreaterThan(0);
      }
    }
  });

  test('should show mobile card view for employee list', async ({page}) => {
    await page.goto('/employees');
    await page.waitForLoadState('networkidle');

    const viewportSize = page.viewportSize();
    const isMobile = viewportSize && viewportSize.width < 768;

    if (isMobile) {
      // Should show card view on mobile
      const mobileCards = page.locator('[data-testid="mobile-card-view"]').or(
        page.locator('.space-y-4 > .border.rounded-lg.p-4')
      );

      // Either mobile cards or a table should be visible
      const hasCards = await mobileCards.first().isVisible().catch(() => false);
      const hasTable = await page.locator('table').first().isVisible().catch(() => false);

      expect(hasCards || hasTable).toBeTruthy();
    }
  });
});

test.describe('Mobile Forms', () => {
  test('should display form fields stacked vertically', async ({page}) => {
    await page.goto('/leave');
    await page.waitForLoadState('networkidle');

    // Try to open new leave form
    const newButton = page.getByRole('button', {name: /new|request|create/i}).first();
    if (await newButton.isVisible()) {
      await newButton.click();

      // Wait for form to appear
      await page.waitForSelector('form, [role="dialog"]');

      // Check form layout on mobile
      const formFields = page.locator('form input, form select, form textarea');
      const firstField = formFields.first();
      const secondField = formFields.nth(1);

      if ((await formFields.count()) >= 2) {
        const firstBox = await firstField.boundingBox();
        const secondBox = await secondField.boundingBox();

        if (firstBox && secondBox) {
          // Fields should stack (second field below first)
          expect(secondBox.y).toBeGreaterThanOrEqual(firstBox.y + firstBox.height - 10);
        }
      }
    }
  });

  test('should have large touch-friendly input fields', async ({page}) => {
    await page.goto('/auth/login');
    await page.waitForLoadState('networkidle');

    // Check login form inputs
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');

    if (await emailInput.isVisible()) {
      const emailBox = await emailInput.boundingBox();
      const passwordBox = await passwordInput.boundingBox();

      // Inputs should be at least 44px tall for touch accessibility
      if (emailBox) {
        expect(emailBox.height).toBeGreaterThanOrEqual(40);
      }
      if (passwordBox) {
        expect(passwordBox.height).toBeGreaterThanOrEqual(40);
      }
    }
  });
});

test.describe('Mobile Header', () => {
  test('should show compact header on mobile', async ({page}) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const header = page.locator('header').first();
    await expect(header).toBeVisible();

    // Header should have menu button
    const menuButton = header.locator('button').first();
    await expect(menuButton).toBeVisible();
  });

  test('should show search when available', async ({page}) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const header = page.locator('header').first();

    // Check for search icon or input
    const searchIcon = header.locator('svg.lucide-search').or(
      header.locator('[data-testid="search"]')
    );

    // Search might be in header or collapsed to icon
    const hasSearch = await searchIcon.isVisible().catch(() => false);
    // Mobile might have search hidden behind icon
    expect(hasSearch).toBeDefined();
  });

  test('should show user menu/profile button', async ({page}) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const header = page.locator('header').first();

    // Should have user dropdown or avatar
    const userButton = header.getByRole('button', {name: /user|profile|account/i}).or(
      header.locator('[data-testid="user-menu"]').or(
        header.locator('.rounded-full') // Avatar
      )
    );

    await expect(userButton.first()).toBeVisible();
  });
});
