# 17 - NU-AURA UI test plan (P0 to P7, every screen)

One file. Part A is the plan, phase by phase. Part B lists every screen on its own row. Run one phase, fix what it finds, then go to the next.

## A1. Scope and rules

- **Environment:** local test stack only: frontend `http://localhost:3000` and backend `http://localhost:8080`. Before testing, verify the frontend is configured to call the local backend (the dev bundle may address `http://backend:8080`; the test harness reroutes that to `localhost:8080`, so check that no other host is contacted). Fail closed if the app redirects to, calls, or authenticates against a production host. Do not run destructive tests against shared or production data.
- **Accounts:** use only the demo accounts and role assignments documented in `docs/qa/AUTONOMOUS-UI-E2E-RUNBOOK.md`. Confirm the accounts still exist before execution. Never use `fayaz.m@` or `sarankarthick.maran@`. Never include passwords, cookies, tokens, or authorization headers in logs, screenshots, reports, or committed files.
- **Role mapping:** the aliases below are the intended test personas, not proof of current permissions. Verify the actual role and tenant for each account against the runbook and the application. Use the super-admin account only for the P7 checks that require it.
- **Test data:** give every created record a unique run identifier, for example `NUAURA_TEST_<run-id>_...`. Use dedicated test tenants/accounts where available. Record created entity IDs so cleanup is exact. Do not delete records using broad name/email/code matching alone, and never match against free-text fields. Take and verify a restorable local database snapshot before tests that mutate data; clean up only records created by that run, then verify cleanup. If ownership is ambiguous, do not delete.
- **Authentication and rate limits:** reuse a separate Playwright storage state per role where appropriate; keep it outside version control and restrict file permissions. Do not share state between roles or tenants. Respect the configured login rate limit. Test lockout using a dedicated disposable test account, not a shared demo account.
- **Status values:** `PASS`, `FAIL`, `BLOCKED`, `NOT RUN`. `BLOCKED` is not a pass. Record the reason and the evidence needed to unblock it.

| Alias | Account | Intended role |
|---|---|---|
| EMP | `arun@nulogic.io` | Employee |
| MGR | `sumit@nulogic.io` | Manager |
| HR | `admin@nulogic.io` | HR admin |
| SUP | Demo super-admin account specified in the runbook | Super admin (P7 only) |

**Important:** the screen catalogue (Part B) was generated from `frontend/app` (screens), `frontend/lib/config/routes.ts` (route-level UI gate), `frontend/lib/config/public-routes.ts` (no-sign-in screens) and the sidebar menu labels. The route rule is a client-side gate only, not the server's authorization policy. Seeded IDs, endpoint behavior and business rules must still be verified against the runbook, API contracts and database before a result is treated as a defect.

## A2. How a phase works

1. **Preflight:** confirm the local FE/BE hosts, test tenant, demo accounts, database snapshot, and required seeded records. Record the commit SHA, browser version, test run ID, and environment configuration (excluding secrets).
2. **Run:** execute the automated and manual checks for the phase using the documented role and viewport. Use deterministic fixtures and wait for observable application states rather than fixed sleeps wherever possible.
3. **Record:** log each reproducible defect in `evidence/ui-bugs.md`: ID, phase, route, role/tenant, commit, browser/viewport, prerequisites, exact steps, expected result, actual result, severity, frequency, and screenshot/trace reference. Reproduce twice when safe; do not repeat destructive or security-sensitive actions merely to satisfy this rule. Group symptoms with the same verified root cause under one defect.
4. **Triage:** distinguish application defects from test-data, environment, third-party, and expected authorization responses. An expected `401`, `403`, or `404` is not a defect by itself; compare the response with the route's documented access policy and the action's expected outcome.
5. **Fix and retest:** fix Critical and High defects first. Re-run the failing test, relevant regression tests, and the affected phase. Do not mark a phase clean while an applicable check is skipped or blocked.
6. **Independent review:** before a phase is closed, the changed plan text, test scripts and fixes are reviewed by Codex and Grok (section A7). Record each finding and the decision. A phase with an unreviewed change is not closed.
7. **Close:** update the phase status, defect references, test report, and evidence links. Preserve traces and screenshots without secrets or unnecessary personal data.

**Severity:** Critical = confirmed data loss/corruption, cross-tenant or unauthorized sensitive-data exposure, security compromise, incorrect payroll/financial result, or a core workflow that prevents safe use. High = major feature or workflow broken without a reasonable workaround. Medium = incorrect behavior with a safe workaround. Low = cosmetic or minor usability issue.

**Do not automatically report as defects:** expected authorization redirects/`401`/`403` responses; intentional `404` responses for invalid or inaccessible IDs; framework development indicators; known development-only warnings; or a health-check failure that is explicitly documented as an optional dependency check. Verify each exception against current configuration. Do not blanket-ignore console errors, failed requests, or warnings: capture and assess unexpected ones.

## A3. Phases

### P0 - Environment and smoke check

- Confirm FE and BE are the intended local instances and that no production host is contacted.
- Check frontend readiness and backend readiness using the project's documented health/readiness endpoints. Do not treat an optional dependency warning as overall backend failure unless the app depends on it.
- Verify EMP, MGR, and HR can authenticate using the runbook credentials; verify SUP only when needed for P7. Do not repeatedly retry failed logins.
- Confirm demo-mode UI visibility matches the configured demo-mode flag.
- Open the landing/dashboard destination for each role and verify the initial page reaches a stable state, with no unexpected uncaught exception or failed required API request.

**Fail if:** the environment points outside the local stack, a required service is unavailable, an intended test account cannot authenticate, or a role's initial page fails to reach a usable state. Record optional-service failures separately.

### P1 - Route and screen smoke sweep (catalogue: 290 entries)

Script: `evidence/scripts/e2e/p1-route-sweep.mjs`. First reconcile the catalogue with the current route registry and navigation configuration. The count of 290 is the count claimed by this document, not an independently verified route count.

- Use HR only for routes the current authorization policy permits HR to access; do not assume HR can open every route.
- Use EMP and MGR for routes permitted to those roles, based on the actual menu and route/API authorization rules.
- Exercise forbidden routes explicitly and assert the documented redirect or denial. Confirm protected content does not render before denial.
- Replace `[id]`, `[slug]`, `[token]`, and similar placeholders with valid seeded fixtures for positive tests. Test invalid/foreign identifiers separately. Never navigate to literal placeholder paths and count the resulting 404 as a screen test.
- Record routes that cannot be exercised because no safe fixture exists as `BLOCKED`, not `PASS`.

At minimum, test desktop `1440x900` and mobile `390x844`:

1. Uncaught page errors and unexpected console errors; maintain a reviewed allowlist for known benign messages.
2. Unexpected failed network requests and API responses. Assert expected status codes per request and role; do not fail merely because any request returns 4xx/5xx. Classify expected validation, authorization, not-found, and optional-service responses explicitly.
3. Horizontal overflow of the document and major content regions.
4. Visible runtime artifacts such as `undefined`, `null`, `NaN`, and `[object Object]` in user-facing content.
5. Broken or inaccessible images and other required assets.
6. Loading indicators that remain after the documented request/state has settled; use a bounded timeout and capture the pending request/state.
7. Missing or duplicate page titles/headings, judged against the screen's intended information architecture.

**Fail if:** a permitted screen cannot reach its expected stable state, an unauthorized role can see protected content, or a check violates documented behavior. A route not verified against the current registry/policy is `BLOCKED`.

### P2 - HRMS core flows (EMP, then MGR, then HR)

Run against a disposable test tenant with known starting balances and seeded users. Capture before/after values and verify persisted state through the UI and, where available, supported API assertions. Confirm the exact leave, WFH, timesheet, and payroll rules from the product requirements before treating an expected outcome as a defect.

| Step | Role | Do | Expect |
|---|---|---|---|
| 1 | EMP | Open dashboard | Clock card, leave rings, holidays, on-leave/remote cards, composer, feed |
| 2 | EMP | Clock in, then out | Hours update, no duplicate entry |
| 3 | EMP | Apply leave (1 day, then half day, then overlapping) | Balance check, overlap refused, request listed as pending |
| 4 | EMP | WFH request on Attendance Requests | Listed as pending; overlap refused; cancel works |
| 5 | EMP | Timesheet: add entry, Copy last week, submit | Names correct, totals refresh, status changes to submitted |
| 6 | EMP | Wall: post, comment | New comment shown on top; no 403 |
| 7 | EMP | Payslips, profile edit | Own data only; PDF opens; script text saved as text |
| 8 | MGR | Approve and reject a leave; approve the WFH request | Balances change; day record is created for WFH |
| 9 | MGR | Team attendance | Only own reports shown |
| 10 | HR | Employees: search, filter, add, edit, export | Saves; validation messages; toast does not cover buttons |
| 11 | HR | Announcements, holidays, shifts | Create, edit, delete with confirm |
| 12 | HR | Payroll test run, approve by a second admin | Maker-checker enforced; payslip PDFs not empty |

### P3 - NU-Hire

Using isolated test fixtures: create a job with explicitly public visibility → verify it appears on the public careers page; create a non-public job → verify it does not appear publicly; create a candidate through the authorized internal flow and public application flow; move the candidate through each configured pipeline stage; schedule an interview; submit an interviewer scorecard; create an offer; verify the candidate can access only their intended offer portal; and complete the joined/onboarding transition if supported.

Verify role-based field-level access, not just page access. Use synthetic candidate data only.

**Fail if:** a configured transition cannot be completed, data is not persisted, an unauthorized user can access candidate/offer information, or a non-public job is exposed publicly. Confirm expected stage names and transitions against the configured pipeline.

### P4 - NU-Grow

Using synthetic users and an isolated cycle: create a review cycle; complete self-review and manager-review steps; submit; create an OKR objective and key result and update progress; request and submit 360 feedback; enrol in and complete training; schedule a one-on-one, apply an agenda template, add an action item, and complete the meeting; create and respond to a wellness item and survey where the configured permissions allow it.

Verify persisted values, ownership, visibility, and workflow states after reload. Use manager/report relationships from the fixture rather than assuming every manager has the same scope.

**Fail if:** a user can access reviews or feedback outside their authorized scope, a saved value is lost, or an item is missing from its expected view.

### P5 - NU-Fluence

Using synthetic users with different roles: create a wiki page (verify a slug is generated and the page opens by slug) → edit it while a second user attempts to edit (verify the edit lock) → publish → find it through search. Create and publish a blog post. Create and use a template. Verify visibility with a second user: draft, private, team-restricted and restricted pages must not appear in lists, search, direct URL or API responses for users who may not see them. Then exercise announcements, recognition, company spotlight, LinkedIn posts, drive, mail and calendar.

Confirm the intended visibility model (including team and restricted pages) and employee create rights from the product decision before treating a result as a defect.

**Fail if:** a list, search result or direct link shows an item the viewer must not see, the edit lock lets two people save over each other, a save fails or loses content, or text entered as markup runs instead of showing as text.

### P6 - UI quality (every applicable screen)

- **Dark mode:** text, borders, focus indicators, disabled states, charts, dialogs, menus, and overlays remain legible. Check for unintended light surfaces and hard-coded colors.
- **Responsive:** test `390`, `768`, `1280`, and `1440` CSS-pixel viewport widths. Verify content is not clipped, tables scroll within their own container where appropriate, primary actions remain reachable, and navigation collapses/expands correctly. Check both portrait and landscape only where supported.
- **Accessibility:** run axe (or the project's approved equivalent) and resolve all critical/serious findings. Also perform keyboard-only checks, visible focus checks, logical focus order, accessible names for inputs/buttons, semantic headings/landmarks, dialog focus management, and contrast checks. Automated scans do not prove WCAG conformance; record manual checks separately. Use the project's target standard (preferably WCAG 2.2 AA if that is the product requirement).
- **States:** for each applicable list/form/dashboard, test loading, populated, empty, validation, and recoverable error states. Simulate API failures safely and verify a useful message, retry/recovery path, and no misleading success toast. Disabled controls should have an understandable reason where the reason is not otherwise obvious.
- **Consistency:** compare heading hierarchy, typography, button sizing, spacing, icon treatment, and interaction states with the approved design system across all four apps.
- **Known redesign regressions to recheck:** inconsistent hand-built tables; screens with duplicate or missing page headers; candidate-table actions clipped at desktop width; empty survey filter row; toast obscuring Add Employee; sidebar footer overlap in dark mode. Treat this list as regression targets, not proof that these defects still exist.

### P7 - Security and authorization checks

Run only in an isolated local test environment with synthetic data. Coordinate with backend/API tests: UI checks alone cannot establish server-side security.

1. Submit harmless XSS test strings in posts, comments, names, addresses, and titles. Verify they render as inert text in every relevant view and are not executed. Include stored and reflected contexts where applicable.
2. Attempt admin and manager routes/actions as EMP. Verify both UI gating and server-side authorization; protected data must not render or be returned before redirect/denial.
3. Change record IDs to another synthetic user's IDs. Verify object-level authorization on both page loads and API requests.
4. Expire/revoke the session. Verify the app returns to authentication, clears sensitive in-memory UI, and does not reveal cached private content on browser back/forward navigation.
5. Log out, then replay the prior session cookie/token in a controlled test. Verify it is invalidated server-side. Do not expose the cookie in test output.
6. Test lockout/rate limiting with a dedicated disposable account and the configured policy. Verify generic authentication errors do not disclose account existence. Do not lock shared demo accounts; confirm the actual threshold/window from configuration rather than assuming five attempts.
7. Inspect the production-mode client bundle generated with demo mode disabled. Verify no credentials, private keys, tokens, or secrets are embedded. Demo account identifiers are not necessarily secrets, but should not be exposed unless explicitly intended.
8. Test upload type, size, filename, and content validation using harmless fixtures. Verify unauthorized file access is denied and downloads return the expected file/content type.
9. Verify CSRF protections according to the application's actual auth model. For cookie-authenticated state-changing requests, confirm required token/header and origin protections; do not assume every form must send a CSRF header if the app uses a different documented protection model.
10. Switch between two synthetic tenants and verify records, search results, counts, attachments, and cached client state never cross tenant boundaries. Confirm enforcement at the API/data layer, not only in navigation.

For every check, record the expected policy/configuration source and the evidence. A UI denial without a corresponding server-side authorization check is insufficient.

## A4. Status (update after each phase)

| Phase | Status | Bugs found | Notes |
|---|---|---|---|
| P0 | PASS | `evidence/p0-env-check.json` | Re-run on FE 3001 / BE 8080 after port 3000 conflict; `FE_URL` override in `lib.mjs` |
| P1 | PASS with 8 open Low (rate-limit noise) | see `evidence/bug-register.md` | Full sweep @ `d7241e6e`: 249 routes x 3 roles x 2 viewports = 1494 loads, 8 FAIL (was 185 before fixes). All 8 are console 429s on `/settings/sso` (3 roles x 2) and `/settings/security` (employee x 2); manager also logs a 403 on `GET /auth/saml/config` for `/settings/sso`. 40 dynamic routes BLOCKED (need seeded ids). Evidence: `evidence/p1-full-hradmin.md` (covers all roles). A7 review NOT RUN. |
| P2 | PASS with 2 BLOCKED | `evidence/ui-bugs.md`, `evidence/p2-hrms-flows.json` (first run), register | Re-run on `0b2a37e6` plus announcements fix: 19 steps, 17 PASS, 0 FAIL, 2 BLOCKED. Blocked: E5b (no PSA projects in tenant), E5c (Copy last week disabled, week already has entries). First-run JSON kept; re-run result is in the register |
| P3 | PARTIAL re-verify | `evidence/ui-bugs-p3.md`, `evidence/bug-register.md` | Full probe re-run abandoned: probes need first-run data and time out (p3-t6), about 8 min per probe. Instead spot-checked the High bugs on `a18a956b`+V353: H-002 (390px overlay) fixed, H-023 (employee referrals) fixed, H-024 (HR referrals 403) fixed in V353, H-001 page matches public API (0 jobs), H-004/H-005 not re-checked. Not run: onboarding creation, offer send/e-sign, public application, joined transition |
| P4 | PASS on re-run (partial coverage) | `evidence/ui-bugs-p4.md`, `evidence/p4-grow-flows.json` (re-run) | Re-run on `a18a956b`: goals G1-G3 PASS (create works, was G-002), 1-on-1 participant search returns Sumit Kumar with no 403 (was G-004), review cycle create 201 and listed after reload, OKR page matches API. Not run: key result add (no objective for EMP after cleanup), review submit, 360, PIP, training enrol, survey create |
| P5 | RUN, fixes applied, not re-run | `evidence/ui-bugs-p5.md`, `evidence/p5-sweep.json` | Run at `d10bc9b9`. Wiki comments, NU-Mail, NU-Calendar and Drive upload not run |
| P6 | RUN, fixes applied, not re-run | `evidence/ui-bugs-p6p7.md` | axe, API-failure and dark-mode sweeps at `d10bc9b9` |
| P7 | PARTIAL | `evidence/ui-bugs-p6p7.md`, `evidence/bug-register.md` | UI-level security run at `d10bc9b9`. Since then PASS: upload validation, login rate limit, prod bundle secret scan. Not testable locally: two-tenant isolation. Not run: account lockout on a real account |

## A5. Exit criteria

No open Critical or High bug. Every phase PASS, or BLOCKED with a reason. Every phase has a logged Codex and Grok review (A7), or a recorded reason why one could not run. `tsc`, `vitest` and `next build` green. Backend suite run on a machine with Docker.

## A6. Existing material

Existing Playwright specs are in `frontend/e2e/`. Scripts and evidence are in `docs/release-readiness/evidence/`. The earlier task-by-task upgrade plan is in git history for this file.

## A7. Independent review (Codex and Grok)

Reviews run outside this environment. Nothing here is upgraded or installed for them. A reviewer only sees what is attached.

**Gate:** a phase closes only when every review item below is logged with a decision (accepted and fixed, rejected with reason, or deferred with owner). The Status table (A4) notes the review state.

**What to attach (and what never to attach):**
- Attach: this file, the phase's test scripts (`evidence/scripts/e2e/`), the bug list `evidence/ui-bugs.md`, and the diff of any fix. Strip the demo password, cookies, tokens and database dumps first.
- Never attach: `.env` files, saved Playwright session state, database dumps, screenshots that show personal data.

**Review request (paste to each reviewer):**

> You are a strict senior QA architect reviewing a UI test plan and its results for a multi-tenant HR web app (Next.js frontend, Spring Boot backend; roles Employee, Manager, HR admin). Review the attached files for: (1) internal consistency and correctness of the plan, severity rules and status handling; (2) gaps that let real bugs slip through, and checks that cause false positives; (3) safety problems: data deletion rules, secrets, production exposure, destructive tests; (4) logic errors in the scripts (route and permission matching, assertions that always pass, flaky waits); (5) steps that are untestable or ambiguous; (6) for each bug and fix: is the root cause right, is the fix safe, is a regression test missing. Do not edit files. Output a numbered list: severity (High/Medium/Low), location, problem, concrete fix. End with a one-line verdict.

**Review log** (one row per finding):

| Date | Reviewer | Phase/file | Severity | Finding | Decision | Evidence |
|---|---|---|---|---|---|---|
| | Codex | | | | | |
| | Grok | | | | | |

| Phase | Codex review | Grok review |
|---|---|---|
| Plan (A1-A7, Part B) | NOT RUN | NOT RUN |
| P0 | NOT RUN | NOT RUN |
| P1 | NOT RUN | NOT RUN |
| P2 | NOT RUN | NOT RUN |
| P3 | NOT RUN | NOT RUN |
| P4 | NOT RUN | NOT RUN |
| P5 | NOT RUN | NOT RUN |
| P6 | NOT RUN | NOT RUN |
| P7 | NOT RUN | NOT RUN |

A review that was not run stays NOT RUN. It is never recorded as done.

---

# Part B - Screens

## Screen catalogue (290 screens, one row each)

Every screen gets the **common checks** plus the **checks for its type**. The last column adds screen-specific tests. Codes are defined in the legend. `Who can open` lists the route-level permission rule from `frontend/lib/config/routes.ts` (any one of the listed permissions grants access), `Public (no sign-in)` for the 10 screens in `public-routes.ts`, and `Signed-in user (no page-level rule)` where no rule exists (server-side checks still apply); screens with an id in the route are detail screens and need a seeded record.

### Legend

**Common (every screen):** C1 no console errors · C2 no API 4xx/5xx · C3 no overflow @390 · C4 dark mode readable · C5 keyboard + focus · C6 labels/alt text · C7 loading state

- **List:** L1 loads with data · L2 empty state · L3 error state (API down) · L4 search · L5 filters · L6 pagination · L7 sort · L8 row actions · L9 permissions hide actions
- **Form:** F1 required-field errors · F2 invalid input errors · F3 save success + toast · F4 save failure message · F5 cancel/discard · F6 double-submit blocked · F7 text stays text (no script run)
- **Dashboard:** D1 all widgets load · D2 numbers match API · D3 chart labels + legend · D4 empty widgets · D5 refresh · D6 no layout shift
- **Detail:** T1 opens with valid id · T2 invalid/foreign id denied · T3 tabs switch · T4 edit + save · T5 back link
- **Settings:** S1 current values shown · S2 toggle saves · S3 reload keeps value · S4 permission gate
- **Page:** G1 content renders · G2 links work · G3 empty/error state

**Phases:** P1 sweep (all) · P2 HRMS flows · P3 Hire · P4 Grow · P5 Fluence · P6 UI quality · P7 security.


### NU-HRMS (124 screens)

| # | Route | Screen | Who can open | Type | Phases | Screen-specific tests |
|---|---|---|---|---|---|---|
| 1 | `/allocations` | Allocations | PROJECT_VIEW / PROJECT_MANAGE | List | P1,P2,P6 | — |
| 2 | `/allocations/summary` | Allocations › Summary | Signed-in user (no route rule) | List | P1,P2,P6 | — |
| 3 | `/approvals` | Approvals | Signed-in user (no route rule) | List | P1,P2,P6 | — |
| 4 | `/approvals/inbox` | Approvals | Signed-in user (no route rule) | Form | P1,P2,P6 | — |
| 5 | `/assets` | Assets | ASSET_VIEW / ASSET_CREATE / ASSET_MANAGE | List | P1,P2,P6 | — |
| 6 | `/attendance` | HR Operations | ATTENDANCE_VIEW_SELF / ATTENDANCE_VIEW_TEAM / ATTENDANCE_VIEW_ALL | Page | P1,P2,P6 | — |
| 7 | `/attendance/comp-off` | Comp-Off | ATTENDANCE_REGULARIZE / ATTENDANCE_APPROVE | List | P1,P2,P6 | — |
| 8 | `/attendance/my-attendance` | Attendance › My Attendance | ATTENDANCE_VIEW_SELF | List | P1,P2,P6 | — |
| 9 | `/attendance/regularization` | Regularization | ATTENDANCE_REGULARIZE | Form | P1,P2,P6 | 3 tabs (WFH/On Duty, Regularization, Remote Clock-in); employee sees no approver 403 in console; manager approve creates day record. |
| 10 | `/attendance/shift-swap` | Attendance › Shift Swap | ATTENDANCE_REGULARIZE / ATTENDANCE_APPROVE | Page | P1,P2,P6 | — |
| 11 | `/attendance/team` | Team Attendance | ATTENDANCE_VIEW_TEAM / ATTENDANCE_VIEW_ALL | List | P1,P2,P6 | — |
| 12 | `/benefits` | Benefits | BENEFIT_VIEW / BENEFIT_VIEW_SELF / BENEFIT_MANAGE | Form | P1,P2,P6 | — |
| 13 | `/biometric-devices` | Biometric Devices | ATTENDANCE_MANAGE / SYSTEM_ADMIN | Form | P1,P2,P6 | — |
| 14 | `/calendar` | Calendar | Signed-in user (no page-level rule) | List | P1,P2,P6 | — |
| 15 | `/calendar/[id]` | Calendar › <id> | Signed-in user (no route rule) | Detail | P1,P2,P6 | — |
| 16 | `/calendar/new` | Calendar › New | Signed-in user (no route rule) | Form | P1,P2,P6 | — |
| 17 | `/compensation` | Compensation | COMPENSATION_VIEW / COMPENSATION_VIEW_ALL | Dashboard | P1,P2,P6 | — |
| 18 | `/compliance` | Compliance | COMPLIANCE_VIEW / COMPLIANCE_MANAGE | List | P1,P2,P6 | — |
| 19 | `/contracts` | Contracts | Signed-in user (no route rule) | List | P1,P2,P6 | — |
| 20 | `/contracts/[id]` | Contracts › <id> | Signed-in user (no route rule) | Detail | P1,P2,P6 | — |
| 21 | `/contracts/new` | Contracts › New | Signed-in user (no route rule) | Form | P1,P2,P6 | — |
| 22 | `/contracts/templates` | Contracts › Templates | CONTRACT_TEMPLATE_MANAGE / SYSTEM_ADMIN | Page | P1,P2,P6 | — |
| 23 | `/dashboard` | Dashboard | DASHBOARD_VIEW(all) / ANALYTICS_VIEW(all) | Dashboard | P1,P2,P6 | KPIs match API; role-based widgets. |
| 24 | `/dashboards/employee` | Employee Dashboard | Signed-in user (no page-level rule) | Dashboard | P1,P2,P6 | — |
| 25 | `/dashboards/executive` | Executive | ANALYTICS_VIEW / SYSTEM_ADMIN | Dashboard | P1,P2,P6 | — |
| 26 | `/dashboards/manager` | Manager Dashboard | managerOnly | Dashboard | P1,P2,P6 | — |
| 27 | `/departments` | Departments | DEPARTMENT_VIEW / DEPARTMENT_MANAGE | List | P1,P2,P6 | — |
| 28 | `/documents` | Documents | DOCUMENT_VIEW / DOCUMENT_UPLOAD | Page | P1,P2,P6 | — |
| 29 | `/employees` | People | EMPLOYEE_READ / EMPLOYEE_VIEW_ALL / EMPLOYEE_VIEW_DEPARTMENT… | List | P1,P2,P6 | Search, filters, add employee (toast not covering button), export; bank/IFSC validation. |
| 30 | `/employees/[id]` | Employees › <id> | EMPLOYEE_VIEW_ALL / EMPLOYEE_VIEW_DEPARTMENT / EMPLOYEE_VIEW_TEAM | Detail | P1,P2,P6 | — |
| 31 | `/employees/[id]/compensation` | Employees › <id> › Compensation | Signed-in user (no route rule) | Detail | P1,P2,P6 | — |
| 32 | `/employees/[id]/edit` | Employees › <id> › Edit | EMPLOYEE_UPDATE | Detail | P1,P2,P6 | — |
| 33 | `/employees/change-requests` | Employees › Change Requests | hrOnly | List | P1,P2,P6 | — |
| 34 | `/employees/directory` | Team Directory | EMPLOYEE_VIEW_ALL / EMPLOYEE_VIEW_DEPARTMENT | List | P1,P2,P6 | — |
| 35 | `/employees/import` | Employees › Import | MIGRATION_IMPORT / SYSTEM_ADMIN | List | P1,P2,P6 | — |
| 36 | `/exit-interview/[token]` | Exit Interview › <token> | Public (no sign-in) | Detail | P1,P2,P6 | — |
| 37 | `/expenses` | My Expenses | EXPENSE_VIEW / EXPENSE_CREATE | Form | P1,P2,P6 | — |
| 38 | `/expenses/[id]` | Expenses › <id> | Signed-in user (no route rule) | Detail | P1,P2,P6 | — |
| 39 | `/expenses/advances` | Expenses › Advances | Signed-in user (no route rule) | List | P1,P2,P6 | — |
| 40 | `/expenses/approvals` | Approvals | EXPENSE_APPROVE / EXPENSE_MANAGE | List | P1,P2,P6 | — |
| 41 | `/expenses/mileage` | Expenses › Mileage | Signed-in user (no route rule) | List | P1,P2,P6 | — |
| 42 | `/expenses/reports` | Reports | EXPENSE_REPORT / EXPENSE_MANAGE | Dashboard | P1,P2,P6 | — |
| 43 | `/expenses/settings` | Settings | EXPENSE_SETTINGS / SYSTEM_ADMIN | Settings | P1,P2,P6 | — |
| 44 | `/helpdesk` | Helpdesk | HELPDESK_TICKET_VIEW / HELPDESK_TICKET_CREATE | Page | P1,P2,P6 | — |
| 45 | `/helpdesk/knowledge-base` | Helpdesk › Knowledge Base | Signed-in user (no page-level rule) | Form | P1,P2,P6 | — |
| 46 | `/helpdesk/sla` | SLA | HELPDESK_SLA_MANAGE / SYSTEM_ADMIN | List | P1,P2,P6 | — |
| 47 | `/helpdesk/tickets` | Tickets | HELPDESK_TICKET_VIEW / HELPDESK_TICKET_CREATE | List | P1,P2,P6 | — |
| 48 | `/helpdesk/tickets/[id]` | Helpdesk › Tickets › <id> | Signed-in user (no route rule) | Detail | P1,P2,P6 | — |
| 49 | `/holidays` | Holidays | Signed-in user (no route rule) | Form | P1,P2,P6 | — |
| 50 | `/import-export` | Import / Export | MIGRATION_IMPORT / MIGRATION_EXPORT / SYSTEM_ADMIN | List | P1,P2,P6 | — |
| 51 | `/inbox` | Inbox | Signed-in user (no route rule) | Page | P1,P2,P6 | — |
| 52 | `/leave` | Leave Management | LEAVE_VIEW_SELF / LEAVE_VIEW_TEAM / LEAVE_VIEW_ALL | Page | P1,P2,P6 | — |
| 53 | `/leave/admin` | Leave › Admin | Signed-in user (no route rule) | Page | P1,P2,P6 | — |
| 54 | `/leave/admin/carry-forward` | Carry Forward | Signed-in user (no route rule) | Page | P1,P2,P6 | — |
| 55 | `/leave/apply` | Apply Leave | LEAVE_REQUEST | Form | P1,P2,P6 | Balance check, overlap, half-day, note; manager approve/reject changes balance. |
| 56 | `/leave/approvals` | Leave Approvals | LEAVE_APPROVE / LEAVE_MANAGE | List | P1,P2,P6 | — |
| 57 | `/leave/calendar` | Leave Calendar | LEAVE_VIEW_SELF / LEAVE_VIEW_TEAM / LEAVE_VIEW_ALL | List | P1,P2,P6 | — |
| 58 | `/leave/encashment` | Encashment | Signed-in user (no route rule) | Form | P1,P2,P6 | — |
| 59 | `/leave/my-leaves` | My Leaves | LEAVE_VIEW_SELF | List | P1,P2,P6 | — |
| 60 | `/leave/team` | Team Leave | Signed-in user (no route rule) | List | P1,P2,P6 | — |
| 61 | `/letters` | Letters | SELF_SERVICE_VIEW_LETTERS / LETTER_GENERATE | List | P1,P2,P6 | — |
| 62 | `/letters/templates` | Letter Templates | Signed-in user (no route rule) | Form | P1,P2,P6 | — |
| 63 | `/loans` | Loans | LOAN_VIEW / LOAN_CREATE | List | P1,P2,P6 | — |
| 64 | `/loans/[id]` | Loans › <id> | LOAN_VIEW / LOAN_MANAGE | Detail | P1,P2,P6 | — |
| 65 | `/loans/new` | New Loan | LOAN_CREATE | Form | P1,P2,P6 | — |
| 66 | `/lwf` | Lwf | STATUTORY_VIEW / STATUTORY_MANAGE | List | P1,P2,P6 | — |
| 67 | `/me/assets` | My Assets | Signed-in user (no route rule) | Page | P1,P2,P6 | — |
| 68 | `/me/attendance` | My Attendance | Signed-in user (no page-level rule) | Page | P1,P2,P6 | — |
| 69 | `/me/dashboard` | Home | Signed-in user (no page-level rule) | Dashboard | P1,P2,P6 | Clock card, leave balance rings, holidays carousel, on-leave/remote cards, post composer, feed newest comment first. |
| 70 | `/me/documents` | My Documents | Signed-in user (no page-level rule) | Page | P1,P2,P6 | — |
| 71 | `/me/leaves` | My Leaves | Signed-in user (no page-level rule) | Page | P1,P2,P6 | — |
| 72 | `/me/payslips` | My Payslips | Signed-in user (no page-level rule) | List | P1,P2,P6 | Own payslips only; PDF opens (not 0 bytes); net/gross match run. |
| 73 | `/me/profile` | My Profile | Signed-in user (no page-level rule) | Page | P1,P2,P6 | Edit saves; script text stored as text; bank/IFSC length checks. |
| 74 | `/me/skills` | My Skills | Signed-in user (no route rule) | Form | P1,P2,P6 | — |
| 75 | `/notifications` | Notifications | Signed-in user (no route rule) | Page | P1,P2,P6 | — |
| 76 | `/offboarding` | Offboarding | EXIT_VIEW / EXIT_MANAGE | List | P1,P2,P6 | — |
| 77 | `/offboarding/[id]` | Offboarding › <id> | EXIT_VIEW / EXIT_MANAGE | Detail | P1,P2,P6 | — |
| 78 | `/offboarding/[id]/exit-interview` | Offboarding › <id> › Exit Interview | EXIT_VIEW / EXIT_MANAGE | Detail | P1,P2,P6 | — |
| 79 | `/offboarding/[id]/fnf` | Offboarding › <id> › Fnf | EXIT_MANAGE / SYSTEM_ADMIN | Detail | P1,P2,P6 | — |
| 80 | `/offboarding/dashboard` | Exit Dashboard | EXIT_VIEW / EXIT_MANAGE | Dashboard | P1,P2,P6 | — |
| 81 | `/offboarding/exit-interviews` | Exit Interviews | EXIT_VIEW / EXIT_MANAGE | List | P1,P2,P6 | — |
| 82 | `/offboarding/fnf` | F&F Settlements | EXIT_VIEW / EXIT_MANAGE | List | P1,P2,P6 | — |
| 83 | `/offboarding/settlements` | Settlement Approvals | EXIT_MANAGE / SYSTEM_ADMIN | List | P1,P2,P6 | — |
| 84 | `/overtime` | Overtime | OVERTIME_VIEW / OVERTIME_MANAGE | List | P1,P2,P6 | — |
| 85 | `/payments` | Payments | PAYMENT_VIEW / PAYMENT_PROCESS | Page | P1,P2,P6 | — |
| 86 | `/payments/config` | Payments › Config | PAYMENT_CONFIG / SYSTEM_ADMIN | Form | P1,P2,P6 | — |
| 87 | `/payroll` | Pay & Finance | PAYROLL_VIEW / PAYROLL_VIEW_SELF | List | P1,P2,P6 | Run create, approve by different admin (maker-checker), payslip PDFs, no Gross banner until totals exist. |
| 88 | `/payroll/bulk-processing` | Bulk Processing | PAYROLL_PROCESS / PAYROLL_APPROVE | Page | P1,P2,P6 | — |
| 89 | `/payroll/components` | Pay Components | PAYROLL_VIEW / PAYROLL_VIEW_ALL | List | P1,P2,P6 | — |
| 90 | `/payroll/payslips` | Payslips | PAYROLL_VIEW_SELF / PAYROLL_VIEW_ALL | List | P1,P2,P6 | — |
| 91 | `/payroll/runs` | Payroll Runs | PAYROLL_VIEW_ALL / PAYROLL_PROCESS / PAYROLL_APPROVE | Form | P1,P2,P6 | — |
| 92 | `/payroll/runs/[id]` | Payroll › Runs › <id> | Signed-in user (no route rule) | Detail | P1,P2,P6 | — |
| 93 | `/payroll/salary-structures` | Salary Structures | PAYROLL_VIEW / PAYROLL_VIEW_ALL | Form | P1,P2,P6 | — |
| 94 | `/payroll/statutory` | Statutory | STATUTORY_VIEW / STATUTORY_MANAGE | List | P1,P2,P6 | — |
| 95 | `/probation` | Probation | PROBATION_VIEW / PROBATION_MANAGE | List | P1,P2,P6 | — |
| 96 | `/projects` | Projects | PROJECT_VIEW | List | P1,P2,P6 | — |
| 97 | `/projects/[id]` | Projects › <id> | PROJECT_VIEW | Detail | P1,P2,P6 | — |
| 98 | `/projects/calendar` | Calendar | PROJECT_VIEW / PROJECT_MANAGE | List | P1,P2,P6 | — |
| 99 | `/projects/gantt` | Gantt Chart | PROJECT_VIEW / PROJECT_MANAGE | Dashboard | P1,P2,P6 | — |
| 100 | `/projects/psa` | PSA Projects | PROJECT_VIEW | Page | P1,P2,P6 | — |
| 101 | `/projects/psa/invoices` | Invoices | Signed-in user (no route rule) | Page | P1,P2,P6 | — |
| 102 | `/projects/psa/timesheets` | Timesheets | Signed-in user (no route rule) | Page | P1,P2,P6 | — |
| 103 | `/projects/resource-conflicts` | Resource Conflicts | PROJECT_VIEW / PROJECT_MANAGE | List | P1,P2,P6 | — |
| 104 | `/restricted-holidays` | Restricted Holidays | LEAVE_VIEW_SELF / LEAVE_MANAGE | List | P1,P2,P6 | — |
| 105 | `/shifts` | Shift Management | SHIFT_VIEW / SHIFT_MANAGE | List | P1,P2,P6 | — |
| 106 | `/shifts/definitions` | Definitions | SHIFT_MANAGE / SYSTEM_ADMIN | Form | P1,P2,P6 | — |
| 107 | `/shifts/my-schedule` | My Schedule | Signed-in user (no route rule) | List | P1,P2,P6 | — |
| 108 | `/shifts/patterns` | Patterns | SHIFT_MANAGE / SYSTEM_ADMIN | Form | P1,P2,P6 | — |
| 109 | `/shifts/swaps` | Shift Swap | Signed-in user (no route rule) | Page | P1,P2,P6 | — |
| 110 | `/statutory` | Statutory | STATUTORY_VIEW / STATUTORY_MANAGE | List | P1,P2,P6 | — |
| 111 | `/statutory/filings` | Statutory › Filings | Signed-in user (no route rule) | List | P1,P2,P6 | — |
| 112 | `/tasks` | Projects & Work | Signed-in user (no route rule) | Page | P1,P2,P6 | — |
| 113 | `/tax` | Tax | STATUTORY_VIEW / STATUTORY_MANAGE | List | P1,P2,P6 | — |
| 114 | `/tax/declarations` | Declarations | TDS_DECLARE / STATUTORY_VIEW | List | P1,P2,P6 | — |
| 115 | `/team-directory` | Team Directory | Signed-in user (no route rule) | List | P1,P2,P6 | — |
| 116 | `/time-tracking` | Time Tracking | TIME_TRACKING_VIEW / TIME_TRACKING_CREATE / TIME_TRACKING_APPROVE… | List | P1,P2,P6 | — |
| 117 | `/time-tracking/[id]` | Time Tracking › <id> | Signed-in user (no route rule) | Detail | P1,P2,P6 | — |
| 118 | `/time-tracking/[id]/edit` | Time Tracking › <id> › Edit | Signed-in user (no route rule) | Detail | P1,P2,P6 | — |
| 119 | `/time-tracking/new` | Time Tracking › New | Signed-in user (no route rule) | Form | P1,P2,P6 | — |
| 120 | `/timesheets` | Timesheets | TIMESHEET_SUBMIT / TIMESHEET_APPROVE | List | P1,P2,P6 | 6 tabs; Copy last week; project names (PSA); totals refresh; Past due count; Time summary chart + table. |
| 121 | `/travel` | Travel | TRAVEL_VIEW / TRAVEL_CREATE | Page | P1,P2,P6 | — |
| 122 | `/travel/[id]` | Travel › <id> | TRAVEL_VIEW / TRAVEL_MANAGE | Detail | P1,P2,P6 | — |
| 123 | `/travel/expenses` | My Expenses | TRAVEL_VIEW / TRAVEL_MANAGE | Page | P1,P2,P6 | — |
| 124 | `/travel/new` | New Travel Request | TRAVEL_CREATE | Form | P1,P2,P6 | — |

### NU-Hire (24 screens)

| # | Route | Screen | Who can open | Type | Phases | Screen-specific tests |
|---|---|---|---|---|---|---|
| 125 | `/careers` | Careers Page | Public (no sign-in) | Page | P1,P3,P6 | — |
| 126 | `/offer-portal` | Offer Portal | Public (no sign-in) | Form | P1,P3,P6 | — |
| 127 | `/onboarding` | Onboarding | EMPLOYEE_CREATE / EMPLOYEE_UPDATE / SYSTEM_ADMIN | Page | P1,P3,P6 | — |
| 128 | `/onboarding/[id]` | Onboarding › <id> | ONBOARDING_VIEW / ONBOARDING_MANAGE | Detail | P1,P3,P6 | — |
| 129 | `/onboarding/new` | New Onboarding | ONBOARDING_CREATE / ONBOARDING_MANAGE | Form | P1,P3,P6 | — |
| 130 | `/onboarding/templates` | Templates | ONBOARDING_MANAGE / SYSTEM_ADMIN | Page | P1,P3,P6 | — |
| 131 | `/onboarding/templates/[id]` | Onboarding › Templates › <id> | Signed-in user (no route rule) | Detail | P1,P3,P6 | — |
| 132 | `/onboarding/templates/new` | Onboarding › Templates › New | Signed-in user (no route rule) | Form | P1,P3,P6 | — |
| 133 | `/preboarding` | Preboarding | PREBOARDING_VIEW / SYSTEM_ADMIN | Form | P1,P3,P6 | — |
| 134 | `/preboarding/portal/[token]` | Preboarding › Portal › <token> | Public (no sign-in) | Detail | P1,P3,P6 | — |
| 135 | `/recruitment` | NU-Hire | RECRUITMENT_VIEW / RECRUITMENT_CREATE / RECRUITMENT_MANAGE; role: SUPER_ADMIN/TENANT_ADMIN/HR_ADMIN | Page | P1,P3,P6 | Job → candidate → stage move → interview → scorecard → offer; interviewer PII hidden. |
| 136 | `/recruitment/agencies` | Agencies | Signed-in user (no route rule) | Form | P1,P3,P6 | — |
| 137 | `/recruitment/agencies/[id]` | Recruitment › Agencies › <id> | Signed-in user (no route rule) | Detail | P1,P3,P6 | — |
| 138 | `/recruitment/candidates` | Candidates | CANDIDATE_VIEW / CANDIDATE_EVALUATE | List | P1,P3,P6 | — |
| 139 | `/recruitment/candidates/[id]` | Recruitment › Candidates › <id> | Signed-in user (no route rule) | Detail | P1,P3,P6 | — |
| 140 | `/recruitment/candidates/[id]/offer` | Recruitment › Candidates › <id> › Offer | Signed-in user (no route rule) | Detail | P1,P3,P6 | — |
| 141 | `/recruitment/career-page` | Career Page CMS | Signed-in user (no route rule) | List | P1,P3,P6 | — |
| 142 | `/recruitment/interviews` | Interviews | CANDIDATE_VIEW / CANDIDATE_EVALUATE | List | P1,P3,P6 | — |
| 143 | `/recruitment/job-boards` | Job Boards | RECRUITMENT_MANAGE / SYSTEM_ADMIN | Form | P1,P3,P6 | — |
| 144 | `/recruitment/jobs` | Job Openings | RECRUITMENT_VIEW / RECRUITMENT_CREATE | List | P1,P3,P6 | — |
| 145 | `/recruitment/pipeline` | Pipeline | RECRUITMENT_VIEW / RECRUITMENT_MANAGE | Dashboard | P1,P3,P6 | — |
| 146 | `/recruitment/scorecards` | Scorecards | Signed-in user (no route rule) | Page | P1,P3,P6 | — |
| 147 | `/referrals` | Referrals | REFERRAL_VIEW / REFERRAL_CREATE | List | P1,P3,P6 | — |
| 148 | `/sign/[token]` | Sign › <token> | Public (no sign-in) | Detail | P1,P3,P6 | — |

### NU-Grow (39 screens)

| # | Route | Screen | Who can open | Type | Phases | Screen-specific tests |
|---|---|---|---|---|---|---|
| 149 | `/feedback360` | Feedback360 | FEEDBACK_360_VIEW / FEEDBACK_360_SUBMIT | Page | P1,P4,P6 | — |
| 150 | `/goals` | Goals | REVIEW_VIEW / OKR_VIEW | Page | P1,P4,P6 | — |
| 151 | `/learning` | Learning | LMS_COURSE_VIEW / TRAINING_VIEW | Page | P1,P4,P6 | — |
| 152 | `/learning/certificates` | Learning › Certificates | Signed-in user (no page-level rule) | Page | P1,P4,P6 | — |
| 153 | `/learning/courses` | Learning › Courses | Signed-in user (no route rule) | Dashboard | P1,P4,P6 | — |
| 154 | `/learning/courses/[id]` | Learning › Courses › <id> | LMS_COURSE_VIEW / TRAINING_VIEW | Detail | P1,P4,P6 | — |
| 155 | `/learning/courses/[id]/play` | Learning › Courses › <id> › Play | Signed-in user (no route rule) | Detail | P1,P4,P6 | — |
| 156 | `/learning/courses/[id]/quiz/[quizId]` | Learning › Courses › <id> › Quiz › <quizId> | Signed-in user (no page-level rule) | Detail | P1,P4,P6 | — |
| 157 | `/learning/paths` | Learning › Paths | LMS_COURSE_VIEW | Page | P1,P4,P6 | — |
| 158 | `/learning/paths/[id]` | Learning › Paths › <id> | Signed-in user (no route rule) | Detail | P1,P4,P6 | — |
| 159 | `/okr` | Okr | OKR_VIEW / OKR_CREATE | Page | P1,P4,P6 | Create objective + key result, progress update. |
| 160 | `/one-on-one` | 1-on-1 Meetings | MEETING_VIEW / MEETING_CREATE | Form | P1,P4,P6 | Tabs Upcoming/All/Action Items/Agenda Templates; template fills agenda. |
| 161 | `/performance` | Performance | REVIEW_VIEW; role: SUPER_ADMIN/TENANT_ADMIN/HR_ADMIN | Page | P1,P4,P6 | Cycle, review self + manager, boundary: manager sees only own reports. |
| 162 | `/performance/360-feedback` | 360 Feedback | FEEDBACK_360_VIEW / FEEDBACK_360_SUBMIT | Dashboard | P1,P4,P6 | — |
| 163 | `/performance/9box` | 9-Box Grid | CALIBRATION_VIEW / REVIEW_APPROVE | Page | P1,P4,P6 | — |
| 164 | `/performance/calibration` | Calibration | CALIBRATION_VIEW / CALIBRATION_MANAGE | Page | P1,P4,P6 | — |
| 165 | `/performance/competency-framework` | Competency Framework | Signed-in user (no route rule) | Page | P1,P4,P6 | — |
| 166 | `/performance/competency-matrix` | Competency Matrix | Signed-in user (no route rule) | Page | P1,P4,P6 | — |
| 167 | `/performance/cycles` | Cycles | REVIEW_VIEW / REVIEW_APPROVE | Page | P1,P4,P6 | — |
| 168 | `/performance/cycles/[id]/calibration` | Performance › Cycles › <id> › Calibration | CALIBRATION_MANAGE / SYSTEM_ADMIN | Detail | P1,P4,P6 | — |
| 169 | `/performance/cycles/[id]/nine-box` | Performance › Cycles › <id> › Nine Box | CALIBRATION_VIEW / REVIEW_APPROVE | Detail | P1,P4,P6 | — |
| 170 | `/performance/feedback` | Feedback | REVIEW_VIEW / FEEDBACK_360_VIEW | Page | P1,P4,P6 | — |
| 171 | `/performance/goals` | Goals | GOAL_CREATE / GOAL_APPROVE | Page | P1,P4,P6 | — |
| 172 | `/performance/okr` | OKR | OKR_VIEW / OKR_CREATE | Page | P1,P4,P6 | — |
| 173 | `/performance/okrs` | OKRs | Signed-in user (no route rule) | Page | P1,P4,P6 | — |
| 174 | `/performance/pip` | PIP | PIP_VIEW / PIP_CREATE / PIP_MANAGE | Page | P1,P4,P6 | — |
| 175 | `/performance/reviews` | Reviews | REVIEW_VIEW / REVIEW_CREATE | Page | P1,P4,P6 | — |
| 176 | `/performance/revolution` | Revolution | REVIEW_VIEW / SYSTEM_ADMIN | Page | P1,P4,P6 | — |
| 177 | `/surveys` | Surveys | SURVEY_VIEW / SURVEY_SUBMIT | Dashboard | P1,P4,P6 | — |
| 178 | `/surveys/[id]` | Surveys › <id> | Signed-in user (no route rule) | Detail | P1,P4,P6 | — |
| 179 | `/surveys/[id]/analytics` | Surveys › <id> › Analytics | Signed-in user (no route rule) | Detail | P1,P4,P6 | — |
| 180 | `/surveys/[id]/respond` | Surveys › <id> › Respond | Signed-in user (no route rule) | Detail | P1,P4,P6 | — |
| 181 | `/surveys/pulse` | Pulse Surveys | Signed-in user (no route rule) | Page | P1,P4,P6 | — |
| 182 | `/training` | Training | TRAINING_VIEW | Form | P1,P4,P6 | — |
| 183 | `/training/catalog` | Catalog | Signed-in user (no route rule) | Page | P1,P4,P6 | — |
| 184 | `/training/catalog/[id]` | Training › Catalog › <id> | Signed-in user (no route rule) | Detail | P1,P4,P6 | — |
| 185 | `/training/my-learning` | My Learning | Signed-in user (no route rule) | List | P1,P4,P6 | — |
| 186 | `/wellness` | Wellness | WELLNESS_VIEW / WELLNESS_CREATE / WELLNESS_MANAGE | Form | P1,P4,P6 | — |
| 187 | `/wellness/admin` | Admin | Signed-in user (no route rule) | Form | P1,P4,P6 | — |

### NU-Fluence (29 screens)

| # | Route | Screen | Who can open | Type | Phases | Screen-specific tests |
|---|---|---|---|---|---|---|
| 188 | `/announcements` | Announcements | ANNOUNCEMENT_VIEW / ANNOUNCEMENT_CREATE | Form | P1,P5,P6 | — |
| 189 | `/company-spotlight` | Company Spotlight | Signed-in user (no route rule) | Form | P1,P5,P6 | — |
| 190 | `/fluence` | Fluence | Signed-in user (no route rule) | Page | P1,P5,P6 | Wiki create (slug), edit lock, draft/private hidden from others. |
| 191 | `/fluence/ai-chat` | AI Chat | Signed-in user (no route rule) | Page | P1,P5,P6 | — |
| 192 | `/fluence/analytics` | Analytics | Signed-in user (no route rule) | Dashboard | P1,P5,P6 | — |
| 193 | `/fluence/articles` | Fluence › Articles | Signed-in user (no route rule) | Page | P1,P5,P6 | — |
| 194 | `/fluence/blogs` | Articles | Signed-in user (no route rule) | List | P1,P5,P6 | — |
| 195 | `/fluence/blogs/[slug]` | Fluence › Blogs › <slug> | Signed-in user (no route rule) | Detail | P1,P5,P6 | — |
| 196 | `/fluence/blogs/[slug]/edit` | Fluence › Blogs › <slug> › Edit | Signed-in user (no route rule) | Detail | P1,P5,P6 | — |
| 197 | `/fluence/blogs/new` | Fluence › Blogs › New | Signed-in user (no route rule) | Form | P1,P5,P6 | — |
| 198 | `/fluence/chat` | Fluence › Chat | Signed-in user (no route rule) | Page | P1,P5,P6 | — |
| 199 | `/fluence/dashboard` | Fluence › Dashboard | Signed-in user (no route rule) | Dashboard | P1,P5,P6 | — |
| 200 | `/fluence/drive` | Drive | Signed-in user (no route rule) | Page | P1,P5,P6 | — |
| 201 | `/fluence/my-content` | My Content | Signed-in user (no route rule) | List | P1,P5,P6 | — |
| 202 | `/fluence/search` | Search | Signed-in user (no route rule) | Page | P1,P5,P6 | — |
| 203 | `/fluence/templates` | Templates | Signed-in user (no route rule) | Page | P1,P5,P6 | — |
| 204 | `/fluence/templates/[id]` | Fluence › Templates › <id> | Signed-in user (no route rule) | Detail | P1,P5,P6 | — |
| 205 | `/fluence/templates/new` | Fluence › Templates › New | Signed-in user (no route rule) | Form | P1,P5,P6 | — |
| 206 | `/fluence/wall` | NU-Fluence | Signed-in user (no route rule) | List | P1,P5,P6 | — |
| 207 | `/fluence/wiki` | Wiki | Signed-in user (no route rule) | Page | P1,P5,P6 | — |
| 208 | `/fluence/wiki/[slug]` | Fluence › Wiki › <slug> | Signed-in user (no route rule) | Detail | P1,P5,P6 | — |
| 209 | `/fluence/wiki/[slug]/edit` | Fluence › Wiki › <slug> › Edit | Signed-in user (no route rule) | Detail | P1,P5,P6 | — |
| 210 | `/fluence/wiki/new` | Fluence › Wiki › New | Signed-in user (no route rule) | Form | P1,P5,P6 | — |
| 211 | `/knowledge` | Knowledge | Signed-in user (no route rule) | Page | P1,P5,P6 | — |
| 212 | `/linkedin-posts` | LinkedIn Posts | Signed-in user (no route rule) | Form | P1,P5,P6 | — |
| 213 | `/nu-calendar` | Calendar | CALENDAR_VIEW / CALENDAR_MANAGE | List | P1,P5,P6 | — |
| 214 | `/nu-drive` | NU-Drive | DOCUMENT_VIEW / DOCUMENT_UPLOAD | Page | P1,P5,P6 | — |
| 215 | `/nu-mail` | NU-Mail | EMAIL_VIEW / EMAIL_SEND | Page | P1,P5,P6 | — |
| 216 | `/recognition` | Recognition | RECOGNITION_VIEW / RECOGNITION_CREATE | Form | P1,P5,P6 | — |

### Admin & platform (56 screens)

| # | Route | Screen | Who can open | Type | Phases | Screen-specific tests |
|---|---|---|---|---|---|---|
| 217 | `/admin` | Admin | adminOnly | List | P1,P2,P6,P7 | — |
| 218 | `/admin/audit` | Audit Logs | AUDIT_VIEW / SYSTEM_ADMIN | List | P1,P2,P6,P7 | Events appear after actions; filters; export. |
| 219 | `/admin/benefit-plans` | Benefit Plans | SYSTEM_ADMIN / BENEFIT_MANAGE | List | P1,P2,P6,P7 | — |
| 220 | `/admin/budget` | Budget Planning | BUDGET_VIEW / BUDGET_MANAGE / SYSTEM_ADMIN | Dashboard | P1,P2,P6,P7 | — |
| 221 | `/admin/custom-fields` | Custom Fields | SYSTEM_ADMIN / CUSTOM_FIELD_MANAGE | Settings | P1,P2,P6,P7 | — |
| 222 | `/admin/departments` | Admin › Departments | DEPARTMENT_MANAGE / SYSTEM_ADMIN | Settings | P1,P2,P6,P7 | — |
| 223 | `/admin/employees` | Admin › Employees | EMPLOYEE_CREATE / EMPLOYEE_UPDATE / EMPLOYEE_VIEW_ALL | Settings | P1,P2,P6,P7 | — |
| 224 | `/admin/feature-flags` | Admin › Feature Flags | SYSTEM_ADMIN | Settings | P1,P2,P6,P7 | — |
| 225 | `/admin/holidays` | Organization Setup | SYSTEM_ADMIN / LEAVE_MANAGE | Form | P1,P2,P6,P7 | — |
| 226 | `/admin/implicit-roles` | Admin › Implicit Roles | SYSTEM_ADMIN | Settings | P1,P2,P6,P7 | — |
| 227 | `/admin/import-keka` | Admin › Import Keka | MIGRATION_IMPORT / SYSTEM_ADMIN | List | P1,P2,P6,P7 | — |
| 228 | `/admin/integrations` | Integrations | SYSTEM_ADMIN | Page | P1,P2,P6,P7 | — |
| 229 | `/admin/integrations/webhooks` | Webhooks | adminOnly | Settings | P1,P2,P6,P7 | — |
| 230 | `/admin/leave-requests` | Leave Requests | SYSTEM_ADMIN / LEAVE_MANAGE / LEAVE_APPROVE | Settings | P1,P2,P6,P7 | — |
| 231 | `/admin/leave-types` | Leave Setup | SYSTEM_ADMIN / LEAVE_MANAGE / LEAVE_TYPE_MANAGE | Settings | P1,P2,P6,P7 | — |
| 232 | `/admin/office-locations` | Office Locations | SYSTEM_ADMIN / OFFICE_LOCATION_CREATE | List | P1,P2,P6,P7 | — |
| 233 | `/admin/org-hierarchy` | Org Chart | SYSTEM_ADMIN / DEPARTMENT_MANAGE | Settings | P1,P2,P6,P7 | — |
| 234 | `/admin/payroll` | Admin › Payroll | PAYROLL_VIEW / PAYROLL_VIEW_ALL / PAYROLL_PROCESS… | Page | P1,P2,P6,P7 | — |
| 235 | `/admin/permissions` | Permissions | PERMISSION_MANAGE / SYSTEM_ADMIN | Settings | P1,P2,P6,P7 | — |
| 236 | `/admin/profile` | Admin › Profile | hrOnly | Page | P1,P2,P6,P7 | — |
| 237 | `/admin/reports` | Admin › Reports | REPORT_VIEW / ANALYTICS_VIEW / SYSTEM_ADMIN | Dashboard | P1,P2,P6,P7 | — |
| 238 | `/admin/roles` | Roles & Access | ROLE_MANAGE / SYSTEM_ADMIN | Settings | P1,P2,P6,P7 | Role update saves, permission matrix, cache refresh. |
| 239 | `/admin/settings` | Admin › Settings | SETTINGS_UPDATE / SYSTEM_ADMIN | Settings | P1,P2,P6,P7 | — |
| 240 | `/admin/shifts` | Admin › Shifts | SYSTEM_ADMIN / SHIFT_MANAGE | Settings | P1,P2,P6,P7 | — |
| 241 | `/admin/system` | System Settings | SYSTEM_ADMIN | Dashboard | P1,P2,P6,P7 | — |
| 242 | `/admin/users` | Admin › Users | USER_MANAGE / SYSTEM_ADMIN | Page | P1,P2,P6,P7 | — |
| 243 | `/analytics` | Analytics | ANALYTICS_VIEW | Dashboard | P1,P2,P6,P7 | — |
| 244 | `/analytics/org-health` | Org Health | ANALYTICS_VIEW / SYSTEM_ADMIN | Dashboard | P1,P2,P6,P7 | — |
| 245 | `/app/fluence` | App › Fluence | Signed-in user (no route rule) | Page | P1,P2,P6,P7 | — |
| 246 | `/app/grow` | App › Grow | Signed-in user (no route rule) | Page | P1,P2,P6,P7 | — |
| 247 | `/app/hire` | App › Hire | Signed-in user (no route rule) | Page | P1,P2,P6,P7 | — |
| 248 | `/app/hrms` | App › Hrms | Signed-in user (no route rule) | Page | P1,P2,P6,P7 | — |
| 249 | `/executive` | Executive | ANALYTICS_VIEW / SYSTEM_ADMIN | Dashboard | P1,P2,P6,P7 | — |
| 250 | `/integrations` | Integrations | Signed-in user (no route rule) | Page | P1,P2,P6,P7 | — |
| 251 | `/integrations/slack` | Integrations › Slack | Signed-in user (no route rule) | Form | P1,P2,P6,P7 | — |
| 252 | `/predictive-analytics` | Predictive Analytics | PREDICTIVE_ANALYTICS_VIEW / PREDICTIVE_ANALYTICS_MANAGE | Dashboard | P1,P2,P6,P7 | — |
| 253 | `/reports` | Reports & Insights | REPORT_VIEW / REPORT_CREATE | List | P1,P2,P6,P7 | — |
| 254 | `/reports/attrition` | Attrition | REPORT_VIEW / ANALYTICS_VIEW | Dashboard | P1,P2,P6,P7 | — |
| 255 | `/reports/builder` | Report Builder | REPORT_CREATE / SYSTEM_ADMIN | List | P1,P2,P6,P7 | — |
| 256 | `/reports/headcount` | Headcount | REPORT_VIEW / HEADCOUNT_VIEW | Dashboard | P1,P2,P6,P7 | — |
| 257 | `/reports/leave` | Leave | REPORT_VIEW / LEAVE_VIEW_ALL | Dashboard | P1,P2,P6,P7 | — |
| 258 | `/reports/payroll` | Payroll | REPORT_VIEW / PAYROLL_VIEW_ALL | Dashboard | P1,P2,P6,P7 | — |
| 259 | `/reports/performance` | Performance | REPORT_VIEW / REVIEW_VIEW | Dashboard | P1,P2,P6,P7 | — |
| 260 | `/reports/scheduled` | Scheduled Reports | REPORT_CREATE / SYSTEM_ADMIN | Form | P1,P2,P6,P7 | — |
| 261 | `/reports/utilization` | Utilization | REPORT_VIEW / PROJECT_VIEW | List | P1,P2,P6,P7 | — |
| 262 | `/security` | Security | Signed-in user (no route rule) | Page | P1,P2,P6,P7 | — |
| 263 | `/settings` | Settings | Signed-in user (no page-level rule) | Settings | P1,P2,P6,P7 | — |
| 264 | `/settings/notifications` | Notifications | Signed-in user (no route rule) | Settings | P1,P2,P6,P7 | — |
| 265 | `/settings/privacy` | Privacy & Data | Signed-in user (no route rule) | Settings | P1,P2,P6,P7 | — |
| 266 | `/settings/profile` | Profile | Signed-in user (no route rule) | Settings | P1,P2,P6,P7 | — |
| 267 | `/settings/rbac` | Settings › Rbac | Signed-in user (no route rule) | Settings | P1,P2,P6,P7 | — |
| 268 | `/settings/security` | Security | Signed-in user (no route rule) | Form | P1,P2,P6,P7 | — |
| 269 | `/settings/security/api-keys` | API Keys | SYSTEM_ADMIN | Settings | P1,P2,P6,P7 | — |
| 270 | `/settings/sso` | Settings › Sso | Signed-in user (no route rule) | Settings | P1,P2,P6,P7 | — |
| 271 | `/workflows` | Workflows | WORKFLOW_DEFINITION_VIEW / WORKFLOW_MANAGE | List | P1,P2,P6,P7 | — |
| 272 | `/workflows/[id]` | Workflows › <id> | Signed-in user (no route rule) | Detail | P1,P2,P6,P7 | — |

### Public & auth (18 screens)

| # | Route | Screen | Who can open | Type | Phases | Screen-specific tests |
|---|---|---|---|---|---|---|
| 273 | `/` | Home / landing | Landing (redirects by session; not in edge public list) | Page | P1,P6,P7 | — |
| 274 | `/about` | About | Signed-in user (no route rule) | Page | P1,P6,P7 | — |
| 275 | `/auth/change-password` | Auth › Change Password | Signed-in user (no route rule) | Form | P1,P6,P7 | — |
| 276 | `/auth/forgot-password` | Auth › Forgot Password | Public (no sign-in) | Form | P1,P6,P7 | — |
| 277 | `/auth/login` | Auth › Login | Public (no sign-in) | Form | P1,P6,P7 | Wrong password message, lockout after 5, demo panel only when demo mode, forgot password link. |
| 278 | `/auth/logout` | Auth › Logout | Signed-in user (no route rule) | Page | P1,P6,P7 | — |
| 279 | `/contact` | Contact | Signed-in user (no route rule) | Form | P1,P6,P7 | — |
| 280 | `/features` | Features | Signed-in user (no route rule) | Page | P1,P6,P7 | — |
| 281 | `/pricing` | Pricing | Signed-in user (no route rule) | Page | P1,P6,P7 | — |
| 282 | `/privacy` | Privacy | Public (no sign-in) | Page | P1,P6,P7 | — |
| 283 | `/reset-password` | Reset Password | Public (no sign-in) | Form | P1,P6,P7 | — |
| 284 | `/resources` | Resources | PROJECT_VIEW / PROJECT_MANAGE | Page | P1,P6,P7 | — |
| 285 | `/resources/approvals` | Resources › Approvals | PROJECT_MANAGE / SYSTEM_ADMIN | List | P1,P6,P7 | — |
| 286 | `/resources/availability` | Availability | PROJECT_VIEW / PROJECT_MANAGE | Page | P1,P6,P7 | — |
| 287 | `/resources/capacity` | Capacity | PROJECT_MANAGE / SYSTEM_ADMIN | Page | P1,P6,P7 | — |
| 288 | `/resources/pool` | Resource Pool | PROJECT_VIEW / PROJECT_MANAGE | List | P1,P6,P7 | — |
| 289 | `/resources/workload` | Workload | PROJECT_VIEW / PROJECT_MANAGE | Page | P1,P6,P7 | — |
| 290 | `/terms` | Terms | Public (no sign-in) | Page | P1,P6,P7 | — |
