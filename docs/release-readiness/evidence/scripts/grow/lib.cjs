// Shared helpers for grow agent. No secrets stored: password read from env DEMO_PW.
const { chromium } = require('/Users/fayaz.m/IdeaProjects/nulogic/nu-aura/frontend/node_modules/playwright');
const fs = require('fs'); const path = require('path'); const { execFileSync } = require('child_process');
const EV = path.resolve(__dirname, '..', '..'); // evidence/
const STATE = path.join(process.env.GROW_STATE || '/private/tmp/claude-504/grow-state'); fs.mkdirSync(STATE, { recursive: true });
const FE = 'http://localhost:3000', BE = 'http://localhost:8080';
const net = [];
const sleep = ms => new Promise(r => setTimeout(r, ms));
// call + transcript: appends to logs/grow/<id>.txt, returns response
async function call(id, who, method, url, body) {
  let r; for (let i = 0; i < 8; i++) { r = await api(who + '@nulogic.io', method, url, body); if (r.status !== 429) break; await sleep(20000); }
  fs.appendFileSync(path.join(EV, 'logs', 'grow', id + '.txt'), `${who} ${method} ${url} ${body ? JSON.stringify(body).slice(0, 300) : ''}\n  -> ${r.status} ${JSON.stringify(r.body).slice(0, 400)}\n`);
  return r;
}
async function apiLogin(email) {
  const f = path.join(STATE, email.split('@')[0] + '.json'); if (fs.existsSync(f)) return 'cached';
  for (let i = 0; i < 12; i++) {
    const r = await fetch(BE + '/api/v1/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: process.env.DEMO_PW }) });
    if (r.status === 429) { await new Promise(x => setTimeout(x, 30000)); continue; }
    if (r.status !== 200) return 'http' + r.status;
    const cookies = r.headers.getSetCookie().map(c => { const [nv] = c.split(';'); const i = nv.indexOf('='); return { name: nv.slice(0, i), value: nv.slice(i + 1), domain: 'localhost', path: '/' }; });
    fs.writeFileSync(f, JSON.stringify({ cookies, origins: [] })); return 'ok';
  }
  return '429';
}
// FE dev server was started with API origin http://backend:8080 (docker hostname, unresolvable on host). Reroute in-browser to localhost:8080 (test-harness only, no server change).
async function reroute(ctx) {
  await ctx.route(/^https?:\/\/backend:8080\//, async route => {
    const r = route.request(); try { const cs = await ctx.cookies(BE); const headers = { ...r.headers(), cookie: cs.map(c => c.name + '=' + c.value).join('; ') }; const resp = await route.fetch({ url: r.url().replace('http://backend:8080', BE), headers }); if (r.method() !== 'GET' && r.method() !== 'OPTIONS') { let t = ''; try { t = (await resp.text()).slice(0, 300); } catch {} net.push(`${resp.status()} ${r.method()} ${r.url().replace('http://backend:8080', '')} ${t}`); } else if (resp.status() >= 400) net.push(`${resp.status()} ${r.method()} ${r.url().replace('http://backend:8080', '')}`); await route.fulfill({ response: resp }); } catch (e) { await route.abort(); }
  });
}
async function newCtx(browser, email, vp = { width: 1440, height: 900 }) {
  const f = path.join(STATE, email.split('@')[0] + '.json');
  const ctx = await browser.newContext({ viewport: vp }); await reroute(ctx);
  if (fs.existsSync(f)) { const cs = JSON.parse(fs.readFileSync(f)).cookies.filter(c => !c.name.startsWith('__Host-')).map(c => ({ name: c.name, value: c.value, domain: 'localhost', path: '/', httpOnly: c.httpOnly, secure: false, sameSite: 'Lax' })); await ctx.addCookies(cs); }
  return ctx;
}
async function loginUI(browser, email, vp) {
  for (let i = 0; i < 6; i++) { try { return await loginOnce(browser, email, vp); } catch (e) { if (!/429/.test(e.message)) throw e; await new Promise(r => setTimeout(r, 25000)); } }
  throw new Error('login 429 persistent');
}
async function loginOnce(browser, email, vp = { width: 1440, height: 900 }) {
  const f = path.join(STATE, email.split('@')[0] + '.json');
  if (fs.existsSync(f)) return f;
  const ctx = await browser.newContext({ viewport: vp }); await reroute(ctx); const p = await ctx.newPage();
  await p.goto(FE + '/auth/login', { waitUntil: 'networkidle' });
  await p.fill('#login-email', email); await p.fill('#login-password', process.env.DEMO_PW);
  let st = null; p.on('response', r => { if (r.url().endsWith('/api/v1/auth/login')) st = r.status(); });
  await p.click('button[type=submit]:has-text("Sign in")'); await p.waitForTimeout(4000);
  if (st !== 200) { await ctx.close(); throw new Error('login http ' + st); }
  await ctx.storageState({ path: f }); await ctx.close(); return f;
}
function cookies(f) { return JSON.parse(fs.readFileSync(f)).cookies; }
async function api(email, method, url, body, opts = {}) {
  const f = path.join(STATE, email.split('@')[0] + '.json'); const cs = cookies(f);
  const ck = cs.map(c => c.name + '=' + c.value).join('; ');
  const xsrf = (cs.find(c => c.name === 'XSRF-TOKEN') || {}).value;
  const h = { Cookie: ck, 'Content-Type': 'application/json', Accept: 'application/json' };
  if (xsrf) h['X-XSRF-TOKEN'] = xsrf;
  const r = await fetch(BE + url, { method, headers: h, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text(); let j; try { j = JSON.parse(t); } catch { j = t; }
  return { status: r.status, body: j };
}
function db(sql) { return execFileSync('/Users/fayaz.m/IdeaProjects/nulogic/nu-aura/docs/release-readiness/evidence/scripts/hrms/db.sh', [sql]).toString().trim(); }
async function gotoAuthed(p, url) { // auth/me is rate-limited (429) on the shared stack; retry
  for (let i = 0; i < 10; i++) { await p.goto(FE + url, { waitUntil: 'domcontentloaded', timeout: 45000 }); await p.waitForTimeout(3500); if (!/auth\/login/.test(p.url())) return true; await new Promise(r => setTimeout(r, 20000)); }
  return false;
}
const results = []; 
function rec(id, scenario, status, notes, extra = {}) { results.push({ id, scenario, status, notes, ...extra }); console.log(`[${status}] ${id} ${scenario} :: ${notes}`); }
function save(name) { fs.writeFileSync(path.join(EV, 'logs', 'grow', name + '.json'), JSON.stringify(results, null, 2)); }
module.exports = { call, sleep, apiLogin, net, gotoAuthed, newCtx, reroute, chromium, EV, FE, BE, STATE, loginUI, api, db, rec, save, results, fs, path };
