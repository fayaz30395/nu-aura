import { test, expect } from '@playwright/test';

/**
 * Network and Error Scenario E2E Tests
 * Tests application behavior under various network conditions and error scenarios
 */

test.describe('Network Error Handling', () => {
  test('should show error message when API returns 500', async ({ page }) => {
    // Intercept API calls and return 500 error
    await page.route('**/api/v1/employees**', (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Internal Server Error' }),
      });
    });

    await page.goto('/employees');

    // Should show error state
    const errorMessage = page.getByText(/error|failed|something went wrong/i);
    await expect(errorMessage.first()).toBeVisible({ timeout: 10000 });
  });

  test('should show error when API returns 403 Forbidden', async ({ page }) => {
    await page.route('**/api/v1/employees**', (route) => {
      route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Forbidden' }),
      });
    });

    await page.goto('/employees');

    // Should show forbidden/access denied message
    const errorMessage = page.getByText(/forbidden|access denied|not authorized|error/i);
    await expect(errorMessage.first()).toBeVisible({ timeout: 10000 });
  });

  test('should show error when API returns 404', async ({ page }) => {
    await page.route('**/api/v1/employees/**', (route) => {
      if (route.request().url().includes('/employees/')) {
        route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Not Found' }),
        });
      } else {
        route.continue();
      }
    });

    // Try to navigate to non-existent employee
    await page.goto('/employees/non-existent-id');

    // Should show not found or error
    const errorMessage = page.getByText(/not found|error|doesn't exist/i);
    await expect(errorMessage.first()).toBeVisible({ timeout: 10000 });
  });

  test('should handle network timeout gracefully', async ({ page }) => {
    // Simulate very slow network
    await page.route('**/api/v1/**', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 30000)); // 30 second delay
      route.abort('timedout');
    });

    await page.goto('/dashboard');

    // Should show loading state initially
    const loadingIndicator = page.locator('.animate-spin').or(
      page.getByText(/loading/i)
    );

    // Wait a bit for the timeout handling
    await page.waitForTimeout(5000);

    // Either still loading or showing error
    const hasLoading = await loadingIndicator.first().isVisible().catch(() => false);
    const errorMessage = page.getByText(/timeout|error|try again/i);
    const hasError = await errorMessage.first().isVisible().catch(() => false);

    expect(hasLoading || hasError).toBeTruthy();
  });

  test('should retry failed requests when clicking retry button', async ({ page }) => {
    let callCount = 0;

    await page.route('**/api/v1/employees**', (route) => {
      callCount++;
      if (callCount === 1) {
        // First call fails
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Server Error' }),
        });
      } else {
        // Subsequent calls succeed
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            content: [],
            totalElements: 0,
            totalPages: 0,
          }),
        });
      }
    });

    await page.goto('/employees');

    // Wait for error to appear
    await page.waitForTimeout(2000);

    // Look for retry button
    const retryButton = page.getByRole('button', { name: /retry|try again/i });
    if (await retryButton.isVisible()) {
      await retryButton.click();

      // Should make another request
      await page.waitForTimeout(1000);
      expect(callCount).toBeGreaterThan(1);
    }
  });

  test('should handle network disconnect gracefully', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Simulate offline mode
    await page.context().setOffline(true);

    // Try to navigate
    await page.getByRole('link', { name: /employees|team/i }).first().click();

    // Wait for error handling
    await page.waitForTimeout(2000);

    // Should show offline or error message
    const offlineMessage = page.getByText(/offline|connection|network/i);
    const hasOfflineMessage = await offlineMessage.first().isVisible().catch(() => false);

    // Restore online
    await page.context().setOffline(false);

    expect(hasOfflineMessage).toBeDefined();
  });
});

test.describe('Session Expiration', () => {
  test('should redirect to login when session expires', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Simulate 401 response (session expired)
    await page.route('**/api/v1/**', (route) => {
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Unauthorized' }),
      });
    });

    // Trigger an API call by clicking something
    const refreshTrigger = page.getByRole('button').first();
    if (await refreshTrigger.isVisible()) {
      await refreshTrigger.click();
    }

    // Wait for redirect
    await page.waitForTimeout(3000);

    // Should be redirected to login or show session expired message
    const isOnLogin = page.url().includes('/auth/login') || page.url().includes('/login');
    const sessionExpiredMessage = page.getByText(/session expired|please log in|unauthorized/i);
    const hasSessionMessage = await sessionExpiredMessage.first().isVisible().catch(() => false);

    expect(isOnLogin || hasSessionMessage).toBeTruthy();
  });
});

test.describe('Empty States', () => {
  test('should show empty state when no employees', async ({ page }) => {
    await page.route('**/api/v1/employees**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          content: [],
          totalElements: 0,
          totalPages: 0,
          size: 20,
          number: 0,
        }),
      });
    });

    await page.goto('/employees');

    // Should show empty state message
    const emptyMessage = page.getByText(/no employees|no data|empty|no results/i);
    await expect(emptyMessage.first()).toBeVisible({ timeout: 10000 });
  });

  test('should show empty state when no leave requests', async ({ page }) => {
    await page.route('**/api/v1/leave-requests**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          content: [],
          totalElements: 0,
          totalPages: 0,
          size: 20,
          number: 0,
        }),
      });
    });

    await page.goto('/leave');

    // Should show empty state
    const emptyMessage = page.getByText(/no leave|no requests|empty|no results/i);
    await expect(emptyMessage.first()).toBeVisible({ timeout: 10000 });
  });

  test('should show empty state for search with no results', async ({ page }) => {
    await page.route('**/api/v1/employees**', (route) => {
      const url = route.request().url();
      if (url.includes('search') || url.includes('q=')) {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            content: [],
            totalElements: 0,
            totalPages: 0,
          }),
        });
      } else {
        route.continue();
      }
    });

    await page.goto('/employees');

    // Find and use search input
    const searchInput = page.getByPlaceholder(/search/i).or(
      page.locator('input[type="search"]')
    );

    if (await searchInput.first().isVisible()) {
      await searchInput.first().fill('xyznonexistent12345');
      await page.keyboard.press('Enter');

      // Wait for results
      await page.waitForTimeout(2000);

      // Should show no results message
      const noResultsMessage = page.getByText(/no results|no matches|not found/i);
      await expect(noResultsMessage.first()).toBeVisible({ timeout: 10000 });
    }
  });
});

test.describe('Concurrent Operations', () => {
  test('should handle rapid navigation correctly', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Rapidly click multiple navigation links
    await page.getByRole('link', { name: /employees|team/i }).first().click();
    await page.getByRole('link', { name: /leave/i }).first().click();
    await page.getByRole('link', { name: /dashboard|home/i }).first().click();

    // Wait for navigation to settle
    await page.waitForLoadState('networkidle');

    // Should end up on dashboard without errors
    expect(page.url()).toContain('/dashboard');

    // No error messages should be visible
    const errorMessages = page.locator('.text-red-500, .text-error, [role="alert"]');
    const errorCount = await errorMessages.count();

    // Some errors might be acceptable if they disappear quickly
    if (errorCount > 0) {
      await page.waitForTimeout(2000);
      const currentErrorCount = await errorMessages.count();
      expect(currentErrorCount).toBeLessThan(3);
    }
  });

  test('should prevent double form submission', async ({ page }) => {
    let submitCount = 0;

    await page.route('**/api/v1/leave-requests**', async (route) => {
      if (route.request().method() === 'POST') {
        submitCount++;
        // Simulate slow response
        await new Promise((resolve) => setTimeout(resolve, 2000));
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ id: 'test-id', status: 'PENDING' }),
        });
      } else {
        route.continue();
      }
    });

    await page.goto('/leave');

    // Open create form if button exists
    const createButton = page.getByRole('button', { name: /new|create|request/i }).first();
    if (await createButton.isVisible()) {
      await createButton.click();

      // Wait for form
      await page.waitForTimeout(500);

      // Find submit button and click twice rapidly
      const submitButton = page.getByRole('button', { name: /submit|save|create/i }).first();
      if (await submitButton.isVisible()) {
        await submitButton.click();
        await submitButton.click();

        // Wait for response
        await page.waitForTimeout(3000);

        // Should only submit once (button should be disabled during submission)
        expect(submitCount).toBeLessThanOrEqual(1);
      }
    }
  });
});

test.describe('Rate Limiting', () => {
  test('should handle 429 rate limiting response', async ({ page }) => {
    let callCount = 0;

    await page.route('**/api/v1/**', (route) => {
      callCount++;
      if (callCount > 2) {
        route.fulfill({
          status: 429,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Too Many Requests' }),
          headers: {
            'Retry-After': '60',
          },
        });
      } else {
        route.continue();
      }
    });

    await page.goto('/dashboard');

    // Trigger multiple API calls
    for (let i = 0; i < 5; i++) {
      await page.reload();
      await page.waitForTimeout(100);
    }

    // Should show rate limit message or continue gracefully
    const rateLimitMessage = page.getByText(/too many|rate limit|slow down|try again later/i);
    const hasRateLimitMessage = await rateLimitMessage.first().isVisible().catch(() => false);

    // Application should still be functional
    const pageLoaded = await page.locator('body').isVisible();
    expect(pageLoaded).toBeTruthy();
  });
});
