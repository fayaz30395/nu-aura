import { chromium } from 'playwright';
import fs from 'fs';

const BASE = 'http://localhost:3000';
const OUT = '/tmp/aura-visual-full';
// Accent differs per theme: #2952A3 (light) shifts to #6884dc (dark) by design.
const ACCENT_LIGHT = '#2952a3';
const ACCENT_DARK = '#6884dc';
const VIEWPORTS = [320, 768, 1024, 1440];
const THEMES = ['light', 'dark'];

// Candidate routes. Auth-gated ones are detected at runtime (redirect to /auth/login).
const ROUTES = [
  { path: '/', label: 'home' },
  { path: '/auth/login', label: 'login' },
  { path: '/auth/signup', label: 'signup' },
  { path: '/auth/forgot-password', label: 'forgot-password' },
  { path: '/careers', label: 'careers' },
  { path: '/pricing', label: 'pricing' },
  { path: '/about', label: 'about' },
  { path: '/contact', label: 'contact' },
  { path: '/features', label: 'features' },
];

const hexToRgb = (h) => {
  const n = h.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16));
};
const ACCENT_RGB = { light: hexToRgb(ACCENT_LIGHT), dark: hexToRgb(ACCENT_DARK) };

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
  await page.waitForTimeout(200);
}

const results = [];
const failures = [];
const covered = new Set();
const needsAuth = new Set();
const shots = [];

const browser = await chromium.launch();

for (const route of ROUTES) {
  let gated = false;
  const flags = { accent: false, focusRing: false, mono: false, tabular: false, themesRendered: 0 };

  for (const width of VIEWPORTS) {
    for (const theme of THEMES) {
      const ctx = await browser.newContext({
        viewport: { width, height: 900 },
        deviceScaleFactor: 1,
        colorScheme: theme === 'dark' ? 'dark' : 'light',
      });
      const page = await ctx.newPage();
      try {
        const resp = await page.goto(BASE + route.path, {
          waitUntil: 'domcontentloaded',
          timeout: 45000,
        });
        await page.waitForTimeout(700);

        // Auth gate: redirected off the requested route to the login page.
        const finalUrl = page.url();
        const redirectedToLogin =
          !route.path.startsWith('/auth') && /\/auth\/login/.test(finalUrl);
        if (redirectedToLogin || (resp && resp.status() >= 400 && resp.status() !== 404 === false && resp.status() >= 500)) {
          gated = redirectedToLogin;
          await ctx.close();
          continue;
        }

        await setTheme(page, theme);
        await page.waitForTimeout(300);

        const bodyText = (await page.evaluate(() => document.body.innerText || '')).trim();
        if (bodyText.length > 20) flags.themesRendered++;

        // Horizontal overflow
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

        // Accent on a primary action (submit/button/CTA): bg, border or text matches theme accent
        const accentInfo = await page.evaluate((accentRgb) => {
          const within = (a, b, tol) => a && b && a.every((v, i) => Math.abs(v - b[i]) <= tol);
          const parse = (str) => {
            const m = str && str.match(/rgba?\(([^)]+)\)/);
            if (!m) return null;
            return m[1].split(',').map((x) => parseFloat(x.trim())).slice(0, 3);
          };
          const candidates = Array.from(
            document.querySelectorAll(
              'button[type="submit"], button, a[role="button"], a.btn, [class*="btn-primary"], [class*="bg-accent"]'
            )
          );
          for (const el of candidates) {
            const cs = getComputedStyle(el);
            for (const v of [cs.backgroundColor, cs.borderColor, cs.color]) {
              if (within(parse(v), accentRgb, 12)) return { found: true };
            }
          }
          return { found: false };
        }, ACCENT_RGB[theme]);
        if (accentInfo.found) flags.accent = true;

        // Mono font + tabular numerics
        const monoInfo = await page.evaluate(() => {
          const els = Array.from(document.querySelectorAll('*')).slice(0, 6000);
          let mono = false;
          let tabular = false;
          for (const el of els) {
            const cs = getComputedStyle(el);
            const ff = cs.fontFamily.toLowerCase();
            if (ff.includes('mono')) {
              mono = true;
              const fvn = (cs.fontVariantNumeric || '').toLowerCase();
              if (fvn.includes('tabular')) tabular = true;
            }
          }
          // Token fallback
          const varMono = getComputedStyle(document.documentElement)
            .getPropertyValue('--font-mono')
            .toLowerCase();
          return { mono: mono || varMono.includes('mono'), tabular };
        });
        if (monoInfo.mono) flags.mono = true;
        if (monoInfo.tabular) flags.tabular = true;

        // Focus ring via real Tab key press
        const focusInfo = await page.evaluate(() => {
          if (document.activeElement && document.activeElement !== document.body) {
            document.activeElement.blur();
          }
          return true;
        });
        await page.keyboard.press('Tab');
        await page.waitForTimeout(120);
        const ring = await page.evaluate(() => {
          const el = document.activeElement;
          if (!el || el === document.body) return { hasRing: false, reason: 'no-active' };
          const cs = getComputedStyle(el);
          const outline =
            cs.outlineStyle !== 'none' && cs.outlineWidth !== '0px' && cs.outlineColor;
          const shadow = cs.boxShadow && cs.boxShadow !== 'none';
          const ringClass = /ring|focus/.test(el.className || '');
          return { hasRing: !!(outline || shadow || ringClass), tag: el.tagName };
        });
        if (ring.hasRing) flags.focusRing = true;

        // Screenshot
        const file = `${OUT}/${route.label}_${width}_${theme}.png`;
        await page.screenshot({ path: file, fullPage: false });
        shots.push(file);

        results.push({
          route: route.label,
          width,
          theme,
          overflow: hasOverflow,
          accent: accentInfo.found,
          mono: monoInfo.mono,
          tabular: monoInfo.tabular,
          focusRing: ring.hasRing,
          file,
        });
      } catch (e) {
        failures.push(`${route.label} ${width}px ${theme}: error ${String(e.message).slice(0, 140)}`);
      } finally {
        await ctx.close();
      }
    }
  }

  if (gated && flags.themesRendered === 0) {
    needsAuth.add(route.label);
  } else if (flags.themesRendered > 0) {
    covered.add(route.label);
    if (!flags.accent) failures.push(`${route.label}: accent (#2952A3 light / #6884dc dark) not detected on any primary action`);
    if (!flags.focusRing) failures.push(`${route.label}: no visible focus ring after Tab press`);
    if (flags.themesRendered < 2) failures.push(`${route.label}: did not render in both themes (rendered ${flags.themesRendered} theme-views)`);
    if (!flags.mono) failures.push(`${route.label}: Roboto Mono / mono font not detected`);
    if (!flags.tabular) failures.push(`${route.label}: tabular-nums (font-variant-numeric) not detected on mono text`);
  } else {
    needsAuth.add(route.label);
  }
}

await browser.close();

const report = {
  covered: [...covered],
  needsAuth: [...needsAuth],
  failures,
  shotsCount: shots.length,
  results,
};
fs.writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 2));

console.log('COVERED:', [...covered].join(', ') || '(none)');
console.log('NEEDS_AUTH:', [...needsAuth].join(', ') || '(none)');
console.log('SHOTS:', shots.length);
console.log('FAILURES:', failures.length);
failures.forEach((f) => console.log('  - ' + f));
