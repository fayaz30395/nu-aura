import {sess, BE} from './verify-lib.mjs';
const rec = (id, st, ev) => console.log(`${id} | ${st} | ${ev}`);
const TS = Date.now().toString().slice(-6);
{
  const s = await sess('verify_emp'); const {p} = s;
  await s.go('/performance/goals', 1500);
  await p.getByRole('button', {name: 'Create Goal'}).first().click(); await p.waitForTimeout(800);
  await p.locator('[role=dialog] input[name=title]').fill('NUAURA_TEST_VERIFY goal ' + TS);
  await p.locator('[role=dialog] textarea[name=description]').fill('verify goal');
  await p.locator('[role=dialog] input[name=targetValue]').fill('10'); await p.locator('[role=dialog] input[name=currentValue]').fill('0'); await p.locator('[role=dialog] input[name=unit]').fill('tasks');
  await p.locator('[role=dialog] input[name=startDate]').fill('2026-11-18');
  await p.locator('[role=dialog] input[name=endDate]').fill('2026-12-31');
  s.mut.length = 0;
  await p.locator('[role=dialog] button[type=submit]').click(); await p.waitForTimeout(3500);
  const m = s.mut.filter(x => /goals/.test(x));
  rec('G-002', m.some(x => /^20\d /.test(x)) ? 'PASS' : 'FAIL', `calls=${m.join(' ; ').slice(0, 330)}; dialogOpen=${await p.locator('[role=dialog]').count()}`);
  await p.screenshot({path: '/Users/fayaz.m/IdeaProjects/nulogic/nu-aura/docs/release-readiness/evidence/screenshots/verify-G002.png'});
  await s.b.close();
}
{
  const s = await sess('verify_hr'); const {p} = s;
  await s.go('/surveys', 1500);
  await p.getByRole('button', {name: 'Create Survey'}).first().click(); await p.waitForTimeout(800);
  const d = '[role=dialog] ';
  await p.locator(d + 'input[name=surveyCode]').fill('NUAURA_VERIFY_' + TS);
  await p.locator(d + 'input[name=title]').fill('NUAURA_TEST_VERIFY survey ' + TS);
  await p.locator(d + 'textarea[name=description]').fill('verify');
  await p.locator(d + 'input[name=startDate]').fill('2026-11-18'); await p.locator(d + 'input[name=endDate]').fill('2026-12-31');
  s.mut.length = 0;
  await p.locator(d + 'button', {hasText: 'Create Survey'}).click(); await p.waitForTimeout(3500);
  const m = s.mut.filter(x => /surveys/.test(x));
  rec('G-003', m.some(x => /^20\d /.test(x)) ? 'PASS' : 'FAIL', `calls=${m.join(' ; ').slice(0, 330)}; dialogOpen=${await p.locator('[role=dialog]').count()}`);
  await p.screenshot({path: '/Users/fayaz.m/IdeaProjects/nulogic/nu-aura/docs/release-readiness/evidence/screenshots/verify-G003.png'});
  await s.b.close();
}
