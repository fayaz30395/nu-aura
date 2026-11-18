import {chromium, newContext, FE, mkLog, watch} from './lib.mjs';
const TAG = 'NUAURA_TEST_P3_' + Date.now().toString().slice(-6);
const b = await chromium.launch(); const ctx = await newContext(b, {role: 'hradmin'});
const p = await ctx.newPage(); const log = mkLog(); watch(p, log);
p.on('response', async r => { if (/\/api\/v1\/recruitment/.test(r.url()) && r.request().method() !== 'GET') console.log('  API', r.status(), r.request().method(), r.url().replace(/^.*\/api/, ''), (await r.text().catch(()=>'')).slice(0, 200)); });
await p.goto(FE + '/recruitment/jobs', {waitUntil: 'domcontentloaded'}); await p.waitForLoadState('networkidle').catch(()=>{}); await p.waitForTimeout(2000);
const open = async () => { await p.getByRole('button', {name: /^Create Job Opening$/}).first().click(); await p.waitForTimeout(800); };
const f = (n, v) => p.locator(`[role=dialog] [name=${n}]`).fill(String(v));
const sel = async (n, label) => { const l = p.locator(`[role=dialog] select[name=${n}]`); if (label) await l.selectOption({label}).catch(async()=>l.selectOption({index:1})); else await l.selectOption({index: 1}); };
const msgs = async () => (await p.locator('[role=dialog]').innerText().catch(()=>'')).replace(/\s+/g,' ');
async function attempt(label, vals, {close = true} = {}) {
  await open(); await f('jobCode', vals.code); await f('jobTitle', vals.title); await sel('departmentId');
  if (vals.min != null) await f('minSalary', vals.min); if (vals.max != null) await f('maxSalary', vals.max); if (vals.n != null) await f('numberOfOpenings', vals.n);
  if (vals.close) await f('closingDate', vals.close); if (vals.status) await p.locator('[role=dialog] select[name=status]').selectOption(vals.status).catch(()=>{});
  if (vals.desc) await f('jobDescription', vals.desc);
  await p.locator('[role=dialog] button[type=submit]').click(); await p.waitForTimeout(2500);
  const still = await p.locator('[role=dialog]').count(); const m = still ? (await msgs()).slice(0, 700) : '(dialog closed)';
  console.log(`## ${label}: dialog open=${still}`); if (still) console.log('   ', m.replace(/Select Department.*Recruitment/,'').slice(0, 400));
  const t = await p.locator('[role=status],[role=alert],[data-sonner-toast]').allInnerTexts().catch(()=>[]); console.log('   toast:', t.join('|').replace(/\s+/g,' ').slice(0,200));
  if (still && close) { await p.keyboard.press('Escape'); await p.waitForTimeout(500); if (await p.locator('[role=dialog]').count()) await p.getByRole('button',{name:'Cancel'}).click().catch(()=>{}); }
}
await attempt('A minimal OPEN job', {code: TAG + '-J1', title: TAG + ' Backend Engineer', status: 'OPEN', desc: 'Synthetic test job'});
await attempt('B duplicate code', {code: TAG + '-J1', title: TAG + ' Dup'});
await attempt('C min>max salary', {code: TAG + '-J2', title: TAG + ' Salary', min: 900000, max: 100000});
await attempt('D negative openings', {code: TAG + '-J3', title: TAG + ' Neg', n: -5});
await attempt('E zero openings', {code: TAG + '-J4', title: TAG + ' Zero', n: 0});
await attempt('F closing date in past', {code: TAG + '-J5', title: TAG + ' Past', close: '2020-01-01'});
await attempt('G html in title', {code: TAG + '-J6', title: TAG + ' <img src=x onerror=window.__xss=1>', status: 'DRAFT'});
await attempt('H long title 300', {code: TAG + '-J7', title: TAG + 'x'.repeat(300)});
await p.waitForTimeout(1500); await p.reload(); await p.waitForLoadState('networkidle').catch(()=>{}); await p.waitForTimeout(2500);
console.log('LIST:', (await p.locator('main').innerText()).replace(/\s+/g,' ').slice(0, 900));
console.log('xss flag', await p.evaluate(() => window.__xss));
console.log('http', log.http.slice(0,8), 'con', log.console.slice(0,4));
console.log('TAG', TAG); await b.close();
