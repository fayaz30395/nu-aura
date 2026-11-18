import {chromium, newContext, FE, mkLog, watch} from './lib.mjs';
const b = await chromium.launch(); const ctx = await newContext(b, {role: 'manager'});
const p = await ctx.newPage(); const log = mkLog(); watch(p, log);
p.on('response', async r => { if (/\/api\/v1\//.test(r.url()) && r.request().method() !== 'GET' && !/auth|analytics/.test(r.url())) console.log('  API', r.status(), r.request().method(), r.url().replace(/^.*\/api/, ''), (await r.text().catch(()=>'')).slice(0, 200)); });
await p.goto(FE + '/recruitment/scorecards', {waitUntil: 'domcontentloaded'}); await p.waitForLoadState('networkidle').catch(()=>{}); await p.waitForTimeout(2500);
console.log('page:', (await p.locator('main').innerText()).replace(/\s+/g,' ').slice(0,300));
await p.getByRole('button',{name:'New Template'}).first().click().catch(()=>console.log('no New Template')); await p.waitForTimeout(700);
await p.getByPlaceholder('e.g. Engineering Role Scorecard').fill('NUAURA_TEST_P3_110279 MgrScorecard').catch(()=>{});
await p.getByRole('button',{name:'Save Template'}).click().catch(()=>{}); await p.waitForTimeout(2000);
console.log('toast', await p.evaluate(()=>[...document.querySelectorAll('[role=status],[role=alert]')].map(e=>e.innerText.replace(/\s+/g,' ')).join('|')));
// nav
await p.goto(FE + '/app/hire', {waitUntil: 'domcontentloaded'}); await p.waitForLoadState('networkidle').catch(()=>{}); await p.waitForTimeout(2500);
console.log('hire nav:', JSON.stringify(await p.evaluate(()=>[...document.querySelectorAll('nav a, aside a')].map(a=>a.innerText.trim()+'>'+a.getAttribute('href')).filter(s=>/recruit|onboard|offer|career|referr|interview|pipeline|candidate/i.test(s)))));
console.log('url', p.url());
console.log(log.http);
await b.close();
