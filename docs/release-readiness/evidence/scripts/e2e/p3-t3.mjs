import {chromium, newContext, FE, BE, mkLog, watch} from './lib.mjs';
const b = await chromium.launch(); const ctx = await newContext(b, {role: 'hradmin'});
const p = await ctx.newPage(); const log = mkLog(); watch(p, log);
p.on('response', async r => { if (/\/api\/v1\/recruitment/.test(r.url()) && r.request().method() !== 'GET') console.log('  API', r.status(), r.request().method(), r.url().replace(/^.*\/api/, ''), (await r.text().catch(()=>'')).slice(0, 160)); });
await p.goto(FE + '/recruitment/jobs', {waitUntil: 'domcontentloaded'}); await p.waitForLoadState('networkidle').catch(()=>{}); await p.waitForTimeout(2500);
const api = u => p.evaluate(async u => { const r = await fetch('http://localhost:8080' + u, {credentials: 'include'}); return {s: r.status, b: (await r.text()).slice(0, 700)}; }, u);
console.log(JSON.stringify(await api('/api/v1/recruitment/job-openings?page=0&size=2')));
// row actions
const row = p.locator('tbody tr').first();
console.log('row html btns', JSON.stringify(await row.evaluate(r => [...r.querySelectorAll('button,a')].map(e => (e.getAttribute('aria-label')||e.innerText||e.title||e.href).trim().slice(0,40)))));
// Escape closes dialog?
await p.getByRole('button', {name: /^Create Job Opening$/}).first().click(); await p.waitForTimeout(600);
await p.keyboard.press('Escape'); await p.waitForTimeout(600); console.log('dialogs after Esc', await p.locator('[role=dialog]').count());
if (await p.locator('[role=dialog]').count()) { await p.getByRole('button', {name: /^Cancel$/}).click(); await p.waitForTimeout(600); console.log('after Cancel', await p.locator('[role=dialog]').count()); }
// 400 error shown to user?
await p.getByRole('button', {name: /^Create Job Opening$/}).first().click(); await p.waitForTimeout(600);
await p.locator('[role=dialog] [name=jobCode]').fill('NUAURA_TEST_P3_110279-X1'); await p.locator('[role=dialog] [name=jobTitle]').fill('<script>alert(1)</script>');
await p.locator('[role=dialog] select[name=departmentId]').selectOption({index: 1});
await p.locator('[role=dialog] button[type=submit]').click(); await p.waitForTimeout(2000);
console.log('toasts after 400:', JSON.stringify(await p.evaluate(() => [...document.querySelectorAll('[role=status],[role=alert],[data-sonner-toast],[class*=toast i],[class*=notification i]')].map(e => e.innerText.replace(/\s+/g,' ').slice(0,120)))));
console.log('dialog text tail', (await p.locator('[role=dialog]').first().innerText()).replace(/\s+/g,' ').slice(-250));
await p.screenshot({path: '/Users/fayaz.m/IdeaProjects/nulogic/nu-aura/docs/release-readiness/evidence/screenshots/ui-p3-job-400.png'});
await b.close();
