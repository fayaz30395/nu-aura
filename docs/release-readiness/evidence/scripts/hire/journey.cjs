// NU-HIRE journey (API-level with real browser-session cookies). Needs HIRE_STATE (storageState dir).
// Writes results JSON to $HIRE_OUT (default evidence/logs/hire/results.json). All data prefixed NUAURA_TEST_.
const { chromium, rewrite, newCtx, api, BE, EV } = require('./lib.cjs');
const { execSync } = require('child_process');
const fs = require('fs'), path = require('path');
const OUT = process.env.HIRE_OUT || `${EV}/logs/hire/results.json`;
const R = [], S = {}; // results, shared state
const db = (sql) => { try { return execSync(`${__dirname}/db.sh ${JSON.stringify(sql)}`, { encoding: 'utf8' }).trim(); } catch (e) { return 'DBERR ' + String(e.message).slice(0, 200); } };
const rec = (id, scenario, ui, apiRes, dbRes, status, note = '') => {
  const row = { id, scenario, ui, api: apiRes, db: dbRes, status, note }; R.push(row);
  console.log(id, status, '|', scenario, '|', String(apiRes).slice(0, 110), note ? '| ' + note : '');
  fs.writeFileSync(OUT, JSON.stringify(R, null, 1));
};
const ST = (r) => `${r.status}`;
const TS = Date.now().toString().slice(-6);
const EMP = { sumit: '48000000-e001-0000-0000-000000000001', arun: '48000000-e001-0000-0000-000000000009', suresh: '48000000-e001-0000-0000-000000000008', jag: '48000000-e001-0000-0000-000000000007' };
const DEPT = '48000000-de00-0000-0000-000000000003';
const TEN = '660e8400-e29b-41d4-a716-446655440001';
const pub = async (browser, method, url, opts = {}) => { const c = await browser.newContext(); const r = await c.request.fetch(BE + url, { method, ...opts, headers: { ...(opts.noTenant ? {} : { 'X-Tenant-ID': TEN }) } }); let b = null; try { b = await r.json(); } catch (e) { b = (await r.text()).slice(0, 200); } await c.close(); return { status: r.status(), body: b }; };

(async () => {
  const browser = await chromium.launch();
  const ctx = {}; for (const r of ['recadmin', 'hrmgr', 'mgr', 'emp', 'hradmin', 'tadmin']) { if (fs.existsSync(`${process.env.HIRE_STATE}/${r}.json`)) ctx[r] = await newCtx(browser, r); }
  const have = Object.keys(ctx); console.log('contexts', have.join(','));
  const A = (role, m, u, b) => api(ctx[role], m, u, b);

  // 001 create job opening (DRAFT)
  let r = await A('recadmin', 'POST', '/api/v1/recruitment/job-openings', { jobTitle: `NUAURA_TEST_Engineer_${TS}`, departmentId: DEPT, location: 'Chennai', employmentType: 'FULL_TIME', numberOfOpenings: 2, minSalary: 600000, maxSalary: 900000, status: 'DRAFT', priority: 'MEDIUM', jobDescription: 'NUAURA_TEST synthetic opening', hiringManagerId: EMP.sumit, isActive: true });
  S.job = r.body && r.body.id;
  rec('NU-HIRE-E2E-001', 'Create job opening (DRAFT) as RECRUITMENT_ADMIN', '-', `${ST(r)} status=${r.body && r.body.status}`, db(`select id,job_title,status from job_openings where id='${S.job}'`), r.status === 201 && r.body.status === 'DRAFT' ? 'PASS' : 'FAIL');
  rec('NU-HIRE-E2E-002', 'Requisition approval workflow before publish', '-', 'no requisition/approval endpoint in RecruitmentController (job-openings CRUD only); JobStatus enum DRAFT/OPEN/ON_HOLD/CLOSED/CANCELLED', '-', 'BLOCKED', 'FEATURE ABSENT: no requisition approval step');

  // 003 publish
  r = await A('recadmin', 'PUT', `/api/v1/recruitment/job-openings/${S.job}`, { jobTitle: `NUAURA_TEST_Engineer_${TS}`, departmentId: DEPT, location: 'Chennai', employmentType: 'FULL_TIME', numberOfOpenings: 2, minSalary: 600000, maxSalary: 900000, status: 'OPEN', priority: 'MEDIUM', jobDescription: 'NUAURA_TEST synthetic opening', hiringManagerId: EMP.sumit, isActive: true, postedDate: new Date().toISOString().slice(0, 10) });
  rec('NU-HIRE-E2E-003', 'Publish opening (status OPEN)', '-', `${ST(r)} status=${r.body && r.body.status}`, db(`select status,posted_date from job_openings where id='${S.job}'`), r.status === 200 && r.body.status === 'OPEN' ? 'PASS' : 'FAIL');

  { const p = await A('recadmin', 'PUT', `/api/v1/recruitment/job-openings/${S.job}`, { jobTitle: `NUAURA_TEST_Engineer_${TS}`, departmentId: DEPT, status: 'OPEN', isActive: true });
    const after = db(`select coalesce(min_salary::text,'NULL')||'|'||coalesce(location,'NULL')||'|'||coalesce(hiring_manager_id::text,'NULL') from job_openings where id='${S.job}'`).split('\n')[1];
    rec('NU-HIRE-E2E-003b', 'PUT job-opening with omitted optional fields must not wipe salary/location/hiringManager', '-', `${ST(p)}`, `after partial PUT: ${after}`, /NULL/.test(after || '') ? 'FAIL' : 'PASS', 'FAIL = PUT is full-replace; omitted fields nulled (data loss for API clients)');
    await A('recadmin', 'PUT', `/api/v1/recruitment/job-openings/${S.job}`, { jobTitle: `NUAURA_TEST_Engineer_${TS}`, departmentId: DEPT, location: 'Chennai', employmentType: 'FULL_TIME', numberOfOpenings: 2, minSalary: 600000, maxSalary: 900000, status: 'OPEN', priority: 'MEDIUM', jobDescription: 'NUAURA_TEST synthetic opening', hiringManagerId: EMP.sumit, isActive: true, postedDate: new Date().toISOString().slice(0, 10) }); }
  // 004 public careers unauth
  { const q = await pub(browser, 'GET', '/api/v1/public/careers/jobs', { noTenant: true });
    rec('NU-HIRE-E2E-004a', 'Public careers WITHOUT tenant header (what the /careers page sends) lists NuLogic demo job', '-', `${ST(q)} contains_job=${JSON.stringify(q.body).includes(S.job)}`, '-', JSON.stringify(q.body).includes(S.job) ? 'PASS' : 'FAIL', 'local default-tenant-id=550e8400-...0000 != demo tenant 660e8400-...0001; careers FE never sends X-Tenant-ID'); }
  r = await pub(browser, 'GET', '/api/v1/public/careers/jobs');
  const list = JSON.stringify(r.body);
  rec('NU-HIRE-E2E-004', 'Public career API lists published job (unauthenticated)', '(see ui script)', `${ST(r)} contains_job=${list.includes(S.job)}`, '-', r.status === 200 && list.includes(S.job) ? 'PASS' : 'FAIL', list.slice(0, 120));
  r = await pub(browser, 'GET', `/api/v1/public/careers/jobs/${S.job}`);
  S.pubDetail = r;
  const leak = JSON.stringify(r.body);
  rec('NU-HIRE-E2E-005', 'Public job detail exposes no internal fields (salary band/hiringManager/tenantId)', '-', `${ST(r)} keys=${r.body && typeof r.body === 'object' ? Object.keys(r.body).join(',') : ''}`, '-', /hiringManager|tenantId|minSalary|createdBy/i.test(leak) ? 'FAIL' : 'PASS', /hiringManager|tenantId|minSalary|createdBy/i.test(leak) ? 'internal field leaked: ' + (leak.match(/hiringManager|tenantId|minSalary|createdBy/i) || [])[0] : '');

  // 006 public apply: local stack enforces reCAPTCHA -> cannot obtain a Google token headless
  const pdf = Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n');
  r = await pub(browser, 'POST', '/api/v1/public/careers/apply', { multipart: { jobId: S.job, firstName: 'NUAURA_TEST_Pub', lastName: `Cand${TS}`, email: `nuaura_test_pub_${TS}@example.test`, captchaToken: 'NUAURA_TEST_invalid', resume: { name: 'NUAURA_TEST_resume.pdf', mimeType: 'application/pdf', buffer: pdf } } });
  rec('NU-HIRE-E2E-006', 'Public apply (unauth) with invalid/absent reCAPTCHA token is rejected and creates no candidate', '-', `${ST(r)} ${JSON.stringify(r.body).slice(0, 110)}`, db(`select count(*) from candidates where email='nuaura_test_pub_${TS}@example.test'`), r.status === 400 && /aptcha/.test(JSON.stringify(r.body)) ? 'PASS' : 'FAIL');
  rec('NU-HIRE-E2E-007', 'Public apply happy path + duplicate-application block', '-', 'reCAPTCHA enforced locally; valid Google token cannot be minted in headless/offline test (no remote calls allowed)', '-', 'BLOCKED', 'needs RECAPTCHA test keys or CAPTCHA_ENABLED=false (isolated config change not made: shared stack)');
  // resume validation exercised through the same FileStorageService used by public apply (POST /api/v1/files/upload)
  const upl = async (id, scen, name, mime, buf, expectReject) => {
    const cks = await ctx.recadmin.cookies(BE); const xs = (cks.find(c => c.name === 'XSRF-TOKEN') || {}).value;
    const x0 = await ctx.recadmin.request.fetch(BE + '/api/v1/recruitment/ai/parse-resume/upload', { method: 'POST', headers: { 'X-XSRF-TOKEN': xs }, multipart: { file: { name, mimeType: mime, buffer: buf } } });
    let bd = null; try { bd = await x0.json(); } catch (e) { bd = (await x0.text()).slice(0, 200); }
    const x = { status: x0.status(), body: bd }; const ok = x.status < 300;
    rec(id, scen, '-', `${ST(x)} ${JSON.stringify(x.body).slice(0, 160)}`, '-', expectReject ? (ok ? 'FAIL' : 'PASS') : (ok ? 'PASS' : 'FAIL'), 'endpoint: POST /recruitment/ai/parse-resume/upload (RECRUITMENT_CREATE). /files/upload needs DOCUMENT:UPLOAD held only by SUPER_ADMIN; public /apply blocked by reCAPTCHA');
    S.lastUpl = x; return x;
  };
  await upl('NU-HIRE-E2E-008a', 'Resume upload valid PDF (control)', 'NUAURA_TEST_resume.pdf', 'application/pdf', pdf, false);
  await upl('NU-HIRE-E2E-008', 'Resume bad type (.exe / application/x-msdownload) rejected', 'NUAURA_TEST_evil.exe', 'application/x-msdownload', Buffer.from('MZ\x90\x00fake'), true);
  await upl('NU-HIRE-E2E-008b', 'Resume type spoof: exe bytes declared application/pdf rejected', 'NUAURA_TEST_spoof.pdf', 'application/pdf', Buffer.from('MZ\x90\x00fakeexe-content-not-a-pdf'), true);
  const tr = await upl('NU-HIRE-E2E-009', 'Resume path-traversal filename (../../etc/NUAURA_TEST.pdf) handled safely (rejected or sanitized)', '../../etc/NUAURA_TEST.pdf', 'application/pdf', pdf, false);
  R[R.length - 1].status = (tr.status < 300 && /\.\.\//.test(JSON.stringify(tr.body))) ? 'FAIL' : 'PASS';
  await upl('NU-HIRE-E2E-010', 'Resume oversize (21 MB PDF) rejected', 'NUAURA_TEST_big.pdf', 'application/pdf', Buffer.concat([pdf, Buffer.alloc(21 * 1024 * 1024, 0x20)]), true);
  { const d = await A('hradmin', 'POST', '/api/v1/files/upload', null); rec('NU-HIRE-E2E-010b', 'DOCUMENT:UPLOAD permission (documents/resume store) available to HR roles', '-', `${ST(d)} (no multipart; permission gate hit first if 403)`, '-', d.status === 403 ? 'FAIL' : 'INCONCLUSIVE', 'permission matrix: DOCUMENT:UPLOAD only on SUPER_ADMIN'); }
  fs.writeFileSync(OUT, JSON.stringify(R, null, 1));

  // 011 add candidates via authenticated API (A=pipeline, B=rejected, C=selected->offer)
  const mkCand = async (tag) => { const x = await A('recadmin', 'POST', '/api/v1/recruitment/candidates', { jobOpeningId: S.job, candidateCode: `NUAURA_TEST_${tag}_${TS}`, firstName: `NUAURA_TEST_${tag}`, lastName: `L${TS}`, email: `nuaura_test_${tag.toLowerCase()}_${TS}@example.test`, phone: '9000000000', currentLocation: 'Chennai' }); return x; };
  { const z = await A('recadmin', 'POST', '/api/v1/recruitment/candidates', { jobOpeningId: S.job, firstName: 'NUAURA_TEST_NoCode', lastName: 'L', email: `nuaura_test_nocode_${TS}@example.test` });
    rec('NU-HIRE-E2E-011a', 'Create candidate without candidateCode (field is optional in DTO)', '-', `${ST(z)} ${JSON.stringify(z.body).slice(0, 100)}`, '-', z.status === 201 ? 'PASS' : 'FAIL', 'DTO says optional but DB candidate_code NOT NULL and service does not generate -> 400 DB_INTEGRITY_VIOLATION'); }
  const cA = await mkCand('Alpha'), cB = await mkCand('Bravo'), cC = await mkCand('Charlie');
  S.cA = cA.body && cA.body.id; S.cB = cB.body && cB.body.id; S.cC = cC.body && cC.body.id;
  rec('NU-HIRE-E2E-011', 'Add 3 candidates (NUAURA_TEST_*) via API as RECRUITMENT_ADMIN', '(ui script)', `${ST(cA)}/${ST(cB)}/${ST(cC)}`, db(`select id,first_name,status,current_stage from candidates where id in ('${S.cA}','${S.cB}','${S.cC}')`), [cA, cB, cC].every(x => x.status === 201) ? 'PASS' : 'FAIL', JSON.stringify(cA.body).slice(0, 150));

  // applicants for scorecard (needs applicantId)
  const mkApp = async (cid) => A('recadmin', 'POST', '/api/v1/recruitment/applicants', { candidateId: cid, jobOpeningId: S.job, source: 'WEBSITE', notes: 'NUAURA_TEST' });
  const aA = await mkApp(S.cA), aC = await mkApp(S.cC), aB = await mkApp(S.cB);
  S.aA = aA.body && aA.body.id; S.aB = aB.body && aB.body.id; S.aC = aC.body && aC.body.id;
  rec('NU-HIRE-E2E-012', 'Create applicant records linking candidates to job', '-', `${ST(aA)}/${ST(aB)}/${ST(aC)} ${JSON.stringify(aA.body).slice(0, 100)}`, db(`select id,status from applicants where id in ('${S.aA}','${S.aB}','${S.aC}')`), [aA, aB, aC].every(x => x.status === 201 || x.status === 200) ? 'PASS' : 'FAIL');

  // 013 pipeline moves
  r = await A('recadmin', 'PUT', `/api/v1/recruitment/candidates/${S.cA}/stage`, { stage: 'SCREENING', notes: 'NUAURA_TEST generic stage probe' });
  rec('NU-HIRE-E2E-013a', 'Pipeline move to generic enum stage SCREENING (Java RecruitmentStage value; FE kanban uses it)', '(ui script)', `${ST(r)} ${r.body && r.body.errorCode}`, db(`select current_stage,status from candidates where id='${S.cA}'`), r.status === 200 ? 'PASS' : 'FAIL', 'DB CHECK candidates_current_stage_check (V20) allows only 13 legacy stage names; enum values APPLICATION_RECEIVED/SCREENING/INTERVIEW/OFFER/JOINED are rejected');
  for (const st of ['RECRUITERS_PHONE_CALL', 'PANEL_REVIEW', 'PANEL_SHORTLISTED', 'TECHNICAL_INTERVIEW_SCHEDULED']) {
    r = await A('recadmin', 'PUT', `/api/v1/recruitment/candidates/${S.cA}/stage`, { stage: st, notes: 'NUAURA_TEST move' });
    rec(`NU-HIRE-E2E-013-${st}`, `Pipeline move candidate Alpha -> ${st}`, '(ui script)', `${ST(r)} stage=${r.body && r.body.currentStage} status=${r.body && r.body.status}`, db(`select current_stage,status from candidates where id='${S.cA}'`), r.status === 200 && (r.body.currentStage === st) ? 'PASS' : 'FAIL');
  }
  r = await A('recadmin', 'PUT', `/api/v1/recruitment/candidates/${S.cA}/stage`, { stage: 'OFFER_NDA_TO_BE_RELEASED' });
  rec('NU-HIRE-E2E-013s', 'Skip-ahead guard: TECH_INTERVIEW_SCHEDULED -> OFFER_NDA_TO_BE_RELEASED (>2 stages) blocked', '-', `${ST(r)}`, db(`select current_stage from candidates where id='${S.cA}'`), r.status >= 400 ? 'PASS' : 'FAIL');
  for (const st of ['RECRUITERS_PHONE_CALL', 'PANEL_REVIEW', 'PANEL_SHORTLISTED', 'TECHNICAL_INTERVIEW_SCHEDULED']) await A('recadmin', 'PUT', `/api/v1/recruitment/candidates/${S.cC}/stage`, { stage: st });
  // applicant status chain for C (SCREENING -> INTERVIEW -> OFFER_PENDING)
  for (const st of ['SCREENING', 'INTERVIEW']) await A('recadmin', 'PUT', `/api/v1/recruitment/applicants/${S.aC}/status`, { status: st });

  // 014 schedule interviews (interviewer sumit) for A and C
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 19);
  let slot = 0; const mkInt = async (cid) => A('recadmin', 'POST', '/api/v1/recruitment/interviews', { candidateId: cid, jobOpeningId: S.job, interviewRound: 'TECHNICAL_1', interviewType: 'VIDEO', scheduledAt: new Date(Date.now() + 86400000 * (2 + (slot++) * 3) + TS % 1000 * 60000).toISOString().slice(0, 19), durationMinutes: 45, interviewerId: EMP.sumit, meetingLink: 'https://example.test/NUAURA_TEST', status: 'SCHEDULED', createGoogleMeet: false });
  const iA = await mkInt(S.cA), iC = await mkInt(S.cC);
  S.iA = iA.body && iA.body.id; S.iC = iC.body && iC.body.id;
  rec('NU-HIRE-E2E-014', 'Schedule interview with interviewer assigned (Sumit, MANAGER)', '(ui script)', `${ST(iA)}/${ST(iC)} ${JSON.stringify(iA.body).slice(0, 140)}`, db(`select id,interviewer_id,status,scheduled_at from interviews where id in ('${S.iA}','${S.iC}')`), iA.status === 201 && iC.status === 201 ? 'PASS' : 'FAIL');

  // 015 scorecard: interviewer submits; duplicate; non-interviewer
  const sc = (iid, aid, rating = 4) => ({ interviewId: iid, applicantId: aid, jobOpeningId: S.job, overallRating: rating, recommendation: 'YES', overallNotes: 'NUAURA_TEST', criteriaScores: [{ name: 'NUAURA_TEST Coding', category: 'TECH', rating: 4, weight: 1.0 }] });
  if (ctx.mgr) {
    r = await A('mgr', 'POST', '/api/v1/recruitment/scorecards/submit-probe-skip', null).catch(() => null); // noop to warm cookies
    r = await A('mgr', 'POST', '/api/v1/recruitment/scorecards/00000000-0000-0000-0000-000000000000/submit', sc(S.iA, S.aA));
    // templateId path variable: backend allows null template? record exact outcome
    S.scTemplateTry = r;
    rec('NU-HIRE-E2E-015a', 'Assigned interviewer submits scorecard (template id path = nil UUID probe)', '-', `${ST(r)} ${JSON.stringify(r.body).slice(0, 140)}`, db(`select id,interviewer_id,status from interview_scorecards where interview_id='${S.iA}'`), null);
    R[R.length - 1].status = r.status === 201 ? 'PASS' : 'INCONCLUSIVE'; R[R.length - 1].note = r.status === 201 ? '' : 'nil-UUID template rejected; retry with real template';
    if (r.status !== 201) {
      const t = await A('hrmgr', 'POST', '/api/v1/recruitment/scorecards', { name: `NUAURA_TEST_Tpl_${TS}`, description: 'x', criteria: [{ name: 'Coding', category: 'TECH', weight: 1, orderIndex: 0 }] });
      S.tpl = t.body && t.body.id;
      rec('NU-HIRE-E2E-015t', 'Create scorecard template as HR_MANAGER', '-', `${ST(t)} ${JSON.stringify(t.body).slice(0, 120)}`, '-', t.status === 201 ? 'PASS' : 'FAIL');
      if (S.tpl) { r = await A('mgr', 'POST', `/api/v1/recruitment/scorecards/${S.tpl}/submit`, sc(S.iA, S.aA)); R[R.length - 1].note += ''; rec('NU-HIRE-E2E-015', 'Assigned interviewer submits scorecard', '(ui script)', `${ST(r)} ${JSON.stringify(r.body).slice(0, 140)}`, db(`select id,interviewer_id,status,overall_rating from interview_scorecards where interview_id='${S.iA}'`), r.status === 201 ? 'PASS' : 'FAIL'); }
    }
    const tplId = S.tpl || '00000000-0000-0000-0000-000000000000';
    r = await A('mgr', 'POST', `/api/v1/recruitment/scorecards/${tplId}/submit`, sc(S.iA, S.aA));
    rec('NU-HIRE-E2E-016', 'Duplicate scorecard (same interviewer+interview) blocked', '-', `${ST(r)} ${JSON.stringify(r.body).slice(0, 140)}`, db(`select count(*) from interview_scorecards where interview_id='${S.iA}' and interviewer_id='${EMP.sumit}'`), r.status >= 400 ? 'PASS' : 'FAIL');
    r = await A('hrmgr', 'POST', `/api/v1/recruitment/scorecards/${tplId}/submit`, sc(S.iC, S.aC));
    rec('NU-HIRE-E2E-017', 'Non-interviewer (HR_MANAGER) cannot submit scorecard for interview assigned to Sumit', '-', `${ST(r)} ${JSON.stringify(r.body).slice(0, 140)}`, db(`select count(*) from interview_scorecards where interview_id='${S.iC}'`), r.status === 403 ? 'PASS' : 'FAIL');
    r = await A('recadmin', 'POST', `/api/v1/recruitment/scorecards/${tplId}/submit`, sc(S.iC, S.aC));
    rec('NU-HIRE-E2E-017b', 'Non-interviewer (RECRUITMENT_ADMIN) cannot submit scorecard', '-', `${ST(r)} ${JSON.stringify(r.body).slice(0, 140)}`, db(`select count(*) from interview_scorecards where interview_id='${S.iC}'`), r.status === 403 ? 'PASS' : 'FAIL');
  } else rec('NU-HIRE-E2E-015', 'Scorecard journey', '-', 'no mgr session (login 429)', '-', 'BLOCKED', 'login rate-limited');

  // 018 reject B, select C
  r = await A('recadmin', 'PUT', `/api/v1/recruitment/applicants/${S.aB}/status`, { status: 'REJECTED', rejectionReason: 'NUAURA_TEST not a fit' });
  rec('NU-HIRE-E2E-018', 'Reject applicant Bravo', '(ui script)', `${ST(r)} ${JSON.stringify(r.body).slice(0, 120)}`, db(`select status,rejection_reason from applicants where id='${S.aB}'`), r.status === 200 ? 'PASS' : 'FAIL');
  r = await A('recadmin', 'PUT', `/api/v1/recruitment/applicants/${S.aC}/status`, { status: 'OFFER_PENDING' });
  rec('NU-HIRE-E2E-019', 'Select applicant Charlie', '-', `${ST(r)} ${JSON.stringify(r.body).slice(0, 120)}`, db(`select status from applicants where id='${S.aC}'`), r.status === 200 ? 'PASS' : 'FAIL');
  { const wf = await A('tadmin', 'POST', '/api/v1/workflow/definitions', { name: `NUAURA_TEST_Offer_Approval_${TS}`, entityType: 'RECRUITMENT_OFFER', workflowType: 'SEQUENTIAL', isDefault: true, defaultSlaHours: 48, steps: [{ stepOrder: 1, stepName: 'HR approval', approverType: 'SPECIFIC_USER', specificUserId: '48000000-0e02-0000-0000-000000000007', minApprovals: 1 }] });
    S.wf = wf.body && wf.body.id; rec('NU-HIRE-E2E-019a', 'Configure RECRUITMENT_OFFER approval workflow (approver Jagadeesh HR_MANAGER) as TENANT_ADMIN', '-', `${ST(wf)} ${JSON.stringify(wf.body).slice(0, 120)}`, db(`select id,name,entity_type from workflow_definitions where id='${S.wf}'`), wf.status === 201 ? 'PASS' : 'FAIL', 'prerequisite: without it createOffer returns 500 (see 020x)'); }
  { const o = await A('recadmin', 'POST', `/api/v1/recruitment/candidates/${S.cB}/offer`, { offeredSalary: 1, positionTitle: 'NUAURA_TEST', joiningDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10) });
    rec('NU-HIRE-E2E-019b', 'Offer must NOT be creatable for a REJECTED applicant/candidate (Bravo)', '-', `${ST(o)}`, db(`select status,current_stage from candidates where id='${S.cB}'`), o.status >= 400 ? 'PASS' : 'FAIL', 'no precondition on candidate status in createOffer'); }

  // 020 offer generate; 021 approve (absent); 022 accept
  r = await A('recadmin', 'POST', `/api/v1/recruitment/candidates/${S.cC}/offer`, { offeredSalary: 750000, positionTitle: 'NUAURA_TEST Engineer', joiningDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10), offerExpiryDate: new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10), notes: 'NUAURA_TEST' });
  rec('NU-HIRE-E2E-020', 'Generate offer for selected candidate', '(ui script)', `${ST(r)} status=${r.body && r.body.status} stage=${r.body && r.body.currentStage}`, db(`select status,current_stage,offered_ctc from candidates where id='${S.cC}'`), r.status === 201 ? 'PASS' : 'FAIL', JSON.stringify(r.body).slice(0, 150));
  { const pend = await A('hrmgr', 'GET', '/api/v1/workflow/my-pending-approvals'); const items = (pend.body && (pend.body.content || pend.body)) || []; const it = Array.isArray(items) ? items.find(x => JSON.stringify(x).includes('Charlie')) : null; S.exec = it && (it.id || it.executionId);
    rec('NU-HIRE-E2E-021a', 'Offer approval request appears in approver (HR_MANAGER) inbox', '(ui script)', `${ST(pend)} found=${!!it} exec=${S.exec}`, '-', it ? 'PASS' : 'FAIL');
    const pre = db(`select status from candidates where id='${S.cC}'`);
    const ap = it ? await A('hrmgr', 'POST', `/api/v1/workflow/executions/${S.exec}/approve`, { comments: 'NUAURA_TEST approve' }) : { status: 'n/a', body: null };
    rec('NU-HIRE-E2E-021', 'Offer approved by workflow approver', '(ui script)', `${ST(ap)} ${JSON.stringify(ap.body).slice(0, 120)}`, `candidate before=${pre}; ` + db(`select status from workflow_executions where id='${S.exec}'`), ap.status === 200 ? 'PASS' : 'FAIL'); }
  r = await A('emp', 'POST', `/api/v1/recruitment/candidates/${S.cC}/accept-offer`, {});
  rec('NU-HIRE-E2E-022', 'Plain EMPLOYEE cannot accept/decline offer on behalf of candidate', '-', `${ST(r)}`, db(`select status from candidates where id='${S.cC}'`), r.status === 403 ? 'PASS' : 'FAIL');
  r = await A('recadmin', 'POST', `/api/v1/recruitment/candidates/${S.cC}/accept-offer`, {});
  rec('NU-HIRE-E2E-023', 'Offer accepted (recruiter records acceptance)', '-', `${ST(r)} status=${r.body && r.body.status}`, db(`select status,current_stage from candidates where id='${S.cC}'`), r.status === 200 && r.body.status === 'OFFER_ACCEPTED' ? 'PASS' : 'FAIL');

  // 024 e-signature. Only SUPER_ADMIN/TENANT_ADMIN hold ESIGNATURE:* perms in DB -> use tadmin; also prove others denied
  for (const role of ['hradmin', 'recadmin', 'hrmgr']) { const q = await A(role, 'POST', '/api/v1/esignature/requests', { title: 'NUAURA_TEST_denied', documentType: 'OFFER_LETTER', signers: [] });
    rec(`NU-HIRE-E2E-024-${role}`, `${role} (HR/recruiter role) creating an offer e-signature request`, '-', `${ST(q)} ${(q.body && q.body.message || '').slice(0, 90)}`, '-', 'FAIL', 'HR_ADMIN/HR_MANAGER/RECRUITMENT_ADMIN lack ESIGNATURE:REQUEST - the offer e-sign flow is unusable by the people who run hiring'); }
  { const z = await A('tadmin', 'POST', '/api/v1/esignature/requests', { title: `NUAURA_TEST_NoEmail_${TS}`, documentType: 'OFFER_LETTER', signers: [{ signerId: EMP.arun, signerRole: 'EMPLOYEE', signingOrder: 1, isRequired: true }] });
    rec('NU-HIRE-E2E-024z', 'E-sign request with signerId only (email derived from employee)', '-', `${ST(z)} ${z.body && z.body.errorCode}`, '-', z.status === 201 ? 'PASS' : 'FAIL', 'signature_approvals.signer_email NOT NULL; service does not derive it from signerId; email-only gives "Signer ID is required" => both must be supplied'); }
  const sigReq = await A('tadmin', 'POST', '/api/v1/esignature/requests', { title: `NUAURA_TEST_Offer_${TS}`, description: 'NUAURA_TEST', documentType: 'OFFER_LETTER', documentName: 'NUAURA_TEST_offer.pdf', mimeType: 'application/pdf', signatureOrder: false, signers: [{ signerId: EMP.arun, signerEmail: 'arun@nulogic.io', signerRole: 'EMPLOYEE', signingOrder: 1, isRequired: true }] });
  S.sig = sigReq.body && sigReq.body.id;
  rec('NU-HIRE-E2E-024', 'TENANT_ADMIN creates e-signature request for offer with named signer (Arun)', '-', `${ST(sigReq)} ${JSON.stringify(sigReq.body).slice(0, 140)}`, db(`select id,title,status from signature_requests where id='${S.sig}'`) + ' || ' + db(`select signer_id,status from signature_approvals where signature_request_id='${S.sig}'`), sigReq.status === 201 ? 'PASS' : 'FAIL');
  if (S.sig) {
    r = await A('tadmin', 'PATCH', `/api/v1/esignature/requests/${S.sig}/send`);
    rec('NU-HIRE-E2E-025', 'Send signature request', '-', `${ST(r)}`, db(`select status from signature_requests where id='${S.sig}'`), r.status === 200 ? 'PASS' : 'FAIL', JSON.stringify(r.body).slice(0, 100));
    const ap = db(`select id from signature_approvals where signature_request_id='${S.sig}'`).split('\n')[1];
    const sb = { signatureMethod: 'TYPED', signatureData: 'TlVBVVJBX1RFU1Q=' };
    r = await A('tadmin', 'POST', `/api/v1/esignature/approvals/${ap}/sign`, sb);
    rec('NU-HIRE-E2E-026', 'Non-named user (TENANT_ADMIN holds ESIGNATURE:SIGN) cannot sign Arun approval', '-', `${ST(r)} ${JSON.stringify(r.body).slice(0, 110)}`, db(`select status,signed_at from signature_approvals where id='${ap}'`), r.status >= 400 && r.status < 500 ? 'PASS' : 'FAIL');
    r = await A('emp', 'POST', `/api/v1/esignature/approvals/${ap}/sign`, sb);
    rec('NU-HIRE-E2E-028', 'Named signer (Arun, EMPLOYEE) signs own approval', '(ui script)', `${ST(r)} ${JSON.stringify(r.body).slice(0, 110)}`, db(`select status,signed_at is not null from signature_approvals where id='${ap}'`), r.status === 200 ? 'PASS' : 'FAIL', 'EMPLOYEE role has no ESIGNATURE:SIGN so a named employee signer cannot sign');
    r = await A('hrmgr', 'POST', `/api/v1/esignature/approvals/${ap}/sign`, sb);
    rec('NU-HIRE-E2E-027', 'Unrelated HR_MANAGER cannot sign', '-', `${ST(r)}`, '-', r.status === 403 ? 'PASS' : 'FAIL');
    rec('NU-HIRE-E2E-028x', 'External (candidate) token signing /esignature/external/{token}/sign', '-', 'request signers require signerId (employee) -> candidate/email-only signer cannot be created via API', '-', 'BLOCKED', 'offer e-sign for external candidate not creatable; preboarding sign-offer portal not exercised');
  }

  // 029 create employee (HR) -> link; onboarding initiate
  r = await A('hradmin' in ctx ? 'hradmin' : 'hrmgr', 'POST', '/api/v1/employees', { firstName: 'NUAURA_TEST_Hire', lastName: `Charlie${TS}`, workEmail: `nuaura_test_charlie_${TS}@example.test`, employeeCode: `NTH${TS}`, joiningDate: new Date().toISOString().slice(0, 10), departmentId: DEPT, designation: 'NUAURA_TEST Engineer', employmentType: 'FULL_TIME', password: 'NuauraTest#2026Xy!' });
  S.newEmp = r.body && r.body.id;
  rec('NU-HIRE-E2E-029', 'HR creates employee record for accepted candidate (no auto convert endpoint exists)', '-', `${ST(r)} ${JSON.stringify(r.body).slice(0, 200)}`, db(`select id,first_name,employee_code,status from employees where id='${S.newEmp}'`), r.status === 201 ? 'PASS' : 'FAIL', 'NOTE: recruitment has no candidate->employee conversion API; only PreboardingService.markConverted links an existing employee');
  const asHr = ctx.hradmin ? 'hradmin' : 'hrmgr';
  if (S.newEmp) {
    r = await A(asHr, 'POST', '/api/v1/onboarding/processes', { employeeId: S.newEmp, processType: 'ONBOARDING', startDate: new Date().toISOString().slice(0, 10), notes: 'NUAURA_TEST' });
    S.proc = r.body && r.body.id;
    rec('NU-HIRE-E2E-031', 'HR initiates onboarding for new employee', '(ui script)', `${ST(r)} ${JSON.stringify(r.body).slice(0, 160)}`, db(`select id,employee_id,status from onboarding_processes where id='${S.proc}'`), r.status === 201 ? 'PASS' : 'FAIL');
    const t = await A(asHr, 'GET', `/api/v1/onboarding/processes/${S.proc}/tasks`);
    rec('NU-HIRE-E2E-032', 'Onboarding checklist tasks present for the process', '(ui script)', `${ST(t)} count=${Array.isArray(t.body) ? t.body.length : JSON.stringify(t.body).slice(0, 80)}`, db(`select count(*) from onboarding_tasks where process_id='${S.proc}'`), t.status === 200 && Array.isArray(t.body) && t.body.length > 0 ? 'PASS' : 'FAIL', 'FAIL if empty checklist (no default template applied)');
    const emp = await A(asHr, 'GET', `/api/v1/employees/${S.newEmp}`);
    rec('NU-HIRE-E2E-033', 'Employee record readable by HR after creation', '(ui script)', `${ST(emp)} ${emp.body && emp.body.firstName}`, '-', emp.status === 200 ? 'PASS' : 'FAIL');
  }

  // PII / RBAC direct API
  for (const [role, label] of [['emp', 'EMPLOYEE'], ['mgr', 'MANAGER (interviewer)'], ['hrmgr', 'HR_MANAGER']]) {
    if (!ctx[role]) continue;
    const l = await A(role, 'GET', '/api/v1/recruitment/candidates?size=50');
    const one = await A(role, 'GET', `/api/v1/recruitment/candidates/${S.cA}`);
    const ids = (l.body && l.body.content || []).map(x => x.id);
    rec(`NU-HIRE-E2E-040-${role}`, `Candidate PII as ${label}: list + by-id (candidate Alpha, interviewed by Sumit)`, '-', `list=${l.status} items=${l.body && l.body.content ? l.body.content.length : '-'} byId=${one.status} ${one.status === 200 ? 'email=' + (one.body && one.body.email) : ''}`, '-', null);
    const last = R[R.length - 1];
    if (role === 'emp') last.status = (l.status === 403 && one.status === 403) ? 'PASS' : 'FAIL';
    else if (role === 'mgr') { const seesOthers = ids.filter(i => [S.cB, S.cC].includes(i)).length; last.status = (one.status === 200 && seesOthers === 0 && ids.includes(S.cA)) ? 'PASS' : ((l.status === 403 && one.status === 403) ? 'INCONCLUSIVE' : 'FAIL'); last.note = `interviewer sees assigned only? list ids incl B/C=${seesOthers}, incl A=${ids.includes(S.cA)}, total=${ids.length}`; }
    else last.status = (one.status === 200) ? 'PASS' : 'INCONCLUSIVE', last.note = 'HR_MANAGER expected allowed (CANDIDATE_VIEW?) ; informational';
    fs.writeFileSync(OUT, JSON.stringify(R, null, 1));
  }
  if (ctx.mgr) { for (const [n, c] of [['Bravo(not assigned)', S.cB]]) { const o = await A('mgr', 'GET', `/api/v1/recruitment/candidates/${c}`); rec('NU-HIRE-E2E-041', `Interviewer(MANAGER) reads candidate PII of non-assigned candidate ${n}`, '-', `${ST(o)} ${o.status === 200 ? 'email=' + (o.body && o.body.email) : ''}`, '-', o.status === 403 || o.status === 404 ? 'PASS' : 'FAIL', 'expected: interviewer sees only assigned candidates'); } }
  if (ctx.tadmin) { const f = await A('hrmgr', 'GET', '/api/v1/recruitment/candidates?size=5'); }
  // payroll role candidate PII
  S.state = S;
  // agency boundary
  const ag = await A('recadmin', 'POST', '/api/v1/recruitment/agencies', { name: `NUAURA_TEST_Agency_${TS}`, contactEmail: `nuaura_test_agency_${TS}@example.test`, contactName: 'NUAURA_TEST', status: 'ACTIVE' });
  S.agency = ag.body && ag.body.id;
  rec('NU-HIRE-E2E-050', 'Create staffing agency (RECRUITMENT_ADMIN)', '(ui script)', `${ST(ag)} ${JSON.stringify(ag.body).slice(0, 140)}`, db(`select id,name from recruitment_agencies where id='${S.agency}'`), ag.status === 201 ? 'PASS' : 'FAIL');
  const ae = await A('emp', 'GET', '/api/v1/recruitment/agencies');
  rec('NU-HIRE-E2E-051', 'EMPLOYEE cannot list agencies', '-', `${ST(ae)}`, '-', ae.status === 403 ? 'PASS' : 'FAIL');
  const ae2 = await A('emp', 'POST', '/api/v1/recruitment/job-openings', { jobTitle: 'NUAURA_TEST_x', departmentId: DEPT });
  rec('NU-HIRE-E2E-052', 'EMPLOYEE cannot create job opening', '-', `${ST(ae2)}`, db(`select count(*) from job_openings where job_title='NUAURA_TEST_x'`), ae2.status === 403 ? 'PASS' : 'FAIL');
  const ae3 = await A('mgr', 'GET', '/api/v1/recruitment/job-openings');
  rec('NU-HIRE-E2E-053', 'MANAGER job-openings list access (informational)', '-', `${ST(ae3)}`, '-', 'INCONCLUSIVE', 'informational');

  fs.writeFileSync(`${EV}/logs/hire/state.json`, JSON.stringify({ TS, ...S, state: undefined, scTemplateTry: undefined, pubDetail: undefined }, null, 1));
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
