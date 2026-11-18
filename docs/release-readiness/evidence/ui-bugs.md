# UI bugs - phases P0 to P2

Found by the scripts in `scripts/e2e/` (`p0-env-check.mjs`, `p1-route-sweep.mjs`, `p1-verify.mjs`, `p2-hrms-flows.mjs`).
Every entry below was reproduced at least twice unless the frequency says otherwise. Environment for all entries:

- Commit `c0e2db9a` (main), local stack FE `http://localhost:3000` (Next dev) + BE `http://localhost:8080` (profile `dev`), tenant `660e8400-e29b-41d4-a716-446655440001` (demo tenant).
- Browser: Chromium 148.0.7778.96 via Playwright 1.60.0, headless. Viewports 1440x900 (desktop) and 390x844 (mobile); a bug seen at both is marked "both".
- Roles: EMP = `arun@nulogic.io` (EMPLOYEE), MGR = `sumit@nulogic.io` (MANAGER, REPORTING_MANAGER, SKIP_LEVEL_MANAGER), HR = `admin@nulogic.io` (HR_ADMIN).
- Runs: P0 `NUAURA_TEST_P0_*`, P1 `NUAURA_TEST_P1_*` (see `p1-route-sweep.md` header), P2 `NUAURA_TEST_P2_918785`, `_346814`, `_752944`, `_037131` (test data created by each run carries its run id; created ids are in `p2-hrms-flows.json` → `created`).
- Screenshots: `screenshots/ui-p2-<step>.png` (last P2 run), `screenshots/ui-p1-<role>-<route>.png` (P1 verify / sweep).

Severity follows plan 17 A2: Critical / High / Medium / Low.

## Summary

| ID | Sev | Phase | Title |
|---|---|---|---|
| UI-001 | High | P2 | Attendance Requests: "New request" (WFH) modal crashes the page when typing a reason |
| UI-002 | High | P2 | Timesheets: no PSA projects, so time entries cannot be added; existing entries show "Unknown Project"; Copy last week fails |
| UI-003 | High | P2 | Announcements: HR sees "New Announcement" but the API rejects the create with 403 (needs SYSTEM:ADMIN) |
| UI-004 | High | P1 | `/me/documents` sends a signed-in user to the login page |
| UI-005 | High | P1 | `/calendar` crashes: `events.forEach is not a function` |
| UI-006 | High | P1 | Screens call API endpoints that do not exist (404): benefits, job boards, resource workload |
| UI-007 | High/Medium | P1 | Permitted screens whose data calls return 403 for the role (menu shows the screen, API denies it) |
| UI-008 | Medium | P2 | Timesheets: the week-view "Add Entry" button does nothing |
| UI-009 | Medium | P2 | Timesheets: after "Submit for Approval" the week badge stays "Draft" until reload |
| UI-010 | Medium | P2 | Activity Wall: a new comment is not shown in the thread until the page is reloaded |
| UI-011 | Low | P2 | Edit employee: HR gets 403 on custom-field definitions (console errors on every edit page) |
| UI-012 | Low | P1 | Screens without a page heading |
| UI-013 | Low | P1 | Signed-in user opening `/` or `/auth/login` is shown the login form instead of being sent to the dashboard |

Observations that are **not** logged as defects (frequency 1 or needs a product decision) are at the end, followed by the noise list.

---

## UI-001 - WFH request modal crashes when typing the reason

- **Phase/route/role:** P2 step 4 · `/attendance/regularization` · EMP (also reproduced by the probe as EMP 3 more times) · both viewports.
- **Prerequisites:** signed in as EMP; tab "Work From Home / On Duty".
- **Steps:** 1. Click "New request". 2. Fill From = To = a future date (e.g. `2027-04-13`). 3. Type any text in "Reason".
- **Expected:** reason is accepted, "Submit" creates the request, it appears under "My Requests" as pending.
- **Actual:** on the first keystroke in Reason the page falls into the error boundary: "Something went wrong - This page ran into an unexpected problem" with console `TypeError: Cannot read properties of null (reading 'value')` (chunk `_15cd-…`, inside a React state reducer). Dates alone do not crash; the Reason field does. No request is created.
- **Severity:** High - an employee cannot raise a WFH/On-duty request from the UI (the API `POST /api/v1/attendance/work-requests` works: the script used it as a fallback, 201).
- **Frequency:** 4/4 (P2 runs 918785, 752944, 037131 + stepwise probe).
- **Evidence:** `screenshots/ui-p2-E4.png`; `p2-hrms-flows.json` → E4 console. Code pointer: `frontend/app/attendance/regularization/_components/CreateRequestModal.tsx` (Reason field, `reasonValue.length` counter at line ~139) rendered from `WorkRequestsPanel.tsx`.

## UI-002 - Timesheets unusable: no PSA projects, "Unknown Project", Copy last week fails

- **Phase/route/role:** P2 step 5 · `/timesheets` · EMP · both.
- **Prerequisites:** EMP has seeded timesheets (weeks of Nov 1/8/15, 40h each, status Draft).
- **Steps:** 1. Open `/timesheets`. 2. Click "View" on the current week → "Add Entry". 3. Open the "Project" dropdown. 4. Go to the next week, "Create Timesheet", then "Copy last week".
- **Expected:** project names shown in the week grid; the dropdown lists the projects the employee can book time to; copy creates the entries in the new week and totals refresh.
- **Actual:** (a) every row in the week grid and in the detail modal reads "Unknown Project" (the seeded entries reference project id `f103026c-84ed-41d1-ad24-98d0bc063752`, which does not exist); (b) the "Project *" dropdown contains only "Select a project", so "Add Entry" stays disabled - no time entry can be added; (c) "Copy last week" fails with `400 Validation Error: Project not found: f103026c-…` on `POST /api/v1/psa/timesheets/{id}/entries`, toast "Copy failed - 0 of 10 entries copied before the error". DB: `psa_projects` has 0 rows in the tenant while the PM table `projects` has 5; the page reads `usePsaProjects()` (`frontend/app/timesheets/page.tsx:84`).
- **Severity:** High - the whole "log time" flow is broken for the demo tenant (seed/data gap plus no UI guard: a dangling project id renders as "Unknown Project" and breaks copy instead of being reported).
- **Frequency:** 3/3 (runs 346814, 752944, 037131; dropdown checked in the E5b probe).
- **Evidence:** `screenshots/ui-p2-E5b.png`, `screenshots/ui-p2-E5c.png` (run 346814); `p2-hrms-flows.json` E5b/E5c details; SQL `select count(*) from psa_projects` = 0.

## UI-003 - HR cannot create an announcement (403 SYSTEM:ADMIN)

- **Phase/route/role:** P2 step 11 · `/announcements` · HR · both.
- **Steps:** 1. Click "New Announcement". 2. Fill Title/Content, keep defaults. 3. Click "Publish".
- **Expected:** announcement created and listed (the button is shown to HR because `PermissionGate permission=ANNOUNCEMENT_MANAGE` passes, `frontend/app/announcements/page.tsx:264`).
- **Actual:** `POST /api/v1/announcements` → 403 `Insufficient permissions. Required any of: [SYSTEM:ADMIN]` (`backend/.../announcement/controller/AnnouncementController.java:34` requires `SYSTEM_ADMIN` for create/update while the FE gate is `ANNOUNCEMENT:MANAGE`). The modal stays open; the only feedback is the Next dev "Issues" badge.
- **Severity:** High - an HR admin cannot publish announcements; FE and BE permission for the same action disagree.
- **Frequency:** 4/4 P2 runs.
- **Evidence:** `screenshots/ui-p2-H4.png`; `p2-hrms-flows.json` H4.

## UI-004 - `/me/documents` logs a signed-in user out to the login page

- **Phase/route/role:** P1 · `/me/documents` · EMP, MGR, HR · both.
- **Steps:** signed in, open `/me/documents` (sidebar "My Documents").
- **Expected:** the My Documents screen.
- **Actual:** immediate client redirect to `/auth/login` (login form shown; other tabs keep working, so the session itself is not revoked). `frontend/app/me/documents/page.tsx:37-40` redirects when `hasHydrated && !user`; on this page `user` is null at hydration time although every other `/me/*` page renders for the same session.
- **Severity:** High - the screen is unreachable for every role and looks like a forced logout.
- **Frequency:** 3 roles x 2 viewports in the sweep, plus `p1-verify.mjs` (3 roles).
- **Evidence:** `screenshots/ui-p1-employee-_me_documents.png`, `screenshots/ui-p1-hradmin-_me_documents.png`; `p1-route-sweep.json` (verdict FAIL-session-lost), `p1-verify.json`.

## UI-005 - `/calendar` crashes with `events.forEach is not a function`

- **Phase/route/role:** P1 · `/calendar` · HR (route allowed for every signed-in role) · both.
- **Steps:** open `/calendar`.
- **Expected:** month view with the user's events.
- **Actual:** error boundary "Something went wrong"; console `TypeError: events.forEach is not a function at groupEventsByDate` (`frontend/app/calendar/page.tsx:120-122`; `useMyCalendarEventsByDateRange` at line 44 does not return a plain array for this response).
- **Severity:** High - screen unusable.
- **Frequency:** 2/2 (sweep + verify), both viewports.
- **Evidence:** `screenshots/ui-p1-hradmin-_calendar.png`; `p1-verify.json`.

## UI-006 - Screens call endpoints that do not exist (404)

- **Phase/route/role:** P1 · HR (and EMP for `/benefits`) · both.
- **Steps / actual (each reproduced twice, sweep + verify):**

| Route | Request | Backend | What the user sees |
|---|---|---|---|
| `/admin/benefit-plans` | `GET /api/v1/benefits/plans?page=0&size=100` → 404 | no `/api/v1/benefits` controller (only `/api/v1/benefits-enhanced`) | red "Request failed with status code 404" |
| `/benefits` (HR, EMP) | `GET /api/v1/benefits/plans/active` → 404; `GET /api/v1/benefits-enhanced/flex/allocations/employee/{id}/active` → 404; EMP also `GET /api/v1/benefits-enhanced/dashboard` → 403 | as above | empty state "No benefit plans available" - indistinguishable from a real empty tenant |
| `/recruitment/job-boards` | `GET /api/v1/recruitment/jobs?status=OPEN` → 404 (`frontend/app/recruitment/job-boards/page.tsx:105`) | backend exposes `/api/v1/recruitment/job-boards` and job openings under another path | "Failed Postings / FAILED" counters |
| `/resources/workload` | `GET /api/v1/resource-management/allocation-requests/employee/?page=0&size=20` → 404 (empty employee id in the URL, `lib/generated/api/resource-management/resource-management.ts:2256`) then redirect to dashboard "Access Denied" | - | denied page after a failed call |

- **Expected:** the screens load their data or show a real error; no request to a path the backend does not serve.
- **Severity:** High for `/admin/benefit-plans` and `/recruitment/job-boards` (screen cannot work), Medium for `/benefits` and `/resources/workload`.
- **Frequency:** 2/2 each.
- **Evidence:** `screenshots/ui-p1-hradmin-_admin_benefit-plans.png`, `…-_benefits.png`, `…-_recruitment_job-boards.png`, `…-_resources_workload.png`; `p1-verify.json`.

## UI-007 - Screens the role may open whose data calls return 403

Grouped because the symptom is the same (sidebar/route gate lets the role in, the API denies the page's main query, the screen shows an empty state or a raw "Request failed with status code 403"). Each row needs its own triage: either the route/menu gate is too wide, or the backend permission catalogue is missing the role. Reproduced 2/2 (sweep + verify) unless noted.

| Route | Role(s) | Denied request | Shown as |
|---|---|---|---|
| `/letters`, `/letters/templates` | HR (sidebar "Letters"); EMP also allowed by routes.ts | `GET /api/v1/letters`, `/letters/templates/active`, `/letters/templates`, `/letters/placeholders` → 403; EMP's page also calls `GET /api/v1/recruitment/candidates?size=100` → 403 | "Request failed with status code 403" |
| `/fluence/drive` | EMP, MGR, HR (sidebar "Drive") | `GET /api/v1/fluence/attachments/recent` → 403 | "No files" (false empty state) |
| `/tasks` | EMP, MGR, HR (sidebar "Tasks") | `GET /api/v1/pm/tasks/assignee/{ownEmployeeId}` → 403 | "No tasks assigned to you" (false empty state) |
| `/helpdesk` | EMP, HR (sidebar "Helpdesk"; MGR is redirected instead) | `GET /api/v1/helpdesk/sla/dashboard` → 403 (twice) | blank widgets |
| `/travel` | EMP, MGR (sidebar "Travel") | `GET /api/v1/travel/requests?page=0&size=10` → 403 `Required any of: [TRAVEL:VIEW_ALL]` - own requests need VIEW_ALL | red error text |
| `/fluence/analytics`, `/fluence/dashboard` | EMP, MGR (sidebar) | `GET /api/v1/knowledge/templates?…` → 403 | "No content yet" |
| `/performance/competency-matrix`, `/performance/revolution` | EMP, MGR (sidebar) | `GET /api/v1/lms/employees/{ownId}/skill-gaps` → 403 (3x per load) | empty |
| `/departments` | EMP (sidebar "Departments") | `GET /api/v1/employees?page=0&size=500` → 403 | list without members |
| `/reports/attrition` | HR | `GET /api/v1/predictive-analytics/attrition/high-risk?minScore=50` → 403 | "Failed to load attrition predictions…" |
| `/settings/sso` | HR | `GET /api/v1/auth/saml/config` → 403, then redirect to `/settings` | - |
| `/admin/roles`, `/settings/rbac` | HR | `GET /api/v1/permissions?pageable[size]=500` → 403, then redirect to dashboard | "Access Denied" (route allowed, page gate denies: consistent with `hasAdminConsoleAccess`, listed for completeness) |

- **Expected:** a screen offered in the menu loads its data for that role, or the menu/route hides it and the role is redirected before any protected call.
- **Severity:** High where the screen is in the role's sidebar and shows a false empty state (`/fluence/drive`, `/tasks`, `/travel`, `/letters` for HR); Medium for the rest.
- **Evidence:** `screenshots/ui-p1-<role>-<route>.png` for each row; `p1-verify.json`, `p1-route-sweep.json` (class `authz`).

## UI-008 - Week-view "Add Entry" button does nothing

- **Phase/route/role:** P2 step 5 · `/timesheets` · EMP · both.
- **Steps:** on a Draft week, click the "Add Entry" button next to "Copy last week" (not the one inside the "View" modal).
- **Expected:** "Add Time Entry" modal opens.
- **Actual:** nothing happens. `handleAddEntry` (`frontend/app/timesheets/page.tsx:219-220`) returns early unless `selectedTimesheet` is set, and that state is only set by `handleViewTimesheet` (line 196). The modal does open from "View" → "Add Entry".
- **Severity:** Medium (workaround: View → Add Entry), but the primary CTA is dead.
- **Frequency:** 4/4 P2 runs.
- **Evidence:** `screenshots/ui-p2-E5a.png`.

## UI-009 - Week badge stays "Draft" after submitting a timesheet

- **Phase/route/role:** P2 step 5 · `/timesheets` · EMP · desktop.
- **Steps:** 1. Navigate to a future week, "Create Timesheet" → Create. 2. "View" → "Submit for Approval".
- **Expected:** toast "Timesheet Submitted" and the week badge (next to "View") changes to Submitted; history list updates.
- **Actual:** toast appears and `POST /api/v1/psa/timesheets/{id}/submit` → 200, the history card shows "Submitted", but the week-view badge still reads "Draft" (and "Copy last week"/"Add Entry" stay available) until the page is reloaded; after reload it reads "Submitted". `handleSubmitTimesheet` (`page.tsx:201-214`) closes the modal without refetching the current-week query.
- **Severity:** Medium - stale state can lead to a second submit attempt.
- **Frequency:** 2/2 (run 346814 week of Nov 22; probe on week of Nov 29).
- **Evidence:** `p2-hrms-flows.json` run 346814 E5d detail; probe output recorded in the final report.

## UI-010 - New wall comment not shown until reload

- **Phase/route/role:** P2 step 6 · `/fluence/wall` · EMP · both.
- **Steps:** 1. Post "NUAURA_TEST_<run> wall post". 2. Toggle comments on that post. 3. Type a comment, click "Post comment" (or Ctrl+Enter). 4. Repeat.
- **Expected:** the comment appears at once, newest on top.
- **Actual:** `POST …/comments` → 2xx, the input clears, but the thread keeps "No comments yet - Be the first to share your thoughts" and the comment counter stays "0". After reload the thread shows both comments, newest first (order is correct). `handleAddComment` (`frontend/app/fluence/wall/page.tsx:326-331`) calls the mutation without updating or invalidating the comments query.
- **Severity:** Medium - looks like the comment was lost; duplicates likely.
- **Frequency:** 4/4 P2 runs (3 s wait before the check, then verified after reload).
- **Evidence:** `screenshots/ui-p2-E6.png`.

## UI-011 - Edit employee: 403 on custom-field definitions for HR

- **Phase/route/role:** P2 step 10 · `/employees/{id}/edit` · HR · both.
- **Steps:** open any employee → "Edit".
- **Expected:** the edit form loads without errors; custom fields either load or are hidden for roles without `CUSTOM_FIELD:VIEW`.
- **Actual:** `GET /api/v1/custom-fields/definitions/entity-type/EMPLOYEE` → 403 four times per page load; console "Failed to load custom fields: AxiosError…". The form itself saves (PUT 200).
- **Severity:** Low (no functional loss for the standard fields; noisy and HR_ADMIN should probably hold `CUSTOM_FIELD:VIEW`).
- **Frequency:** 4/4.
- **Evidence:** `p2-hrms-flows.json` H3 console.

## UI-012 - Screens without a page heading

- **Phase/role:** P1 · HR (EMP/MGR for `/projects/psa`) · both.
- **Routes:** `/auth/forgot-password`, `/company-spotlight`, `/fluence/templates/new`, `/fluence/wiki/new`, `/reports/utilization`, `/projects/psa` (EMP/MGR view only; HR's view has an h1).
- **Expected:** every screen has an h1 (or role=heading) naming the screen (plan P1 check 7, a11y).
- **Actual:** no `h1`/`h2`/`[role=heading]` in the document after settle.
- **Severity:** Low.
- **Frequency:** 2/2.
- **Evidence:** `p1-verify.json` (`headings: 0`).

## UI-013 - Signed-in user sees the login form on `/` and `/auth/login`

- **Phase/route/role:** P1 · `/`, `/auth/login` · HR (and EMP for `/auth/login`) · both.
- **Expected:** an authenticated user is sent to their dashboard.
- **Actual:** `/` redirects to `/auth/login` and the login form renders with the demo panel although the session is valid (the dashboard opens in the next navigation).
- **Severity:** Low.
- **Frequency:** 2/2.
- **Evidence:** `p1-route-sweep.json`, `p1-verify.json`.

---

## Observations (not logged as defects)

- **Leave apply vs approve balance check (frequency 1):** in run 752944 EMP applied 2 days of Casual Leave with `POST /leave-requests` → 201 while the backend's approval later refused it with `400 Insufficient leave balance. Available: 1.00 days, Requested: 2.00`. A later manual check showed the apply form disabling Submit with "Insufficient balance for 2 days", so the FE check works when the balance query is fresh; the backend accepts an over-balance request at apply time and only rejects at approval. Worth a backend rule review; not reproduced twice through the UI. The pending request `f46db6e7-a7a8-4856-af59-31f629b9f5b9` (reason `NUAURA_TEST_P2_752944 leave`) is still pending for MGR.
- **HR_ADMIN redirected from admin-console and other routes** (`/admin`, `/admin/audit`, `/admin/settings`, `/admin/system`, `/admin/shifts`, `/shifts`, `/employees/import`, `/documents`, `/compliance`, `/payments`, `/resources/*`, `/security`, `/executive`, `/dashboards/executive`, `/integrations`, `/learning/certificates`, …): client gate (`hasAdminConsoleAccess` admits TENANT_ADMIN/HR_MANAGER but not HR_ADMIN; page-level gates elsewhere). Listed under `REVIEW-denied` in `p1-route-sweep.md`; needs a product decision on the HR_ADMIN scope before any of these counts as a defect.
- **Timesheet "Projects allocated" tab and PM `projects` table** have data while `psa_projects` is empty - the PSA and PM project models are not the same table; the timesheet screen only knows PSA.
- **Profile "City/State/Postal/Country" show "N/A" while other empty fields show "Not provided"** (`/me/profile`): cosmetic inconsistency.
- **`/me/leaves`** shows the Casual Leave request from earlier runs with 2 days; test residue, not a bug.
- **Dynamic routes** (40, e.g. `/employees/[id]`, `/recruitment/jobs/[id]`): BLOCKED in P1, no fixture mapping yet.

## Noise (environment / dev-mode, excluded from the checks)

- Next.js dev indicator ("Compiling…", "N Issues" badge) and `Download the React DevTools` message.
- `[ApiClient] Error: GET … undefined canceled` - axios request cancelled when a component unmounts (React dev double-mount); allowlisted in `ui-helpers.mjs` with this reason.
- Recharts `width(-1) and height(-1) of chart` warnings; WebSocket/STOMP reconnect messages.
- `GET/POST /api/v1/auth/me|refresh` 401 during the session refresh handshake.
- Backend `/actuator/health` reports `status: DOWN` only because the optional `mail` component is down; db/redis are UP.
- Mantine `<Progress>` bars (`role=progressbar`, leave balances on `/me/leaves`) and the aria-hidden "Live" pulse dot on `/fluence/wall` are not loading indicators; excluded from the spinner check.
- `accounts.google.com` is contacted by the login page for the Google Identity script (OAuth button); allowlisted in P0.
