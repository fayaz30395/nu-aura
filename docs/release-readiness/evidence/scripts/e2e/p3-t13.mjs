import {chromium, newContext, FE, mkLog, watch} from './lib.mjs';
const T='NUAURA_TEST_P3_110279';
const b = await chromium.launch(); const ctx = await newContext(b, {role: 'hradmin'});
const p = await ctx.newPage(); const log = mkLog(); watch(p, log);
p.on('response', async r => { if (/\/api\/v1\//.test(r.url()) && r.request().method() !== 'GET' && !/auth|analytics|track/.test(r.url())) console.log('  API', r.status(), r.request().method(), r.url().replace(/^.*\/api/, ''), (await r.text().catch(()=>'')).slice(0, 200)); });
await p.goto(FE + '/recruitment/interviews', {waitUntil: 'domcontentloaded'}); await p.waitForLoadState('networkidle').catch(()=>{}); await p.waitForTimeout(2500);
await p.getByRole('button', {name: /^Schedule Interview$/}).first().click(); await p.waitForTimeout(1200);
const D='[role=dialog][aria-labelledby^=modal-title] ';
console.log('fields', JSON.stringify(await p.evaluate(() => [...document.querySelectorAll('[role=dialog] input,[role=dialog] select,[role=dialog] textarea,[role=dialog] button')].filter(e=>e.offsetParent).map(e => `${e.tagName}:${e.type}:${e.name||e.getAttribute('aria-label')||e.innerText.trim().slice(0,25)}${e.required?'*':''}`))));
const labels = await p.evaluate(()=>[...document.querySelectorAll('[role=dialog] label')].map(l=>l.innerText.trim().slice(0,30)));
console.log('labels', labels);
const ins = p.locator(D+'input[type=text]');
async function pick(n, txt) { await ins.nth(n).click(); await ins.nth(n).fill(txt); await p.waitForTimeout(1200);
  const opts = await p.locator('[role=option], [role=listbox] li, [role=listbox] button').allInnerTexts(); console.log('opts for', txt, JSON.stringify(opts.slice(0,5)));
  await p.locator('[role=option], [role=listbox] li, [role=listbox] button').first().click({timeout:3000}).catch(e=>console.log('pick fail')); await p.waitForTimeout(500); }
await ins.nth(0).fill('Alice'); await p.waitForTimeout(1200); await p.locator(D+'button:has-text("NUAURA_TEST_P3_110279 Alice")').first().click(); await p.waitForTimeout(600);
console.log('job field after cand pick:', await ins.nth(1).inputValue());
if (!(await ins.nth(1).inputValue())) { await ins.nth(1).fill('Backend'); await p.waitForTimeout(1200); await p.locator(D+'button:has-text("Backend Engineer")').first().click(); }
await p.locator(D+'[name=scheduledAt]').fill(process.argv[3]||'2027-03-02T10:00');
await p.locator(D+'[name=durationMinutes]').fill(process.argv[2]||'45');
await p.locator(D+'button[type=submit]').click(); await p.waitForTimeout(2500);
console.log('toast', await p.evaluate(()=>[...document.querySelectorAll('[role=status],[role=alert]')].map(e=>e.innerText).join('|')), 'http', log.http);console.log('after:', (await p.locator(D).innerText().catch(()=>'(closed)')).replace(/\s+/g,' ').match(/[A-Za-z ]{0,25}(required|valid|past|must)[A-Za-z ]{0,25}/gi));
await b.close();
