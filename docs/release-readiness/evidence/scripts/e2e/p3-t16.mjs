import {chromium, newContext, FE, mkLog, watch} from './lib.mjs';
const T='NUAURA_TEST_P3_110279';
const b = await chromium.launch(); const ctx = await newContext(b, {role: 'hradmin'});
const p = await ctx.newPage(); const log = mkLog(); watch(p, log);
p.on('response', async r => { if (/\/api\/v1\//.test(r.url()) && r.request().method() !== 'GET' && !/auth|analytics/.test(r.url())) console.log('  API', r.status(), r.request().method(), r.url().replace(/^.*\/api/, ''), (await r.text().catch(()=>'')).slice(0, 180)); });
const go = async (r) => { await p.goto(FE + r, {waitUntil: 'domcontentloaded'}); await p.waitForLoadState('networkidle').catch(()=>{}); await p.waitForTimeout(2000); };
const D='[role=dialog][aria-labelledby^=modal-title] ';
const toast = async () => console.log('  toast:', await p.evaluate(()=>[...document.querySelectorAll('[role=status],[role=alert]')].map(e=>e.innerText.replace(/\s+/g,' ')).join('|')));
// AGENCY
await go('/recruitment/agencies');
async function ag(label, v) { await p.getByRole('button',{name:'Add Agency'}).first().click(); await p.waitForTimeout(700);
  for (const [k,val] of Object.entries(v)) await p.locator(D+`[name=${k}]`).fill(String(val));
  await p.locator(D+'button[type=submit]').click(); await p.waitForTimeout(2000);
  const n = await p.locator(D).count(); console.log('## AGENCY', label, 'dialog open', n, n? (await p.locator(D).innerText()).replace(/\s+/g,' ').match(/[A-Za-z ]{0,25}(required|valid|must|Invalid)[A-Za-z ]{0,30}/gi):''); await toast(); if (n) { await p.keyboard.press('Escape'); await p.waitForTimeout(400);} }
await ag('valid', {name: T+' Agency', contactPerson:'Syn Thetic', email:'agency@example.test', phone:'9876500010'});
await ag('bad dates+rating+fee', {name: T+' Agency2', contactPerson:'S T', email:'a2@example.test', phone:'9876500011', feeAmount:-5, rating:99, contractStartDate:'2026-12-01', contractEndDate:'2026-01-01'});
await ag('dup name', {name: T+' Agency', contactPerson:'S T', email:'a3@example.test', phone:'9876500012'});
// SCORECARD
await go('/recruitment/scorecards');
await p.getByRole('button',{name:'New Template'}).first().click(); await p.waitForTimeout(700);
await p.getByRole('button',{name:'Save Template'}).click(); await p.waitForTimeout(1200);
console.log('## SC empty save:', (await p.locator('body').innerText()).replace(/\s+/g,' ').match(/[A-Za-z ]{0,25}(required|Add at least|valid)[A-Za-z ]{0,30}/gi)); await toast();
await p.getByPlaceholder('e.g. Engineering Role Scorecard').fill(T+' Scorecard');
await p.getByRole('button',{name:'Save Template'}).click(); await p.waitForTimeout(2000); await toast();
// ONB TEMPLATE
await go('/onboarding/templates/new');
await p.getByRole('button',{name:/CREATE & CONFIGURE/i}).click(); await p.waitForTimeout(1200); console.log('## OBT empty:', (await p.locator('main').innerText()).replace(/\s+/g,' ').match(/[A-Za-z ]{0,25}(required|valid)[A-Za-z ]{0,30}/gi)); await toast();
await p.locator('[name=name]').fill(T+' Onb Template'); await p.getByRole('button',{name:/CREATE & CONFIGURE/i}).click(); await p.waitForTimeout(2500); console.log('  url after', p.url().replace(FE,'')); await toast();
console.log('http', log.http);
await b.close();
