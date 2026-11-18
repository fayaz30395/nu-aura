import {chromium, newContext, FE, sleep, SS} from './lib.mjs';
const b = await chromium.launch();
async function pg(role, route) { const c = await newContext(b, {role}); const p = await c.newPage();
  p.on('response', async r => { if (/\/api\//.test(r.url()) && (r.request().method() !== 'GET' || r.status() >= 400)) console.log('  NET', r.status(), r.request().method(), r.url().replace(/^https?:\/\/[^/]+/, '').slice(0, 60), (r.request().postData()||'').slice(0,150), r.status() >= 400 ? (await r.text().catch(() => '')).slice(0, 110) : ''); });
  await p.goto(FE + route, {waitUntil: 'domcontentloaded'}); await p.waitForLoadState('networkidle', {timeout: 20000}).catch(() => {}); await sleep(1500); return p; }
const txt = async p => (await p.evaluate(() => (document.querySelector('[role=dialog]')||document.querySelector('main')).innerText)).replace(/\s+/g, ' ').slice(300, 900);
let p = await pg('p4hradmin', '/wellness/admin'); console.log('WELL');
await p.getByRole('button', {name: 'New Program'}).first().click(); await sleep(500);
await p.locator('[name=name]').fill('NUAURA_TEST_P4_well'); await p.locator('[name=startDate]').fill('2026-12-30'); await p.locator('[name=endDate]').fill('2026-11-20'); await p.locator('[name=pointsReward]').fill('-50'); await p.locator('[name=maxParticipants]').fill('-3');
await p.locator('[role=dialog] button[type=submit]').click(); await sleep(1800); console.log(await txt(p)); await p.screenshot({path: `${SS}/ui-p4-wellness-create.png`});
p = await pg('p4emp', '/performance/360-feedback'); console.log('360 EMP', (await txt(p)).slice(0,300));
p = await pg('p4emp', '/learning/certificates'); console.log('CERT', (await txt(p)).slice(0,300));
await b.close();
