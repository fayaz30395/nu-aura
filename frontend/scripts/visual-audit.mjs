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
const THEME = process.env.AUDIT_THEME === 'dark' ? 'dark' : 'light';

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
      colorScheme: THEME,
    });
    // Force the app's persisted theme before any page script runs so the
    // FOUC theme-script applies .dark synchronously (matches real users).
    await ctx.addInitScript((t) => {
      try { localStorage.setItem('nu-aura-theme', t); } catch (e) { /* noop */ }
    }, THEME);
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

      // Clipped controls — buttons/links whose right edge is cut off by the
      // viewport even when the document itself does not scroll (the #1 mobile
      // header papercut: an action button sliced off the right edge).
      const clipped = await page.evaluate(() => {
        const vw = window.innerWidth;
        const hits = [];
        for (const el of document.querySelectorAll('button, a[role="button"], .btn, [class*="Button"]')) {
          const r = el.getBoundingClientRect();
          if (r.width === 0 || r.height === 0) continue;
          // visibly clipped: starts on-screen but extends >4px past the right edge
          if (r.left < vw - 8 && r.right > vw + 4) {
            hits.push((el.textContent || el.getAttribute('aria-label') || 'control').trim().slice(0, 24));
          }
        }
        return hits;
      });
      if (clipped.length) {
        failures.push(`CLIPPED ${route.label} @${width}px: ${clipped.join(' | ')}`);
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

      // Dark-mode specific checks.
      let darkApplied = null;
      let lightSurfaces = [];
      let lowContrast = [];
      if (THEME === 'dark') {
        const dark = await page.evaluate(() => {
          const isDark = document.documentElement.classList.contains('dark');
          const parse = (str) => {
            const m = str && str.match(/rgba?\(([^)]+)\)/);
            return m ? m[1].split(',').map((x) => parseFloat(x.trim())) : null;
          };
          const lum = (rgb) => {
            const [r, g, b] = rgb.slice(0, 3).map((v) => {
              const s = v / 255;
              return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
            });
            return 0.2126 * r + 0.7152 * g + 0.0722 * b;
          };
          const ratio = (a, b) => {
            const l1 = lum(a), l2 = lum(b);
            return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
          };
          // effective background: walk up until a non-transparent bg.
          const bgOf = (el) => {
            let n = el;
            while (n) {
              const c = parse(getComputedStyle(n).backgroundColor);
              if (c && (c.length < 4 || c[3] > 0.5)) return c;
              n = n.parentElement;
            }
            return [10, 13, 26]; // app dark bg fallback
          };
          const surfaces = [];
          const contrast = [];
          const all = Array.from(document.querySelectorAll('body *')).slice(0, 2500);
          for (const el of all) {
            const r = el.getBoundingClientRect();
            if (r.width < 40 || r.height < 24 || r.bottom < 0 || r.top > innerHeight) continue;
            const cs = getComputedStyle(el);
            const bg = parse(cs.backgroundColor);
            // light surface stuck in dark mode: large, opaque, near-white bg.
            if (bg && (bg.length < 4 || bg[3] > 0.6) && bg[0] > 232 && bg[1] > 232 && bg[2] > 232 &&
                r.width * r.height > 8000) {
              const tag = (el.className && typeof el.className === 'string' ? '.' + el.className.split(' ')[0] : el.tagName.toLowerCase());
              if (!surfaces.includes(tag)) surfaces.push(tag);
            }
            // low-contrast visible text.
            const txt = (el.childNodes && Array.from(el.childNodes).some((c) => c.nodeType === 3 && c.textContent.trim().length > 1));
            if (txt) {
              const fg = parse(cs.color);
              const fs = parseFloat(cs.fontSize) || 14;
              const bold = (parseInt(cs.fontWeight, 10) || 400) >= 600;
              const large = fs >= 24 || (fs >= 18.66 && bold);
              if (fg && fg[3] !== 0) {
                const cr = ratio(fg, bgOf(el));
                if (cr < (large ? 3 : 4.5)) {
                  const t = el.textContent.trim().slice(0, 22);
                  contrast.push(`${t} (${cr.toFixed(1)}:1)`);
                }
              }
            }
          }
          return {isDark, surfaces: surfaces.slice(0, 6), contrast: contrast.slice(0, 6)};
        });
        darkApplied = dark.isDark;
        lightSurfaces = dark.surfaces;
        lowContrast = dark.contrast;
        if (!dark.isDark) failures.push(`DARK-NOT-APPLIED ${route.label} @${width}px`);
        if (lightSurfaces.length) failures.push(`LIGHT-SURFACE-IN-DARK ${route.label} @${width}px: ${lightSurfaces.join(' ')}`);
        if (lowContrast.length) failures.push(`LOW-CONTRAST ${route.label} @${width}px: ${lowContrast.join(' | ')}`);
      }

      const file = `${OUT}/${route.label}_${width}${THEME === 'dark' ? '_dark' : ''}.png`;
      await page.screenshot({path: file, fullPage: false});

      results.push({route: route.label, app: route.app, width, theme: THEME, overflow: hasOverflow, accent, focusRing, darkApplied, lightSurfaces, lowContrast, file});
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
