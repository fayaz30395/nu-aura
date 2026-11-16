import {chromium, newContext, watch, mkLog, FE, SS, sql, STATE} from './lib.mjs';
import fs from 'fs';
const R = process.env.RESUME_TAG; const T = R || 'NUAURA_TEST_E2E_OKR_' + Date.now().toString().slice(-6);
const out = {tag: T}; const b = await chromium.launch();
const c = await newContext(b, {role: 'employee'}); const p = await c.newPage(); const log = mkLog(); watch(p, log);
const api = []; p.on('response', r => { const m = r.request().method(); if (m !== 'GET' && /okr|objective|key-result/i.test(r.url())) api.push(`${m} ${r.status()} ${r.url().replace(/^https?:\/\/[^/]+/, '').replace(/[0-9a-f-]{36}/g, '{id}')}`); });
const shot = n => p.screenshot({path: `${SS}/NU-UI-005-${n}.png`});
await p.goto(`${FE}/performance/okr`, {waitUntil: 'domcontentloaded', timeout: 120000}); await p.waitForLoadState('networkidle', {timeout: 30000}).catch(() => {}); await p.waitForTimeout(1000);
if (!R) {
await p.getByRole('button', {name: /new objective/i}).first().click();
await p.locator('#objective-title').fill(T);
await p.locator('#objective-start-date').fill('2026-11-16'); await p.locator('#objective-end-date').fill('2027-03-31');
await shot('objective-form');
await p.locator('form button[type=submit]').click();
await p.waitForTimeout(2500); await shot('objective-created');
}
out.objUi = await p.getByText(T).count();
out.objDb = sql(`select title,status,objective_level from objectives where title='${T}'`);
// key result
const card = p.locator('div', {has: p.getByText(T, {exact: true})}).last();
await p.getByRole('button', {name: 'Expand objective'}).first().click();
await p.waitForTimeout(800);
await p.getByRole('button', {name: /add key result/i}).first().click();
await p.locator('#key-result-title').fill(T + '_KR1');
await p.locator('#key-result-target-value').fill('100'); await p.locator('#key-result-unit').fill('%');
await shot('kr-form');
await p.locator('form button[type=submit]').last().click();
await p.waitForTimeout(2500); await shot('kr-created');
out.krUi = await p.getByText(T + '_KR1').count();
out.krDb = sql(`select kr.title,kr.target_value,kr.current_value from key_results kr join objectives o on o.id=kr.objective_id where o.title='${T}'`);
out.api = api; out.log = log;
console.log(JSON.stringify(out, null, 1).slice(0, 3500)); fs.writeFileSync(STATE + '/j5.json', JSON.stringify(out));
await b.close();
