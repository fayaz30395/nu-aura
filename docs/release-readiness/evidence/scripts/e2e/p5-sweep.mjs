// P5 sweep: Fluence-area routes x roles x viewports. Output: evidence/p5-sweep.json
import fs from 'fs';
import {chromium, newContext, EV} from './lib.mjs';
import {openAndCheck, VIEWPORTS, failures} from './ui-helpers.mjs';
const routes = ['/fluence','/fluence/dashboard','/fluence/wiki','/fluence/wiki/new','/fluence/blogs','/fluence/blogs/new','/fluence/articles','/fluence/templates','/fluence/templates/new','/fluence/wall','/fluence/drive','/fluence/analytics','/fluence/search','/fluence/my-content','/fluence/chat','/fluence/ai-chat','/announcements','/company-spotlight','/recognition','/linkedin-posts','/knowledge','/nu-calendar','/nu-drive','/nu-mail','/helpdesk','/helpdesk/tickets','/helpdesk/knowledge-base','/helpdesk/sla','/tasks','/projects'];
const b = await chromium.launch(); const out = [];
const roles = (process.argv[2] || 'p5_employee,p5_manager,p5_hradmin').split(',');
for (const role of roles) {
  const ctx = await newContext(b, {role});
  for (const vp of ['desktop','mobile']) for (const r of routes) {
    if (vp==='mobile' && role==='p5_manager') continue;
    const {page, res} = await openAndCheck(ctx, r, {viewport: VIEWPORTS[vp], timeout: 90000, settle: 8000});
    const body = await page.evaluate(()=>document.body.innerText.slice(0,200).replace(/\s+/g,' ')).catch(()=> '');
    out.push({role, vp, route: r, finalUrl: res.finalUrl, f: failures(res), http: res.log.http.slice(0,6), console: res.log.console.slice(0,3), h1: res.checks?.h1, bodyStart: body});
    console.log(role, vp, r, '->', res.finalUrl, failures(res).join(' ; ').slice(0,200));
    await page.close();
  }
  await ctx.close();
}
fs.writeFileSync(`${EV}/p5-sweep.json`, JSON.stringify(out, null, 1));
await b.close();
