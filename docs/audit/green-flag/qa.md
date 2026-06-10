# QA-01 — Green-Flag Audit: Test Matrix, Coverage Assessment, 1-Day Execution Plan

Agent: qa | Date: 2026-06-10 | Scope: P0 modules — auth, employees, leave, attendance, payroll, approvals
Sources: `backend/src/main/resources/db/migration` (V19, V49, V76, V110, V121/V122, V171, V173, V272), `docs/build-kit/04_RBAC_PERMISSION_MATRIX.md`, `backend/src/test`, `frontend/__tests__`, `frontend/e2e`.

---

## 1. Discovered Test Credentials (for UI agent)

Tenant: **NuLogic** — `tenant_id 660e8400-e29b-41d4-a716-446655440001` (only seeded tenant).
Shared password for ALL demo users: **`Welcome@123`** (bcrypt, reset by V121/V122/V173).

> WARNING (QA-1): migration **V272** is fail-closed — if Flyway placeholder
> `demoCredentialsEnabled` != `true` (env `DEMO_CREDENTIALS_ENABLED`), every account below is
> set to `SUSPENDED` with a sentinel password. Confirm the flag is `true` in the environment
> under test BEFORE the UI wave, otherwise every login fails by design.

| Email | Role(s) | Seeded in | Notes |
|---|---|---|---|
| fayaz.m@nulogic.io | SUPER_ADMIN | V19/V171 | Bypasses ALL permission checks (by design) |
| sarankarthick.maran@nulogic.io | SUPER_ADMIN | V19, re-seeded V173 | Second SuperAdmin |
| jagadeesh@nulogic.io | HR_MANAGER | V49 | HR persona for admin-side P0 flows |
| sumit@nulogic.io | MANAGER | V49 | Reporting-manager persona (approvals) |
| mani@nulogic.io | TEAM_LEAD | V49 | Eng lead |
| gokul@nulogic.io | TEAM_LEAD | V49 | Eng lead |
| dhanush@nulogic.io | TEAM_LEAD | V49 | HR lead |
| suresh@nulogic.io | RECRUITMENT_ADMIN | V49 | Out of P0 scope; useful as "wrong-role" actor |
| saran@nulogic.io | EMPLOYEE | V49 | Primary self-service persona |
| raj@nulogic.io | EMPLOYEE | V49 | Second employee (peer-access tests) |
| anshuman@nulogic.io | EMPLOYEE | V49 | |
| arun@nulogic.io / bharath@nulogic.io / chitra@nulogic.io / deepak@nulogic.io | EMPLOYEE | V49 | HR-dept employees |
| priya@nulogic.io | EMPLOYEE | V76 | Projects/allocations persona |
| newjoiner@nulogic.io | EMPLOYEE (minimal) | V110 | New-joiner restriction tests (UC-RBAC-016) |

Seeded roles: `SUPER_ADMIN`, `HR_ADMIN`, `MANAGER`, `EMPLOYEE` (V19) + `TEAM_LEAD`, `HR_MANAGER`, `RECRUITMENT_ADMIN` (V49).
**No demo user holds HR_ADMIN; no FINANCE_ADMIN role/user exists** despite the RBAC matrix naming FinanceAdmin for payroll (see QA-2/QA-3).
Frontend e2e fixtures confirm the same credentials: `frontend/e2e/fixtures/testData.ts` (`DEMO_PASSWORD = 'Welcome@123'`), overridable via `E2E_AUTH_EMAIL` / `E2E_AUTH_PASSWORD` / `E2E_AUTH_TENANT_ID`.

---

## 2. Deep Test Matrix

Precondition legend (referenced as P-codes):

- **P0** — docker-compose up, backend :8080, frontend :3000, migrations ≥ V272 applied, `DEMO_CREDENTIALS_ENABLED=true`
- **P-SA** — P0 + logged in as fayaz.m@nulogic.io (SUPER_ADMIN)
- **P-HR** — P0 + logged in as jagadeesh@nulogic.io (HR_MANAGER)
- **P-MGR** — P0 + logged in as sumit@nulogic.io (MANAGER, has direct reports per V49 org chart)
- **P-EMP** — P0 + logged in as saran@nulogic.io (EMPLOYEE)
- **P-EMP2** — P0 + logged in as raj@nulogic.io (EMPLOYEE, peer of saran)
- **P-NEW** — P0 + logged in as newjoiner@nulogic.io

### 2.1 Authentication & Session (QA-TC-01 .. QA-TC-16)

| ID | Preconditions | Steps | Expected Result |
|---|---|---|---|
| QA-TC-01 | P0 | POST `/api/v1/auth/login` with saran@nulogic.io / Welcome@123 | 200; access token returned; httpOnly refresh cookie set; JWT contains roles only (no permission list) |
| QA-TC-02 | P0 | Login with valid email, wrong password | 401 generic error (no user-exists leak); `failed_login_attempts` incremented |
| QA-TC-03 | P0 | Login with non-existent email | 401 with the SAME generic message/latency class as QA-TC-02 (no enumeration) |
| QA-TC-04 | P0 | 5 consecutive wrong-password attempts for saran@, then correct password | Account locked (AccountLockoutService 5/15min); correct password rejected until lockout expiry; lockout event audit-logged |
| QA-TC-05 | P0 | 6+ rapid login attempts from one IP | 429 from rate limiter (5/min auth tier) before lockout exhausts |
| QA-TC-06 | P0 | Login with empty body / malformed JSON / SQLi payload `' OR 1=1--` in email | 400 validation error; no 500; no stack trace in body |
| QA-TC-07 | P-EMP | Call any protected API with no Authorization/cookie | 401 (not 403, not 500); standard ApiResponse error shape |
| QA-TC-08 | P-EMP | Call protected API with expired JWT | 401; frontend Axios interceptor attempts refresh, then redirects to /login if refresh fails |
| QA-TC-09 | P-EMP | Call protected API with tampered JWT (bit-flipped signature) | 401; signature failure; no claims trusted |
| QA-TC-10 | P-EMP | Logout, then replay the previous access token | 401 — token is in Redis blacklist (TokenBlacklistService); ConcurrentHashMap fallback if Redis down |
| QA-TC-11 | P-EMP | Refresh-token rotation: use refresh once, then re-use the same refresh token | Second use rejected 401; session invalidated (replay detection) |
| QA-TC-12 | P0 | Password change to `short1!` (7 chars) and to a previous password | Both rejected — policy 12+ chars, upper/lower/digit/special, history of 5 |
| QA-TC-13 | P-EMP | Open app in two tabs, logout in tab 1, act in tab 2 | Tab 2 first API call gets 401 and is bounced to login; no silent stale-session writes |
| QA-TC-14 | P0 | POST state-changing endpoint without CSRF double-submit cookie pair (browser context) | 403 CSRF rejection |
| QA-TC-15 | P0 | Login as suspended user (set a demo user SUSPENDED, or run with V272 active) | 401/403 "account disabled"; no token issued |
| QA-TC-16 | P0 | Inspect login/logout/lockout rows in audit log as SA | `audit_logs` rows exist with tenant_id, actor, IP, timestamp for each auth event |

### 2.2 RBAC / Permission Boundaries (QA-TC-17 .. QA-TC-32)

| ID | Preconditions | Steps | Expected Result |
|---|---|---|---|
| QA-TC-17 | P-SA | Visit every P0 admin page (employees list, payroll runs, leave admin, attendance admin, approvals, roles) | ALL render and ALL actions succeed — SuperAdmin bypass WORKS (by design, never blocked) |
| QA-TC-18 | P-SA | Hit a deliberately permission-gated API (e.g. `payroll.run.execute`) without explicit role_permission row | 200 — bypass applies at PermissionEvaluator level, not just UI |
| QA-TC-19 | P-EMP | GET `/api/v1/employees` (full directory w/ sensitive fields) and GET another employee's full profile by ID | Directory limited to permitted fields; other profile's salary/bank/sensitive sections 403 or omitted (`employee.read.salary` denied) |
| QA-TC-20 | P-EMP | Direct-URL navigate to `/admin/*`, payroll runs, role management pages | UI redirects/403 page (AuthGuard + PermissionGate); APIs behind them return 403 |
| QA-TC-21 | P-EMP | Attempt `leave.request.approve` on own pending request via API | 403 — self-approval blocked; approver scope only |
| QA-TC-22 | P-MGR | View team leave/attendance for a DIRECT report vs an employee outside team | Direct report visible (scope=team); outside-team employee 403/filtered out |
| QA-TC-23 | P-MGR | Approve a leave request belonging to another manager's report | 403 — approver must be in approval chain |
| QA-TC-24 | P-HR | Employee CRUD, leave admin, attendance regularization approve across whole tenant | Allowed (tenant scope); role behaves per V107/V113 role_permissions |
| QA-TC-25 | P-HR | Attempt role.create / role.delete / tenant settings update | Per matrix HR_MANAGER lacks `role.manage` → 403 (only SA/HR_ADMIN) |
| QA-TC-26 | P-NEW | Login as newjoiner@, enumerate sidebar + call employees/payroll/leave-admin APIs | Minimal module set; restricted APIs 403; baseline self-service only (UC-RBAC-016) |
| QA-TC-27 | P-EMP | Forge request with `X-User-Id`/`employeeId` of raj@ in body to read raj's payslip | 403/404 — ownership derived from token, not request params (IDOR negative) |
| QA-TC-28 | P-EMP2 | GET saran's leave request by sequential/guessed UUID | 403/404 — scope check on resource owner, not just endpoint |
| QA-TC-29 | P-SA | Remove a permission from EMPLOYEE role, have saran re-login, retry the action | Action now 403; permission change effective after cache eviction (Redis permission cache TTL/evict) |
| QA-TC-30 | P-EMP | Compare UI gating vs API: for 5 hidden buttons, call the underlying API directly | Every UI-hidden action is ALSO 403 at API (no UI-only security) |
| QA-TC-31 | P-MGR | Self-escalation attempt: POST role-assign granting self SUPER_ADMIN | 403 — `role.assign` denied to MANAGER |
| QA-TC-32 | P-SA | Audit log review after QA-TC-29/31 | role-permission change and denied escalation attempt both present in audit log |

### 2.3 Employees Module (QA-TC-33 .. QA-TC-44)

| ID | Preconditions | Steps | Expected Result |
|---|---|---|---|
| QA-TC-33 | P-HR | Create employee with all required fields | 201; appears in directory; user link optional; audit row created |
| QA-TC-34 | P-HR | Create employee with duplicate `employee_code` and duplicate work email | 409/400 with field-level message; no partial row committed |
| QA-TC-35 | P-HR | Create with invalid email format, joining_date in far future (e.g. 2099), DOB making age < 14, 1-char name, 300-char name | Each rejected 400 by Zod (UI) AND Bean Validation (API); boundary values at exact limits accepted |
| QA-TC-36 | P-HR | Update employee designation/department; concurrent update from second session (stale `version`) | First 200; second 409 optimistic-lock conflict (JPA @Version) |
| QA-TC-37 | P-HR | Soft-delete employee, then list + fetch by ID | Removed from default lists (`is_deleted=true` filter); direct GET 404; row retained in DB |
| QA-TC-38 | P-EMP | Update own profile field allowed for self (phone) and a restricted field (salary, employee_code) | Phone 200; restricted field 403 or silently not-updatable — must NOT persist |
| QA-TC-39 | P-HR | Employee bulk import (Excel) with 1 valid + 1 duplicate + 1 invalid row | Valid row imported; per-row errors reported; no all-or-nothing silent failure; formula-injection cells sanitized |
| QA-TC-40 | P-HR | Search/filter directory with empty result criteria | Friendly empty state in UI; API 200 with empty page, not 404/500 |
| QA-TC-41 | P-EMP | View own bank/identity documents section | Own data visible; values encrypted at rest (EncryptedStringConverter) — verify ciphertext in DB |
| QA-TC-42 | P-HR | Create employee while backend kills DB connection mid-request (or 500 simulated) | UI shows error toast with retry; no duplicate created on retry (idempotency) |
| QA-TC-43 | P-HR | GET employees page=0 size=10000, size=-1, page=99999 | Size capped (max page size), negatives 400, far page returns empty 200 |
| QA-TC-44 | P-SA | Audit: employee create/update/delete events | Each carries actor, tenant_id, before/after or change summary |

### 2.4 Leave Module (QA-TC-45 .. QA-TC-56)

| ID | Preconditions | Steps | Expected Result |
|---|---|---|---|
| QA-TC-45 | P-EMP | Apply leave within balance, view in My Leave | 201 PENDING; balance shows pending deduction; manager notified |
| QA-TC-46 | P-EMP | Apply leave exceeding available balance | 400 with balance message (unless leave type allows negative — verify per policy engine config) |
| QA-TC-47 | P-EMP | Apply with end_date < start_date; same-day half-day overlap; date 2020-02-30 | All 400 validation; calendar invalid date impossible in UI |
| QA-TC-48 | P-EMP | Apply overlapping an existing approved leave | 409/400 overlap rejection |
| QA-TC-49 | P-EMP | Duplicate submit: double-click apply (two identical POSTs) | Exactly one request created (idempotency/disable-on-submit) |
| QA-TC-50 | P-MGR | Approve direct report's leave; verify balance + notification + audit | Status APPROVED; balance deducted exactly once; employee notified; audit row |
| QA-TC-51 | P-MGR | Reject with comment; then employee cancels a separate APPROVED leave | Reject restores pending balance; cancel of approved leave follows policy (re-credit) and notifies approver |
| QA-TC-52 | P-EMP | Cancel someone else's request (raj's) by ID | 403/404 |
| QA-TC-53 | P-MGR | Approve an already-approved request (replay) and an already-cancelled one | 409/400 invalid state transition — no double deduction |
| QA-TC-54 | P-HR | Adjust leave balance manually (`leave.balance.adjust`) with negative and absurd (9999) values | Bounded validation; adjustment audit-logged with reason |
| QA-TC-55 | P-EMP | Apply leave spanning a holiday/weekend | Day count excludes non-working days per policy engine; verify computed days shown = persisted days |
| QA-TC-56 | P-EMP | New employee (newjoiner@) views leave balances before any accrual | Empty/zero state renders cleanly; no NPE/500; accrual job not assumed |

### 2.5 Attendance Module (QA-TC-57 .. QA-TC-66)

| ID | Preconditions | Steps | Expected Result |
|---|---|---|---|
| QA-TC-57 | P-EMP | Punch in, punch out same day | Record created; duration computed; visible in My Attendance |
| QA-TC-58 | P-EMP | Double punch-in without punch-out; punch-out without punch-in | Handled per config — either rejected 400 or paired logically; never two open sessions |
| QA-TC-59 | P-EMP | Punch with client clock skewed / timezone differing from tenant TZ | Server time + TenantTimeProvider wins; record lands on correct tenant-local date |
| QA-TC-60 | P-EMP | Submit regularization for a past date with reason; for a future date | Past 201 PENDING (within allowed window); future date 400 |
| QA-TC-61 | P-MGR | Approve/reject regularization of direct report; attempt for non-report | Direct report OK + audit; non-report 403 |
| QA-TC-62 | P-EMP | Apply overtime > 24h/day or negative hours | 400 boundary validation; exactly 24:00 edge handled |
| QA-TC-63 | P-EMP2 | GET saran's attendance records by employee ID | 403/filtered — attendance is self/team scoped |
| QA-TC-64 | P-HR | View tenant attendance report for a month with zero records | Empty state, totals = 0, no division-by-zero errors |
| QA-TC-65 | P-EMP | Punch while backend returns 503 (stop backend briefly) | UI error with retry; on retry no duplicate punch for same minute |
| QA-TC-66 | P-SA | Audit: regularization approve/reject events logged | Present with actor + before/after status |

### 2.6 Payroll Module (QA-TC-67 .. QA-TC-76)

| ID | Preconditions | Steps | Expected Result |
|---|---|---|---|
| QA-TC-67 | P-SA | Create payroll run for current period, execute, review results | Run completes; payslips generated; statutory deductions computed; saga/steps observable |
| QA-TC-68 | P-SA | Create a second run for the SAME period | 409 duplicate-period rejection (period lock — PayrollPeriodLockTest behavior) |
| QA-TC-69 | P-SA | Attempt to edit/delete a FINALIZED run or its payslips | 403/409 — locked period immutable; adjustments only via payroll_adjustments flow |
| QA-TC-70 | P-EMP | View own payslip; attempt raj's payslip by ID; export own payslip PDF | Own 200 + PDF renders; other's 403/404 (IDOR) |
| QA-TC-71 | P-HR | (As HR_MANAGER) attempt payroll run execute and salary-structure delete | Per role_permissions — verify expected grant; if not granted, 403. Document actual vs matrix |
| QA-TC-72 | P-SA | Salary structure with negative basic, component percentages summing > 100%, 0 value | 400 each; exact 100% accepted |
| QA-TC-73 | P-SA | Run payroll for employee mid-month joiner and mid-month exit | Pro-rated correctly per rule engine; spot-check arithmetic vs `06_PAYROLL_RULE_ENGINE.md` |
| QA-TC-74 | P-SA | Approved leave (LOP type) in period, then run payroll | LOP days reflected in payslip (cross-module: LeaveApprovalPayrollImpactTest path) |
| QA-TC-75 | P-SA | Payroll run when Kafka/Redis down (docker stop) | Run fails gracefully or degrades (Bucket4j/in-memory fallbacks); no half-written payslips; idempotent re-run |
| QA-TC-76 | P-SA | Audit + export rate limit: export payslips 6 times in 5 min | 6th export 429 (5/5min export tier); exports audit-logged |

### 2.7 Approvals / Workflow Engine (QA-TC-77 .. QA-TC-84)

| ID | Preconditions | Steps | Expected Result |
|---|---|---|---|
| QA-TC-77 | P-EMP | Submit request entering a 2-level chain (e.g. leave > N days) | Level-1 approver gets task; level-2 NOT yet actionable |
| QA-TC-78 | P-MGR | Approve level-1; verify advance to level-2; final approval applies effect exactly once | Chain advances; terminal callback (balance/payroll effect) idempotent |
| QA-TC-79 | P-MGR | Approve same task twice rapidly (double-click / two tabs) | Second attempt 409 invalid transition; single state change |
| QA-TC-80 | P-EMP2 | Act on an approval task NOT assigned to raj (by task ID) | 403 |
| QA-TC-81 | P-MGR | Delegation: enable auto-delegation/OOO, submit new request | Task routes to delegate (WorkflowServiceAutoDelegation path); audit shows delegation |
| QA-TC-82 | P-SA | SuperAdmin force-approve/override any pending task | Succeeds (bypass by design); override flagged distinctly in audit log |
| QA-TC-83 | P-MGR | Withdraw/cancel by requester after level-1 approved but before final | Per workflow config — task closed cleanly; approvers notified; no orphan tasks |
| QA-TC-84 | P-SA | Approvals inbox with zero pending items; workflow API with unknown entity type | Clean empty state; unknown type 400 not 500 |

### 2.8 Tenant Isolation (QA-TC-85 .. QA-TC-89)

| ID | Preconditions | Steps | Expected Result |
|---|---|---|---|
| QA-TC-85 | P0 + second tenant seeded (e2e `test-tenant-seed.ts` or manual) | Login tenant-B user, GET tenant-A employee/leave/payslip IDs | 404/403 — RLS + tenant_id filter; zero cross-tenant rows in any list |
| QA-TC-86 | P-EMP | Send `X-Tenant-Id`/tenantId param of another tenant on requests | Ignored — tenant resolved from JWT only |
| QA-TC-87 | P-SA | SuperAdmin cross-tenant access | Works per design (global role); verify it is audit-logged with target tenant |
| QA-TC-88 | P0 | Trigger a scheduled job (leave accrual) with 2 tenants | Job processes per-tenant; no tenant-A data mutated by tenant-B context (ScheduledJobTenantIsolationTest behavior live) |
| QA-TC-89 | P0 | Check RLS GUC on a pooled connection after request completes (psql) | `app.tenant_id` GUC reset between requests; RlsStartupProbe green |

---

## 3. Existing Automated Coverage Assessment

### Backend (`backend/src/test` — 308 Java test files) — STRONG for P0

| P0 Domain | Unit/Service | Controller | Integration | E2E | Verdict |
|---|---|---|---|---|---|
| Auth | AuthServiceTest, MfaServiceTest, PasswordPolicyServiceTest, AccountLockoutServiceTest, JwtTokenProviderTest, TokenBlacklistServiceTest | AuthControllerTest, AuthControllerSecurityTest, MfaControllerTest | integration/AuthControllerTest | e2e/AuthenticationE2ETest | Covered |
| Employees | EmployeeServiceTest, ImportParser/ValidationServiceTest, DepartmentServiceTest | EmployeeControllerTest, DirectoryControllerTest, ImportControllerTest | integration/EmployeeControllerTest, AdminEmployeeUpdateRequest403Test | crossmodule/EmployeeLifecycleEventTest | Covered |
| Leave | LeaveRequestServiceTest, LeaveBalanceServiceTest, LeaveTypeServiceTest, mappers | LeaveRequestControllerTest, LeaveRequestControllerScopeTest, Balance/Type | LeaveRequestController/ScopeIntegrationTest | e2e/LeaveRequestE2ETest, crossmodule/LeaveApprovalPayrollImpactTest | Covered |
| Attendance | AttendanceRecordServiceTest, HolidayServiceTest, TenantAttendanceConfigServiceTest | AttendanceControllerTest, CompOffControllerTest | integration/AttendanceControllerTest | e2e/AttendanceE2ETest | Covered |
| Payroll | PayrollRunServiceTest, PayslipServiceTest, PayrollPeriodLockTest, SalaryStructure, StatutoryDeduction/Filing | PayrollControllerTest + AnnotationTest, StatutoryControllerTest | integration/PayrollControllerTest, StatutoryIntegrationTest | e2e/PayrollE2ETest | Covered |
| Approvals | ApprovalServiceTest, WorkflowServiceTest, AutoDelegationTest, CallbackHandlerTest | ApprovalControllerTest, WorkflowControllerTest | ApprovalChainIntegrationTest | — | Covered |
| Cross-cutting security | CustomPermissionEvaluatorTest, PermissionAspectTest, RbacAnnotationCoverageTest, DataScopeServiceTest, RoleHierarchyTest, TenantIsolationTest + NegativeTest, RbacUseCaseBoundaryTest, RlsTenantGucScopeTest, ScheduledJobTenantIsolationTest, MultiTenantAsyncIsolationTest, JwtSecurityTest | | | | Covered |

JaCoCo configured in `backend/pom.xml` (verify enforcement threshold is active in CI).

### Frontend (204 test/spec files)

- **Vitest unit/integration**: only ~16 files — 7 integration flows (`__tests__/integration/`: auth, leave, payroll, approval, employee, compensation, notification), AuthGuard, PermissionGate, AppSwitcher, Sidebar + 5 small UI components. **Thin relative to 50+ routes** — hooks/stores/forms largely untested at unit level.
- **Playwright e2e (~140 specs)**: dense P0 coverage — `auth*.spec.ts` (incl. `auth-bruteforce-lockout`), `employee-crud`, `leave-flow`/`leave-approval-chain`, `attendance-flow`, `payroll-run`/`payroll-end-to-end`/`payroll-disbursement`/`payroll-statutory`, `approvals-workflows`, full RBAC suite (`rbac-matrix`, `rbac-action-matrix`, `rbac-superadmin`, `rbac-employee-boundaries`, `rbac-manager-boundaries`, `rbac-tenant-isolation`), `security-deep`, `edge-cases/{network,validation}`, `all-demo-users-smoke`, a11y, mobile.

### Net coverage gaps → issues table (Section 4)

---

## 4. Issues (Coverage Gaps & Risks)

| ID | Severity | Module | Description | Impact | Exact Fix | Owner Agent | Status |
|---|---|---|---|---|---|---|---|
| QA-1 | HIGH | auth / env | V272 fail-closed lockdown SUSPENDS all demo users and randomizes passwords unless `DEMO_CREDENTIALS_ENABLED=true` is set (Flyway placeholder `demoCredentialsEnabled`). | Entire manual + UI-agent test pass is blocked with 401s if flag unset; conversely flag accidentally `true` in prod re-exposes Welcome@123 SUPER_ADMINs. | Before UI wave: confirm `DEMO_CREDENTIALS_ENABLED=true` in local env; add release-checklist item asserting it is UNSET/false in prod deploy values. | release-readiness | OPEN |
| QA-2 | HIGH | payroll / RBAC | RBAC matrix (04_RBAC_PERMISSION_MATRIX.md) defines a FinanceAdmin persona for payroll, but no FINANCE_ADMIN role or user is seeded in any migration. | Payroll permission boundaries are only exercised as SUPER_ADMIN (bypass) vs EMPLOYEE (deny) — the intended finance-scoped grant set is untested and may be wrong/missing in role_permissions. | Seed a FINANCE_ADMIN role + demo user (new migration or test-setup script) with the payroll/expense grant set from the matrix; add rbac e2e spec rows for it. | rbac | OPEN |
| QA-3 | MEDIUM | RBAC | HR_ADMIN role exists (V19, id 550e8400-…440021) but no seeded user holds it; jagadeesh@ holds the V49 custom HR_MANAGER role instead. | HR_ADMIN grant path (incl. `role.manage`, tenant settings) never exercised by demo logins or e2e fixtures; drift between HR_ADMIN and HR_MANAGER permissions can go unnoticed. | Assign HR_ADMIN to one demo user (e.g. arun@) via migration or test seed; add to `testData.ts` and rbac specs. | rbac | OPEN |
| QA-4 | MEDIUM | frontend | Frontend unit-test coverage is thin: ~16 vitest files vs 50+ routes; forms (RHF+Zod schemas), React Query hooks, and Zustand stores are untested at unit level — quality rides almost entirely on Playwright. | Validation-schema regressions and hook logic bugs surface only as slow e2e failures (or escape entirely when e2e selectors drift). | Post-launch: add vitest suites for Zod schemas of P0 forms (login, employee create, leave apply, regularization) and auth store; enforce coverage floor in CI. | dev | OPEN |
| QA-5 | MEDIUM | seed data | Seed UUID drift: V19 maps user id `…440030` → sarankarthick while V171 maps the SAME id → fayaz (both ON CONFLICT DO NOTHING); V173 re-seeds sarankarthick under new id `…440032`. Outcome depends purely on migration order. | Fixtures or FK references keyed on user UUIDs can bind to the wrong human; fresh vs legacy DBs differ in id→email mapping; confusing for tenant-restore tooling. | Treat email as the only stable demo-user key in all fixtures/tests; add a verification migration or doc note; never reference `…440030/440032` by id. | data | OPEN |
| QA-6 | LOW | auth / seed | Demo password `Welcome@123` is 11 chars — violates the platform's own 12+ char policy; also `password_changed_at=NOW()` resets the 90-day clock on every re-migration. | If login-time policy enforcement or forced-rotation is ever enabled, all demo logins break mid-test; minor realism gap. | Acceptable for demo; document exception, or rotate demo seed to a 12+ char password in next seed revision. | dev | OPEN |
| QA-7 | LOW | tenant isolation | Only one tenant (NuLogic) is migration-seeded; cross-tenant UI tests depend on `frontend/e2e/fixtures/test-tenant-seed.ts` runtime seeding. | If runtime tenant-B seeding fails (admin API perms, V272), QA-TC-85..88 silently degrade to skipped — isolation goes live-unverified at UI level. | During execution: run `rbac-tenant-isolation.spec.ts` first and treat any skip as FAIL; verify tenant-B rows exist before the suite. | qa (self) | OPEN |
| QA-8 | LOW | CI | JaCoCo plugin present in `backend/pom.xml` but enforcement threshold/`check` goal binding not verified; no visible frontend coverage gate. | 308 test files can still mask uncovered new code if the ratchet isn't enforced in CI. | Verify `jacoco:check` ratio in CI pipeline; add `vitest --coverage` threshold to frontend CI. | release-readiness | OPEN |

---

## 5. Prioritized 1-Day Execution Checklist

Hard rule: SuperAdmin bypass is BY DESIGN — Block A test 2 verifies it WORKS.

**Block A — Gate checks (first 30 min, blocks everything else)**
1. [ ] Env up; confirm `DEMO_CREDENTIALS_ENABLED=true`; login smoke for fayaz.m@, jagadeesh@, sumit@, saran@, raj@, newjoiner@ (QA-1 gate)
2. [ ] QA-TC-17/18 — SuperAdmin bypass works everywhere
3. [ ] Run existing automation as baseline: `cd backend && ./mvnw test -Dtest='*Auth*,*Leave*,*Payroll*,*Attendance*,*Employee*,*Approval*,*Tenant*,*Rbac*'` and `cd frontend && npx playwright test e2e/auth*.spec.ts e2e/rbac-*.spec.ts e2e/all-demo-users-smoke.spec.ts`

**Block B — Security-critical manual (morning, ~3h)**
4. [ ] Auth: QA-TC-01..11, 14 (lockout, blacklist replay, refresh reuse, CSRF)
5. [ ] RBAC boundaries: QA-TC-19..23, 26..28, 30, 31 (IDOR + scope + UI-vs-API parity)
6. [ ] Tenant isolation: QA-TC-85..87 (treat skipped tenant-B seeding as FAIL — QA-7)

**Block C — P0 business flows (afternoon, ~3h)**
7. [ ] Leave lifecycle: QA-TC-45..53 (incl. double-submit, double-approve, state replay)
8. [ ] Payroll: QA-TC-67..70, 72, 74 (period lock, finalized immutability, payslip IDOR, LOP cross-module)
9. [ ] Approvals: QA-TC-77..80, 82 (chain, idempotent terminal effect, SA override audit)
10. [ ] Employees: QA-TC-33..38 (duplicates, optimistic lock, soft delete, self-update restriction)
11. [ ] Attendance: QA-TC-57..61, 63

**Block D — Resilience & polish (if time remains, ~1.5h)**
12. [ ] API failures/empty states: QA-TC-42, 56, 64, 65, 75, 84; `npx playwright test e2e/edge-cases/`
13. [ ] Boundary/limits: QA-TC-35, 43, 54, 62, 72, 76
14. [ ] Audit-log sweep: QA-TC-16, 32, 44, 66, 76, 82, 87 in one pass as SA
15. [ ] Session edge: QA-TC-12, 13, 15

**Defer (post-green-flag):** QA-TC-39 (bulk import depth), QA-TC-55 (holiday math), QA-TC-59 (TZ skew), QA-TC-73 (pro-ration arithmetic), QA-TC-81/83 (delegation/withdraw), QA-TC-88/89 (job isolation, RLS GUC probe — already unit-tested).
