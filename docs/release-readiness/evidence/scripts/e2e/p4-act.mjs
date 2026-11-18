// generic: node p4-act.mjs ROLE ROUTE 'step;step;...'  steps: click:<regex> | fill:<selector>=<val> | sel:<selector>=<idx> | wait:ms | text | dump
import {chromium, newContext, FE, sleep, SS} from './lib.mjs';
const [role, route, steps] = process.argv.slice(2);
const b = await chromium.launch(); const ctx = await newContext(b, {role, viewport: process.env.MOB ? {width: 390, height: 844} : {width: 1440, height: 900}}); const p = await ctx.newPage();
p.on('dialog', d => d.dismiss().catch(() => {}));
p.on('response', async r => { if (/\/api\//.test(r.url()) && (r.request().method() !== 'GET' || r.status() >= 400)) console.log('  NET', r.status(), r.request().method(), r.url().replace(/^https?:\/\/[^/]+/, '').slice(0, 80), r.status() >= 400 ? (await r.text().catch(() => '')).slice(0, 160) : ''); });
await p.goto(FE + route, {waitUntil: 'domcontentloaded'}); await p.waitForLoadState('networkidle', {timeout: 20000}).catch(() => {}); await sleep(1500);
for (const st of steps.split(';;').filter(Boolean)) {
  const [k, ...r] = st.split(':'); const v = r.join(':');
  try {
    if (k === 'click') await p.getByRole(v.startsWith('tab') ? 'tab' : 'button', {name: new RegExp(v.replace(/^tab\|/, ''), 'i')}).first().click({timeout: 6000});
    else if (k === 'link') await p.getByRole('link', {name: new RegExp(v, 'i')}).first().click({timeout: 6000});
    else if (k === 'fill') { const [s, ...x] = v.split('~'); await p.locator(s).first().fill(x.join('~'), {timeout: 6000}); }
    else if (k === 'sel') { const [s, x] = v.split('~'); await p.locator(s).first().selectOption({index: Number(x)}, {timeout: 6000}); }
    else if (k === 'press') await p.keyboard.press(v);
    else if (k === 'wait') await sleep(Number(v));
    else if (k === 'text') console.log('  TEXT', (await p.evaluate(() => (document.querySelector('[role=dialog]') || document.querySelector('main') || document.body).innerText.replace(/\s+/g, ' ').slice(0, 700))));
    else if (k === 'url') console.log('  URL', p.url().replace(FE, ''));
    else if (k === 'dump') console.log('  UI', await p.evaluate(() => [...(document.querySelector('[role=dialog]') || document.querySelector('main') || document.body).querySelectorAll('input,select,textarea,button,[role=tab]')].filter(e => e.getBoundingClientRect().width > 0).map(e => `${e.tagName[0]}${e.type ? '/' + e.type : ''}:${(e.getAttribute('aria-label') || e.name || e.placeholder || e.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 24)}`).join(' | ').slice(0, 900)));
    else if (k === 'shot') await p.screenshot({path: `${SS}/${v}.png`});
    else if (k === 'ovf') console.log('  OVERFLOW', await p.evaluate(() => document.documentElement.scrollWidth + '>' + innerWidth));
  } catch (e) { console.log('  STEPFAIL', st.slice(0, 50), String(e).split('\n')[0].slice(0, 100)); }
  await sleep(500);
}
await b.close();
