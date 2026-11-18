// P6 pass 2: wide sweep at 1440 light/dark + API-failure state. Read-only.
import fs from 'fs';
import {chromium,newContext,FE,BE,sleep} from './lib.mjs';
const S='/private/tmp/claude-504/-Users-fayaz-m-IdeaProjects-nulogic-nu-aura/31fd4514-1941-4084-b1c8-e1a40e6df684/scratchpad';
const AXE=fs.readFileSync('/Users/fayaz.m/IdeaProjects/nulogic/nu-aura/frontend/node_modules/axe-core/axe.min.js','utf8');
const routes=JSON.parse(fs.readFileSync(S+'/ok_hradmin.json'));
const b=await chromium.launch(); const ctx=await newContext(b,{role:'q_hr'}); const out=[];
for (const route of routes) {
  for (const mode of ['normal','dark','apifail']) {
    const p=await ctx.newPage(); await p.setViewportSize({width:1440,height:900}); const con=[]; 
    await p.addInitScript(t=>{try{localStorage.setItem('nu-aura-theme',t)}catch{}},mode==='dark'?'dark':'light');
    if (mode==='apifail') await p.route(/:8080\/api\/v1\/(?!auth|notifications|workflow\/inbox|permissions)/,r=>r.fulfill({status:500,contentType:'application/json',body:'{"message":"boom"}'}));
    p.on('pageerror',e=>con.push('pageerror '+String(e).slice(0,120))); p.on('console',m=>{if(m.type()==='error')con.push(m.text().slice(0,140))});
    const r={route,mode};
    try { await p.goto(FE+route,{waitUntil:'domcontentloaded',timeout:60000}); await p.waitForLoadState('networkidle',{timeout:15000}).catch(()=>{}); await sleep(1200);
      r.final=p.url().replace(FE,'').split('?')[0];
      r.d=await p.evaluate(()=>{const de=document.documentElement;const vis=e=>{const b=e.getBoundingClientRect();return b.width>0&&b.height>0};
        const inputs=[...document.querySelectorAll('input:not([type=hidden]),select,textarea')].filter(vis).filter(e=>!(e.labels&&e.labels.length)&&!e.getAttribute('aria-label')&&!e.getAttribute('aria-labelledby')&&!e.title).map(e=>e.tagName+'['+(e.placeholder||e.name||e.type||'').slice(0,25)+']');
        const imgs=[...document.images].filter(vis).filter(i=>!i.hasAttribute('alt')).length;
        const btn=[...document.querySelectorAll('button,[role=button],a[href]')].filter(vis).filter(e=>!(e.textContent||'').trim()&&!e.getAttribute('aria-label')&&!e.getAttribute('aria-labelledby')&&!e.title&&!e.querySelector('img[alt]:not([alt=""])')).map(e=>e.tagName+'.'+String(e.className).slice(0,30));
        return {title:document.title,lang:de.lang,main:document.querySelectorAll('main').length,h1:[...document.querySelectorAll('h1')].filter(vis).map(h=>h.textContent.trim().slice(0,40)),inputs:inputs.slice(0,5),inputsN:inputs.length,imgs,btn:btn.slice(0,4),btnN:btn.length,text:document.body.innerText.replace(/\s+/g,' ').slice(0,3000),spin:[...document.querySelectorAll('.animate-spin,[role=progressbar],[class*=skeleton]')].filter(vis).length,dark:de.classList.contains('dark'),
          lightSurf:de.classList.contains('dark')?[...document.querySelectorAll('main *')].filter(e=>{const b=e.getBoundingClientRect();if(b.width*b.height<12000)return false;const m=getComputedStyle(e).backgroundColor.match(/[\d.]+/g);if(!m)return false;const [r,g,bl,a=1]=m.map(Number);return a>0.5&&(0.2126*r+0.7152*g+0.0722*bl)/255>0.85}).slice(0,3).map(e=>e.tagName+'.'+String(e.className).slice(0,50)):[]}});
      if (mode!=='apifail') { await p.evaluate(AXE); r.axe=await p.evaluate(async()=>{const x=await axe.run(document,{runOnly:['wcag2a','wcag2aa','wcag21aa','wcag22aa']});return x.violations.filter(v=>['serious','critical'].includes(v.impact)).map(v=>({id:v.id,n:v.nodes.length,ex:(v.nodes[0].target.join(' ')+' || '+(v.nodes[0].any[0]?.message||'')).slice(0,170)}))}); }
    } catch(e){ r.err=String(e).split('\n')[0].slice(0,120) }
    r.con=con.slice(0,4); r.conN=con.length; out.push(r); await p.close();
  }
  fs.writeFileSync(S+'/p6b-raw.json',JSON.stringify(out));
}
await b.close();
