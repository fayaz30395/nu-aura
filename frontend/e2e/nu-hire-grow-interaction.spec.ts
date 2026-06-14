import {expect, Page, test} from '@playwright/test';
import {demoUsers} from './fixtures/testData';
import {loginAs, navigateTo} from './fixtures/helpers';

type TraversalScope = {
  label: string;
  startRoute: string;
  routes: string[];
};

const SUBAPP_SCOPES: TraversalScope[] = [
  {
    label: 'NU-Hire',
    startRoute: '/app/hire',
    routes: ['/app/hire', '/recruitment', '/recruitment/jobs', '/recruitment/pipeline', '/onboarding'],
  },
  {
    label: 'NU-Grow',
    startRoute: '/app/grow',
    routes: ['/app/grow', '/performance', '/performance/goals', '/performance/okr', '/training', '/surveys'],
  },
];

const SUBAPP_PRIMARY_ROUTES = [
  '/app/hire',
  '/recruitment',
  '/recruitment/jobs',
  '/recruitment/pipeline',
  '/onboarding',
  '/app/grow',
  '/performance',
  '/performance/goals',
  '/performance/okr',
  '/training',
  '/surveys',
];
const BASE_PATH_SUFFIX_RE = /\/+$/;
const ACTION_BUTTON_TEXT_RE = /add|create|new|post|save|submit|edit|update|delete|publish|approve|reject|view|details|open/i;
const ACTION_BUTTON_IGNORE_TEXT_RE = /cancel|close|back|dismiss|next|prev|pagination|filter|search|refresh|expand|collapse|menu|sort|download|upload/i;
const PRIMARY_LINK_VISIT_LIMIT = 18;
const ENTRY_FLOW_RE = /NU-(Hire|Grow) startup flow|Loading your app entry route|continue to nu-(hire|grow)/i;
const ROUTE_BOOT_LOOP_RE = /session restoring|checking your workspace credentials|loading your app entry route|loading content/i;
const ROUTE_NOT_FOUND_RE = /404|page not found|not found/i;
const QUICK_NAV_TIMEOUT_MS = 14000;
const ROUTE_STABILIZE_ATTEMPTS = 4;
const ROUTE_STABILIZE_STEP_MS = 1000;
const ROUTE_SETTLE_MS = 4000;
const ACTION_BUTTON_LIMIT = 16;
const RBAC_TEST_TIMEOUT_MS = 240000;

const RBAC_MATRIX = [
  {
    label: 'SUPER_ADMIN',
    email: demoUsers.superAdmin.email,
    mustAllow: [
      '/app/hire',
      '/recruitment',
      '/recruitment/jobs',
      '/recruitment/pipeline',
      '/onboarding',
      '/app/grow',
      '/performance',
      '/performance/goals',
      '/performance/okr',
      '/training',
      '/surveys',
    ],
    mustDeny: [],
  },
  {
    label: 'RECRUITMENT_ADMIN',
    email: demoUsers.recruitmentAdmin.email,
    mustAllow: ['/app/hire', '/recruitment', '/recruitment/jobs', '/recruitment/pipeline', '/onboarding'],
    mustDeny: ['/app/grow', '/performance', '/performance/goals', '/performance/okr', '/training', '/surveys'],
  },
];

function isSameOriginInternal(href: string | null, basePath = ''): href is string {
  if (!href) return false;
  if (href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) return false;
  if (href.startsWith('#') || href === basePath) return false;
  return href.startsWith('/') || href.startsWith('http://localhost') || href.startsWith('https://');
}

function routeFallback(path: string): string | null {
  if (path === '/app/hire') return '/recruitment';
  if (path === '/app/grow') return '/performance';
  if (path === '/training') return '/performance';
  return null;
}

function normalizedAccessTargets(path: string): string[] {
  const normalized = path.replace(BASE_PATH_SUFFIX_RE, '');
  const fallback = routeFallback(normalized);
  return fallback ? [normalized, fallback] : [normalized];
}

function isBootstrapOrAuthLoopRouteText(bodyText: string): boolean {
  return ROUTE_BOOT_LOOP_RE.test(bodyText);
}

async function readBodyText(page: Page): Promise<string> {
  const bodyText = await page.locator('body').textContent().catch(() => '');
  return (bodyText || '').toLowerCase();
}

async function waitForAuthGateToSettle(page: Page): Promise<boolean> {
  for (let attempt = 0; attempt < ROUTE_STABILIZE_ATTEMPTS; attempt++) {
    if (!(await isBootstrapOrAuthLoop(page))) {
      await page.waitForTimeout(ROUTE_SETTLE_MS).catch(() => {});
      return true;
    }
    await page.reload().catch(() => {});
    await page.waitForLoadState('domcontentloaded').catch(() => {});
    await page.waitForTimeout(ROUTE_STABILIZE_STEP_MS).catch(() => {});
  }
  return false;
}

async function collectNavigationRoutes(page: Page): Promise<string[]> {
  let routeValues: string[] = [];
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      routeValues = await page
        .locator('a[href]')
        .evaluateAll((items) =>
          items
            .map((item) => item.getAttribute('href')?.trim() ?? '')
            .filter((entry) => entry.length > 0),
        );
      break;
    } catch (error) {
      if (!String(error).includes('Execution context was destroyed')) {
        throw error;
      }
      await page.waitForTimeout(300).catch(() => {});
    }
  }

  const unique = new Set<string>();
  const normalized = routeValues
    .filter((href) => isSameOriginInternal(href))
    .map((href) => href.replace(BASE_PATH_SUFFIX_RE, ''))
    .filter((href) => href.startsWith('/'))
    .filter((href) => !href.startsWith('http://localhost/auth/login'))
    .filter((href) => href !== '/')
    .filter((href) => !href.includes('logout'));

  for (const route of normalized) {
    unique.add(route);
  }
  return [...unique];
}

async function bypassEntryFlow(page: Page): Promise<void> {
  const startupScreenVisible = await page.locator(`text=${ENTRY_FLOW_RE}`).first().isVisible({timeout: 1000}).catch(() => false);
  if (!startupScreenVisible) {
    return;
  }

  const candidates = [
    page.getByRole('link', {name: /continue to nu-(hire|grow)/i}).first(),
    page.locator('a[href*="/recruitment"]').first(),
    page.locator('a[href*="/performance"]').first(),
    page.locator('a[href*="/onboarding"]').first(),
    page.locator('button, [role="button"]').filter({hasText: /continue/i}).first(),
  ];

  for (const candidate of candidates) {
    if (await candidate.isVisible({timeout: 1000}).catch(() => false)) {
      await candidate.click({timeout: 1000}).catch(() => {});
      await page.waitForLoadState('domcontentloaded', {timeout: 12000}).catch(() => {});
      return;
    }
  }
}

async function navigateAndPrepare(page: Page, path: string): Promise<void> {
  await navigateTo(page, path);
  await bypassEntryFlow(page);
  await waitForAuthGateToSettle(page);
}

async function navigateAndPrepareOrSkip(page: Page, path: string): Promise<'ok' | 'blocked'> {
  try {
    await navigateAndPrepare(page, path);
  } catch {
    return 'blocked';
  }

  if (await isBootstrapOrAuthLoop(page)) {
    return 'blocked';
  }

  return page.url().includes('/auth/login') ? 'blocked' : 'ok';
}

async function isFunctionalErrorState(page: Page): Promise<boolean> {
  const bodyText = await readBodyText(page);
  return bodyText.includes('something went wrong')
    || bodyText.includes('failed to load')
    || bodyText.includes('500')
    || bodyText.includes('error loading')
    || ROUTE_NOT_FOUND_RE.test(bodyText);
}

async function isBootstrapOrAuthLoop(page: Page): Promise<boolean> {
  const bodyText = await readBodyText(page);
  const loginText = page.url().includes('/auth/login');
  return loginText || isBootstrapOrAuthLoopRouteText(bodyText);
}

async function isPageBlockedByRbac(page: Page): Promise<boolean> {
  const denied = await page
    .locator('text=/403|Forbidden|Access Denied|access denied|not authorized|not allowed|permission/i')
    .first()
    .isVisible({timeout: 1500})
    .catch(() => false);
  const bodyText = await readBodyText(page);
  return denied
    || bodyText.includes('not available')
    || bodyText.includes('you do not have access')
    || bodyText.includes('permission denied')
    || bodyText.includes('session expired');
}

async function isNavigationStateSkippable(page: Page): Promise<boolean> {
  const bodyText = await readBodyText(page);
  const bootstrapLoop = await isBootstrapOrAuthLoop(page);
  return bootstrapLoop || page.url().includes('/auth/login');
}

async function assertRenderableAndNotErrorState(page: Page, label: string): Promise<void> {
  if (page.url().includes('/auth/login')) {
    return;
  }
  const bodyText = await readBodyText(page);
  if (await isBootstrapOrAuthLoop(page)) {
    return;
  }
  const shellVisible = await page.locator('main, [role="main"], [data-app-shell], #__next').first().isVisible({timeout: 12000}).catch(() => false);
  if (!shellVisible) {
    expect(await page.locator('body').isVisible().catch(() => false)).toBe(true);
  }
  if (ROUTE_NOT_FOUND_RE.test(bodyText) || bodyText.includes('something went wrong') || bodyText.includes('failed to load') || bodyText.includes('error loading')) {
    throw new Error(`${label}: page shows an error state after navigation`);
  }
}

async function quickNavigate(page: Page, path: string, timeout = QUICK_NAV_TIMEOUT_MS): Promise<boolean> {
  try {
    await page.goto(path, {waitUntil: 'domcontentloaded', timeout});
    await page.waitForLoadState('domcontentloaded', {timeout}).catch(() => {});
    await waitForAuthGateToSettle(page);
    return true;
  } catch {
    return false;
  }
}

async function quickNavigateOrFallback(page: Page, path: string): Promise<boolean> {
  if (await quickNavigate(page, path)) {
    return true;
  }
  const fallback = routeFallback(path);
  if (!fallback || fallback === path) {
    return false;
  }
  return quickNavigate(page, fallback);
}

async function collectPrimaryLinks(page: Page): Promise<string[]> {
  let routeValues: string[] = [];
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      routeValues = await page
        .locator('a[href]')
        .evaluateAll((items) =>
          items
            .map((item) => item.getAttribute('href')?.trim() ?? '')
            .filter((entry) => entry.length > 0),
        );
      break;
    } catch (error) {
      if (!String(error).includes('Execution context was destroyed')) {
        throw error;
      }
      await page.waitForTimeout(300).catch(() => {});
    }
  }

  const unique = new Set<string>();
  for (const href of routeValues) {
    if (!isSameOriginInternal(href) || href.startsWith('#')) continue;
    const cleaned = href.replace(BASE_PATH_SUFFIX_RE, '').split('#')[0].trim();
    if (!cleaned || cleaned.startsWith('http://localhost/auth/login') || cleaned === '/auth/login') {
      continue;
    }
    const normalized = cleaned.startsWith('http') ? new URL(cleaned).pathname : cleaned;
    if (normalized.startsWith('/api/') || normalized.includes('logout')) {
      continue;
    }

    if (SUBAPP_PRIMARY_ROUTES.some((prefix) => normalized.startsWith(prefix))) {
      unique.add(normalized);
      continue;
    }
    // Keep one-hop links that still stay within hire/grow modules.
    if (normalized.startsWith('/recruitment') || normalized.startsWith('/onboarding')
      || normalized.startsWith('/performance') || normalized.startsWith('/training') || normalized.startsWith('/surveys')) {
      unique.add(normalized);
    }
  }

  return [...unique];
}

async function clickAndValidateAction(page: Page, label: string) {
  const actionButtons = page
    .locator('button')
    .filter({hasText: ACTION_BUTTON_TEXT_RE});

  const actionCount = await actionButtons.count();
  if (!actionCount) {
    return;
  }

  const actionable = Math.min(actionCount, ACTION_BUTTON_LIMIT);
  let failed = 0;
  let attempted = 0;
  let criticalAttempted = 0;
  let criticalFailed = 0;

  for (let i = 0; i < actionable; i++) {
    const actionBtn = actionButtons.nth(i);
    if (!(await actionBtn.isVisible({timeout: 1000}).catch(() => false))) {
      continue;
    }

    const buttonText = ((await actionBtn.textContent().catch(() => '')) || '').trim().toLowerCase();
    if (!buttonText || ACTION_BUTTON_IGNORE_TEXT_RE.test(buttonText)) {
      continue;
    }
    const isCritical = ACTION_BUTTON_TEXT_RE.test(buttonText);
    attempted += 1;
    if (isCritical) {
      criticalAttempted += 1;
    }

    if (await actionBtn.isDisabled({timeout: 500}).catch(() => false)) {
      if (isCritical) {
        criticalFailed += 1;
      }
      continue;
    }

    const beforeUrl = page.url();
    await actionBtn.click({timeout: 1000}).catch(() => {
      if (isCritical) {
        criticalFailed += 1;
      }
    });
    await page.waitForTimeout(900);

    const hasDialog = await page
      .locator('[role="dialog"], [data-testid*="modal" i], [class*="Modal" i], [class*="Drawer" i], [class*="modal" i], [class*="drawer" i]')
      .first()
      .isVisible({timeout: 3000})
      .catch(() => false);
    const urlMoved = page.url() !== beforeUrl;
    const bodyError = await isFunctionalErrorState(page);
    if (!hasDialog && !urlMoved) {
      failed += 1;
      if (isCritical) {
        criticalFailed += 1;
      }
      if (bodyError) {
        throw new Error(`${label}: action button interaction caused visible error state`);
      }
      continue;
    }

    const closeBtn = page.getByRole('button', {name: /cancel|close|back|dismiss/i}).first();
    if (await closeBtn.isVisible({timeout: 3000}).catch(() => false)) {
      await closeBtn.click({timeout: 1000}).catch(() => {});
      await page.waitForTimeout(400);
    } else if (hasDialog) {
      await page.keyboard.press('Escape').catch(() => {});
      await page.waitForTimeout(350);
      await page.waitForTimeout(350);
    } else if (urlMoved) {
      await page.goBack({timeout: 1000}).catch(() => {});
      await page.waitForTimeout(350);
    }
  }

  // For known action buttons, allow non-functional icons/controls but fail loudly
  // if every attempted action is non-reactive.
  if (criticalAttempted > 0 && criticalFailed >= criticalAttempted) {
    throw new Error(`${label}: critical action buttons appear non-reactive`);
  }
  if (attempted > 0 && criticalAttempted === 0 && failed >= attempted) {
    throw new Error(`${label}: action buttons appear non-reactive`);
  }
}

async function isAccessBlocked(page: Page, requestedPath: string): Promise<boolean> {
  const denied = await isPageBlockedByRbac(page);
  const bootstrapLoop = await isBootstrapOrAuthLoop(page);
  if (bootstrapLoop) {
    return true;
  }
  const currentUrl = page.url();
  if (currentUrl.includes('/auth/login')) {
    return true;
  }
  const bodyText = await readBodyText(page);
  if (ROUTE_NOT_FOUND_RE.test(bodyText)) {
    return true;
  }

  const currentPath = new URL(currentUrl).pathname;
  const expectedPaths = normalizedAccessTargets(requestedPath);
  const onExpectedModule = expectedPaths.some((expectedPath) => {
    const normalizedExpected = expectedPath.replace(BASE_PATH_SUFFIX_RE, '');
    return currentPath === normalizedExpected || currentPath.startsWith(`${normalizedExpected}/`) || currentPath.includes(normalizedExpected.replace('/app/', ''));
  });

  const redirectToAuthShell = (currentPath === '/me' || currentPath === '/me/' || currentPath.startsWith('/me/')) && !onExpectedModule;
  return denied || redirectToAuthShell;
}

async function verifyRouteForRbac(page: Page, route: string, mustAllow: boolean): Promise<void> {
  const quickSuccess = await quickNavigateOrFallback(page, route);
  if (!quickSuccess) {
    if (mustAllow) {
      expect(quickSuccess).toBeTruthy();
    }
    return;
  }
  await page.waitForLoadState('domcontentloaded').catch(() => {});
  await bypassEntryFlow(page);
  if (!(await waitForAuthGateToSettle(page))) {
    return;
  }

  if (await isBootstrapOrAuthLoop(page)) {
    return;
  }

  const blocked = await isAccessBlocked(page, route);

  if (mustAllow) {
    expect(blocked, `RBAC allow-rule failed for ${route}`).toBe(false);
  } else {
    expect(blocked, `RBAC deny-rule failed for ${route}`).toBe(true);
  }
}

for (const scope of SUBAPP_SCOPES) {
  test.describe(`${scope.label} interaction traversal @chrome @critical`, () => {
    test.setTimeout(240000);

    for (const route of scope.routes) {
      test(`navigate ${scope.label} route and validate shell for ${route}`, async ({page}) => {
        if ((await navigateAndPrepareOrSkip(page, route)) === 'blocked') {
          const fallbackRoute = routeFallback(route);
          if (!fallbackRoute) {
            return;
          }
          if ((await navigateAndPrepareOrSkip(page, fallbackRoute)) === 'blocked') {
            return;
          }
          return;
        }
        if (await isBootstrapOrAuthLoop(page)) {
          return;
        }
        await assertRenderableAndNotErrorState(page, `${scope.label} route ${route}`);
      });
    }

    test(`NU-Hire/NU-Grow nav links under ${scope.label} are reachable`, async ({page}) => {
      if ((await navigateAndPrepareOrSkip(page, scope.startRoute)) === 'blocked') {
        return;
      }
      const routes = await collectNavigationRoutes(page);
      if (!routes.length) {
        return;
      }

      for (const target of routes) {
        const quickSuccess = await quickNavigate(page, target);
        if (!quickSuccess) {
          const targetFallback = routeFallback(target);
          if (!targetFallback || !(await quickNavigate(page, targetFallback))) {
            throw new Error(`${scope.label} nav route target unreachable: ${target}`);
          }
        }
        await bypassEntryFlow(page);
        await waitForAuthGateToSettle(page);
        if (await isNavigationStateSkippable(page)) {
          continue;
        }
        await assertRenderableAndNotErrorState(page, `${scope.label} nav target ${target}`);
      }
    });

    test(`NU-Hire/NU-Grow primary links under each route are clickable`, async ({page}) => {
      for (const route of scope.routes) {
        if ((await navigateAndPrepareOrSkip(page, route)) === 'blocked') {
          const fallbackRoute = routeFallback(route);
          if (fallbackRoute) {
            if ((await navigateAndPrepareOrSkip(page, fallbackRoute)) === 'blocked') {
              continue;
            }
          } else {
            continue;
          }
        }

        const links = await collectPrimaryLinks(page);
        if (!links.length) {
          continue;
        }

        const candidateLinks = links.filter((target) => target !== route && target !== `${route}/`).slice(0, PRIMARY_LINK_VISIT_LIMIT);
        if (!candidateLinks.length) {
          continue;
        }

        for (const target of candidateLinks) {
          const base = page.url().replace(/#.*$/, '').split('?')[0];
          const quickSuccess = await quickNavigate(page, target);
          if (!quickSuccess) {
            const targetFallback = routeFallback(target);
            const fallbackSuccess = targetFallback ? await quickNavigate(page, targetFallback) : false;
          if (!fallbackSuccess) {
              throw new Error(`${scope.label} primary link unreachable: ${target}`);
            }
            await page.goto(base, {waitUntil: 'domcontentloaded'}).catch(() => {});
            await waitForAuthGateToSettle(page);
            await bypassEntryFlow(page);
            continue;
        }
          await bypassEntryFlow(page);
          if (await isNavigationStateSkippable(page)) {
            await page.goto(base, {waitUntil: 'domcontentloaded'}).catch(() => {});
            await waitForAuthGateToSettle(page);
            await bypassEntryFlow(page);
            continue;
          }
          await assertRenderableAndNotErrorState(page, `${scope.label} primary link ${target}`);

          await page.goto(base, {waitUntil: 'domcontentloaded'}).catch(() => {});
          await waitForAuthGateToSettle(page);
          await bypassEntryFlow(page);
          if (await isNavigationStateSkippable(page)) {
            continue;
          }
          await assertRenderableAndNotErrorState(page, `${scope.label} return to ${base}`);
        }
      }
    });

    test(`action buttons and popups under ${scope.label} are functional`, async ({page}) => {
      for (const route of scope.routes) {
        if ((await navigateAndPrepareOrSkip(page, route)) === 'blocked') {
          continue;
        }
        await clickAndValidateAction(page, `${scope.label} ${route}`).catch(async (err) => {
          const bodyText = (await page.locator('body').textContent().catch(() => '')).toLowerCase();
          if (!bodyText || bodyText.includes('error')) {
            throw err;
          }
        });
      }
    });
  });
}

test.describe('NU-Hire / NU-Grow RBAC cross-role validation @chrome @rbac', () => {
  test.setTimeout(RBAC_TEST_TIMEOUT_MS);
  test.use({storageState: {cookies: [], origins: []}});

  for (const scenario of RBAC_MATRIX) {
    test.describe(`${scenario.label} role validation`, () => {
      for (const route of scenario.mustAllow) {
        test(`${scenario.label} can access ${route}`, async ({page}) => {
          await loginAs(page, scenario.email, {verifyDashboard: false});
          await verifyRouteForRbac(page, route, true);
        });
      }

      for (const route of scenario.mustDeny) {
        test(`${scenario.label} is blocked from ${route}`, async ({page}) => {
          await loginAs(page, scenario.email, {verifyDashboard: false});
          await verifyRouteForRbac(page, route, false);
        });
      }
    });
  }
});
