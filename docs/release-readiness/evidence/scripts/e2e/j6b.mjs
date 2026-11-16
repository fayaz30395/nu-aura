import {chromium, newContext, watch, mkLog, FE, SS, sql, STATE} from './lib.mjs';
import fs from 'fs';
const T = 'NUAURA_TEST_E2E_WIKI_' + Date.now().toString().slice(-6);
const out = {tag: T}; const b = await chromium.launch();
const H = await newContext(b, {role: 'hradmin'}); const hp = await H.newPage();
const E = await newContext(b, {role: 'employee'}); const ep = await E.newPage(); const elog = mkLog(); watch(ep, elog);
// repro create
await hp.goto(`${FE}/fluence/wiki/new`, {waitUntil: 'domcontentloaded', timeout: 120000}); await hp.waitForLoadState('networkidle', {timeout: 30000}).catch(() => {});
await hp.getByLabel('Page title').fill(T); await hp.locator('.ProseMirror').first().click(); await hp.keyboard.type('NUAURA_TEST e2e wiki body.');
await hp.getByRole('button', {name: /^publish$/i}).first().click(); await hp.waitForTimeout(800);
await hp.locator('#wiki-space').click(); await hp.getByRole('option', {name: 'NUAURA_TEST_space'}).click();
const [pr] = await Promise.all([hp.waitForResponse(r => /wiki\/pages/.test(r.url()) && r.request().method() === 'POST', {timeout: 30000}).catch(() => null), hp.getByRole('button', {name: 'Publish Page'}).click()]);
out.createApi2 = pr ? pr.status() : 'none'; out.dbRow = sql(`select count(*) from wiki_pages where title='${T}'`);
await hp.waitForTimeout(1500); await hp.screenshot({path: `${SS}/NU-UI-006-hr-create-fail-repro.png`});
out.uiErrorShown = await hp.getByText(/conflict|failed|error|could not/i).count();
// employee reads an existing published ORG page by slug
await ep.goto(`${FE}/fluence/wiki/nuaura-test-pub-org`, {waitUntil: 'domcontentloaded', timeout: 120000}); await ep.waitForLoadState('networkidle', {timeout: 30000}).catch(() => {}); await ep.waitForTimeout(1500);
const t = await ep.locator('body').innerText(); out.empReadOrg = t.includes('NUAURA_TEST_pub_org'); await ep.screenshot({path: `${SS}/NU-UI-006-employee-wiki-read.png`});
// employee must not read PRIVATE page
await ep.goto(`${FE}/fluence/wiki/nuaura-test-private-published`, {waitUntil: 'domcontentloaded'}); await ep.waitForLoadState('networkidle', {timeout: 30000}).catch(() => {}); await ep.waitForTimeout(1500);
const t2 = await ep.locator('body').innerText(); out.empReadPrivate = t2.includes('NUAURA_TEST_private_published'); out.privateUiTail = t2.slice(-160).replace(/\n/g, ' ');
out.empHttp = elog.http;
console.log(JSON.stringify(out, null, 1)); fs.writeFileSync(STATE + '/j6b.json', JSON.stringify(out));
await b.close();
