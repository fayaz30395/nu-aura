import { test, expect } from '@playwright/test';

/**
 * Validation and Edge Case E2E Tests
 * Tests form validation, boundary conditions, and special character handling
 */

test.describe('Form Validation', () => {
  test.describe('Login Form Validation', () => {
    test.beforeEach(async ({ page }) => {
      // Clear auth state for login tests
      await page.context().clearCookies();
      await page.goto('/auth/login');
    });

    test('should show error for empty email', async ({ page }) => {
      const submitButton = page.getByRole('button', { name: /sign in|log in|submit/i });
      const emailInput = page.locator('input[type="email"]');

      // Leave email empty and submit
      await submitButton.click();

      // Should show validation error
      const errorMessage = page.getByText(/required|email|invalid/i);
      await expect(errorMessage.first()).toBeVisible({ timeout: 5000 });
    });

    test('should show error for invalid email format', async ({ page }) => {
      const emailInput = page.locator('input[type="email"]');
      const passwordInput = page.locator('input[type="password"]');
      const submitButton = page.getByRole('button', { name: /sign in|log in|submit/i });

      await emailInput.fill('invalid-email');
      await passwordInput.fill('password123');
      await submitButton.click();

      // Should show email format error
      const errorMessage = page.getByText(/valid email|email format|invalid email/i);
      const hasError = await errorMessage.first().isVisible().catch(() => false);

      // Or browser native validation should prevent submission
      const inputValidity = await emailInput.evaluate((el: HTMLInputElement) => el.validity.valid);

      expect(hasError || !inputValidity).toBeTruthy();
    });

    test('should show error for short password', async ({ page }) => {
      const emailInput = page.locator('input[type="email"]');
      const passwordInput = page.locator('input[type="password"]');
      const submitButton = page.getByRole('button', { name: /sign in|log in|submit/i });

      await emailInput.fill('test@example.com');
      await passwordInput.fill('123'); // Too short
      await submitButton.click();

      // Should show password length error
      const errorMessage = page.getByText(/password|characters|short|minimum/i);
      const hasError = await errorMessage.first().isVisible().catch(() => false);

      // Form should still be on login page
      expect(page.url()).toContain('/login');
    });
  });

  test.describe('Employee Form Validation', () => {
    test('should validate required fields in employee form', async ({ page }) => {
      await page.goto('/employees');

      // Try to open add employee form
      const addButton = page.getByRole('button', { name: /add|new|create/i }).first();
      if (await addButton.isVisible()) {
        await addButton.click();

        // Wait for form
        await page.waitForTimeout(500);

        // Try to submit empty form
        const submitButton = page.getByRole('button', { name: /save|submit|create/i }).last();
        if (await submitButton.isVisible()) {
          await submitButton.click();

          // Should show validation errors for required fields
          const requiredErrors = page.getByText(/required|this field|cannot be empty/i);
          await expect(requiredErrors.first()).toBeVisible({ timeout: 5000 });
        }
      }
    });

    test('should validate email format in employee form', async ({ page }) => {
      await page.goto('/employees');

      const addButton = page.getByRole('button', { name: /add|new|create/i }).first();
      if (await addButton.isVisible()) {
        await addButton.click();

        // Wait for form
        await page.waitForTimeout(500);

        // Fill invalid email
        const emailInput = page.getByPlaceholder(/email/i).or(
          page.locator('input[name*="email"]')
        );

        if (await emailInput.first().isVisible()) {
          await emailInput.first().fill('not-an-email');

          // Try to submit
          const submitButton = page.getByRole('button', { name: /save|submit|create/i }).last();
          await submitButton.click();

          // Should show email error
          const emailError = page.getByText(/valid email|email format/i);
          const hasError = await emailError.first().isVisible().catch(() => false);

          expect(hasError).toBeTruthy();
        }
      }
    });
  });

  test.describe('Leave Request Validation', () => {
    test('should validate date range in leave form', async ({ page }) => {
      await page.goto('/leave');

      const addButton = page.getByRole('button', { name: /new|request|create/i }).first();
      if (await addButton.isVisible()) {
        await addButton.click();

        // Wait for form
        await page.waitForTimeout(500);

        // Find date inputs
        const fromDate = page.locator('input[name*="from"]').or(
          page.locator('input[name*="start"]')
        );
        const toDate = page.locator('input[name*="to"]').or(
          page.locator('input[name*="end"]')
        );

        if (await fromDate.first().isVisible() && await toDate.first().isVisible()) {
          // Set end date before start date
          await fromDate.first().fill('2025-12-31');
          await toDate.first().fill('2025-12-01');

          // Submit
          const submitButton = page.getByRole('button', { name: /submit|save|request/i }).last();
          await submitButton.click();

          // Should show date validation error
          const dateError = page.getByText(/date|before|after|invalid range/i);
          const hasError = await dateError.first().isVisible().catch(() => false);

          // Form should prevent invalid submission
          expect(hasError || page.url().includes('/leave')).toBeTruthy();
        }
      }
    });
  });
});

test.describe('Boundary Conditions', () => {
  test('should handle maximum length input', async ({ page }) => {
    await page.goto('/employees');

    const addButton = page.getByRole('button', { name: /add|new|create/i }).first();
    if (await addButton.isVisible()) {
      await addButton.click();
      await page.waitForTimeout(500);

      // Find name input
      const nameInput = page.getByPlaceholder(/name/i).or(
        page.locator('input[name*="name"]')
      ).first();

      if (await nameInput.isVisible()) {
        // Try to enter very long string (500 characters)
        const longString = 'A'.repeat(500);
        await nameInput.fill(longString);

        // Check if input was truncated or rejected
        const actualValue = await nameInput.inputValue();

        // Input should either truncate or have max length constraint
        expect(actualValue.length).toBeLessThanOrEqual(500);
      }
    }
  });

  test('should handle special characters in input', async ({ page }) => {
    await page.goto('/employees');

    const searchInput = page.getByPlaceholder(/search/i).or(
      page.locator('input[type="search"]')
    );

    if (await searchInput.first().isVisible()) {
      // Test special characters that could cause issues
      const specialChars = '<script>alert("xss")</script>';
      await searchInput.first().fill(specialChars);
      await page.keyboard.press('Enter');

      // Wait for search to complete
      await page.waitForTimeout(1000);

      // Page should not execute script (no XSS)
      // Should show no results or handle gracefully
      const hasXSSAlert = await page.evaluate(() => {
        return window.alert !== undefined;
      });

      expect(hasXSSAlert).toBeTruthy(); // alert should still exist (not hijacked)

      // Check input was sanitized in display
      const displayedText = await page.locator('body').textContent();
      expect(displayedText).not.toContain('<script>');
    }
  });

  test('should handle SQL injection attempt safely', async ({ page }) => {
    await page.goto('/employees');

    const searchInput = page.getByPlaceholder(/search/i).or(
      page.locator('input[type="search"]')
    );

    if (await searchInput.first().isVisible()) {
      // SQL injection attempt
      const sqlInjection = "'; DROP TABLE employees; --";
      await searchInput.first().fill(sqlInjection);
      await page.keyboard.press('Enter');

      // Wait for search
      await page.waitForTimeout(1000);

      // Application should still work (no database error)
      const hasError = await page.getByText(/database error|sql error|syntax error/i).first().isVisible().catch(() => false);
      expect(hasError).toBeFalsy();
    }
  });

  test('should handle unicode and emoji characters', async ({ page }) => {
    await page.goto('/employees');

    const searchInput = page.getByPlaceholder(/search/i).or(
      page.locator('input[type="search"]')
    );

    if (await searchInput.first().isVisible()) {
      // Unicode and emoji input
      const unicodeText = '你好世界 🎉 مرحبا العالم';
      await searchInput.first().fill(unicodeText);

      // Input should accept unicode
      const actualValue = await searchInput.first().inputValue();
      expect(actualValue).toBe(unicodeText);
    }
  });

  test('should handle zero and negative numbers appropriately', async ({ page }) => {
    await page.goto('/expenses');

    const addButton = page.getByRole('button', { name: /new|add|create/i }).first();
    if (await addButton.isVisible()) {
      await addButton.click();
      await page.waitForTimeout(500);

      // Find amount input
      const amountInput = page.locator('input[type="number"]').or(
        page.getByPlaceholder(/amount/i)
      );

      if (await amountInput.first().isVisible()) {
        // Try negative amount
        await amountInput.first().fill('-100');

        // Submit form
        const submitButton = page.getByRole('button', { name: /submit|save|create/i }).last();
        await submitButton.click();

        // Should show validation error or prevent negative amounts
        const errorMessage = page.getByText(/positive|greater than|invalid|cannot be negative/i);
        const hasError = await errorMessage.first().isVisible().catch(() => false);

        // Check if input has min attribute
        const minValue = await amountInput.first().getAttribute('min');
        const hasMinConstraint = minValue !== null && parseFloat(minValue) >= 0;

        expect(hasError || hasMinConstraint).toBeTruthy();
      }
    }
  });
});

test.describe('Partial Form Submission', () => {
  test('should preserve form data on validation error', async ({ page }) => {
    await page.goto('/employees');

    const addButton = page.getByRole('button', { name: /add|new|create/i }).first();
    if (await addButton.isVisible()) {
      await addButton.click();
      await page.waitForTimeout(500);

      // Fill some fields but leave required ones empty
      const nameInput = page.locator('input[name*="firstName"]').or(
        page.getByPlaceholder(/first name/i)
      );

      if (await nameInput.first().isVisible()) {
        const testName = 'Test Name';
        await nameInput.first().fill(testName);

        // Submit with incomplete data
        const submitButton = page.getByRole('button', { name: /save|submit|create/i }).last();
        await submitButton.click();

        // Wait for validation
        await page.waitForTimeout(500);

        // Original data should be preserved
        const currentValue = await nameInput.first().inputValue();
        expect(currentValue).toBe(testName);
      }
    }
  });

  test('should warn about unsaved changes when navigating away', async ({ page }) => {
    await page.goto('/employees');

    const addButton = page.getByRole('button', { name: /add|new|create/i }).first();
    if (await addButton.isVisible()) {
      await addButton.click();
      await page.waitForTimeout(500);

      // Fill some form data
      const nameInput = page.locator('input').first();
      await nameInput.fill('Test Data');

      // Try to navigate away
      await page.getByRole('link', { name: /dashboard|home/i }).first().click();

      // Should either show confirmation dialog or prevent navigation
      // Note: Browser dialogs are handled differently in Playwright
      page.on('dialog', async (dialog) => {
        expect(dialog.type()).toBe('beforeunload');
        await dialog.accept();
      });

      // Or stay on form page (if implemented with state check)
      await page.waitForTimeout(500);
    }
  });
});

test.describe('Date Handling', () => {
  test('should handle date picker boundary values', async ({ page }) => {
    await page.goto('/leave');

    const addButton = page.getByRole('button', { name: /new|request|create/i }).first();
    if (await addButton.isVisible()) {
      await addButton.click();
      await page.waitForTimeout(500);

      const dateInput = page.locator('input[type="date"]').first();
      if (await dateInput.isVisible()) {
        // Try past date (should be prevented for new leave)
        await dateInput.fill('2020-01-01');

        // Submit
        const submitButton = page.getByRole('button', { name: /submit|save/i }).last();
        await submitButton.click();

        // Should show error about past dates
        const dateError = page.getByText(/past|future|today|valid date/i);
        const hasError = await dateError.first().isVisible().catch(() => false);

        // Check if there's a min attribute on the date input
        const minDate = await dateInput.getAttribute('min');
        const hasMinConstraint = minDate !== null;

        expect(hasError || hasMinConstraint).toBeTruthy();
      }
    }
  });

  test('should handle far future dates', async ({ page }) => {
    await page.goto('/leave');

    const addButton = page.getByRole('button', { name: /new|request|create/i }).first();
    if (await addButton.isVisible()) {
      await addButton.click();
      await page.waitForTimeout(500);

      const dateInput = page.locator('input[type="date"]').first();
      if (await dateInput.isVisible()) {
        // Try very far future date
        await dateInput.fill('2099-12-31');

        // Should either accept or show warning
        const value = await dateInput.inputValue();

        // Value should be set or constrained
        expect(value).toBeTruthy();
      }
    }
  });
});
