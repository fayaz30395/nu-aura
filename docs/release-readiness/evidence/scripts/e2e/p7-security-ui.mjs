// P7 UI-level security probe. Read-mostly; the only writes are inert-payload test records tagged with the run id.
import fs from 'fs';
import {chromium, newContext, FE, BE, STATE, sleep} from './lib.mjs';
const SCR = '/private/tmp/claude-504/-Users-fayaz-m-IdeaProjects-nulogic-nu-aura/31fd4514-1941-4084-b1c8-e1a40e6df684/scratchpad';
const RUN = 'NUAURA_TEST_P7_' + Date.now().toString().slice(-6);
const hrOnly = JSON.parse(fs.readFileSync(`${SCR}/ok_hradmin.json`)).filter(r => !JSON.parse(fs.readFileSync(`${SCR}/ok_employee.json`)).includes(r));
const out = {run: RUN, a: {}, b: {}};
const browser = await chromium.launch();
const mk = async role => newContext(browser, {role});
const hr = await mk('q_hr'), emp = await mk('q_emp'), mgr = await mk('q_mgr');

// A. collect HR API GETs across HR-only routes
const urls = new Map();
const pg = await hr.newPage();
pg.on('response', r => { const u = r.url(); if (/localhost:8080\/api\/v1\//.test(u) && r.request().method() === 'GET' && r.status() === 200) urls.set(u.replace(BE, ''), r.url()); });
for (const route of hrOnly.slice(0, 70)) { await pg.goto(FE + route, {waitUntil: 'domcontentloaded', timeout: 60000}).catch(() => {}); await pg.waitForLoadState('networkidle', {timeout: 12000}).catch(() => {}); }
await pg.close();
out.a.hrUrls = [...urls.keys()];
// B. replay as EMP and MGR
out.a.replay = [];
for (const u of out.a.hrUrls) {
  if (/\/auth\/(me|refresh)/.test(u)) continue;
  const row = {u};
  for (const [n, c] of [['emp', emp], ['mgr', mgr]]) { const r = await c.request.get(BE + u).catch(e => null); row[n] = r ? r.status() : 'ERR'; if (r && r.status() === 200) { const t = await r.text(); row[n + 'Len'] = t.length; row[n + 'Sample'] = t.slice(0, 120).replace(/"(email|phone|salary|ctc|accountNumber|panNumber)":"[^"]*"/g, '"$1":"[..]"'); } }
  out.a.replay.push(row);
}
// C. EMP UI navigation to HR-only routes: final URL + whether protected text/data got rendered
out.a.nav = [];
for (const route of hrOnly.slice(0, 40)) {
  const p = await emp.newPage(); const hits = [];
  p.on('response', async r => { if (/:8080\/api\/v1\//.test(r.url()) && r.status() === 200 && r.request().method() === 'GET' && !/auth\/|\/me|notifications|permissions/.test(r.url())) hits.push(r.url().replace(BE, '').slice(0, 90)); });
  await p.goto(FE + route, {waitUntil: 'domcontentloaded', timeout: 60000}).catch(() => {});
  await p.waitForLoadState('networkidle', {timeout: 12000}).catch(() => {});
  const final = p.url().replace(FE, ''); const text = (await p.evaluate(() => document.body.innerText).catch(() => '')).slice(0, 2000);
  out.a.nav.push({route, final, apiOk: hits.slice(0, 5), rendered: final.split('?')[0] === route, textLen: text.length});
  await p.close();
}
fs.writeFileSync(`${SCR}/p7-raw.json`, JSON.stringify(out));
await browser.close();
