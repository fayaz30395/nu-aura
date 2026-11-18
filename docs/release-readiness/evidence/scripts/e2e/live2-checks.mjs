// live2 manual checks: H-011/H-012/H-021/H-002/Q-010/V350/Q-027. Run from repo root.
import {chromium, newContext, FE, SS, mkLog, watch} from './lib.mjs';
const T = 'NUAURA_TEST_LIVE2_' + Date.now().toString().slice(-5);
const only = process.argv[2];
const b = await chromium.launch();
const D = '[role=dialog][aria-labelledby^=modal-title] ';
const go = async (p, r, ms = 2500) => { await p.goto(FE + r, {waitUntil: 'domcontentloaded', timeout: 120000}); await p.waitForLoadState('networkidle', {timeout: 40000}).catch(() => {}); await p.waitForTimeout(ms); };
const toasts = p => p.evaluate(() => [...document.querySelectorAll('[role=status],[role=alert],[data-testid=toast-host] *,[data-sonner-toast]')].map(e => e.innerText?.replace(/\s+/g, ' ').trim()).filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).slice(0, 4));
const sec = async (name, fn) => { if (only && only !== name) return; console.log('=== ' + name); try { await fn(); } catch (e) { console.log('ERR', name, String(e).slice(0, 300)); } };

await sec('H011', async () => {
  const ctx = await newContext(b, {role: 'hradmin'}); const p = await ctx.newPage(); const log = mkLog(); watch(p, log);
  p.on('response', async r => { if (/\/api\/v1\/recruitment/.test(r.url()) && r.request().method() !== 'GET') console.log('  API', r.status(), r.request().method(), r.url().replace(/^.*\/api/, ''), (await r.text().catch(() => '')).slice(0, 140)); });
  await go(p, '/recruitment/jobs');
  await p.getByRole('button', {name: /^Create Job Opening$/}).first().click(); await p.waitForTimeout(800);
  await p.locator('[role=dialog] [name=jobCode]').fill(T + '-J'); await p.locator('[role=dialog] [name=jobTitle]').fill('<script>alert(1)</script>');
  await p.locator('[role=dialog] select[name=departmentId]').selectOption({index: 1});
  await p.locator('[role=dialog] button[type=submit]').click(); await p.waitForTimeout(2500);
  console.log('H-011 toasts', JSON.stringify(await toasts(p)), '| dialog tail:', (await p.locator('[role=dialog]').first().innerText().catch(() => '')).replace(/\s+/g, ' ').slice(-220));
  await p.screenshot({path: SS + '/live2-h011.png'});
  await ctx.close();
});

await sec('H012', async () => {
  const ctx = await newContext(b, {role: 'hradmin'}); const p = await ctx.newPage();
  p.on('response', async r => { if (/\/api\/v1\/recruitment/.test(r.url()) && r.request().method() !== 'GET') console.log('  API', r.status(), r.request().method(), r.url().replace(/^.*\/api/, ''), (await r.text().catch(() => '')).slice(0, 140)); });
  await go(p, '/recruitment/candidates');
  const jobs = await p.locator(D.trim() + ' select[name=jobOpeningId] option').allTextContents().catch(() => []);
  async function cand(label, code, email) {
    await p.getByRole('button', {name: /^Add Candidate$/}).click(); await p.waitForTimeout(800);
    const sel = p.locator(D + 'select[name=jobOpeningId]'); const opts = await sel.locator('option').allTextContents(); const pick = opts.findIndex((o, i) => i > 0 && o.trim()); await sel.selectOption({index: pick});
    await p.locator(D + '[name=candidateCode]').fill(code); await p.locator(D + '[name=firstName]').fill('Live'); await p.locator(D + '[name=lastName]').fill(T); await p.locator(D + '[name=email]').fill(email);
    const dflt = {phone: '9876500009', totalExperience: 2, currentCtc: 100, expectedCtc: 200, noticePeriodDays: 10}; for (const [k, v] of Object.entries(dflt)) await p.locator(D + `[name=${k}]`).fill(String(v));
    await p.locator(D + 'button[type=submit]').click(); await p.waitForTimeout(2500);
    const n = await p.locator('[role=dialog][aria-labelledby^=modal-title]').count();
    console.log(`  ${label}: dialog-open=${n} toasts=${JSON.stringify(await toasts(p))} text=${JSON.stringify(((await p.locator('[role=dialog]').first().innerText().catch(() => '')).match(/[^\n]*(already|exists|duplicate|failed)[^\n]*/gi) || []).slice(0, 2))}`);
    if (label === 'dup') await p.screenshot({path: SS + '/live2-h012.png'});
    if (n) { await p.keyboard.press('Escape'); await p.waitForTimeout(500); }
  }
  await cand('first', T + '-C1', `live2.${Date.now() % 100000}@example.test`);
  await cand('dup', T + '-C1', `live2.b${Date.now() % 100000}@example.test`);
  await ctx.close();
});

await sec('H021', async () => {
  const ctx = await newContext(b, {role: 'hradmin', viewport: {width: 390, height: 844}}); const p = await ctx.newPage();
  await go(p, '/onboarding/templates/new');
  await p.locator('[name=name]').fill(T + ' Onb'); await p.getByRole('button', {name: /CREATE & CONFIGURE/i}).click(); await p.waitForURL(u => !/templates\/new/.test(u.toString()), {timeout: 45000}).catch(() => {});
  console.log('H-021 url after click:', p.url().replace(FE, '')); await p.screenshot({path: SS + '/live2-h021-390.png'});
  await ctx.close();
});

await sec('H002', async () => {
  const ctx = await newContext(b, {role: 'hradmin', viewport: {width: 390, height: 844}});
  for (const route of ['/recruitment', '/recruitment/jobs', '/recruitment/candidates', '/recruitment/interviews', '/recruitment/pipeline', '/recruitment/agencies', '/recruitment/scorecards', '/preboarding', '/onboarding', '/onboarding/templates', '/recruitment/job-boards']) {
    const p = await ctx.newPage(); await go(p, route);
    const r = await p.evaluate(() => { const els = [...document.querySelectorAll('main button, main a')].filter(e => e.offsetParent); let blocked = 0, tot = 0; for (const e of els.slice(0, 8)) { const r = e.getBoundingClientRect(); if (!r.width || r.bottom < 0 || r.top > innerHeight) continue; tot++; const t = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); if (t && !e.contains(t) && !t.contains(e)) blocked++; } return {tot, blocked}; });
    console.log('H-002', route, JSON.stringify(r)); if (route === '/recruitment/jobs') await p.screenshot({path: SS + '/live2-h002-390.png'}); await p.close();
  }
  await ctx.close();
});

await sec('Q010', async () => {
  const ctx = await newContext(b, {role: 'hradmin'}); const p = await ctx.newPage();
  await p.route(/\/api\/v1\/(payroll|recruitment|one-on-one)/, r => r.abort('failed')).catch(() => {});
  for (const route of ['/payroll', '/recruitment/candidates', '/one-on-one']) {
    const q = await ctx.newPage(); await q.route(/\/api\/v1\//, r => /auth|permissions/.test(r.request().url()) ? r.continue() : r.fulfill({status: 500, contentType: 'application/json', body: '{"message":"x"}'}));
    const t0 = Date.now(); await q.goto(FE + route, {waitUntil: 'domcontentloaded', timeout: 120000});
    let tErr = null; for (let i = 0; i < 60; i++) { await q.waitForTimeout(1000); const s = await q.evaluate(() => ({sp: [...document.querySelectorAll('.animate-spin,[class*=skeleton],[role=progressbar]')].filter(e => e.offsetParent).length, err: /something went wrong|failed to load|try again|retry|error/i.test(document.body.innerText)})); if (s.err) { tErr = Date.now() - t0; break; } }
    console.log('Q-010', route, 'error text after ms:', tErr); await q.close();
  }
  await ctx.close();
});

await sec('Q027', async () => {
  const ctx = await newContext(b, {role: 'hradmin'});
  await ctx.addInitScript(() => { try { localStorage.setItem('nu-aura-theme', 'dark'); } catch {} });
  for (const [n, r] of [['dashboard', '/me/dashboard'], ['employees', '/employees'], ['recruitment', '/recruitment'], ['performance', '/performance'], ['fluence-wall', '/fluence/wall'], ['settings', '/settings'], ['departments', '/admin/departments']]) {
    const p = await ctx.newPage(); await go(p, r, 3500);
    const info = await p.evaluate(() => ({dark: document.documentElement.classList.contains('dark'), bg: getComputedStyle(document.body).backgroundColor, light: [...document.querySelectorAll('main *')].filter(e => { const b = e.getBoundingClientRect(); if (b.width * b.height < 12000) return false; const m = getComputedStyle(e).backgroundColor.match(/[\d.]+/g); if (!m) return false; const [r, g, bl, a = 1] = m.map(Number); return a > 0.5 && (0.2126 * r + 0.7152 * g + 0.0722 * bl) / 255 > 0.85; }).slice(0, 3).map(e => e.tagName + '.' + String(e.className).slice(0, 60))}));
    console.log('Q-027', n, p.url().replace(FE, ''), JSON.stringify(info)); await p.screenshot({path: `${SS}/live2-dark-${n}.png`}); await p.close();
  }
  await ctx.close();
});

await sec('V350', async () => {
  const mgr = await newContext(b, {role: 'manager'}); const p = await mgr.newPage(); const h = mkLog(); watch(p, h);
  await go(p, '/one-on-one', 3500); console.log('V350 mgr /one-on-one url', p.url().replace(FE, ''), 'http', JSON.stringify(h.http.filter(x => /^40[13]/.test(x)).slice(0, 5)));
  await p.screenshot({path: SS + '/live2-v350-mgr-1on1.png'});
  const btn = p.getByRole('button', {name: /schedule|new|add|create/i}).first();
  if (await btn.count()) { await btn.click().catch(() => {}); await p.waitForTimeout(2000); console.log('  after click http', JSON.stringify(h.http.filter(x => /^40[13]/.test(x)).slice(0, 5)), 'dialog', await p.locator('[role=dialog]').count(), 'options', JSON.stringify(await p.locator('[role=dialog] select option, [role=dialog] [role=option]').allTextContents().then(a => a.slice(0, 4)).catch(() => []))); await p.screenshot({path: SS + '/live2-v350-mgr-1on1-dlg.png'}); }
  await p.close();
  for (const r of ['/training', '/training/catalog', '/training/my-learning']) { const q = await mgr.newPage(); const l = mkLog(); watch(q, l); await go(q, r, 3500); console.log('V350 mgr', r, '->', q.url().replace(FE, ''), 'authz', JSON.stringify(l.http.filter(x => /^40[13]/.test(x)).slice(0, 4))); if (r === '/training') await q.screenshot({path: SS + '/live2-v350-mgr-training.png'}); await q.close(); }
  await mgr.close();
  const hr = await newContext(b, {role: 'hradmin'});
  const q = await hr.newPage(); const l = mkLog(); watch(q, l);
  for (const r of ['/training/certificates', '/learning/certificates', '/lms/certificates']) { await go(q, r, 3000); console.log('V350 hr', r, '->', q.url().replace(FE, ''), 'authz', JSON.stringify(l.http.filter(x => /^40[13]/.test(x)).slice(0, 4)), 'text', (await q.locator('main').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 120)); }
  await q.screenshot({path: SS + '/live2-v350-hr-cert.png'});
  const j = await q.evaluate(async () => { const r = await fetch('http://backend:8080/api/v1/recruitment/offer-templates?page=0&size=10', {credentials: 'include'}); return {s: r.status, b: (await r.text()).slice(0, 300)}; });
  console.log('V350 hr offer-templates API', j.s, j.b.replace(/\s+/g, ' ').slice(0, 250));
  await hr.close();
});
await b.close();
