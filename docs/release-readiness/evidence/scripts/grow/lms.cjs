// NU-GROW-E2E-120..170 LMS, surveys, wellness, training
const L = require('./lib.cjs'); const D = L.db;
const row = (sql) => (D(sql).split('\n')[1] || ''); const ok = (r, ...c) => c.includes(r.status);
const rec = (id, sc, pass, note, sev = '') => L.rec(id, sc, pass ? 'PASS' : 'FAIL', note, { sev });
const T = () => Date.now().toString().slice(-6);
(async () => {
  // ---- LMS
  console.log('login admin/tenant.admin', await L.apiLogin('admin@nulogic.io')); 
  let r = await L.call('NU-GROW-E2E-120', 'admin', 'POST', '/api/v1/lms/courses', { title: 'NUAURA_TEST_Course_' + T(), code: 'NUAURA_T_' + T(), difficultyLevel: 'BEGINNER', durationHours: 1, passingScore: 70, maxAttempts: 3, isSelfPaced: true, isCertificateEnabled: true });
  rec('NU-GROW-E2E-120', 'HR_ADMIN (admin@) can create a course (LMS:COURSE_MANAGE is SUPER_ADMIN-only in DB)', ok(r, 200, 201), `http=${r.status} ${JSON.stringify(r.body).slice(0, 160)}`, 'High');
  L.rec('NU-GROW-E2E-121', 'HR creates/publishes own course and quiz end-to-end', 'BLOCKED', 'only SUPER_ADMIN holds LMS:COURSE_MANAGE; owner accounts are off-limits per rules; using seeded PUBLISHED course 48000000-0e05-...01 for enrol/complete tests');
  const CID = '48000000-0e05-0000-0000-000000000001';
  let enr;
  if (CID) {
    r = await L.call('NU-GROW-E2E-122', 'arun', 'POST', `/api/v1/lms/courses/${CID}/enroll`);
    enr = r.body && r.body.id; rec('NU-GROW-E2E-122', 'Employee self-enrols', ok(r, 201) && enr, `http=${r.status} db=${enr ? row(`select status,progress_percentage from lms_course_enrollments where id='${enr}'`) : ''}`);
    r = await L.call('NU-GROW-E2E-123', 'arun', 'POST', `/api/v1/lms/courses/${CID}/enroll`);
    rec('NU-GROW-E2E-123', 'Duplicate enrolment rejected', ok(r, 400, 409), `http=${r.status}`);
    r = await L.call('NU-GROW-E2E-124', 'anshuman', 'POST', `/api/v1/lms/courses/${CID}/enroll?employeeId=48000000-e001-0000-0000-000000000003`);
    rec('NU-GROW-E2E-124', 'Unauthorised: employee enrols ANOTHER employee (employeeId param) must be rejected', ok(r, 403), `http=${r.status} db=${row(`select count(*) from lms_course_enrollments where course_id='${CID}' and employee_id='48000000-e001-0000-0000-000000000003'`)}`, 'High');
    if (enr) {
      r = await L.call('NU-GROW-E2E-125', 'anshuman', 'PUT', `/api/v1/lms/enrollments/${enr}/progress`, { progressPercent: 100 });
      rec('NU-GROW-E2E-125', "Employee cannot update ANOTHER employee's enrolment progress (cert fraud)", ok(r, 403, 404), `http=${r.status} db=${row(`select status,progress_percentage from lms_course_enrollments where id='${enr}'`)}`, 'High');
      r = await L.call('NU-GROW-E2E-126', 'arun', 'PUT', `/api/v1/lms/enrollments/${enr}/progress`, { progressPercent: 50 });
      const mid = row(`select status,progress_percentage from lms_course_enrollments where id='${enr}'`);
      r = await L.call('NU-GROW-E2E-126', 'arun', 'PUT', `/api/v1/lms/enrollments/${enr}/progress`, { progressPercent: 100 });
      const fin = row(`select status,progress_percentage,completed_at is not null from lms_course_enrollments where id='${enr}'`);
      const cert = row(`select count(*) from lms_certificates where enrollment_id='${enr}'`);
      rec('NU-GROW-E2E-126', 'Employee marks course 50 then 100% via progress API; DB COMPLETED; certificate issued', /COMPLETED/.test(fin) && Number(cert) === 1, `mid=${mid} final=${fin} certs=${cert} (self-reported 100% with no content/quiz consumption)`, 'Medium');
      r = await L.call('NU-GROW-E2E-127', 'arun', 'PUT', `/api/v1/lms/enrollments/${enr}/progress`, { progressPercent: 30 });
      rec('NU-GROW-E2E-127', 'Progress regression after completion rejected', ok(r, 400, 409) || /COMPLETED/.test(row(`select status from lms_course_enrollments where id='${enr}'`)), `http=${r.status} db=${row(`select status,progress_percentage from lms_course_enrollments where id='${enr}'`)}`, 'Low');
      r = await L.call('NU-GROW-E2E-128', 'arun', 'GET', '/api/v1/lms/my-certificates');
      rec('NU-GROW-E2E-128', 'Employee sees own certificate', ok(r, 200) && JSON.stringify(r.body).includes('NUAURA'), `http=${r.status} n=${Array.isArray(r.body) ? r.body.length : '-'}`);
      const cn = row(`select certificate_number from lms_certificates where enrollment_id='${enr}'`);
      r = await L.call('NU-GROW-E2E-129', 'finance', 'GET', `/api/v1/lms/certificates/verify/${cn}`);
      rec('NU-GROW-E2E-129', 'Certificate verification endpoint (authenticated other user)', ok(r, 200), `http=${r.status} body=${JSON.stringify(r.body).slice(0, 200)}`);
      r = await L.call('NU-GROW-E2E-130', 'anshuman', 'GET', `/api/v1/lms/courses/${CID}/enrollments`);
      rec('NU-GROW-E2E-130', "Employee cannot list a course's enrolments (other learners)", ok(r, 403), `http=${r.status}`, 'High');
      r = await L.call('NU-GROW-E2E-131', 'anshuman', 'GET', `/api/v1/lms/progress/${enr}`);
      rec('NU-GROW-E2E-131', "Employee cannot read another's enrolment progress", ok(r, 403, 404), `http=${r.status}`, 'High');
    }
    r = await L.call('NU-GROW-E2E-132', 'arun', 'POST', '/api/v1/lms/courses', { title: 'NUAURA_TEST_hack', code: 'NUAURA_H', difficultyLevel: 'BEGINNER' });
    rec('NU-GROW-E2E-132', 'Employee cannot create course', ok(r, 403), `http=${r.status}`);
    r = await L.call('NU-GROW-E2E-133', 'suresh', 'POST', `/api/v1/lms/courses/${CID}/archive`);
    rec('NU-GROW-E2E-133', 'Recruiter cannot archive course', ok(r, 403), `http=${r.status}`);
    r = await L.call('NU-GROW-E2E-134', 'arun', 'GET', `/api/v1/lms/courses/${CID}/enrollments/stats`);
    rec('NU-GROW-E2E-134', 'Employee cannot read course completion stats', ok(r, 403), `http=${r.status}`);
  }
  // ---- SURVEYS
  r = await L.call('NU-GROW-E2E-140', 'jagadeesh', 'POST', '/api/v1/surveys', { title: 'NUAURA_TEST_Survey_' + T(), description: 'NUAURA_TEST', surveyType: 'ENGAGEMENT', startDate: '2026-11-01', endDate: '2026-12-31', isAnonymous: true, isMandatory: false, frequency: 'ONE_TIME', questions: [{ questionText: 'NUAURA_TEST How engaged are you?', questionType: 'RATING', questionOrder: 1, isRequired: true, minScale: 1, maxScale: 5 }] });
  const SID = r.body && r.body.id; rec('NU-GROW-E2E-140', 'HR creates anonymous pulse survey with 1 question', ok(r, 200, 201) && SID, `http=${r.status} ${SID ? '' : JSON.stringify(r.body).slice(0, 200)}`);
  if (SID) {
    const qs = await L.call('NU-GROW-E2E-141', 'jagadeesh', 'GET', `/api/v1/surveys/${SID}/questions`); let QID = (qs.body && qs.body[0] && qs.body[0].id);
    if (!QID) { const q = await L.call('NU-GROW-E2E-141', 'jagadeesh', 'POST', `/api/v1/surveys/${SID}/questions`, { questionText: 'NUAURA_TEST How engaged?', questionType: 'RATING', questionOrder: 1, isRequired: true, minScale: 1, maxScale: 5 }); QID = q.body && q.body.id; }
    r = await L.call('NU-GROW-E2E-141', 'jagadeesh', 'POST', `/api/v1/surveys/${SID}/publish`);
    rec('NU-GROW-E2E-141', 'HR publishes survey (needs >=1 question)', ok(r, 200) && QID, `http=${r.status} q=${QID} db=${row(`select status from pulse_surveys where id='${SID}'`)}`);
    const sub = []; for (const who of ['arun', 'anshuman']) { await L.call('NU-GROW-E2E-142', who, 'POST', `/api/v1/surveys/${SID}/start`); sub.push(await L.call('NU-GROW-E2E-142', who, 'POST', '/api/v1/surveys/submit', { surveyId: SID, answers: [{ questionId: QID, numericValue: who === 'arun' ? 2 : 4 }], timeSpentSeconds: 30, deviceType: 'DESKTOP' })); }
    rec('NU-GROW-E2E-142', 'Two employees submit responses', sub.every(x => ok(x, 200, 201)), `statuses=${sub.map(x => x.status)} ${JSON.stringify(sub[0].body).slice(0, 120)}`);
    const dbr = D(`select * from pulse_survey_responses where survey_id='${SID}'`);
    const hasEmp = D(`select employee_id from pulse_survey_responses where survey_id='${SID}'`).split('\n').slice(1).filter(Boolean);
    rec('NU-GROW-E2E-143', 'Anonymous survey: DB response rows must not store respondent employee_id', hasEmp.length === 0 || hasEmp.every(x => !x || x === ''), `rows=${dbr.split('\n').length - 1} employee_id values=${hasEmp.length ? hasEmp.map(x => x.slice(0, 13)).join(',') : 'none'}`, hasEmp.length ? 'High' : '');
    r = await L.call('NU-GROW-E2E-144', 'arun', 'POST', '/api/v1/surveys/submit', { surveyId: SID, answers: [{ questionId: QID, numericValue: 1 }] });
    rec('NU-GROW-E2E-144', 'Second submission by same employee rejected (no ballot stuffing)', ok(r, 400, 409), `http=${r.status}`, 'Medium');
    r = await L.call('NU-GROW-E2E-145', 'jagadeesh', 'GET', `/api/v1/surveys/${SID}/analytics`);
    const aj = JSON.stringify(r.body);
    rec('NU-GROW-E2E-145', 'Anonymous analytics with 2 responses (<5 min group) must suppress results', ok(r, 200) && !/"averageRating"\s*:\s*[0-9]|"avg/i.test(aj) , `http=${r.status} body=${aj.slice(0, 350)}`, 'Medium');
    r = await L.call('NU-GROW-E2E-146', 'arun', 'GET', `/api/v1/surveys/${SID}/analytics`);
    rec('NU-GROW-E2E-146', 'Employee cannot read survey analytics', ok(r, 403), `http=${r.status}`, 'High');
    r = await L.call('NU-GROW-E2E-147', 'arun', 'POST', '/api/v1/surveys', { title: 'NUAURA_TEST_hack', surveyType: 'ENGAGEMENT', startDate: '2026-11-01', endDate: '2026-12-31' });
    rec('NU-GROW-E2E-147', 'Employee cannot create survey', ok(r, 403), `http=${r.status}`);
    r = await L.call('NU-GROW-E2E-148', 'suresh', 'POST', `/api/v1/surveys/${SID}/close`);
    rec('NU-GROW-E2E-148', 'Recruiter cannot close survey', ok(r, 403), `http=${r.status}`);
    r = await L.call('NU-GROW-E2E-149', 'jagadeesh', 'POST', `/api/v1/surveys/${SID}/close`);
    const late = await L.call('NU-GROW-E2E-149', 'suresh', 'POST', '/api/v1/surveys/submit', { surveyId: SID, answers: [{ questionId: QID, numericValue: 3 }] });
    rec('NU-GROW-E2E-149', 'Closed survey rejects new responses', ok(r, 200) && ok(late, 400, 403, 409), `close=${r.status} late=${late.status}`);
  }
  // ---- WELLNESS
  r = await L.call('NU-GROW-E2E-150', 'jagadeesh', 'POST', '/api/v1/wellness/programs', { name: 'NUAURA_TEST_Wellness_' + T(), description: 'NUAURA_TEST', programType: 'CHALLENGE', category: 'PHYSICAL_FITNESS', startDate: '2026-11-01', endDate: '2026-12-31', pointsReward: 10, isActive: true });
  const PID = r.body && r.body.id; rec('NU-GROW-E2E-150', 'HR creates wellness program', ok(r, 200, 201) && PID, `http=${r.status} ${PID ? '' : JSON.stringify(r.body).slice(0, 200)}`);
  if (PID) {
    r = await L.call('NU-GROW-E2E-151', 'jagadeesh', 'POST', `/api/v1/wellness/programs/${PID}/challenges`, { name: 'NUAURA_TEST_Steps', challengeType: 'STEPS', trackingType: 'MANUAL', startDate: '2026-11-01', endDate: '2026-12-31', targetValue: 100000, targetUnit: 'steps', dailyTarget: 5000, pointsPerCompletion: 5, leaderboardEnabled: true, isActive: true });
    const CH = r.body && r.body.id; rec('NU-GROW-E2E-151', 'HR adds challenge', ok(r, 200, 201) && CH, `http=${r.status} ${CH ? '' : JSON.stringify(r.body).slice(0, 200)}`);
    if (CH) {
      r = await L.call('NU-GROW-E2E-152', 'arun', 'POST', `/api/v1/wellness/challenges/${CH}/join`);
      rec('NU-GROW-E2E-152', 'Employee joins wellness challenge (WELLNESS:CREATE is HR-only in DB)', ok(r, 200, 201), `http=${r.status} db=${row(`select count(*) from wellness_challenge_participants where challenge_id='${CH}'`)}`);
      r = await L.call('NU-GROW-E2E-153', 'arun', 'POST', '/api/v1/wellness/health-logs', { challengeId: CH, logDate: '2026-11-15', metricType: 'STEPS', value: 8000, unit: 'steps' });
      rec('NU-GROW-E2E-153', 'Employee logs 8000 steps', ok(r, 200, 201), `http=${r.status} ${JSON.stringify(r.body).slice(0, 160)}`);
      r = await L.call('NU-GROW-E2E-154', 'arun', 'POST', '/api/v1/wellness/health-logs', { challengeId: CH, logDate: '2026-11-15', metricType: 'STEPS', value: -50, unit: 'steps' });
      rec('NU-GROW-E2E-154', 'Negative health-log value rejected', ok(r, 400, 422), `http=${r.status}`, 'Low');
      r = await L.call('NU-GROW-E2E-155', 'anshuman', 'POST', '/api/v1/wellness/health-logs', { challengeId: CH, logDate: '2026-11-15', metricType: 'STEPS', value: 99999999, unit: 'steps', employeeId: '48000000-e001-0000-0000-000000000009' });
      rec('NU-GROW-E2E-155', "Cannot log health data for challenge not joined / on behalf of another employee", ok(r, 400, 403, 404), `http=${r.status} ${JSON.stringify(r.body).slice(0, 120)}`, 'Medium');
      r = await L.call('NU-GROW-E2E-156', 'arun', 'GET', '/api/v1/wellness/health-logs');
      const own = Array.isArray(r.body) ? r.body : (r.body.content || []);
      r = await L.call('NU-GROW-E2E-156', 'anshuman', 'GET', '/api/v1/wellness/health-logs');
      const other = Array.isArray(r.body) ? r.body : (r.body.content || []);
      rec('NU-GROW-E2E-156', "Health logs are private: another employee's GET /health-logs must not contain arun's entries", !other.some(x => x.employeeId === '48000000-e001-0000-0000-000000000009'), `peer sees ${other.length} entries; arun sees ${own.length}`, 'High');
      r = await L.call('NU-GROW-E2E-157', 'arun', 'POST', '/api/v1/wellness/programs', { name: 'NUAURA_TEST_hack', programType: 'ONGOING', category: 'NUTRITION' });
      rec('NU-GROW-E2E-157', 'Employee cannot create wellness program', ok(r, 403), `http=${r.status}`);
      r = await L.call('NU-GROW-E2E-158', 'anshuman', 'GET', `/api/v1/wellness/challenges/${CH}/leaderboard`);
      rec('NU-GROW-E2E-158', 'Leaderboard shows only enabled-challenge aggregates (info)', ok(r, 200, 403), `http=${r.status} ${JSON.stringify(r.body).slice(0, 200)}`);
    }
  }
  // ---- TRAINING
  r = await L.call('NU-GROW-E2E-160', 'admin', 'POST', '/api/v1/training/programs', { programName: 'NUAURA_TEST_Training_' + T(), programCode: 'NUAURA_TR_' + T(), description: 'NUAURA_TEST', startDate: '2026-12-01', endDate: '2026-12-05', maxParticipants: 5 });
  const TP = r.body && r.body.id; rec('NU-GROW-E2E-160', 'HR_ADMIN creates training program (TRAINING:CREATE only SUPER_ADMIN/TENANT_ADMIN)', ok(r, 200, 201) && TP, `http=${r.status} ${TP ? '' : JSON.stringify(r.body).slice(0, 220)}`);
  r = await L.call('NU-GROW-E2E-161', 'arun', 'POST', '/api/v1/training/programs', { programName: 'NUAURA_TEST_hack' });
  rec('NU-GROW-E2E-161', 'Employee cannot create training program', ok(r, 403), `http=${r.status}`);
  r = await L.call('NU-GROW-E2E-162', 'arun', 'GET', '/api/v1/training/enrollments/employee/48000000-e001-0000-0000-000000000006');
  rec('NU-GROW-E2E-162', "Employee cannot read another employee's training enrolments", ok(r, 403, 404), `http=${r.status}`, 'High');
  r = await L.call('NU-GROW-E2E-163', 'arun', 'POST', '/api/v1/training/enrollments/00000000-0000-0000-0000-000000000000/complete');
  rec('NU-GROW-E2E-163', 'Employee cannot mark training complete (HR action)', ok(r, 403, 404), `http=${r.status}`, 'Medium');
  L.save('lms');
})();
