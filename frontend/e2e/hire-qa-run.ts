/* eslint-disable no-console */
/**
 * NU-Hire QA Run — Standalone Playwright script using UI form login
 * Tests all NU-Hire routes as suresh@nulogic.io (RECRUITMENT_ADMIN)
 */
import { chromium, type BrowserContext, type Page, type ConsoleMessage } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const BASE_URL = 'https://hrms-frontend-vert.vercel.app';
const SCREENS_DIR = '/Users/fayaz.m/IdeaProjects/nulogic/nu-aura/docs/qa/ui-e2e-run-2026-06-24/iter-1/SCREENS';
const LOGIN_TIMEOUT = 90_000;
const DEMO_PASSWORD = 'Welcome@123';

const HIRE_ROUTES = [
  { route: '/recruitment', slug: 'recruitment' },
  { route: '/recruitment/agencies', slug: 'recruitment__agencies' },
  { route: '/onboarding', slug: 'onboarding' },
  { route: '/onboarding/new', slug: 'onboarding__new' },
  { route: '/onboarding/templates', slug: 'onboarding__templates' },
  { route: '/offboarding', slug: 'offboarding' },
  { route: '/careers', slug: 'careers' },
];

async function loginViaForm(context: BrowserContext, page: Page, email: string): Promise<boolean> {
  await context.clearCookies();
  await page.goto(`${BASE_URL}/auth/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  // Fill email and password using locators
  await page.locator('input[type="email"]').fill(email);
  await page.waitForTimeout(300);
  await page.locator('input[type="password"]').fill(DEMO_PASSWORD);
  await page.waitForTimeout(300);

  // Click submit button
  await page.locator('button[type="submit"]').click();

  try {
    await page.waitForURL((url) => !url.pathname.startsWith('/auth/login'), {
      timeout: LOGIN_TIMEOUT,
    });
    return true;
  } catch {
    return false;
  }
}

async function testRoute(page: Page, routePath: string, screenshotPath: string): Promise<{
  status: string;
  notes: string;
  url: string;
}> {
  const routeConsoleErrors: string[] = [];
  const handler = (msg: ConsoleMessage) => {
    if (msg.type() === 'error') routeConsoleErrors.push(msg.text().substring(0, 150));
  };
  page.on('console', handler);

  try {
    const response = await page.goto(`${BASE_URL}${routePath}`, {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    });

    await page.waitForTimeout(3000);
    const finalUrl = page.url();
    const title = await page.title();

    // Take screenshot
    await page.screenshot({ path: screenshotPath, fullPage: false });

    let status = 'PASS';
    let notes = `title="${title}"`;

    if (finalUrl.includes('/auth/login')) {
      status = 'FAIL';
      notes = 'Redirected to login — session expired or route not accessible';
    } else if (finalUrl.includes('denied=1') || finalUrl.includes('/denied')) {
      status = 'BLOCKED';
      notes = 'Access denied — route requires higher privilege than RECRUITMENT_ADMIN';
    } else if (response && response.status() >= 500) {
      status = 'ERROR';
      notes = `HTTP ${response.status()} server error`;
    } else {
      // Check for error content
      const bodyText = await page.evaluate(() =>
        document.body?.innerText?.substring(0, 500) || ''
      );
      if (bodyText.toLowerCase().includes('something went wrong') ||
          bodyText.toLowerCase().includes('error boundary') ||
          bodyText.toLowerCase().includes('unhandled error')) {
        status = 'FAIL';
        notes = `Error boundary rendered: ${bodyText.substring(0, 80)}`;
      }
    }

    // Only log non-trivial console errors
    const relevantErrors = routeConsoleErrors.filter(e =>
      !e.includes('401') && !e.includes('403') && !e.includes('favicon') &&
      !e.includes('ERR_BLOCKED') && !e.includes('net::ERR')
    );
    if (relevantErrors.length > 0 && status === 'PASS') {
      notes += ` | console-errors(${relevantErrors.length}): ${relevantErrors[0].substring(0, 80)}`;
    }

    page.off('console', handler);
    return { status, notes, url: finalUrl };
  } catch (e: unknown) {
    try { await page.screenshot({ path: screenshotPath, fullPage: false }); } catch {}
    page.off('console', handler);
    return {
      status: 'ERROR',
      notes: `Navigation error: ${(e instanceof Error ? e.message : '').substring(0, 100)}`,
      url: page.url(),
    };
  }
}

async function main() {
  fs.mkdirSync(SCREENS_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });

  // === Test /careers unauthenticated first ===
  console.log('Testing /careers (unauthenticated)...');
  const unauthCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const unauthPage = await unauthCtx.newPage();
  const careersUnauthShot = path.join(SCREENS_DIR, 'HIRE__careers__unauthenticated__1440.png');
  const careersUnauthResult = await testRoute(unauthPage, '/careers', careersUnauthShot);
  console.log(`  /careers (unauth): ${careersUnauthResult.status} — ${careersUnauthResult.notes}`);
  await unauthCtx.close();

  // === Login as suresh via UI form ===
  const authCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const authPage = await authCtx.newPage();

  console.log('\nLogging in as suresh@nulogic.io via UI form...');
  const loginOk = await loginViaForm(authCtx, authPage, 'suresh@nulogic.io');

  if (!loginOk) {
    console.error('LOGIN FAILED — cannot proceed with authenticated routes');
    const failShot = path.join(SCREENS_DIR, 'HIRE__suresh__login-FAILED__1440.png');
    await authPage.screenshot({ path: failShot });
    await browser.close();
    process.exit(1);
  }

  // Post-login screenshot
  await authPage.waitForTimeout(2000);
  const postLoginUrl = authPage.url();
  const postLoginTitle = await authPage.title();
  const postLoginShot = path.join(SCREENS_DIR, 'HIRE__suresh__post-login__1440.png');
  await authPage.screenshot({ path: postLoginShot });
  console.log(`Post-login OK: URL=${postLoginUrl} | title="${postLoginTitle}"`);

  // Get actual displayed role
  const displayedRole = await authPage.evaluate(() => {
    // Look for role text in top header area
    const allText = [...document.querySelectorAll('span, p, div')]
      .filter(el => {
        const t = el.textContent?.trim() || '';
        return t.length > 2 && t.length < 50 && (
          t.includes('ADMIN') || t.includes('MANAGER') || t.includes('Admin') ||
          t.includes('Manager') || t.includes('RECRUITMENT')
        );
      })
      .map(el => el.textContent?.trim())
      .slice(0, 3);
    return allText.join(' | ') || 'role not found in DOM';
  });
  console.log(`Displayed role text: ${displayedRole}`);

  const results: { route: string; status: string; screenshot: string; notes: string }[] = [
    {
      route: '/careers (unauthenticated)',
      status: careersUnauthResult.status,
      screenshot: careersUnauthShot,
      notes: careersUnauthResult.notes,
    }
  ];

  // === Test each hire route as suresh ===
  for (const { route, slug } of HIRE_ROUTES) {
    console.log(`Testing ${route}...`);
    const screenshotPath = path.join(SCREENS_DIR, `HIRE__${slug}__loaded__1440.png`);
    const result = await testRoute(authPage, route, screenshotPath);
    results.push({
      route,
      status: result.status,
      screenshot: screenshotPath,
      notes: result.notes,
    });
    console.log(`  ${result.status}: ${result.notes} [${result.url.replace(BASE_URL, '')}]`);
  }

  await authCtx.close();
  await browser.close();

  // === Compile output ===
  const passCount = results.filter(r => r.status === 'PASS').length;
  const failCount = results.filter(r => ['FAIL', 'ERROR'].includes(r.status)).length;

  const criticalIssues = results
    .filter(r => r.status === 'ERROR' || r.status === 'FAIL')
    .map(r => ({
      route: r.route,
      issue: r.notes,
      severity: r.status === 'ERROR' ? 'HIGH' : 'MEDIUM',
    }));

  const output = {
    sub_app: 'NU-Hire',
    account_used: 'suresh@nulogic.io',
    routes_tested: results,
    total_tested: results.length,
    pass_count: passCount,
    fail_count: failCount,
    screenshots_taken: results.length + 1, // +1 for post-login
    critical_issues: criticalIssues,
  };

  const outputPath = path.join(SCREENS_DIR, '../hire-qa-results.json');
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));

  console.log('\n=== FINAL RESULTS ===');
  console.log(JSON.stringify(output, null, 2));
}

main().catch(e => {
  console.error('Script error:', e);
  process.exit(1);
});
