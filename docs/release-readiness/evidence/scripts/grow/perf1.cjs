// NU-GROW-E2E-001..003: HR creates NUAURA_TEST cycle via UI, activates for Recruitment dept via UI
const L = require('./lib.cjs'); const SS = L.EV + '/screenshots/';
const NAME = 'NUAURA_TEST_PerfCycle_' + Date.now().toString().slice(-6);
(async () => {
  const b = await L.chromium.launch(); const ctx = await L.newCtx(b, 'jagadeesh@nulogic.io'); const p = await ctx.newPage();
  const cons = [], http = []; 
  p.on('console', m => m.type() === 'error' && cons.push(m.text().slice(0, 200)));
  p.on('response', async r => { if (/\/api\/v1\//.test(r.url()) && r.request().method() !== 'GET') { let t = ''; try { t = (await r.text()).slice(0, 300) } catch {} http.push(`${r.status()} ${r.request().method()} ${r.url().replace(/^https?:\/\/[^/]+/, '')} ${t}`); } });
  if (!await L.gotoAuthed(p, '/performance/cycles')) throw new Error('auth 429/redirect');
  await p.screenshot({ path: SS + 'NU-GROW-E2E-001-cycles-list.png' });
  L.net.length = 0;
  await p.getByRole('button', { name: /Create|New/i }).first().click();
  await p.fill('input[placeholder^="e.g., Annual"]', NAME);
  await p.selectOption('#cycle-type', 'QUARTERLY').catch(() => {});
  await p.selectOption('#cycle-status', 'PLANNING').catch(() => {});
  for (const [id, v] of [['cycle-start-date', '2026-11-01'], ['cycle-end-date', '2026-12-31'], ['cycle-review-deadline', '2026-12-20'], ['cycle-self-review-deadline', '2026-12-10']]) { await p.fill('#' + id, v); await p.keyboard.press('Tab'); }
  await p.screenshot({ path: SS + 'NU-GROW-E2E-001-form-filled.png' });
  L.net.length = 0;
  await p.getByRole('button', { name: /Create Cycle|Create$|Save/i }).last().click(); await p.waitForTimeout(2500);
  await p.screenshot({ path: SS + 'NU-GROW-E2E-001-after-create.png' });
  const created = L.net.find(h => /POST .*review-cycles/.test(h));
  const row = L.db(`select id,cycle_name,status,tenant_id from review_cycles where cycle_name='${NAME}'`);
  const visible = await p.getByText(NAME).count();
  L.rec('NU-GROW-E2E-001', 'HR creates review cycle via UI', created && /^201/.test(created) && row.includes(NAME) && visible ? 'PASS' : 'FAIL', `api=${created?.slice(0,120)} | dbrow=${row.split('\n')[1]} | visibleInUI=${visible} | console=${cons.length}`, { name: NAME });
  console.log('NET', L.net); console.log('CONS', cons.slice(0, 5));
  L.fs.writeFileSync(L.STATE + '/cycle.json', JSON.stringify({ name: NAME }));
  await b.close(); L.save('perf1');
})();
