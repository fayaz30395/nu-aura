// NU-GROW-E2E-031..050 clean second cycle: correct-order flow + repro of findings from perf3
const L = require('./lib.cjs'); const D = L.db;
const row = (sql) => (D(sql).split('\n')[1] || ''); const ok = (r, ...c) => c.includes(r.status);
const rec = (id, sc, pass, note, sev = '') => L.rec(id, sc, pass ? 'PASS' : 'FAIL', note, { sev });
const REC = '48000000-de00-0000-0000-000000000003';
const mk = async (tag) => { const r = await L.call('NU-GROW-E2E-031', 'jagadeesh', 'POST', '/api/v1/review-cycles', { cycleName: 'NUAURA_TEST_Cycle_' + tag + '_' + Date.now().toString().slice(-5), cycleType: 'QUARTERLY', startDate: '2026-11-01', endDate: '2026-12-31', selfReviewDeadline: '2026-12-10', managerReviewDeadline: '2026-12-20', status: 'PLANNING' });
  const a = await L.call('NU-GROW-E2E-031', 'jagadeesh', 'POST', `/api/v1/review-cycles/${r.body.id}/activate`, { scopeType: 'DEPARTMENT', departmentIds: [REC], createSelfReviews: true, createManagerReviews: true });
  return { id: r.body.id, name: r.body.cycleName, act: a.status }; };
const rv = (cyc, type, emp) => row(`select id from performance_reviews where review_cycle_id='${cyc}' and review_type='${type}' and employee_id='${emp}'`);
const ARUN = '48000000-e001-0000-0000-000000000009', SUR = '48000000-e001-0000-0000-000000000008';
(async () => {
  console.log('admin login', await L.apiLogin('admin@nulogic.io')); await L.sleep(13000);
  const c2 = await mk('B'); L.fs.writeFileSync(L.STATE + '/c2.json', JSON.stringify(c2));
  rec('NU-GROW-E2E-031', 'API: HR creates + activates second cycle (Recruitment dept)', c2.act === 200, JSON.stringify(c2));
  const as = rv(c2.id, 'SELF', ARUN), am = rv(c2.id, 'MANAGER', ARUN), ss = rv(c2.id, 'SELF', SUR);
  let r = await L.call('NU-GROW-E2E-032', 'arun', 'PUT', `/api/v1/review-cycles/reviews/${as}/self-assessment`, { competencyRatings: [{ competencyName: 'NUAURA_TEST_a', rating: 5 }, { competencyName: 'NUAURA_TEST_b', rating: 2 }], overallComments: 'NUAURA_TEST self', goalAchievementPercent: 70 });
  let d = row(`select status,self_rating from performance_reviews where id='${as}'`);
  rec('NU-GROW-E2E-032', 'Self-assessment ratings 5,2 -> avg 3.5 stored as int (rounding check)', ok(r, 200), `http=${r.status} db=${d} (avg 3.5 -> expected 4 by Math.round; verify)`);
  // HR advances (correct order)
  r = await L.call('NU-GROW-E2E-033', 'jagadeesh', 'POST', `/api/v1/review-cycles/${c2.id}/advance`);
  d = row(`select status from review_cycles where id='${c2.id}'`);
  rec('NU-GROW-E2E-033', 'HR advances ACTIVE -> MANAGER_REVIEW', ok(r, 200) && d === 'MANAGER_REVIEW', `http=${r.status} db=${d}`);
  // manager review
  const bad = await L.call('NU-GROW-E2E-034', 'sumit', 'PUT', `/api/v1/review-cycles/reviews/${am}/manager-review`, { overallRating: 9, comments: 'x' });
  r = await L.call('NU-GROW-E2E-034', 'sumit', 'PUT', `/api/v1/review-cycles/reviews/${am}/manager-review`, { overallRating: 4, comments: 'NUAURA_TEST mgr feedback', promotionRecommended: false });
  d = row(`select status,manager_rating,manager_comments from performance_reviews where id='${am}'`);
  rec('NU-GROW-E2E-034', 'Manager review: rating 9 => 400, 4 accepted, DB IN_REVIEW/4', bad.status === 400 && ok(r, 200) && /^IN_REVIEW\|4/.test(d), `bad=${bad.status} ok=${r.status} db=${d}`);
  r = await L.call('NU-GROW-E2E-035', 'sumit', 'PUT', `/api/v1/review-cycles/reviews/${am}/manager-review`, { overallRating: 1, comments: 'tamper' });
  d = row(`select manager_rating from performance_reviews where id='${am}'`);
  rec('NU-GROW-E2E-035', 'Manager review not editable after submit', ok(r, 409, 400) && d === '4', `http=${r.status} db=${d}`);
  // visibility of manager rating to employee before publish
  r = await L.call('NU-GROW-E2E-036', 'arun', 'GET', `/api/v1/reviews/${am}`);
  const exposed = r.status === 200 && r.body && (r.body.managerRating != null || r.body.overallRating != null || r.body.managerComments);
  rec('NU-GROW-E2E-036', 'Employee must not see manager rating/comments before ratings published (stage MANAGER_REVIEW)', !exposed, `http=${r.status} managerRating=${r.body && r.body.managerRating} managerComments=${r.body && r.body.managerComments}`, exposed ? 'Medium' : '');
  // HR_MANAGER calibration perms
  await L.call('NU-GROW-E2E-037', 'jagadeesh', 'POST', `/api/v1/review-cycles/${c2.id}/advance`);
  r = await L.call('NU-GROW-E2E-037', 'jagadeesh', 'PUT', `/api/v1/review-cycles/reviews/${am}/calibration-rating`, { finalRating: 3 });
  rec('NU-GROW-E2E-037', 'HR_MANAGER (jagadeesh) can set calibration rating (UI lets HR_MANAGER calibrate?)', ok(r, 200), `http=${r.status} (HR_MANAGER lacks CALIBRATION:MANAGE per DB; informational)`, ok(r, 200) ? '' : 'Medium');
  const bad2 = await L.call('NU-GROW-E2E-038', 'admin', 'PUT', `/api/v1/review-cycles/reviews/${am}/calibration-rating`, { finalRating: 6 });
  const mg = await L.call('NU-GROW-E2E-038', 'sumit', 'PUT', `/api/v1/review-cycles/reviews/${am}/calibration-rating`, { finalRating: 5 });
  r = await L.call('NU-GROW-E2E-038', 'admin', 'PUT', `/api/v1/review-cycles/reviews/${am}/calibration-rating`, { finalRating: 3 });
  d = row(`select final_rating from performance_reviews where id='${am}'`);
  rec('NU-GROW-E2E-038', 'Calibration by HR_ADMIN: 6 => 400, manager => 403, 3 accepted, DB final_rating=3', bad2.status === 400 && mg.status === 403 && ok(r, 200) && d === '3', `bad=${bad2.status} mgr=${mg.status} admin=${r.status} db=${d}`);
  // employee sees final before publish?
  await L.call('NU-GROW-E2E-039', 'jagadeesh', 'POST', `/api/v1/review-cycles/${c2.id}/advance`); // RATINGS_PUBLISHED
  r = await L.call('NU-GROW-E2E-039', 'arun', 'GET', `/api/v1/reviews/${am}`);
  rec('NU-GROW-E2E-039', 'After RATINGS_PUBLISHED employee sees own final rating (positive)', ok(r, 200), `http=${r.status} final=${r.body && (r.body.finalRating)}`);
  r = await L.call('NU-GROW-E2E-040', 'jagadeesh', 'POST', `/api/v1/review-cycles/${c2.id}/advance`);
  d = row(`select status from review_cycles where id='${c2.id}'`);
  rec('NU-GROW-E2E-040', 'HR completes cycle; DB COMPLETED', ok(r, 200) && d === 'COMPLETED', `http=${r.status} db=${d}`);
  // post-complete mutations
  r = await L.call('NU-GROW-E2E-041', 'suresh', 'PUT', `/api/v1/review-cycles/reviews/${ss}/self-assessment`, { overallComments: 'late' });
  const r2 = await L.call('NU-GROW-E2E-041', 'admin', 'PUT', `/api/v1/review-cycles/reviews/${am}/calibration-rating`, { finalRating: 1 });
  rec('NU-GROW-E2E-041', 'No review mutation after cycle COMPLETED (self, calibration)', ok(r, 409, 400) && ok(r2, 409, 400), `self=${r.status} calib=${r2.status}`);
  r = await L.call('NU-GROW-E2E-042', 'jagadeesh', 'PUT', `/api/v1/review-cycles/${c2.id}`, { cycleName: c2.name, cycleType: 'QUARTERLY', startDate: '2026-11-01', endDate: '2026-12-31', status: 'ACTIVE' });
  d = row(`select status from review_cycles where id='${c2.id}'`);
  rec('NU-GROW-E2E-042', 'REPRO: completed cycle reopened via PUT status=ACTIVE must be rejected', ok(r, 400, 403, 409, 422) && d === 'COMPLETED', `http=${r.status} db=${d}`, 'Medium');
  // 025 repro
  r = await L.call('NU-GROW-E2E-043', 'sumit', 'GET', `/api/v1/reviews/${ss}`);
  const mgrOfSuresh = row(`select manager_id from employees where id='${SUR}'`);
  rec('NU-GROW-E2E-043', "REPRO: manager (sumit) must not read non-report (suresh) review; suresh.manager_id=" + mgrOfSuresh, ok(r, 403, 404), `http=${r.status} fields=${r.body && Object.keys(r.body).join(',').slice(0, 150)}`, 'High');
  r = await L.call('NU-GROW-E2E-043', 'sumit', 'GET', `/api/v1/reviews/employee/${SUR}`);
  rec('NU-GROW-E2E-043b', 'REPRO: manager lists non-report employee reviews', ok(r, 403, 404), `http=${r.status} n=${Array.isArray(r.body) ? r.body.length : '-'}`, 'High');
  // cycle3: manager advance + skip-complete
  const c3 = await mk('C'); L.fs.writeFileSync(L.STATE + '/c3.json', JSON.stringify(c3));
  r = await L.call('NU-GROW-E2E-044', 'sumit', 'POST', `/api/v1/review-cycles/${c3.id}/advance`);
  d = row(`select status from review_cycles where id='${c3.id}'`);
  rec('NU-GROW-E2E-044', 'REPRO: a line MANAGER must not be able to advance org-wide review cycle', ok(r, 403), `http=${r.status} cycleNow=${d}`, 'High');
  r = await L.call('NU-GROW-E2E-045', 'jagadeesh', 'PUT', `/api/v1/review-cycles/${c3.id}/complete`);
  d = row(`select status from review_cycles where id='${c3.id}'`);
  const pend = row(`select count(*) from performance_reviews where review_cycle_id='${c3.id}' and status='DRAFT'`);
  rec('NU-GROW-E2E-045', 'Skipped steps: completing a cycle mid-stage (no calibration/publish, DRAFT reviews pending) should be rejected', ok(r, 400, 409, 422), `http=${r.status} cycle=${d} draftReviewsLeft=${pend}`, 'Medium');
  L.save('perf4');
})();
