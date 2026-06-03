import { chromium } from 'playwright';
import fs from 'fs';

const BASE = 'http://localhost:3000';
const OUT = '/tmp/aura-visual';
const ACCENT = '#2952a3';
const VIEWPORTS = [320, 768, 1024, 1440];
const THEMES = ['light', 'dark'];

// Routes to attempt. Each: path + label. Auth-gated ones get reported separately.
const ROUTES = [
  { path: '/auth/login', label: 'login' },
  { path: '/auth/signup', label: 'signup' },
  { path: '/auth/forgot-password', label: 'forgot-password' },
];

const hexToRgb = (h) => {
  const n = h.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16));
};
const ACCENT_RGB = hexToRgb(ACCENT);

async function setTheme(page, theme) {
  await page.evaluate((t) => {
    const html = document.documentElement;
    if (t === 'dark') {
      html.classList.add('dark');
      html.setAttribute('data-theme', 'dark');
    } else {
      html.classList.remove('dark');
      html.setAttribute('data-theme', 'light');
    }
  }, theme);
  await page.waitForTimeout(150);
}

async function isAuthGated(page) {
  // Redirected away from /auth/* to a protected/landing route, or shows a loader-only shell.
  const url = page.url();
  if (!/\/auth\//.test(url)) return true;
  return false;
}

const results = [];
const failures = [];
const covered = [];
const needsAuth = [];

const browser = await chromium.launch();

for (const route of ROUTES) {
  let gated = false;
  let routeHasAccent = false;
  let routeHasFocusRing = false;
  let routeHasMono = false;
  let themesRendered = 0;

  for (const width of VIEWPORTS) {
    for (const theme of THEMES) {
      const ctx = await browser.newContext({
        viewport: { width, height: 900 },
        deviceScaleFactor: 1,
        colorScheme: theme === 'dark' ? 'dark' : 'light',
      });
      const page = await ctx.newPage();
      try {
        await page.goto(BASE + route.path, {
          waitUntil: 'networkidle',
          timeout: 30000,
        });
        await page.waitForTimeout(400);

        if (await isAuthGated(page)) {
          gated = true;
          await ctx.close();
          continue;
        }

        await setTheme(page, theme);
        await page.waitForTimeout(300);

        // Body must have meaningful content
        const bodyText = (await page.evaluate(() => document.body.innerText || '')).trim();
        if (bodyText.length > 20) themesRendered++;

        // Horizontal overflow check
        const overflow = await page.evaluate(() => {
          const el = document.scrollingElement || document.documentElement;
          return { scrollW: el.scrollWidth, innerW: window.innerWidth };
        });
        const hasOverflow = overflow.scrollW > overflow.innerW + 1;
        if (hasOverflow) {
          failures.push(
            `${route.label} ${width}px ${theme}: horizontal overflow (scrollWidth ${overflow.scrollW} > innerWidth ${overflow.innerW})`
          );
        }

        // Accent on a primary action button (type=submit or .btn-primary-ish)
        const accentInfo = await page.evaluate((accentRgb) => {
          const within = (a, b, tol) => a && b && a.every((v, i) => Math.abs(v - b[i]) <= tol);
          const parse = (str) => {
            const m = str && str.match(/rgba?\(([^)]+)\)/);
            if (!m) return null;
            return m[1].split(',').map((x) => parseFloat(x.trim())).slice(0, 3);
          };
          const candidates = Array.from(
            document.querySelectorAll('button[type="submit"], button, a[role="button"], .btn')
          );
          for (const el of candidates) {
            const cs = getComputedStyle(el);
            const bg = parse(cs.backgroundColor);
            const border = parse(cs.borderColor);
            const color = parse(cs.color);
            if (within(bg, accentRgb, 8) || within(border, accentRgb, 8) || within(color, accentRgb, 8)) {
              return { found: true, where: 'button' };
            }
          }
          // also scan accent CSS var usage anywhere
          const root = getComputedStyle(document.documentElement)
            .getPropertyValue('--accent')
            .trim()
            .toLowerCase();
          return { found: false, rootAccent: root };
        }, ACCENT_RGB);
        if (accentInfo.found) routeHasAccent = true;
        else if (
          accentInfo.rootAccent &&
          accentInfo.rootAccent.replace(/\s/g, '') === ACCENT
        ) {
          // token present even if no button currently styled
        }

        // Roboto Mono tabular numerics: any element using mono font family
        const monoFound = await page.evaluate(() => {
          const els = Array.from(document.querySelectorAll('*')).slice(0, 4000);
          for (const el of els) {
            const ff = getComputedStyle(el).fontFamily.toLowerCase();
            if (ff.includes('roboto mono') || ff.includes('mono')) {
              const fvn = getComputedStyle(el).fontVariantNumeric || '';
              return { found: true, ff: ff.slice(0, 60), tabular: fvn };
            }
          }
          // check the css var is defined
          const v = getComputedStyle(document.documentElement)
            .getPropertyValue('--font-mono')
            .toLowerCase();
          return { found: v.includes('mono'), varOnly: true, varVal: v.slice(0, 60) };
        });
        if (monoFound.found) routeHasMono = true;

        // Focus ring on Tab
        const focusInfo = await page.evaluate(() => {
          // focus first focusable
          const f = document.querySelector(
            'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          if (!f) return { hasRing: false, reason: 'no-focusable' };
          f.focus();
          const cs = getComputedStyle(f);
          const outline =
            cs.outlineStyle !== 'none' &&
            cs.outlineWidth !== '0px' &&
            cs.outlineColor;
          const shadow = cs.boxShadow && cs.boxShadow !== 'none';
          // pseudo focus-visible ring often via box-shadow
          return {
            hasRing: !!(outline || shadow),
            outline: cs.outline,
            boxShadow: (cs.boxShadow || '').slice(0, 80),
          };
        });
        if (focusInfo.hasRing) routeHasFocusRing = true;

        // Screenshot
        const file = `${OUT}/${route.label}_${width}_${theme}.png`;
        await page.screenshot({ path: file, fullPage: false });

        results.push({
          route: route.label,
          width,
          theme,
          overflow: hasOverflow,
          accent: accentInfo.found,
          mono: monoFound.found,
          focusRing: focusInfo.hasRing,
          file,
        });
      } catch (e) {
        failures.push(`${route.label} ${width}px ${theme}: error ${e.message.slice(0, 120)}`);
      } finally {
        await ctx.close();
      }
    }
  }

  if (gated && themesRendered === 0) {
    needsAuth.push(route.label);
  } else {
    covered.push(route.label);
    // Per-route assertion summary
    if (!routeHasAccent) failures.push(`${route.label}: accent ${ACCENT} not detected on any primary action`);
    if (!routeHasFocusRing) failures.push(`${route.label}: no visible focus ring on focusable element`);
    if (themesRendered < 2) failures.push(`${route.label}: did not render in both themes (rendered ${themesRendered} theme-views)`);
    if (!routeHasMono) failures.push(`${route.label}: Roboto Mono / mono font not detected`);
  }
}

await browser.close();

fs.writeFileSync(
  `${OUT}/report.json`,
  JSON.stringify({ covered, needsAuth, failures, results }, null, 2)
);

/* eslint-disable no-console -- dev-only CLI script: stdout is the intended report channel */
console.log('COVERED:', covered.join(', ') || '(none)');
console.log('NEEDS_AUTH:', needsAuth.join(', ') || '(none)');
console.log('FAILURES:', failures.length);
failures.forEach((f) => console.log('  - ' + f));
console.log('SHOTS:', results.length);
/* eslint-enable no-console */
