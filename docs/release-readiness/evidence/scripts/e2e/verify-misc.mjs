import {sess, BE} from './verify-lib.mjs';
import {chromium, newContext, mkLog, watch} from './lib.mjs';
const rec = (id, st, ev) => console.log(`${id} | ${st} | ${ev}`);
const TS = Date.now().toString().slice(-6);
const SHOT = '/Users/fayaz.m/IdeaProjects/nulogic/nu-aura/docs/release-readiness/evidence/screenshots/';
const body = p => p.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));
// S-001 + UI-001/004
{
  const s = await sess('verify_emp'); const {p} = s;
  const r = await s.ctx.request.get(BE + '/api/v1/employees/managers'); const j = await r.json();
  const arr = j.content || j; const keys = Object.keys(arr[0] || {});
  const txt = JSON.stringify(j);
  rec('S-001', r.status() === 200 && !/personalEmail|personal_email/i.test(txt) ? 'PASS' : 'FAIL', `status=${r.status()} n=${arr.length} keys=${keys.join(',')} personalEmail=${/personalEmail/i.test(txt)}`);
  await s.go('/attendance/regularization', 1500);
  await p.getByRole('button', {name: 'New request'}).first().click(); await p.waitForTimeout(800);
  const ta = p.locator('[role=dialog] textarea').first(); await ta.click(); await p.keyboard.type('NUAURA_TEST_VERIFY reason ' + TS, {delay: 20});
  const val = await ta.inputValue(); const crashed = /Something went wrong/.test(await body(p));
  rec('UI-001', val === 'NUAURA_TEST_VERIFY reason ' + TS && !crashed ? 'PASS' : 'FAIL', `typed into WFH reason; value="${val.slice(0, 40)}" errorBoundary=${crashed}`);
  await p.screenshot({path: SHOT + 'verify-UI001.png'});
  await s.go('/me/documents', 3500);
  rec('UI-004', /\/me\/documents/.test(p.url()) && !/\/auth\/login/.test(p.url()) ? 'PASS' : 'FAIL', `url after 3.5s=${p.url().replace(/^.*3000/, '')}; text="${(await body(p)).slice(0, 90)}"`);
  await s.go('/calendar', 3000);
  const ct = await body(p);
  rec('UI-005', /Something went wrong|Failed|error/i.test(ct.slice(0, 600)) ? 'FAIL' : 'PASS', `calendar: http>=400=${JSON.stringify(s.log.http.filter(x => /calendar/.test(x)))}; text="${ct.slice(0, 130)}"`);
  await p.screenshot({path: SHOT + 'verify-UI005.png'});
  await s.b.close();
}
// UI-003, UI-008/009, UI-010 as HR
{
  const s = await sess('verify_hr'); const {p} = s;
  await s.go('/announcements', 1500);
  await p.getByRole('button', {name: 'New Announcement'}).click(); await p.waitForTimeout(800);
  const d = '[role=dialog] ';
  await p.locator(d + 'input[name=title]').fill('NUAURA_TEST_VERIFY announcement ' + TS);
  await p.locator(d + 'textarea[name=content]').fill('verify body');
  s.mut.length = 0;
  await p.locator(d + 'button[type=submit]').click(); await p.waitForTimeout(3500);
  const m = s.mut.filter(x => /announcement/.test(x));
  rec('UI-003', m.some(x => /^20\d /.test(x)) ? 'PASS' : 'FAIL', `calls=${m.join(' ; ').slice(0, 260)}`);
  await p.screenshot({path: SHOT + 'verify-UI003.png'});
  // wall comment
  await s.go('/fluence/wall', 2500);
  const wt = await body(p);
  console.log('wall text', wt.slice(0, 300));
  // timesheets: create timesheet
  await s.go('/timesheets', 1500);
  s.mut.length = 0;
  await p.getByRole('button', {name: 'Create Timesheet'}).first().click(); await p.waitForTimeout(3000);
  rec('UI-008/009', 'INFO', `Create Timesheet click: calls=${s.mut.join(' ; ').slice(0, 240)}; text="${(await body(p)).slice(0, 160)}"`);
  await s.b.close();
}
// Q-001/Q-005 forced 500 (HR admin)
for (const [id, route, pat] of [['Q-001', '/admin/payroll', /\/api\/v1\/payroll/], ['Q-005', '/admin/holidays', /\/api\/v1\/holidays/]]) {
  const s = await sess('verify_hr'); const {p} = s; let n = 0;
  await p.route(pat, r => { if (r.request().method() === 'GET') { n++; return r.fulfill({status: 500, contentType: 'application/json', body: '{"message":"forced"}'}); } return r.continue(); });
  await p.goto('http://localhost:3000' + route, {waitUntil: 'domcontentloaded'}); await p.waitForTimeout(14000);
  const t = await body(p);
  const card = /Something went wrong|Failed to load|Unable to load|Try again|Retry|couldn.t load|error/i.test(t) && /Retry|Try again/i.test(t);
  rec(id, card ? 'PASS' : 'FAIL', `${route} forced-500 on ${n} GETs; error+retry shown=${card}; raw axios msg=${/status code 500/.test(t)}; text="${t.slice(80, 330)}"`);
  await p.screenshot({path: SHOT + `verify-${id}.png`});
  await s.b.close();
}
// login page console
{
  const b = await chromium.launch(); const c = await newContext(b); const p = await c.newPage(); const msgs = [];
  p.on('console', m => { if (['error', 'warning'].includes(m.type())) msgs.push(`${m.type()}: ${m.text().slice(0, 140)}`); }); p.on('pageerror', e => msgs.push('pageerror ' + String(e).slice(0, 140)));
  await p.goto('http://localhost:3000/auth/login', {waitUntil: 'domcontentloaded'}); await p.waitForTimeout(5000);
  rec('LOGIN-console', msgs.length ? 'INFO' : 'PASS', `${msgs.length} error/warn msgs: ${[...new Set(msgs)].join(' || ').slice(0, 500)}`);
  await b.close();
}
