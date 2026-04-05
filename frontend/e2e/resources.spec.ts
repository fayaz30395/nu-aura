import {expect, test} from '@playwright/test';

test.describe('Resource Pool Page', () => {
  test.beforeEach(async ({page}) => {
    await page.goto('/resources/pool');
  });

  test('should display resource pool page', async ({page}) => {
    await expect(
      page.getByRole('heading', {name: /resource pool|available resources/i})
    ).toBeVisible();
  });

  test('should show search or filter controls', async ({page}) => {
    // Either a search input or department filter should be present
    const search = page.getByRole('searchbox').or(
      page.getByPlaceholder(/search/i)
    );
    const hasSearch = await search.count() > 0;
    const hasFilter = await page.getByText(/department|filter/i).count() > 0;
    expect(hasSearch || hasFilter).toBeTruthy();
  });

  test('should load without crashing', async ({page}) => {
    // Page should not show an unhandled error boundary
    await expect(page.locator('text=/something went wrong|unhandled error/i')).not.toBeVisible();
  });
});

test.describe('Resource Capacity Timeline Page', () => {
  test.beforeEach(async ({page}) => {
    await page.goto('/resources/capacity');
  });

  test('should display capacity page heading', async ({page}) => {
    await expect(
      page.getByRole('heading', {name: /capacity|timeline/i})
    ).toBeVisible();
  });

  test('should show department filter or employee list', async ({page}) => {
    const hasDeptFilter = await page.getByText(/department/i).count() > 0;
    const hasEmployeeRef = await page.getByText(/employee|resource/i).count() > 0;
    expect(hasDeptFilter || hasEmployeeRef).toBeTruthy();
  });

  test('should load without crashing', async ({page}) => {
    await expect(page.locator('text=/something went wrong|unhandled error/i')).not.toBeVisible();
  });
});
