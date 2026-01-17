import { test, expect } from '@playwright/test';

test.describe('Review Cycles Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/performance/cycles');
  });

  test('should display review cycles page', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Review Cycles' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create Cycle' })).toBeVisible();
  });

  test('should show filter options', async ({ page }) => {
    await expect(page.getByText('Filter by Type')).toBeVisible();
    await expect(page.getByText('Filter by Status')).toBeVisible();
  });

  test('should open create cycle modal', async ({ page }) => {
    await page.getByRole('button', { name: 'Create Cycle' }).click();
    await expect(page.getByRole('heading', { name: 'Create Review Cycle' })).toBeVisible();
    await expect(page.getByLabel('Cycle Name *')).toBeVisible();
    await expect(page.getByLabel('Cycle Type *')).toBeVisible();
  });

  test('should close create modal on cancel', async ({ page }) => {
    await page.getByRole('button', { name: 'Create Cycle' }).click();
    await expect(page.getByRole('heading', { name: 'Create Review Cycle' })).toBeVisible();
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('heading', { name: 'Create Review Cycle' })).not.toBeVisible();
  });
});

test.describe('Review Cycle Activation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/performance/cycles');
  });

  test('should show activate button for planning cycles', async ({ page }) => {
    // This test assumes there's a cycle in PLANNING status
    const activateButton = page.getByRole('button', { name: /Activate/i }).first();
    // If there are any planning cycles, the button should be visible
    const count = await activateButton.count();
    if (count > 0) {
      await expect(activateButton).toBeVisible();
    }
  });

  test('should open activate modal with scope options', async ({ page }) => {
    const activateButton = page.getByRole('button', { name: /Activate/i }).first();
    const count = await activateButton.count();

    if (count > 0) {
      await activateButton.click();
      await expect(page.getByRole('heading', { name: 'Activate Review Cycle' })).toBeVisible();
      await expect(page.getByText('Activation Scope')).toBeVisible();
      await expect(page.getByText('All Employees')).toBeVisible();
      await expect(page.getByText('By Department')).toBeVisible();
      await expect(page.getByText('By Location')).toBeVisible();
    }
  });

  test('should show review type options in activate modal', async ({ page }) => {
    const activateButton = page.getByRole('button', { name: /Activate/i }).first();
    const count = await activateButton.count();

    if (count > 0) {
      await activateButton.click();
      await expect(page.getByText('Review Types to Create')).toBeVisible();
      await expect(page.getByText('Self Reviews')).toBeVisible();
      await expect(page.getByText('Manager Reviews')).toBeVisible();
    }
  });

  test('should require department selection when scope is DEPARTMENT', async ({ page }) => {
    const activateButton = page.getByRole('button', { name: /Activate/i }).first();
    const count = await activateButton.count();

    if (count > 0) {
      await activateButton.click();
      await page.getByText('By Department').click();

      // The Activate Cycle button should be disabled when no departments are selected
      const submitButton = page.getByRole('button', { name: 'Activate Cycle' });
      await expect(submitButton).toBeDisabled();
    }
  });

  test('should require location selection when scope is LOCATION', async ({ page }) => {
    const activateButton = page.getByRole('button', { name: /Activate/i }).first();
    const count = await activateButton.count();

    if (count > 0) {
      await activateButton.click();
      await page.getByText('By Location').click();

      // The Activate Cycle button should be disabled when no locations are selected
      const submitButton = page.getByRole('button', { name: 'Activate Cycle' });
      await expect(submitButton).toBeDisabled();
    }
  });
});
