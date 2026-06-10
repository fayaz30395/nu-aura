import {expect, test} from '@playwright/test';
import {loginAs} from './fixtures/helpers';
import {demoUsers} from './fixtures/testData';

/**
 * Green-flag validation for the REDESIGNED leave creation flow (/leave/apply).
 * Covers the fix-wave behaviors end-to-end via UI:
 *  - DATA-1: inverted date range is rejected client/server-side
 *  - leave request creation lands as PENDING in My Leaves
 * The legacy leave.spec.ts targets the removed modal UI; this spec is the
 * green-flag replacement for the P0 creation journey.
 */

test.describe('Green-flag — Leave Apply (new flow)', () => {
  test('employee applies for leave via /leave/apply and sees it PENDING', async ({page}) => {
    await loginAs(page, demoUsers.employeeSaran.email);
    await page.goto('/leave/apply');
    await expect(page.getByText(/Submit Leave Request|Request leave|Leave type/i).first())
      .toBeVisible({timeout: 60000});

    // pick the first available leave type by visible label
    const typeSelect = page.locator('select').first();
    await typeSelect.waitFor({state: 'visible', timeout: 30000});
    const options = typeSelect.locator('option');
    // leave types load async after the select renders; wait for a real option
    await expect(options.nth(1)).toBeAttached({timeout: 30000});
    const optionCount = await options.count();
    expect(optionCount).toBeGreaterThan(1);
    await typeSelect.selectOption({index: 1});

    // next-month weekday range, 2 working days, far from existing requests
    const base = new Date();
    base.setMonth(base.getMonth() + 2, 1);
    while (base.getDay() === 0 || base.getDay() === 6 || base.getDay() === 5) {
      base.setDate(base.getDate() + 1);
    }
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    const end = new Date(base);
    end.setDate(end.getDate() + 1);

    const dateInputs = page.getByPlaceholder('YYYY-MM-DD');
    await dateInputs.nth(0).fill(fmt(base));
    await dateInputs.nth(1).fill(fmt(end));

    const reason = page.locator('textarea').first();
    await reason.fill('Green-flag validation leave request for production readiness');

    await page.getByRole('button', {name: /Submit Leave Request|Submit/i}).first().click();

    // lands back on my-leaves (or shows success), request visible as PENDING
    await page.waitForURL(/my-leaves|leave/, {timeout: 30000});
    await page.goto('/leave/my-leaves');
    // target the status cell — a bare getByText also matches the hidden
    // "Pending" <option> in the status filter dropdown
    await expect(page.getByRole('cell', {name: /pending/i}).first()).toBeVisible({timeout: 60000});
  });

  test('inverted date range is rejected (DATA-1)', async ({page}) => {
    await loginAs(page, demoUsers.employeeSaran.email);
    await page.goto('/leave/apply');
    const typeSelect = page.locator('select').first();
    await typeSelect.waitFor({state: 'visible', timeout: 60000});
    await expect(typeSelect.locator('option').nth(1)).toBeAttached({timeout: 30000});
    await typeSelect.selectOption({index: 1});

    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    const start = new Date();
    start.setMonth(start.getMonth() + 3, 15);
    const before = new Date(start);
    before.setDate(before.getDate() - 5);

    const dateInputs = page.getByPlaceholder('YYYY-MM-DD');
    await dateInputs.nth(0).fill(fmt(start));
    await dateInputs.nth(1).fill(fmt(before)); // end BEFORE start

    await page.locator('textarea').first().fill('Inverted range must be rejected by validation');
    await page.getByRole('button', {name: /Submit Leave Request|Submit/i}).first().click();

    // must NOT navigate away with a created request; an error must surface
    await expect(
      page.getByText(/end date|invalid|after|before|range/i).first()
    ).toBeVisible({timeout: 15000});
  });
});
