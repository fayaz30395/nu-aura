import {chromium, newContext, watch, mkLog, FE, SS, sql, STATE} from './lib.mjs';
import fs from 'fs';
const out = {}; const b = await chromium.launch();
// A: payroll admin views runs
const ac = await newContext(b, {role: 'payroll'}); const ap = await ac.newPage(); const alog = mkLog(); watch(ap, alog);
const runsApi = []; ap.on('response', async r => { if (/\/payroll\/runs/.test(r.url()) && r.request().method() === 'GET') runsApi.push(r.status()); });
await ap.goto(`${FE}/payroll/runs`, {waitUntil: 'domcontentloaded', timeout: 120000}); await ap.waitForLoadState('networkidle', {timeout: 30000}).catch(() => {}); await ap.waitForTimeout(1500);
const rtxt = await ap.locator('main').first().innerText().catch(() => ap.locator('body').innerText());
out.runsUi = rtxt.replace(/\n+/g, ' | ').slice(0, 700); out.runsApi = runsApi;
await ap.screenshot({path: `${SS}/NU-UI-003-payroll-runs.png`, fullPage: true});
out.runsDb = sql("select pay_period_month||'/'||pay_period_year||':'||status||':'||total_employees from payroll_runs order by pay_period_year, pay_period_month");
// admin payslips page
await ap.goto(`${FE}/payroll/payslips`, {waitUntil: 'domcontentloaded'}); await ap.waitForLoadState('networkidle', {timeout: 30000}).catch(() => {}); await ap.waitForTimeout(1500);
out.adminPayslipsUi = (await ap.locator('main').first().innerText().catch(() => '')).replace(/\n+/g, ' | ').slice(0, 400);
await ap.screenshot({path: `${SS}/NU-UI-003-admin-payslips.png`, fullPage: true});
// B: employee downloads payslip
const ec = await newContext(b, {role: 'vfyj'}); const ep = await ec.newPage(); const elog = mkLog(); watch(ep, elog);
const pdfResp = []; ep.on('response', r => { if (/payslips?.*(pdf|download)/i.test(r.url())) pdfResp.push(`${r.status()} ${r.headers()['content-type']} ${r.url().replace(/^https?:\/\/[^/]+/, '').replace(/[0-9a-f-]{36}/g, '{id}')}`); });
const listApi = []; ep.on('response', async r => { if (/payslips/.test(r.url()) && !/pdf/.test(r.url()) && r.request().method()==='GET' && r.status()===200) { try { const j = await r.json(); listApi.push(JSON.stringify(j).slice(0, 200)); } catch {} } });
await ep.goto(`${FE}/me/payslips`, {waitUntil: 'domcontentloaded', timeout: 120000}); await ep.waitForLoadState('networkidle', {timeout: 30000}).catch(() => {}); await ep.waitForTimeout(1500);
const etxt = await ep.locator('body').innerText();
out.empNet = /23,806\.45/.test(etxt); out.empCards = (etxt.match(/Download PDF/g) || []).length;
await ep.screenshot({path: `${SS}/NU-UI-003-employee-payslip.png`, fullPage: true});
const dl = ep.waitForEvent('download', {timeout: 40000}).catch(e => null);
await ep.getByText('Download PDF').first().click();
const d = await dl;
if (d) { const f = STATE + '/payslip_e2e.pdf'; await d.saveAs(f); const buf = fs.readFileSync(f); out.pdf = {name: d.suggestedFilename(), bytes: buf.length, magic: buf.slice(0, 5).toString()}; }
else out.pdf = 'NO DOWNLOAD EVENT';
await ep.waitForTimeout(800);
out.pdfApi = pdfResp; out.listApi = listApi.slice(0, 2);
out.db = sql("select p.pay_period_month||'/'||p.pay_period_year, pr.status, p.net_salary, p.gross_salary, p.pdf_file_id is not null from payslips p join payroll_runs pr on pr.id=p.payroll_run_id join employees e on e.id=p.employee_id join users u on u.id=e.user_id where u.email='nuaura_test_vfy_j@nulogic.io'");
out.logs = {a: alog, e: elog};
console.log(JSON.stringify(out, null, 1).slice(0, 5000)); fs.writeFileSync(STATE + '/j3.json', JSON.stringify(out));
await b.close();
