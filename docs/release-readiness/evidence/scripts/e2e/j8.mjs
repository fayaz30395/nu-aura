import {chromium, newContext, watch, mkLog, FE, SS, STATE} from './lib.mjs';
import fs from 'fs';
const pages = [['employee', '/me/dashboard', 'dashboard'], ['employee', '/leave', 'leave'], ['employee', '/performance/okr', 'okr'], ['employee', '/fluence/wiki', 'wiki'], ['payroll', '/payroll/runs', 'payroll-runs'], ['recruiter', '/recruitment/candidates', 'candidates']];
const vps = [['1440x900', {width: 1440, height: 900}], ['390x844', {width: 390, height: 844}]];
const out = []; const b = await chromium.launch();
for (const [role, path, name] of pages) for (const [vn, vp] of vps) {
  const c = await newContext(b, {role, viewport: vp}); const p = await c.newPage(); const log = mkLog(); watch(p, log);
  await p.goto(FE + path, {waitUntil: 'domcontentloaded', timeout: 120000}).catch(() => {}); await p.waitForLoadState('networkidle', {timeout: 25000}).catch(() => {}); await p.waitForTimeout(1500);
  const m = await p.evaluate(() => { const de = document.documentElement; const over = [...document.querySelectorAll('body *')].filter(e => { const r = e.getBoundingClientRect(); return r.right > innerWidth + 1 && r.width > 0 && getComputedStyle(e).position !== 'fixed' && !e.closest('[class*=overflow-x],table,[style*=overflow]'); }).slice(0, 3).map(e => e.tagName + '.' + String(e.className).slice(0, 40)); return {sw: de.scrollWidth, cw: de.clientWidth, over}; });
  const ce = log.console.filter(x => !/WebSocket connection/.test(x)); const ws = log.console.length - ce.length;
  await p.screenshot({path: `${SS}/NU-UI-008-${name}-${vn}.png`});
  const row = {page: path, vp: vn, overflowX: m.sw > m.cw, scrollWidth: m.sw, clientWidth: m.cw, offenders: m.over, consoleErrors: ce.length, wsNoise: ws, http4xx: [...new Set(log.http)], errs: ce.slice(0, 3).map(x => x.slice(0, 100))};
  out.push(row); console.log(JSON.stringify(row));
  await c.close();
}
fs.writeFileSync(STATE + '/j8.json', JSON.stringify(out)); await b.close();
