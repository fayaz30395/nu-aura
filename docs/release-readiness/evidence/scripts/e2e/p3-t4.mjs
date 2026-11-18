import {chromium, FE} from './lib.mjs';
const b = await chromium.launch(); const ctx = await b.newContext(); const p = await ctx.newPage();
const reqs=[]; p.on('response', r => { if (/\/api\//.test(r.url())) reqs.push(r.status()+' '+r.request().method()+' '+r.url().replace(/^.*\/api/,'/api').slice(0,120)); });
await p.goto(FE + '/careers', {waitUntil: 'domcontentloaded'}); await p.waitForLoadState('networkidle').catch(()=>{}); await p.waitForTimeout(3000);
console.log('URL', p.url()); console.log((await p.locator('body').innerText()).replace(/\s+/g,' ').slice(0,900)); console.log(reqs.join('\n'));
await b.close();
