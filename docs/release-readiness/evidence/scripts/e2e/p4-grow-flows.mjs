// P4 - NU-Grow flows. node p4-grow-flows.mjs [--only G1,G2]. Roles use p4emp/p4manager/p4hradmin states (p4-login.mjs).
import fs from 'fs';
import {chromium, newContext, watch, mkLog, FE, EV, SS, rec, results, sleep} from './lib.mjs';
import {globalTimeout, isNoise} from './ui-helpers.mjs';
const TAG = 'NUAURA_TEST_P4_' + Date.now().toString().slice(-6);
const only = (() => { const i = process.argv.indexOf('--only'); return i > 0 ? process.argv[i + 1].split(',') : null; })();
globalTimeout(25 * 60000);
const b = await chromium.launch();
const iso = (d, n = 0) => new Date(d.getTime() + n * 86400000).toISOString().slice(0, 10);
const today = new Date();
async function open(ctx, route, wait = 1500) {
  const p = await ctx.newPage(); const log = mkLog(); watch(p, log); p.on('dialog', d => d.dismiss().catch(() => {}));
  await p.goto(FE + route, {waitUntil: 'domcontentloaded', timeout: 90000});
  await p.waitForLoadState('networkidle', {timeout: 20000}).catch(() => {}); await sleep(wait);
  return {p, log};
}
const toast = async p => (await p.locator('[role="status"], [role="alert"], [data-sonner-toast], [class*="toast" i], [class*="Notification"]').allInnerTexts().catch(() => [])).join(' | ').replace(/\s+/g, ' ').slice(0, 200);
const body = p => p.evaluate(() => (document.querySelector('main')?.innerText || document.body.innerText).replace(/\s+/g, ' '));
const dlg = p => p.evaluate(() => (document.querySelector('[role=dialog]')?.innerText || '').replace(/\s+/g, ' ').slice(0, 400));
export async function flow(id, name, ctx, route, fn) {
  if (only && !only.includes(id)) return;
  const {p, log} = await open(ctx, route);
  try { const d = await fn(p, log); rec(id, name, 'PASS', `${d || 'ok'} | http: ${log.http.slice(0, 3).join(', ')}`); }
  catch (e) { const msg = String(e?.message || e).split('\n')[0].slice(0, 260); await p.screenshot({path: `${SS}/ui-p4-${id}.png`}).catch(() => {});
    rec(id, name, 'FAIL', `${msg} | toast: ${await toast(p)} | http: ${log.http.slice(0, 4).join(', ')} | con: ${log.console.filter(s => !isNoise(s)).slice(0, 2).join(' / ').slice(0, 160)}`); }
  await p.close().catch(() => {});
}
const emp = await newContext(b, {role: 'p4emp'}), mgr = await newContext(b, {role: 'p4manager'}), hr = await newContext(b, {role: 'p4hradmin'});
const fill = (p, n, v) => p.locator(`[role=dialog] [name="${n}"]`).fill(String(v));

await flow('G1', 'EMP goal: validation then create then persist', emp, '/goals', async p => {
  const out = [];
  await p.getByRole('button', {name: /create goal/i}).first().click(); await sleep(800);
  // end before start, current > target, negative target
  await fill(p, 'title', `${TAG} goal`); await p.locator('[name=goalType]').selectOption({index: 2});
  await fill(p, 'targetValue', -5); await fill(p, 'currentValue', 150); await fill(p, 'unit', '%');
  await fill(p, 'startDate', iso(today, 10)); await fill(p, 'endDate', iso(today, 1));
  await p.locator('[role=dialog] button[type=submit]').click(); await sleep(1500);
  out.push('badInput->' + ((await dlg(p)).includes('Create Goal') ? 'dialog stays' : 'dialog closed') + ' toast:' + await toast(p));
  out.push('errs:' + (await dlg(p)).match(/(is required|must|cannot|invalid|greater|less)[^.]{0,40}/gi)?.slice(0, 4));
  return out.join(' ; ');
});

await flow('G2', 'EMP goal: valid create (current>target) then list after reload', emp, '/goals', async p => {
  await p.getByRole('button', {name: /create goal/i}).first().click(); await sleep(800);
  await fill(p, 'title', `${TAG} goal2`); await p.locator('[name=goalType]').selectOption({index: 2});
  await fill(p, 'targetValue', 100); await fill(p, 'currentValue', 150); await fill(p, 'unit', '%');
  await fill(p, 'startDate', iso(today, 1)); await fill(p, 'endDate', iso(today, 60));
  const api = p.waitForResponse(r => /\/goals/.test(r.url()) && r.request().method() === 'POST', {timeout: 15000}).catch(() => null);
  await p.locator('[role=dialog] button[type=submit]').click(); const r = await api; await sleep(1500);
  const t1 = await body(p); const shown = t1.includes('goal2');
  await p.reload({waitUntil: 'domcontentloaded'}); await p.waitForLoadState('networkidle', {timeout: 20000}).catch(() => {}); await sleep(1500);
  const t2 = await body(p);
  const card = t2.match(new RegExp('.{0,60}goal2.{0,200}'))?.[0];
  return `POST ${r?.status()} shownImmediately=${shown} afterReload=${t2.includes('goal2')} card="${card}"`;
});
await flow('G3', 'EMP goal: progress update on created goal', emp, '/goals', async p => {
  const card = p.locator('div,article,li').filter({hasText: `${TAG} goal2`}).last();
  const btns = await p.evaluate(t => { const el = [...document.querySelectorAll('div,article,li')].filter(e => e.innerText.includes(t)).pop(); return el ? [...el.querySelectorAll('button,a')].map(b => (b.innerText || b.getAttribute('aria-label') || '').trim().slice(0, 25)) : null; }, `${TAG} goal2`);
  return 'card buttons: ' + JSON.stringify(btns);
});
await b.close();
fs.writeFileSync(`${EV}/p4-grow-flows.json`, JSON.stringify({TAG, results}, null, 1));
