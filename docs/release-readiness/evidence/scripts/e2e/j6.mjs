import {chromium, newContext, watch, mkLog, FE, SS, sql, STATE} from './lib.mjs';
import fs from 'fs';
const T = 'NUAURA_TEST_E2E_WIKI_' + Date.now().toString().slice(-6);
const out = {tag: T}; const b = await chromium.launch();
const mk = async role => { const c = await newContext(b, {role}); const p = await c.newPage(); const log = mkLog(); watch(p, log); const api = []; p.on('response', r => { const m = r.request().method(); if (/fluence|knowledge|wall|social|posts/.test(r.url()) && !/_next/.test(r.url()) && (m !== 'GET' || /wiki\/pages/.test(r.url()))) api.push(`${m} ${r.status()} ${r.url().replace(/^https?:\/\/[^/]+/, '').replace(/[0-9a-f-]{36}/g, '{id}').slice(0, 90)}`); }); return {c, p, log, api}; };
const E = await mk('employee'), H = await mk('hradmin');
const shot = (s, n) => s.p.screenshot({path: `${SS}/NU-UI-006-${n}.png`});
// 1 employee reads wiki list
await E.p.goto(`${FE}/fluence/wiki`, {waitUntil: 'domcontentloaded', timeout: 120000}); await E.p.waitForLoadState('networkidle', {timeout: 30000}).catch(() => {}); await E.p.waitForTimeout(1500);
out.listUi = (await E.p.locator('main').first().innerText().catch(() => '')).replace(/\n+/g, ' | ').slice(0, 300);
await shot(E, 'employee-wiki-list');
out.listApi = E.api.splice(0);
out.pubCountDb = sql("select count(*) from wiki_pages where status='PUBLISHED'");
// 2 hr admin creates + publishes
await H.p.goto(`${FE}/fluence/wiki/new`, {waitUntil: 'domcontentloaded', timeout: 120000}); await H.p.waitForLoadState('networkidle', {timeout: 30000}).catch(() => {});
await H.p.getByLabel('Page title').fill(T);
await H.p.locator('.ProseMirror').first().click(); await H.p.keyboard.type('NUAURA_TEST e2e wiki body for employee read check.');
await H.p.getByRole('button', {name: /^publish$/i}).first().click();
await H.p.waitForTimeout(800);
await H.p.locator('#wiki-space').click(); await H.p.waitForTimeout(500);
await shot(H, 'hr-publish-drawer');
await H.p.getByRole('option', {name: 'NUAURA_TEST_space'}).click().catch(async () => { out.spaceOpts = await H.p.getByRole('option').allInnerTexts(); throw new Error('space option'); });
const [pr] = await Promise.all([
  H.p.waitForResponse(r => /wiki\/pages/.test(r.url()) && r.request().method() === 'POST', {timeout: 30000}).catch(() => null),
  H.p.getByRole('button', {name: 'Publish Page'}).click(),
]);
out.createApi = pr ? pr.status() : 'none'; if (pr && pr.status() >= 400) out.createBody = (await pr.text()).slice(0, 300);
await H.p.waitForTimeout(3000); await shot(H, 'hr-published');
out.hrUrl = new URL(H.p.url()).pathname; out.hrApi = H.api.splice(0);
out.dbWiki = sql(`select title,status,visibility,slug,published_at is not null from wiki_pages where title='${T}'`);
const slug = out.dbWiki.split('|')[3];
// 3 employee reads
if (slug) {
  await E.p.goto(`${FE}/fluence/wiki/${slug}`, {waitUntil: 'domcontentloaded'}); await E.p.waitForLoadState('networkidle', {timeout: 30000}).catch(() => {}); await E.p.waitForTimeout(1500);
  const t = await E.p.locator('body').innerText();
  out.empReads = {title: t.includes(T), body: t.includes('wiki body for employee')}; out.empApi = E.api.splice(0);
  await shot(E, 'employee-wiki-read');
}
// 4 wall post
await E.p.goto(`${FE}/fluence/wall`, {waitUntil: 'domcontentloaded'}); await E.p.waitForLoadState('networkidle', {timeout: 30000}).catch(() => {});
const msg = 'NUAURA_TEST_E2E wall post ' + T.slice(-6);
await E.p.getByLabel('Write something...').fill(msg);
const [wr] = await Promise.all([
  E.p.waitForResponse(r => /posts?$/.test(r.url()) && r.request().method() === 'POST', {timeout: 30000}).catch(() => null),
  E.p.locator('form button[type=submit]').first().click(),
]);
out.wallApi = wr ? wr.status() : 'none'; if (wr && wr.status() >= 400) out.wallBody = (await wr.text()).slice(0, 300);
await E.p.waitForTimeout(2000); out.wallUi = await E.p.getByText(msg).count(); await shot(E, 'employee-wall');
out.wallDb = sql(`select count(*) from social_posts where content like '%${msg}%'`);
out.logs = {E: E.log, H: H.log};
console.log(JSON.stringify(out, null, 1).slice(0, 5000)); fs.writeFileSync(STATE + '/j6.json', JSON.stringify(out));
await b.close();
