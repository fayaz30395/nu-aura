// Shared helpers for HRMS E2E. Password comes from env HRMS_DEMO_PW (never written to disk).
const { chromium } = require('/Users/fayaz.m/IdeaProjects/nulogic/nu-aura/frontend/node_modules/playwright');
const fs = require('fs'), path = require('path');
const EV = path.resolve(__dirname, '../..');
const FE = 'http://localhost:3000', BE = 'http://localhost:8080';
const stateFile = (r) => `/private/tmp/claude-504/-Users-fayaz-m-IdeaProjects-nulogic-nu-aura/31fd4514-1941-4084-b1c8-e1a40e6df684/scratchpad/hrms-state/${r}.json`;
// ENV WORKAROUND (see defects-hrms.md DEF-HRMS-ENV): the running FE bundle has API base http://backend:8080/api/v1
// (docker hostname, unresolvable on host). We forward those requests to localhost:8080 through the context cookie jar.
async function proxyBackend(ctx, role) {
  await ctx.route('http://backend:8080/**', async (route) => {
    const req = route.request();
    const url = req.url().replace('http://backend:8080', BE);
    const headers = { ...req.headers() }; delete headers['host']; delete headers['cookie'];
    if (/\/ws\//.test(req.url())) return route.abort();
    // HARNESS: AUTH bucket is 5/min/IP shared by all agents (see DEF-HRMS-01). Serve /auth/me from a once-fetched cache per role.
    if (role && req.method() === 'GET' && /\/auth\/me(\?|$)/.test(req.url())) {
      const cf = stateFile(role).replace('.json', '.me.json');
      if (!fs.existsSync(cf)) { // prime cache: retry through the 429 contention
        for (let i = 0; i < 20; i++) { const r = await ctx.request.get(url, { failOnStatusCode: false }); if (r.status() === 200) { fs.writeFileSync(cf, await r.body()); break; } await new Promise(x => setTimeout(x, 12000)); }
      }
      if (fs.existsSync(cf)) return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': FE, 'access-control-allow-credentials': 'true' }, body: fs.readFileSync(cf) });
    }
    let resp;
    try { resp = await ctx.request.fetch(url, { method: req.method(), headers, data: req.postDataBuffer() || undefined, maxRedirects: 0, failOnStatusCode: false }); } catch (e) { return route.abort().catch(() => {}); }
    const h = { ...resp.headers() }; delete h['set-cookie']; delete h['content-encoding']; delete h['content-length']; delete h['transfer-encoding'];
    await route.fulfill({ status: resp.status(), headers: h, body: await resp.body() }).catch(() => {});
  });
}
async function newCtx(browser, role, vp = { width: 1440, height: 900 }) {
  const opts = { viewport: vp };
  if (role && fs.existsSync(stateFile(role))) opts.storageState = stateFile(role);
  const ctx = await browser.newContext(opts);
  await proxyBackend(ctx, role);
  return ctx;
}
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
module.exports = { proxyBackend, chromium, EV, FE, BE, stateFile, newCtx, collect, bag, api };
