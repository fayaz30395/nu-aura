/**
 * Authenticated visual + responsive + a11y audit.
 *
 * Sweeps representative routes across all four NU-AURA sub-apps at several
 * viewports using the Playwright storageState produced by `auth.setup.ts`
 * (playwright/.auth/user.json — SUPER_ADMIN). For each route+viewport it
 * checks for horizontal overflow, a visible focus ring, accent-token usage,
 * and captures a screenshot. Output: /tmp/aura-audit/report.json + PNGs.
 *
 * Usage (dev server must already be running on :3000):
 *   node scripts/visual-audit.mjs
 *   ROUTES_ONLY=/employees,/leave node scripts/visual-audit.mjs   # subset
 *
 * Dev-only CLI script: stdout is the intended report channel.
 */
/* eslint-disable no-console */
import {chromium} from 'playwright';
import fs from 'fs';

const BASE = process.env.AUDIT_BASE || 'http://localhost:3000';
const OUT = process.env.AUDIT_OUT || '/tmp/aura-audit';
const STORAGE = 'playwright/.auth/user.json';
const ACCENT = '#2952a3';
const VIEWPORTS = (process.env.AUDIT_VIEWPORTS || '375,768,1440')
  .split(',')
  .map((n) => parseInt(n, 10));

// Representative coverage: shell + each sub-app + key states.
const ALL_ROUTES = [
  {path: '/dashboard', label: 'dashboard', app: 'shell'},
  {path: '/me/dashboard', label: 'my-dashboard', app: 'shell'},
  {path: '/employees', label: 'employees', app: 'hrms'},
  {path: '/leave', label: 'leave', app: 'hrms'},
  {path: '/attendance', label: 'attendance', app: 'hrms'},
  {path: '/payroll', label: 'payroll', app: 'hrms'},
  {path: '/departments', label: 'departments', app: 'hrms'},
  {path: '/recruitment', label: 'recruitment', app: 'hire'},
  {path: '/recruitment/pipeline', label: 'pipeline', app: 'hire'},
  {path: '/candidates', label: 'candidates', app: 'hire'},
  {path: '/performance', label: 'performance', app: 'grow'},
  {path: '/goals', label: 'goals', app: 'grow'},
  {path: '/learning', label: 'learning', app: 'grow'},
  {path: '/fluence', label: 'fluence', app: 'fluence'},
  {path: '/wall', label: 'wall', app: 'fluence'},
  {path: '/admin/roles', label: 'admin-roles', app: 'admin'},
  {path: '/settings', label: 'settings', app: 'shell'},
];

const only = (process.env.ROUTES_ONLY || '').split(',').map((s) => s.trim()).filter(Boolean);
const ROUTES = only.length ? ALL_ROUTES.filter((r) => only.includes(r.path)) : ALL_ROUTES;

const hexToRgb = (h) => {
  const n = h.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16));
};
const ACCENT_RGB = hexToRgb(ACCENT);

if (!fs.existsSync(STORAGE)) {
  console.error(`Missing ${STORAGE}. Run: npx playwright test --project=setup`);
  process.exit(1);
}
fs.mkdirSync(OUT, {recursive: true});

const results = [];
const failures = [];
const needsAuth = [];

const browser = await chromium.launch();

for (const route of ROUTES) {
  for (const width of VIEWPORTS) {
    const ctx = await browser.newContext({
      viewport: {width, height: 900},
      deviceScaleFactor: 1,
      storageState: STORAGE,
    });
    const page = await ctx.newPage();
    try {
      // 'domcontentloaded' (not 'networkidle') — this app has live polling /
      // websocket traffic, so the network never goes idle and networkidle stalls.
      await page.goto(BASE + route.path, {waitUntil: 'domcontentloaded', timeout: 45000});
      // Wait for real page content (client-fetched), not just the shell skeleton.
      await page.waitForSelector('main h1, h1, [data-page-title]', {timeout: 25000}).catch(() => {});
      await page.waitForTimeout(1500);

      const finalUrl = page.url();
      if (/\/auth\/login/.test(finalUrl)) {
        needsAuth.push(`${route.label} @${width}`);
        await ctx.close();
        continue;
      }

      // Horizontal overflow — the #1 responsive bug.
      const overflow = await page.evaluate(() => {
        const el = document.scrollingElement || document.documentElement;
        return {scrollW: el.scrollWidth, innerW: window.innerWidth};
      });
      const hasOverflow = overflow.scrollW > overflow.innerW + 1;
      if (hasOverflow) {
        failures.push(
          `OVERFLOW ${route.label} @${width}px: scrollW ${overflow.scrollW} > innerW ${overflow.innerW}`
        );
      }

      // Accent token presence on a primary action.
      const accent = await page.evaluate((accentRgb) => {
        const parse = (str) => {
          const m = str && str.match(/rgba?\(([^)]+)\)/);
          return m ? m[1].split(',').map((x) => parseFloat(x.trim())).slice(0, 3) : null;
        };
        const within = (a, b, tol) => a && b && a.every((v, i) => Math.abs(v - b[i]) <= tol);
        const els = Array.from(document.querySelectorAll('button, a[role="button"], .btn'));
        for (const el of els) {
          const cs = getComputedStyle(el);
          if (within(parse(cs.backgroundColor), accentRgb, 10) ||
              within(parse(cs.borderColor), accentRgb, 10)) return true;
        }
        return false;
      }, ACCENT_RGB);

      // Visible focus ring on first focusable.
      const focusRing = await page.evaluate(() => {
        const f = document.querySelector(
          'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (!f) return false;
        f.focus();
        const cs = getComputedStyle(f);
        const outline = cs.outlineStyle !== 'none' && cs.outlineWidth !== '0px';
        const shadow = cs.boxShadow && cs.boxShadow !== 'none';
        return !!(outline || shadow);
      });

      const file = `${OUT}/${route.label}_${width}.png`;
      await page.screenshot({path: file, fullPage: false});

      results.push({route: route.label, app: route.app, width, overflow: hasOverflow, accent, focusRing, file});
    } catch (e) {
      failures.push(`ERROR ${route.label} @${width}px: ${e.message.slice(0, 120)}`);
    } finally {
      await ctx.close();
    }
  }
}

await browser.close();
fs.writeFileSync(`${OUT}/report.json`, JSON.stringify({failures, needsAuth, results}, null, 2));

const overflowCount = results.filter((r) => r.overflow).length;
const noFocus = results.filter((r) => !r.focusRing).length;
console.log(`ROUTES: ${ROUTES.length}  SHOTS: ${results.length}  VIEWPORTS: ${VIEWPORTS.join('/')}`);
console.log(`NEEDS_AUTH: ${needsAuth.length ? needsAuth.join(', ') : '(none)'}`);
console.log(`OVERFLOW views: ${overflowCount}  NO_FOCUS_RING views: ${noFocus}`);
console.log(`FAILURES: ${failures.length}`);
failures.forEach((f) => console.log('  - ' + f));
/* eslint-enable no-console */
