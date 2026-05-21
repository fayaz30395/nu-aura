import {expect, test} from '@playwright/test';
import routes from './routes.json';
import {isNoise} from './known-noise';

// One smoke test per unique route. Authenticated as SUPER_ADMIN via storageState
// (see playwright.config.ts → projects.chromium.storageState).
// Pass criteria: page returns < 500, no un-suppressed console errors, no
// uncaught page exceptions, body has > 0 visible text.
test.describe.parallel('@smoke route renders', () => {
  for (const r of routes as Array<{ path: string; module: string }>) {
    test(`${r.path} (${r.module})`, async ({page}) => {
      const consoleErrors: string[] = [];
      const pageErrors: string[] = [];

      page.on('console', (m) => {
        if (m.type() === 'error' && !isNoise(m.text())) consoleErrors.push(m.text());
      });
      page.on('pageerror', (e) => pageErrors.push(e.message));

      const res = await page.goto(r.path, {waitUntil: 'domcontentloaded', timeout: 30000});

      // 5xx = real backend/render failure. 401/403/404 are valid product responses.
      expect(res?.status() ?? 0, `HTTP status for ${r.path}`).toBeLessThan(500);

      // Do not wait for networkidle here: STOMP/WebSocket and background
      // React Query traffic keep many NU-AURA routes active indefinitely.
      await expect
        .poll(async () => (await page.locator('body').innerText().catch(() => '')).length, {
          message: `body text on ${r.path}`,
          timeout: 5000,
        })
        .toBeGreaterThan(0);

      const body = await page.locator('body').innerText().catch(() => '');
      expect(body.length, `body text on ${r.path}`).toBeGreaterThan(0);

      expect(pageErrors, `uncaught exceptions on ${r.path}`).toEqual([]);
      expect(consoleErrors, `console errors on ${r.path}`).toEqual([]);
    });
  }
});
