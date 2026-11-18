# UI bugs - phase P4 (NU-Grow)

Found by scripts in `scripts/e2e/` (`p4-sweep.mjs`, `p4-probe.mjs`, `p4-act.mjs`, `p4-cycle.mjs`, `p4-kr.mjs`, `p4-121.mjs`, `p4-misc.mjs`, `p4-grow-flows.mjs`). Raw sweep data: `p4-sweep.json` (EMP, HR), `p4-sweep-mgr.json` (MGR).
Environment: commit `d10bc9b9` (main), FE `http://localhost:3000`, BE `http://localhost:8080` (profile dev), demo tenant `660e8400-e29b-41d4-a716-446655440001`, Chromium via Playwright, 1440x900 (390x844 in the sweep). Roles: EMP `arun@`, MGR `sumit@`, HR `admin@`.
Test data created (prefix `NUAURA_TEST_P4_`): 2 OKR objectives `NUAURA_TEST_P4_okr` (EMP) with 1 key result `NUAURA_TEST_P4_kr`; review cycle `NUAURA_TEST_P4_cyc4` (id `4ace109f-50a0-4cfc-82c7-73c01da64782`). Goal and survey creates failed, so nothing else persisted.
Severity per plan 17 A2.

| ID | Sev | Title |
|---|---|---|
| G-001 | Critical | Course detail page fires an endless request loop (quizzes 403 retried thousands of times), trips the rate limit and logs users out |
| G-002 | High | Goals: creating a goal fails for every role (400 Data Integrity Violation, generic toast) |
| G-003 | High | Surveys: creating a survey fails (400 Data Integrity Violation) and the dialog closes, losing the input |
| G-004 | High | 1-on-1: employee cannot pick a participant (employee search returns 403, retried 4 times) |
| G-005 | High | 1-on-1: manager is sent to the dashboard while the employee can open the page |
| G-006 | Medium | Review cycle: a review deadline after the cycle end passes the form, the server returns 400, the dialog closes and the input is lost |
| G-007 | Medium | OKR: an objective can be saved with the end date before the start date |
| G-008 | Medium | OKR: key-result current value above target is accepted and completes the objective |
| G-009 | Medium | OKR: objective status stays COMPLETED after the key-result value is lowered |
| G-010 | Medium | Course detail shows contradictory completion data |
| G-011 | Medium | My Learning shows a raw course ID instead of the course title, and Completed at 30% |
| G-012 | Medium | Competency Matrix: gap analysis calls a forbidden endpoint three times and shows an error card |
| G-013 | Low | Performance Revolution: same 403 skill-gaps calls on load |
| G-014 | Medium | HR admin is redirected away from My Certificates |
| G-015 | Medium | Manager is redirected away from Learning Paths while the employee can open it |
| G-016 | Medium | Wellness admin: Create Program with invalid values does nothing and shows no message |
| G-017 | Low | Wellness admin access-denied page has no heading |
| G-018 | Low | 1-on-1 tab bar items are submit buttons |

## G-001 - Course detail page fires an endless request loop (quizzes 403 retried thousands of times), trips the rate limit and logs users out

- **Phase/route/role:** P4 · `/learning/courses/<id>` · EMP and MGR · desktop.
- **Prerequisites:** Course `48000000-0e05-0000-0000-000000000001` exists; EMP is enrolled.
- **Steps:** 1. Open `/learning/courses/48000000-0e05-0000-0000-000000000001`. 2. Wait 8 s.
- **Expected:** Page loads once; if quizzes are not allowed the page shows no quiz section.
- **Actual:** `GET /api/v1/lms/courses/:id/quizzes` returns 403 and the page retries without limit: 8,269 API requests in 8 s (1,987 x 403, then 6,232 x 429) and 69,792 console errors in the MGR run. The 429s hit `/auth/me` and `/auth/refresh` too, so the session is bounced to `/auth/login?reason=expired` and later routes in the same run were redirected to login.
- **Severity:** Critical
- **Frequency:** 3/3 (EMP, MGR; play page also redirected after the storm).
- **Evidence:** `p4-sweep-mgr.json` (course routes) and probe counts above. Avoid leaving this route open.

## G-002 - Goals: creating a goal fails for every role (400 Data Integrity Violation, generic toast)

- **Phase/route/role:** P4 · `/goals` (`/performance/goals`) · EMP, MGR, HR · desktop.
- **Prerequisites:** Create Goal dialog.
- **Steps:** 1. Create Goal. 2. Title, type Personal, status Draft, target 100, current 20, unit `%`, start tomorrow, end +60 days. 3. Create.
- **Expected:** Goal is created and listed.
- **Actual:** `POST /api/v1/goals` -> `400 DB_INTEGRITY_VIOLATION` ("A data conflict occurred"). Dialog stays open, toast only says "Request failed with status code 400". Request body sends `endDate`/`unit`; table `goals` has `due_date NOT NULL` and `measurement_unit` (probable field mismatch, not confirmed in code). The empty list invites the user to "Create your first goal".
- **Severity:** High
- **Frequency:** 4/4 (EMP x2, MGR, HR).
- **Evidence:** `screenshots/ui-p4-goal-create.png`. High: the core Goals workflow cannot be used.

## G-003 - Surveys: creating a survey fails (400 Data Integrity Violation) and the dialog closes, losing the input

- **Phase/route/role:** P4 · `/surveys` · HR · desktop.
- **Prerequisites:** Create Survey dialog.
- **Steps:** 1. Create Survey. 2. Code `NUAURA_TEST_P4_S2`, title, start 2026-11-20, end 2026-12-20, defaults. 3. Submit.
- **Expected:** Survey created and listed.
- **Actual:** `POST /api/v1/survey-management` -> `400 DB_INTEGRITY_VIOLATION`; the dialog closes, list stays "No surveys found", no error shown in the page.
- **Severity:** High
- **Frequency:** 2/2.
- **Evidence:** `screenshots/ui-p4-survey-create.png`.

## G-004 - 1-on-1: employee cannot pick a participant (employee search returns 403, retried 4 times)

- **Phase/route/role:** P4 · `/one-on-one` · EMP · desktop.
- **Prerequisites:** Schedule Meeting page.
- **Steps:** 1. Schedule Meeting. 2. Type `Sum` in "Search for a participant...".
- **Expected:** Suggestions for colleagues appear (Participant is required).
- **Actual:** `GET /api/v1/employees/search?query=Sum` -> 403 "Required any of [EMPLOYEE:VIEW_ALL, EMPLOYEE:VIEW_DEPARTMENT, ...]" four times; no suggestions, no message, so a 1-on-1 cannot be scheduled although EMP has MEETING:CREATE.
- **Severity:** High
- **Frequency:** 2/2.
- **Evidence:** `screenshots/ui-p4-121-search.png`.

## G-005 - 1-on-1: manager is sent to the dashboard while the employee can open the page

- **Phase/route/role:** P4 · `/one-on-one` · MGR · both.
- **Prerequisites:** MGR has no `MEETING:VIEW` / `MEETING:CREATE` (EMP has both).
- **Steps:** 1. Sign in as MGR. 2. Open `/one-on-one`.
- **Expected:** Manager sees the 1-on-1 page.
- **Actual:** Redirected to `/me/dashboard`; EMP and HR open it. Permission seed looks inverted for this module.
- **Severity:** High
- **Frequency:** 2/2 (desktop, mobile).
- **Evidence:** `p4-sweep-mgr.json`.

## G-006 - Review cycle: a review deadline after the cycle end passes the form, the server returns 400, the dialog closes and the input is lost

- **Phase/route/role:** P4 · `/performance/cycles` · HR · desktop.
- **Prerequisites:** Create Cycle dialog.
- **Steps:** 1. Create Cycle. 2. Name, start 2027-01-01, end 2027-03-31, Review Deadline 2027-04-15. 3. Create.
- **Expected:** Inline message on the deadline field; dialog stays open.
- **Actual:** `POST /api/v1/review-cycles` -> 400 `managerReviewDeadlineValid`; dialog closes, generic toast "Request failed with status code 400", cycle not created, user must retype everything.
- **Severity:** Medium
- **Frequency:** 2/2.
- **Evidence:** `screenshots/ui-p4-cycle-err.png`.

## G-007 - OKR: an objective can be saved with the end date before the start date

- **Phase/route/role:** P4 · `/okr` · EMP · desktop.
- **Prerequisites:** New Objective dialog.
- **Steps:** 1. New Objective. 2. Title, start 2026-12-30, end 2026-11-18. 3. Create.
- **Expected:** Validation error "End date must be after start date" (goal and cycle forms have it).
- **Actual:** `POST /api/v1/okr/objectives` -> 200; card shows "Dec 30, 2026 - Nov 18, 2026".
- **Severity:** Medium
- **Frequency:** 2/2.
- **Evidence:** probe output (objective `NUAURA_TEST_P4_okr`).

## G-008 - OKR: key-result current value above target is accepted and completes the objective

- **Phase/route/role:** P4 · `/okr` · EMP · desktop.
- **Prerequisites:** Objective with one key result (target 100).
- **Steps:** 1. Expand objective. 2. Set current value 150, Enter.
- **Expected:** Value rejected or capped at the target.
- **Actual:** `PUT /api/v1/okr/key-results/<id>/progress?value=150` -> 200; row "150 / 100 %", progress 100%, objective flips from DRAFT to COMPLETED.
- **Severity:** Medium
- **Frequency:** 1/1.
- **Evidence:** probe output.

## G-009 - OKR: objective status stays COMPLETED after the key-result value is lowered

- **Phase/route/role:** P4 · `/okr` · EMP · desktop.
- **Prerequisites:** Follows G-008.
- **Steps:** 1. Set current value 150 (objective COMPLETED). 2. Set it to 50.
- **Expected:** Objective leaves COMPLETED.
- **Actual:** Progress shows 50% but the badge stays COMPLETED.
- **Severity:** Medium
- **Frequency:** 1/1.
- **Evidence:** probe output.

## G-010 - Course detail shows contradictory completion data

- **Phase/route/role:** P4 · `/learning/courses/<id>` · EMP · desktop.
- **Prerequisites:** EMP enrolment in course `...0e05-...0001`.
- **Steps:** 1. Open the course (briefly, see G-001).
- **Expected:** Completed course shows 100% and a certificate, with a consistent lesson count.
- **Actual:** Text reads "Progress 30%", "Completed Nov 16, 2026", "0 lessons" and "Processing your certificate... This should appear within a few minutes".
- **Severity:** Medium
- **Frequency:** 2/2.
- **Evidence:** probe text.

## G-011 - My Learning shows a raw course ID instead of the course title, and Completed at 30%

- **Phase/route/role:** P4 · `/training/my-learning` · EMP · both.
- **Prerequisites:** Same enrolment as G-010.
- **Steps:** 1. Open `/training/my-learning`.
- **Expected:** Course title; Completed means 100%.
- **Actual:** "Course ID: 48000000-0e05-... Completed ... Progress 30% ... Avg Progress 30%".
- **Severity:** Medium
- **Frequency:** 3/3.
- **Evidence:** probe text.

## G-012 - Competency Matrix: gap analysis calls a forbidden endpoint three times and shows an error card

- **Phase/route/role:** P4 · `/performance/competency-matrix` · EMP and MGR · both.
- **Prerequisites:** Role without LMS skill-gap permission.
- **Steps:** 1. Open the page.
- **Expected:** No call the role cannot make, or a plain empty state.
- **Actual:** `GET /api/v1/lms/employees/<own id>/skill-gaps` -> 403 three times, 6 console errors, card "Couldn't load gap analysis".
- **Severity:** Medium
- **Frequency:** 4/4.
- **Evidence:** `p4-sweep.json`.

## G-013 - Performance Revolution: same 403 skill-gaps calls on load

- **Phase/route/role:** P4 · `/performance/revolution` · EMP and MGR · both.
- **Prerequisites:** As G-012.
- **Steps:** 1. Open the page.
- **Expected:** No forbidden call.
- **Actual:** 403 `skill-gaps` twice, 4 console errors.
- **Severity:** Low
- **Frequency:** 4/4.
- **Evidence:** `p4-sweep.json`.

## G-014 - HR admin is redirected away from My Certificates

- **Phase/route/role:** P4 · `/learning/certificates` · HR · both.
- **Prerequisites:** HR has no `LMS:CERTIFICATE_VIEW`.
- **Steps:** 1. Open the page.
- **Expected:** Page opens (EMP and MGR can; the route has no page-level rule).
- **Actual:** Redirect to `/me/dashboard`.
- **Severity:** Medium
- **Frequency:** 2/2.
- **Evidence:** `p4-sweep.json`.

## G-015 - Manager is redirected away from Learning Paths while the employee can open it

- **Phase/route/role:** P4 · `/learning/paths` · MGR · both.
- **Prerequisites:** MGR has no `LMS:COURSE_VIEW`.
- **Steps:** 1. Open the page.
- **Expected:** Same access as EMP.
- **Actual:** Redirect to `/me/dashboard`; EMP and HR see the page.
- **Severity:** Medium
- **Frequency:** 2/2.
- **Evidence:** `p4-sweep-mgr.json`.

## G-016 - Wellness admin: Create Program with invalid values does nothing and shows no message

- **Phase/route/role:** P4 · `/wellness/admin` · HR · desktop.
- **Prerequisites:** New Program dialog.
- **Steps:** 1. Name, start 2026-12-30, end 2026-11-20, points -50, max participants -3. 2. Create Program.
- **Expected:** Field errors, as the goal and cycle forms show.
- **Actual:** No request is sent, the dialog stays open, no error text.
- **Severity:** Medium
- **Frequency:** 2/2.
- **Evidence:** `screenshots/ui-p4-wellness-create.png`.

## G-017 - Wellness admin access-denied page has no heading

- **Phase/route/role:** P4 · `/wellness/admin` · EMP and MGR · both.
- **Prerequisites:** No `WELLNESS_MANAGE`.
- **Steps:** 1. Open the page.
- **Expected:** A heading on the denied page.
- **Actual:** Shows "Access Denied - You need WELLNESS_MANAGE permission" but the sweep finds no h1/h2/role=heading.
- **Severity:** Low
- **Frequency:** 4/4.
- **Evidence:** `p4-sweep.json`.

## G-018 - 1-on-1 tab bar items are submit buttons

- **Phase/route/role:** P4 · `/one-on-one` · EMP · desktop.
- **Prerequisites:** -
- **Steps:** 1. Inspect Upcoming / All Meetings / Action Items / Agenda Templates.
- **Expected:** `role=tab` semantics.
- **Actual:** Rendered as `button type=submit` without a tab role.
- **Severity:** Low
- **Frequency:** 2/2.
- **Evidence:** probe element dump.

## Not logged

- `/learning/paths` and `/training/my-learning` showed a loading indicator once in the sweep but loaded fine in 3 later probes.
- HR `/wellness` at 390px was blank with 41 failed requests once; not reproduced (0/2).
- `/surveys/pulse` console error is the known cancelled-request noise.
- Not exercised: PIP create, 360 request/submit, review create/submit, calibration/9-box with data, survey respond, training enrol. Sweep only confirmed these pages load. Dynamic routes for surveys, cycles and training had no seed ids (lists empty), so were not swept.
- Sessions expired several times mid-run (also a side effect of G-001); two login retries were needed.
