import {chromium, newContext, FE, mkLog, watch, SS} from './lib.mjs';
import {isNoise} from './ui-helpers.mjs';
export async function session(role, {mobile=false, net=true}={}) {
  const b = await chromium.launch(); const ctx = await newContext(b,{role:'p5_'+role, viewport: mobile?{width:390,height:844}:undefined});
  const p = await ctx.newPage(); const log = mkLog(); watch(p, log);
  if (net) {
    p.on('request', r=>{ if(r.method()!=='GET' && /\/api\//.test(r.url())) console.log('  REQ', r.method(), r.url().replace(/^https?:\/\/[^/]+/,''), (r.postData()||'').slice(0,Number(process.env.PD||200))); });
    p.on('response', async r=>{ if(r.request().method()!=='GET' && /\/api\//.test(r.url())) console.log('  RES', r.status(), (await r.text().catch(()=>'')).slice(0,200).replace(/\s+/g,' ')); });
  }
  const settle=async(ms=1200)=>{await p.waitForLoadState('networkidle',{timeout:15000}).catch(()=>{}); await p.waitForTimeout(ms);};
  const go=async(route)=>{await p.goto(FE+route,{waitUntil:'domcontentloaded',timeout:90000}); await settle();};
  const toasts=async()=> p.evaluate(()=>[...document.querySelectorAll('[class*=Notification], [role=alert], [role=status], [data-sonner-toast]')].map(e=>e.innerText).filter(Boolean).join(' | ').replace(/\s+/g,' ').slice(0,220));
  const dlg=async()=> p.evaluate(()=>(document.querySelector('[role=dialog]')?.innerText||'NO-DIALOG').replace(/\s+/g,' ').slice(0,300));
  const main=async(n=600)=> p.evaluate((n)=>(document.querySelector('main')||document.body).innerText.replace(/\s+/g,' ').slice(0,n), n);
  const shot=async(n)=>p.screenshot({path:`${SS}/ui-p5-${n}.png`});
  const errs=()=>({http:log.http, console:log.console.filter(s=>!isNoise(s))});
  return {b,ctx,p,log,settle,go,toasts,dlg,main,shot,errs};
}
export {FE, SS};
