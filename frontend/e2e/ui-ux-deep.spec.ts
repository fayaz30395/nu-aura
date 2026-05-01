import {expect, test} from '@playwright/test';
import {loginAs, navigateTo} from './fixtures/helpers';
import {demoUsers} from './fixtures/testData';

/**
 * Deep UI/UX Validation Tests — NU-AURA
 *
 * Covers:
 *   UI-01  Dark mode toggle & persistence
 *   UI-02  Dark mode component readability (invisible text + purple palette check)
 *   UI-03  Responsive layout — Desktop 1280×900
 *   UI-04  Responsive layout — Tablet 768×1024
 *   UI-05  Responsive layout — Mobile 375×812
 *   UI-06  Loading states — skeleton validation
 *   UI-07  Empty state components
 *   UI-08  Error state handling (API 500)
 *   UI-09  Global search (⌘K / Ctrl+K)
 *   UI-10  Notifications bell
 *   UI-11  Sidebar collapse/expand
 *   UI-12  App switcher (waffle grid)
 *   UI-13  Breadcrumbs validation
 *   UI-14  Focus & accessibility — tab order
 *   UI-15  Page title updates on navigation
 *
 * Most UI issues are logged as console.warn (observable bugs), not hard failures.
 * CRITICAL checks (horizontal scroll, blank pages, invisible text) use hard assertions.
 *
 * Run: npx playwright test e2e/ui-ux-deep.spec.ts --project=chromium --workers=1
 */

test.setTimeout(90000);

// ─── UI-01: Dark Mode Toggle & Persistence ────────────────────────────────────

test('UI-01: dark mode toggle and persistence', async ({page}) => {
  await loginAs(page, demoUsers.superAdmin.email);
  await navigateTo(page, '/dashboard');
  await page.waitForTimeout(1000);

  const toggleSelectors = [
    '[data-testid="dark-mode-toggle"]',
    'button[aria-label*="dark" i]',
    'button[aria-label*="theme" i]',
    'button[aria-label*="light" i]',
    'button:has([class*="moon"])',
    'button:has([class*="sun"])',
    'button[aria-label*="mode" i]',
  ];

  let toggleBtn: ReturnType<typeof page.locator> | null = null;
  for (const sel of toggleSelectors) {
    const visible = await page
      .locator(sel)
      .first()
      .isVisible({timeout: 2000})
      .catch(() => false);
    if (visible) {
      toggleBtn = page.locator(sel).first();
      break;
    }
  }

  if (!toggleBtn) {
    console.warn('UI-01: No dark mode toggle found — skipping dark mode tests');
    return;
  }

  // Check initial mode
  const initiallyDark = await page.evaluate(
    () => document.documentElement.classList.contains('dark')
  );
  console.log('UI-01: initial dark mode:', initiallyDark);

  // Toggle to dark (or away from current)
  await toggleBtn.click();
  await page.waitForTimeout(600);

  const nowDark = await page.evaluate(
    () => document.documentElement.classList.contains('dark')
  );
  console.log('UI-01: after toggle dark mode:', nowDark);

  if (nowDark) {
    // Verify dark bg applied
    const bgIsDark = await page.evaluate(() => {
      const bg = window.getComputedStyle(document.body).backgroundColor;
      // typical dark backgrounds have low RGB values
      const match = bg.match(/\d+/g);
      if (!match) return false;
      const [r, g, b] = match.map(Number);
      return r < 100 && g < 100 && b < 100;
    });
    if (!bgIsDark) {
      console.warn('UI-01: dark mode class applied but body background still appears light');
    }
  }

  // Navigate away — verify persistence
  await navigateTo(page, '/employees');
  await page.waitForTimeout(500);

  const persistsAfterNav = await page.evaluate(
    () => document.documentElement.classList.contains('dark')
  );
  if (nowDark && !persistsAfterNav) {
    console.warn('UI-01: dark mode did NOT persist after navigation to /employees');
  } else {
    console.log('UI-01: dark mode persistence after nav:', persistsAfterNav);
  }

  // Reload — verify persistence
  await page.reload();
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1000);

  const persistsAfterReload = await page.evaluate(
    () => document.documentElement.classList.contains('dark')
  );
  if (nowDark && !persistsAfterReload) {
    console.warn('UI-01: dark mode did NOT persist after page reload');
  } else {
    console.log('UI-01: dark mode persistence after reload:', persistsAfterReload);
  }

  // Check localStorage for theme preference
  const storedTheme = await page.evaluate(() => {
    return (
      localStorage.getItem('theme') ||
      localStorage.getItem('color-scheme') ||
      localStorage.getItem('nu-theme') ||
      localStorage.getItem('mantine-color-scheme')
    );
  });
  console.log('UI-01: stored theme preference:', storedTheme);

  // Log CSS variable for background in current mode
  await page.evaluate(() => {
    const style = getComputedStyle(document.documentElement);
    const bg =
      style.getPropertyValue('--background') ||
      style.getPropertyValue('--color-background') ||
      style.backgroundColor;
    const isDark = document.documentElement.classList.contains('dark');
    console.log('bg_in_dark:', isDark, bg.trim());
  });

  // Toggle back to original
  const afterReloadBtn = page.locator(toggleSelectors.join(', ')).first();
  if (await afterReloadBtn.isVisible({timeout: 3000}).catch(() => false)) {
    await afterReloadBtn.click();
    await page.waitForTimeout(500);
    const backToOriginal = await page.evaluate(
      () => document.documentElement.classList.contains('dark')
    );
    console.log('UI-01: restored to dark=', backToOriginal, '(expected:', initiallyDark, ')');
  }
});

// ─── UI-02: Dark Mode — Component Readability ─────────────────────────────────

test('UI-02: dark mode component readability — no invisible text, no purple', async ({page}) => {
  await loginAs(page, demoUsers.superAdmin.email);

  // Enable dark mode if a toggle exists
  await navigateTo(page, '/dashboard');
  await page.waitForTimeout(800);

  const toggleSelectors = [
    '[data-testid="dark-mode-toggle"]',
    'button[aria-label*="dark" i]',
    'button[aria-label*="theme" i]',
    'button[aria-label*="light" i]',
    'button:has([class*="moon"])',
    'button:has([class*="sun"])',
    'button[aria-label*="mode" i]',
  ];

  let darkModeEnabled = false;
  for (const sel of toggleSelectors) {
    const visible = await page
      .locator(sel)
      .first()
      .isVisible({timeout: 2000})
      .catch(() => false);
    if (visible) {
      const wasAlreadyDark = await page.evaluate(() =>
        document.documentElement.classList.contains('dark')
      );
      if (!wasAlreadyDark) {
        await page.locator(sel).first().click();
        await page.waitForTimeout(500);
      }
      darkModeEnabled = await page.evaluate(() =>
        document.documentElement.classList.contains('dark')
      );
      break;
    }
  }

  if (!darkModeEnabled) {
    console.warn('UI-02: dark mode not active — skipping readability check');
    return;
  }

  await navigateTo(page, '/employees');
  await page.waitForTimeout(2000);

  // Check for invisible text (same color as background)
  const sameColorCount = await page.evaluate(() => {
    const elements = document.querySelectorAll('p, span, td, th, h1, h2, h3, a, label, button');
    let count = 0;
    elements.forEach((el) => {
      const style = getComputedStyle(el as Element);
      const color = style.color;
      const bg = style.backgroundColor;
      if (
        color !== 'rgba(0, 0, 0, 0)' &&
        bg !== 'rgba(0, 0, 0, 0)' &&
        color === bg
      ) {
        count++;
        console.warn(
          'INVISIBLE_TEXT:',
          (el as Element).tagName,
          (el as Element).textContent?.trim().slice(0, 20)
        );
      }
      if (
        color === 'rgb(255, 255, 255)' &&
        (bg === 'rgb(255, 255, 255)' || bg === 'rgba(255, 255, 255, 1)')
      ) {
        count++;
        console.warn('WHITE_ON_WHITE:', (el as Element).tagName);
      }
    });
    console.log('SAME_COLOR_COUNT:' + count);
    return count;
  });

  // CRITICAL: no invisible text in dark mode
  expect(sameColorCount).toBe(0);

  // Check for hardcoded purple (migration to sky palette should be complete)
  const purpleCount = await page.evaluate(() => {
    const allEls = document.querySelectorAll('*');
    let count = 0;
    allEls.forEach((el) => {
      const style = getComputedStyle(el as Element);
      // Purple: roughly rgb(88, 58, 168) → check bg, color, border
      for (const prop of ['backgroundColor', 'color', 'borderColor']) {
        const val = style[prop as 'backgroundColor'];
        if (
          val &&
          val.includes('88') &&
          val.includes('58') &&
          val.includes('168')
        ) {
          count++;
          break;
        }
      }
    });
    console.log('PURPLE_ELEMENTS:' + count);
    return count;
  });

  if (purpleCount > 0) {
    console.warn(
      `UI-02: ${purpleCount} element(s) still use purple — sky palette migration incomplete`
    );
  }
  // Log as warn — not a hard fail (palette migration may be in progress)
});

// ─── UI-03: Responsive — Desktop 1280×900 ────────────────────────────────────

test('UI-03: responsive layout — desktop 1280x900', async ({page}) => {
  await page.setViewportSize({width: 1280, height: 900});
  await loginAs(page, demoUsers.superAdmin.email);
  await navigateTo(page, '/employees');
  await page.waitForTimeout(2000);

  // No horizontal scrollbar
  const scrollInfo = await page.evaluate(() => {
    return {
      scrollWidth: document.body.scrollWidth,
      innerWidth: window.innerWidth,
      overflow: document.body.scrollWidth > window.innerWidth,
    };
  });
  console.log(
    `UI-03: scrollWidth=${scrollInfo.scrollWidth} innerWidth=${scrollInfo.innerWidth} overflow=${scrollInfo.overflow}`
  );
  expect(scrollInfo.overflow).toBe(false);

  // Sidebar visible at desktop width
  const sidebarVisible = await page
    .locator('nav[class*="sidebar" i], aside, [class*="Sidebar"], [data-testid="sidebar"]')
    .first()
    .isVisible()
    .catch(() => false);
  console.log('UI-03: sidebar visible at desktop:', sidebarVisible);

  // Table or content renders
  const hasTable = await page.locator('table').first().isVisible().catch(() => false);
  const hasCard = await page
    .locator('[class*="card"], [class*="Card"]')
    .first()
    .isVisible()
    .catch(() => false);
  console.log('UI-03: table visible:', hasTable, 'card visible:', hasCard);

  // Page body has content
  const bodyLen = await page.evaluate(() => document.body.innerText.length);
  expect(bodyLen).toBeGreaterThan(100);
});

// ─── UI-04: Responsive — Tablet 768×1024 ─────────────────────────────────────

test('UI-04: responsive layout — tablet 768x1024', async ({page}) => {
  await loginAs(page, demoUsers.superAdmin.email);
  await page.setViewportSize({width: 768, height: 1024});
  await navigateTo(page, '/employees');
  await page.waitForTimeout(2000);

  // No horizontal scrollbar on body
  const scrollInfo = await page.evaluate(() => ({
    scrollWidth: document.body.scrollWidth,
    innerWidth: window.innerWidth,
    overflow: document.body.scrollWidth > window.innerWidth,
  }));
  console.log(
    `UI-04: tablet scrollWidth=${scrollInfo.scrollWidth} innerWidth=${scrollInfo.innerWidth}`
  );
  if (scrollInfo.overflow) {
    console.warn('UI-04: horizontal overflow on tablet 768px viewport');
  }

  // Sidebar state at tablet width
  const sidebarVisible = await page
    .locator('nav[class*="sidebar" i], aside, [class*="Sidebar"]')
    .first()
    .isVisible()
    .catch(() => false);
  const hamburgerVisible = await page
    .locator(
      '[class*="hamburger"], [class*="menu-toggle"], button[aria-label*="menu" i]'
    )
    .first()
    .isVisible()
    .catch(() => false);

  if (!sidebarVisible) {
    console.log('UI-04: sidebar hidden at tablet (correct behaviour)');
  } else {
    console.log('UI-04: sidebar still visible at tablet');
  }
  console.log('UI-04: hamburger visible:', hamburgerVisible);

  // Main content must be accessible
  const mainVisible = await page
    .locator('main, [role="main"], [class*="content"], [class*="Content"]')
    .first()
    .isVisible()
    .catch(() => false);
  console.log('UI-04: main content visible:', mainVisible);
  expect(mainVisible || sidebarVisible).toBe(true);
});

// ─── UI-05: Responsive — Mobile 375×812 ──────────────────────────────────────

test('UI-05: responsive layout — mobile 375x812 (critical: no horizontal scroll)', async ({
  page,
}) => {
  await loginAs(page, demoUsers.superAdmin.email);
  await page.setViewportSize({width: 375, height: 812});
  await navigateTo(page, '/employees');
  await page.waitForTimeout(2000);

  // CRITICAL: no horizontal scroll
  const bodyScrollWidth = await page.evaluate(() => document.body.scrollWidth);
  const windowWidth = await page.evaluate(() => window.innerWidth);
  console.log(`UI-05: mobile bodyScrollWidth=${bodyScrollWidth} windowWidth=${windowWidth}`);

  // Hard assertion — horizontal overflow on mobile is a critical bug
  expect(bodyScrollWidth).toBeLessThanOrEqual(windowWidth);

  // Tap target size check
  const buttons = await page.$$('button:visible');
  let smallTargets = 0;
  for (const btn of buttons.slice(0, 20)) {
    const box = await btn.boundingBox();
    if (box && box.height < 40) {
      smallTargets++;
      console.warn(`UI-05: SMALL_TARGET button height=${box.height}`);
    }
  }
  console.log('UI-05: SMALL_TARGETS:', smallTargets);
  if (smallTargets > 3) {
    console.warn(
      `UI-05: ${smallTargets} button(s) have tap targets below 40px — accessibility concern`
    );
  }

  // Content must be readable (not clipped)
  const bodyText = await page.evaluate(() => document.body.innerText);
  expect(bodyText.length).toBeGreaterThan(50);
});

// ─── UI-06: Loading States — Skeleton Validation ─────────────────────────────

test('UI-06: loading states — skeleton / shimmer indicators present', async ({page}) => {
  await loginAs(page, demoUsers.superAdmin.email);

  for (const route of ['/employees', '/dashboard']) {
    let apiCallCount = 0;
    page.on('request', (req) => {
      if (req.url().includes('/api/')) apiCallCount++;
    });

    await page.goto(route);
    // Do NOT wait for domcontentloaded first — capture the loading state
    await page.waitForTimeout(300);

    const loadingIndicators = await page
      .locator(
        '[class*="skeleton" i], [class*="shimmer" i], ' +
          '[class*="loading" i], [class*="Loading"], [class*="animate-pulse"], ' +
          '[data-testid*="skeleton"]'
      )
      .count();
    console.log(`UI-06: route=${route} loading indicators found:`, loadingIndicators);

    // Wait for page to settle
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    // Content should load after skeleton
    const tableOrContent = await page
      .locator('table, [class*="card"], tr, [class*="row"]')
      .first()
      .isVisible()
      .catch(() => false);

    if (!tableOrContent) {
      console.warn(`UI-06: ${route} — no table/card visible after 3s wait`);
    }

    // Not a blank page
    const bodyText = await page.locator('body').textContent();
    expect((bodyText ?? '').length).toBeGreaterThan(100);

    console.log(`UI-06: route=${route} api calls=${apiCallCount}`);
    page.removeAllListeners('request');
  }
});

// ─── UI-07: Empty State Components ───────────────────────────────────────────

test('UI-07: empty state components shown when no data', async ({page}) => {
  await loginAs(page, demoUsers.superAdmin.email);

  for (const route of ['/announcements', '/helpdesk']) {
    await navigateTo(page, route);
    await page.waitForTimeout(2500);

    const hasContent = await page
      .locator('tr, [class*="card"], [class*="row"]')
      .first()
      .isVisible()
      .catch(() => false);

    if (!hasContent) {
      // No data — verify proper empty state (not blank)
      const hasEmptyState = await page
        .locator(
          '[class*="EmptyState" i], [class*="empty-state" i], [class*="empty" i], ' +
            'text=/No announcements/i, text=/nothing here/i, text=/Get started/i, ' +
            'text=/No results/i, text=/No data/i, text=/No tickets/i, ' +
            'text=/No helpdesk/i, text=/Create your first/i'
        )
        .first()
        .isVisible()
        .catch(() => false);

      if (!hasEmptyState) {
        // Check if the page has ANY meaningful text (not just blank white)
        const bodyText = await page.locator('body').textContent();
        const hasText = (bodyText ?? '').trim().length > 50;
        if (!hasText) {
          console.warn(`UI-07: ${route} shows blank page with no content and no empty state`);
        } else {
          console.warn(
            `UI-07: ${route} has content but no standard empty state component found`
          );
        }
      } else {
        console.log(`UI-07: ${route} — proper empty state found`);

        // Empty state should have an action button
        const hasActionBtn = await page
          .locator('button, a[href]')
          .first()
          .isVisible()
          .catch(() => false);
        console.log(`UI-07: ${route} — empty state has action button:`, hasActionBtn);
      }
    } else {
      console.log(`UI-07: ${route} has data — empty state test not applicable`);
    }
  }
});

// ─── UI-08: Error State Handling (API 500) ────────────────────────────────────

test('UI-08: graceful error handling — aborted API requests show no raw stack traces', async ({
  page,
}) => {
  await loginAs(page, demoUsers.superAdmin.email);

  // Abort employee API calls to simulate network failure / 500
  await page.route('**/api/v*/employees**', (route) => route.abort('failed'));

  await navigateTo(page, '/employees');
  await page.waitForTimeout(3000);

  // Page must NOT be blank
  const bodyText = await page.evaluate(() => document.body.innerText);
  expect(bodyText.length).toBeGreaterThan(20);

  // Must NOT show raw Java stack trace or server errors to users
  const hasStackTrace = await page
    .locator('text=/at com\\.hrms|NullPointerException|StackTrace|java\\.lang/i')
    .isVisible()
    .catch(() => false);
  expect(hasStackTrace).toBe(false);

  // Check if user-friendly error message is shown
  const hasErrorUI = await page
    .locator(
      'text=/error/i, text=/something went wrong/i, text=/unable to load/i, ' +
        'text=/failed to load/i, text=/try again/i, [class*="error" i]'
    )
    .first()
    .isVisible()
    .catch(() => false);

  if (!hasErrorUI) {
    console.warn(
      'UI-08: No user-friendly error message shown when API call fails — ' +
        'consider adding an error boundary or error state component'
    );
  } else {
    console.log('UI-08: user-friendly error message shown on API failure');
  }

  await page.unroute('**/api/v*/employees**');
});

// ─── UI-09: Global Search (⌘K / Ctrl+K) ──────────────────────────────────────

test('UI-09: global search via keyboard shortcut', async ({page}) => {
  await loginAs(page, demoUsers.superAdmin.email);
  await navigateTo(page, '/dashboard');
  await page.waitForTimeout(1000);

  // Try both Mac (Meta+k) and Linux/Windows (Control+k)
  for (const shortcut of ['Meta+k', 'Control+k']) {
    await page.keyboard.press(shortcut);
    await page.waitForTimeout(600);

    const searchPanelOpen = await page
      .locator(
        '[role="dialog"], [class*="command" i], [class*="search-panel" i], ' +
          '[class*="CommandPalette" i], input[placeholder*="search" i]:visible'
      )
      .first()
      .isVisible()
      .catch(() => false);

    if (searchPanelOpen) {
      console.log(`UI-09: global search opened via ${shortcut}`);

      // Type a search query
      await page.keyboard.type('employee');
      await page.waitForTimeout(1200);

      // Results should appear
      const resultCount = await page
        .locator('[class*="result" i], [class*="option" i], [role="option"]')
        .count();
      console.log('UI-09: SEARCH_RESULTS:', resultCount);

      // Escape closes the panel
      await page.keyboard.press('Escape');
      await page.waitForTimeout(400);

      const stillOpen = await page
        .locator('[role="dialog"]')
        .first()
        .isVisible()
        .catch(() => false);
      expect(stillOpen).toBe(false);

      return; // shortcut worked — stop trying
    }

    // Dismiss any accidentally opened dialog
    await page.keyboard.press('Escape');
  }

  console.warn(
    'UI-09: global search not found via Ctrl+K or Meta+K — may use a different trigger'
  );
});

// ─── UI-10: Notifications Bell ────────────────────────────────────────────────

test('UI-10: notifications bell opens panel with content or empty state', async ({page}) => {
  await loginAs(page, demoUsers.superAdmin.email);
  await navigateTo(page, '/dashboard');
  await page.waitForTimeout(1000);

  const bellSelectors = [
    '[data-testid="notifications-bell"]',
    'button[aria-label*="notification" i]',
    'button:has([class*="bell" i])',
    '[class*="notification"][class*="bell"]',
    'button[aria-label*="alert" i]',
  ];

  let bellBtn: ReturnType<typeof page.locator> | null = null;
  for (const sel of bellSelectors) {
    const visible = await page
      .locator(sel)
      .first()
      .isVisible({timeout: 3000})
      .catch(() => false);
    if (visible) {
      bellBtn = page.locator(sel).first();
      break;
    }
  }

  if (!bellBtn) {
    console.warn(
      'UI-10: notification bell not found with tested selectors — skipping bell tests'
    );
    return;
  }

  await bellBtn.click();
  await page.waitForTimeout(600);

  const panelOpen = await page
    .locator(
      '[class*="notification" i], [class*="Notification"], [class*="panel" i], ' +
        '[class*="popover" i], [class*="Popover"]'
    )
    .first()
    .isVisible()
    .catch(() => false);

  if (!panelOpen) {
    console.warn('UI-10: notifications panel did not open after bell click');
    return;
  }

  console.log('UI-10: notifications panel opened successfully');

  // Panel should have content or a proper empty state
  const hasContent = await page
    .locator(
      '[class*="notification-item" i], [class*="notif-item" i], ' +
        '[class*="empty" i], li, [class*="list-item" i]'
    )
    .first()
    .isVisible()
    .catch(() => false);

  if (!hasContent) {
    console.warn('UI-10: notifications panel opened but has no content or empty state');
  } else {
    console.log('UI-10: panel has content or empty state');
  }

  // Close by clicking outside
  await page.click('body', {position: {x: 10, y: 10}});
  await page.waitForTimeout(400);

  const panelClosed = !(await page
    .locator('[class*="notification"][class*="panel"]')
    .first()
    .isVisible()
    .catch(() => false));
  console.log('UI-10: panel closes on outside click:', panelClosed);
});

// ─── UI-11: Sidebar Collapse/Expand ──────────────────────────────────────────

test('UI-11: sidebar collapse and expand', async ({page}) => {
  await loginAs(page, demoUsers.superAdmin.email);
  await page.setViewportSize({width: 1280, height: 900});
  await navigateTo(page, '/dashboard');
  await page.waitForTimeout(1000);

  const sidebar = page
    .locator(
      'nav[class*="sidebar" i], aside, [class*="Sidebar"], [data-testid="sidebar"]'
    )
    .first();

  const sidebarVisible = await sidebar.isVisible().catch(() => false);
  if (!sidebarVisible) {
    console.warn('UI-11: sidebar not found at 1280px viewport — skipping collapse test');
    return;
  }

  const initialBox = await sidebar.boundingBox();
  console.log('UI-11: SIDEBAR_INITIAL_WIDTH:', initialBox?.width ?? 'unknown');

  const collapseSelectors = [
    'button[aria-label*="collapse" i]',
    'button[aria-label*="sidebar" i]',
    'button:has([class*="chevron-left" i])',
    'button:has([class*="arrow-left" i])',
    '[data-testid="sidebar-toggle"]',
  ];

  let collapseBtn: ReturnType<typeof page.locator> | null = null;
  for (const sel of collapseSelectors) {
    const visible = await page
      .locator(sel)
      .first()
      .isVisible({timeout: 2000})
      .catch(() => false);
    if (visible) {
      collapseBtn = page.locator(sel).first();
      break;
    }
  }

  if (!collapseBtn) {
    console.warn('UI-11: sidebar collapse button not found with tested selectors');
    return;
  }

  await collapseBtn.click();
  await page.waitForTimeout(600);

  const collapsedBox = await sidebar.boundingBox().catch(() => null);
  console.log('UI-11: SIDEBAR_COLLAPSED_WIDTH:', collapsedBox?.width ?? 'unknown');

  if (collapsedBox && initialBox) {
    expect(collapsedBox.width).toBeLessThan(initialBox.width);
  }

  // Expand again
  await collapseBtn.click();
  await page.waitForTimeout(600);

  const expandedBox = await sidebar.boundingBox().catch(() => null);
  if (expandedBox && initialBox) {
    const widthDiff = Math.abs(expandedBox.width - initialBox.width);
    console.log('UI-11: width diff after expand:', widthDiff);
    expect(widthDiff).toBeLessThan(20);
  }

  console.log('UI-11: sidebar collapse/expand cycle completed successfully');
});

// ─── UI-12: App Switcher (Waffle Grid) ───────────────────────────────────────

test('UI-12: app switcher (waffle grid) opens with app cards', async ({page}) => {
  await loginAs(page, demoUsers.superAdmin.email);
  await navigateTo(page, '/dashboard');
  await page.waitForTimeout(1000);

  const switcherSelectors = [
    '[data-testid="app-switcher"]',
    'button[aria-label*="app" i]',
    'button[aria-label*="apps" i]',
    'button:has([class*="grid" i]):not([class*="data-grid" i]):not([class*="ag-grid" i])',
    '[class*="AppSwitcher"]',
    '[class*="waffle" i]',
    '[class*="app-switcher" i]',
  ];

  let switcherBtn: ReturnType<typeof page.locator> | null = null;
  for (const sel of switcherSelectors) {
    const visible = await page
      .locator(sel)
      .first()
      .isVisible({timeout: 2000})
      .catch(() => false);
    if (visible) {
      switcherBtn = page.locator(sel).first();
      break;
    }
  }

  if (!switcherBtn) {
    console.warn('UI-12: app switcher not found with tested selectors');
    return;
  }

  await switcherBtn.click();
  await page.waitForTimeout(600);

  const appCards = await page
    .locator('[class*="app-card" i], [class*="AppCard"], [class*="grid-item" i]')
    .count();
  console.log('UI-12: APP_SWITCHER_CARDS:', appCards);

  if (appCards > 0) {
    const hasHRMS = await page
      .locator('text=/NU-HRMS|NU HRMS/i')
      .isVisible()
      .catch(() => false);
    const hasHire = await page
      .locator('text=/NU-Hire|NU Hire/i')
      .isVisible()
      .catch(() => false);
    const hasGrow = await page
      .locator('text=/NU-Grow|NU Grow/i')
      .isVisible()
      .catch(() => false);
    console.log(
      `UI-12: app cards — HRMS:${hasHRMS} Hire:${hasHire} Grow:${hasGrow}`
    );
  } else {
    console.warn('UI-12: app switcher opened but no app cards found');
  }

  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
});

// ─── UI-13: Breadcrumbs Validation ───────────────────────────────────────────

test('UI-13: breadcrumbs present and contextual', async ({page}) => {
  await loginAs(page, demoUsers.superAdmin.email);
  await navigateTo(page, '/employees');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);

  const breadcrumb = page
    .locator(
      '[class*="breadcrumb" i], [aria-label="breadcrumb"], nav[aria-label*="bread" i], ' +
        '[data-testid="breadcrumb"]'
    )
    .first();

  const hasBreadcrumb = await breadcrumb.isVisible().catch(() => false);

  if (!hasBreadcrumb) {
    console.warn('UI-13: no breadcrumb component found on /employees');
  } else {
    const crumbText = await breadcrumb.textContent().catch(() => '');
    const cleaned = (crumbText ?? '').replace(/\n/g, ' > ').trim();
    console.log('UI-13: BREADCRUMB_TEXT:', cleaned);

    if (!/employee/i.test(cleaned)) {
      console.warn(
        `UI-13: breadcrumb on /employees does not mention "employee" — got: "${cleaned}"`
      );
    }
  }

  // Test deeper route — click first employee row for detail page breadcrumb
  const firstRow = page
    .locator('tbody tr, [class*="row" i]:not([class*="header" i])')
    .first();
  const rowVisible = await firstRow.isVisible().catch(() => false);

  if (rowVisible) {
    await firstRow.click();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    const deepBreadcrumb = page
      .locator('[class*="breadcrumb" i], [aria-label="breadcrumb"]')
      .first();

    if (await deepBreadcrumb.isVisible().catch(() => false)) {
      const deepText = await deepBreadcrumb.textContent().catch(() => '');
      const deepCleaned = (deepText ?? '').replace(/\n/g, ' > ').trim();
      console.log('UI-13: DEEP_BREADCRUMB:', deepCleaned);

      // Should have at least 2 levels (contains a separator or has multiple parts)
      const hasMultipleLevels =
        deepCleaned.includes('>') ||
        deepCleaned.includes('/') ||
        deepCleaned.includes('›') ||
        (deepCleaned.match(/\w+/g) ?? []).length >= 2;

      if (!hasMultipleLevels) {
        console.warn('UI-13: deep breadcrumb appears to have only 1 level');
      } else {
        console.log('UI-13: deep breadcrumb has multiple levels — correct');
      }
    } else {
      console.warn('UI-13: no breadcrumb on employee detail page');
    }
  }
});

// ─── UI-14: Focus & Accessibility — Tab Order ────────────────────────────────

test('UI-14: keyboard tab order — focus moves through interactive elements', async ({page}) => {
  await loginAs(page, demoUsers.superAdmin.email);
  await navigateTo(page, '/me/dashboard');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1500);

  // Click into the page first to ensure focus context is set
  await page.click('main, body', {timeout: 5000}).catch(() => {});

  const focusedElements: Array<{tag: string; text: string; class: string}> = [];

  for (let i = 0; i < 10; i++) {
    await page.keyboard.press('Tab');
    await page.waitForTimeout(100);

    const focused = await page
      .evaluate(() => {
        const el = document.activeElement;
        if (!el || el === document.body) return null;
        return {
          tag: el.tagName,
          text: (el.textContent ?? '').trim().slice(0, 30),
          class: ((el as HTMLElement).className ?? '').slice(0, 40),
        };
      })
      .catch(() => null);

    if (focused) {
      focusedElements.push(focused);
    }
  }

  console.log('UI-14: TAB_ORDER:', JSON.stringify(focusedElements, null, 2));

  // Tab key must move focus
  expect(focusedElements.length).toBeGreaterThan(0);
  console.log(`UI-14: ${focusedElements.length}/10 Tab presses moved focus to an element`);

  if (focusedElements.length < 5) {
    console.warn(
      `UI-14: only ${focusedElements.length}/10 tab presses moved focus — ` +
        'many interactive elements may be missing tabIndex or have focus:outline-none without replacement'
    );
  }

  // First focused element should NOT be in footer (footer should not be first in tab order)
  if (focusedElements.length > 0) {
    const firstClass = focusedElements[0].class.toLowerCase();
    if (firstClass.includes('footer')) {
      console.warn('UI-14: first tab stop is in footer — unexpected tab order');
    }
  }
});

// ─── UI-15: Page Title Updates on Navigation ─────────────────────────────────

test('UI-15: page titles are contextual and not generic', async ({page}) => {
  await loginAs(page, demoUsers.superAdmin.email);

  const pageChecks: Array<{route: string; expectedTitle: RegExp}> = [
    {route: '/dashboard', expectedTitle: /dashboard|home|nu-?aura/i},
    {route: '/employees', expectedTitle: /employee/i},
    {route: '/leave', expectedTitle: /leave/i},
  ];

  for (const check of pageChecks) {
    await page.goto(check.route);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    const title = await page.title();
    console.log(`UI-15: PAGE_TITLE ${check.route} = "${title}"`);

    // Must not be generic CRA/Next.js default titles
    const isGeneric =
      title === 'React App' ||
      title === 'Next.js App' ||
      title === '' ||
      title.trim().length === 0;

    if (isGeneric) {
      console.warn(
        `UI-15: ${check.route} has generic/empty title "${title}" — ` +
          'update <title> or next/head to reflect the page context'
      );
    }

    if (!check.expectedTitle.test(title)) {
      console.warn(
        `UI-15: ${check.route} title "${title}" does not match expected pattern ` +
          check.expectedTitle.toString()
      );
    }

    // Hard assertion: no page should have empty title
    expect(title.trim().length).toBeGreaterThan(0);
  }

  // Extra: title should update when navigating (not stuck on first page title)
  const titleOnEmployees = await page.title();
  await navigateTo(page, '/leave');
  await page.waitForTimeout(500);
  const titleOnLeave = await page.title();

  if (titleOnEmployees === titleOnLeave && titleOnEmployees !== '') {
    console.warn(
      `UI-15: page title did not change when navigating from /employees to /leave ` +
        `(both = "${titleOnLeave}") — single-page app may need dynamic title updates`
    );
  } else {
    console.log(
      `UI-15: title changed correctly: "${titleOnEmployees}" → "${titleOnLeave}"`
    );
  }
});
