import {expect, test} from '@playwright/test';

// Credential-Free Smoke Tests
//
// Runs in the "cred-free" Playwright project, which has NO dependency on
// "setup" - it never touches the shared demo login. Every other project
// (chromium/firefox/mobile-*/tablet) depends on setup, so if the demo
// password ever expires again (see V331), auth.setup.ts fails and
// Playwright skips all of them - zero signal from thousands of tests.
//
// This suite is the one thing that can never go dark from a credential
// lapse: it only exercises public routes and the unauthenticated redirect,
// so it always produces real pass/fail signal about whether the app is up.
//
// Adapted from the credential-free block already verified 5/5 passing twice
// against live prod in production-readiness.production.spec.ts.

const PUBLIC_ROUTES = ['/', '/auth/login', '/about', '/features', '/pricing'];

test.use({storageState: {cookies: [], origins: []}});

for (const route of PUBLIC_ROUTES) {
  test(`public route renders: ${route}`, async ({page}) => {
    const response = await page.goto(route, {waitUntil: 'domcontentloaded'});
    expect(response?.status() ?? 0, `HTTP status for ${route}`).toBeLessThan(400);
    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('body')).not.toBeEmpty();
  });
}

test('login page renders the email/password form', async ({page}) => {
  await page.goto('/auth/login', {waitUntil: 'domcontentloaded'});
  await expect(page.locator('input[type="email"]')).toBeVisible({timeout: 10_000});
  await expect(page.locator('input[type="password"]')).toBeVisible();
});

test('unauthenticated access to a protected route redirects to /auth/login', async ({page}) => {
  await page.goto('/employees', {waitUntil: 'domcontentloaded'});
  await page.waitForURL('**/auth/login**', {timeout: 15_000});
  expect(page.url()).toContain('/auth/login');
});
