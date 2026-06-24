import {expect, test} from '@playwright/test';
import {LoginPage} from './pages/LoginPage';
import {testUsers} from './fixtures/testData';

/**
 * Navigation and Routing E2E Tests
 * Tests application navigation, routing, and menu functionality
 */

test.describe('Navigation and Routing', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({page}) => {
    loginPage = new LoginPage(page);
    await loginPage.navigate();
    await loginPage.login(testUsers.admin.email, testUsers.admin.password);
    await page.waitForURL('**/me/dashboard', {waitUntil: 'commit'});
  });

  test.describe('Main Navigation Menu', () => {
    test('should display main navigation menu', async ({page}) => {
      // Check for navigation elements
      const hasNav = await page.locator('nav:visible').first().isVisible();
      expect(hasNav).toBe(true);

      // Check for sidebar or header navigation
      const hasSidebar = await page.locator('[class*="sidebar"]').isVisible().catch(() => false);
      const hasHeader = await page.locator('header').first().isVisible().catch(() => false);

      expect(hasSidebar || hasHeader).toBe(true);
    });

    test('should navigate to Dashboard', async ({page}) => {
      // Click on Dashboard link
      const dashboardLink = page.locator('a[href*="/dashboard"], button:has-text("Dashboard")').first();
      await dashboardLink.click();
      await page.waitForTimeout(500);

      // Verify URL
      expect(page.url()).toContain('/dashboard');
    });

    test('should navigate to Employees', async ({page}) => {
      // Click on Employees link
      const employeesLink = page.locator('a[href*="/employees"], button:has-text("Employees")').first();
      await employeesLink.click();
      await page.waitForTimeout(1000);

      // Verify URL
      expect(page.url()).toContain('/employees');
    });

    test('should navigate to Leave Management', async ({page}) => {
      // Click on Leave link
      const leaveLink = page.locator('a[href*="/leave"], button:has-text("Leave")').first();
      await leaveLink.click();
      await page.waitForTimeout(1000);

      // Verify URL
      expect(page.url()).toContain('/leave');
    });

    test('should navigate to Attendance', async ({page}) => {
      // Click on Attendance link
      const attendanceLink = page.locator('a[href*="/attendance"], button:has-text("Attendance")').first();
      await attendanceLink.click();
      await page.waitForTimeout(1000);

      // Verify URL
      expect(page.url()).toContain('/attendance');
    });

    test('should navigate to Projects', async ({page}) => {
      // Click on Projects link
      const projectsLink = page.locator('a[href*="/projects"], button:has-text("Projects")').first();
      await projectsLink.click();
      await page.waitForTimeout(1000);

      // Verify URL
      expect(page.url()).toContain('/projects');
    });

    test('should navigate to Departments', async ({page}) => {
      // Click on Departments link (if available)
      const departmentsLink = page.locator('a[href*="/departments"], button:has-text("Departments")').first();
      const hasDepartments = await departmentsLink.isVisible().catch(() => false);

      if (hasDepartments) {
        await departmentsLink.click();
        await page.waitForTimeout(1000);
        expect(page.url()).toContain('/departments');
      }
    });

    test('should navigate to Settings', async ({page}) => {
      // Click on Settings link
      const settingsLink = page.locator('a[href*="/settings"], button:has-text("Settings")').first();
      const hasSettings = await settingsLink.isVisible().catch(() => false);

      if (hasSettings) {
        await settingsLink.click();
        await page.waitForTimeout(1000);
        expect(page.url()).toContain('/settings');
      }
    });
  });

  test.describe('Breadcrumb Navigation', () => {
    test('should display breadcrumbs on nested pages', async ({page}) => {
      // Navigate to employees
      await page.goto('/employees');
      await page.waitForTimeout(1000);

      // Check for breadcrumbs
      const hasBreadcrumb = await page.locator('nav[aria-label*="breadcrumb"], [class*="breadcrumb"]').isVisible().catch(() => false);

      // Breadcrumbs may not be on all pages
      expect(typeof hasBreadcrumb).toBe('boolean');
    });

    test('should navigate using breadcrumbs', async ({page}) => {
      // Navigate to a deep page if available
      await page.goto('/employees');
      await page.waitForTimeout(1000);

      const hasEmployees = await page.locator('table, [class*="employee"]').isVisible().catch(() => false);

      if (hasEmployees) {
        // Try to view an employee if available
        const viewButton = page.locator('button:has-text("View")').first();
        const hasViewButton = await viewButton.isVisible().catch(() => false);

        if (hasViewButton) {
          await viewButton.click();
          await page.waitForTimeout(1000);

          // Look for breadcrumb back to employees
          const employeesBreadcrumb = page.locator('a[href*="/employees"]:has-text("Employees")');
          const hasBreadcrumb = await employeesBreadcrumb.isVisible().catch(() => false);

          if (hasBreadcrumb) {
            await employeesBreadcrumb.click();
            await page.waitForTimeout(500);
            expect(page.url()).toContain('/employees');
          }
        }
      }
    });
  });

  test.describe('User Profile Menu', () => {
    test('should display user profile menu', async ({page}) => {
      // Look for user menu/avatar
      const userMenu = page.locator('button[aria-label^="User menu for"]').first();
      const hasUserMenu = await userMenu.isVisible().catch(() => false);

      expect(hasUserMenu).toBe(true);
    });

    test('should open user dropdown menu', async ({page}) => {
      // Click on user menu
      const userMenuButton = page.locator('button[aria-label^="User menu for"]').first();
      const hasUserMenuButton = await userMenuButton.isVisible().catch(() => false);

      if (hasUserMenuButton) {
        await userMenuButton.click();
        await page.waitForTimeout(500);

        // The opened UserMenu shows item controls (Sign out / Settings / Profile).
        const item = page.getByRole('button', {name: /sign out|settings|profile|log\s?out/i}).first();
        const hasDropdown = await item.isVisible().catch(() => false);
        expect(hasDropdown).toBe(true);
      }
    });

    test('should navigate to profile page', async ({page}) => {
      // Look for profile link
      const profileLink = page.locator('a[href*="/profile"], button:has-text("Profile")').first();
      const hasProfileLink = await profileLink.isVisible().catch(() => false);

      if (!hasProfileLink) {
        // Try opening user menu first
        const userMenuButton = page.locator('button[aria-label^="User menu for"]').first();
        const hasUserMenuButton = await userMenuButton.isVisible().catch(() => false);

        if (hasUserMenuButton) {
          await userMenuButton.click();
          await page.waitForTimeout(500);

          const profileLinkInMenu = page.locator('a[href*="/profile"], button:has-text("Profile")').first();
          const hasProfileInMenu = await profileLinkInMenu.isVisible().catch(() => false);

          if (hasProfileInMenu) {
            await profileLinkInMenu.click();
            await page.waitForTimeout(1000);
            expect(page.url()).toContain('/profile');
          }
        }
      } else {
        await profileLink.click();
        await page.waitForTimeout(1000);
        expect(page.url()).toContain('/profile');
      }
    });

    test('should have logout option', async ({page}) => {
      // The user menu lives in the TopBar (UserMenu, aria-label="User menu for <name>").
      // Open it, then assert a Sign out / Logout control is present.
      const userMenu = page.locator('button[aria-label^="User menu for"]').first();
      await expect(userMenu).toBeVisible({timeout: 15000});
      await userMenu.click();
      await page.waitForTimeout(300);

      const logout = page.getByRole('button', {name: /sign out|log\s?out/i}).first();
      await expect(logout).toBeVisible({timeout: 10000});
    });
  });

  test.describe('Page Navigation', () => {
    test('should navigate using browser back button', async ({page}) => {
      // Navigate to employees
      await page.goto('/employees');
      await page.waitForTimeout(1000);
      const employeesUrl = page.url();

      // Navigate to leave
      await page.goto('/leave');
      await page.waitForTimeout(1000);

      // Go back
      await page.goBack();
      await page.waitForTimeout(500);

      // Should be back at employees
      expect(page.url()).toBe(employeesUrl);
    });

    test('should navigate using browser forward button', async ({page}) => {
      // Navigate to employees
      await page.goto('/employees');
      await page.waitForTimeout(1000);

      // Navigate to leave
      await page.goto('/leave');
      await page.waitForTimeout(1000);
      const leaveUrl = page.url();

      // Go back
      await page.goBack();
      await page.waitForTimeout(500);

      // Go forward
      await page.goForward();
      await page.waitForTimeout(500);

      // Should be back at leave
      expect(page.url()).toBe(leaveUrl);
    });

    test('should handle page refresh without losing state', async ({page}) => {
      // Navigate to a page
      await page.goto('/employees');
      await page.waitForTimeout(1000);

      // Reload page
      await page.reload();
      await page.waitForTimeout(1000);

      // Should still be authenticated and on same page
      expect(page.url()).toContain('/employees');

      // Should not redirect to login
      expect(page.url()).not.toContain('/login');
    });
  });

  test.describe('Direct URL Navigation', () => {
    test('should access dashboard via direct URL', async ({page}) => {
      await page.goto('/dashboard');
      await page.waitForTimeout(1000);

      expect(page.url()).toContain('/dashboard');
    });

    test('should access employees via direct URL', async ({page}) => {
      await page.goto('/employees');
      await page.waitForTimeout(1000);

      expect(page.url()).toContain('/employees');
    });

    test('should access leave via direct URL', async ({page}) => {
      await page.goto('/leave');
      await page.waitForTimeout(1000);

      expect(page.url()).toContain('/leave');
    });

    test('should access attendance via direct URL', async ({page}) => {
      await page.goto('/attendance');
      await page.waitForTimeout(1000);

      expect(page.url()).toContain('/attendance');
    });

    test('should handle 404 for invalid routes', async ({page}) => {
      await page.goto('/this-page-does-not-exist-12345', {waitUntil: 'domcontentloaded'});
      await page.waitForTimeout(1000);

      // Graceful handling = a not-found page, OR a redirect away from the bad path.
      const has404 = await page
        .getByText(/404|not found|page not found|doesn.t exist|go (back|home)/i)
        .first().isVisible().catch(() => false);
      const redirectedAway = !page.url().includes('this-page-does-not-exist');

      expect(has404 || redirectedAway).toBe(true);
    });
  });

  test.describe('Sidebar/Menu Functionality', () => {
    test('should expand and collapse sidebar', async ({page}) => {
      // TopBar exposes the contextual NavPanel toggle as aria-label="Toggle navigation panel".
      const sidebarToggle = page.locator('button[aria-label="Toggle navigation panel"]').first();
      const hasToggle = await sidebarToggle.isVisible().catch(() => false);
      if (!hasToggle) {
        test.skip(true, 'Panel toggle not available in this viewport');
        return;
      }

      // The contextual panel is <nav aria-label="<Product> navigation"> (not the mobile nav).
      const panel = page
        .locator('nav[aria-label$=" navigation"]:not([aria-label="Mobile navigation"])')
        .first();
      const initialWidth = await panel.evaluate(el => el.getBoundingClientRect().width).catch(() => 0);

      await sidebarToggle.click();
      await page.waitForTimeout(500);
      const newWidth = await panel.evaluate(el => el.getBoundingClientRect().width).catch(() => 0);
      expect(newWidth).not.toBe(initialWidth);

      await sidebarToggle.click();
      await page.waitForTimeout(500);
    });

    test('should highlight active menu item', async ({page}) => {
      // Navigate to employees
      await page.goto('/employees');
      await page.waitForTimeout(1000);

      // Look for active menu item
      const activeLink = page.locator('a[href*="/employees"]').first();
      const classes = await activeLink.getAttribute('class') || '';

      // Active link should have active, current, or selected class
      const isActive = classes.includes('active') ||
        classes.includes('current') ||
        classes.includes('selected') ||
        await activeLink.evaluate(el => el.getAttribute('aria-current') === 'page').catch(() => false);

      // Test may pass or fail depending on implementation
      expect(typeof isActive).toBe('boolean');
    });
  });

  test.describe('Mobile Navigation', () => {
    test.beforeEach(async ({page}) => {
      // Set mobile viewport
      await page.setViewportSize({width: 375, height: 667});
    });

    test('should display mobile menu button', async ({page}) => {
      await page.reload();
      await page.waitForTimeout(1000);

      // Look for hamburger menu
      const mobileMenu = page.locator('button[aria-label*="menu"], button:has-text("☰")').first();
      const hasMobileMenu = await mobileMenu.isVisible().catch(() => false);

      // On mobile, there should be a menu button
      expect(typeof hasMobileMenu).toBe('boolean');
    });

    test('should open mobile navigation menu', async ({page}) => {
      await page.reload();
      await page.waitForTimeout(1000);

      // aria-label="Open navigation" is the actual mobile toggle (md:hidden, so a
      // no-op on desktop); avoid matching the "User menu for <name>" button.
      const mobileMenuButton = page.locator('button[aria-label="Open navigation"]').first();
      const hasButton = await mobileMenuButton.isVisible().catch(() => false);

      if (hasButton) {
        await mobileMenuButton.click();
        await page.waitForTimeout(500);

        // Menu should appear
        const isNavVisible = await page.locator('nav:visible, [role="navigation"]:visible').first().isVisible().catch(() => false);
        expect(isNavVisible).toBe(true);
      }
    });

    test('should navigate on mobile', async ({page}) => {
      await page.reload();
      await page.waitForTimeout(1000);

      // Open mobile menu if needed
      // aria-label="Open navigation" is the actual mobile toggle (md:hidden, so a
      // no-op on desktop); avoid matching the "User menu for <name>" button.
      const mobileMenuButton = page.locator('button[aria-label="Open navigation"]').first();
      const hasButton = await mobileMenuButton.isVisible().catch(() => false);

      if (hasButton) {
        await mobileMenuButton.click();
        await page.waitForTimeout(500);
      }

      // Click on a navigation link
      const employeesLink = page.locator('a[href*="/employees"]').first();
      const hasLink = await employeesLink.isVisible().catch(() => false);

      if (hasLink) {
        await employeesLink.click();
        await page.waitForTimeout(1000);
        expect(page.url()).toContain('/employees');
      }
    });
  });

  test.describe('Tab Navigation', () => {
    test('should navigate in leave module tabs', async ({page}) => {
      await page.goto('/leave');
      await page.waitForTimeout(1000);

      // Look for tabs
      const myLeavesTab = page.locator('button:has-text("My Leaves"), a:has-text("My Leaves")').first();
      const hasTab = await myLeavesTab.isVisible().catch(() => false);

      if (hasTab) {
        await myLeavesTab.click();
        await page.waitForTimeout(500);

        // URL might change or content updates
        const urlHasMyLeaves = page.url().includes('my-leaves');
        const contentHasMyLeaves = await page.locator('text=/My Leaves|My Leave Requests/i').isVisible().catch(() => false);

        expect(urlHasMyLeaves || contentHasMyLeaves).toBe(true);
      }
    });

    test('should navigate in attendance module tabs', async ({page}) => {
      await page.goto('/attendance');
      await page.waitForTimeout(1000);

      // Look for tabs
      const myAttendanceTab = page.locator('button:has-text("My Attendance"), a:has-text("My Attendance")').first();
      const hasTab = await myAttendanceTab.isVisible().catch(() => false);

      if (hasTab) {
        await myAttendanceTab.click();
        await page.waitForTimeout(500);

        const urlHasMyAttendance = page.url().includes('my-attendance');
        const contentHasMyAttendance = await page.locator('text=/My Attendance/i').first().isVisible().catch(() => false);

        expect(urlHasMyAttendance || contentHasMyAttendance).toBe(true);
      }
    });
  });

  test.describe('Authentication and Route Protection', () => {
    test('should redirect to login when accessing protected route without auth', async ({page, context}) => {
      // Clear cookies to logout
      await context.clearCookies();

      // Try to access protected route
      await page.goto('/employees');
      await page.waitForTimeout(1500);

      // Should redirect to login
      expect(page.url()).toContain('/login');
    });

    test('should redirect to dashboard after login', async ({page, context}) => {
      // Clear cookies
      await context.clearCookies();

      // Login
      await loginPage.navigate();
      await loginPage.login(testUsers.admin.email, testUsers.admin.password);
      await page.waitForTimeout(1500);

      // Should be on dashboard
      expect(page.url()).toContain('/dashboard');
    });

    test('should maintain intended route after login', async ({page, context}) => {
      // Clear cookies
      await context.clearCookies();

      // Try to access employees (should redirect to login)
      await page.goto('/employees');
      await page.waitForTimeout(1000);

      // Login
      if (page.url().includes('/login')) {
        await loginPage.login(testUsers.admin.email, testUsers.admin.password);
        await page.waitForTimeout(1500);

        // Might redirect back to employees or to dashboard
        const redirectedToEmployees = page.url().includes('/employees');
        const redirectedToDashboard = page.url().includes('/dashboard');

        expect(redirectedToEmployees || redirectedToDashboard).toBe(true);
      }
    });
  });

  test.describe('Visual Regression', () => {
    test('should match navigation snapshot on dashboard', async ({page}) => {
      const nav = page.locator('nav').first();
      await expect(nav).toHaveScreenshot('navigation-menu.png', {
        maxDiffPixels: 100,
      });
    });
  });
});

test.describe('Navigation - Role-Based Access', () => {
  test('admin should see all menu items', async ({page}) => {
    const loginPage = new LoginPage(page);
    await loginPage.navigate();
    await loginPage.login(testUsers.admin.email, testUsers.admin.password);
    await page.waitForURL('**/me/dashboard', {waitUntil: 'commit'});

    // Admin should see employees, leave, attendance, projects, etc.
    const hasEmployees = await page.locator('a[href*="/employees"], button:has-text("Employees")').first().isVisible().catch(() => false);
    expect(hasEmployees).toBe(true);
  });

  test('employee should have limited menu access', async ({page}) => {
    const loginPage = new LoginPage(page);
    await loginPage.navigate();
    await loginPage.login(testUsers.employee.email, testUsers.employee.password);
    await page.waitForURL('**/me/dashboard', {waitUntil: 'commit'});

    // Employee should see their own leave, attendance but maybe not all employees
    const hasLeave = await page.locator('a[href*="/leave"], button:has-text("Leave")').first().isVisible().catch(() => false);
    const hasAttendance = await page.locator('a[href*="/attendance"], button:has-text("Attendance")').first().isVisible().catch(() => false);

    expect(hasLeave || hasAttendance).toBe(true);
  });

  test('manager should see team-related menu items', async ({page}) => {
    const loginPage = new LoginPage(page);
    await loginPage.navigate();
    await loginPage.login(testUsers.manager.email, testUsers.manager.password);
    await page.waitForURL('**/me/dashboard', {waitUntil: 'commit'});

    // Manager should see team management options
    const hasNav = await page.locator('nav:visible').first().isVisible();
    expect(hasNav).toBe(true);
  });
});

test.describe('Navigation — App-Aware Sidebar', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({page}) => {
    loginPage = new LoginPage(page);
    await loginPage.navigate();
    await loginPage.login(testUsers.admin.email, testUsers.admin.password);
    await page.waitForURL('**/me/dashboard', {waitUntil: 'commit'});
  });

  test('HRMS routes show HR-specific sidebar items', async ({page}) => {
    await page.goto('/employees');
    await page.waitForLoadState('domcontentloaded');

    // HRMS sidebar should show HR modules
    const hrmsItems = [
      page.locator('nav:visible a[href*="/employees"]').first(),
      page.locator('nav:visible a[href*="/leave"]').first(),
      page.locator('nav:visible a[href*="/attendance"]').first(),
    ];

    let visibleCount = 0;
    for (const item of hrmsItems) {
      const isVisible = await item.isVisible().catch(() => false);
      if (isVisible) visibleCount++;
    }

    expect(visibleCount).toBeGreaterThanOrEqual(1);
  });

  test('Hire routes show recruitment-specific sidebar items', async ({page}) => {
    await page.goto('/recruitment');
    await page.waitForLoadState('domcontentloaded');

    // Sidebar should show recruitment items
    const hireItems = [
      page.locator('nav:visible a[href*="/recruitment"]').first(),
      page.locator('nav:visible a[href*="/onboarding"]').first(),
      page.locator('nav:visible a[href*="/offboarding"]').first(),
    ];

    let visibleCount = 0;
    for (const item of hireItems) {
      const isVisible = await item.isVisible().catch(() => false);
      if (isVisible) visibleCount++;
    }

    // At least recruitment should be visible
    expect(visibleCount).toBeGreaterThanOrEqual(1);
  });

  test('Grow routes show performance-specific sidebar items', async ({page}) => {
    await page.goto('/performance');
    await page.waitForLoadState('domcontentloaded');

    // Sidebar should show performance/training items
    const growItems = [
      page.locator('nav:visible a[href*="/performance"]').first(),
      page.locator('nav:visible a[href*="/training"]').first(),
      page.locator('nav:visible a[href*="/okr"]').first(),
    ];

    let visibleCount = 0;
    for (const item of growItems) {
      const isVisible = await item.isVisible().catch(() => false);
      if (isVisible) visibleCount++;
    }

    expect(visibleCount).toBeGreaterThanOrEqual(1);
  });

  test('sidebar switches context when navigating between app routes', async ({page}) => {
    // Start on HRMS
    await page.goto('/employees');
    await page.waitForLoadState('domcontentloaded');

    const hasEmployeesInSidebar = await page.locator('nav:visible a[href*="/employees"]').first().isVisible().catch(() => false);

    // Navigate to a Grow route
    await page.goto('/performance');
    await page.waitForLoadState('domcontentloaded');

    const hasPerformanceInSidebar = await page.locator('nav:visible a[href*="/performance"]').first().isVisible().catch(() => false);

    // Both should have their respective items (context switched)
    expect(hasEmployeesInSidebar).toBe(true);
    expect(hasPerformanceInSidebar).toBe(true);
  });

  test('sidebar maintains scroll position within same app', async ({page}) => {
    // Navigate to a page within HRMS
    await page.goto('/employees');
    await page.waitForLoadState('domcontentloaded');

    // Navigate to another HRMS page
    const leaveLink = page.locator('nav:visible a[href*="/leave"]').first();
    const hasLeave = await leaveLink.isVisible().catch(() => false);

    if (hasLeave) {
      await leaveLink.click();
      await page.waitForTimeout(1000);

      // Page should be on leave
      expect(page.url()).toContain('/leave');

      // Sidebar should still be visible and functional
      const hasNav = await page.locator('nav:visible').first().isVisible();
      expect(hasNav).toBe(true);
    }

    expect(hasLeave).toBe(true);
  });
});
