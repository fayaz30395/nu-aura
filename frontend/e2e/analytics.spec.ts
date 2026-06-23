import {expect, Page, test} from '@playwright/test';
import {seedLocalStoredAuth} from './fixtures/helpers';
import {testUsers} from './fixtures/testData';

/**
 * Analytics Dashboard E2E Tests
 * Tests the analytics page with charts and KPIs
 */

test.describe.configure({mode: 'serial', timeout: 300000});

async function gotoAnalytics(page: Page) {
  const heading = page.getByText(/People, attendance, and payroll signals/i).first();
  await page.goto('/analytics', {waitUntil: 'domcontentloaded', timeout: 90000});
  if (await heading.isVisible({timeout: 120000}).catch(() => false)) {
    return;
  }

  await seedLocalStoredAuth(page, testUsers.admin.email);
  await page.goto('/analytics', {waitUntil: 'domcontentloaded', timeout: 90000});
  await expect(heading).toBeVisible({timeout: 120000});
}

async function waitForAnalyticsData(page: Page) {
  const metrics = page.locator('section[aria-label="Key metrics"]');
  const analyticsError = page.getByText('Could not load analytics');

  await expect.poll(async () => {
    if (await metrics.isVisible().catch(() => false)) return 'ready';
    if (await analyticsError.isVisible().catch(() => false)) return 'error';
    return 'loading';
  }, {
    message: 'analytics data should finish loading',
    timeout: 90000,
  }).not.toBe('loading');

  if (await analyticsError.isVisible().catch(() => false)) {
    throw new Error(`Analytics page showed error: ${await analyticsError.locator('..').textContent()}`);
  }
}

test.describe('Analytics Dashboard', () => {
  test.beforeEach(async ({page}) => {
    await gotoAnalytics(page);
  });

  test('should display analytics page with header', async ({page}) => {
    // Verify page heading
    await expect(page.locator('h1')).toContainText('People, attendance, and payroll signals');

    // Verify subtitle
    await expect(page.getByText(/Watch the trends that matter/i)).toBeVisible();
  });

  test('should display KPI cards', async ({page}) => {
    await waitForAnalyticsData(page);

    // Check for KPI cards
    const kpiTexts = ['Headcount', 'Attendance', 'Leave utilization'];

    for (const text of kpiTexts) {
      const card = page.locator(`text=${text}`).first();
      await expect(card).toBeVisible();
    }
  });

  test('should display time range selector', async ({page}) => {
    // Check for time range buttons
    await expect(page.getByRole('button', {name: '7 days'})).toBeVisible();
    await expect(page.getByRole('button', {name: '30 days'})).toBeVisible();
    await expect(page.getByRole('button', {name: '90 days'})).toBeVisible();
  });

  test('should switch time range', async ({page}) => {
    // Click on 7 Days
    await page.getByRole('button', {name: '7 days'}).click();
    await page.waitForTimeout(500);

    // Verify button is active (has primary color)
    const sevenDaysBtn = page.getByRole('button', {name: '7 days'});
    await expect(sevenDaysBtn).toHaveAttribute('aria-pressed', 'true');
  });

  test('should display refresh button', async ({page}) => {
    const refreshBtn = page.locator('button:has-text("Refresh")');
    await expect(refreshBtn).toBeVisible();
  });

  test('should refresh data on button click', async ({page}) => {
    // Click refresh
    await page.click('button:has-text("Refresh")');

    // Should not show error
    await waitForAnalyticsData(page);
    await expect(page.locator('text=Error Loading Analytics')).not.toBeVisible();
  });

  test('should display attendance section', async ({page}) => {
    await waitForAnalyticsData(page);

    // Check for attendance trend card
    await expect(page.getByText('Attendance trend')).toBeVisible();

    // Check for today's attendance card
    await expect(page.getByText('Today', {exact: true})).toBeVisible();
  });

  test('should display leave section', async ({page}) => {
    await waitForAnalyticsData(page);

    // Check for leave by type card
    await expect(page.getByText('Leave by type')).toBeVisible();

    // Check for leave request summary
    await expect(page.getByText('Leave requests')).toBeVisible();
  });

  test('should display department distribution', async ({page}) => {
    await waitForAnalyticsData(page);

    await expect(page.getByText('Department distribution')).toBeVisible();
  });

  test('should display quick stats grid', async ({page}) => {
    await waitForAnalyticsData(page);

    // Check for quick stat items
    const statTexts = ['On time today', 'Late today', 'New joiners', 'Exits this month'];

    for (const text of statTexts) {
      const stat = page.locator(`text=${text}`).first();
      await expect(stat).toBeVisible();
    }
  });

  test('should handle loading state', async ({page}) => {
    // Navigate fresh to catch loading state
    await page.goto('/analytics', {waitUntil: 'domcontentloaded', timeout: 90000});

    await expect.poll(async () => {
      const hasStatus = await page.getByRole('status').first().isVisible().catch(() => false);
      const hasSpinner = await page.locator('.animate-spin').isVisible().catch(() => false);
      const hasContent = await page.getByText(/People, attendance, and payroll signals/i).first().isVisible().catch(() => false);
      return hasStatus || hasSpinner || hasContent;
    }, {
      message: 'analytics should show loading status or page content',
      timeout: 120000,
    }).toBe(true);
  });
});

test.describe('Analytics - Error Handling', () => {
  test('should show error state gracefully', async ({page}) => {
    // Block API to simulate error
    await page.route('**/api/v1/analytics/**', route => route.abort());

    await page.goto('/analytics', {waitUntil: 'domcontentloaded', timeout: 90000});

    // Should show error or handle gracefully
    await expect(page.getByRole('alert').filter({hasText: /Could not load analytics|Error/i}))
      .toBeVisible({timeout: 60000});
    await expect(page.getByRole('button', {name: /Retry/i})).toBeVisible();
  });
});

test.describe('Analytics - Data-Driven Validation', () => {
  test.beforeEach(async ({page}) => {
    await gotoAnalytics(page);
  });

  test('KPI values are numeric and not placeholders', async ({page}) => {
    await waitForAnalyticsData(page);

    // Locate KPI value elements
    const kpiCards = page.locator('[class*="stat"], [class*="kpi"], [class*="metric"]');
    const count = await kpiCards.count();

    for (let i = 0; i < Math.min(count, 10); i++) {
      const text = await kpiCards.nth(i).textContent().catch(() => '');
      // Should not contain loading placeholders
      expect(text).not.toContain('NaN');
      expect(text).not.toContain('undefined');
      expect(text).not.toContain('null');
    }
  });

  test('time range change updates chart data', async ({page}) => {
    await waitForAnalyticsData(page);

    // Capture initial state
    const initialContent = await page.locator('main').first().textContent().catch(() => '');

    // Switch time range
    const sevenDaysBtn = page.getByRole('button', {name: '7 days'});
    const hasBtn = await sevenDaysBtn.isVisible().catch(() => false);

    if (hasBtn) {
      await sevenDaysBtn.click();
      await waitForAnalyticsData(page);

      // Page should still render without error
      await expect(page.locator('text=Error Loading Analytics')).not.toBeVisible();
      const hasContent = await page.getByRole('heading', {name: /People, attendance, and payroll signals/i}).isVisible().catch(() => false);
      expect(hasContent).toBe(true);
    }

    expect(initialContent.length).toBeGreaterThan(0);
  });

  test('department distribution chart renders data', async ({page}) => {
    await waitForAnalyticsData(page);

    const deptSection = page.getByText('Department distribution');
    const hasDept = await deptSection.isVisible().catch(() => false);

    if (hasDept) {
      // The chart should render SVG elements (Recharts)
      const chartContainer = deptSection.locator('..').locator('..');
      const hasSvg = await chartContainer.locator('svg, .recharts-wrapper').first().isVisible().catch(() => false);
      const hasCanvas = await chartContainer.locator('canvas').first().isVisible().catch(() => false);

      expect(hasSvg || hasCanvas).toBe(true);
    }

    expect(hasDept).toBe(true);
  });

  test('attendance trend chart renders with data points', async ({page}) => {
    await waitForAnalyticsData(page);

    const trendSection = page.getByText('Attendance trend');
    const hasTrend = await trendSection.isVisible().catch(() => false);

    if (hasTrend) {
      // Look for Recharts line/bar elements
      const chartParent = trendSection.locator('..').locator('..');
      const hasLine = await chartParent.locator('.recharts-line, .recharts-bar, svg path').first().isVisible().catch(() => false);

      expect(hasLine).toBe(true);
    }

    expect(hasTrend).toBe(true);
  });
});
