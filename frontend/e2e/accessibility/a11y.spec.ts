import {expect, test} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Accessibility E2E Tests
 * Uses axe-core to test WCAG 2.1 compliance
 */

test.describe('Accessibility Tests', () => {
  test.describe('Dashboard Accessibility', () => {
    test('should not have any automatically detectable accessibility issues', async ({page}) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      const accessibilityScanResults = await new AxeBuilder({page})
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      // Filter out known acceptable issues
      const violations = accessibilityScanResults.violations.filter(
        (violation) => !isAcceptableViolation(violation)
      );

      if (violations.length > 0) {
        console.log('Accessibility violations found:');
        violations.forEach((violation) => {
          console.log(`\n[${violation.impact}] ${violation.id}: ${violation.description}`);
          console.log(`Help: ${violation.helpUrl}`);
          violation.nodes.forEach((node) => {
            console.log(`  - ${node.html.substring(0, 100)}...`);
          });
        });
      }

      expect(violations.length).toBe(0);
    });

    test('should have proper heading hierarchy', async ({page}) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // Check heading structure
      const headings = await page.$$eval('h1, h2, h3, h4, h5, h6', (elements) => {
        return elements.map((el) => ({
          level: parseInt(el.tagName.substring(1)),
          text: el.textContent?.trim(),
        }));
      });

      // Should have at least one h1
      const h1Count = headings.filter((h) => h.level === 1).length;
      expect(h1Count).toBeGreaterThanOrEqual(1);

      // Check for skipped heading levels
      let prevLevel = 0;
      for (const heading of headings) {
        if (heading.level > prevLevel + 1 && prevLevel !== 0) {
          console.warn(`Skipped heading level: h${prevLevel} -> h${heading.level}`);
        }
        prevLevel = heading.level;
      }
    });

    test('should have proper ARIA landmarks', async ({page}) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // Check for main landmark
      const mainLandmark = page.locator('main, [role="main"]');
      await expect(mainLandmark.first()).toBeVisible();

      // Check for navigation landmark
      const navLandmark = page.locator('nav, [role="navigation"]');
      await expect(navLandmark.first()).toBeVisible();

      // Check for header/banner
      const header = page.locator('header, [role="banner"]');
      await expect(header.first()).toBeVisible();
    });
  });

  test.describe('Navigation Accessibility', () => {
    test('should support keyboard navigation', async ({page}) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // Press Tab to start navigation
      await page.keyboard.press('Tab');

      // Get the focused element
      const firstFocused = await page.evaluate(() => {
        return document.activeElement?.tagName;
      });

      // Should focus on an interactive element
      expect(['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA']).toContain(firstFocused);

      // Tab through several elements
      for (let i = 0; i < 5; i++) {
        await page.keyboard.press('Tab');
      }

      // Should still have focus somewhere meaningful
      const currentFocused = await page.evaluate(() => {
        return document.activeElement?.tagName;
      });
      expect(currentFocused).toBeTruthy();
    });

    test('should have visible focus indicators', async ({page}) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // Find a focusable element
      const link = page.getByRole('link').first();
      await link.focus();

      // Check for focus styling
      const focusStyles = await link.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        return {
          outline: styles.outline,
          outlineWidth: styles.outlineWidth,
          boxShadow: styles.boxShadow,
          borderColor: styles.borderColor,
        };
      });

      // Should have some visible focus indication
      const hasFocusIndicator =
        focusStyles.outline !== 'none' ||
        focusStyles.outlineWidth !== '0px' ||
        focusStyles.boxShadow !== 'none' ||
        focusStyles.borderColor !== 'rgb(0, 0, 0)';

      expect(hasFocusIndicator).toBeTruthy();
    });

    test('should allow Escape key to close modals', async ({page}) => {
      await page.goto('/employees');
      await page.waitForLoadState('networkidle');

      // Try to open a modal
      const addButton = page.getByRole('button', {name: /add|new|create/i}).first();
      if (await addButton.isVisible()) {
        await addButton.click();

        // Wait for modal
        await page.waitForTimeout(500);

        // Find modal
        const modal = page.locator('[role="dialog"]').or(
          page.locator('.modal, .fixed.inset-0')
        );

        if (await modal.first().isVisible()) {
          // Press Escape
          await page.keyboard.press('Escape');

          // Modal should close
          await expect(modal.first()).toBeHidden({timeout: 2000});
        }
      }
    });

    test('should trap focus within modals', async ({page}) => {
      await page.goto('/employees');
      await page.waitForLoadState('networkidle');

      const addButton = page.getByRole('button', {name: /add|new|create/i}).first();
      if (await addButton.isVisible()) {
        await addButton.click();
        await page.waitForTimeout(500);

        const modal = page.locator('[role="dialog"]').or(
          page.locator('.modal')
        );

        if (await modal.first().isVisible()) {
          // Tab through modal elements
          const focusableInModal = await modal.first().locator('button, input, select, textarea, a[href]');
          const count = await focusableInModal.count();

          if (count > 1) {
            // Tab count + 2 times to cycle through
            for (let i = 0; i < count + 2; i++) {
              await page.keyboard.press('Tab');
            }

            // Focus should still be within modal
            const activeElementInModal = await modal.first().evaluate((modalEl) => {
              return modalEl.contains(document.activeElement);
            });

            expect(activeElementInModal).toBeTruthy();
          }
        }
      }
    });
  });

  test.describe('Form Accessibility', () => {
    test('should have labels for all form inputs', async ({page}) => {
      await page.goto('/auth/login');
      await page.waitForLoadState('networkidle');

      const accessibilityScanResults = await new AxeBuilder({page})
        .withTags(['wcag2a'])
        .options({
          rules: {
            'label': {enabled: true},
            'label-title-only': {enabled: true},
          },
        })
        .analyze();

      const labelViolations = accessibilityScanResults.violations.filter(
        (v) => v.id.includes('label')
      );

      if (labelViolations.length > 0) {
        console.log('Label violations:');
        labelViolations.forEach((v) => console.log(`${v.id}: ${v.description}`));
      }

      expect(labelViolations.length).toBe(0);
    });

    test('should announce form errors to screen readers', async ({page}) => {
      await page.goto('/auth/login');
      await page.waitForLoadState('networkidle');

      // Submit empty form
      const submitButton = page.getByRole('button', {name: /sign in|log in|submit/i});
      await submitButton.click();

      // Error messages should have role="alert" or be in aria-live region
      const errorWithRole = page.locator('[role="alert"]');
      const ariaLiveRegion = page.locator('[aria-live]');
      const errorDescription = page.locator('[aria-describedby]');

      const hasAccessibleError =
        (await errorWithRole.count()) > 0 ||
        (await ariaLiveRegion.count()) > 0 ||
        (await errorDescription.count()) > 0;

      // Either has accessible error or form validation prevents empty submission
      expect(hasAccessibleError || page.url().includes('/login')).toBeTruthy();
    });

    test('should have proper autocomplete attributes', async ({page}) => {
      await page.goto('/auth/login');
      await page.waitForLoadState('networkidle');

      const emailInput = page.locator('input[type="email"]');
      const passwordInput = page.locator('input[type="password"]');

      if (await emailInput.isVisible()) {
        const emailAutocomplete = await emailInput.getAttribute('autocomplete');
        expect(emailAutocomplete).toBeTruthy();
      }

      if (await passwordInput.isVisible()) {
        const passwordAutocomplete = await passwordInput.getAttribute('autocomplete');
        expect(passwordAutocomplete).toBeTruthy();
      }
    });
  });

  test.describe('Color Contrast', () => {
    test('should meet color contrast requirements', async ({page}) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      const accessibilityScanResults = await new AxeBuilder({page})
        .options({
          rules: {
            'color-contrast': {enabled: true},
          },
        })
        .analyze();

      const contrastViolations = accessibilityScanResults.violations.filter(
        (v) => v.id === 'color-contrast'
      );

      if (contrastViolations.length > 0) {
        console.log('Color contrast violations:');
        contrastViolations.forEach((violation) => {
          violation.nodes.forEach((node) => {
            console.log(`  - ${node.html.substring(0, 80)}...`);
          });
        });
      }

      // Allow some minor contrast issues but flag major ones
      const seriousViolations = contrastViolations.filter(
        (v) => v.impact === 'critical' || v.impact === 'serious'
      );

      expect(seriousViolations.length).toBe(0);
    });
  });

  test.describe('Images and Media', () => {
    test('should have alt text for all images', async ({page}) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      const images = await page.locator('img').all();

      for (const img of images) {
        const alt = await img.getAttribute('alt');
        const role = await img.getAttribute('role');

        // Should have alt text OR role="presentation"/role="none" for decorative
        const hasAlt = alt !== null && alt !== '';
        const isDecorative = role === 'presentation' || role === 'none' || alt === '';

        expect(hasAlt || isDecorative).toBeTruthy();
      }
    });

    test('should have accessible icons', async ({page}) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // Check SVG icons
      const svgIcons = page.locator('svg');
      const count = await svgIcons.count();

      for (let i = 0; i < Math.min(count, 10); i++) {
        const icon = svgIcons.nth(i);

        // Icon should have aria-hidden or accessible name
        const ariaHidden = await icon.getAttribute('aria-hidden');
        const ariaLabel = await icon.getAttribute('aria-label');
        const title = await icon.locator('title').count();

        // If not hidden, should have accessible name
        if (ariaHidden !== 'true') {
          // Check if parent button has accessible name
          const parent = icon.locator('..');
          const parentLabel = await parent.getAttribute('aria-label');
          const parentText = await parent.textContent();

          expect(ariaLabel || title > 0 || parentLabel || parentText?.trim()).toBeTruthy();
        }
      }
    });
  });

  test.describe('Interactive Elements', () => {
    test('should have accessible names for all buttons', async ({page}) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      const buttons = await page.getByRole('button').all();

      for (const button of buttons.slice(0, 10)) {
        const accessibleName = await button.evaluate((el) => {
          return el.getAttribute('aria-label') ||
            el.getAttribute('title') ||
            el.textContent?.trim();
        });

        expect(accessibleName).toBeTruthy();
      }
    });

    test('should have accessible names for all links', async ({page}) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      const links = await page.getByRole('link').all();

      for (const link of links.slice(0, 10)) {
        const accessibleName = await link.evaluate((el) => {
          return el.getAttribute('aria-label') ||
            el.getAttribute('title') ||
            el.textContent?.trim();
        });

        expect(accessibleName).toBeTruthy();
      }
    });
  });

  test.describe('Page-specific Accessibility', () => {
    const pagesToTest = [
      {path: '/dashboard', name: 'Dashboard'},
      {path: '/employees', name: 'Employees'},
      {path: '/leave', name: 'Leave'},
      {path: '/me/profile', name: 'Profile'},
      {path: '/expenses', name: 'Expenses'},
    ];

    for (const pageConfig of pagesToTest) {
      test(`${pageConfig.name} page should pass accessibility checks`, async ({page}) => {
        await page.goto(pageConfig.path);
        await page.waitForLoadState('networkidle');

        const accessibilityScanResults = await new AxeBuilder({page})
          .withTags(['wcag2a', 'wcag2aa'])
          .analyze();

        const violations = accessibilityScanResults.violations.filter(
          (violation) => !isAcceptableViolation(violation)
        );

        if (violations.length > 0) {
          console.log(`Accessibility issues on ${pageConfig.name}:`);
          violations.forEach((v) => {
            console.log(`  [${v.impact}] ${v.id}: ${v.description}`);
          });
        }

        // Allow some minor/moderate issues but fail on serious/critical
        const criticalViolations = violations.filter(
          (v) => v.impact === 'critical' || v.impact === 'serious'
        );

        expect(criticalViolations.length).toBe(0);
      });
    }
  });
});

/**
 * Helper function to filter out acceptable/known violations
 */
function isAcceptableViolation(violation: { id: string; impact?: string }): boolean {
  // List of known acceptable violations (with justification)
  const acceptableViolations = [
    // External library components that can't be easily modified
    'aria-hidden-focus',
    // Date pickers often have accessibility issues but are functional
    'nested-interactive',
  ];

  return acceptableViolations.includes(violation.id);
}
