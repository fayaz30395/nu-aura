# 17 - Browser E2E test plan and Playwright upgrade plan

Date 2026-11-15. Planning only; no spec, config or source changed; nothing was run. Inputs: `frontend/e2e/**`,
`frontend/playwright*.config.ts`, `docs/qa/AUTONOMOUS-UI-E2E-RUNBOOK.md`, `11-browser-e2e.md`, `01-testing-strategy.md`,
`09-rbac-audit.md`, `14-keka-parity.md`, `15-known-defects.md`, `16-ui-upgrade-plan.md`, `evidence/defects-*.md`,
`evidence/fixes-*.md`, `evidence/scripts/e2e/*.mjs`. Paths are relative to `frontend/` unless prefixed.

Safety (applies to every task below): local stack only (FE :3000, BE :8080); demo accounts from the runbook only, never
`fayaz.m@` / `sarankarthick.maran@` outside the local SUPER_ADMIN setup project; all created rows prefixed `NUAURA_TEST_`;
one login per role per run; brute-force/lockout only against an `NUAURA_TEST_` user; prod/Vercel/Railway smoke is
BLOCKED until the user authorises it.

Role aliases used in this document (all `Welcome@123`, verify role on login): EMP=`arun@nulogic.io`, EMP2=`anshuman@`,
TL=`mani@`, MGR=`sumit@`, HRM=`jagadeesh@`, HRA=`admin@` (HR_ADMIN; runbook's `saran@` is EMPLOYEE in DB, see
`evidence/defects-e2e.md`), REC=`suresh@`, FIN=`finance@`, TA=`tenant.admin@`, SA=SUPER_ADMIN (local-only, env-gated).
Second-tenant users: the `NUAURA_TEST_Alpha` / `NUAURA_TEST_Beta` tenants and `alpha_sa` / `beta_sa` users seeded by the
tenant audit (`08-tenant-isolation.md` lines 24-46); their passwords are in `evidence/test-data-secgate.md`, not here.

## 1. Inventory and gap analysis

### 1.1 What exists

| Item | Finding |
|---|---|
| Spec files | 123 `*.spec.ts`: 116 in `e2e/` root, `accessibility/` 1, `edge-cases/` 2, `generated/` 3, `mobile/` 1. `test()` calls: ~2,358 static, plus 222 route-smoke tests generated from `generated/routes.json` at load time. |
| Remote-only specs | 4 `*.production.spec.ts` (`api-backend-trace`, `employee-edit-autonomous`, `greenflag-live-ui`, `production-readiness`) targeting the Vercel URL via `playwright.production.config.ts`. BLOCKED (remote). |
| Configs | `playwright.config.ts`: `webServer: npm run dev`, 6 projects (`setup`, `cred-free`, `chromium`, `firefox`, `mobile-chrome`, `mobile-safari`, `tablet`), viewport 1280x720, timeout 120 s, retries 1 local / 2 CI, 4 workers local / 2 CI, `--disable-web-security` on chromium. `playwright.live.config.ts`: same, no webServer, port 3002. |
| Auth model | `auth.setup.ts` probes `POST /auth/login` as SUPER_ADMIN, calls `loginAs`, warms 17 routes, writes **one** `playwright/.auth/user.json`. Every browser project uses that single SUPER_ADMIN state. Role switching happens inside tests via `fixtures/helpers.ts#loginAs` (API login, cookies + `auth-storage`/`nu-aura-user` seeded into localStorage because `NEXT_PUBLIC_E2E_AUTH_STORAGE=localStorage`), with a per-worker cache and a 15 s gap between API logins (`E2E_API_LOGIN_RATE_LIMIT_DELAY_MS`) to stay under the 5/min bucket. `E2E_ALLOW_LOCAL_AUTH_FALLBACK` can seed an **unsigned JWT** and let specs pass against a session the backend never issued. |
| Per-role state files | `e2e/.auth/{EMPLOYEE,FINANCE,HR_ADMIN,HR_MANAGER,MANAGER,RECRUITER,SUPER_ADMIN,TEAM_LEAD,TENANT_ADMIN}.json` exist but **no spec or config references them** (only `nu-rbac.spec.ts` writes its own `auth-<role>.json` to a temp dir). Debris from an earlier run. |
| Duplicated login | 100 of 123 specs call `loginAs`/`/auth/login` themselves instead of using a role project. |
| `backend:8080` | Not handled in the suite. Specs assume the dev server was started with `NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1`. The audit harness (`evidence/scripts/e2e/lib.mjs:18`) rerouted XHR with `context.route(/^http:\/\/backend:8080\//, ...)`; WebSocket cannot be rerouted, so `/websocket/i` is in `generated/known-noise.ts`. |
| Skips | 63 `skip`/`fixme` sites in 12 files: `approvals-workflows` 16, `helpdesk` 12, `dynamic-route-detail` 8, `mobile/navigation.mobile` 8, `settings-security` 5, `departments` 4, `recruitment-extended` 3, `auth-bruteforce-lockout` 2, `my-space` 2, `navigation` 1, `nu-rbac` 1, `rbac-action-matrix` 1. |
| Fixed waits | 1,410 `waitForTimeout` calls. Worst: `lifecycle-e2e` 65, `fluence-wiki-blogs` 51, `projects` 50, `integrations-payments` 49, `recruitment-extended` 48, `fluence-drive-wall` 48, `navigation` 46, `one-on-one` 44, `my-space` 44, `reports-extended` 42. |
| Selectors | `getByText`/`text=` 1,229 uses, `getByRole` 431, class/CSS locators 95, `data-testid` in only 23 spec files (and only 22 app/component files define one). |
| Visual | 11 `*-chromium-darwin.png` snapshots across 7 specs; CI excludes them (`--grep-invert "Visual Regression|snapshot"`). |
| CI | `.github/workflows/e2e.yml`: ephemeral PG + Redis + backend jar + FE on 3002, runs `cred-free` + `setup` + `chromium`, 2 workers, 3 retries, **no shards**, firefox/mobile/tablet never run. |
| Security / UI depth | `security-deep.spec.ts` (headers, cookie flags, XSS login + wall, IDOR employee/payslip, JWT tamper, cross-tenant header/URL, CORS, auth rate limit on a non-existent email), `auth-bruteforce-lockout.spec.ts`, `rbac-*.spec.ts` x7, `ui-ux-deep.spec.ts` (dark mode, 1280/768/375, loading/empty/error, search, bell, sidebar, switcher, breadcrumbs, tab order, titles), `accessibility/a11y.spec.ts` (`@axe-core/playwright` ^4.11, WCAG 2A/2AA tags, violations only logged on some pages). |
| Debris | `tmp-debug-rbac.spec.ts`, `hire-qa-run.ts` (not a spec), `remote-deployed-route-smoke.json`, `e2e/.auth/*.json`. |

### 1.2 Master journeys vs specs

| Journey | Closest specs | Gap |
|---|---|---|
| Employee lifecycle (create > onboard > change > offboard) | `employee-crud`, `employee`, `onboarding-offboarding`, `lifecycle-e2e`, `probation` | No DB/API assertion of the created row; `lifecycle-e2e` has 65 fixed waits; no `employeeCode` blank path (W1-06). |
| Payroll lifecycle (structure > run > approve > lock > payslip PDF) | `payroll-run`, `payroll-end-to-end`, `payroll-flow`, `payroll-disbursement`, `payroll-statutory`, `tax-lwf` | No `%PDF-` + size check on download (DEF-PAY-05); no same-user approve block; no unpaid-leave-to-LOP check (DEF-PAY-04); no mid-month proration; no "-" gross placeholder (W1-02). |
| Recruitment to onboarding | `recruitment-pipeline`, `recruitment-kanban`, `recruitment-extended`, `hire-to-onboard`, `nu-hire-grow-interaction` | Offer creation after V342 untested in browser (DEF-HIRE-01/02); interviewer PII scope (DEF-HIRE-10) untested; letters 403 (DEF-E2E-05) untested. |
| Performance (OKR, cycle, 360, PIP) | `okr`, `review-cycles`, `performance-*`, `feedback360` | KR create after DEF-GROW-01 fix untested; manager cannot advance cycle (DEF-GROW-04) untested; non-report review 403 (DEF-GROW-05) untested; OKR 403 console noise (DEF-E2E-04). |
| Knowledge sharing (wiki, blog, wall, drive) | `fluence-wiki-blogs`, `fluence-content-lifecycle`, `fluence-drive-wall`, `wiki-edit-lock` | Wiki create from UI without slug (DEF-E2E-01), draft/PRIVATE list leak (DEF-E2E-02), 404 on foreign private page (DEF-E2E-07), employee wiki read (V345) all untested. |
| Cross-app consistency (switcher, My Space, notifications, search) | `app-switcher`, `my-space`, `sub-app-smoke`, `notifications`, `realtime-notification-delivery` | Per-role switcher visibility (Hire hidden for EMP) only in the audit script `j1.mjs`; no `undefined`/`NaN`/`COMPANY NAME` text scan. |
| Tenant isolation via UI | `rbac-tenant-isolation`, `security-deep` S-SEC-8 | Only header/URL tampering as one user; no two-tenant browser session (Alpha vs Beta) asserting zero cross-tenant rows in lists and 404 on foreign ids. |

### 1.3 Defects from `15-known-defects.md` and `evidence/defects-*.md` to regression tests

Every FIXED row below becomes a `@regression` test in section 3 (ID in the last column). OPEN rows get an `xfail`-style
test that is expected to fail and flips to pass when fixed (`test.fail()` annotation, so a silent fix is noticed).

| Defect | Status | Regression test |
|---|---|---|
| DEF-PAY-05 payslip PDF 0 bytes | FIXED | REG-PAY-01 |
| DEF-PAY-04 unpaid leave reaches payroll | FIXED (unit for expenses) | REG-PAY-02 |
| DEF-PAY same-user process+approve | FIXED | REG-PAY-03 |
| DEF-PAY mid-month joiner proration | FIXED | REG-PAY-04 |
| DEF-PAY-07 runs page gross 0.00 / period shift | OPEN (W1-01/02) | REG-PAY-05 (`test.fail`) |
| DEF-HIRE-01/02 offer 500, stage CHECK | FIXED V342 | REG-HIRE-01 |
| DEF-HIRE-10 interviewer PII | FIXED | REG-HIRE-02 |
| DEF-GROW-01 KR create | FIXED | REG-GROW-01 |
| DEF-GROW-04/05 manager advance / non-report review | FIXED | REG-GROW-02, REG-GROW-03 |
| DEF-GROW-13 review shows 0.0/5.0 | OPEN (W1-07) | REG-GROW-04 (`test.fail`) |
| DEF-E2E-01 wiki create slug | FIXED | REG-FLU-01 |
| DEF-E2E-02 / FLUENCE-04 draft list leak | FIXED (TEAM/RESTRICTED still open) | REG-FLU-02 (+ `test.fail` sub-case) |
| DEF-E2E-07 wiki 400 -> 404 | FIXED | REG-FLU-03 |
| DEF-FLUENCE-02 content sent as object | FIXED-UNIT | REG-FLU-01 covers it |
| DEF-E2E-03 TA payslips gate | FIXED | REG-PAY-06 |
| DEF-E2E-04 / -05 OKR and letters 403 noise | FIXED FE | REG-GROW-05, REG-HIRE-03 (console budget 0 for the endpoint) |
| DEF-HRMS-01 /auth/me, /auth/refresh in auth bucket | FIXED-UNIT | REG-AUTH-01 |
| DEF-HRMS-02 roles PUT 500 | FIXED V344 | REG-ADM-01 |
| DEF-HRMS-03 manager leave reject 403 | FIXED V344 | REG-HRMS-01 |
| DEF-HRMS-08 attendance browser date | OPEN (W1-03) | REG-HRMS-02 (`test.fail`, TZ-shifted context) |
| DEF-HRMS-10 employeeCode required / Mantine style error | OPEN (W1-06/08) | REG-HRMS-03 (`test.fail`) |
| DEF-RBAC-01 employee wiki read | FIXED V345 | REG-RBAC-01 |
| DEF-RBAC-10 manager employee update scope | FIXED | REG-RBAC-02 |
| DEF-AUDIT events persisted | FIXED | REG-SEC-01 (login creates `audit_logs` row, DB read) |
| DEF-01 demo strings in bundle | FIXED | SEC-10 (chunk scan) |
| DEF-TENANT-03 `../` download guard | OPEN | SEC-16 (`test.fail`) |
| Existing `defect-regressions.spec.ts` (BUG-L1/L2/1/2/E2/F1) | keep | fold into the same file |

## 2. Test architecture

| Decision | Plan |
|---|---|
| Projects | `setup` (global, one login per role) -> `smoke` (SA, chromium, route-smoke + critical journeys) -> role projects `emp`, `tl`, `mgr`, `hrm`, `hra`, `rec`, `fin`, `ta` (each `storageState: playwright/.auth/<role>.json`, `testMatch` by tag or folder) -> `security` (fresh context, no state) -> `ui` (4 viewports) -> `a11y`. `firefox` stays opt-in (`PW_FIREFOX=1`), mobile/tablet merged into `ui`. |
| storageState per role | `auth.setup.ts` becomes a loop over the 9 role aliases: API login once, `page.goto('/')`, seed `auth-storage` exactly as `loginAs` does today, save `playwright/.auth/<role>.json`. 9 logins at 15 s spacing = under 3 min and under the 5/min bucket (two buckets: setup is the only project without `dependencies`). Specs stop calling `loginAs`; multi-user flows use `browser.newContext({storageState})` per actor. SUPER_ADMIN state only when `E2E_ALLOW_SUPER_ADMIN=1` (local default on, CI on, prod never). |
| API reroute | New `fixtures/base.ts` extends `test` with a `context` fixture that installs `context.route(/^http:\/\/backend:8080\//, r => r.continue({url: r.request().url().replace('http://backend:8080', API_ORIGIN)}))` (copied from `evidence/scripts/e2e/lib.mjs:18`). Keeps working when `.env` points at `backend:8080`. WS stays unrouted; keep the `/websocket/i` noise filter but count every other console error. |
| Local fallback auth | Delete `E2E_ALLOW_LOCAL_AUTH_FALLBACK`, `createUnsignedJwt`, `seedFallbackCookies`, `buildFallbackAuth` from `fixtures/helpers.ts`. A green run must mean the backend issued the session. |
| Data | Prefix `NUAURA_TEST_E2E_<spec>_<runId>` (`runId` = `process.env.GITHUB_RUN_ID ?? Date.now()`). `fixtures/data.ts` exposes `track(kind, id)`; a `cleanup` worker-scoped fixture deletes tracked rows via API as HRA/SA in `afterAll`, and `scripts/e2e-cleanup.mjs` deletes any `NUAURA_TEST_E2E_%` leftovers (SQL from `evidence/test-data-e2e.md`). |
| API + DB asserts | `fixtures/api.ts`: `expectApi(page, {method, path, status})` wraps `page.waitForResponse` and returns the JSON. `fixtures/db.ts`: read-only `sql(query, tenantId)` via `psql` in a `BEGIN READ ONLY` tx with `set_config('app.current_tenant_id', ...)` (port of `lib.mjs:50-59`; creds sourced from `~/.config/nu-aura/local-db.env`, never printed). DB asserts are skipped (not failed) when `E2E_DB=0` (CI without psql). |
| Tags | `@smoke @regression @security @ui @a11y @perf @rbac @journey`; `--grep` selects, every new test carries at least one. |
| Viewports | `ui` project runs the overflow/visual tests at 1440x900, 1280x800, 768x1024, 390x844 via `test.use({viewport})` inside a `for` loop; functional projects stay at 1280x800. |
| Retries / timeouts | `retries: CI ? 1 : 0`; `timeout 60 s` once `PLAYWRIGHT_USE_BUILD=1` runs `next build && next start` in the webServer (dev-mode compile is the reason for 120 s); `expect.timeout 10 s`; no `waitForTimeout` outside `fixtures/`. A test that needs a retry to pass is flaky and is quarantined with `@flaky` + an issue id, not left to retries. |
| CI shards | `--shard=N/4` by project group: smoke+emp, mgr+tl+hrm, hra+rec+fin+ta, security+ui+a11y. `blob` reporter, merged with `playwright merge-reports`. Keep `cred-free` as the no-dependency canary. |
| Console budget | `fixtures/console.ts` collects `console.error` + `pageerror` + `response >= 400` (excluding `/_next/`), filtered by `known-noise.ts`; default budget 0, per-test override `test.use({consoleBudget: n})` with the defect id in the override. |
| Remove | `--disable-web-security` launch arg (it hides CORS/CSP failures). |

## 3. Test catalogue

Legend: exists = path under `e2e/`; UPGRADE = keep the spec, apply section 6 items; NEW = write. Assertions list UI, then
API (`expectApi`), then DB (`sql`, read-only, only where a tenant GUC-scoped SELECT is safe).

| ID | Journey | Role | UI steps | Assertions | Tags | P | Exists |
|---|---|---|---|---|---|---|---|
| AUTH-01 | Login via form, logout | EMP | `/auth/login` email+password, Sign in; avatar menu > Sign out | lands `/me/dashboard`; `POST /auth/login` 200 sets httpOnly cookies; `POST /auth/logout` 200; cookies gone; `/me/dashboard` redirects to login; DB `audit_logs` has LOGIN + LOGOUT for user | @smoke @security | P0 | UPGRADE `auth-flow.spec.ts` |
| AUTH-02 | Wrong password message | fresh | 1 wrong attempt on an `NUAURA_TEST_E2E_` user | error text visible, no credential echoed, stays on login, 401 | @security | P1 | UPGRADE `auth-comprehensive.spec.ts` |
| AUTH-03 | Session expiry + refresh | EMP | delete `access_token` cookie, navigate | page recovers via `POST /auth/refresh` 200 (not in 5/min bucket, REG-AUTH-01) or redirects to login without stack trace | @security | P1 | NEW `auth-session.spec.ts` |
| AUTH-04 | Back button after logout | EMP | logout, `page.goBack()` | protected page not rendered; `GET /auth/me` 401 | @security | P0 | NEW `auth-session.spec.ts` |
| AUTH-05 | Password change | EMP2 (own account) | `/me/settings` change password to a new value and back | 200; re-login with new password works; old fails; final state restored | @regression | P1 | NEW `auth-password.spec.ts` (serial, single worker) |
| NAV-01 | App switcher per role | all 8 | open product rail / waffle | visible apps match `navAccess.ts` for the role (Hire hidden for EMP, visible for REC) | @smoke @rbac | P0 | UPGRADE `app-switcher.spec.ts` (loop over role projects) |
| NAV-02 | My Space pages | EMP | `/me/dashboard`, `/me/leaves`, `/me/attendance`, `/me/payslips`, `/me/documents` | each h1 correct, no console error, no `undefined`/`NaN` text | @smoke | P0 | UPGRADE `my-space.spec.ts` (un-skip 2) |
| NAV-03 | Route smoke 222 routes | SA | generated | render, no 5xx, console budget 0 (noise-filtered) | @smoke | P0 | exists `generated/route-smoke.spec.ts` |
| HRMS-01 | Employee CRUD | HRA | add employee (code blank), edit, view, deactivate | 201 with auto code; row in list; `GET /employees/{id}`; DB `employees` row; deactivate -> status changed | @journey @regression | P0 | UPGRADE `employee-crud.spec.ts` |
| HRMS-02 | Leave apply > approve > balance | EMP, MGR | EMP `/leave/apply`; MGR `/leave/approvals` approve | 201 PENDING -> 200 APPROVED; DB `leave_requests.status`, approver id; EMP `/me/leaves` balance decremented | @journey @smoke | P0 | UPGRADE `leave-flow.spec.ts` (port of `j2.mjs`) |
| HRMS-03 | Leave reject by manager | EMP, MGR | as above, Reject | 200 (REG-HRMS-01, was 403); DB REJECTED | @regression | P0 | NEW in `defect-regressions.spec.ts` |
| HRMS-04 | Attendance check-in/out | EMP | `/me/attendance` Check in, Check out | 200s; today card updates; DB `attendance` row today (tenant date) | @journey | P1 | UPGRADE `attendance-flow.spec.ts` |
| HRMS-05 | Expenses claim > approve | EMP, MGR | new claim with receipt upload (`fixtures/sample.pdf`), approve | 201, file stored, 200 approve; DB status | @journey | P1 | UPGRADE `expense-end-to-end.spec.ts` |
| HRMS-06 | Loans, assets, timesheets | EMP, HRA | apply loan; assign asset; submit timesheet; approve | each POST 2xx; timesheet locked after approve (14-keka #28) | @journey | P2 | UPGRADE `loans`, `asset-flow`, `timesheets` |
| PAY-01 | Payroll run > process > approve > lock | FIN (confirm PAYROLL:PROCESS on login) + second approver TA | `/payroll/runs` create, process, approve, lock | statuses as `11-browser-e2e.md` NU-UI-003a; same-user approve blocked (REG-PAY-03); DB `payroll_runs.status` | @journey | P0 | UPGRADE `payroll-run.spec.ts` |
| PAY-02 | Payslip PDF download | EMP | `/me/payslips` Download | `GET /payslips/{id}/pdf` 200 `application/pdf`; `download.path()` size > 1 kB, first bytes `%PDF-`; net on card = DB `payslips.net_pay` (REG-PAY-01) | @smoke @regression | P0 | NEW `payslip-pdf.spec.ts` (port of `j3.mjs`) |
| PAY-03 | TA opens `/payroll/payslips` | TA | navigate | no "Access restricted" (REG-PAY-06) | @regression @rbac | P1 | NEW in `defect-regressions.spec.ts` |
| PAY-04 | Unpaid leave reduces net | EMP, MGR, FIN | approve 2 days LOP leave then run payroll | payslip net lower than structure (REG-PAY-02); DB `payslips` LOP days | @regression | P1 | NEW `payroll-lop.spec.ts` (serial) |
| PAY-05 | Gross column placeholder | FIN | `/payroll/runs` | `run-gross-pending` or formatted amount, never `0.00` (REG-PAY-05, `test.fail` until W1-02) | @regression @ui | P2 | NEW |
| HIRE-01 | Job > candidate > offer > onboard | REC, HRA | create job, add candidate, move stages, Generate Offer, convert | 201s; offer 201 (REG-HIRE-01); DB `candidates.current_stage`; no 403 console (REG-HIRE-03) | @journey @smoke | P0 | UPGRADE `hire-to-onboard.spec.ts` (port of `j4.mjs`) |
| HIRE-02 | Interviewer PII scope | TL (not assigned) | open unassigned candidate URL | 403/404 and denied UI (REG-HIRE-02) | @security @rbac | P1 | NEW `rbac-hire.spec.ts` |
| GROW-01 | OKR objective + key result | EMP | `/performance/okr` New Objective, Add KR | toasts; `POST .../key-results` 200 (REG-GROW-01); DB `okr_key_results`; no 403 on company objectives (REG-GROW-05) | @journey @regression | P0 | UPGRADE `okr.spec.ts` (port of `j5.mjs`) |
| GROW-02 | Review cycle: HRM creates, MGR cannot advance | HRM, MGR | create cycle; MGR tries Activate/Advance | MGR gets 403 and button hidden (REG-GROW-02); HRM 200 | @rbac @regression | P1 | UPGRADE `review-cycles.spec.ts` |
| GROW-03 | Non-report review hidden | MGR | open review id of a non-report | 403/404 (REG-GROW-03) | @security | P1 | NEW `rbac-grow.spec.ts` |
| GROW-04 | LMS enrol + complete | EMP | enrol, complete | 2xx; progress shown; DB `enrollments` | @journey | P2 | UPGRADE `training-enrollment.spec.ts` |
| FLU-01 | Wiki create > publish (no slug) | HRA | `/fluence/wiki/new` title + body > Publish | `POST /knowledge/wiki/pages` 201 with generated slug (REG-FLU-01); DB row | @journey @regression | P0 | UPGRADE `fluence-wiki-blogs.spec.ts` (port of `j6b.mjs`) |
| FLU-02 | Employee list hides others' drafts | EMP | `/fluence/wiki` list; GET private id | no DRAFT/PRIVATE of others in list API (REG-FLU-02); foreign private id -> 404 (REG-FLU-03); TEAM/RESTRICTED sub-case `test.fail` | @security @regression | P0 | NEW `fluence-visibility.spec.ts` (port of `fixverify.mjs`) |
| FLU-03 | Wall post + reaction + comment | EMP, EMP2 | post, react, comment | 201s; DB `social_posts`; XSS payload rendered inert (SEC-11) | @journey | P1 | UPGRADE `fluence-drive-wall.spec.ts` |
| FLU-04 | Wiki edit lock | HRA, TA | two contexts open same page edit | second sees lock banner (5 min TTL) | @journey | P2 | exists `wiki-edit-lock.spec.ts` |
| X-01 | Notifications end-to-end | EMP, MGR | leave apply -> MGR bell | bell count +1 within 10 s (WS or poll); item links to approvals | @journey | P1 | UPGRADE `realtime-notification-delivery.spec.ts` |
| X-02 | Global search | EMP | Ctrl/Cmd+K, type employee name | results list; no 500 | @smoke | P1 | exists `ui-ux-deep.spec.ts` UI-09 |
| X-03 | Uploads/downloads | HRA | profile photo upload, document upload (`sample.jpg`, `sample.pdf`), download | 201; download size > 0; wrong type (`.exe` renamed) rejected 4xx | @journey @security | P1 | UPGRADE `file-upload-roundtrip.spec.ts` |
| X-04 | Empty / loading / error states | EMP | pages with no data; route-mocked 500 | skeleton with `role=status`; empty-state copy; `QueryErrorCard` with Retry, no stack trace | @ui | P1 | exists `edge-cases/network.spec.ts`, `ui-ux-deep.spec.ts` UI-06..08 |
| X-05 | Forms + validation | HRA | submit empty / bad email / past date on employee, leave, expense forms | inline errors tied by `aria-describedby`; no request sent | @ui | P1 | UPGRADE `edge-cases/validation.spec.ts` |
| X-06 | Tables + pagination | HRA | `/employees` page 2, sort, filter | URL carries page/sort; row count <= page size; API called with `page=1` | @ui | P2 | NEW `tables.spec.ts` |
| TEN-01 | Tenant isolation via UI | `alpha_sa`, `beta_sa` | two contexts: Beta lists employees/leave/payslips/wiki; opens Alpha ids | zero Alpha marker rows; foreign ids 404; DB count of Alpha rows unchanged | @security | P0 | UPGRADE `rbac-tenant-isolation.spec.ts` |
| ADM-01 | Role assign | TA | `/admin/users` assign role | `PUT /users/{id}/roles` 200 (REG-ADM-01) | @regression | P1 | UPGRADE `admin-roles.spec.ts` |
| RBAC-01 | Direct URL deny matrix | all 8 | `generated/rbac-matrix.json` cells | redirect `/me/dashboard?denied=1` or `page-denied`; API 403; employee wiki read 200 (REG-RBAC-01); MGR `PUT /employees/{team}` 403 (REG-RBAC-02) | @rbac @security | P0 | UPGRADE `generated/rbac-redirect.spec.ts` + `rbac-matrix.spec.ts` |

## 4. UI-quality checks (`ui` and `a11y` projects)

| ID | Check | Pages | Pass rule | Exists |
|---|---|---|---|---|
| UI-01 | No horizontal overflow at 1440x900 / 1280x800 / 768x1024 / 390x844 | 12: dashboard, leave, approvals, employees, payroll runs, payslips, candidates, okr, wiki, wall, settings, admin users | `document.documentElement.scrollWidth <= clientWidth` and no element wider than viewport | UPGRADE `ui-ux-deep.spec.ts` UI-03..05 (adds 1440 and 390) |
| UI-02 | Console error budget | same 12 | 0 after `known-noise.ts`; failures list the message | UPGRADE route-smoke + console fixture |
| UI-03 | Dark mode | 6 pages | toggle persists after reload; no element with `color == backgroundColor`; no `rgb(…)` purple; contrast via axe `color-contrast` | exists UI-01/02 |
| UI-04 | Keyboard + focus | login, dashboard, employee modal | Tab reaches every control; visible focus ring (`outline`/`box-shadow` non-none); Esc closes modal; focus trapped | exists `a11y.spec.ts`, UI-14 |
| UI-05 | axe-core | 12 pages x light/dark | `impact` serious/critical = fail; moderate/minor reported | UPGRADE `a11y.spec.ts` (today it only logs on some pages) |
| UI-06 | Visual regression | 8 pages at 1280x800, light + dark | `toHaveScreenshot({maxDiffPixelRatio: 0.01})`; baselines regenerated per OS in CI (linux) not committed from darwin | UPGRADE 7 specs with snapshots |
| UI-07 | Web vitals smoke | dashboard, employees, payroll runs | inject `web-vitals` from `node_modules` (add dev dep) or PerformanceObserver: LCP < 2.5 s on `next start`, CLS < 0.1 | NEW `perf-vitals.spec.ts` (@perf, build mode only) |
| UI-08 | Bad text scan | every page in UI-01 | body text has no `undefined`, `NaN`, `null`, `[object Object]`, `₹0.00` on totals, `COMPANY NAME`, `Lorem`, `123 Business Street` (payslip header) | NEW `text-scan.spec.ts` |
| UI-09 | Compact sizing | 4 pages | primary buttons `h-9` (36 px), icon buttons have accessible name (drift rule 10) | NEW, reads `scripts/check-styling-drift.mjs` rules |

## 5. Security browser checks (`security` project, fresh context, `@security`)

| ID | Check | Method | Pass rule | Exists |
|---|---|---|---|---|
| SEC-01 | RBAC UI deny + direct URL per role | RBAC-01 matrix | denied copy + no admin API call + API 403 | UPGRADE |
| SEC-02 | API call as wrong role from page context | `page.request` with EMP cookies to `/admin/users`, `/payroll/runs`, `/employees/{other}` | 403/404, body has no data | exists `security-deep.spec.ts` S-SEC-5/6/7 |
| SEC-03 | CSRF on mutations | capture `POST /leave-requests` | `X-XSRF-TOKEN` header equals `XSRF-TOKEN` cookie; same request without header -> 403 | NEW |
| SEC-04 | Cookie flags | login response | `access_token`, `refresh_token` HttpOnly, SameSite Lax/Strict; `Secure` on https only | exists S-SEC-2 |
| SEC-05 | No tokens in storage/URL | after login | `localStorage`/`sessionStorage` values contain no JWT (`/^eyJ/`); URL has no `token=` | NEW (note: `auth-storage` carries user+permissions by design, not a token) |
| SEC-06 | Served JS has no secrets | fetch every `/_next/static/chunks/*.js` listed in the HTML | no `Welcome@123`, no demo emails, no `sk-`, no `BEGIN PRIVATE KEY` | NEW (port of DEF-01 grep) |
| SEC-07 | Security headers | page + API responses | CSP present, `X-Frame-Options` DENY/SAMEORIGIN, `nosniff`, `Referrer-Policy`, no `ACAO: *` | exists S-SEC-1 |
| SEC-08 | Logout invalidates | AUTH-04 | back button + `GET /auth/me` 401 | NEW |
| SEC-09 | Session fixation | set a cookie before login | cookie value changes after login | NEW |
| SEC-10 | Rate limit / lockout UI | `NUAURA_TEST_E2E_lock` user only (created in setup as HRA) | 6th attempt 423/429; login page shows locked/too-many copy; demo accounts never used | UPGRADE `auth-bruteforce-lockout.spec.ts` (un-skip 2) |
| SEC-11 | XSS inert | wall post, wiki body, profile bio, comment with `<img src=x onerror=…>` and `<script>` | no dialog; `page.on('dialog')` never fires; text escaped | UPGRADE S-SEC-3/4 + NEW wiki/profile |
| SEC-12 | Open redirect | `/auth/login?redirect=https://evil.example` and `?returnUrl=//evil.example` | after login stays on same origin | NEW |
| SEC-13 | IDOR id swap | EMP opens `/employees/{other}`, `/me/payslips/{other}`, `/leave/{other}` | 403/404 UI + API | exists S-SEC-5/6, extend to leave/expense |
| SEC-14 | Upload type/size | `.exe` renamed `.pdf`, 11 MB file | 4xx with message; nothing stored | NEW in X-03 |
| SEC-15 | Tenant isolation | TEN-01 | as above | UPGRADE |
| SEC-16 | Download path guard | `GET /files/download?name=../<tenant>/…` | 400/403 (`test.fail` while DEF-TENANT-03 open) | NEW |
| SEC-17 | Password change | AUTH-05 | policy errors for weak password; history of 5 rejected | NEW |

## 6. Upgrade list for existing specs

1. Fixed waits to deterministic: replace all 1,410 `waitForTimeout` with `expect(locator).toBeVisible()`, `page.waitForURL`, `waitForResponse` or the `expectApi` helper. Rule: zero outside `fixtures/`. Start with the 10 worst files (section 1.1).
2. Selectors: add `data-testid` to the 22 app files that already have one plus the controls each P0 test touches (login form, leave apply/approve, payroll actions, candidate stage, OKR, wiki publish, wall composer, app switcher items). Specs use `getByTestId` or `getByRole(name)`; `getByText` only for assertions, never for actions. Remove the 95 class locators (`[class*="success"]` in `utils/helpers.ts` ValidationHelper).
3. Duplicated login to storageState: delete `loginAs` calls in the 100 specs; assign each spec to a role project (`testMatch` by folder: move specs into `e2e/roles/<role>/` or tag `@role:emp`). Multi-actor specs use `browser.newContext({storageState: authFile(role)})`.
4. Skipped tests: triage the 63 sites: fix (feature exists), delete (feature removed), or `test.fixme('DEF-id')` with an id. No bare `skip`.
5. Helpers: add `fixtures/api.ts`, `fixtures/db.ts`, `fixtures/console.ts`, `fixtures/data.ts` (section 2); delete `utils/helpers.ts` `ApiMockHelper.mockLoginSuccess` (fake token) and fallback auth paths.
6. Debris: delete `tmp-debug-rbac.spec.ts`, `hire-qa-run.ts`, `remote-deployed-route-smoke.json`, `e2e/.auth/*.json`; gitignore `playwright/.auth/`.
7. Config: remove `--disable-web-security`; `retries` as section 2; 4 CI shards; `PLAYWRIGHT_USE_BUILD=1` path with `next build && next start -p 3000`; viewport 1280x800 default.
8. Snapshots: regenerate on linux in CI, delete darwin PNGs, enable in CI (`--grep-invert` removed) once UI-06 baselines exist.
9. Security spec: S-SEC-10 rate-limit test must target the `NUAURA_TEST_E2E_lock` user, never `nonexistent@…` plus demo accounts in the same minute (shares the per-IP bucket with setup).
10. `generated/README.md`: document role projects and tags; `generate.py` emits `rbac-matrix.json` cells for all 8 demo roles (today 3).

## 7. Task list (Haiku-sized unless marked Sonnet; "run" = command to verify; files are disjoint within a wave)

### Wave 1 - foundation (serial order T1-01 -> T1-02 -> T1-03, then T1-04..T1-08 in parallel)

| ID | Files | Do | Run | Model |
|---|---|---|---|---|
| T1-01 | `playwright.config.ts` | Projects per section 2, remove `--disable-web-security`, retries, viewport, `PW_FIREFOX` gate, blob reporter on CI | `npx playwright test --list --project=emp` lists specs | Sonnet |
| T1-02 | `e2e/auth.setup.ts`, `e2e/fixtures/testData.ts` | Loop over 9 roles, write `playwright/.auth/<role>.json`, 15 s spacing, SA gated by `E2E_ALLOW_SUPER_ADMIN`; create `NUAURA_TEST_E2E_lock` user via API as HRA | `npx playwright test --project=setup` writes 9 files | Sonnet |
| T1-03 | `e2e/fixtures/base.ts` (new), `e2e/fixtures/console.ts` (new) | `test` extended with backend:8080 reroute, console collector, `consoleBudget` option | `npx tsc --noEmit -p e2e/tsconfig.json` (or project tsconfig) | Haiku |
| T1-04 | `e2e/fixtures/api.ts` (new) | `expectApi(page, {method, path, status})` returning JSON | tsc; used by T2 tasks | Haiku |
| T1-05 | `e2e/fixtures/db.ts` (new) | read-only `sql()` port of `lib.mjs:50-59`, `E2E_DB=0` skip | `node -e` smoke: `select 1` | Haiku |
| T1-06 | `e2e/fixtures/data.ts` (new), `scripts/e2e-cleanup.mjs` (new) | `track()` + cleanup fixture; SQL from `evidence/test-data-e2e.md` | run cleanup against local DB, count 0 leftovers | Haiku |
| T1-07 | `e2e/fixtures/helpers.ts` | Delete fallback auth (`createUnsignedJwt`, `seedFallbackCookies`, `buildFallbackAuth`, `ALLOW_LOCAL_AUTH_FALLBACK`); keep `loginAs` for setup only | tsc; `grep -c FALLBACK e2e/fixtures/helpers.ts` = 0 | Haiku |
| T1-08 | delete `e2e/tmp-debug-rbac.spec.ts`, `e2e/hire-qa-run.ts`, `e2e/remote-deployed-route-smoke.json`, `e2e/.auth/*.json`; `.gitignore` | Remove debris | `git status` shows deletions only | Haiku |

### Wave 2 - P0 journeys and regressions (all parallel, one spec per task)

| ID | Files | Do | Run |
|---|---|---|---|
| T2-01 | `e2e/auth-flow.spec.ts`, new `e2e/auth-session.spec.ts` | AUTH-01, AUTH-03, AUTH-04, SEC-08, SEC-09 | `npx playwright test auth-flow auth-session --project=emp --project=security` |
| T2-02 | `e2e/leave-flow.spec.ts` | HRMS-02 with API + DB asserts, port `j2.mjs` | `--project=emp` (uses MGR context inside) |
| T2-03 | `e2e/defect-regressions.spec.ts` | HRMS-03, PAY-03, ADM-01 flows + keep BUG-* tests | `--project=hra` |
| T2-04 | new `e2e/payslip-pdf.spec.ts` | PAY-02 (`%PDF-`, size, net vs DB) | `--project=emp` |
| T2-05 | `e2e/payroll-run.spec.ts` | PAY-01 incl. same-user approve block | `--project=fin` (Sonnet: role for PAYROLL:PROCESS must be confirmed on login) |
| T2-06 | `e2e/hire-to-onboard.spec.ts` | HIRE-01, port `j4.mjs`, console budget 0 for `/letters/templates` | `--project=rec` |
| T2-07 | `e2e/okr.spec.ts` | GROW-01, port `j5.mjs` | `--project=emp` |
| T2-08 | `e2e/fluence-wiki-blogs.spec.ts` | FLU-01, port `j6b.mjs` | `--project=hra` |
| T2-09 | new `e2e/fluence-visibility.spec.ts` | FLU-02 port of `fixverify.mjs`, `test.fail` TEAM/RESTRICTED case | `--project=emp` |
| T2-10 | `e2e/employee-crud.spec.ts` | HRMS-01 with blank code, DB row | `--project=hra` |
| T2-11 | `e2e/app-switcher.spec.ts`, `e2e/my-space.spec.ts` | NAV-01 across roles, NAV-02 un-skip | all role projects |
| T2-12 | `e2e/generated/rbac-redirect.spec.ts`, `e2e/generated/generate.py`, `e2e/generated/rbac-matrix.json` | RBAC-01 for 8 roles with storageState | `python3 e2e/generated/generate.py && npx playwright test generated/rbac-redirect` (Sonnet) |
| T2-13 | `e2e/rbac-tenant-isolation.spec.ts` | TEN-01 two-tenant contexts (Alpha/Beta users from `evidence/test-data-secgate.md`) | `--project=security` (Sonnet) |

### Wave 3 - P1 journeys, security, UI quality (parallel)

| ID | Files | Do | Run |
|---|---|---|---|
| T3-01 | `e2e/attendance-flow.spec.ts` | HRMS-04 + REG-HRMS-02 `test.fail` with `timezoneId: 'Pacific/Kiritimati'` context | `--project=emp` |
| T3-02 | `e2e/expense-end-to-end.spec.ts` | HRMS-05 with upload + approve | `--project=emp` |
| T3-03 | new `e2e/payroll-lop.spec.ts` | PAY-04 serial | `--project=fin --workers=1` |
| T3-04 | new `e2e/rbac-hire.spec.ts`, new `e2e/rbac-grow.spec.ts` | HIRE-02, GROW-02, GROW-03 | `--project=tl --project=mgr` |
| T3-05 | `e2e/review-cycles.spec.ts` | GROW-02 HRM path | `--project=hrm` |
| T3-06 | `e2e/fluence-drive-wall.spec.ts` | FLU-03 + SEC-11 wall/comment | `--project=emp` |
| T3-07 | `e2e/security-deep.spec.ts` | SEC-02/04/07/13 to fixtures, S-SEC-10 to the lock user; split file at 800 lines into `security-headers`, `security-idor`, `security-xss` | `--project=security` (Sonnet) |
| T3-08 | new `e2e/security-csrf-redirect.spec.ts` | SEC-03, SEC-05, SEC-12 | `--project=security` |
| T3-09 | new `e2e/security-bundle-scan.spec.ts` | SEC-06 | `--project=security` |
| T3-10 | `e2e/auth-bruteforce-lockout.spec.ts` | SEC-10 on lock user, un-skip | `--project=security --workers=1` |
| T3-11 | `e2e/file-upload-roundtrip.spec.ts` | X-03 + SEC-14 | `--project=hra` |
| T3-12 | `e2e/ui-ux-deep.spec.ts` | UI-01 at 4 viewports, UI-02 budget; split into `ui-overflow`, `ui-dark`, `ui-states` | `--project=ui` |
| T3-13 | new `e2e/text-scan.spec.ts` | UI-08 | `--project=ui` |
| T3-14 | `e2e/accessibility/a11y.spec.ts` | UI-05: serious/critical fail on all 12 pages, light + dark | `--project=a11y` |
| T3-15 | `e2e/realtime-notification-delivery.spec.ts` | X-01 | `--project=emp` |
| T3-16 | new `e2e/auth-password.spec.ts` | AUTH-05 + SEC-17 on EMP2, restores password | `--project=emp --workers=1` |

### Wave 4 - cleanup, perf, CI (parallel except T4-05 last)

| ID | Files | Do | Run |
|---|---|---|---|
| T4-01..04 | the 10 worst `waitForTimeout` files split 3/3/2/2 (`lifecycle-e2e`, `fluence-wiki-blogs`, `projects` / `integrations-payments`, `recruitment-extended`, `navigation` / `one-on-one`, `my-space` / `reports-extended`, `resource-project-extended`) | item 6.1 + 6.3 (storageState) per file | `grep -c waitForTimeout <file>` = 0; spec green on its role project |
| T4-05 | remaining 50 `loginAs` specs | item 6.3 mechanical | `grep -rl "loginAs(" e2e/*.spec.ts` empty (Haiku, batches of 10 files) |
| T4-06 | 12 files with skips | item 6.4 triage | `grep -rn "test.skip\|\.skip(" e2e` = 0 |
| T4-07 | 7 snapshot specs, delete `*-darwin.png` | item 6.8 | CI job regenerates on linux |
| T4-08 | new `e2e/perf-vitals.spec.ts`, `package.json` (web-vitals dev dep) | UI-07 build-mode only | `PLAYWRIGHT_USE_BUILD=1 npx playwright test perf-vitals` |
| T4-09 | `.github/workflows/e2e.yml` | 4 shards, blob merge, run `ui`/`a11y`/`security`, drop `--grep-invert` after T4-07 | `gh workflow run e2e.yml` green (Sonnet) |
| T4-10 | `e2e/generated/README.md`, `docs/qa/AUTONOMOUS-UI-E2E-RUNBOOK.md` (account table: `saran@` is EMPLOYEE, `admin@` is HR_ADMIN) | item 6.10, docs drift | review only |

## 8. Run order, budget, exit criteria, human decisions

Run order (local, after each wave): `npx playwright test --project=setup` (3 min) -> `--project=smoke` (route-smoke + journeys,
~8 min on `next start`) -> role projects in parallel (~15 min) -> `security` (~6 min, workers 1 for lockout) -> `ui`
(~10 min) -> `a11y` (~5 min). Budget: 45 min local on a warm build, 4 CI shards of 15 min each. Dev-mode (`next dev`) adds
first-compile time; prefer `PLAYWRIGHT_USE_BUILD=1`.

Green means: 0 failed, 0 flaky (no pass-on-retry), every `test.fail` row still failing (a passing `test.fail` is a
"fixed, remove the annotation" signal), console budget 0 on smoke, axe serious/critical 0, overflow 0 at 4 viewports,
`NUAURA_TEST_E2E_%` rows 0 after cleanup, no demo account locked (check `users.locked_until` for `@nulogic.io` after the
security project).

Needs a human decision or authorisation:
1. Prod/Vercel/Railway smoke (`*.production.spec.ts`, `test:e2e:autonomous:*`): BLOCKED until the user authorises remote
   access; never with owner accounts.
2. Which account holds `PAYROLL:PROCESS` for PAY-01 (FIN vs TA vs a PAYROLL_ADMIN demo user that is not documented).
3. Whether SUPER_ADMIN (`fayaz.m@`) may stay as the local route-smoke identity or `tenant.admin@` should replace it
   (route-smoke would then skip `/admin/system/*`).
4. DEF-E2E-06 (4 of 7 balances), D1-D7 in `16-ui-upgrade-plan.md` (employee Fluence access, palette, gross totals) decide
   which `test.fail` rows become real expectations.
5. Alpha/Beta tenant users: keep the seeded `NUAURA_TEST_` tenants in the local DB for TEN-01, or re-seed in setup.
6. Backend fixes referenced by regressions are uncommitted and the running jar may be stale (`15-known-defects.md`,
   `16-ui-upgrade-plan.md` R2): rebuild the backend before Wave 2 runs or every REG-* test fails for the wrong reason.
