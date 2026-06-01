import {expect, test} from '@playwright/test';
import routes from './routes.json';
import {isNoise} from './known-noise';

async function gotoRoute(page: Parameters<Parameters<typeof test>[1]>[0]['page'], path: string) {
  try {
    return await page.goto(path, {waitUntil: 'commit', timeout: 60000});
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes('Timeout 60000ms exceeded')) {
      throw error;
    }

    // Firefox can occasionally miss the first navigation commit under the
    // 220-route parallel sweep. Retry once; persistent hangs still fail here.
    return page.goto(path, {waitUntil: 'commit', timeout: 60000});
  }
}

// One smoke test per unique route. Authenticated as SUPER_ADMIN via storageState
// (see playwright.config.ts → projects.chromium.storageState).
// Pass criteria: page returns < 500, no un-suppressed console errors, no
// uncaught page exceptions, and the route mounts visible DOM content.
test.describe.parallel('@smoke route renders', () => {
  for (const r of routes as Array<{ path: string; module: string }>) {
    test(`${r.path} (${r.module})`, async ({page}) => {
      const consoleErrors: string[] = [];
      const pageErrors: string[] = [];

      page.on('console', (m) => {
        if (m.type() === 'error' && !isNoise(m.text())) consoleErrors.push(m.text());
      });
      page.on('pageerror', (e) => pageErrors.push(e.message));

      // Waiting for document commit avoids Firefox timing out on domcontentloaded
      // under parallel smoke load while the checks below still prove the route rendered.
      const res = await gotoRoute(page, r.path);

      // 5xx = real backend/render failure. 401/403/404 are valid product responses.
      expect(res?.status() ?? 0, `HTTP status for ${r.path}`).toBeLessThan(500);

      // Do not wait for networkidle here: STOMP/WebSocket and background
      // React Query traffic keep many NU-AURA routes active indefinitely.
      await page.waitForFunction(
        () => {
          const body = document.body;
          if (!body || body.children.length === 0) return false;
          const rect = body.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        },
        undefined,
        {timeout: 15000}
      );

      expect(pageErrors, `uncaught exceptions on ${r.path}`).toEqual([]);
      expect(consoleErrors, `console errors on ${r.path}`).toEqual([]);
    });
  }
});
