// NU-GROW-E2E-002: HR activates cycle (scope=DEPARTMENT/Recruitment) via UI
const L = require('./lib.cjs'); const SS = L.EV + '/screenshots/'; const ID = '1101ca3f-eeb1-4f04-922c-41641c818b33', NAME = 'NUAURA_TEST_PerfCycle_241136';
(async () => {
  const b = await L.chromium.launch(); const ctx = await L.newCtx(b, 'jagadeesh@nulogic.io'); const p = await ctx.newPage();
  if (!await L.gotoAuthed(p, '/performance/cycles')) throw new Error('auth');
  const card = p.locator('div,article,section').filter({ hasText: NAME }).filter({ has: p.getByRole('button', { name: /Activate/ }) }).last();
  await card.getByRole('button', { name: /^Activate$/ }).click();
  await p.getByRole('button', { name: /Department/ }).click();
  await p.screenshot({ path: SS + 'NU-GROW-E2E-002-activate-modal.png' });
  await p.getByText('Recruitment', { exact: false }).last().click();
  L.net.length = 0;
  await p.getByRole('button', { name: /Activate Cycle/ }).click(); await p.waitForTimeout(3500);
  await p.screenshot({ path: SS + 'NU-GROW-E2E-002-activated.png' });
  const api = L.net.find(x => /activate/.test(x));
  const st = L.db(`select status from review_cycles where id='${ID}'`);
  const rv = L.db(`select review_type,count(*) from performance_reviews where review_cycle_id='${ID}' group by 1 order by 1`);
  L.rec('NU-GROW-E2E-002', 'HR activates cycle for Recruitment dept via UI', /^200/.test(api || '') && /ACTIVE/.test(st) ? 'PASS' : 'FAIL', `api=${(api||'none').slice(0,200)} | cycleStatus=${st.split('\n')[1]} | reviews=${rv.replace(/\n/g, ';')}`);
  await b.close(); L.save('perf2');
})();
