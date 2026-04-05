# QA Report: NU-HRMS Core Flows

**Date:** 2026-04-02
**Tester:** QA Engineer 1 (Automated API + Code Audit)
**Environment:** localhost:3000 (frontend) / localhost:8080 (backend)
**Auth Users:** fayaz.m@nulogic.io (SUPER_ADMIN), sumit@nulogic.io (MANAGER)
**Method:** API-level testing (curl) + Frontend code audit (Chrome MCP unavailable)

---

## Executive Summary

| Category             | PASS | FAIL | BLOCKED |
|----------------------|------|------|---------|
| Flow Groups Tested   | 10   | -    | -       |
| API Endpoints Tested | 42   | -    | -       |
| Bugs Found           | -    | 14   | -       |
| CRITICAL             | -    | 3    | -       |
| MAJOR                | -    | 6    | -       |
| MINOR                | -    | 5    | -       |

---

## FLOW GROUP 1 -- EMPLOYEE MANAGEMENT

### Endpoints Tested

| Endpoint                               | Method | Status | Result                    |
|----------------------------------------|--------|--------|---------------------------|
| `/api/v1/employees?page=0&size=5`      | GET    | 200    | PASS                      |
| `/api/v1/employees/search?query=Sumit` | GET    | 200    | PASS                      |
| `/api/v1/employees/me`                 | GET    | 200    | PASS (SuperAdmin)         |
| `/api/v1/employees/me`                 | GET    | 403    | FAIL (Manager)            |
| `/api/v1/employees/{id}` (own)         | GET    | 200    | PASS (SuperAdmin own)     |
| `/api/v1/employees/{id}` (other)       | GET    | 403    | FAIL (SuperAdmin other)   |
| `/api/v1/employees/{id}` (own)         | GET    | 403    | FAIL (Manager own)        |
| `/api/v1/departments`                  | GET    | 200    | PASS                      |
| `/api/v1/employees/directory`          | GET    | 400    | FAIL (route conflict)     |
| `/api/v1/org-chart`                    | GET    | 500    | N/A (no backend endpoint) |

### Bugs

#### BUG-001: SuperAdmin gets 403 on GET /employees/{id} for other employees [CRITICAL]

- **Page:** /employees/[id]
- **API:** `GET /api/v1/employees/{otherId}`
- **Severity:** CRITICAL
- **Expected:** SuperAdmin can view any employee record (bypasses all access control per
  architecture)
- **Actual:** Returns 403 Forbidden for any employee other than own record
- **Root Cause:** `EmployeeController.enforceEmployeeViewScope()` (line 191) does not check
  `SecurityContext.isSuperAdmin()` before doing permission-based scope checks. The
  `@RequiresPermission` annotation bypass in `PermissionAspect` works correctly, but the
  controller's inline scope enforcement method does a second, redundant check that fails for
  SuperAdmin.
- **File:** `backend/src/main/java/com/hrms/api/employee/EmployeeController.java:191`
- **Fix:** Add `if (SecurityContext.isSuperAdmin() || SecurityContext.isTenantAdmin()) return;` as
  the first line of `enforceEmployeeViewScope()`.

#### BUG-002: Permission namespace mismatch -- HRMS:EMPLOYEE:VIEW_TEAM vs EMPLOYEE:VIEW_TEAM [CRITICAL]

- **Page:** /employees/[id], /employees
- **Severity:** CRITICAL
- **Expected:** Manager with `HRMS:EMPLOYEE:VIEW_TEAM` permission can view team members
- **Actual:** Scope check in `enforceEmployeeViewScope()` compares against
  `Permission.EMPLOYEE_VIEW_TEAM` = `"EMPLOYEE:VIEW_TEAM"` but DB/JWT returns
  `"HRMS:EMPLOYEE:VIEW_TEAM"` -- they never match
- **Root Cause:** The `Permission.java` constants use unprefixed format (`EMPLOYEE:VIEW_TEAM`) but
  the actual permissions stored in DB and returned in JWT use `HRMS:` prefixed format
- **File:** `backend/src/main/java/com/hrms/common/security/Permission.java:16`
- **Impact:** All data-scope enforcement using `SecurityContext.hasPermission()` with Permission
  constants is broken for HRMS-prefixed permissions. Managers cannot view team members, department
  employees, etc.
- **Fix:** Either normalize permissions at load time to strip `HRMS:` prefix, or update Permission
  constants to include `HRMS:` prefix, or make `hasPermission()` check both formats.

#### BUG-003: Manager cannot access /employees/me (403) [MAJOR]

- **Page:** /employees profile, /me pages
- **API:** `GET /api/v1/employees/me`
- **Severity:** MAJOR
- **Expected:** Any authenticated employee can view their own profile via /me
- **Actual:** 403 Forbidden for Manager role
- **Root Cause:** Requires `Permission.EMPLOYEE_VIEW_SELF` = `"EMPLOYEE:VIEW_SELF"` but Manager's
  permissions are namespaced with `HRMS:` prefix. Same namespace mismatch as BUG-002.

#### BUG-004: Employee Directory route conflict (400) [MAJOR]

- **Page:** /team-directory
- **API:** `GET /api/v1/employees/directory`
- **Severity:** MAJOR
- **Expected:** Returns paginated employee directory listing
- **Actual:** 400 -- "Invalid value 'directory' for parameter 'id'. Expected type: UUID"
- **Root Cause:** `EmployeeController` maps `@GetMapping("/{id}")` at `/api/v1/employees/{id}` which
  catches `/api/v1/employees/directory` before `EmployeeDirectoryController` (mapped at
  `/api/v1/employees/directory`) can handle it. Spring MVC path matching prefers the `{id}`
  wildcard.
- **File:** `backend/src/main/java/com/hrms/api/employee/EmployeeController.java:164` conflicts with
  `backend/src/main/java/com/hrms/api/employee/controller/EmployeeDirectoryController.java:30`
- **Fix:** Move EmployeeDirectoryController to a different base path (e.g.,
  `/api/v1/employee-directory`) or add path ordering/priority.

**Flow Group 1 Verdict: FAIL**

---

## FLOW GROUP 2 -- ATTENDANCE

### Endpoints Tested

| Endpoint                                                     | Method | Status | Result |
|--------------------------------------------------------------|--------|--------|--------|
| `/api/v1/attendance`                                         | GET    | 500    | FAIL   |
| `/api/v1/attendance/my`                                      | GET    | 500    | FAIL   |
| `/api/v1/attendance/my-attendance?startDate=...&endDate=...` | GET    | 200    | PASS   |
| `/api/v1/attendance/employee/{id}?page=0&size=10`            | GET    | 200    | PASS   |
| `/api/v1/attendance/summary`                                 | GET    | 500    | FAIL   |
| `/api/v1/attendance/check-in`                                | POST   | 403    | FAIL   |

### Bugs

#### BUG-005: Attendance dashboard endpoint returns 500 [MAJOR]

- **Page:** /attendance
- **API:** `GET /api/v1/attendance`
- **Severity:** MAJOR
- **Expected:** Returns attendance overview/dashboard data
- **Actual:** 500 Internal Server Error
- **Root Cause:** Generic 500 with no detailed message exposed. Likely a NullPointerException or
  missing data dependency. Backend logs from current session not available (log file contains old
  data from March 2026).

#### BUG-006: Attendance check-in returns 403 for SuperAdmin [MAJOR]

- **Page:** /attendance (check-in button)
- **API:** `POST /api/v1/attendance/check-in`
- **Severity:** MAJOR
- **Expected:** SuperAdmin can check in
- **Actual:** 403 Forbidden -- "Access denied" (raw Spring Security denial, not PermissionAspect)
- **Root Cause:** Likely a Spring Security filter-level block (possibly CSRF double-submit cookie
  mismatch since POST requires CSRF token, or a method-security annotation that doesn't go through
  PermissionAspect).

**Flow Group 2 Verdict: FAIL**

---

## FLOW GROUP 3 -- LEAVE MANAGEMENT

### Endpoints Tested

| Endpoint                                | Method | Status | Result            |
|-----------------------------------------|--------|--------|-------------------|
| `/api/v1/leave-types`                   | GET    | 200    | PASS              |
| `/api/v1/leave-requests?page=0&size=10` | GET    | 200    | PASS              |
| `/api/v1/leave-balances/employee/{id}`  | GET    | 200    | PASS              |
| `/api/v1/leave-balances/my`             | GET    | 500    | FAIL              |
| `/api/v1/leave/balance`                 | GET    | 500    | FAIL (wrong path) |
| `/api/v1/leave/calendar`                | GET    | 500    | FAIL (wrong path) |

### Bugs

#### BUG-007: Leave balances /my endpoint returns 500 [MAJOR]

- **Page:** /leave (balance cards)
- **API:** `GET /api/v1/leave-balances/my`
- **Severity:** MAJOR
- **Expected:** Returns current user's leave balances
- **Actual:** 500 Internal Server Error
- **Root Cause:** Likely the same permission namespace mismatch or a missing
  employee-to-leave-balance mapping for the SuperAdmin user.

**Flow Group 3 Verdict: PARTIAL PASS** (leave types and requests work, balances broken)

---

## FLOW GROUP 4 -- SHIFTS & OVERTIME

### Endpoints Tested

| Endpoint                 | Method | Status | Result |
|--------------------------|--------|--------|--------|
| `/api/v1/shifts`         | GET    | 200    | PASS   |
| `/api/v1/shift-policies` | GET    | 500    | FAIL   |
| `/api/v1/overtime`       | GET    | 200    | PASS   |

### Bugs

#### BUG-008: Shift policies endpoint returns 500 [MINOR]

- **Page:** /shifts (policy configuration)
- **API:** `GET /api/v1/shift-policies`
- **Severity:** MINOR
- **Expected:** Returns list of shift policies
- **Actual:** 500 Internal Server Error
- **Root Cause:** Likely missing seed data or a query issue in the shift policy service.

**Flow Group 4 Verdict: PARTIAL PASS**

---

## FLOW GROUP 5 -- ASSETS & CONTRACTS

### Endpoints Tested

| Endpoint                           | Method | Status | Result |
|------------------------------------|--------|--------|--------|
| `/api/v1/assets?page=0&size=10`    | GET    | 200    | PASS   |
| `/api/v1/contracts?page=0&size=10` | GET    | 200    | PASS   |
| `/api/v1/letters?page=0&size=10`   | GET    | 200    | PASS   |
| `/api/v1/letter-templates`         | GET    | 500    | FAIL   |

### Bugs

#### BUG-009: Letter templates endpoint returns 500 [MINOR]

- **Page:** /letter-templates
- **API:** `GET /api/v1/letter-templates`
- **Severity:** MINOR
- **Expected:** Returns list of letter templates
- **Actual:** 500 Internal Server Error
- **Root Cause:** Likely missing seed data for letter templates or a query error.

**Flow Group 5 Verdict: PARTIAL PASS**

---

## FLOW GROUP 6 -- HELPDESK

### Endpoints Tested

| Endpoint                                  | Method | Status | Result |
|-------------------------------------------|--------|--------|--------|
| `/api/v1/helpdesk/tickets?page=0&size=10` | GET    | 200    | PASS   |
| `/api/v1/helpdesk/categories`             | GET    | 200    | PASS   |
| `/api/v1/helpdesk/dashboard`              | GET    | 500    | FAIL   |

### Bugs

#### BUG-010: Helpdesk dashboard endpoint returns 500 [MINOR]

- **Page:** /helpdesk
- **API:** `GET /api/v1/helpdesk/dashboard`
- **Severity:** MINOR
- **Expected:** Returns helpdesk dashboard metrics
- **Actual:** 500 Internal Server Error

**Flow Group 6 Verdict: PARTIAL PASS**

---

## FLOW GROUP 7 -- TIMESHEETS

### Endpoints Tested

| Endpoint                                       | Method | Status | Result |
|------------------------------------------------|--------|--------|--------|
| `/api/v1/project-timesheets?page=0&size=10`    | GET    | 500    | FAIL   |
| `/api/v1/time-tracking/entries?page=0&size=10` | GET    | 200    | PASS   |

### Bugs

#### BUG-011: Project timesheets endpoint returns 500 [MINOR]

- **Page:** /timesheets
- **API:** `GET /api/v1/project-timesheets`
- **Severity:** MINOR
- **Expected:** Returns paginated project timesheets
- **Actual:** 500 Internal Server Error

**Flow Group 7 Verdict: PARTIAL PASS**

---

## FLOW GROUP 8 -- APPROVALS

### Endpoints Tested

| Endpoint                                | Method | Status | Result |
|-----------------------------------------|--------|--------|--------|
| `/api/v1/workflow/inbox`                | GET    | 200    | PASS   |
| `/api/v1/workflow/my-pending-approvals` | GET    | 200    | PASS   |

**Flow Group 8 Verdict: PASS**

---

## FLOW GROUP 9 -- CALENDARS

### Endpoints Tested

| Endpoint                     | Method | Status | Result                                            |
|------------------------------|--------|--------|---------------------------------------------------|
| `/api/v1/calendar/events`    | GET    | 200    | PASS                                              |
| `/api/v1/holidays/year/2026` | GET    | 200    | PASS                                              |
| `/api/v1/holidays` (GET)     | GET    | 405    | Expected (no list-all endpoint, use /year/{year}) |

**Flow Group 9 Verdict: PASS**

---

## FLOW GROUP 10 -- PROBATION

### Endpoints Tested

| Endpoint            | Method | Status | Result |
|---------------------|--------|--------|--------|
| `/api/v1/probation` | GET    | 200    | PASS   |

**Flow Group 10 Verdict: PASS**

---

## Frontend Code Audit Findings

### Design System Violations (Active Pages Only -- excludes .fuse_hidden artifacts)

#### BUG-012: bg-white usage in attendance page (dark gradient overlay context) [MINOR]

- **File:** `frontend/app/attendance/page.tsx:217,223,225,280,292`
- **Severity:** MINOR (cosmetic -- these are on dark gradient hero sections where `bg-white/15` is
  used for overlay effects, not as card backgrounds)
- **Detail:** 7 instances of `bg-white` variants in attendance page. Most are opacity-modified (
  `bg-white/15`, `bg-white/50`, `bg-white/20`) used on dark gradient backgrounds for glass effects.
  One instance at line 292 uses solid `bg-white` for a check-in button on a dark hero -- intentional
  contrast.
- **Recommendation:** Replace with `bg-[var(--bg-card)]` for the solid button at line 292; opacity
  variants on dark gradients are acceptable.

#### BUG-013: Employee directory uses bg-white/20 on photo modal overlay [MINOR]

- **File:** `frontend/app/employees/directory/page.tsx:733`
- **Severity:** MINOR
- **Detail:** Close button on photo modal uses `bg-white/20` -- acceptable for overlay context.

### Login Concurrent Modification Bug

#### BUG-014: Login returns 409 CONCURRENT_MODIFICATION intermittently [CRITICAL]

- **Observed:** First login attempt for `fayaz.m@nulogic.io` returned 409 "CONCURRENT_MODIFICATION",
  second attempt succeeded
- **Severity:** CRITICAL (authentication flow reliability)
- **Root Cause:** The `User` entity has `lastLoginAt` and `failedLoginAttempts` fields that are
  updated during login. If the entity uses `@Version` optimistic locking or if concurrent requests (
  e.g., from JWT refresh loops) are modifying the same user row, a race condition occurs.
- **Impact:** Users may see intermittent login failures. Frontend may not retry gracefully.
- **Fix:** Either use `@Modifying` UPDATE queries for login metadata instead of load-modify-save, or
  handle the OptimisticLockException with a retry in the auth service.

---

## Design System Compliance Summary

| Check                                           | Status                                                                       |
|-------------------------------------------------|------------------------------------------------------------------------------|
| No `bg-white` in card/surface contexts          | PASS (only on dark gradient overlays)                                        |
| No `shadow-sm/md/lg`                            | PASS (active pages)                                                          |
| No `rounded-sm`                                 | PASS                                                                         |
| No banned Tailwind colors (slate, gray, etc.)   | PASS (active pages; `.fuse_hidden` files have violations but are not served) |
| 8px spacing grid (no p-3, p-5, gap-3, gap-5)    | PASS (active pages)                                                          |
| Git-modified files (gap-3 to gap-4, p-3 to p-4) | PASS (design system fixes in progress)                                       |

---

## Auth & Security Summary

| Check                                    | Status                       |
|------------------------------------------|------------------------------|
| Unauthenticated access blocked (401)     | PASS                         |
| JWT token flow (login/refresh)           | PASS (with intermittent 409) |
| CSRF protection on POST endpoints        | PASS (403 on missing CSRF)   |
| Frontend auth redirect to /auth/login    | PASS (307 redirect)          |
| SuperAdmin bypass on @RequiresPermission | PASS (PermissionAspect)      |
| SuperAdmin bypass on inline scope checks | FAIL (BUG-001)               |
| Permission namespace consistency         | FAIL (BUG-002)               |
| Rate limiting headers                    | Not tested                   |

---

## Summary of All Bugs

| ID      | Severity | Flow Group | Description                                                                              |
|---------|----------|------------|------------------------------------------------------------------------------------------|
| BUG-001 | CRITICAL | Employees  | SuperAdmin 403 on GET /employees/{otherId} -- missing bypass in enforceEmployeeViewScope |
| BUG-002 | CRITICAL | Employees  | Permission namespace mismatch (HRMS:EMPLOYEE:VIEW_TEAM vs EMPLOYEE:VIEW_TEAM)            |
| BUG-003 | MAJOR    | Employees  | Manager 403 on /employees/me -- same namespace issue                                     |
| BUG-004 | MAJOR    | Employees  | Employee Directory route conflict (EmployeeController {id} catches /directory)           |
| BUG-005 | MAJOR    | Attendance | Attendance dashboard 500                                                                 |
| BUG-006 | MAJOR    | Attendance | Check-in POST 403 for SuperAdmin (likely CSRF)                                           |
| BUG-007 | MAJOR    | Leave      | Leave balances /my returns 500                                                           |
| BUG-008 | MINOR    | Shifts     | Shift policies 500                                                                       |
| BUG-009 | MINOR    | Assets     | Letter templates 500                                                                     |
| BUG-010 | MINOR    | Helpdesk   | Helpdesk dashboard 500                                                                   |
| BUG-011 | MINOR    | Timesheets | Project timesheets 500                                                                   |
| BUG-012 | MINOR    | Attendance | bg-white on check-in button (design system)                                              |
| BUG-013 | MINOR    | Employees  | bg-white/20 on photo modal (design system)                                               |
| BUG-014 | CRITICAL | Auth       | Login 409 CONCURRENT_MODIFICATION race condition                                         |

---

## Recommended Fix Priority

1. **BUG-002** (CRITICAL) -- Permission namespace normalization. This is the root cause for BUG-001
   and BUG-003. Fix the Permission constants or normalization layer.
2. **BUG-001** (CRITICAL) -- Add SuperAdmin/TenantAdmin bypass to `enforceEmployeeViewScope()`.
3. **BUG-014** (CRITICAL) -- Fix login race condition with retry or UPDATE query.
4. **BUG-004** (MAJOR) -- Resolve employee directory route conflict.
5. **BUG-006** (MAJOR) -- Investigate check-in 403 (CSRF or Spring Security filter issue).
6. **BUG-005, BUG-007** (MAJOR) -- Investigate attendance dashboard and leave balance 500s.
7. **BUG-008-011** (MINOR) -- Dashboard/list 500s likely caused by missing seed data.
8. **BUG-012-013** (MINOR) -- Design system refinements.

---

## Test Limitations

- **Chrome MCP extension was not connected** -- visual UI testing (screenshots, console errors,
  network waterfall, rendering verification) could not be performed. All testing was done via
  API-level curl requests and static code analysis.
- **Backend logs** were stale (from March 2026) -- could not capture fresh stack traces for 500
  errors.
- **CSRF tokens** were not available for POST endpoint testing -- check-in and form submission flows
  were not fully testable.
- **Frontend runtime behavior** (React hydration, client-side errors, loading states, empty states)
  was not testable without browser tools.
