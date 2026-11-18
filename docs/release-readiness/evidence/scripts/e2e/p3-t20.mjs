import {chromium, newContext, FE, mkLog, watch} from './lib.mjs';
const T='NUAURA_TEST_P3_110279';
const b = await chromium.launch(); const ctx = await newContext(b, {role: 'hradmin'});
const p = await ctx.newPage(); const log = mkLog(); watch(p, log);
p.on('response', async r => { if (/\/api\/v1\//.test(r.url()) && r.request().method() !== 'GET' && !/auth|analytics/.test(r.url())) console.log('  API', r.status(), r.request().method(), r.url().replace(/^.*\/api/, ''), (await r.text().catch(()=>'')).slice(0, 200)); });
await p.goto(FE + '/recruitment/jobs', {waitUntil: 'domcontentloaded'}); await p.waitForLoadState('networkidle').catch(()=>{}); await p.waitForTimeout(2500);
const row = p.locator('tbody tr', {hasText: T + ' Salary'});
await row.getByRole('button',{name:'Row actions'}).click(); await p.waitForTimeout(700);
const dlg='[role=dialog][aria-labelledby^=modal-title] ';
const toast = async () => console.log('  toast:', await p.evaluate(()=>[...document.querySelectorAll('[role=status],[role=alert]')].map(e=>e.innerText.replace(/\s+/g,' ')).join('|')));
// EDIT J1 -> CLOSED
await p.keyboard.press('Escape');
const r1 = p.locator('tbody tr', {hasText: T + ' Backend Engineer'});
await r1.getByRole('button',{name:'Row actions'}).click(); await p.getByRole('menuitem',{name:'Edit'}).click().catch(async()=>p.getByText('Edit',{exact:true}).last().click()); await p.waitForTimeout(1000);
console.log('edit vals', await p.evaluate(()=>[...document.querySelectorAll('[role=dialog] input,[role=dialog] select')].map(e=>e.name+'='+e.value).filter(s=>/job|status|dept|open|Sal/i.test(s)).join(', ')));
await p.locator(dlg+'select[name=status]').selectOption('CLOSED'); await p.locator(dlg+'button[type=submit]').click(); await p.waitForTimeout(2500); await toast();
const pub = await p.evaluate(async()=> (await (await fetch('http://localhost:8080/api/v1/public/careers/jobs')).text()).slice(0,200));
console.log('public after close:', pub);
await p.goto(FE + '/recruitment/pipeline', {waitUntil: 'domcontentloaded'}); await p.waitForLoadState('networkidle').catch(()=>{}); await p.waitForTimeout(2000);
console.log('pipeline opts:', await p.locator('main select').first().locator('option').allInnerTexts());
await p.goto(FE + '/recruitment/jobs'); await p.waitForLoadState('networkidle').catch(()=>{}); await p.waitForTimeout(2500);
console.log('jobs', (await p.locator('main').innerText()).replace(/\s+/g,' ').slice(60,420));
// DELETE Dup job
await p.locator('tbody tr', {hasText: T + ' Dup'}).getByRole('button',{name:'Row actions'}).click(); await p.getByText('Delete',{exact:true}).last().click(); await p.waitForTimeout(1000);
console.log('confirm dlg:', (await p.locator('[role=dialog],[role=alertdialog]').first().innerText().catch(()=>'(none - deleted immediately?)')).replace(/\s+/g,' ').slice(0,200));
await p.screenshot({path:'/Users/fayaz.m/IdeaProjects/nulogic/nu-aura/docs/release-readiness/evidence/screenshots/ui-p3-job-delete.png'});
console.log('http', log.http);
await b.close();
