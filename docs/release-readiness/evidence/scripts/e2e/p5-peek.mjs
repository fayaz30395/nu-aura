// usage: node p5-peek.mjs <role> <route> [mobile] [shot]  -> prints main text + buttons + http
import {chromium, newContext, FE, mkLog, watch, SS} from './lib.mjs';
import {isNoise} from './ui-helpers.mjs';
const [role, route, vp, shot] = process.argv.slice(2);
const b = await chromium.launch(); const ctx = await newContext(b, {role: 'p5_'+role, viewport: vp==='mobile'?{width:390,height:844}:undefined});
const p = await ctx.newPage(); const log = mkLog(); watch(p, log);
await p.goto(FE+route, {waitUntil:'domcontentloaded', timeout:90000}); await p.waitForLoadState('networkidle',{timeout:20000}).catch(()=>{}); await p.waitForTimeout(2500);
console.log('URL', p.url().replace(FE,''));
console.log('MAIN:', (await p.evaluate(()=>(document.querySelector('main')||document.body).innerText.replace(/\s+/g,' ').slice(0,900))));
console.log('BUTTONS:', (await p.evaluate(()=>[...document.querySelectorAll('main button, main a[role=button]')].map(b=>(b.innerText||b.getAttribute('aria-label')||'').trim().slice(0,25)).filter(Boolean).slice(0,30))).join(' | '));
console.log('HTTP', log.http.slice(0,8)); console.log('CONSOLE', log.console.filter(s=>!isNoise(s)).slice(0,4));
if (shot) await p.screenshot({path:`${SS}/ui-p5-${shot}.png`, fullPage:false});
await b.close();
