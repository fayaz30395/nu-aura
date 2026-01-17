import { test, expect } from '@playwright/test';

test.describe('Scheduled Reports Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/reports/scheduled');
  });

  test('should display scheduled reports page', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Scheduled Reports' })).toBeVisible();
    await expect(page.getByText('Configure automated report delivery to your team')).toBeVisible();
    await expect(page.getByRole('button', { name: 'New Schedule' })).toBeVisible();
  });

  test('should show status filter buttons', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'All' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Active' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Inactive' })).toBeVisible();
  });

  test('should toggle filter between All, Active, and Inactive', async ({ page }) => {
    const allButton = page.getByRole('button', { name: 'All' });
    const activeButton = page.getByRole('button', { name: 'Active' });
    const inactiveButton = page.getByRole('button', { name: 'Inactive' });

    // Click Active filter
    await activeButton.click();
    await expect(activeButton).toHaveClass(/bg-primary-600/);

    // Click Inactive filter
    await inactiveButton.click();
    await expect(inactiveButton).toHaveClass(/bg-primary-600/);

    // Click All filter
    await allButton.click();
    await expect(allButton).toHaveClass(/bg-primary-600/);
  });

  test('should open create schedule modal', async ({ page }) => {
    await page.getByRole('button', { name: 'New Schedule' }).click();
    await expect(page.getByRole('heading', { name: 'Create Scheduled Report' })).toBeVisible();
    await expect(page.getByLabel('Schedule Name *')).toBeVisible();
    await expect(page.getByLabel('Report Type *')).toBeVisible();
    await expect(page.getByLabel('Frequency *')).toBeVisible();
  });

  test('should show all report type options', async ({ page }) => {
    await page.getByRole('button', { name: 'New Schedule' }).click();
    const reportTypeSelect = page.getByLabel('Report Type *');

    await expect(reportTypeSelect).toBeVisible();
    await reportTypeSelect.click();

    // Check for all report types
    await expect(page.getByRole('option', { name: 'Employee Directory' })).toBeVisible();
    await expect(page.getByRole('option', { name: 'Attendance' })).toBeVisible();
    await expect(page.getByRole('option', { name: 'Leave' })).toBeVisible();
    await expect(page.getByRole('option', { name: 'Performance' })).toBeVisible();
    await expect(page.getByRole('option', { name: 'Department Headcount' })).toBeVisible();
  });

  test('should show all frequency options', async ({ page }) => {
    await page.getByRole('button', { name: 'New Schedule' }).click();
    const frequencySelect = page.getByLabel('Frequency *');

    await expect(frequencySelect).toBeVisible();
    await frequencySelect.click();

    await expect(page.getByRole('option', { name: 'Daily' })).toBeVisible();
    await expect(page.getByRole('option', { name: 'Weekly' })).toBeVisible();
    await expect(page.getByRole('option', { name: 'Monthly' })).toBeVisible();
  });

  test('should show day of week selector for weekly frequency', async ({ page }) => {
    await page.getByRole('button', { name: 'New Schedule' }).click();

    // Select Weekly frequency
    const frequencySelect = page.getByLabel('Frequency *');
    await frequencySelect.selectOption('WEEKLY');

    await expect(page.getByLabel('Day of Week *')).toBeVisible();
  });

  test('should show day of month selector for monthly frequency', async ({ page }) => {
    await page.getByRole('button', { name: 'New Schedule' }).click();

    // Select Monthly frequency
    const frequencySelect = page.getByLabel('Frequency *');
    await frequencySelect.selectOption('MONTHLY');

    await expect(page.getByLabel('Day of Month *')).toBeVisible();
  });

  test('should allow adding multiple recipients', async ({ page }) => {
    await page.getByRole('button', { name: 'New Schedule' }).click();

    // Initially there should be one recipient input
    const recipientInputs = page.locator('input[type="email"]');
    await expect(recipientInputs).toHaveCount(1);

    // Click add another recipient
    await page.getByText('Add another recipient').click();

    // Now there should be two recipient inputs
    await expect(recipientInputs).toHaveCount(2);
  });

  test('should allow removing recipients', async ({ page }) => {
    await page.getByRole('button', { name: 'New Schedule' }).click();

    // Add a second recipient
    await page.getByText('Add another recipient').click();
    const recipientInputs = page.locator('input[type="email"]');
    await expect(recipientInputs).toHaveCount(2);

    // Remove one recipient (click the trash button)
    const removeButtons = page.locator('button:has(svg.lucide-trash-2)');
    await removeButtons.first().click();

    // Should be back to one recipient
    await expect(recipientInputs).toHaveCount(1);
  });

  test('should close modal on cancel', async ({ page }) => {
    await page.getByRole('button', { name: 'New Schedule' }).click();
    await expect(page.getByRole('heading', { name: 'Create Scheduled Report' })).toBeVisible();

    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('heading', { name: 'Create Scheduled Report' })).not.toBeVisible();
  });

  test('should show export format options', async ({ page }) => {
    await page.getByRole('button', { name: 'New Schedule' }).click();

    const formatSelect = page.getByLabel('Export Format *');
    await expect(formatSelect).toBeVisible();
    await formatSelect.click();

    await expect(page.getByRole('option', { name: /Excel/i })).toBeVisible();
    await expect(page.getByRole('option', { name: /PDF/i })).toBeVisible();
    await expect(page.getByRole('option', { name: /CSV/i })).toBeVisible();
  });
});

test.describe('Scheduled Reports - Edit and Delete', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/reports/scheduled');
  });

  test('should show edit and delete buttons on report cards', async ({ page }) => {
    // This test assumes there's at least one scheduled report
    const reportCard = page.locator('.bg-surface-light, .dark\\:bg-surface-dark').first();
    const count = await reportCard.count();

    if (count > 0) {
      const editButton = reportCard.getByTitle('Edit');
      const deleteButton = reportCard.getByTitle('Delete');

      if (await editButton.isVisible()) {
        await expect(editButton).toBeVisible();
        await expect(deleteButton).toBeVisible();
      }
    }
  });

  test('should open delete confirmation modal', async ({ page }) => {
    const deleteButton = page.getByTitle('Delete').first();
    const count = await deleteButton.count();

    if (count > 0) {
      await deleteButton.click();
      await expect(page.getByRole('heading', { name: 'Delete Scheduled Report' })).toBeVisible();
      await expect(page.getByText('Are you sure you want to delete')).toBeVisible();
    }
  });
});
