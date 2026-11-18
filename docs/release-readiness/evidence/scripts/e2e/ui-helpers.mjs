// Shared page-level checks for the P0/P1/P2 UI phases. See lib.mjs for browser/login helpers.
import fs from 'fs';
import path from 'path';
import {FE, mkLog, watch, sleep} from './lib.mjs';

export const APP_DIR = '/Users/fayaz.m/IdeaProjects/nulogic/nu-aura/frontend/app';
export const ROLES = {employee: 'arun@nulogic.io', manager: 'sumit@nulogic.io', hradmin: 'admin@nulogic.io'};
export const VIEWPORTS = {desktop: {width: 1440, height: 900}, mobile: {width: 390, height: 844}};
export const BAD_TEXT = /\bundefined\b|\bnull\b|\bNaN\b|\[object Object\]/;
// Dev-only / library warnings that are not product bugs. Kept here so every phase classifies them the same way.
export const NOISE = [
  /Download the React DevTools/i, /width\(-?\d+\) and height\(-?\d+\) of chart/i, /WebSocket|sockjs|stomp/i,
  /Fast Refresh/i, /net::ERR_ABORTED/i, /favicon/i, /The resource .* was preloaded/i, /React DevTools/i,
];
export const isNoise = s => NOISE.some(r => r.test(s));

/** Static routes = every app/**\/page.tsx without a dynamic segment. Route groups "(x)" are stripped. */
export function staticRoutes(dir = APP_DIR, skip = ['/auth/logout']) {
  const out = [];
  const walk = (d, rel) => {
    for (const e of fs.readdirSync(d, {withFileTypes: true})) {
      if (e.isDirectory()) {
        if (e.name === 'api' || e.name.startsWith('[')) continue;
        if (e.name.startsWith('@') || e.name.startsWith('_')) continue;
        walk(path.join(d, e.name), e.name.startsWith('(') ? rel : `${rel}/${e.name}`);
      } else if (e.name === 'page.tsx' || e.name === 'page.ts') out.push(rel || '/');
    }
  };
  walk(dir, '');
  return [...new Set(out)].filter(r => !skip.includes(r)).sort();
}

/** DOM checks run after the page settled. Returns plain data only. */
export const domChecks = () => ({
  overflow: document.documentElement.scrollWidth > window.innerWidth + 1
    ? `${document.documentElement.scrollWidth}>${window.innerWidth}` : null,
  headings: document.querySelectorAll('h1, h2, [role="heading"]').length,
  h1: document.querySelectorAll('h1').length,
  badText: (() => {
    const re = /\bundefined\b|\bnull\b|\bNaN\b|\[object Object\]/;
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const hits = [];
    for (let n; (n = w.nextNode());) {
      const t = n.nodeValue; if (!t || !re.test(t)) continue;
      const el = n.parentElement; if (!el || el.closest('pre, code, script, style, noscript, textarea, [contenteditable]')) continue;
      const r = el.getBoundingClientRect(); if (!r.width || !r.height) continue;
      hits.push(t.trim().slice(0, 80)); if (hits.length >= 5) break;
    }
    return hits;
  })(),
  brokenImages: [...document.images].filter(i => i.complete && i.naturalWidth === 0 && i.src && !i.src.startsWith('data:'))
    .map(i => i.getAttribute('src')?.slice(0, 100)).slice(0, 5),
  // Mantine <Progress> bars (leave balances) use role=progressbar and decorative pulse dots are aria-hidden: neither is a loading state.
  spinners: [...document.querySelectorAll('[role="progressbar"]:not([class*="mantine-Progress"]):not([aria-valuenow]), .animate-spin, .animate-pulse:not([aria-hidden="true"]), [class*="skeleton" i], [aria-busy="true"], [data-loading="true"]')]
    .filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; }).length,
  title: document.title,
});

/** Open one route, settle, run checks. Retries once on timeout. */
export async function openAndCheck(ctx, route, {viewport = VIEWPORTS.desktop, timeout = 120000, settle = 10000} = {}) {
  const page = await ctx.newPage();
  await page.setViewportSize(viewport);
  page.on('dialog', d => d.dismiss().catch(() => {}));
  const log = mkLog(); watch(page, log);
  const res = {route, viewport: `${viewport.width}x${viewport.height}`, finalUrl: null, status: null, ms: 0, log, checks: null, error: null};
  const t0 = Date.now();
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const resp = await page.goto(FE + route, {waitUntil: 'domcontentloaded', timeout});
      res.status = resp?.status() ?? null;
      await page.waitForLoadState('networkidle', {timeout: 30000}).catch(() => {});
      // spinner/skeleton must be gone within `settle` ms
      await page.waitForFunction(() => !document.querySelector('[role="progressbar"], .animate-spin, [class*="skeleton" i], [aria-busy="true"]')
        || ![...document.querySelectorAll('[role="progressbar"], .animate-spin, [class*="skeleton" i], [aria-busy="true"]')].some(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; }),
        null, {timeout: settle}).catch(() => {});
      res.checks = await page.evaluate(domChecks);
      res.error = null; break;
    } catch (e) {
      res.error = String(e).split('\n')[0].slice(0, 200);
      if (!/Timeout/i.test(res.error)) break;
      await sleep(2000);
    }
  }
  res.finalUrl = page.url().replace(FE, '');
  res.ms = Date.now() - t0;
  res.log.console = res.log.console.filter(s => !isNoise(s));
  res.log.failed = res.log.failed.filter(s => !isNoise(s));
  return {page, res};
}

export const isRedirect = (res) => res.finalUrl && res.finalUrl.split('?')[0] !== res.route;
export const isDenied = (res) => /denied=1|\/auth\/login|\/403|\/unauthorized/.test(res.finalUrl || '') || (res.log.http || []).some(h => /^403 /.test(h));

/** True if the result has at least one failing check (ignoring redirect/deny semantics). */
export function failures(res) {
  const f = [];
  if (res.error) f.push(`error: ${res.error}`);
  const c = res.checks;
  if (res.log.console.length) f.push(`console: ${res.log.console.length}`);
  if (res.log.http.length) f.push(`http: ${res.log.http.join(' | ').slice(0, 300)}`);
  if (res.log.failed.length) f.push(`failed: ${res.log.failed.length}`);
  if (c) {
    if (c.overflow) f.push(`overflow ${c.overflow}`);
    if (c.badText.length) f.push(`badText: ${c.badText.join(' / ')}`);
    if (c.brokenImages.length) f.push(`brokenImages: ${c.brokenImages.join(', ')}`);
    if (c.spinners) f.push(`spinner after settle: ${c.spinners}`);
    if (!c.headings) f.push('no heading');
  }
  return f;
}

/** Hard stop so a script never hangs. Writes `onExit()` output before exiting. */
export function globalTimeout(ms, onExit) {
  const t = setTimeout(async () => { console.error(`GLOBAL TIMEOUT after ${ms / 60000} min`); try { await onExit?.(); } catch {} process.exit(3); }, ms);
  t.unref();
  return t;
}

/** Collect sidebar/rail hrefs the role can see across the four product roots. */
export async function menuRoutes(ctx) {
  const hrefs = new Set();
  for (const root of ['/app/hrms', '/app/hire', '/app/grow', '/app/fluence']) {
    const page = await ctx.newPage();
    try {
      await page.goto(FE + root, {waitUntil: 'domcontentloaded', timeout: 120000});
      await page.waitForLoadState('networkidle', {timeout: 30000}).catch(() => {});
      await page.waitForSelector('nav a[href^="/"], aside a[href^="/"]', {timeout: 30000}).catch(() => {});
      const links = await page.evaluate(() => [...document.querySelectorAll('nav a[href^="/"], aside a[href^="/"], header a[href^="/"]')].map(a => a.getAttribute('href').split('?')[0]));
      links.forEach(h => hrefs.add(h));
    } catch (e) { console.error('menuRoutes', root, String(e).slice(0, 120)); }
    await page.close();
  }
  return [...hrefs].filter(h => !/^\/auth\/logout/.test(h) && !/\[/.test(h)).sort();
}

// ───────── route access policy (frontend/lib/config/routes.ts, bundled on demand) ─────────
import {execFileSync} from 'child_process';
import {STATE} from './lib.mjs';
const FE_DIR = '/Users/fayaz.m/IdeaProjects/nulogic/nu-aura/frontend';
export async function loadRoutePolicy() {
  const out = `${STATE}/routes.bundle.mjs`;
  // banner: the bundle drags in CommonJS deps (axios/form-data) that call require() at load time.
  execFileSync(`${FE_DIR}/node_modules/.bin/esbuild`, [`${FE_DIR}/lib/config/routes.ts`, '--bundle', '--format=esm', '--platform=node', `--outfile=${out}`, '--log-level=error',
    `--banner:js=import {createRequire as __cr} from 'module'; const require = __cr(import.meta.url);`], {cwd: FE_DIR, stdio: 'pipe'});
  return import(out);
}
// isHR / isManager in lib/hooks/usePermissions.ts
const HR_ROLES = ['HR_ADMIN', 'HR_MANAGER', 'SUPER_ADMIN', 'TENANT_ADMIN', 'FINANCE_ADMIN', 'PAYROLL_ADMIN'];
const MGR_ROLES = ['MANAGER', 'TEAM_LEAD', 'DEPARTMENT_HEAD', 'DEPARTMENT_MANAGER', 'HR_MANAGER', 'HR_ADMIN', 'SUPER_ADMIN', 'TENANT_ADMIN'];
/** Mirrors AuthGuard + usePermissions: 'public' | 'auth' | 'allow' | 'deny'. */
export function expectedAccess(policy, route, {roles = [], permissions = []}) {
  if (policy.isPublicRoute(route)) return 'public';
  const cfg = policy.findRouteConfig(route);
  if (!cfg) return 'auth';
  const has = p => permissions.includes(p);
  const isSystemAdmin = has('SYSTEM:ADMIN') || has('HRMS:SYSTEM:ADMIN');
  const isAdmin = roles.includes('SUPER_ADMIN') || isSystemAdmin;
  if (isAdmin) return 'allow';
  if (cfg.permission && !has(cfg.permission)) return 'deny';
  if (cfg.anyPermission?.length && !cfg.anyPermission.some(has)) return 'deny';
  if (cfg.allPermissions?.length && !cfg.allPermissions.every(has)) return 'deny';
  if (cfg.anyRole?.length && !cfg.anyRole.some(r => roles.includes(r))) return 'deny';
  if (cfg.allRoles?.length && !cfg.allRoles.every(r => roles.includes(r))) return 'deny';
  if (cfg.adminOnly) return 'deny';
  if (cfg.hrOnly && !roles.some(r => HR_ROLES.includes(r))) return 'deny';
  if (cfg.managerOnly && !roles.some(r => MGR_ROLES.includes(r))) return 'deny';
  return 'allow';
}
/** roles + permission codes for the signed-in context; never returns tokens. */
export async function whoAmI(ctx) {
  const page = await ctx.newPage();
  await page.goto(`${FE}/me/dashboard`, {waitUntil: 'domcontentloaded', timeout: 120000});
  await page.waitForLoadState('networkidle', {timeout: 30000}).catch(() => {});
  const j = await page.evaluate(async () => { const r = await fetch('http://localhost:8080/api/v1/auth/me', {credentials: 'include'}); const b = await r.json().catch(() => ({})); return {status: r.status, roles: b.roles, permissions: b.permissions, email: b.email}; });
  await page.close();
  if (j.status !== 200 || !Array.isArray(j.roles)) throw new Error(`auth/me -> ${j.status}`);
  return {email: j.email, roles: j.roles.map(r => String(r.code || r).replace(/^ROLE_/, '')), permissions: (j.permissions || []).map(p => String(p.code || p))};
}

/** Routes listed in Part B of the plan (`| n | \`/route\` | ...`). */
export function catalogueRoutes(planFile) {
  return [...fs.readFileSync(planFile, 'utf8').matchAll(/^\| \d+ \| `(\/[^`]*)` \|/gm)].map(m => m[1]);
}
export const dynamicRoutes = (dir = APP_DIR) => {
  const out = []; const walk = (d, rel) => { for (const e of fs.readdirSync(d, {withFileTypes: true})) { if (!e.isDirectory() || e.name === 'api') continue; walk(path.join(d, e.name), e.name.startsWith('(') ? rel : `${rel}/${e.name}`); } if (fs.existsSync(path.join(d, 'page.tsx')) && /\[/.test(rel)) out.push(rel); };
  walk(dir, ''); return out.sort();
};

// Reviewed allowlists. Add an entry only with a reason; everything else is reported.
export const ALLOW_CONSOLE = [
  {re: /\[ApiClient\] Error: GET \S+ undefined canceled/, reason: 'axios request cancelled when the component unmounts (React dev double-mount); no user impact'},
];
export const ALLOW_HTTP = [
  {re: /^40[13] (GET|POST) \/api\/v1\/auth\/(me|refresh)/, reason: 'session refresh handshake'},
];
export const classifyHttp = h => {
  if (ALLOW_HTTP.some(a => a.re.test(h))) return 'allowed';
  const s = Number(h.slice(0, 3));
  if (s === 401 || s === 403) return 'authz';
  if (s === 404) return 'not-found';
  if (s === 400 || s === 409 || s === 422) return 'validation';
  return s >= 500 ? 'server' : 'other';
};
