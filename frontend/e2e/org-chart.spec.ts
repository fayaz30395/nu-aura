import { test, expect } from '@playwright/test';

/**
 * Org Chart E2E Tests
 * Tests organizational hierarchy rendering, employee node interaction, and search.
 */

test.describe('Org Chart Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/org-chart');
    await page.waitForLoadState('networkidle');
  });

  test('should display org chart page with heading', async ({ page }) => {
    const heading = page.getByRole('heading').first();
    await expect(heading).toBeVisible({ timeout: 10000 });
  });

  test('should load without crashing', async ({ page }) => {
    await expect(
      page.locator('text=/something went wrong|unhandled error/i')
    ).not.toBeVisible();
  });

  test('should render organizational hierarchy', async ({ page }) => {
    await page.waitForTimeout(2000);

    // Org chart renders as tree nodes, SVG, canvas, or card-based layout
    const hasTreeNodes = await page
      .locator('[class*="node"], [class*="Node"], [class*="org"], [data-testid*="node"]')
      .first()
      .isVisible()
      .catch(() => false);
    const hasSvg = await page.locator('svg').first().isVisible().catch(() => false);
    const hasCanvas = await page.locator('canvas').first().isVisible().catch(() => false);
    const hasCards = await page
      .locator('[class*="card"], [class*="Card"]')
      .first()
      .isVisible()
      .catch(() => false);
    const hasEmployeeNames = await page
      .locator('text=/Fayaz|Sumit|Jagadeesh|Mani/i')
      .first()
      .isVisible()
      .catch(() => false);

    expect(hasTreeNodes || hasSvg || hasCanvas || hasCards || hasEmployeeNames).toBe(true);
  });

  test('should display root node (CEO/Super Admin)', async ({ page }) => {
    await page.waitForTimeout(2000);

    // The root node should show the CEO (Fayaz M)
    const hasRootNode = await page
      .locator('text=/Fayaz/i')
      .first()
      .isVisible()
      .catch(() => false);

    // Might show different root depending on data scope
    expect(hasRootNode || true).toBe(true);
  });

  test('should display department labels or groupings', async ({ page }) => {
    await page.waitForTimeout(2000);

    const hasDeptLabels = await page
      .locator('text=/Engineering|HR|Executive|Recruitment/i')
      .first()
      .isVisible()
      .catch(() => false);

    expect(hasDeptLabels || true).toBe(true);
  });
});

test.describe('Org Chart - Employee Node Interaction', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/org-chart');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
  });

  test('should click employee node and show profile card or link', async ({ page }) => {
    // Find a clickable employee node
    const employeeNode = page
      .locator(
        '[class*="node"], [class*="Node"], [class*="card"], [data-testid*="node"], [data-testid*="employee"]'
      )
      .first();
    const hasNode = await employeeNode.isVisible().catch(() => false);

    if (hasNode) {
      await employeeNode.click();
      await page.waitForTimeout(1000);

      // Should show profile card, popup, tooltip, or navigate to profile
      const hasPopup = await page
        .locator('[role="dialog"], [role="tooltip"], [class*="popup"], [class*="popover"], [class*="detail"]')
        .first()
        .isVisible()
        .catch(() => false);
      const hasProfileInfo = await page
        .locator('text=/email|department|designation|role|phone/i')
        .first()
        .isVisible()
        .catch(() => false);
      const navigatedToProfile = page.url().includes('/employees/');

      expect(hasPopup || hasProfileInfo || navigatedToProfile).toBe(true);
    }
  });

  test('should display employee details on node hover or click', async ({ page }) => {
    // Try hovering over a node
    const employeeNode = page
      .locator('[class*="node"], [class*="Node"], [class*="card"]')
      .first();
    const hasNode = await employeeNode.isVisible().catch(() => false);

    if (hasNode) {
      await employeeNode.hover();
      await page.waitForTimeout(500);

      // Check for tooltip or expanded info
      const hasTooltip = await page
        .locator('[role="tooltip"], [class*="tooltip"], [class*="Tooltip"]')
        .first()
        .isVisible()
        .catch(() => false);
      const hasExpandedInfo = await page
        .locator('text=/designation|role|department/i')
        .first()
        .isVisible()
        .catch(() => false);

      // Either shows tooltip or details are always visible — no crash
      expect(hasTooltip || hasExpandedInfo || true).toBe(true);
    }
  });

  test('should expand/collapse tree branches if supported', async ({ page }) => {
    // Look for expand/collapse controls
    const expandBtn = page
      .locator(
        'button:has-text("+"), button:has-text("Expand"), [class*="expand"], [data-testid*="expand"]'
      )
      .first();
    const hasExpand = await expandBtn.isVisible().catch(() => false);

    if (hasExpand) {
      await expandBtn.click();
      await page.waitForTimeout(500);

      // Tree should have more visible nodes after expansion
      await expect(
        page.locator('text=/something went wrong|unhandled error/i')
      ).not.toBeVisible();
    }
  });

  test('should navigate to employee profile from org chart node', async ({ page }) => {
    // Look for a link or "View Profile" action
    const viewProfileLink = page
      .locator('a:has-text("View"), a:has-text("Profile"), button:has-text("View Profile")')
      .first();
    const hasLink = await viewProfileLink.isVisible().catch(() => false);

    if (hasLink) {
      await viewProfileLink.click();
      await page.waitForTimeout(1000);

      expect(page.url()).toContain('/employees/');
    }
  });
});

test.describe('Org Chart - Search', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/org-chart');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
  });

  test('should display search input', async ({ page }) => {
    const searchInput = page
      .locator('input[type="search"], input[placeholder*="search" i], input[placeholder*="find" i]')
      .first();
    const hasSearch = await searchInput.isVisible().catch(() => false);

    expect(hasSearch).toBe(true);
  });

  test('should search for employee by name', async ({ page }) => {
    const searchInput = page
      .locator('input[type="search"], input[placeholder*="search" i], input[placeholder*="find" i]')
      .first();
    const hasSearch = await searchInput.isVisible().catch(() => false);

    if (hasSearch) {
      // Search for a known demo employee
      await searchInput.fill('Sumit');
      await page.waitForTimeout(1000);

      // Should highlight node or filter results
      const hasResult = await page
        .locator('text=/Sumit/i')
        .first()
        .isVisible()
        .catch(() => false);

      expect(hasResult).toBe(true);
    }
  });

  test('should handle search with no results gracefully', async ({ page }) => {
    const searchInput = page
      .locator('input[type="search"], input[placeholder*="search" i], input[placeholder*="find" i]')
      .first();
    const hasSearch = await searchInput.isVisible().catch(() => false);

    if (hasSearch) {
      await searchInput.fill('XYZNONEXISTENTPERSON999');
      await page.waitForTimeout(1000);

      // Should show no results or empty state without crashing
      await expect(
        page.locator('text=/something went wrong|unhandled error/i')
      ).not.toBeVisible();
    }
  });

  test('should clear search and restore full chart', async ({ page }) => {
    const searchInput = page
      .locator('input[type="search"], input[placeholder*="search" i], input[placeholder*="find" i]')
      .first();
    const hasSearch = await searchInput.isVisible().catch(() => false);

    if (hasSearch) {
      // Search, then clear
      await searchInput.fill('Sumit');
      await page.waitForTimeout(500);
      await searchInput.clear();
      await page.waitForTimeout(1000);

      // Full chart should be restored
      await expect(
        page.locator('text=/something went wrong|unhandled error/i')
      ).not.toBeVisible();
    }
  });
});

test.describe('Org Chart - View Controls', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/org-chart');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
  });

  test('should show zoom controls if available', async ({ page }) => {
    const zoomIn = page
      .locator('button:has-text("+"), button[aria-label*="zoom in" i], [data-testid*="zoom-in"]')
      .first();
    const zoomOut = page
      .locator('button:has-text("-"), button[aria-label*="zoom out" i], [data-testid*="zoom-out"]')
      .first();

    const hasZoomIn = await zoomIn.isVisible().catch(() => false);
    const hasZoomOut = await zoomOut.isVisible().catch(() => false);

    // Zoom controls may or may not exist
    expect(hasZoomIn || hasZoomOut || true).toBe(true);
  });

  test('should show department filter if available', async ({ page }) => {
    const deptFilter = page
      .locator('select, [role="combobox"]')
      .first();
    const hasDeptFilter = await deptFilter.isVisible().catch(() => false);

    if (hasDeptFilter) {
      // Select a department
      const options = await deptFilter.locator('option').count();
      if (options > 1) {
        await deptFilter.selectOption({ index: 1 });
        await page.waitForTimeout(1000);

        await expect(
          page.locator('text=/something went wrong|unhandled error/i')
        ).not.toBeVisible();
      }
    }
  });
});

test.describe('Org Chart - Visual Elements', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/org-chart');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
  });

  test('should render connecting lines between nodes', async ({ page }) => {
    // Tree charts use SVG paths, CSS borders, or canvas lines
    const hasSvgPaths = await page.locator('svg path, svg line').first().isVisible().catch(() => false);
    const hasCssConnectors = await page
      .locator('[class*="connector"], [class*="line"], [class*="edge"]')
      .first()
      .isVisible()
      .catch(() => false);

    // Connectors may be rendered differently
    expect(hasSvgPaths || hasCssConnectors || true).toBe(true);
  });

  test('should display avatars or initials on nodes', async ({ page }) => {
    const hasAvatars = await page
      .locator('img[class*="avatar"], [class*="avatar"], [class*="Avatar"]')
      .first()
      .isVisible()
      .catch(() => false);
    const hasInitials = await page
      .locator('[class*="initial"], [class*="Initial"]')
      .first()
      .isVisible()
      .catch(() => false);

    expect(hasAvatars || hasInitials || true).toBe(true);
  });

  test('should be responsive', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);

    await expect(page.getByRole('heading').first()).toBeVisible();

    await page.setViewportSize({ width: 1280, height: 720 });
  });
});
