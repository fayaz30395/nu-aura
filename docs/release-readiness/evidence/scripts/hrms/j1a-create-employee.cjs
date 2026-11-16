// J1A: HR admin creates NUAURA_TEST employee through the UI. Env: HRMS_NEW_PW
const { chromium, EV, FE, newCtx, collect, bag, api } = require('./lib.cjs');
const fs = require('fs');
(async () => {
  const out = { steps: [] }; const log = (k, v) => { out.steps.push([k, v]); console.log(k, JSON.stringify(v)); };
  const b = await chromium.launch(); const ctx = await newCtx(b, 'hradmin'); const p = await ctx.newPage(); const B = bag(); collect(p, B);
  let created = null;
  p.on('response', async r => { if (r.url().endsWith('/api/v1/employees') && r.request().method() === 'POST') { created = { status: r.status() }; try { created.body = await r.json(); } catch (e) {} } });
  await p.goto(FE + '/employees', { waitUntil: 'networkidle' });
  await p.screenshot({ path: `${EV}/screenshots/NU-HRMS-E2E-010-employees-list.png` });
  await p.click('button:has-text("Add Employee")'); await p.waitForSelector('text=Add New Employee');
  await p.screenshot({ path: `${EV}/screenshots/NU-HRMS-E2E-011-add-modal-initial.png` });
  // empty submit
  await p.click('form button[type=submit]:has-text("Add Employee")'); await p.waitForTimeout(800);
  const errs = await p.$$eval('.mantine-InputWrapper-error, .mantine-TextInput-error, [data-error] + *, p[class*="error"]', els => els.map(e => (e.textContent||'').trim()).filter(Boolean));
  log('emptySubmitErrors', [...new Set(errs)].slice(0, 12)); log('emptySubmitCreatedCall', created);
  await p.screenshot({ path: `${EV}/screenshots/NU-HRMS-E2E-012-add-modal-empty-validation.png` });
  // fill
  await p.click('[role=tab]:has-text("Basic Info")');
  await p.fill('input[placeholder="EMP001"]', 'NUAURA_TEST_001');
  await p.fill('#emp-first-name', 'NUAURA_TEST_Hrms'); await p.fill('#emp-last-name', 'Alpha');
  await p.fill('input[placeholder="employee@company.com"]', 'nuaura_test_hrms1@nulogic.io');
  await p.fill('input[placeholder="Employee will change on first login"]', process.env.HRMS_NEW_PW);
  await p.click('[role=tab]:has-text("Employment")');
  await p.fill('#emp-designation', 'NUAURA_TEST QA Engineer').catch(async () => p.fill('input[placeholder="Senior Software Engineer"]', 'NUAURA_TEST QA Engineer'));
  await p.selectOption('#emp-employment-type', 'FULL_TIME');
  const depOpts = await p.$$eval('#emp-department option', o => o.map(x => x.value + '|' + x.textContent)); log('deptOptions', depOpts);
  await p.selectOption('#emp-department', { index: 1 });
  await p.fill('#emp-joining-date', new Date().toISOString().slice(0, 10));
  const mgrOpts = await p.$$eval('#emp-manager option', o => o.map(x => x.textContent)); log('managerOptionsSample', mgrOpts.slice(0, 8));
  const sumit = mgrOpts.find(t => /sumit/i.test(t)); log('sumitOption', sumit);
  if (sumit) await p.selectOption('#emp-manager', { label: sumit });
  await p.screenshot({ path: `${EV}/screenshots/NU-HRMS-E2E-013-add-modal-filled.png` });
  await p.click('form button[type=submit]:has-text("Add Employee")'); await p.waitForTimeout(3500);
  log('createCall', created && { status: created.status, id: created.body && created.body.id, code: created.body && created.body.employeeCode, status2: created.body && created.body.status, message: created.body && (created.body.message || created.body.error) });
  await p.screenshot({ path: `${EV}/screenshots/NU-HRMS-E2E-014-after-submit.png` });
  log('bag', B);
  fs.writeFileSync(`${EV}/logs/hrms/NU-HRMS-E2E-010-create-employee.json`, JSON.stringify(out, null, 1));
  await ctx.unrouteAll({ behavior: 'ignoreErrors' }); await b.close();
})();
