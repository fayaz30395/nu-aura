# UI bugs - phases P6 (UI quality) and P7 (UI-level security)

Found by `scripts/e2e/p6-ui-quality.mjs`, `p6b-sweep.mjs` (axe-core, API-failure and dark-mode sweeps) and `p7-security-ui.mjs` plus ad-hoc probes (same folder). IDs `UI-001..013` are in `ui-bugs.md` and are not repeated here.

- Commit `d10bc9b9` (main), local stack FE `http://localhost:3000` (Next dev) + BE `http://localhost:8080` (profile `dev`), demo tenant `660e8400-e29b-41d4-a716-446655440001`.
- Chromium (Playwright), headless. Viewports 1440x900, 768x1024, 390x844; light and dark (`localStorage nu-aura-theme`).
- Roles: EMP `arun@`, MGR `sumit@`, HR `admin@` (own storage state `q_emp/q_mgr/q_hr`, no passwords logged).
- Sample: P6 about 40 routes (9 EMP, 9 MGR, 14 HR) at 5 viewport/theme combos, plus all 107 HR-allowed routes at 1440 light, dark and with every `/api/v1` call forced to 500. P7: 82 HR GET endpoints replayed as EMP and MGR, 59 HR-only routes opened as MGR/EMP, IDOR, CSRF, XSS, logout replay.
- Test data created (P7, run `NUAURA_TEST_P7_365348`): 1 wall post `1988ed4b-9aa9-4cbd-a9ca-5776897c0374` and 1 helpdesk ticket `34c02a4b-85af-47c0-b77b-aafccda8f903`, both by EMP, text `<b>x</b>`. Not deleted.
- Severity per plan 17 A2. Frequency is for the sampled runs. "Error-state" entries use `page.route` to return 500 for `/api/v1/*` (except auth, notifications, inbox, permissions); this is an injected fault, so the expected result is a visible error with retry.

## Summary

| ID | Sev | Phase | Title |
|---|---|---|---|
| Q-001 | Medium | P6 | `/admin/payroll`: API 500 shows "No payroll runs yet" and zero KPIs, no error |
| Q-002 | Medium | P6 | `/announcements`: API 500 shows "No Announcements" |
| Q-003 | Medium | P6 | `/assets`: API 500 shows "No Assets Found" and zero KPIs |
| Q-004 | Medium | P6 | `/admin/office-locations`: API 500 shows "No office locations" |
| Q-005 | Medium | P6 | `/admin/holidays`: API 500 shows raw "Request failed with status code 500" plus "No holidays configured" |
| Q-006 | Medium | P6 | `/recruitment/candidates`: API 500 shows "No candidates found / Add First Candidate" |
| Q-007 | Medium | P6 | `/departments`: API 500 shows "No departments found" |
| Q-008 | Medium | P6 | `/timesheets`: API 500 shows "No timesheets for this period" |
| Q-009 | Low | P6 | Error toast shown next to zero KPI tiles (`/admin/employees`, `/payroll`) |
| Q-010 | Low | P6 | Spinner stays 15-25 s before the error appears after a failing API (retry backoff) |
| Q-011 | Medium | P6 | `/admin/departments` at 390: card content clipped, no scroll |
| Q-012 | Medium | P6 | `/tax/declarations` at 390: card content clipped (712 in 322 px) |
| Q-013 | Medium | P6 | `/projects/calendar` at 390 and 768: calendar/sidebar clipped |
| Q-014 | Low | P6 | 768: page shell clips content (`/expenses`, `/onboarding`, `/analytics/org-health`) |
| Q-015 | Low | P6 | 768: stat/report cards clipped (`/reports`, `/recruitment/candidates`, `/workflows`, `/learning/paths`) |
| Q-016 | Medium | P6 | Add Holiday dialog has no dialog semantics |
| Q-017 | Low | P6 | Heading level jumps h1 to h3 on 11 routes |
| Q-018 | Low | P6 | Two `<main>` landmarks on 7 routes |
| Q-019 | Low | P6 | Mantine tabs: `aria-controls` points to a missing panel (3 routes) |
| Q-020 | Low | P6 | Scrollable regions with no focusable content (3 routes) |
| Q-021 | Medium | P6 | Icon-only buttons without accessible name (`/projects/gantt`, `/projects/calendar`, `/offboarding/fnf`) |
| Q-022 | Medium | P6 | Inputs and selects without label (`/surveys`, `/recruitment/pipeline`, 3 more) |
| Q-023 | Low | P6 | Colour contrast 3.67:1 for blue-500 text/white-on-blue-500 buttons |
| Q-024 | Low | P6 | Row action link colours fail contrast on hover rows (`/admin/leave-requests`, `/admin/leave-types`) |
| Q-025 | Low | P6 | Nested interactive controls (`/admin/org-hierarchy`, `/reports`) |
| Q-026 | Low | P6 | Touch targets under 24 px (carousel dots, small icon buttons) |
| Q-027 | Low | P6 | Light surfaces in dark mode (`/admin/departments`, `/admin/payroll`, `/leave/calendar`) |
| Q-028 | Low | P6 | Same `<title>` on different screens (Reports, Projects, Offboarding) |
| S-001 | High | P7 | `GET /api/v1/employees/managers` returns full employee records to EMP (includes personalEmail) |
| S-002 | Medium | P7 | MGR can read and open the edit form of any employee, not only the team |
| S-003 | Low | P7 | `X-Powered-By: Next.js` header sent |
| S-004 | Low | P7 | API error envelopes use inconsistent timestamp time zones |
| S-005 | Low | P7 | Dev profile: `/actuator/metrics`, `/prometheus`, `/info` readable without sign-in |
| S-006 | Low | P7 | Dev profile: Swagger UI reachable without sign-in |

Checked and clean (no defect): see "Checks that passed" at the end.

---

## Error-state group (Q-001 to Q-010)

Common setup: sign in as HR, force 500 on `/api/v1/*`, open the route, wait 22 s. Expected: a visible error with a Retry (as `/analytics`, `/attendance`, `/one-on-one` do) and no "empty" wording. Evidence: `p6b-raw` run, ad-hoc `q1` probe, `screenshots/ui-q-payroll-apifail.png`. Frequency 2/2 each.

- **Q-001** `/admin/payroll` · HR · 1440. Actual: "Payroll Administration", KPIs `TOTAL RUNS 0`, "No payroll runs yet - Get started by creating your first payroll run". No error. A user would believe there is no payroll data. Screenshot: `ui-q-payroll-apifail.png`.
- **Q-002** `/announcements` · HR. Actual: "No Announcements - No announcements to display".
- **Q-003** `/assets` · HR. Actual: "0 tracked assets", "No Assets Found - Start tracking company assets".
- **Q-004** `/admin/office-locations` · HR. Actual: "No office locations - Add your first location".
- **Q-005** `/admin/holidays` · HR. Actual: raw text "Request failed with status code 500" in the banner and also "No holidays configured for 2026 - Click Add Holiday", totals all 0.
- **Q-006** `/recruitment/candidates` · HR. Actual: "No candidates found - Add First Candidate", KPIs 0.
- **Q-007** `/departments` · HR. Actual: "No departments found - Click Add Department", totals 0.
- **Q-008** `/timesheets` · HR. Actual: "No timesheets for this period - Log your hours", hours 0.0h.
- **Q-009** (Low) `/admin/employees`, `/payroll`: a correct error toast ("Couldn't load this data", "Could not load payroll data boom") is shown, but KPI tiles still read `0` / `₹0` / `0.0%` and the header says "No active cycle". Zeros are indistinguishable from real values.
- **Q-010** (Low) `/payroll` (19 spinners), `/recruitment/candidates` (25), `/one-on-one` (16) still show skeletons after the 15 s settle; the error appears only after about 20 s (client retry/backoff). Expected: a message within a few seconds or a retry indicator. Severity Low because it resolves.

Severity Medium for Q-001..008: failure is presented as an empty business state (risk of wrong decisions, duplicate creation).

## Responsive (Q-011 to Q-015)

Measured with `scrollWidth > clientWidth` on `overflow:hidden` containers inside `main` (content cut, not scrollable); no horizontal page overflow was found on any sampled route at 390/768 (good). Screenshot for Q-011: `screenshots/ui-q-departments-390.png`.

- **Q-011** `/admin/departments` · HR · 390 (and 768: 624 in 478). `div.card-aura.overflow-hidden`, 680 px of content in 354 px. Table columns cut at the right edge; the card does not scroll. Expected: table scrolls inside its own container.
- **Q-012** `/tax/declarations` · HR · 390. `Mantine Card skeuo-card`, 712 in 322 px, clipped.
- **Q-013** `/projects/calendar` · HR · 390 (474 in 354) and 768 (651 in 397, shell 531 in 432). Calendar grid/left panel clipped.
- **Q-014** (Low) 768: `div.page-shell.overflow-x-hidden` is wider than its box on `/expenses` (490/432), `/onboarding` (523/432), `/analytics/org-health` (467/432). Right-hand content cut.
- **Q-015** (Low) 768: cards cut (content wider than card): `/reports` (284 in 166), `/recruitment/candidates` (136 in 74, filter tiles), `/workflows` (527 in 349), `/learning/paths` (222 in 170).

Medium for Q-011..013 (data columns unreachable on phone); Low for 768 items, which need a visual confirmation of the amount of text lost.

## Accessibility and consistency (Q-016 to Q-028)

- **Q-016** (Medium) `/admin/holidays` · HR. "Add Holiday" opens `div.fixed.inset-0` + `form` with no `role="dialog"`, no `aria-modal`, no label. The other 8 dialogs tested (Add Employee, Create Job Opening, Add Asset, New Announcement, New request, Create Goal, Create Ticket, Add Leave Type) have role, aria-modal, title, focus trap, Escape and focus return. Expected: same pattern.
- **Q-017** (Low) heading jump h1 to h3: `/performance/okr`, `/recognition`, `/attendance/shift-swap`, `/performance/360-feedback`, `/performance/reviews`, `/recruitment/interviews`, `/reports/scheduled`, `/attendance/comp-off`, `/leave/my-leaves`, `/me/payslips`, `/performance/pip`, `/reports/performance`. Also `/offboarding/settlements` has no h1 (extends UI-012).
- **Q-018** (Low) two `<main>` elements: `/announcements`, `/recognition`, `/me/dashboard`, `/admin/departments`, `/recruitment/jobs`, `/me/payslips`, `/recruitment/interviews`.
- **Q-019** (Low) axe `aria-valid-attr-value`: tab `aria-controls="mantine-...-panel-..."` has no element (inactive panels unmounted): `/attendance/regularization` (`tab-wfh`), `/performance/okr` (`tab-my`), `/performance/pip` (`tab-ACTIVE`).
- **Q-020** (Low) axe `scrollable-region-focusable`: `/helpdesk/tickets` (`.overflow-x-auto`), `/payroll/bulk-processing` (`.max-h-[400px]`), `/projects/gantt`. Keyboard users cannot scroll them.
- **Q-021** (Medium) axe `button-name` and DOM check: icon-only buttons with no text/`aria-label`: `/projects/gantt` (2, `h-8` toolbar buttons), `/projects/calendar` (5 buttons in the left panel), `/offboarding/fnf` (1 Mantine action icon).
- **Q-022** (Medium) axe `select-name` / no label or `aria-label`: `/surveys` (search + 2 selects), `/recruitment/pipeline` (select), `/onboarding/templates` (search), `/preboarding` (search), `/offboarding/fnf` (status filter). Placeholder is the only name.
- **Q-023** (Low) contrast 3.67:1 (needs 4.5): `#3b82f6` link "View all" on white (`/admin/payroll`), white text on `bg-accent-500` button (`/admin/office-locations`, dark).
- **Q-024** (Low) contrast on hovered row: `text-success-600`, `text-warning-600`, `text-accent-700` action links in `/admin/leave-requests` (2 nodes) and `/admin/leave-types` (8 light / 16 dark nodes).
- **Q-025** (Low) axe `nested-interactive`: `/admin/org-hierarchy` (4 nodes), `/reports` (6 cards `div[aria-label="Open ... Report"]` with focusable children).
- **Q-026** (Low) axe `target-size`: dashboard carousel dots 16x6 px (`/me/dashboard`, MGR, 7 nodes); at 390 px 23 interactive elements under 24 px on `/me/dashboard`, 1-3 on 8 other routes.
- **Q-027** (Low) dark mode, element with near-white background (alpha over 0.5, luminance over 0.85): `/admin/departments` (`div.group ... rounded-lg border`, 235x50), `/admin/payroll` (`a.sidebar-menu-item`, 223x44, and the same row), `/leave/calendar` (`div.min-h-24 ... bg-ac...`). Needs visual confirmation; may be an accent tint.
- **Q-028** (Low) identical `document.title`: "Reports | NU-AURA" (7 routes), "Projects | NU-AURA" (5), "Offboarding | NU-AURA" (5). Hurts history/tab identification.

Not found (P6): layout shift above 0.1 on any sampled page; missing visible focus ring in the first 14 tab stops on 40 routes; horizontal page overflow at 390/768.

---

## S-001 - Employee list endpoint `/employees/managers` exposes full employee records to EMP

- **Phase/role:** P7 · EMP (`arun@`) · API.
- **Steps:** 1. Sign in as EMP. 2. `GET /api/v1/employees/managers` (the page `GET /api/v1/employees?page=0` returns 403 for the same user).
- **Expected:** a minimal picker DTO (id, name) or 403 for an employee with no team/all view permission.
- **Actual:** 200 with 13 full `EmployeeResponse` objects. Fields include `workEmail`, `personalEmail` (non-null on 5 of 13), `bankAccountNumber`, `bankName`, `bankIfscCode`, `taxId`, `managerId`, `dottedLineManager*`, `subordinates`, `dateOfBirth`, `address`, `phoneNumber`. In the demo data the bank/tax/DOB values are null, so only `personalEmail` was observed leaking; any filled record would leak. Source: `backend/src/main/java/com/nulogic/api/employee/EmployeeController.java:303` (`@RequiresPermission` accepts `EMPLOYEE_UPDATE`/`VIEW_TEAM`; returns `EmployeeResponse`).
- **Severity:** High (unauthorized exposure of personal/financial fields to every user with this permission; employee-level user reached it).
- **Frequency:** 3/3. **Evidence:** replay of HR GET list (EMP 200, 14457 bytes) and field count probe.

## S-002 - Manager can read and open the edit form of any employee

- **Phase/role:** P7 · MGR (`sumit@`) · API and UI.
- **Steps:** 1. As MGR open `/employees/<id>` and `/employees/<id>/edit` for an employee who is not a report (manager = null). 2. `GET /api/v1/employees/<id>`.
- **Expected:** team/department scope (the role has `EMPLOYEE:VIEW_TEAM`), 403 for others; edit form not offered.
- **Actual:** 200 full record, the edit form loads with all fields. `PUT /api/v1/employees/<id>` as MGR returns 403, so the UI offers an action the server rejects. MGR also holds `EMPLOYEE:VIEW_ALL` and lists all 25 employees, so whether this is intended is a **product decision**; the edit form exposure and the mismatch are defects either way.
- **Severity:** Medium. **Frequency:** 2/2.

## S-003 - `X-Powered-By: Next.js` header

- `curl -I http://localhost:3000/auth/login` returns `X-Powered-By: Next.js`. `next.config.js` has no `poweredByHeader: false`. Information disclosure (framework fingerprint). Low. 3/3.

## S-004 - Inconsistent timestamp time zones in API error bodies

- Same minute, two error handlers: validation 400 `timestamp 2026-11-16T18:46:54` (machine-local), auth 401 `2026-11-17T03:16:54` (Asia/Kolkata), 403 from permission check `2026-11-16T21:42:45Z` (UTC). Clients and audit correlation cannot compare them. Low. 3/3.

## S-005 - Dev profile: actuator endpoints without sign-in

- `GET /actuator/metrics`, `/actuator/prometheus`, `/actuator/info` return 200 without cookies on the local `dev` profile (`env`, `heapdump` return 403). `application-prod.yml` / `-render.yml` configure `prometheus-token`, so this is a **dev-only** observation; verify the prod profile enforces the token before release. Low.

## S-006 - Dev profile: Swagger UI reachable without sign-in

- `GET /swagger-ui.html` returns 302 (then served) without a session; `/v3/api-docs` is 404. Prod config disables it (`application-prod.yml`). Dev-only observation, verify on prod profile. Low.

---

## Checks that passed (P7, no defect)

- Role URL tampering: EMP reached 0 of 59 HR-only routes (all redirect to `/me/dashboard` or `?denied=1`) and no protected API returned 200 before redirect. MGR reached 5 routes the P1 policy allows (`/onboarding`, `/travel`, `/projects/psa`, `/reports/headcount`, `/performance/revolution`; their 403 data calls are UI-007).
- API replay: 82 HR GET calls as EMP: 403 on admin lists (`employees`, `payroll/*`, `users`, `roles`, `audit-logs`, `loans`, `attendance/date`); 200 lists were empty or own-scoped (leave-requests 3 rows, 1 employee id).
- IDOR: EMP `GET /employees/{other}`, `/leave-balances/employee/{other}`, `/leave-requests/employee/{other}`, `/attendance/employee/{other}` are 403; `/self-service/dashboard?employeeId={other}` ignores the parameter and returns the caller's own data. MGR `/leave-requests/employee/{other}` and `/attendance/employee/{other}` are 403.
- CSRF: POST without token, with a bad token: 403 "CSRF token validation failed"; valid token with `Origin: http://evil.example`: 403 "Invalid CORS request". CORS preflight from an evil origin gets no allow headers.
- XSS: `<img onerror>` / `<script>` payloads in wall post, ticket subject/description are rejected with 400 "potentially malicious content". `<b>x</b>` is stored and rendered as literal text on `/fluence/wall` and `/helpdesk/tickets` (no bold element). All `dangerouslySetInnerHTML` uses (9 files) go through a sanitizer or are JSON-LD escaped.
- Session: after `/auth/logout`, the old access and refresh cookies get 401 on `/auth/me`, `/employees/me` and `/auth/refresh`; `sessionStorage auth-storage` is reset to `isAuthenticated:false, user:null`; browser Back shows the login form, not the profile.
- Login errors: unknown user and wrong password return the identical 401 `Bad credentials`. Lockout and rate limit were not exercised (shared demo accounts, 5/min/IP limit shared by other agents); BLOCKED, needs a disposable account.
- Headers: FE sets X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy, CSP (dev CSP includes `unsafe-inline`/`unsafe-eval` by design per `proxy.ts`); HSTS is production-only by design.
- Bundle check: dev `.next` build contains `Welcome@123` inside the demo panel code, which is gated by `NEXT_PUBLIC_DEMO_MODE` (`login/page.tsx:814`); a production-mode bundle was not built here, so check P7 item 7 is NOT RUN.
- Not run: upload validation (item 8) and two-tenant isolation (item 10; only the demo tenant exists in the local data).
