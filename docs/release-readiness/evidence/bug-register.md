# NU-AURA UI bug register (P0-P7)

Merged from the per-phase files. STATUS AS OF 2026-11-20: the older status header and totals were removed because they no longer matched. Per-bug status now lives in `p3-static-status.md`, `p4-static-status.md`, `p5-static-status.md`, `p6p7-static-status.md` (static code reading unless marked LIVE) and in the dated decision rows at the bottom of this file (later rows supersede earlier ones). Plan: `../17-e2e-browser-test-plan.md` A4. Cross-document check: `doc-consistency-check.md`.

Fix totals are not restated here; see the static status files.

Total listed entries: 117 (UI-006 and UI-007 each group several defects, so distinct defects are higher). By severity: Critical 1, High 23, High/Medium 1, Medium 52, Low 40

| ID | Severity | Phase | Title |
|---|---|---|---|
| G-001 | Critical | P4 Grow | Course detail page fires an endless request loop (quizzes 403 retried thousands of times), trips the rate limit and logs users out |
| F-001 | High | P5 Fluence | Wiki page view shows raw editor JSON |
| F-002 | High | P5 Fluence | Wiki edit loads raw JSON, save corrupts content |
| F-003 | High | P5 Fluence | Blog post cannot be created |
| F-004 | High | P5 Fluence | Template cannot be created |
| F-005 | High | P5 Fluence | Search shows no results for existing content |
| F-006 | High | P5 Fluence | Edit lock returns 403 for HR admin |
| G-002 | High | P4 Grow | Goals: creating a goal fails for every role (400 Data Integrity Violation, generic toast) |
| G-003 | High | P4 Grow | Surveys: creating a survey fails (400 Data Integrity Violation) and the dialog closes, losing the input |
| G-004 | High | P4 Grow | 1-on-1: employee cannot pick a participant (employee search returns 403, retried 4 times) |
| G-005 | High | P4 Grow | 1-on-1: manager is sent to the dashboard while the employee can open the page |
| H-001 | High | P3 Hire | Public /careers shows "No jobs found" although the public API returns the live job |
| H-002 | High | P3 Hire | At 390px an invisible notifications container covers the top of every Hire page and blocks the main action buttons |
| H-003 | High | P3 Hire | Add Candidate silently does nothing unless phone, experience, both CTCs and notice period are filled |
| H-004 | High | P3 Hire | Job Boards page calls a missing endpoint (404) and cannot list jobs to post |
| H-005 | High | P3 Hire | Offer letter cannot be created: template list is empty |
| H-006 | High | P3 Hire | Add Agency silently does nothing |
| S-001 | High | P6/P7 | `GET /api/v1/employees/managers` returns full employee records to EMP (includes personalEmail) |
| UI-001 | High | P0-P2 | Attendance Requests: "New request" (WFH) modal crashes the page when typing a reason |
| UI-002 | High | P0-P2 | Timesheets: no PSA projects, so time entries cannot be added; existing entries show "Unknown Project"; Copy last week fails |
| UI-003 | High | P0-P2 | Announcements: HR sees "New Announcement" but the API rejects the create with 403 (needs SYSTEM:ADMIN) |
| UI-004 | High | P0-P2 | `/me/documents` sends a signed-in user to the login page |
| UI-005 | High | P0-P2 | `/calendar` crashes: `events.forEach is not a function` |
| UI-006 | High | P0-P2 | Screens call API endpoints that do not exist (404): benefits, job boards, resource workload |
| UI-007 | High/Medium | P0-P2 | Permitted screens whose data calls return 403 for the role (menu shows the screen, API denies it) |
| F-007 | Medium | P5 Fluence | Rejected input fails silently |
| F-008 | Medium | P5 Fluence | Publish with no space does nothing |
| F-009 | Medium | P5 Fluence | 403 shown as empty state |
| F-010 | Medium | P5 Fluence | Space page counts stay at 0 |
| F-011 | Medium | P5 Fluence | Helpdesk admin tiles for EMP |
| G-006 | Medium | P4 Grow | Review cycle: a review deadline after the cycle end passes the form, the server returns 400, the dialog closes and the input is lost |
| G-007 | Medium | P4 Grow | OKR: an objective can be saved with the end date before the start date |
| G-008 | Medium | P4 Grow | OKR: key-result current value above target is accepted and completes the objective |
| G-009 | Medium | P4 Grow | OKR: objective status stays COMPLETED after the key-result value is lowered |
| G-010 | Medium | P4 Grow | Course detail shows contradictory completion data |
| G-011 | Medium | P4 Grow | My Learning shows a raw course ID instead of the course title, and Completed at 30% |
| G-012 | Medium | P4 Grow | Competency Matrix: gap analysis calls a forbidden endpoint three times and shows an error card |
| G-014 | Medium | P4 Grow | HR admin is redirected away from My Certificates |
| G-015 | Medium | P4 Grow | Manager is redirected away from Learning Paths while the employee can open it |
| G-016 | Medium | P4 Grow | Wellness admin: Create Program with invalid values does nothing and shows no message |
| H-007 | Medium | P3 Hire | Interview "Provide feedback" does nothing on submit |
| H-008 | Medium | P3 Hire | Job list shows no department (departmentName null) |
| H-009 | Medium | P3 Hire | Job accepts minimum salary higher than maximum |
| H-010 | Medium | P3 Hire | Duplicate job code is silently renamed |
| H-011 | Medium | P3 Hire | Job save rejected by server with no visible message |
| H-012 | Medium | P3 Hire | Duplicate candidate code gives no visible error |
| H-013 | Medium | P3 Hire | Two candidates can be created with the same email |
| H-014 | Medium | P3 Hire | Pipeline "Add Applicant" asks for a raw Candidate ID (UUID) |
| H-015 | Medium | P3 Hire | Pipeline shows negative time: "-1d ago", "Avg. Time in Stage -1d" |
| H-016 | Medium | P3 Hire | Candidate and pipeline data disagree |
| H-017 | Medium | P3 Hire | /offer-portal without a token shows an empty offer instead of an error |
| H-018 | Medium | P3 Hire | Employee can open the Career Page CMS and sees a misleading empty state |
| H-019 | Medium | P3 Hire | Manager sees scorecard templates and "New Template"; save fails with 403 and no message |
| H-020 | Medium | P3 Hire | Scorecard template saved with no criteria |
| H-021 | Medium | P3 Hire | Onboarding template: "CREATE & CONFIGURE TASKS" does not navigate |
| H-022 | Medium | P3 Hire | Interview can be scheduled in the past and stays "SCHEDULED" |
| H-023 | Medium | P3 Hire | Employee referrals list returns 403 on every load |
| H-024 | Medium | P3 Hire | HR admin cannot open Referrals |
| H-025 | Medium | P3 Hire | Career Page CMS table is clipped on mobile |
| Q-001 | Medium | P6/P7 | `/admin/payroll`: API 500 shows "No payroll runs yet" and zero KPIs, no error |
| Q-002 | Medium | P6/P7 | `/announcements`: API 500 shows "No Announcements" |
| Q-003 | Medium | P6/P7 | `/assets`: API 500 shows "No Assets Found" and zero KPIs |
| Q-004 | Medium | P6/P7 | `/admin/office-locations`: API 500 shows "No office locations" |
| Q-005 | Medium | P6/P7 | `/admin/holidays`: API 500 shows raw "Request failed with status code 500" plus "No holidays configured" |
| Q-006 | Medium | P6/P7 | `/recruitment/candidates`: API 500 shows "No candidates found / Add First Candidate" |
| Q-007 | Medium | P6/P7 | `/departments`: API 500 shows "No departments found" |
| Q-008 | Medium | P6/P7 | `/timesheets`: API 500 shows "No timesheets for this period" |
| Q-011 | Medium | P6/P7 | `/admin/departments` at 390: card content clipped, no scroll |
| Q-012 | Medium | P6/P7 | `/tax/declarations` at 390: card content clipped (712 in 322 px) |
| Q-013 | Medium | P6/P7 | `/projects/calendar` at 390 and 768: calendar/sidebar clipped |
| Q-016 | Medium | P6/P7 | Add Holiday dialog has no dialog semantics |
| Q-021 | Medium | P6/P7 | Icon-only buttons without accessible name (`/projects/gantt`, `/projects/calendar`, `/offboarding/fnf`) |
| Q-022 | Medium | P6/P7 | Inputs and selects without label (`/surveys`, `/recruitment/pipeline`, 3 more) |
| S-002 | Medium | P6/P7 | MGR can read and open the edit form of any employee, not only the team |
| UI-008 | Medium | P0-P2 | Timesheets: the week-view "Add Entry" button does nothing |
| UI-009 | Medium | P0-P2 | Timesheets: after "Submit for Approval" the week badge stays "Draft" until reload |
| UI-010 | Medium | P0-P2 | Activity Wall: a new comment is not shown in the thread until the page is reloaded |
| F-012 | Low | P5 Fluence | Long wall post silently not sent |
| F-013 | Low | P5 Fluence | Wiki header details |
| F-014 | Low | P5 Fluence | "New Page" offered to users who cannot create |
| F-015 | Low | P5 Fluence | Generic template validation message |
| F-016 | Low | P5 Fluence | Recognition error text and receiver input |
| G-013 | Low | P4 Grow | Performance Revolution: same 403 skill-gaps calls on load |
| G-017 | Low | P4 Grow | Wellness admin access-denied page has no heading |
| G-018 | Low | P4 Grow | 1-on-1 tab bar items are submit buttons |
| H-026 | Low | P3 Hire | Negative numbers in candidate / interview forms are blocked without a message |
| H-027 | Low | P3 Hire | Job with closing date in the past is accepted |
| H-028 | Low | P3 Hire | Raw validation text "Expected string, received null" |
| H-029 | Low | P3 Hire | Technical messages shown to users |
| H-030 | Low | P3 Hire | Unknown /careers/<path> sends an anonymous visitor to login with "session expired" |
| H-031 | Low | P3 Hire | Pre-boarding invite accepts a joining date in the past |
| H-032 | Low | P3 Hire | Job list shows Salary "0" when none is set |
| H-033 | Low | P3 Hire | /onboarding for MGR and EMP: no page heading and a 403 console error |
| H-034 | Low | P3 Hire | Interview list dates have no year |
| H-035 | Low | P3 Hire | EMP "Scorecards unavailable" -> "Back to recruitment" leads to a redirect |
| H-036 | Low | P3 Hire | Star rating buttons in the interview feedback dialog have no accessible name |
| Q-009 | Low | P6/P7 | Error toast shown next to zero KPI tiles (`/admin/employees`, `/payroll`) |
| Q-010 | Low | P6/P7 | Spinner stays 15-25 s before the error appears after a failing API (retry backoff) |
| Q-014 | Low | P6/P7 | 768: page shell clips content (`/expenses`, `/onboarding`, `/analytics/org-health`) |
| Q-015 | Low | P6/P7 | 768: stat/report cards clipped (`/reports`, `/recruitment/candidates`, `/workflows`, `/learning/paths`) |
| Q-017 | Low | P6/P7 | Heading level jumps h1 to h3 on 11 routes |
| Q-018 | Low | P6/P7 | Two `<main>` landmarks on 7 routes |
| Q-019 | Low | P6/P7 | Mantine tabs: `aria-controls` points to a missing panel (3 routes) |
| Q-020 | Low | P6/P7 | Scrollable regions with no focusable content (3 routes) |
| Q-023 | Low | P6/P7 | Colour contrast 3.67:1 for blue-500 text/white-on-blue-500 buttons |
| Q-024 | Low | P6/P7 | Row action link colours fail contrast on hover rows (`/admin/leave-requests`, `/admin/leave-types`) |
| Q-025 | Low | P6/P7 | Nested interactive controls (`/admin/org-hierarchy`, `/reports`) |
| Q-026 | Low | P6/P7 | Touch targets under 24 px (carousel dots, small icon buttons) |
| Q-027 | Low | P6/P7 | Light surfaces in dark mode (`/admin/departments`, `/admin/payroll`, `/leave/calendar`) |
| Q-028 | Low | P6/P7 | Same `<title>` on different screens (Reports, Projects, Offboarding) |
| S-003 | Low | P6/P7 | `X-Powered-By: Next.js` header sent |
| S-004 | Low | P6/P7 | API error envelopes use inconsistent timestamp time zones |
| S-005 | Low | P6/P7 | Dev profile: `/actuator/metrics`, `/prometheus`, `/info` readable without sign-in |
| S-006 | Low | P6/P7 | Dev profile: Swagger UI reachable without sign-in |
| UI-011 | Low | P0-P2 | Edit employee: HR gets 403 on custom-field definitions (console errors on every edit page) |
| UI-012 | Low | P0-P2 | Screens without a page heading |
| UI-013 | Low | P0-P2 | Signed-in user opening `/` or `/auth/login` is shown the login form instead of being sent to the dashboard |

## Decisions logged 2026-11-19

| ID | Decision | Reason |
|---|---|---|
| Letters 403 (HR admin) | Fixed in V351 (`d7241e6e`) | HR_ADMIN/HR_MANAGER held only LETTER:GENERATE; now also TEMPLATE_VIEW and ISSUE at ALL |
| TASK:VIEW / `/tasks` | Deferred, page stays hidden | Backend has no Task API or TASK permission; granting would expose a broken page |
| S-002 remainder | Accepted | `/hierarchy`, `/subordinates`, `/search` and list return full profiles only to EMPLOYEE:VIEW_ALL at ALL scope (HR). Detail endpoint is scoped |
| Wiki page `ba12d612` | Accepted | One double-encoded row, cosmetic; no DB write |
| 16 `NUAURA_TEST` rows | Deferred, owner: release manager | 3 approved work requests, referral `d9547b20`, ticket `34c02a4b`, 9 orphaned post comments; no API removes them. Clear at deploy time |
| `/settings/sso`, `/settings/security` 429 | Accepted (Low) | Rate limiter fires under back-to-back sweep; manager 403 on `auth/saml/config` is expected for a role without SSO admin |
| Employee documents 403 (HR admin) | Fixed in V352 | HR_ADMIN/HR_MANAGER held no DOCUMENT:*; now VIEW, VIEW_ALL, UPLOAD at ALL. MANAGER still has none (SELF-only model, not changed). Re-tested: upload returns 200 for valid PDF |
| Upload validation (`/files/upload/document/{id}`) | PASS | EXE bytes named .pdf: 400 content mismatch. .html and .exe: 400 type. 30 MB file: 413. Filename `../../etc/passwd.pdf`: 200 but stored as `<ts>_<hash>.pdf`, no traversal |
| Login rate limit | PASS | 5 bad logins give 401, 6th gives 429 with `Retry-After: 60`. Header `X-Rate-Limit-Mode: local`: limiter ran in-memory, not Redis. Check Redis mode in prod |
| Prod bundle secret scan | PASS | 994 client JS files, 0 sourcemaps. One regex hit was the `xoxb-...` input placeholder in the Slack settings form. `JWT_SECRET` value not found in bundle |
| 2 test files (hradmin) | Deferred, owner: release manager | Two valid-PDF uploads from the traversal-name test, `.../documents/48000000-de00-0000-0000-000000000099/20261119-2316*.pdf` and `...231642_d17c96bf.pdf`. `/files/upload/document` stores the object but creates no document row: `GET /employees/{id}/documents` returns `[]`. Remove the two objects from storage at deploy time |
| Document list access | PASS | HR admin 200 (empty), manager 403, employee 403 on another employee's documents |
| Two-tenant isolation | NOT TESTABLE locally | Second tenant `550e8400-...` has 0 employees; a cross-tenant call needs a user there and creating one is a write. Covered only by the earlier IDOR sweep and `RlsTenantGucScopeTest` |
| Announcement not listed after publish | Fixed (`a18a956b`) | `useCreateAnnouncement` and the other announcement mutations invalidated `lists()`, but `/announcements` reads the `active` key, so a new post stayed hidden up to 2 min. Now invalidate `announcementKeys.all`. Re-run H4: PASS |
| P2 re-run H5 (holiday not listed) | Test artifact, script fixed | Script created a 2027 holiday; page lists the current year. Script now uses 2026-12. Re-run H5: PASS |
| P2 re-run test data | Deferred, owner: release manager | Run `NUAURA_TEST_P2_182775`: 1 employee, leave, WFH, wall post, timesheet submit, announcement, holiday. Runs `_032360` and the H5 re-run: 1 announcement, 1 holiday each. Employee and announcement rows have no remove path from the UI flow used |
| P4 re-run (goals, 1-on-1, review cycle, OKR) | PASS | G-002 goal create now 201 and persists after reload. G-004 participant search works. Review cycle `NUAURA_TEST_P4_cyc4` created again (201) and listed. `p4-kr` could not run: employee has 0 objectives after cleanup, API and page agree |
| P4 re-run test data | Deferred, owner: release manager | 1 goal `NUAURA_TEST_P4_235018 goal2`, 1 review cycle `NUAURA_TEST_P4_cyc4` (duplicate name of the earlier one) |
| H-024 HR cannot open Referrals | Fixed in V353 | HR_ADMIN/HR_MANAGER held no REFERRAL:*; now VIEW and MANAGE at ALL. HR `/referrals` loads (Referral Portal), no HTTP errors |
| H-023, H-002 | Verified fixed | Employee `/referrals/my-referrals` 200. At 390px the Jobs action button receives clicks |
| H-001 | Consistent, not proven | Public API returns 0 jobs and `/careers` shows 'No jobs found'. No open job exists to prove a live job renders |
| P5 re-run (F-001, F-002, F-003, F-004, F-006) | Verified fixed | See plan 17 P5 row. F-005 unproven without Elasticsearch. Transient 409 on `GET /knowledge/wiki/pages/{id}` right after a save; 3 later reads 200. Low, watch |
| P5 re-run test data | Deferred, owner: release manager | Blog `99c44cb2-...`, template `600e6498-...`, wiki space `40ab6a15-...`, wiki page `0ac8df83-...`, all `NUAURA_TEST_P5_R3` |
| Internal review of V350-V353, announcements hook, employee scoping, DevSecurityConfig removal | No critical or high | Read-only review by a code-reviewer agent, 2026-11-20. This is NOT the A7 Codex/Grok review, which is still NOT RUN. Migrations idempotent, RLS-safe, no version collision. 2 Low: see next two rows |
| `OneOnOneMeetingController.searchParticipants` ignores role scope | Accepted (Low) | MANAGER with TEAM scope can find any active employee by name (id and name only, min 2 chars, max 20 results). Deliberate for a meeting participant picker |
| `getManagers` returns minimal DTO | No defect | Checked all 3 consumers (`admin/employees`, `employees`, `employees/[id]/edit`): they read only id, fullName, firstName, lastName, employeeCode, all in the DTO |
| H-016 candidate and pipeline disagree | Open, root cause found, fix needs a product decision | Two models never synced: `Applicant` (pipeline, `ApplicationStatus`) and `Candidate` (`CandidateStatus` + `RecruitmentStage`). `ApplicantService.updateStatus` (~L120-150) updates only the applicant, so the candidate stays NEW after a move to Screening. Dashboard 'in pipeline' is computed in the browser from the candidate list (`useRecruitmentDashboard.ts:51-53`), the board only shows applicants of one job (`ApplicantService.getPipeline` L157). Stage labels are hard-coded in `pipeline-config.ts:21` and `candidates/utils.ts:27`. Proposed fix: in `updateStatus` also set `Candidate.status` and `currentStage` from an ApplicationStatus-to-candidate mapping the product owner must approve; count pipeline from applicants; align labels. Not applied: the mapping is a product rule and a wrong one would rewrite recruiter data |
| G-009 objective stays COMPLETED after key result lowered | Accepted by design | `Objective.updateStatus` keeps COMPLETED sticky (`8bd65698` reverted the reopen in `16d80143`). A finished objective is not silently reopened by a later edit |
| G-010, G-011 completed at 30% / 0 lessons | Open, data issue | Enrolment row says COMPLETED while progress is 30%. No code reconciles it; `fixes/grow.md` marks it SKIPPED. Fix the seed/enrolment data or add a completion check in the enrol service (product decision) |
| P4 static status (G-001..G-018) | 13 FIXED, 3 open | See `evidence/p4-static-status.md`. G-005, G-014, G-015 depend on V350 having run |
| F-010 wiki space page count stale after create/publish/delete | Fixed in code, not proven live | Page create, delete and the publish/approve/archive helper now also invalidate `fluenceKeys.wikiSpaces()`. `tsc` clean, 112 hook tests pass. A fresh load shows `1 pages`; the in-session stale case was not driven in a browser |
| P5 static status (F-007..F-016) | 8 FIXED, 2 UNCLEAR (F-010 fixed above, F-013 badge colour needs a browser) | See `evidence/p5-static-status.md` |
| P6/P7 static status (47 rows) | 31 FIXED, 12 UNCLEAR, 3 open, 1 accepted | See `evidence/p6p7-static-status.md`. Open: UI-002 (dangling project ids / 'Unknown Project', no seed), UI-007 remainder (`/reports/attrition`, `/settings/sso` denied calls; `/travel` is fine, checked), UI-013 (`/` shows login to a signed-in user, likely product decision). UNCLEAR need a browser, axe or contrast measure: Q-013..Q-015, Q-017..Q-019, Q-023, Q-024, Q-026..Q-028, UI-004 |
| P6 re-run (128 runs) | PASS, 3 Low open | 0 overflow, 0 errors. Q-019 (3 routes: tab aria-controls to unmounted panel; fix is `keepMounted` on those Tabs, but it would fetch hidden panels, so left), Q-026 (carousel dots 16x6 px), `/admin/payroll` dark `color-contrast` (1 row, element not identified). All Low, not fixed |
| Q-026 carousel dots below 24 px | Fixed | Flagged dots were `LeaveBalanceWidget` (not HolidayCarousel, already fixed in `16d80143`). Buttons now 24x24 with the visible dot as an inner span. axe `target-size` on MGR `/me/dashboard`: 0 violations after |
| UI-007 remainder | Fixed | `/reports/attrition` query now needs PREDICTIVE_ANALYTICS_VIEW, `/settings/sso` SAML config query needs SYSTEM_ADMIN (matches the controllers). HR admin and manager: no 4xx on either route (both are redirected by the route gate) |
| UI-002 Unknown Project | Open, data | Frontend lookup is correct (`timesheets/page.tsx:84-85`). Tenant has 0 `psa_projects` rows; seeded time entries point at an id not in that table; no FK. Fix: seed PSA projects for the demo tenant or repoint entries (migration/seed), optional FK after cleanup. Verify: `GET /api/v1/psa/projects` returns a project, then adding an entry returns 201 |
| H-021 Create & Configure Tasks | Probably fixed, not re-run | `onboarding/templates/new/page.tsx:44-50` replaces to `/onboarding/templates/{id}`; target page exists. Fails only if response lacks id or user lacks ONBOARDING_VIEW/MANAGE. Re-run `p3-t16.mjs` to close |
| Q-019 tab aria-controls | Fixed | The `aria-controls={undefined}` overrides did nothing because Mantine `useProps` drops undefined props. Now `null` (React omits the attribute). `/attendance/regularization`, `/performance/okr`, `/performance/pip`: axe `aria-valid-attr-value` 0 violations after. `ViewTabs.tsx` and `WorkRequestsPanel.tsx` not flagged by the sweep, left alone |
| Regression tests for cache invalidation | Added | `useAnnouncements.invalidation.test.tsx` (4) and `useFluence.invalidation.test.tsx` (5). Full vitest: 137 files, 2690 tests pass |
| P7 re-run replay | PASS with caveats | 82 HR-only GETs as EMP/MGR: EMP 56x403 / 26x200, MGR 37x403 / 45x200. 200s are reference data, self-scoped or empty; only `/leave-requests` content-checked (no leak). 4 HR-only routes stayed rendered for EMP: `/departments`, `/learning/paths`, `/leave/calendar`, `/onboarding` (content not inspected, likely own-data or reference pages; review to confirm) |
| P7 test data | Deferred, owner: release manager | Run `NUAURA_TEST_P7_689081`: inert-payload records tagged with the run id (wall post and helpdesk ticket as in the first P7 run) |
| H-021 | Verified fixed live | `p3-t16.mjs`: `POST /onboarding/templates` 201, page navigates to `/onboarding/templates/{id}`. New template `NUAURA_TEST_P3_110279 Onb Template` (id `d5e1b32f-...`) left for cleanup |
| `/departments` shows management controls to EMP/MGR (found in P7 follow-up) | Fixed | Add Department button and the row Edit/Toggle/Delete actions were visible to anyone with DEPARTMENT:VIEW, but the API needs DEPARTMENT:MANAGE (a click would 403). Now gated on DEPARTMENT_MANAGE. Live: HR admin sees Add + 3 edit buttons, employee and manager see none. The read-only department list stays visible to all (reference data) |
| H-011, H-012, F-007 silent server rejection | Verified by mechanism | Live: employee wall post with a script tag gets 400 and a visible toast 'Error Invalid input: potentially malicious content in content', no record created. The global `MutationCache.onError` toast (`lib/queryClient.ts:19`) is what jobs save and candidate create rely on; those two dialogs themselves were not driven |
| Q-023, Q-024, Q-027 dark-mode contrast | Fixed on the cited routes | `text-accent-700` links and `text-danger-600` buttons on the dark surface (2.5-3.5:1) now have dark variants (`dark:text-accent-300`, `dark:text-danger-400`); white-on-accent-500 buttons use `dark:bg-accent-600`. `/admin/payroll`, `/admin/leave-types`, `/admin/office-locations`: axe color-contrast 0 violations in dark (was 2, 16, 1). `/admin/leave-requests` light 0. Other pages may still use accent-700 text in dark; not swept |
| Q-017, Q-018 | Fixed (live) | axe heading-order and landmark-no-duplicate-main: 0 violations on 10 cited routes; each has exactly one `<main>` |
| Q-013..Q-015 | No page-level overflow | `scrollWidth - clientWidth` = 0 on all 9 route/viewport pairs. A crude count of hidden-overflow elements was 0-4 per route (could be truncated text); clipping not judged visually |
| Q-028 identical page titles | Still open (Low) | `/reports` and `/reports/scheduled` both 'Reports | NU-AURA'; `/projects` and `/projects/calendar` both 'Projects | NU-AURA'; `/offboarding` is distinct. Title comes from the nav label, sub-pages have no nav item |
| Q-028 identical page titles | Fixed (live) | `ShellFrame` title now adds the exact child nav label or the route sub-segment: `/reports` 'Reports · Overview', `/reports/scheduled` 'Reports · Scheduled Reports', `/projects` 'Projects · All Projects', `/projects/calendar` 'Projects · Calendar', `/offboarding` 'Offboarding · Exit Processes'. Side effect: top-level pages now include the first child label. Supersedes the earlier 'still open' row |
| UI-013 signed-in user sees login form | Partly fixed, rest deliberate | `/` now sends users to `/me/dashboard` (signed-in lands there; signed-out goes to `/auth/login?returnUrl=%2Fme%2Fdashboard` via the proxy). `/auth/login` still shows the form on purpose: `proxy.ts:419-424` refuses to redirect it because a valid cookie with an empty client session loops through AuthGuard `restoreSession`. A safe fix exists (call `/auth/me` once on mount, redirect only on 200, skip when `reason` is set) but was not applied: it touches the login/auth flow |
| Dark-mode text contrast, whole app | Open (Low), deferred | `evidence/dark-contrast-audit.md`: 846 class hits in 203 files, about 660 probably real failures (text-accent/danger/success/warning 600-800 without a dark: variant). A central token change would put pale text on light tinted badges, so the audit recommends a codemod that adds dark:text-*-300/400, light mode unchanged, plus an axe sample afterwards. Not applied: 200-file visual change needs review |
| Ungated management controls on 13 pages (found by `ungated-controls-audit.md`, static) | Fixed, checked live where HR admin can open the page | Controls now hidden unless the user holds the permission the API needs. Gated: `/admin/departments` (DEPARTMENT_MANAGE), `/admin/leave-types` (LEAVE_TYPE_MANAGE), `/admin/shifts` (ATTENDANCE_APPROVE; the audit's SHIFT_MANAGE was wrong, the shift endpoints check ATTENDANCE_APPROVE), `/admin/office-locations` (OFFICE_LOCATION_CREATE/UPDATE/DELETE), `/admin/custom-fields` (CUSTOM_FIELD_CREATE/UPDATE/DELETE), `/resources/approvals` (ALLOCATION_APPROVE), `/expenses/[id]` (EXPENSE_APPROVE), `/projects/[id]` and its Team tab Add Member (PROJECT_UPDATE), `/contracts/templates` (CONTRACT_TEMPLATE_MANAGE), `/onboarding/templates/[id]` (ONBOARDING_MANAGE), `/recruitment/pipeline` (drag and move: RECRUITMENT_MANAGE, add: RECRUITMENT_CREATE; page gate unchanged), `/recruitment/interviews` (CREATE, plus new constants RECRUITMENT_UPDATE and RECRUITMENT_DELETE), `/travel/expenses` (TRAVEL_CREATE). `/employees/change-requests` needed no change (already gated in `ChangeRequestCard`). Live as HR admin: Add/Edit controls still show on departments, office-locations, leave-types, onboarding template, pipeline, interviews, travel expenses. `/admin/shifts`, `/admin/custom-fields`, `/contracts/templates` were already denied to HR admin at page level (P1 sweep), so their controls were checked by `tsc` and code reading only. Not gated: project 'End allocation' button (backend permission not established), project Activate/Close (no matching backend endpoint found) |
| `/admin/leave-types` open to HR admin but API refused it | Fixed in V354 | LEAVE_TYPE:MANAGE was held only by SUPER_ADMIN and TENANT_ADMIN; HR_ADMIN now gets it at ALL. Live: HR admin sees Add, Edit, Deactivate, Delete; manager and employee are redirected. HR_MANAGER not granted |
| Permissions held only by admin roles, no HR grant | Open, product decision | `ALLOCATION:APPROVE` (SUPER_ADMIN only: MANAGER/TEAM_LEAD can open `/resources/approvals` but cannot approve), `CONTRACT:TEMPLATE_MANAGE`, `CUSTOM_FIELD:*`, `SHIFT:*` (SUPER_ADMIN/TENANT_ADMIN). Pages for the last three are already denied to HR admin by route |
| P6b wide sweep | PARTIAL, stopped | 15 of 107 routes in about 2 h (roughly 10 h more): 45 loads (normal, dark, forced-500) with 0 errors, no light surfaces in dark mode, 1 normal-mode contrast row. Not completed |
| Flaky unit test `app/leave/my-leaves/page.test.tsx` ("shows exactly one, specific error notification when cancelling fails") | Open (Low) | Failed in 2 of about 7 full vitest runs today, passes alone and on rerun; suspected load or timing sensitivity, cause not investigated |
