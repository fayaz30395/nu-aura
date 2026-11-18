import {chromium, newContext, FE, mkLog, watch} from './lib.mjs';
const b = await chromium.launch(); const ctx = await newContext(b, {role: 'hradmin'});
const p = await ctx.newPage(); const log = mkLog(); watch(p, log);
await p.goto(FE + '/recruitment/jobs', {waitUntil: 'domcontentloaded'}); await p.waitForLoadState('networkidle').catch(()=>{}); await p.waitForTimeout(2000);
await p.getByRole('button', {name: /^Create Job Opening$/}).first().click(); await p.waitForTimeout(1500);
const dump = async () => console.log(JSON.stringify(await p.evaluate(() => { const d = document.querySelector('[role=dialog]') || document.querySelector('main'); return {fields: [...d.querySelectorAll('input,select,textarea,button')].filter(e=>e.offsetParent).map(e => `${e.tagName}:${e.type||''}:${(e.getAttribute('aria-label')||e.name||e.placeholder||e.innerText||'').trim().replace(/\s+/g,' ').slice(0,40)}${e.required?'*':''}`), url: location.pathname}; })));
await dump();
// submit empty
const sub = p.locator('[role=dialog] button[type=submit], [role=dialog] button:has-text("Create")').last();
console.log('submit btn', await sub.innerText().catch(()=>'none'), 'disabled', await sub.isDisabled().catch(()=>null));
await sub.click({timeout: 3000}).catch(e => console.log('click fail', String(e).slice(0,80))); await p.waitForTimeout(1500);
console.log('after empty submit:', (await p.locator('[role=dialog]').innerText().catch(()=>'')).replace(/\s+/g,' ').slice(0,500));
console.log('http', log.http.slice(0,5), 'con', log.console.slice(0,3));
await p.screenshot({path: '/tmp/none.png'}).catch(()=>{});
await b.close();
