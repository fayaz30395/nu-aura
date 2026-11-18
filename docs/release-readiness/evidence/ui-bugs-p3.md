# UI bugs - phase P3 (NU-Hire)

Found by `scripts/e2e/p3-*.mjs` (sweep `p3-sweep.mjs`, flows `p3-hire-flows.mjs` runner, helpers `p3-t*.mjs`, probe `p3-probe.mjs`). Run id `NUAURA_TEST_P3_110279`; every record created by the run carries that prefix. Commit `c0e2db9a`, local stack, Chromium via Playwright, tenant 660e8400-...0001. Roles: HR admin@, MGR sumit@, EMP arun@. Desktop 1440x900 unless marked mobile (390x844). Screenshots are kept to one per bug where one was taken; otherwise the evidence is the named script/API call.

Not run (data or safety): onboarding process creation (needs a real employee), offer send/portal/e-sign (no offer templates, see H-005), public application (careers shows no jobs, see H-001), joined/onboarding transition. Test data left in the DB: 4 jobs, 3 candidates, 1 applicant, 2 interviews, 1 scorecard, 1 onboarding template, 1 preboarding candidate, 1 referral (all prefixed above).

Observation (not logged as a bug): sessions of all three roles were invalidated several times during the run (concurrent logins by other agents), producing redirects to /auth/login; scripts re-login before use.

## Summary

| ID | Sev | Title |
|---|---|---|
| H-001 | High | Public /careers shows "No jobs found" although the public API returns the live job |
| H-002 | High | At 390px an invisible notifications container covers the top of every Hire page and blocks the main action buttons |
| H-003 | High | Add Candidate silently does nothing unless phone, experience, both CTCs and notice period are filled |
| H-004 | High | Job Boards page calls a missing endpoint (404) and cannot list jobs to post |
| H-005 | High | Offer letter cannot be created: template list is empty |
| H-006 | High | Add Agency silently does nothing |
| H-007 | Medium | Interview "Provide feedback" does nothing on submit |
| H-008 | Medium | Job list shows no department (departmentName null) |
| H-009 | Medium | Job accepts minimum salary higher than maximum |
| H-010 | Medium | Duplicate job code is silently renamed |
| H-011 | Medium | Job save rejected by server with no visible message |
| H-012 | Medium | Duplicate candidate code gives no visible error |
| H-013 | Medium | Two candidates can be created with the same email |
| H-014 | Medium | Pipeline "Add Applicant" asks for a raw Candidate ID (UUID) |
| H-015 | Medium | Pipeline shows negative time: "-1d ago", "Avg. Time in Stage -1d" |
| H-016 | Medium | Candidate and pipeline data disagree |
| H-017 | Medium | /offer-portal without a token shows an empty offer instead of an error |
| H-018 | Medium | Employee can open the Career Page CMS and sees a misleading empty state |
| H-019 | Medium | Manager sees scorecard templates and "New Template"; save fails with 403 and no message |
| H-020 | Medium | Scorecard template saved with no criteria |
| H-021 | Medium | Onboarding template: "CREATE & CONFIGURE TASKS" does not navigate |
| H-022 | Medium | Interview can be scheduled in the past and stays "SCHEDULED" |
| H-023 | Medium | Employee referrals list returns 403 on every load |
| H-024 | Medium | HR admin cannot open Referrals |
| H-025 | Medium | Career Page CMS table is clipped on mobile |
| H-026 | Low | Negative numbers in candidate / interview forms are blocked without a message |
| H-027 | Low | Job with closing date in the past is accepted |
| H-028 | Low | Raw validation text "Expected string, received null" |
| H-029 | Low | Technical messages shown to users |
| H-030 | Low | Unknown /careers/<path> sends an anonymous visitor to login with "session expired" |
| H-031 | Low | Pre-boarding invite accepts a joining date in the past |
| H-032 | Low | Job list shows Salary "0" when none is set |
| H-033 | Low | /onboarding for MGR and EMP: no page heading and a 403 console error |
| H-034 | Low | Interview list dates have no year |
| H-035 | Low | EMP "Scorecards unavailable" -> "Back to recruitment" leads to a redirect |
| H-036 | Low | Star rating buttons in the interview feedback dialog have no accessible name |

Count: High 6, Medium 19, Low 11, total 36.

## H-001 - Public /careers shows "No jobs found" although the public API returns the live job

- **Route/role:** /careers · anonymous · both
- **Steps:** Create job with status OPEN (J1). Open /careers signed out.
- **Expected:** The OPEN job is listed.
- **Actual:** Page says "No jobs found". `GET /api/v1/public/careers/jobs` returns `{"content":[...J1...]}` but `frontend/app/careers/page.tsx:27-30` and `lib/hooks/queries/useCareers.ts:55` read `response.data.jobs` (undefined -> []). No job can ever appear; the public apply flow cannot be reached.
- **Severity:** High
- **Frequency:** 3/3
- **Evidence:** curl of the API; `ui-p3-careers` n/a

## H-002 - At 390px an invisible notifications container covers the top of every Hire page and blocks the main action buttons

- **Route/role:** all /recruitment/*, /onboarding*, /preboarding · HR · mobile
- **Steps:** Open /recruitment/jobs at 390x844, tap "Create Job Opening".
- **Expected:** Dialog opens.
- **Actual:** Playwright: `div.mantine-Notifications-root` (`data-testid=toast-host`) intercepts pointer events at the button. Same for "Add Candidate", "Schedule Interview", "Add Agency", "New Template", "Invite Candidate", "Post to Job Boards", "HOME" breadcrumb (elementFromPoint check on 11 pages).
- **Severity:** High
- **Frequency:** 11/11 pages
- **Evidence:** `scripts/e2e/p3-t23.mjs`

## H-003 - Add Candidate silently does nothing unless phone, experience, both CTCs and notice period are filled

- **Route/role:** /recruitment/candidates · HR · desktop
- **Steps:** Add Candidate; fill code, job, first/last name, email only; Submit.
- **Expected:** Candidate created (those fields are optional) or a message names the missing field.
- **Actual:** No request is sent, no error text. Filling phone + experience + current CTC + expected CTC + notice period together makes it work (201). Any single optional field alone still fails.
- **Severity:** High
- **Frequency:** 4/4
- **Evidence:** `p3-t5/t7.mjs`

## H-004 - Job Boards page calls a missing endpoint (404) and cannot list jobs to post

- **Route/role:** /recruitment/job-boards · HR · both
- **Steps:** Open the page.
- **Expected:** Open jobs listed for posting.
- **Actual:** `GET /api/v1/recruitment/jobs?status=OPEN` -> 404 on every load; 2 console errors.
- **Severity:** High
- **Frequency:** 3/3
- **Evidence:** sweep `p3-sweep.mjs`

## H-005 - Offer letter cannot be created: template list is empty

- **Route/role:** /recruitment/candidates/{id}/offer?applicantId=... · HR
- **Steps:** Open "Create Offer Letter" for an applicant.
- **Expected:** At least a default offer template, or a way to create one here.
- **Actual:** "No offer templates found. Create one in Letters settings." Required Template select has no option, so "Generate & Send Offer" cannot succeed; offer -> offer-portal flow cannot be tested end to end. (Demo tenant has no templates.)
- **Severity:** High
- **Frequency:** 3/3
- **Evidence:** `p3-probe.mjs`

## H-006 - Add Agency silently does nothing

- **Route/role:** /recruitment/agencies · HR
- **Steps:** Add Agency; fill name, contact person, email, phone; Create Agency.
- **Expected:** Agency created or the missing field is named.
- **Actual:** Dialog stays open, no request, no message (3 variants). Same silent-block pattern as the candidate form.
- **Severity:** High
- **Frequency:** 3/3
- **Evidence:** `p3-t16.mjs`

## H-007 - Interview "Provide feedback" does nothing on submit

- **Route/role:** /recruitment/interviews · HR
- **Steps:** Provide feedback on a scheduled interview; pick a star, Result = Rejected, type feedback; Submit Feedback.
- **Expected:** Feedback saved.
- **Actual:** Dialog stays, no request, no message. Empty submit shows raw "Expected string, received null" under Feedback (see H-028). Caveat: interview was in SCHEDULED state, maybe feedback expects another field.
- **Severity:** Medium
- **Frequency:** 2/2
- **Evidence:** `p3-t14.mjs`

## H-008 - Job list shows no department (departmentName null)

- **Route/role:** /recruitment/jobs, /recruitment/career-page · HR
- **Steps:** Create a job with Department = Engineering; open list.
- **Expected:** Department column shows Engineering.
- **Actual:** Column shows "—". API returns `departmentId` set and `departmentName:null` (also "—" in the Career Page CMS).
- **Severity:** Medium
- **Frequency:** 4/4
- **Evidence:** job-openings API

## H-009 - Job accepts minimum salary higher than maximum

- **Route/role:** /recruitment/jobs · HR
- **Steps:** Create job with min 900000, max 100000.
- **Expected:** Validation error.
- **Actual:** Saved; list shows "900,000 – 100,000".
- **Severity:** Medium
- **Frequency:** 2/2
- **Evidence:** `p3-t2.mjs` case C

## H-010 - Duplicate job code is silently renamed

- **Route/role:** /recruitment/jobs · HR
- **Steps:** Create two jobs with code `...-J1`.
- **Expected:** Error "code already exists".
- **Actual:** Second saved as `...-J1-2`, user is not told (in contrast, a duplicate candidate code is rejected).
- **Severity:** Medium
- **Frequency:** 2/2
- **Evidence:** `p3-t2.mjs` case B

## H-011 - Job save rejected by server with no visible message

- **Route/role:** /recruitment/jobs · HR
- **Steps:** Create job with title `<script>alert(1)</script>` (or `<img ...>`).
- **Expected:** Field error "invalid characters".
- **Actual:** API 400 "Invalid input: potentially malicious content in jobTitle"; dialog stays, no toast/field text. The same silent 400 occurs for candidate last name with HTML.
- **Severity:** Medium
- **Frequency:** 3/3
- **Evidence:** `ui-p3-job-400.png`

## H-012 - Duplicate candidate code gives no visible error

- **Route/role:** /recruitment/candidates · HR
- **Steps:** Add a candidate using an existing candidate code.
- **Expected:** Message "code already exists".
- **Actual:** API 400 "Candidate with code ... already exists"; dialog stays, nothing shown.
- **Severity:** Medium
- **Frequency:** 2/2
- **Evidence:** `p3-t6.mjs`

## H-013 - Two candidates can be created with the same email

- **Route/role:** /recruitment/candidates · HR
- **Steps:** Add candidate with the same email as an existing one (different code).
- **Expected:** Duplicate warning/rejection.
- **Actual:** Created (201); two rows with `p3.alice@example.test`.
- **Severity:** Medium
- **Frequency:** 1/1
- **Evidence:** `p3-t6.mjs` (first run)

## H-014 - Pipeline "Add Applicant" asks for a raw Candidate ID (UUID)

- **Route/role:** /recruitment/pipeline · HR
- **Steps:** Select a job, Add Applicant.
- **Expected:** Pick a candidate by name.
- **Actual:** Free-text "Candidate ID *" field; entering a name fails. Junk ID shows raw "Invalid value 'not-a-uuid' for field". Candidates created on /recruitment/candidates do not appear in the pipeline until added this way.
- **Severity:** Medium
- **Frequency:** 3/3
- **Evidence:** `p3-t9.mjs`

## H-015 - Pipeline shows negative time: "-1d ago", "Avg. Time in Stage -1d"

- **Route/role:** /recruitment/pipeline · HR
- **Steps:** Add an applicant, open the board.
- **Expected:** "Today" / 0d.
- **Actual:** Card shows "-1d ago / -1 days"; analytics shows -1d. Server timestamps are ahead of the browser date (BE log time 2026-11-17T03:xx vs local 11-16). Same cause: referral "Submitted Nov 17, 2026" for a record created Nov 16.
- **Severity:** Medium
- **Frequency:** 3/3
- **Evidence:** `ui-p3-pipeline.png`

## H-016 - Candidate and pipeline data disagree

- **Route/role:** /recruitment, /recruitment/candidates, pipeline · HR
- **Steps:** 3 candidates exist, 1 added to pipeline then moved to Screening.
- **Expected:** Same counts and statuses everywhere.
- **Actual:** Dashboard "Candidates in pipeline 3", pipeline board "1 applicant total". After moving the applicant to Screening the candidate page still says NEW / RECRUITERS PHONE CALL. Stage names differ (candidate "Recruiters phone call" vs board "Phone Screen").
- **Severity:** Medium
- **Frequency:** 2/2
- **Evidence:** `p3-t10.mjs`

## H-017 - /offer-portal without a token shows an empty offer instead of an error

- **Route/role:** /offer-portal · anonymous · both
- **Steps:** Open /offer-portal with no token.
- **Expected:** "Invalid or expired link".
- **Actual:** Shows "Your Offer Letter", blank position/CTC/dates ("-") and a hard-coded "hr@company.com". With a bad token the error is correct.
- **Severity:** Medium
- **Frequency:** 2/2
- **Evidence:** `p3-t11.mjs`

## H-018 - Employee can open the Career Page CMS and sees a misleading empty state

- **Route/role:** /recruitment/career-page · EMP
- **Steps:** Sign in as EMP, open the URL.
- **Expected:** Redirect/denied.
- **Actual:** Screen opens ("Job Postings / Company Content", "No job openings found. Create job postings in the Jobs section first") although 4 jobs exist. Screen is open to any signed-in user (no route rule).
- **Severity:** Medium
- **Frequency:** 2/2
- **Evidence:** `p3-probe.mjs employee`

## H-019 - Manager sees scorecard templates and "New Template"; save fails with 403 and no message

- **Route/role:** /recruitment/scorecards · MGR
- **Steps:** Open page, New Template, name it, Save.
- **Expected:** Button hidden or message shown.
- **Actual:** `POST /api/v1/recruitment/scorecards` -> 403 `Required any of: [SCORECARD:TEMPLATE_MANAGE]`; dialog stays, no toast.
- **Severity:** Medium
- **Frequency:** 2/2
- **Evidence:** `p3-t19.mjs`

## H-020 - Scorecard template saved with no criteria

- **Route/role:** /recruitment/scorecards · HR
- **Steps:** New Template, enter only a name, Save.
- **Expected:** Block ("Add at least one criterion" is shown on empty save).
- **Actual:** Saved (201) with `criteria: []`; an unusable template is listed.
- **Severity:** Medium
- **Frequency:** 1/1
- **Evidence:** `p3-t17.mjs`

## H-021 - Onboarding template: "CREATE & CONFIGURE TASKS" does not navigate

- **Route/role:** /onboarding/templates/new · HR
- **Steps:** Enter a name, click the button.
- **Expected:** Go to the template to configure tasks.
- **Actual:** Template created (201) but URL stays on /new, form still filled; second click would create a duplicate.
- **Severity:** Medium
- **Frequency:** 2/2
- **Evidence:** `p3-t16.mjs`

## H-022 - Interview can be scheduled in the past and stays "SCHEDULED"

- **Route/role:** /recruitment/interviews · HR
- **Steps:** Schedule with date 2020-01-01.
- **Expected:** Validation error.
- **Actual:** Created (200), shown as SCHEDULED in the list.
- **Severity:** Medium
- **Frequency:** 1/1
- **Evidence:** `p3-t13.mjs 45 2020-01-01T10:00`

## H-023 - Employee referrals list returns 403 on every load

- **Route/role:** /referrals · EMP
- **Steps:** Open the page.
- **Expected:** No console/network errors.
- **Actual:** `GET /api/v1/referrals?page=0&size=20` -> 403 (2 console errors) yet the submit (POST 200) works and the row appears.
- **Severity:** Medium
- **Frequency:** 4/4
- **Evidence:** sweep + `p3-t12.mjs`

## H-024 - HR admin cannot open Referrals

- **Route/role:** /referrals · HR
- **Steps:** Open /referrals.
- **Expected:** Page, or a denied message.
- **Actual:** Silently redirected to /me/dashboard.
- **Severity:** Medium
- **Frequency:** 2/2
- **Evidence:** sweep

## H-025 - Career Page CMS table is clipped on mobile

- **Route/role:** /recruitment/career-page · HR · 390px
- **Steps:** Open the page.
- **Expected:** Table scrolls or stacks.
- **Actual:** Table is 491px wide in a container with `overflow-x: hidden`; right-hand columns/controls are cut (4 controls off screen).
- **Severity:** Medium
- **Frequency:** 2/2
- **Evidence:** `p3-t21.mjs`

## H-026 - Negative numbers in candidate / interview forms are blocked without a message

- **Route/role:** candidate form, interview form · HR
- **Steps:** Candidate notice period -9 (or interview duration -30); Submit.
- **Expected:** Field error.
- **Actual:** No request and no text.
- **Severity:** Low
- **Frequency:** 3/3
- **Evidence:** `p3-t6/t13`

## H-027 - Job with closing date in the past is accepted

- **Route/role:** /recruitment/jobs · HR
- **Steps:** Closing date 2020-01-01.
- **Expected:** Validation error.
- **Actual:** Saved; list shows "Jan 1, 2020".
- **Severity:** Low
- **Frequency:** 1/1
- **Evidence:** `p3-t2.mjs` case F

## H-028 - Raw validation text "Expected string, received null"

- **Route/role:** interview feedback dialog · HR
- **Steps:** Open Provide feedback, Submit empty.
- **Expected:** "Feedback is required".
- **Actual:** Raw zod text under Feedback.
- **Severity:** Low
- **Frequency:** 2/2
- **Evidence:** `p3-t14.mjs`

## H-029 - Technical messages shown to users

- **Route/role:** candidate form, pipeline · HR
- **Steps:** Submit Add candidate without a job; enter junk Candidate ID.
- **Expected:** Friendly text.
- **Actual:** "Invalid ID format" under Job opening; "Invalid value 'not-a-uuid' for field" in the applicant dialog.
- **Severity:** Low
- **Frequency:** 2/2
- **Evidence:** `p3-t5/t9`

## H-030 - Unknown /careers/<path> sends an anonymous visitor to login with "session expired"

- **Route/role:** /careers/nonexistent · anonymous
- **Steps:** Open the URL signed out.
- **Expected:** 404 page.
- **Actual:** Redirect to `/auth/login?reason=expired&returnUrl=...` (there is also no job detail/apply route under /careers).
- **Severity:** Low
- **Frequency:** 2/2
- **Evidence:** `p3-t11.mjs`

## H-031 - Pre-boarding invite accepts a joining date in the past

- **Route/role:** /preboarding · HR
- **Steps:** Joining date 2020-01-01.
- **Expected:** Validation error.
- **Actual:** Invited (200), card shows "Joining: Jan 1, 2020".
- **Severity:** Low
- **Frequency:** 1/1
- **Evidence:** `p3-t18.mjs`

## H-032 - Job list shows Salary "0" when none is set

- **Route/role:** /recruitment/jobs · HR
- **Steps:** Create job without salary.
- **Expected:** "—".
- **Actual:** Shows 0 (min/max stored as 0).
- **Severity:** Low
- **Frequency:** 4/4
- **Evidence:** list text

## H-033 - /onboarding for MGR and EMP: no page heading and a 403 console error

- **Route/role:** /onboarding · MGR, EMP
- **Steps:** Open the page.
- **Expected:** Clean access-denied screen.
- **Actual:** "You do not have access to onboarding" with no heading; `GET /api/v1/onboarding/processes` -> 403 and 2 console errors; the page is still reached through the nav.
- **Severity:** Low
- **Frequency:** 4/4
- **Evidence:** sweep

## H-034 - Interview list dates have no year

- **Route/role:** /recruitment/interviews · HR
- **Steps:** Schedule 2020 and 2027 interviews.
- **Expected:** Date with year.
- **Actual:** "Jan 1, 10:00 AM" and "Mar 2, 10:00 AM" are indistinguishable by year.
- **Severity:** Low
- **Frequency:** 2/2
- **Evidence:** `p3-t14.mjs`

## H-035 - EMP "Scorecards unavailable" -> "Back to recruitment" leads to a redirect

- **Route/role:** /recruitment/scorecards · EMP
- **Steps:** Click "Back to recruitment".
- **Expected:** Sensible target.
- **Actual:** /recruitment is denied for EMP, so the user lands on the dashboard.
- **Severity:** Low
- **Frequency:** 2/2
- **Evidence:** `p3-probe.mjs employee`

## H-036 - Star rating buttons in the interview feedback dialog have no accessible name

- **Route/role:** /recruitment/interviews · HR
- **Steps:** Inspect the 5 rating buttons.
- **Expected:** aria-label "1 star"...
- **Actual:** Buttons have no text or label.
- **Severity:** Low
- **Frequency:** 1/1
- **Evidence:** `p3-t14.mjs`
