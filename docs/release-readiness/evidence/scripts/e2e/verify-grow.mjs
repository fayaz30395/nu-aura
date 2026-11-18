import {sess, BE} from './verify-lib.mjs';
const rec = (id, st, ev) => console.log(`${id} | ${st} | ${ev}`);
const TS = Date.now().toString().slice(-6);
// G-001
{
  const s = await sess('verify_emp'); const {p} = s;
  const courses = await (await s.ctx.request.get(BE + '/api/v1/lms/courses?size=5')).json();
  const c = (courses.content || courses)[0];
  let q = 0; const qs = []; p.on('request', r => { if (/quizzes/.test(r.url())) { q++; qs.push(r.url().replace(/^https?:\/\/[^/]+/, '')); } });
  const sc = []; p.on('response', r => { if (/quizzes/.test(r.url())) sc.push(r.status()); });
  await p.goto('http://localhost:3000/learning/courses/' + c.id, {waitUntil: 'domcontentloaded'}); await p.waitForTimeout(8000);
  rec('G-001', q < 20 && !/\/auth\/login/.test(p.url()) ? 'PASS' : 'FAIL', `course ${c.id}: quizzes requests in 8s=${q} statuses=${[...new Set(sc)]} url=${p.url().replace(/^.*3000/, '')} title="${(await p.title()).slice(0,40)}"`);
  await s.b.close();
}
// G-002
{
  const s = await sess('verify_emp'); const {p} = s;
  await s.go('/performance/goals', 1500);
  await p.getByRole('button', {name: 'Create Goal'}).first().click(); await p.waitForTimeout(1000);
  console.log('dlg form', JSON.stringify(await p.evaluate(() => [...document.querySelectorAll('[role=dialog] input,[role=dialog] textarea,[role=dialog] select,[role=dialog] button')].map(e => `${e.tagName}[${e.type}|${e.name}|${e.placeholder || e.innerText?.slice(0, 20)}]`))));
  await s.b.close();
}
