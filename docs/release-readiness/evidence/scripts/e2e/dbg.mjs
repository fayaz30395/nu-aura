import {chromium, newContext, watch, mkLog, FE, SS} from './lib.mjs';
const b = await chromium.launch(); const c = await newContext(b, {role: 'manager'}); const p = await c.newPage();
p.on('request', r => { if (r.method() !== 'GET' && /api/.test(r.url())) console.log('REQ', r.method(), r.url()); });
await p.goto(FE + '/leave/approvals', {waitUntil: 'domcontentloaded', timeout: 120000}); await p.waitForLoadState('networkidle', {timeout: 30000}).catch(() => {});
await p.locator('tr', {hasText: 'NUAURA_TEST_E2E_leave_576556'}).locator('[data-testid^=leave-approve-]').click();
await p.waitForTimeout(1500); await p.screenshot({path: `${SS}/probe-dlg.png`});
console.log((await p.locator('[role=dialog],[role=alertdialog],.mantine-Modal-root').allInnerTexts()).join('||').slice(0, 400));
console.log(await p.locator('button:visible').evaluateAll(e => e.map(x => x.innerText.trim()).filter(Boolean).slice(-8)));
await b.close();
