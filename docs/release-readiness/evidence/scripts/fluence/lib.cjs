// Shared helpers: UI login once per account (storageState cached), API via page.request w/ CSRF header.
const { chromium } = require('/Users/fayaz.m/IdeaProjects/nulogic/nu-aura/frontend/node_modules/playwright');
const fs = require('fs');
const EV = '/Users/fayaz.m/IdeaProjects/nulogic/nu-aura/docs/release-readiness/evidence';
const STATE = '/private/tmp/claude-504/-Users-fayaz-m-IdeaProjects-nulogic-nu-aura/31fd4514-1941-4084-b1c8-e1a40e6df684/scratchpad/fluence-state';
fs.mkdirSync(STATE, { recursive: true });
const PW = process.env.FLUENCE_PW; // demo password from runbook, passed via env, never written
const FE = 'http://localhost:3000', BE = 'http://localhost:8080';
// ENV WORKAROUND: FE bundle API base is http://backend:8080 (docker host, see DEF-HRMS-ENV). Forward to localhost:8080 via context jar.
async function proxyBackend(ctx) {
  await ctx.route('http://backend:8080/**', async (route) => {
    const req = route.request();
    if (req.url().includes('/ws/')) return route.abort();
    // /auth/me and /auth/refresh share the contended 5/min auth bucket: serve /me from a once-fetched cache, neutralise refresh.
    if (req.url().endsWith('/api/v1/auth/me') && ctx.__me) return route.fulfill({ status: 200, contentType: 'application/json', body: ctx.__me });
    if (req.url().endsWith('/api/v1/auth/refresh') && ctx.__me) return route.fulfill({ status: 401, contentType: 'application/json', body: '{"error":"refresh disabled in harness"}' });
    const headers = { ...req.headers() }; delete headers['host']; delete headers['cookie'];
    let resp; try { resp = await ctx.request.fetch(req.url().replace('http://backend:8080', BE), { method: req.method(), headers, data: req.postDataBuffer() || undefined, maxRedirects: 0, failOnStatusCode: false, timeout: 20000 }); } catch (e) { return route.abort(); }
    const h = { ...resp.headers() }; for (const k of ['set-cookie','content-encoding','content-length','transfer-encoding']) delete h[k];
    await route.fulfill({ status: resp.status(), headers: h, body: await resp.body() });
  });
}
function collect(page, bag) {
  page.on('console', m => { if (m.type()==='error') { if (!/WebSocket|Framing|ERR_FAILED/.test(m.text())) bag.console.push(m.text().slice(0,250)); }; });
  page.on('pageerror', e => bag.pageerrors.push(String(e).slice(0,250)));
  page.on('response', r => { if (r.status()>=400 && r.url().includes('/api/')) bag.http.push(`${r.status()} ${r.request().method()} ${r.url().replace(BE,'').replace('http://backend:8080','')}`); });
}
const newBag = () => ({ console: [], pageerrors: [], http: [] });
async function loadMe(ctx, email) {
  const mf = `${STATE}/${email.split('@')[0]}.me.txt`;
  if (fs.existsSync(mf)) { ctx.__me = fs.readFileSync(mf, 'utf8'); return; }
  for (let i = 0; i < 8; i++) {
    const r = await ctx.request.get(BE + '/api/v1/auth/me', { failOnStatusCode: false });
    if (r.status() === 200) { ctx.__me = await r.text(); fs.writeFileSync(mf, ctx.__me); return; }
    await new Promise(res => setTimeout(res, 65000));
  }
}
async function ctxFor(browser, email, viewport = { width: 1440, height: 900 }) {
  const c = await ctxFor0(browser, email, viewport); await loadMe(c, email); return c;
}
async function ctxFor0(browser, email, viewport = { width: 1440, height: 900 }) {
  const f = `${STATE}/${email.split('@')[0]}.json`;
  if (fs.existsSync(f)) { const c = await browser.newContext({ storageState: f, viewport }); await proxyBackend(c); return c; }
  const ctx = await browser.newContext({ viewport }); await proxyBackend(ctx);
  // Shared 5/min login bucket is contended by parallel agents: retry on 429 honouring Retry-After.
  for (let i = 0; i < 8; i++) {
    const r = await ctx.request.post(BE + '/api/v1/auth/login', { data: { email, password: PW }, failOnStatusCode: false });
    if (r.status() === 200) break;
    if (r.status() !== 429) throw new Error('login ' + email + ' status ' + r.status());
    await new Promise(res => setTimeout(res, 65000));
    if (i === 7) throw new Error('login rate-limited too long');
  }
  const p = await ctx.newPage();
  await ctx.storageState({ path: f });
  await p.close();
  return ctx;
}
async function api(ctx, method, path, body) {
  const cookies = await ctx.cookies(BE);
  const x = (await ctx.cookies()).find(c => c.name === 'XSRF-TOKEN');
  const opts = { headers: { 'Content-Type': 'application/json', ...(x ? { 'X-XSRF-TOKEN': x.value } : {}) } };
  if (body !== undefined) opts.data = body;
  const r = await ctx.request.fetch(BE + path, { method, ...opts });
  let t = await r.text(); let j; try { j = JSON.parse(t); } catch { j = t; }
  return { status: r.status(), body: j };
}
module.exports = { collect, newBag, chromium, ctxFor, api, EV, FE, BE };
