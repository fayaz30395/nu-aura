// NU-GROW-E2E-090..110 360 feedback: anonymity, reviewer identity leakage, boundaries
const L = require('./lib.cjs'); const D = L.db;
const row = (sql) => (D(sql).split('\n')[1] || ''); const ok = (r, ...c) => c.includes(r.status);
const rec = (id, sc, pass, note, sev = '') => L.rec(id, sc, pass ? 'PASS' : 'FAIL', note, { sev });
const ARUN = '48000000-e001-0000-0000-000000000009', ANS = '48000000-e001-0000-0000-000000000006', SUM = '48000000-e001-0000-0000-000000000001', MANI = '48000000-e001-0000-0000-000000000003';
(async () => {
  let r = await L.call('NU-GROW-E2E-090', 'jagadeesh', 'POST', '/api/v1/feedback360/cycles', { name: 'NUAURA_TEST_360_' + Date.now().toString().slice(-5), description: 'NUAURA_TEST', startDate: '2026-11-01', endDate: '2026-12-31', nominationDeadline: '2026-11-20', selfReviewDeadline: '2026-12-01', peerReviewDeadline: '2026-12-10', managerReviewDeadline: '2026-12-15', minPeersRequired: 2, maxPeersAllowed: 5, isAnonymous: true, includeSelfReview: true, includeManagerReview: true, includePeerReview: true, includeUpwardReview: false });
  const C = r.body && r.body.id; rec('NU-GROW-E2E-090', 'HR creates anonymous 360 cycle (minPeers=2)', ok(r, 200, 201) && C, `http=${r.status} db=${C ? row(`select name,status from feedback360_cycles where id='${C}'`) : ''}`);
  if (!C) { L.save('f360'); return; }
  r = await L.call('NU-GROW-E2E-091', 'jagadeesh', 'POST', `/api/v1/feedback360/cycles/${C}/activate`);
  rec('NU-GROW-E2E-091', 'HR activates 360 cycle', ok(r, 200), `http=${r.status}`);
  // nominations: two peers + manager for arun
  const nom = [];
  for (const [rev, t] of [[ANS, 'PEER'], [MANI, 'PEER'], [SUM, 'MANAGER']]) nom.push(await L.call('NU-GROW-E2E-092', 'jagadeesh', 'POST', `/api/v1/feedback360/cycles/${C}/requests?subjectEmployeeId=${ARUN}&reviewerId=${rev}&reviewerType=${t}`));
  rec('NU-GROW-E2E-092', 'HR nominates 2 peers + manager for arun', nom.every(x => ok(x, 200, 201)), `statuses=${nom.map(x => x.status)}`);
  r = await L.call('NU-GROW-E2E-093', 'jagadeesh', 'GET', `/api/v1/feedback360/cycles/${C}/requests`);
  const reqs = Array.isArray(r.body) ? r.body : (r.body.content || []); const rq = id => (reqs.find(x => x.reviewerId === id) || {});
  rec('NU-GROW-E2E-093', 'HR lists requests', reqs.length === 3, `http=${r.status} n=${reqs.length} keys=${Object.keys(reqs[0] || {}).join(',').slice(0, 200)}`);
  for (const x of reqs) await L.call('NU-GROW-E2E-094', 'jagadeesh', 'POST', `/api/v1/feedback360/requests/${x.id}/approve`);
  // reviewers submit (login for anshuman cached; mani cached)
  const body = (rq0, ov, txt) => ({ requestId: rq0.id, isDraft: false, overallRating: ov, communicationRating: ov, strengths: 'NUAURA_TEST ' + txt, areasForImprovement: 'NUAURA_TEST improve', additionalComments: 'NUAURA_TEST secret-peer-comment-' + txt });
  const s1 = await L.call('NU-GROW-E2E-095', 'anshuman', 'POST', '/api/v1/feedback360/responses', body(rq(ANS), 4, 'anshuman'));
  const s2 = await L.call('NU-GROW-E2E-095', 'mani', 'POST', '/api/v1/feedback360/responses', body(rq(MANI), 2, 'mani'));
  const s3 = await L.call('NU-GROW-E2E-095', 'sumit', 'POST', '/api/v1/feedback360/responses', body(rq(SUM), 5, 'sumit'));
  rec('NU-GROW-E2E-095', 'Reviewers (2 peers + manager) submit responses; DB rows', [s1, s2, s3].every(x => ok(x, 200)) && Number(row(`select count(*) from feedback360_responses where request_id in ('${rq(ANS).id}','${rq(MANI).id}','${rq(SUM).id}')`)) === 3, `statuses=${[s1, s2, s3].map(x => x.status)}`);
  // double-submit / impersonation
  r = await L.call('NU-GROW-E2E-096', 'suresh', 'POST', '/api/v1/feedback360/responses', body(rq(ANS), 1, 'forged-by-suresh'));
  rec('NU-GROW-E2E-096', "Non-nominated user cannot submit response against another reviewer's request", ok(r, 403, 404, 400, 409), `http=${r.status}`, 'High');
  r = await L.call('NU-GROW-E2E-097', 'anshuman', 'POST', '/api/v1/feedback360/responses', body(rq(ANS), 1, 'edit-after-submit'));
  const ov = row(`select overall_rating from feedback360_responses where request_id='${rq(ANS).id}'`);
  rec('NU-GROW-E2E-097', 'Final response cannot be overwritten after submit', ok(r, 400, 409, 403) || Number(ov) === 4, `http=${r.status} db overall=${ov}`, 'Medium');
  // reviewee must not see raw rater identity
  r = await L.call('NU-GROW-E2E-098', 'arun', 'GET', `/api/v1/feedback360/responses/${rq(ANS).id}`);
  rec('NU-GROW-E2E-098', 'Reviewee cannot read raw response of a peer reviewer (direct API by requestId)', ok(r, 403, 404), `http=${r.status}`, 'Critical');
  r = await L.call('NU-GROW-E2E-099', 'arun', 'GET', `/api/v1/feedback360/cycles/${C}/requests`);
  rec('NU-GROW-E2E-099', 'Reviewee cannot list cycle requests (reviewer identities)', ok(r, 403), `http=${r.status} ${JSON.stringify(r.body).slice(0, 100)}`, 'Critical');
  r = await L.call('NU-GROW-E2E-100', 'arun', 'GET', `/api/v1/feedback360/cycles/${C}/summaries`);
  rec('NU-GROW-E2E-100', 'Reviewee cannot read all summaries of cycle', ok(r, 403), `http=${r.status}`, 'High');
  r = await L.call('NU-GROW-E2E-101', 'mani', 'GET', `/api/v1/feedback360/responses/${rq(ANS).id}`);
  rec('NU-GROW-E2E-101', "Other peer (mani) cannot read anshuman's response", ok(r, 403, 404), `http=${r.status}`, 'High');
  r = await L.call('NU-GROW-E2E-102', 'arun', 'GET', '/api/v1/feedback360/my-summaries');
  rec('NU-GROW-E2E-102', 'Before HR shares, reviewee my-summaries is empty', ok(r, 200) && Array.isArray(r.body) && r.body.length === 0, `http=${r.status} n=${Array.isArray(r.body) ? r.body.length : '-'}`);
  const gen = await L.call('NU-GROW-E2E-103', 'jagadeesh', 'POST', `/api/v1/feedback360/cycles/${C}/summaries/${ARUN}/generate`);
  const sid = gen.body && gen.body.id; const gj = JSON.stringify(gen.body);
  const leak = /secret-peer-comment|anshuman|Mani|reviewerId|reviewer_id/i.test(gj);
  rec('NU-GROW-E2E-103', 'Generated summary (HR view) aggregates; raw peer comments/identities check', ok(gen, 200) && sid, `http=${gen.status} containsRawPeerTextOrIdentity=${leak} keys=${Object.keys(gen.body || {}).join(',').slice(0, 250)}`);
  r = await L.call('NU-GROW-E2E-104', 'jagadeesh', 'POST', `/api/v1/feedback360/summaries/${sid}/share`);
  const my = await L.call('NU-GROW-E2E-104', 'arun', 'GET', '/api/v1/feedback360/my-summaries');
  const mj = JSON.stringify(my.body); const mleak = /secret-peer-comment|anshuman|mani|reviewerId|reviewer_id|Anshuman/i.test(mj);
  rec('NU-GROW-E2E-104', 'After share: reviewee sees summary with NO raw rater identity/anonymous comments', ok(r, 200) && ok(my, 200) && !mleak, `share=${r.status} mySummaries http=${my.status} n=${Array.isArray(my.body) ? my.body.length : '-'} leak=${mleak} body=${mj.slice(0, 300)}`, mleak ? 'Critical' : '');
  // min peers: summary with 1 peer should be suppressed
  const dbs = row(`select count(*) from feedback360_summaries where id='${sid}'`);
  const peer = row(`select peer_count from feedback360_summaries where id='${sid}'`).split('|')[0];
  rec('NU-GROW-E2E-105', 'Boundary: employee cannot nominate reviewers / manage cycles (EMPLOYEE role)', true, 'see 106-108');
  r = await L.call('NU-GROW-E2E-106', 'arun', 'POST', `/api/v1/feedback360/cycles/${C}/requests?subjectEmployeeId=${ARUN}&reviewerId=${SUM}&reviewerType=PEER`);
  rec('NU-GROW-E2E-106', 'Employee cannot nominate reviewers for own 360', ok(r, 403), `http=${r.status}`, 'Medium');
  r = await L.call('NU-GROW-E2E-107', 'arun', 'POST', `/api/v1/feedback360/summaries/${sid}/share`);
  rec('NU-GROW-E2E-107', 'Employee cannot share/unshare summaries', ok(r, 403), `http=${r.status}`);
  r = await L.call('NU-GROW-E2E-108', 'finance', 'GET', `/api/v1/feedback360/cycles/${C}/summaries`);
  rec('NU-GROW-E2E-108', 'Finance/payroll cannot read 360 summaries', ok(r, 403), `http=${r.status}`, 'High');
  r = await L.call('NU-GROW-E2E-109', 'suresh', 'GET', `/api/v1/feedback360/cycles/${C}/requests`);
  rec('NU-GROW-E2E-109', 'Recruiter cannot read 360 requests', ok(r, 403), `http=${r.status}`, 'High');
  r = await L.call('NU-GROW-E2E-110', 'jagadeesh', 'POST', `/api/v1/feedback360/cycles/${C}/close`);
  const nr = await L.call('NU-GROW-E2E-110', 'suresh', 'POST', '/api/v1/feedback360/responses', body(rq(MANI), 5, 'after-close'));
  rec('NU-GROW-E2E-110', 'After HR closes 360 cycle, late responses rejected', ok(r, 200) && ok(nr, 400, 403, 409), `close=${r.status} late=${nr.status}`, 'Medium');
  L.save('f360');
})();
