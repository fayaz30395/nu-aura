import {chromium, newContext, FE, mkLog, watch} from './lib.mjs';
const b = await chromium.launch(); const ctx = await newContext(b, {role: process.argv[2]||'hradmin'});
for (const [route, btn] of JSON.parse(process.argv[3])) {
  const p = await ctx.newPage(); const log = mkLog(); watch(p, log);
  p.on('response', async r => { if (/\/api\/v1\//.test(r.url()) && r.request().method() !== 'GET' && !/auth|analytics/.test(r.url())) console.log('  API', r.status(), r.request().method(), r.url().replace(/^.*\/api/, ''), (await r.text().catch(()=>'')).slice(0, 160)); });
  await p.goto(FE + route, {waitUntil: 'domcontentloaded'}); await p.waitForLoadState('networkidle').catch(()=>{}); await p.waitForTimeout(2500);
  if (btn) { await p.getByRole('button', {name: new RegExp(btn)}).first().click({timeout: 5000}).catch(()=>console.log('no btn', btn)); await p.waitForTimeout(1200); }
  console.log('==', route, btn, '\n fields', JSON.stringify(await p.evaluate(() => [...document.querySelectorAll('main input,main select,main textarea,[role=dialog] input,[role=dialog] select,[role=dialog] textarea,[role=dialog] button,main button')].filter(e=>e.offsetParent).map(e => `${e.tagName[0]}:${e.type||''}:${e.name||e.getAttribute('aria-label')||e.placeholder||e.innerText.trim().slice(0,22)}`).slice(0,40))), '\n http', log.http.slice(0,3));
  await p.close();
}
await b.close();
