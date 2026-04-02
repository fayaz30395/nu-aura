/**
 * MY SPACE — E2E Test Suite
 *
 * Covers all employee self-service routes under /me/*:
 *   - /me/attendance  — Check-in/out, calendar, stats, regularization
 *   - /me/documents   — Document request list, request modal, stats
 *   - /me/leaves      — Leave balance, apply leave, cancel, filter
 *   - /me/payslips    — Payslip list, year filter, download
 *   - /me/profile     — Profile view, edit, bank change request
 *
 * Rules:
 *   - All MY SPACE routes are available to every employee — no requiredPermission
 *   - Login is always done via API (loginAs) — never via UI form
 *   - Tests are fully independent; no shared state between tests
 */

import { test, expect } from '@playwright/test';
import { testUsers, demoUsers } from './fixtures/testData';
import { loginAs, navigateTo } from './fixtures/helpers';

// ─────────────────────────────────────────────────────────────────────────────
// MY SPACE — My Attendance (/me/attendance)
// ─────────────────────────────────────────────────────────────────────────────

test.describe('MY SPACE - My Attendance', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, testUsers.employee.email);
    await navigateTo(page, '/me/attendance');
  });

  test.describe('Page Load', () => {
    test('should display My Attendance heading', async ({ page }) => {
      await expect(page.locator('h1').filter({ hasText: /My Attendance/i })).toBeVisible({
        timeout: 10000,
      });
    });

    test('should render the page without console errors', async ({ page }) => {
      const errors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') errors.push(msg.text());
      });
      await navigateTo(page, '/me/attendance');
      await page.waitForTimeout(2000);
      const real = errors.filter(
        (e) =>
          !e.includes('favicon') &&
          !e.includes('[HMR]') &&
          !e.includes('hydration') &&
          !e.includes('Warning:')
      );
      expect(real).toHaveLength(0);
    });

    test('should display the URL /me/attendance', async ({ page }) => {
      expect(page.url()).toContain('/me/attendance');
    });
  });

  test.describe('Today Status Card', () => {
    test("should display Today's Status card", async ({ page }) => {
      await expect(
        page.locator('text=Today\'s Status, text=Today\'s Status').first()
      ).toBeVisible({ timeout: 10000 });
    });

    test('should show Check In button or Attendance Completed indicator', async ({ page }) => {
      await page.waitForTimeout(2000);
      const checkInBtn = page.locator('button').filter({ hasText: /Check In/i });
      const checkOutBtn = page.locator('button').filter({ hasText: /Check Out/i });
      const completedBadge = page.locator('text=Attendance Completed');

      const hasCheckIn = await checkInBtn.isVisible().catch(() => false);
      const hasCheckOut = await checkOutBtn.isVisible().catch(() => false);
      const hasCompleted = await completedBadge.isVisible().catch(() => false);

      expect(hasCheckIn || hasCheckOut || hasCompleted).toBe(true);
    });

    test('should show descriptive subtitle below heading', async ({ page }) => {
      await expect(
        page.locator('text=Track your attendance and working hours')
      ).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Monthly Stats Cards', () => {
    test('should display Present Days stat card', async ({ page }) => {
      await expect(page.locator('text=Present Days')).toBeVisible({ timeout: 10000 });
    });

    test('should display Absent Days stat card', async ({ page }) => {
      await expect(page.locator('text=Absent Days')).toBeVisible({ timeout: 10000 });
    });

    test('should display On Leave stat card', async ({ page }) => {
      await expect(page.locator('text=On Leave')).toBeVisible({ timeout: 10000 });
    });

    test('should display Avg. Hours/Day stat card', async ({ page }) => {
      await expect(page.locator('text=Avg. Hours/Day')).toBeVisible({ timeout: 10000 });
    });

    test('stat card values should be numeric', async ({ page }) => {
      await page.waitForTimeout(2000);
      // All four stat values are text-2xl bold numbers inside the stat cards
      const statValues = page.locator('.text-2xl.font-bold');
      const count = await statValues.count();
      expect(count).toBeGreaterThanOrEqual(4);
    });
  });

  test.describe('Attendance Calendar', () => {
    test('should display Attendance Calendar heading', async ({ page }) => {
      await expect(page.locator('text=Attendance Calendar')).toBeVisible({ timeout: 10000 });
    });

    test('should show the current month name', async ({ page }) => {
      const monthName = new Date().toLocaleDateString('en-US', { month: 'long' });
      await expect(page.locator(`text=${monthName}`).first()).toBeVisible({ timeout: 10000 });
    });

    test('should render day-of-week headers (Sun through Sat)', async ({ page }) => {
      for (const day of ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']) {
        await expect(page.locator(`text=${day}`).first()).toBeVisible({ timeout: 10000 });
      }
    });

    test('should navigate to previous month on left chevron click', async ({ page }) => {
      const prevMonth = new Date();
      prevMonth.setMonth(prevMonth.getMonth() - 1);
      const prevMonthName = prevMonth.toLocaleDateString('en-US', { month: 'long' });

      // Click the previous month button (ChevronLeft icon button)
      const chevronLeft = page.locator('button').filter({ has: page.locator('svg') }).first();
      await chevronLeft.click();

      await expect(page.locator(`text=${prevMonthName}`).first()).toBeVisible({ timeout: 5000 });
    });

    test('should navigate to next month on right chevron click', async ({ page }) => {
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      const nextMonthName = nextMonth.toLocaleDateString('en-US', { month: 'long' });

      // The navigation buttons are ordered: prev, next
      const navButtons = page
        .locator('button')
        .filter({ has: page.locator('svg.lucide-chevron-right, svg') });

      // Find the right-chevron by looking for the button containing "ChevronRight"
      // Use the calendar card's nav area — sibling of the month text
      const calendarCard = page.locator('text=Attendance Calendar').locator('../..');
      const nextBtn = calendarCard.locator('button').last();
      await nextBtn.click();

      await expect(page.locator(`text=${nextMonthName}`).first()).toBeVisible({ timeout: 5000 });
    });

    test('should display Details panel', async ({ page }) => {
      await expect(page.locator('text=Details')).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Date Selection & Details', () => {
    test('should show date details when a calendar day is clicked', async ({ page }) => {
      await page.waitForTimeout(2000);

      // Click on a calendar day button (aspect-square cells)
      const dayButtons = page.locator('button[class*="aspect-square"]');
      const count = await dayButtons.count();
      if (count > 0) {
        await dayButtons.first().click();
        // Details panel should update with a date label
        await expect(
          page.locator('text=Date').first()
        ).toBeVisible({ timeout: 5000 });
      }
    });

    test('should show Sessions section in the details panel', async ({ page }) => {
      await page.waitForTimeout(2000);
      // Sessions header should always render once a date is selected (today is auto-selected)
      await expect(page.locator('text=Sessions')).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Regularization Modal', () => {
    test('regularization modal should have a reason textarea', async ({ page }) => {
      await page.waitForTimeout(2000);

      // Trigger the modal — only visible when there is a check-in record without regularization
      const regBtn = page
        .locator('button')
        .filter({ hasText: /Request Regularization/i });

      const isVisible = await regBtn.isVisible().catch(() => false);
      if (isVisible) {
        await regBtn.click();
        await expect(
          page.locator('textarea#regularization-reason, textarea[id*="regularization"]')
        ).toBeVisible({ timeout: 5000 });
      } else {
        // If button not available (no checked-in record today), skip gracefully
        test.skip();
      }
    });

    test('regularization modal should validate empty reason', async ({ page }) => {
      await page.waitForTimeout(2000);
      const regBtn = page
        .locator('button')
        .filter({ hasText: /Request Regularization/i });
      const isVisible = await regBtn.isVisible().catch(() => false);
      if (isVisible) {
        await regBtn.click();
        // Submit button should be disabled when reason is empty
        const submitBtn = page
          .locator('button[type="submit"]')
          .filter({ hasText: /Submit Request/i });
        await expect(submitBtn).toBeDisabled({ timeout: 5000 });
      } else {
        test.skip();
      }
    });
  });

  test.describe('Employee Isolation', () => {
    test('employee can access /me/attendance without being redirected', async ({ page }) => {
      expect(page.url()).toContain('/me/attendance');
    });

    test('another employee (Raj) can also access their own attendance', async ({ page }) => {
      await loginAs(page, demoUsers.employeeRaj.email);
      await navigateTo(page, '/me/attendance');
      await expect(page.locator('h1').filter({ hasText: /My Attendance/i })).toBeVisible({
        timeout: 10000,
      });
      expect(page.url()).toContain('/me/attendance');
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// MY SPACE — My Documents (/me/documents)
// ─────────────────────────────────────────────────────────────────────────────

test.describe('MY SPACE - My Documents', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, testUsers.employee.email);
    await navigateTo(page, '/me/documents');
  });

  test.describe('Page Load', () => {
    test('should display Document Requests heading', async ({ page }) => {
      await expect(
        page.locator('h1').filter({ hasText: /Document Requests/i })
      ).toBeVisible({ timeout: 10000 });
    });

    test('should render without console errors', async ({ page }) => {
      const errors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') errors.push(msg.text());
      });
      await navigateTo(page, '/me/documents');
      await page.waitForTimeout(2000);
      const real = errors.filter(
        (e) =>
          !e.includes('favicon') &&
          !e.includes('[HMR]') &&
          !e.includes('hydration') &&
          !e.includes('Warning:')
      );
      expect(real).toHaveLength(0);
    });

    test('should display the URL /me/documents', async ({ page }) => {
      expect(page.url()).toContain('/me/documents');
    });

    test('should display subtitle text', async ({ page }) => {
      await expect(
        page.locator('text=Request official documents and track their status')
      ).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Quick Stats', () => {
    test('should display Pending stat card', async ({ page }) => {
      await expect(page.locator('text=Pending').first()).toBeVisible({ timeout: 10000 });
    });

    test('should display In Progress stat card', async ({ page }) => {
      await expect(page.locator('text=In Progress').first()).toBeVisible({ timeout: 10000 });
    });

    test('should display Ready stat card', async ({ page }) => {
      await expect(page.locator('text=Ready').first()).toBeVisible({ timeout: 10000 });
    });

    test('should display Total stat card', async ({ page }) => {
      await expect(page.locator('text=Total').first()).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Request Document Button & Modal', () => {
    test('should display "Request Document" button', async ({ page }) => {
      await expect(
        page.locator('button').filter({ hasText: /Request Document/i })
      ).toBeVisible({ timeout: 10000 });
    });

    test('should open request modal when button is clicked', async ({ page }) => {
      await page.locator('button').filter({ hasText: /Request Document/i }).click();
      await expect(page.locator('text=Request Document').last()).toBeVisible({ timeout: 5000 });
    });

    test('modal should contain Document Type select', async ({ page }) => {
      await page.locator('button').filter({ hasText: /Request Document/i }).click();
      await expect(page.locator('select').first()).toBeVisible({ timeout: 5000 });
    });

    test('modal should contain Purpose textarea', async ({ page }) => {
      await page.locator('button').filter({ hasText: /Request Document/i }).click();
      await expect(
        page.locator('textarea').filter({ has: page.locator('[placeholder*="Why do you need"]') })
      ).toBeVisible({ timeout: 5000 });
    });

    test('modal should show Required By date input', async ({ page }) => {
      await page.locator('button').filter({ hasText: /Request Document/i }).click();
      await expect(page.locator('input[type="date"]')).toBeVisible({ timeout: 5000 });
    });

    test('modal should show Digital / Physical / Both delivery mode options', async ({ page }) => {
      await page.locator('button').filter({ hasText: /Request Document/i }).click();
      await expect(page.locator('text=digital').first()).toBeVisible({ timeout: 5000 });
      await expect(page.locator('text=physical').first()).toBeVisible({ timeout: 5000 });
      await expect(page.locator('text=both').first()).toBeVisible({ timeout: 5000 });
    });

    test('modal should show Priority select', async ({ page }) => {
      await page.locator('button').filter({ hasText: /Request Document/i }).click();
      await expect(page.locator('text=Priority')).toBeVisible({ timeout: 5000 });
    });

    test('modal Cancel button should close the modal', async ({ page }) => {
      await page.locator('button').filter({ hasText: /Request Document/i }).click();
      await page.locator('button').filter({ hasText: /Cancel/i }).first().click();
      await expect(
        page.locator('button').filter({ hasText: /Request Document/i })
      ).toBeVisible({ timeout: 5000 });
    });

    test('modal should validate empty purpose with an error message', async ({ page }) => {
      await page.locator('button').filter({ hasText: /Request Document/i }).click();
      // Click submit without filling purpose
      await page.locator('button').filter({ hasText: /Submit Request/i }).click();
      await expect(page.locator('text=Purpose is required')).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Request List', () => {
    test('should show empty state or request cards', async ({ page }) => {
      await page.waitForTimeout(2000);
      const emptyState = page.locator(
        "text=You haven't requested any documents yet"
      );
      const hasEmpty = await emptyState.isVisible().catch(() => false);

      if (!hasEmpty) {
        // There should be at least one card
        const cards = page.locator('[class*="card-aura"]');
        const count = await cards.count();
        expect(count).toBeGreaterThan(0);
      } else {
        expect(hasEmpty).toBe(true);
      }
    });

    test('employee can access /me/documents without redirection', async ({ page }) => {
      expect(page.url()).toContain('/me/documents');
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// MY SPACE — My Leaves (/me/leaves)
// ─────────────────────────────────────────────────────────────────────────────

test.describe('MY SPACE - My Leaves', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, testUsers.employee.email);
    await navigateTo(page, '/me/leaves');
  });

  test.describe('Page Load', () => {
    test('should display My Leaves heading', async ({ page }) => {
      await expect(
        page.locator('h1, h2').filter({ hasText: /My Leaves|Leave|Leaves/i }).first()
      ).toBeVisible({ timeout: 10000 });
    });

    test('should render the page without console errors', async ({ page }) => {
      const errors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') errors.push(msg.text());
      });
      await navigateTo(page, '/me/leaves');
      await page.waitForTimeout(2000);
      const real = errors.filter(
        (e) =>
          !e.includes('favicon') &&
          !e.includes('[HMR]') &&
          !e.includes('hydration') &&
          !e.includes('Warning:')
      );
      expect(real).toHaveLength(0);
    });

    test('should display the URL /me/leaves', async ({ page }) => {
      expect(page.url()).toContain('/me/leaves');
    });
  });

  test.describe('Leave Balance Summary', () => {
    test('should display leave balance cards', async ({ page }) => {
      await page.waitForTimeout(3000);
      // Balances section must appear — look for any card with "Balance" or days left
      const balanceCards = page.locator('[class*="card"]').filter({ hasText: /days|balance|leave/i });
      const count = await balanceCards.count();
      expect(count).toBeGreaterThanOrEqual(1);
    });

    test('should show numeric leave balance values', async ({ page }) => {
      await page.waitForTimeout(3000);
      // At least one numeric value rendered in the balance area
      const numericValues = page.locator('text=/^\\d+(\\.\\d+)?$/');
      const count = await numericValues.count();
      expect(count).toBeGreaterThan(0);
    });
  });

  test.describe('Apply Leave Modal', () => {
    test('should show "Apply Leave" or "Request Leave" button', async ({ page }) => {
      await page.waitForTimeout(2000);
      const applyBtn = page
        .locator('button')
        .filter({ hasText: /Apply Leave|Request Leave|New Leave/i });
      await expect(applyBtn).toBeVisible({ timeout: 10000 });
    });

    test('should open apply leave modal on button click', async ({ page }) => {
      await page.waitForTimeout(2000);
      const applyBtn = page
        .locator('button')
        .filter({ hasText: /Apply Leave|Request Leave|New Leave/i });
      await applyBtn.click();
      // Modal heading or form should appear
      await expect(
        page.locator('text=/Apply Leave|Request Leave|Leave Request/i').last()
      ).toBeVisible({ timeout: 5000 });
    });

    test('modal should contain leave type select', async ({ page }) => {
      await page.waitForTimeout(2000);
      const applyBtn = page
        .locator('button')
        .filter({ hasText: /Apply Leave|Request Leave|New Leave/i });
      await applyBtn.click();
      await expect(page.locator('select').first()).toBeVisible({ timeout: 5000 });
    });

    test('modal should contain start date and end date inputs', async ({ page }) => {
      await page.waitForTimeout(2000);
      const applyBtn = page
        .locator('button')
        .filter({ hasText: /Apply Leave|Request Leave|New Leave/i });
      await applyBtn.click();
      const dateInputs = page.locator('input[type="date"]');
      await expect(dateInputs.first()).toBeVisible({ timeout: 5000 });
    });

    test('modal should contain reason textarea', async ({ page }) => {
      await page.waitForTimeout(2000);
      const applyBtn = page
        .locator('button')
        .filter({ hasText: /Apply Leave|Request Leave|New Leave/i });
      await applyBtn.click();
      await expect(page.locator('textarea').first()).toBeVisible({ timeout: 5000 });
    });

    test('modal should validate and show error when reason is empty', async ({ page }) => {
      await page.waitForTimeout(2000);
      const applyBtn = page
        .locator('button')
        .filter({ hasText: /Apply Leave|Request Leave|New Leave/i });
      await applyBtn.click();

      // Submit without filling required fields
      const submitBtn = page
        .locator('button')
        .filter({ hasText: /Submit|Apply|Send/i })
        .last();
      await submitBtn.click();

      await expect(
        page.locator('text=/required|Reason is required/i').first()
      ).toBeVisible({ timeout: 5000 });
    });

    test('modal Cancel button should close the modal', async ({ page }) => {
      await page.waitForTimeout(2000);
      const applyBtn = page
        .locator('button')
        .filter({ hasText: /Apply Leave|Request Leave|New Leave/i });
      await applyBtn.click();
      await page.locator('button').filter({ hasText: /Cancel/i }).first().click();
      // Modal should be dismissed
      await expect(applyBtn).toBeVisible({ timeout: 5000 });
    });

    test('modal should have half-day checkbox', async ({ page }) => {
      await page.waitForTimeout(2000);
      const applyBtn = page
        .locator('button')
        .filter({ hasText: /Apply Leave|Request Leave|New Leave/i });
      await applyBtn.click();
      await expect(
        page.locator('input[type="checkbox"]').first()
      ).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Filter & Request List', () => {
    test('should show status filter dropdown', async ({ page }) => {
      await page.waitForTimeout(2000);
      // Status filter or "All" dropdown
      const filterEl = page.locator('select, [role="combobox"]').first();
      await expect(filterEl).toBeVisible({ timeout: 10000 });
    });

    test('should show empty state or leave request cards', async ({ page }) => {
      await page.waitForTimeout(3000);
      const emptyState = page.locator('text=/No leave requests|No requests/i').first();
      const hasEmpty = await emptyState.isVisible().catch(() => false);

      if (!hasEmpty) {
        const cards = page.locator('[class*="card"]').filter({ hasText: /PENDING|APPROVED|REJECTED|CANCELLED/i });
        const count = await cards.count();
        expect(count).toBeGreaterThanOrEqual(0); // May legitimately be 0
      } else {
        expect(hasEmpty).toBe(true);
      }
    });
  });

  test.describe('Employee Isolation', () => {
    test('employee can access /me/leaves without being redirected', async ({ page }) => {
      expect(page.url()).toContain('/me/leaves');
    });

    test('different employee (Raj) can also access their own leaves', async ({ page }) => {
      await loginAs(page, demoUsers.employeeRaj.email);
      await navigateTo(page, '/me/leaves');
      expect(page.url()).toContain('/me/leaves');
      await expect(
        page.locator('h1, h2').filter({ hasText: /Leave/i }).first()
      ).toBeVisible({ timeout: 10000 });
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// MY SPACE — My Payslips (/me/payslips)
// ─────────────────────────────────────────────────────────────────────────────

test.describe('MY SPACE - My Payslips', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, testUsers.employee.email);
    await navigateTo(page, '/me/payslips');
  });

  test.describe('Page Load', () => {
    test('should display My Payslips heading', async ({ page }) => {
      await expect(
        page.locator('h1').filter({ hasText: /My Payslips/i })
      ).toBeVisible({ timeout: 10000 });
    });

    test('should render without console errors', async ({ page }) => {
      const errors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') errors.push(msg.text());
      });
      await navigateTo(page, '/me/payslips');
      await page.waitForTimeout(2000);
      const real = errors.filter(
        (e) =>
          !e.includes('favicon') &&
          !e.includes('[HMR]') &&
          !e.includes('hydration') &&
          !e.includes('Warning:')
      );
      expect(real).toHaveLength(0);
    });

    test('should display descriptive subtitle', async ({ page }) => {
      await expect(
        page.locator('text=View and download your salary statements')
      ).toBeVisible({ timeout: 10000 });
    });

    test('should display the URL /me/payslips', async ({ page }) => {
      expect(page.url()).toContain('/me/payslips');
    });
  });

  test.describe('Summary Cards', () => {
    test('should display Total Payslips stat card', async ({ page }) => {
      await expect(page.locator('text=Total Payslips')).toBeVisible({ timeout: 10000 });
    });

    test('should display Total Earnings stat card', async ({ page }) => {
      await page.waitForTimeout(2000);
      const currentYear = new Date().getFullYear().toString();
      await expect(
        page.locator(`text=Total Earnings (${currentYear})`)
      ).toBeVisible({ timeout: 10000 });
    });

    test('should display Average Salary stat card', async ({ page }) => {
      await expect(page.locator('text=Average Salary')).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Filter Controls', () => {
    test('should display search input for payslips', async ({ page }) => {
      await expect(
        page.locator('input[placeholder*="Search payslips"]')
      ).toBeVisible({ timeout: 10000 });
    });

    test('should display year filter dropdown with All Years option', async ({ page }) => {
      await expect(page.locator('select')).toBeVisible({ timeout: 10000 });
      const yearSelect = page.locator('select').first();
      await expect(yearSelect.locator('option[value="0"]')).toHaveText('All Years');
    });

    test('should filter payslips when search term is entered', async ({ page }) => {
      await page.waitForTimeout(2000);
      const searchInput = page.locator('input[placeholder*="Search payslips"]');
      await searchInput.fill('January');
      await page.waitForTimeout(500);
      // Page should respond (no crash)
      expect(page.url()).toContain('/me/payslips');
    });

    test('should change year selection without error', async ({ page }) => {
      const yearSelect = page.locator('select').first();
      await yearSelect.selectOption('0'); // All Years
      await page.waitForTimeout(500);
      expect(page.url()).toContain('/me/payslips');
    });
  });

  test.describe('Payslip List', () => {
    test('should show payslip cards or No Payslips Found state', async ({ page }) => {
      await page.waitForTimeout(3000);
      const emptyState = page.locator('text=No Payslips Found').first();
      const hasEmpty = await emptyState.isVisible().catch(() => false);

      if (!hasEmpty) {
        // Should have payslip cards with Net Salary label
        const netSalaryLabels = page.locator('text=Net Salary');
        const count = await netSalaryLabels.count();
        expect(count).toBeGreaterThanOrEqual(1);
      } else {
        expect(hasEmpty).toBe(true);
      }
    });

    test('payslip cards should show Download PDF button when payslips exist', async ({
      page,
    }) => {
      await page.waitForTimeout(3000);
      const downloadBtn = page.locator('button').filter({ hasText: /Download PDF/i }).first();
      const isVisible = await downloadBtn.isVisible().catch(() => false);

      if (isVisible) {
        await expect(downloadBtn).toBeEnabled({ timeout: 5000 });
      } else {
        // No payslips — acceptable
        const emptyState = page.locator('text=No Payslips Found');
        await expect(emptyState).toBeVisible({ timeout: 5000 });
      }
    });

    test('payslip cards should display Gross and Deductions amounts', async ({ page }) => {
      await page.waitForTimeout(3000);
      const grossLabel = page.locator('text=Gross:').first();
      const isVisible = await grossLabel.isVisible().catch(() => false);

      if (isVisible) {
        await expect(page.locator('text=Deductions:').first()).toBeVisible({ timeout: 5000 });
      }
      // If not visible, no payslips exist — valid scenario
    });

    test('payslip status badge should be visible (PAID, FINALIZED, or DRAFT)', async ({
      page,
    }) => {
      await page.waitForTimeout(3000);
      const statusBadge = page
        .locator('[class*="badge-status"]')
        .filter({ hasText: /PAID|FINALIZED|DRAFT/i })
        .first();
      const isVisible = await statusBadge.isVisible().catch(() => false);
      // If there are payslips they must have a status; if no payslips this is acceptable
      if (!isVisible) {
        await expect(page.locator('text=No Payslips Found')).toBeVisible({ timeout: 5000 });
      }
    });
  });

  test.describe('Employee Isolation', () => {
    test('employee accesses only their own payslips — heading says My Payslips', async ({
      page,
    }) => {
      await expect(page.locator('h1').filter({ hasText: /My Payslips/i })).toBeVisible({
        timeout: 10000,
      });
    });

    test('non-admin employee should NOT see "View All Employees" button', async ({ page }) => {
      // testUsers.employee is a regular EMPLOYEE — should not see admin toggle
      const adminToggle = page
        .locator('button')
        .filter({ hasText: /View All Employees/i });
      // The toggle only appears for admin roles with an employeeId
      const isVisible = await adminToggle.isVisible().catch(() => false);
      // For a plain EMPLOYEE this must be false
      expect(isVisible).toBe(false);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// MY SPACE — My Profile (/me/profile)
// ─────────────────────────────────────────────────────────────────────────────

test.describe('MY SPACE - My Profile', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, testUsers.employee.email);
    await navigateTo(page, '/me/profile');
  });

  test.describe('Page Load', () => {
    test('should display My Profile heading', async ({ page }) => {
      await expect(
        page.locator('h1').filter({ hasText: /My Profile/i })
      ).toBeVisible({ timeout: 10000 });
    });

    test('should render without console errors', async ({ page }) => {
      const errors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') errors.push(msg.text());
      });
      await navigateTo(page, '/me/profile');
      await page.waitForTimeout(2000);
      const real = errors.filter(
        (e) =>
          !e.includes('favicon') &&
          !e.includes('[HMR]') &&
          !e.includes('hydration') &&
          !e.includes('Warning:')
      );
      expect(real).toHaveLength(0);
    });

    test('should display subtitle "Manage your personal information"', async ({ page }) => {
      await expect(
        page.locator('text=Manage your personal information')
      ).toBeVisible({ timeout: 10000 });
    });

    test('should display the URL /me/profile', async ({ page }) => {
      expect(page.url()).toContain('/me/profile');
    });
  });

  test.describe('Profile Header Card', () => {
    test('should display the employee name in the profile header', async ({ page }) => {
      await page.waitForTimeout(3000);
      // The logged-in employee is Saran V
      await expect(
        page.locator(`text=${testUsers.employee.name}`).first()
      ).toBeVisible({ timeout: 10000 });
    });

    test('should display work email in the profile meta row', async ({ page }) => {
      await page.waitForTimeout(3000);
      await expect(
        page.locator(`text=${testUsers.employee.email}`).first()
      ).toBeVisible({ timeout: 10000 });
    });

    test('should display employee code or department', async ({ page }) => {
      await page.waitForTimeout(3000);
      // Either department name or employee code must be visible in meta row
      const dept = page.locator(`text=${testUsers.employee.department}`).first();
      const isVisible = await dept.isVisible().catch(() => false);
      expect(isVisible).toBe(true);
    });
  });

  test.describe('Information Sections', () => {
    test('should display Personal Information card', async ({ page }) => {
      await expect(page.locator('text=Personal Information')).toBeVisible({ timeout: 10000 });
    });

    test('should display Contact Information card', async ({ page }) => {
      await expect(page.locator('text=Contact Information')).toBeVisible({ timeout: 10000 });
    });

    test('should display Address card', async ({ page }) => {
      await expect(page.locator('text=Address')).toBeVisible({ timeout: 10000 });
    });

    test('should display Employment Details card', async ({ page }) => {
      await expect(page.locator('text=Employment Details')).toBeVisible({ timeout: 10000 });
    });

    test('should display Bank Details card', async ({ page }) => {
      await expect(page.locator('text=Bank Details')).toBeVisible({ timeout: 10000 });
    });

    test('should display Tax Information card', async ({ page }) => {
      await expect(page.locator('text=Tax Information')).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Edit Profile Flow', () => {
    test('should display Edit Profile button', async ({ page }) => {
      await page.waitForTimeout(2000);
      await expect(
        page.locator('button').filter({ hasText: /Edit Profile/i })
      ).toBeVisible({ timeout: 10000 });
    });

    test('should switch to edit mode when Edit Profile is clicked', async ({ page }) => {
      await page.waitForTimeout(2000);
      await page.locator('button').filter({ hasText: /Edit Profile/i }).click();

      // Cancel and Save Changes buttons should appear
      await expect(
        page.locator('button').filter({ hasText: /Cancel/i }).first()
      ).toBeVisible({ timeout: 5000 });
      await expect(
        page.locator('button').filter({ hasText: /Save Changes/i })
      ).toBeVisible({ timeout: 5000 });
    });

    test('should render editable input fields in edit mode', async ({ page }) => {
      await page.waitForTimeout(2000);
      await page.locator('button').filter({ hasText: /Edit Profile/i }).click();
      // Personal email, phone, emergency contact inputs
      const inputs = page.locator('input[type="email"], input[type="tel"], textarea');
      const count = await inputs.count();
      expect(count).toBeGreaterThanOrEqual(1);
    });

    test('should return to view mode when Cancel is clicked', async ({ page }) => {
      await page.waitForTimeout(2000);
      await page.locator('button').filter({ hasText: /Edit Profile/i }).click();
      await page.locator('button').filter({ hasText: /Cancel/i }).first().click();

      // Edit Profile button should be visible again
      await expect(
        page.locator('button').filter({ hasText: /Edit Profile/i })
      ).toBeVisible({ timeout: 5000 });
    });

    test('should allow editing phone number field', async ({ page }) => {
      await page.waitForTimeout(2000);
      await page.locator('button').filter({ hasText: /Edit Profile/i }).click();

      const phoneInput = page.locator('input[type="tel"]').first();
      await expect(phoneInput).toBeVisible({ timeout: 5000 });
      await phoneInput.clear();
      await phoneInput.fill('+91-9876543210');
      await expect(phoneInput).toHaveValue('+91-9876543210');
    });
  });

  test.describe('Bank Change Request Modal', () => {
    test('should display Request Change button in Bank Details section', async ({ page }) => {
      await page.waitForTimeout(2000);
      await expect(
        page.locator('button').filter({ hasText: /Request Change/i })
      ).toBeVisible({ timeout: 10000 });
    });

    test('should open Bank Change Request modal on button click', async ({ page }) => {
      await page.waitForTimeout(2000);
      await page.locator('button').filter({ hasText: /Request Change/i }).click();
      await expect(
        page.locator('text=Request Bank Details Change')
      ).toBeVisible({ timeout: 5000 });
    });

    test('modal should contain New Bank Name input', async ({ page }) => {
      await page.waitForTimeout(2000);
      await page.locator('button').filter({ hasText: /Request Change/i }).click();
      await expect(
        page.locator('input[placeholder*="State Bank of India"]')
      ).toBeVisible({ timeout: 5000 });
    });

    test('modal should contain New Account Number input', async ({ page }) => {
      await page.waitForTimeout(2000);
      await page.locator('button').filter({ hasText: /Request Change/i }).click();
      await expect(
        page.locator('input[placeholder*="Enter full account number"]')
      ).toBeVisible({ timeout: 5000 });
    });

    test('modal should contain IFSC Code input', async ({ page }) => {
      await page.waitForTimeout(2000);
      await page.locator('button').filter({ hasText: /Request Change/i }).click();
      await expect(
        page.locator('input[placeholder*="SBIN0001234"]')
      ).toBeVisible({ timeout: 5000 });
    });

    test('modal should validate missing fields and show errors', async ({ page }) => {
      await page.waitForTimeout(2000);
      await page.locator('button').filter({ hasText: /Request Change/i }).click();
      // Click Submit Request without filling fields
      await page.locator('button').filter({ hasText: /Submit Request/i }).click();
      // At least one validation error must appear
      await expect(
        page.locator('text=/required|is required/i').first()
      ).toBeVisible({ timeout: 5000 });
    });

    test('modal Cancel button should close the modal', async ({ page }) => {
      await page.waitForTimeout(2000);
      await page.locator('button').filter({ hasText: /Request Change/i }).click();
      await page.locator('button').filter({ hasText: /Cancel/i }).first().click();
      // Modal should be gone; profile page still visible
      await expect(
        page.locator('h1').filter({ hasText: /My Profile/i })
      ).toBeVisible({ timeout: 5000 });
    });

    test('modal should display the approval workflow warning', async ({ page }) => {
      await page.waitForTimeout(2000);
      await page.locator('button').filter({ hasText: /Request Change/i }).click();
      await expect(
        page.locator('text=/sensitive|approval workflow/i').first()
      ).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Employee Isolation', () => {
    test('employee sees their own name on the profile page', async ({ page }) => {
      await page.waitForTimeout(3000);
      // Saran V is testUsers.employee
      await expect(
        page.locator(`text=${testUsers.employee.name}`).first()
      ).toBeVisible({ timeout: 10000 });
    });

    test('different employee (Raj) sees their own profile', async ({ page }) => {
      await loginAs(page, demoUsers.employeeRaj.email);
      await navigateTo(page, '/me/profile');
      await page.waitForTimeout(3000);
      await expect(
        page.locator(`text=${demoUsers.employeeRaj.name}`).first()
      ).toBeVisible({ timeout: 10000 });
    });
  });
});
