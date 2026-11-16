// NU-GROW-E2E-003..030 performance workflow, state machine, boundaries (API-level, DB verified)
const L = require('./lib.cjs'); const D = L.db;
const C = '1101ca3f-eeb1-4f04-922c-41641c818b33';
const ARUN_SELF = '2fc53b68-9c3c-4d2c-a5f3-bc01123994c0', ARUN_MGR = '9b476c16-b759-4818-ba33-5be4182c54aa', SURESH_SELF = '33ff8b4d-d7c4-4e69-b302-242fc49930b2', SURESH_ARUN_E = '48000000-e001-0000-0000-000000000008', ARUN_E = '48000000-e001-0000-0000-000000000009';
const row = (sql) => (D(sql).split('\n')[1] || '');
const ok = (r, ...codes) => codes.includes(r.status);
const rec = (id, sc, pass, note, sev = '') => L.rec(id, sc, pass ? 'PASS' : 'FAIL', note, { sev });
(async () => {
  for (const e of ['suresh@nulogic.io', 'finance@nulogic.io', 'anshuman@nulogic.io']) { console.log('login', e, await L.apiLogin(e)); await L.sleep(13000); }
  let r;
  // 003 employee self-assessment
  r = await L.call('NU-GROW-E2E-003', 'arun', 'PUT', `/api/v1/review-cycles/reviews/${ARUN_SELF}/self-assessment`, { competencyRatings: [{ competencyName: 'NUAURA_TEST_comp_a', rating: 4 }, { competencyName: 'NUAURA_TEST_comp_b', rating: 3 }], overallComments: 'NUAURA_TEST self comment', goalAchievementPercent: 80 });
  let d = row(`select status,self_rating,goal_achievement_percent from performance_reviews where id='${ARUN_SELF}'`);
  rec('NU-GROW-E2E-003', 'Employee submits self-assessment (ratings 4,3 => avg round 4)', ok(r, 200) && d.startsWith('SUBMITTED|4|80'), `http=${r.status} db=${d}`);
  // 004 edit after submit
  r = await L.call('NU-GROW-E2E-004', 'arun', 'PUT', `/api/v1/review-cycles/reviews/${ARUN_SELF}/self-assessment`, { overallComments: 'tamper', goalAchievementPercent: 100 });
  d = row(`select status,goal_achievement_percent from performance_reviews where id='${ARUN_SELF}'`);
  rec('NU-GROW-E2E-004', 'Edit self-assessment after submit rejected', ok(r, 400, 409, 422, 403) && d.endsWith('|80'), `http=${r.status} db=${d}`);
  // 005 generic PUT /reviews/{id} edit after submit (alternate edit path)
  r = await L.call('NU-GROW-E2E-005', 'arun', 'PUT', `/api/v1/reviews/${ARUN_SELF}`, { overallComments: 'tamper2', goalAchievementPercent: 100 });
  d = row(`select status,goal_achievement_percent,overall_comments from performance_reviews where id='${ARUN_SELF}'`);
  rec('NU-GROW-E2E-005', 'Alternate edit path PUT /reviews/{id} after submit blocked for employee', ok(r, 400, 403, 409, 422) && !/tamper2/.test(d), `http=${r.status} db=${d}`, 'High');
  // 006 skipped step: manager review while cycle ACTIVE
  r = await L.call('NU-GROW-E2E-006', 'sumit', 'PUT', `/api/v1/review-cycles/reviews/${ARUN_MGR}/manager-review`, { overallRating: 4, comments: 'NUAURA_TEST early' });
  d = row(`select status,manager_rating from performance_reviews where id='${ARUN_MGR}'`);
  rec('NU-GROW-E2E-006', 'Manager review before MANAGER_REVIEW stage rejected (skipped step)', ok(r, 400, 409, 422) && d.startsWith('DRAFT'), `http=${r.status} db=${d}`);
  // 007 employee cannot submit manager review on own record
  r = await L.call('NU-GROW-E2E-007', 'arun', 'PUT', `/api/v1/review-cycles/reviews/${ARUN_MGR}/manager-review`, { overallRating: 5, comments: 'self rated' });
  rec('NU-GROW-E2E-007', 'Employee cannot submit manager review about self', ok(r, 403, 400, 409, 422), `http=${r.status}`, 'High');
  // 008 employee cannot self-assess someone else's review
  r = await L.call('NU-GROW-E2E-008', 'arun', 'PUT', `/api/v1/review-cycles/reviews/${SURESH_SELF}/self-assessment`, { overallComments: 'NUAURA_TEST impersonate' });
  d = row(`select status from performance_reviews where id='${SURESH_SELF}'`);
  rec('NU-GROW-E2E-008', "Employee cannot submit another employee's self-assessment", ok(r, 403, 404) && d === 'DRAFT', `http=${r.status} db=${d}`, 'High');
  // 009 employee cannot advance / activate / complete cycle
  const r1 = await L.call('NU-GROW-E2E-009', 'arun', 'POST', `/api/v1/review-cycles/${C}/advance`);
  const r2 = await L.call('NU-GROW-E2E-009', 'arun', 'PUT', `/api/v1/review-cycles/${C}/complete`);
  const r3 = await L.call('NU-GROW-E2E-009', 'sumit', 'POST', `/api/v1/review-cycles/${C}/advance`);
  d = row(`select status from review_cycles where id='${C}'`);
  rec('NU-GROW-E2E-009', 'Employee/manager cannot advance or complete cycle', ok(r1, 403) && ok(r2, 403) && ok(r3, 403) && d === 'ACTIVE', `employee advance=${r1.status} complete=${r2.status}; manager advance=${r3.status}; cycle=${d}`, 'High');
  // 010 HR advance ACTIVE -> MANAGER_REVIEW
  r = await L.call('NU-GROW-E2E-010', 'jagadeesh', 'POST', `/api/v1/review-cycles/${C}/advance`);
  d = row(`select status from review_cycles where id='${C}'`);
  rec('NU-GROW-E2E-010', 'HR advances cycle ACTIVE->MANAGER_REVIEW', ok(r, 200) && d === 'MANAGER_REVIEW', `http=${r.status} db=${d}`);
  // 011 self-assessment after stage moved (employee suresh? use arun's own already submitted; use suresh: stage guard)
  r = await L.call('NU-GROW-E2E-011', 'suresh', 'PUT', `/api/v1/review-cycles/reviews/${SURESH_SELF}/self-assessment`, { overallComments: 'NUAURA_TEST late' });
  d = row(`select status from performance_reviews where id='${SURESH_SELF}'`);
  rec('NU-GROW-E2E-011', 'Self-assessment after self stage closed rejected', ok(r, 400, 409, 422) && d === 'DRAFT', `http=${r.status} db=${d}`);
  // 012 wrong manager
  r = await L.call('NU-GROW-E2E-012', 'jagadeesh', 'PUT', `/api/v1/review-cycles/reviews/${ARUN_MGR}/manager-review`, { overallRating: 2, comments: 'NUAURA_TEST not the reviewer' });
  d = row(`select status from performance_reviews where id='${ARUN_MGR}'`);
  rec('NU-GROW-E2E-012', 'Non-assigned user (HR) cannot submit manager review for review owned by other manager', ok(r, 403) && d === 'DRAFT', `http=${r.status} db=${d}`);
  // 013 manager review happy path + invalid rating
  r = await L.call('NU-GROW-E2E-013', 'sumit', 'PUT', `/api/v1/review-cycles/reviews/${ARUN_MGR}/manager-review`, { overallRating: 9, comments: 'x' });
  const bad = r.status;
  r = await L.call('NU-GROW-E2E-013', 'sumit', 'PUT', `/api/v1/review-cycles/reviews/${ARUN_MGR}/manager-review`, { overallRating: 4, comments: 'NUAURA_TEST manager feedback', promotionRecommended: false });
  d = row(`select status,manager_rating,manager_comments from performance_reviews where id='${ARUN_MGR}'`);
  rec('NU-GROW-E2E-013', 'Manager review: rating 9 rejected (400), rating 4 accepted, DB IN_REVIEW', bad === 400 && ok(r, 200) && /^IN_REVIEW\|4/.test(d), `bad=${bad} ok=${r.status} db=${d}`);
  // 014 edit manager review after submit
  r = await L.call('NU-GROW-E2E-014', 'sumit', 'PUT', `/api/v1/review-cycles/reviews/${ARUN_MGR}/manager-review`, { overallRating: 1, comments: 'tamper' });
  d = row(`select manager_rating from performance_reviews where id='${ARUN_MGR}'`);
  rec('NU-GROW-E2E-014', 'Manager review cannot be edited after submit', ok(r, 400, 409, 422) && d === '4', `http=${r.status} db=${d}`);
  // 015 calibration rating outside calibration stage
  r = await L.call('NU-GROW-E2E-015', 'jagadeesh', 'PUT', `/api/v1/review-cycles/reviews/${ARUN_MGR}/calibration-rating`, { finalRating: 4 });
  rec('NU-GROW-E2E-015', 'Calibration rating rejected before CALIBRATION stage', ok(r, 400, 409, 422), `http=${r.status}`);
  // 016 advance to CALIBRATION, bad rating, good rating, manager cannot calibrate
  await L.call('NU-GROW-E2E-016', 'jagadeesh', 'POST', `/api/v1/review-cycles/${C}/advance`);
  const rb = await L.call('NU-GROW-E2E-016', 'jagadeesh', 'PUT', `/api/v1/review-cycles/reviews/${ARUN_MGR}/calibration-rating`, { finalRating: 6 });
  const rm = await L.call('NU-GROW-E2E-016', 'sumit', 'PUT', `/api/v1/review-cycles/reviews/${ARUN_MGR}/calibration-rating`, { finalRating: 5 });
  const rg = await L.call('NU-GROW-E2E-016', 'jagadeesh', 'PUT', `/api/v1/review-cycles/reviews/${ARUN_MGR}/calibration-rating`, { finalRating: 3 });
  d = row(`select final_rating from performance_reviews where id='${ARUN_MGR}'`);
  rec('NU-GROW-E2E-016', 'Calibration: rating 6 => 400; manager => 403; HR rating 3 accepted, DB final_rating=3', ok(rb, 400) && ok(rm, 403) && ok(rg, 200) && d === '3', `bad=${rb.status} mgr=${rm.status} hr=${rg.status} db=${d}`);
  // 017 calibration view as employee
  r = await L.call('NU-GROW-E2E-017', 'arun', 'GET', `/api/v1/review-cycles/${C}/calibration`);
  rec('NU-GROW-E2E-017', 'Employee cannot read cycle calibration data (all employees ratings)', ok(r, 403), `http=${r.status}`, 'High');
  // 018 HR calibration read
  r = await L.call('NU-GROW-E2E-018', 'jagadeesh', 'GET', `/api/v1/review-cycles/${C}/calibration`);
  rec('NU-GROW-E2E-018', 'HR reads calibration report', ok(r, 200) && r.body && r.body.totalEmployees >= 1, `http=${r.status} total=${r.body && r.body.totalEmployees}`);
  // 019 advance to RATINGS_PUBLISHED then COMPLETED, then further advance/complete/edit
  const a1 = await L.call('NU-GROW-E2E-019', 'jagadeesh', 'POST', `/api/v1/review-cycles/${C}/advance`);
  const a2 = await L.call('NU-GROW-E2E-019', 'jagadeesh', 'POST', `/api/v1/review-cycles/${C}/advance`);
  const a3 = await L.call('NU-GROW-E2E-019', 'jagadeesh', 'POST', `/api/v1/review-cycles/${C}/advance`);
  const a4 = await L.call('NU-GROW-E2E-019', 'jagadeesh', 'PUT', `/api/v1/review-cycles/${C}/complete`);
  d = row(`select status from review_cycles where id='${C}'`);
  rec('NU-GROW-E2E-019', 'HR completes cycle; advance/complete after COMPLETED rejected', ok(a1, 200) && ok(a2, 200) && ok(a3, 400, 409, 422) && ok(a4, 400, 409, 422) && d === 'COMPLETED', `adv1=${a1.status} adv2(complete)=${a2.status} adv3=${a3.status} complete-again=${a4.status} db=${d}`);
  // 020 edit completed cycle metadata
  r = await L.call('NU-GROW-E2E-020', 'jagadeesh', 'PUT', `/api/v1/review-cycles/${C}`, { cycleName: 'NUAURA_TEST_renamed_after_complete', cycleType: 'QUARTERLY', startDate: '2026-11-01', endDate: '2026-12-31', status: 'ACTIVE' });
  d = row(`select status from review_cycles where id='${C}'`);
  rec('NU-GROW-E2E-020', 'Completed cycle cannot be reopened via PUT status=ACTIVE', ok(r, 400, 403, 409, 422) && d === 'COMPLETED', `http=${r.status} db=${d}`, 'Medium');
  // 021-025 boundaries (read)
  const tests = [
    ['NU-GROW-E2E-021', 'Employee cannot list all reviews (GET /reviews)', 'arun', '/api/v1/reviews', 'listall'],
    ['NU-GROW-E2E-022', "Employee cannot read another employee's reviews", 'arun', `/api/v1/reviews/employee/${SURESH_ARUN_E}`, 'deny'],
    ['NU-GROW-E2E-023', "Employee cannot read another's review by id", 'arun', `/api/v1/reviews/${SURESH_SELF}`, 'deny'],
    ['NU-GROW-E2E-024', 'Peer employee (anshuman) cannot read arun review by id', 'anshuman', `/api/v1/reviews/${ARUN_MGR}`, 'deny'],
    ['NU-GROW-E2E-025', "Manager (sumit) cannot read non-report suresh's review", 'sumit', `/api/v1/reviews/${SURESH_SELF}`, 'deny'],
    ['NU-GROW-E2E-026', 'Recruiter (suresh) cannot read arun review', 'suresh', `/api/v1/reviews/${ARUN_MGR}`, 'deny'],
    ['NU-GROW-E2E-027', 'Payroll/finance cannot read arun review', 'finance', `/api/v1/reviews/${ARUN_MGR}`, 'deny'],
    ['NU-GROW-E2E-028', "Employee cannot read another's pending reviews (/pending/{reviewerId})", 'arun', '/api/v1/reviews/pending/48000000-e001-0000-0000-000000000001', 'deny'],
  ];
  for (const [id, sc, who, url, kind] of tests) {
    r = await L.call(id, who, 'GET', url);
    const leaked = r.status === 200 && JSON.stringify(r.body).length > 60 && (kind === 'deny' ? !/"content":\[\]/.test(JSON.stringify(r.body)) && !(Array.isArray(r.body) && !r.body.length) : false);
    let pass = kind === 'listall' ? (r.status === 403 || (r.status === 200 && (r.body.content || []).every(x => x.employeeId === ARUN_E || x.reviewerId === ARUN_E))) : (r.status === 403 || r.status === 404 || (r.status === 200 && !leaked));
    rec(id, sc, pass, `http=${r.status} body=${JSON.stringify(r.body).slice(0, 160)}`, pass ? '' : 'Critical');
  }
  // 029 manager own reports: sumit sees arun's
  r = await L.call('NU-GROW-E2E-029', 'sumit', 'GET', `/api/v1/reviews/${ARUN_MGR}`);
  rec('NU-GROW-E2E-029', 'Manager can read own report review (positive control)', ok(r, 200), `http=${r.status}`);
  // 030 employee reads own review
  r = await L.call('NU-GROW-E2E-030', 'arun', 'GET', `/api/v1/reviews/${ARUN_SELF}`);
  rec('NU-GROW-E2E-030', 'Employee reads own review (positive control)', ok(r, 200), `http=${r.status}`);
  L.save('perf3');
})();
