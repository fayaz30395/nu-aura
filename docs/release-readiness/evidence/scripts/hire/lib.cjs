// Shared helpers for HRMS E2E. Password comes from env HIRE_DEMO_PW (never written to disk).
const { chromium } = require('/Users/fayaz.m/IdeaProjects/nulogic/nu-aura/frontend/node_modules/playwright');
const fs = require('fs'), path = require('path');
const EV = path.resolve(__dirname, '../..');
const FE = 'http://localhost:3000', BE = 'http://localhost:8080';
const stateFile = (r) => `${process.env.HIRE_STATE}/${r}.json`;
async function newCtx(browser, role, vp = { width: 1440, height: 900 }) {
  const opts = { viewport: vp };
  if (role && fs.existsSync(stateFile(role))) opts.storageState = stateFile(role);
  const c = await browser.newContext(opts); await rewrite(c); return c;
}
// local FE build posts to http://backend:8080 (docker hostname); map it to localhost:8080
async function rewrite(c) { await c.route(/^http:\/\/backend:8080\//, r => r.continue({ url: r.request().url().replace('http://backend:8080', 'http://localhost:8080') })); }
// attach collectors: console errors, failed requests, 4xx/5xx
function collect(page, bag) {
  page.on('console', m => { if (['error'].includes(m.type())) bag.console.push(m.text().slice(0, 300)); });
  page.on('pageerror', e => bag.pageerrors.push(String(e).slice(0, 300)));
  page.on('requestfailed', r => bag.failed.push(`${r.method()} ${r.url()} ${r.failure()?.errorText}`));
  page.on('response', r => { if (r.status() >= 400 && r.url().includes('/api/')) bag.http.push(`${r.status()} ${r.request().method()} ${r.url().replace(BE,'')}`); });
}
const bag = () => ({ console: [], pageerrors: [], failed: [], http: [] });
// API call from within the browser context (cookies + CSRF header)
async function api(ctx, method, url, body) {
  const cookies = await ctx.cookies(BE);
  const xsrf = (cookies.find(c => c.name === 'XSRF-TOKEN') || {}).value;
  const headers = { 'Content-Type': 'application/json' };
  if (xsrf) headers['X-XSRF-TOKEN'] = xsrf;
  const r = await ctx.request.fetch(BE + url, { method, headers, data: body ? JSON.stringify(body) : undefined });
  let j = null; try { j = await r.json(); } catch (e) {}
  return { status: r.status(), body: j };
}
module.exports = { rewrite, chromium, EV, FE, BE, stateFile, newCtx, collect, bag, api };
