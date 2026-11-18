import {chromium, newContext, FE, mkLog, watch} from './lib.mjs';
const TAG = 'NUAURA_TEST_P3_110279';
const b = await chromium.launch(); const ctx = await newContext(b, {role: 'hradmin'});
const p = await ctx.newPage(); const log = mkLog(); watch(p, log);
p.on('response', async r => { if (/\/api\/v1\/recruitment/.test(r.url()) && r.request().method() !== 'GET') console.log('  API', r.status(), r.request().method(), r.url().replace(/^.*\/api/, ''), (await r.text().catch(()=>'')).slice(0, 200)); });
await p.goto(FE + '/recruitment/candidates', {waitUntil: 'domcontentloaded'}); await p.waitForLoadState('networkidle').catch(()=>{}); await p.waitForTimeout(2500);
const D = '[role=dialog][aria-labelledby^=modal-title] ';
async function cand(label, v) {
  await p.getByRole('button', {name: /^Add Candidate$/}).click(); await p.waitForTimeout(600);
  await p.locator(D + '[name=candidateCode]').fill(v.code); await p.locator(D + 'select[name=jobOpeningId]').selectOption({label: TAG + ' Backend Engineer'});
  await p.locator(D + '[name=firstName]').fill(v.fn); await p.locator(D + '[name=lastName]').fill(v.ln); await p.locator(D + '[name=email]').fill(v.email);
  const dflt={phone:'9876500009',totalExperience:2,currentCtc:100,expectedCtc:200,noticePeriodDays:10};for (const k of Object.keys(dflt)) await p.locator(D + `[name=${k}]`).fill(String(v[k] ?? dflt[k]));
  await p.locator(D + 'button[type=submit]').click(); await p.waitForTimeout(2200);
  const n = await p.locator('[role=dialog][aria-labelledby^=modal-title]').count(); console.log(`## ${label}: dialog=${n}`, n ? (await p.locator('[role=dialog][aria-labelledby^=modal-title]').innerText()).replace(/\s+/g,' ').replace(/Select job opening.*?Invalid/,'').match(/(is required|Invalid[^.]{0,60}|must[^.]{0,60}|already[^.]{0,60}|valid[^.]{0,60}|at least[^.]{0,40}|greater[^.]{0,40})/g)?.slice(0,4) : ''); console.log("   VIS:", (await p.evaluate(() => document.body.innerText)).match(/[^\n]*(already exists|duplicate|Failed|Error|could not)[^\n]*/gi)?.slice(0,3));
  if (n) { await p.keyboard.press('Escape'); await p.waitForTimeout(500); }
}
//await cand('A valid', {code: TAG + '-C1', fn: 'Test', ln: TAG + ' Alice', email: 'p3.alice@example.test', phone: '9876500001', totalExperience: 3, currentCtc: 500000, expectedCtc: 700000, noticePeriodDays: 30});
//await cand('B dup email', {code: TAG + '-C2', fn: 'Test', ln: TAG + ' AliceDup', email: 'p3.alice@example.test'});
await cand('C dup code', {code: TAG + '-C1', fn: 'Test', ln: TAG + ' CodeDup', email: 'p3.bob@example.test'});
await cand('D bad email', {code: TAG + '-C3', fn: 'Test', ln: TAG + ' Bad', email: 'not-an-email'});
await cand('E negative exp/ctc/notice', {code: TAG + '-C4', fn: 'Test', ln: TAG + ' Neg', email: 'p3.neg@example.test', totalExperience: -4, currentCtc: -100, noticePeriodDays: -9});
await cand('F phone letters', {code: TAG + '-C5', fn: 'Test', ln: TAG + ' Phone', email: 'p3.ph@example.test', phone: 'abc-xyz'});
await cand('G html name', {code: TAG + '-C6', fn: '<b>Test</b>', ln: TAG + ' <img src=x onerror=1>', email: 'p3.x@example.test'});
//await cand('H', {code: TAG + '-C7', fn: 'Test', ln: TAG + ' Carol', email: 'p3.carol@example.test', phone: '9876500003'});
await p.reload(); await p.waitForLoadState('networkidle').catch(()=>{}); await p.waitForTimeout(3000);
console.log('LIST', (await p.locator('main').innerText()).replace(/\s+/g,' ').slice(0, 1200));
console.log('http', log.http.slice(0,6), 'con', log.console.slice(0,3));
await b.close();
