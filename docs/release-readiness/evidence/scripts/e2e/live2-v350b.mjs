import {chromium, newContext, FE, SS, mkLog, watch} from './lib.mjs';
const b = await chromium.launch();
const go = async (p, r, ms = 3000) => { await p.goto(FE + r, {waitUntil: 'domcontentloaded', timeout: 180000}); await p.waitForLoadState('networkidle', {timeout: 8000}).catch(() => {}); await p.waitForTimeout(ms); };
const mgr = await newContext(b, {role: 'manager'});
for (const r of ['/training/catalog', '/one-on-one']) { const q = await mgr.newPage(); const l = mkLog(); watch(q, l); await go(q, r); console.log('mgr', r, '->', q.url().replace(FE, ''), 'authz', JSON.stringify(l.http.filter(x => /^40[13]/.test(x)).slice(0, 4)), 'text', (await q.locator('main').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 100)); if (r==='/training/catalog') await q.screenshot({path: SS + '/live2-v350-mgr-catalog.png'}); await q.close(); }
const hr = await newContext(b, {role: 'hradmin'}); const q = await hr.newPage(); const l = mkLog(); watch(q, l);
await go(q, '/learning/certificates'); console.log('hr /learning/certificates ->', q.url().replace(FE, ''), 'authz', JSON.stringify(l.http.filter(x => /^40[13]/.test(x)).slice(0, 4)), 'text', (await q.locator('main').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 140));
await q.screenshot({path: SS + '/live2-v350-hr-cert.png'});
for (const u of ['/api/v1/recruitment/offer-templates?page=0&size=10', '/api/v1/lms/certificates?page=0&size=5']) {
  const j = await q.evaluate(async u => { const r = await fetch('http://backend:8080' + u, {credentials: 'include'}); return {s: r.status, b: (await r.text()).slice(0, 260)}; }, u); console.log('hr API', u, j.s, j.b.replace(/\s+/g, ' '));
}
await b.close();
