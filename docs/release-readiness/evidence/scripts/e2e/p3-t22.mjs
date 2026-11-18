import {chromium, newContext, FE} from './lib.mjs';
const b = await chromium.launch(); const ctx = await newContext(b, {role: 'hradmin', viewport: {width: 390, height: 844}});
const p = await ctx.newPage(); await p.goto(FE + '/recruitment/jobs', {waitUntil: 'domcontentloaded'}); await p.waitForLoadState('networkidle').catch(()=>{}); await p.waitForTimeout(3000);
try { await p.locator('button:visible', {hasText: 'Create Job Opening'}).first().click({timeout: 4000}); console.log('clicked'); } catch (e) { console.log(String(e).replace(/\x1b\[\d+m/g,'').split('\n').slice(3,12).join('\n').slice(0,900)); }
console.log(JSON.stringify(await p.evaluate(()=>{const b=[...document.querySelectorAll('button')].find(x=>/Create Job Opening/.test(x.innerText)); const r=b.getBoundingClientRect(); const top=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2); return {r:[r.x,r.y,r.width,r.height].map(Math.round), top: top?.tagName+'.'+String(top?.className).slice(0,60)+' '+top?.innerText?.slice(0,30)}})));
await b.close();
