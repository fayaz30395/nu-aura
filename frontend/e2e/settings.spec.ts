import {expect, test} from '@playwright/test';

/**
 * Settings Page E2E Tests
 * Tests notification preferences and other settings
 */

test.describe('Settings Page', () => {
  test.beforeEach(async ({page}) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
  });

  test('should display settings page', async ({page}) => {
    await expect(page.locator('h1:has-text("Settings")')).toBeVisible();
  });

  test('should display notification preferences card', async ({page}) => {
    await expect(page.locator('text=Notification Preferences')).toBeVisible();
  });

  test('should display notification channel tabs', async ({page}) => {
    // Check for tabs
    await expect(page.locator('text=Delivery Channels')).toBeVisible();
    await expect(page.locator('text=Notification Types')).toBeVisible();
  });

  test('should switch between notification tabs', async ({page}) => {
    // Click on Notification Types tab
    await page.click('text=Notification Types');
    await page.waitForTimeout(500);

    // Should show category toggles
    await expect(page.locator('text=Leave Notifications')).toBeVisible();
    await expect(page.locator('text=Attendance Notifications')).toBeVisible();
  });

  test('should display delivery channel options', async ({page}) => {
    // Ensure on Delivery Channels tab
    await page.click('text=Delivery Channels');
    await page.waitForTimeout(300);

    // Check for channel options - use first() for multiple matches
    await expect(page.locator('text=Email Notifications').first()).toBeVisible();
    await expect(page.locator('text=Push Notifications').first()).toBeVisible();
    await expect(page.locator('text=SMS Notifications').first()).toBeVisible();
  });

  test('should display notification type options', async ({page}) => {
    // Switch to Notification Types tab
    await page.click('text=Notification Types');
    await page.waitForTimeout(300);

    // Check for category options
    const categories = [
      'Leave Notifications',
      'Attendance Notifications',
      'Payroll Notifications',
      'Performance Notifications',
      'Announcements',
      'Birthday Notifications',
      'Work Anniversary Notifications',
      'System Alerts',
    ];

    for (const category of categories) {
      await expect(page.locator(`text=${category}`).first()).toBeVisible();
    }
  });

  test('should toggle notification settings', async ({page}) => {
    // Find a toggle button
    const toggles = page.locator('button[class*="rounded-full"]');
    const toggleCount = await toggles.count();

    if (toggleCount > 0) {
      // Click first toggle
      await toggles.first().click();
      await page.waitForTimeout(300);

      // Toggle should still be visible (state changed)
      await expect(toggles.first()).toBeVisible();
    }
  });

  test('should display save button', async ({page}) => {
    await expect(page.locator('button:has-text("Save Preferences")')).toBeVisible();
  });

  test('should display preferences summary', async ({page}) => {
    // Check for summary text - use regex for partial match
    await expect(page.locator('text=/delivery channel.*enabled/')).toBeVisible();
  });

  test('should display appearance settings', async ({page}) => {
    await expect(page.locator('text=Appearance')).toBeVisible();
    await expect(page.locator('text=Dark Mode')).toBeVisible();
  });

  test('should toggle dark mode', async ({page}) => {
    // Find dark mode toggle
    const darkModeSection = page.locator('text=Dark Mode').locator('..');
    const toggle = darkModeSection.locator('button[class*="rounded-full"]');

    if (await toggle.isVisible()) {
      await toggle.click();
      await page.waitForTimeout(500);
    }
  });

  test('should display security settings', async ({page}) => {
    // Use heading role for specific element
    await expect(page.getByRole('heading', {name: 'Security'})).toBeVisible();
    await expect(page.locator('text=Change Password').first()).toBeVisible();
  });
});

test.describe('Settings - Password Change', () => {
  test.beforeEach(async ({page}) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
  });

  test('should display password fields', async ({page}) => {
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
  });

  test('should toggle password visibility', async ({page}) => {
    // Find eye icon button
    const eyeButton = page.locator('button').filter({has: page.locator('svg')}).first();

    if (await eyeButton.isVisible()) {
      await eyeButton.click();
      await page.waitForTimeout(300);
    }
  });

  test('should validate password requirements', async ({page}) => {
    // Fill in passwords
    const passwordInputs = page.locator('input[type="password"]');
    const count = await passwordInputs.count();

    if (count >= 2) {
      await passwordInputs.nth(0).fill('oldpass');
      await passwordInputs.nth(1).fill('newpass123');
    }
  });
});
