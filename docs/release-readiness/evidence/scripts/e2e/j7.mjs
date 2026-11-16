import {chromium, newContext, watch, mkLog, FE, BE, SS, STATE} from './lib.mjs';
import fs from 'fs';
const out = {pages: {}, api: {}}; const b = await chromium.launch();
const c = await newContext(b, {role: 'employee'}); const p = await c.newPage();
const routes = ['/admin', '/admin/users', '/admin/roles', '/admin/permissions', '/admin/audit', '/admin/settings', '/admin/payroll', '/admin/system', '/admin/feature-flags', '/admin/employees', '/admin/integrations', '/admin/import-keka'];
for (const r of routes) {
  const log = mkLog(); const h = []; const f = x => { if (x.status() >= 200 && /\/api\/v1\/(admin|users|roles|permissions|audit)/.test(x.url())) h.push(`${x.status()} ${x.request().method()} ${x.url().replace(/^https?:\/\/[^/]+/, '').slice(0, 70)}`); };
  p.on('response', f);
  await p.goto(FE + r, {waitUntil: 'domcontentloaded', timeout: 120000}).catch(() => {}); await p.waitForLoadState('networkidle', {timeout: 20000}).catch(() => {}); await p.waitForTimeout(1200);
  const body = await p.locator('body').innerText(); const url = new URL(p.url());
  const denied = /access restricted|not authorized|permission|denied/i.test(body) || url.pathname !== r;
  const adminContent = /Create User|Add User|Delete|Role Management|Permission Matrix/i.test(body) && url.pathname === r && !denied;
  out.pages[r] = {finalPath: url.pathname + url.search, denied, adminContentVisible: adminContent, apiCalls: h};
  p.off('response', f);
}
await p.screenshot({path: `${SS}/NU-UI-007-denied-last.png`});
await p.goto(FE + '/admin/users', {waitUntil: 'domcontentloaded'}); await p.waitForTimeout(2500); await p.screenshot({path: `${SS}/NU-UI-007-admin-users-denied.png`});
for (const a of ['/api/v1/admin/users', '/api/v1/users', '/api/v1/roles', '/api/v1/permissions', '/api/v1/audit/logs', '/api/v1/admin/system/health', '/api/v1/tenants']) {
  const r = await c.request.get(BE + a); out.api[a] = r.status();
}
console.log(JSON.stringify(out, null, 1)); fs.writeFileSync(STATE + '/j7.json', JSON.stringify(out)); await b.close();
