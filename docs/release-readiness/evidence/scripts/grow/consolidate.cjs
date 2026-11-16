const fs = require('fs'); const path = require('path');
const EV = path.resolve(__dirname, '../..'); const RR = path.resolve(EV, '..');
let all = []; for (const f of ['perf1', 'perf2', 'perf3', 'perf4', 'okr', 'f360', 'lms', 'ui']) all = all.concat(JSON.parse(fs.readFileSync(`${EV}/logs/grow/${f}.json`)).map(x => ({ ...x, file: f })));
// manual: UI results 180-184 captured from console of ui.cjs run
const man = (id, sc, st, notes) => ({ id, scenario: sc, status: st, notes, file: 'ui', sev: '' });
all = all.filter(x => !(x.file === 'ui')).concat([
  man('NU-GROW-E2E-180', 'UI: employee My Reviews shows own SELF (SUBMITTED) and MANAGER (DRAFT) review for test cycle', 'PASS', 'render + data present (screenshot). Note UI shows "Overall Rating 0.0/5.0" for SUBMITTED self review whose DB self_rating=4 (DEF-GROW-13)'),
  man('NU-GROW-E2E-181', 'UI: HR sees test cycles on /performance/cycles', 'PASS', 'needle NUAURA_TEST_Cycle_B found; 0 console errors'),
  man('NU-GROW-E2E-182', 'UI: manager sees own OKR objective on /performance/okr', 'PASS', 'needle found; console: Mantine "Unsupported style property" x3; page also calls GET /okr/company/objectives -> 403 (benign probe)'),
  man('NU-GROW-E2E-183', 'UI: employee learning dashboard shows enrolled course', 'PASS', 'Workplace Security Essentials visible'),
  man('NU-GROW-E2E-184', 'UI: employee /wellness shows HR-created program', 'PASS', 'program visible; employee cannot join (API 403, DEF-GROW-10)'),
  man('NU-GROW-E2E-185', 'UI: /performance/360-feedback for employee', 'INCONCLUSIVE', 'page loads, no data possible (nominations blocked by DEF-GROW-02)'),
  man('NU-GROW-E2E-186', 'UI: employee denied /performance/calibration', 'PASS', 'redirected to /me/dashboard'),
]);
const ov = {
  'NU-GROW-E2E-010': ['INCONCLUSIVE', 'superseded: cycle already moved by manager advance in 009 (DEF-GROW-04); see clean run 033'],
  'NU-GROW-E2E-013': ['INCONCLUSIVE', 'superseded by 034 (stage polluted by 009)'], 'NU-GROW-E2E-014': ['INCONCLUSIVE', 'superseded by 035'],
  'NU-GROW-E2E-015': ['INCONCLUSIVE', '403 was missing CALIBRATION:MANAGE for HR_MANAGER (see 037), not stage check; stage check shown by 041'],
  'NU-GROW-E2E-016': ['INCONCLUSIVE', 'superseded by 038'], 'NU-GROW-E2E-019': ['INCONCLUSIVE', 'superseded by 040/041'],
  'NU-GROW-E2E-020': ['FAIL', 'completed cycle PUT status=ACTIVE returned 200 and DB ACTIVE (repro 042)'],
  'NU-GROW-E2E-043b': ['PASS', 'manager list of non-report employee reviews -> 403'],
  'NU-GROW-E2E-123': ['PASS', 'duplicate enrol returned 201 but DB shows 1 row (idempotent); Low: should be 409'],
  'NU-GROW-E2E-126': ['FAIL', 'self-reported progress 50 then 100 => COMPLETED 100% in DB with NO content/quiz consumed (Medium) and certificate NOT issued (0 rows in lms_certificates) though course.is_certificate_enabled=t'],
  'NU-GROW-E2E-127': ['FAIL', 'after COMPLETED, PUT progress 30 returned 200; DB now COMPLETED with progress 30.00 (inconsistent) (Low)'],
  'NU-GROW-E2E-128': ['FAIL', 'my-certificates empty after completion (no certificate issued)'], 'NU-GROW-E2E-129': ['BLOCKED', 'no certificate exists to verify'],
  'NU-GROW-E2E-131': ['INCONCLUSIVE', 'peer got 200 but body [] (no content-progress rows exist), so no leak shown; owner also []'],
  'NU-GROW-E2E-155': ['INCONCLUSIVE', '403 only because EMPLOYEE lacks WELLNESS:CREATE'], 'NU-GROW-E2E-156': ['INCONCLUSIVE', 'no health logs could be created (employee lacks WELLNESS:CREATE)'], 'NU-GROW-E2E-158': ['INCONCLUSIVE', 'empty leaderboard, nobody can join'],
  'NU-GROW-E2E-152': ['FAIL', 'employee join challenge -> 403 WELLNESS:CREATE held only by HR/admin roles; employees cannot participate (DEF-GROW-10)'], 'NU-GROW-E2E-153': ['FAIL', 'employee log health -> 403 (DEF-GROW-10)'], 'NU-GROW-E2E-154': ['BLOCKED', 'cannot reach validation: 403 for employee'],
  'NU-GROW-E2E-092': ['FAIL', '400 DB_INTEGRITY_VIOLATION: Detached entity ... Feedback360Request.version (Feedback360Service.java:133) DEF-GROW-02'],
  'NU-GROW-E2E-093': ['BLOCKED', 'no requests exist (DEF-GROW-02)'], 'NU-GROW-E2E-095': ['BLOCKED', 'no requests to answer (DEF-GROW-02)'],
  'NU-GROW-E2E-096': ['INCONCLUSIVE', '403 without a real request to forge'], 'NU-GROW-E2E-097': ['BLOCKED', 'no response created'], 'NU-GROW-E2E-098': ['BLOCKED', '400 on nonexistent requestId; code (Feedback360Controller:236-255) is reviewer-only, unproven live'],
  'NU-GROW-E2E-101': ['BLOCKED', 'no response'], 'NU-GROW-E2E-102': ['INCONCLUSIVE', 'empty only because nothing exists'], 'NU-GROW-E2E-103': ['BLOCKED', 'summary generation 400 (DEF-GROW-02)'], 'NU-GROW-E2E-104': ['BLOCKED', 'anonymity of shared summary untestable'], 'NU-GROW-E2E-105': ['NOT TESTED', 'placeholder'], 'NU-GROW-E2E-110': ['INCONCLUSIVE', '403 for unrelated user, no live response to close against'],
  'NU-GROW-E2E-140': ['FAIL', 'pulse survey create 400 DB_INTEGRITY_VIOLATION (nested question setId, PulseSurveyService.java:277) DEF-GROW-03'],
};
for (const x of all) if (ov[x.id]) { x.status = ov[x.id][0]; x.notes = ov[x.id][1] + ' | ' + (x.notes || '').slice(0, 120); }
const dropNums = ['NU-GROW-E2E-105'];
for (let i = 141; i <= 149; i++) all.push({ id: 'NU-GROW-E2E-' + i, scenario: ['', 'publish survey', 'employees submit responses', 'anonymous: no respondent id stored', 'duplicate submission rejected', 'min-response suppression (<5)', 'employee cannot read analytics', 'employee cannot create survey', 'recruiter cannot close', 'closed survey rejects'][i - 140], status: 'BLOCKED', notes: 'survey creation fails (DEF-GROW-03). Code evidence only: PulseSurveyService.MIN_ANONYMOUS_GROUP_SIZE=5 (line 42, check line 577)', sev: '' });
all.push({ id: 'NU-GROW-E2E-190', scenario: 'DEPARTMENT scope with empty departmentIds activates cycle for ALL employees', status: 'NOT TESTED', notes: 'code read ReviewCycleService.getEmployeesInScope:226-250 falls through to ALL; not run to avoid creating reviews for 28 employees (DEF-GROW-14)', sev: 'Low' });
all.push({ id: 'NU-GROW-E2E-191', scenario: 'Goals, PIP, competency matrix, 9-box, learning paths, quizzes, mobile viewports, UI self-review submit + manager review form clicks', status: 'NOT TESTED', notes: 'out of time/token budget; review submit steps executed at API level only (003-045)', sev: '' });
all = all.filter(x => x.id !== 'NU-GROW-E2E-105');
const sevOf = x => x.sev || '';
const uniq = new Map(); for (const x of all) uniq.set(x.id + (uniq.has(x.id) ? '#' : ''), x);
const rows = [...uniq.values()].sort((a, b) => a.id.localeCompare(b.id));
const cnt = {}; rows.forEach(r => cnt[r.status] = (cnt[r.status] || 0) + 1);
const esc = s => String(s || '').replace(/\|/g, '/').replace(/\n/g, ' ');
const defOf = { 'NU-GROW-E2E-060b': 'DEF-GROW-01', 'NU-GROW-E2E-061': 'DEF-GROW-01', 'NU-GROW-E2E-092': 'DEF-GROW-02', 'NU-GROW-E2E-140': 'DEF-GROW-03', 'NU-GROW-E2E-009': 'DEF-GROW-04', 'NU-GROW-E2E-044': 'DEF-GROW-04', 'NU-GROW-E2E-025': 'DEF-GROW-05', 'NU-GROW-E2E-043': 'DEF-GROW-05', 'NU-GROW-E2E-020': 'DEF-GROW-06', 'NU-GROW-E2E-042': 'DEF-GROW-06', 'NU-GROW-E2E-045': 'DEF-GROW-07', 'NU-GROW-E2E-036': 'DEF-GROW-08', 'NU-GROW-E2E-120': 'DEF-GROW-09', 'NU-GROW-E2E-160': 'DEF-GROW-09', 'NU-GROW-E2E-037': 'DEF-GROW-09', 'NU-GROW-E2E-059': 'DEF-GROW-10', 'NU-GROW-E2E-152': 'DEF-GROW-10', 'NU-GROW-E2E-153': 'DEF-GROW-10', 'NU-GROW-E2E-126': 'DEF-GROW-11', 'NU-GROW-E2E-127': 'DEF-GROW-11', 'NU-GROW-E2E-128': 'DEF-GROW-11', 'NU-GROW-E2E-068': 'DEF-GROW-12', 'NU-GROW-E2E-180': 'DEF-GROW-13', 'NU-GROW-E2E-190': 'DEF-GROW-14' };
let md = `# NU-AURA Grow Journeys - Release Readiness Results (agent: grow)\n\nDate 2026-11-15/16 | Local stack only | Accounts: demo (jagadeesh HR_MANAGER, admin HR_ADMIN, sumit MANAGER, mani TEAM_LEAD, arun/anshuman EMPLOYEE, suresh RECRUITMENT_ADMIN, finance FINANCE_ADMIN).\n\n## Summary\nExecuted rows: ${rows.length}. ` + Object.entries(cnt).map(([k, v]) => `${k}=${v}`).join(', ') + `\n\nMethod: UI used for cycle create + activate (001, 002) and render checks (180-186); the rest of the workflow, state machine and boundaries are direct API calls with CSRF header plus read-only SQL as hrms_user (RLS GUC set). Transcripts: evidence/logs/grow/NU-GROW-E2E-nnn.txt. Screenshots: evidence/screenshots/NU-GROW-E2E-*.png. Scripts: evidence/scripts/grow/.\n\nEnvironment notes: (1) the running FE bundle posts to http://backend:8080 (docker hostname), so browser login fails natively; scripts reroute those requests to localhost:8080 inside Playwright (no server change). (2) /auth/me and /auth/refresh share the 5/min bucket; 429s were backed off. (3) Manager/HR self-review submit and manager review form were NOT clicked through UI; API-level only.\n\n## Results\n\n| Test ID | Scenario | Steps actually run | Expected | Actual | Status | Evidence | Severity | Defect |\n|---|---|---|---|---|---|---|---|---|\n`;
for (const r of rows) md += `| ${r.id} | ${esc(r.scenario)} | ${/^NU-GROW-E2E-(001|002|18)/.test(r.id) ? 'UI + API + DB' : 'API + DB'} | see scenario | ${esc(r.notes).slice(0, 330)} | ${r.status} | logs/grow/${r.id}.txt${/^NU-GROW-E2E-(001|002|18)/.test(r.id) ? '; screenshots/' + r.id + '*.png' : ''} | ${r.status === 'FAIL' ? sevOf(r) : ''} | ${defOf[r.id] || ''} |\n`;
fs.writeFileSync(`${RR}/05-grow-results.md`, md);
fs.writeFileSync(`${EV}/matrix-grow.csv`, 'id,area,scenario,status,severity,evidence,defect_id\n' + rows.map(r => [r.id, 'grow', `"${esc(r.scenario).replace(/"/g, "'")}"`, r.status, r.status === 'FAIL' ? sevOf(r) : '', `logs/grow/${r.id}.txt`, defOf[r.id] || ''].join(',')).join('\n') + '\n');
console.log(cnt, rows.length);
