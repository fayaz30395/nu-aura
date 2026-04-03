# NU-AURA QA Execution Report

**Date:** 2026-04-03
**Executed by:** QA Automation (Claude Agent)
**Platform:** NU-AURA HRMS v1.0 — localhost:3000 (frontend), localhost:8080 (backend)
**Session:** Continued from prior context (UC-SMOKE + UC-AUTH completed previously)
**Total Use Cases Executed:** 40+ across 9 modules

---

## Executive Summary

| Category | Count |
|---|---|
| Total test cases executed | ~45 |
| PASS | 34 |
| FAIL / BUG | 7 |
| FINDING / Warning | 9 |
| Critical bugs (P0) | 2 |
| High bugs (P1) | 3 |
| Low / Info findings | 6 |

**Overall System Health:** Production-ready core with 2 critical gaps requiring fixes before launch.

---

## Module Results

### UC-SMOKE-001 — Core Route Smoke Tests

| Step | Result | Notes |
|---|---|---|
| 10 core routes load (/, /dashboard, /employees, /org-chart, /departments, /attendance, /payroll/runs, /leave/apply, /recruitment/jobs, /me/dashboard) | ✅ PASS | All routes load with correct content and authentication |

---

### UC-AUTH-001 to UC-AUTH-007 — Authentication

| UC ID | Result | Notes |
|---|---|---|
| UC-AUTH-001: Google OAuth login page renders | ✅ PASS | Quick-login demo panel present |
| UC-AUTH-002: Quick login — SuperAdmin (Fayaz M) | ✅ PASS | JWT cookie set, redirects to /me/dashboard |
| UC-AUTH-003: Quick login — HR Admin (Jagadeesh N) | ✅ PASS | HR Admin dashboard loads |
| UC-AUTH-004: Quick login — Employee (Saran V) | ✅ PASS | Employee-scoped dashboard loads |
| UC-AUTH-005: Session persistence across refresh | ✅ PASS | JWT httpOnly cookie maintains session |
| UC-AUTH-006: Logout clears session | ✅ PASS | Cookie cleared, redirects to /auth/login |
| UC-AUTH-007: Invalid credentials | ✅ PASS | Correct error handling |

---

### UC-EMP-001 to UC-EMP-005 — Employee Module

| UC ID | Result | Notes |
|---|---|---|
| UC-EMP-001: Add Employee modal opens | ✅ PASS | Multi-tab modal (Basic Info, Personal, Employment, Banking & Tax) |
| UC-EMP-001: POST /api/v1/employees → 201 | ✅ PASS | EMP-QA-002 created (id: 78f7aa99) |
| UC-EMP-001: Duplicate email → 409 | ✅ PASS | "Email already exists" error |
| UC-EMP-001: Missing joiningDate → 400 | ✅ PASS | Field-level validation errors returned |
| UC-EMP-001: New employee in list (24→25) | ✅ PASS | Count incremented, appears at top |
| UC-EMP-001: Employee Code not auto-generated | ⚠️ FINDING | Spec says "auto-assigned" but form requires manual entry |
| UC-EMP-001: Form tab switch loses React state | ❌ FAIL | Tab switching unmounts Basic Info fields — React Hook Form state lost. Workaround: use API. |
| UC-EMP-002: View employee profile | ✅ PASS | /employees/{id} shows full profile |
| UC-EMP-002: Edit button on profile page | ❌ FAIL | Edit button click on profile page does not navigate to edit form |
| UC-EMP-002: Direct URL /employees/{id}/edit works | ✅ PASS | Edit form loads and saves correctly |
| UC-EMP-002: PUT /api/v1/employees/{id} → 200 | ✅ PASS | Phone number updated (+91 9999999999) |
| UC-EMP-005: Org chart renders | ✅ PASS | Tree view, 25 employees, 8 departments, 4 hierarchy depth |
| UC-EMP-005: Search "Saran" → 1 match | ✅ PASS | "Found 1 match for 'Saran'" |
| UC-EMP-005: Node click → popup panel | ✅ PASS | Shows name, title (Technology Lead), dept (Engineering), email, phone, 0 direct reports |
| UC-EMP-005: "View Full Profile" link | ✅ PASS | Correctly links to /employees/{saran_id} |

---

### UC-DEPT-001 — Departments

| UC ID | Result | Notes |
|---|---|---|
| UC-DEPT-001: Page loads with 8 departments | ✅ PASS | Stats: Total=8, Active=8, Employees=17 |
| UC-DEPT-001: "Add Department" modal opens | ✅ PASS | All fields present (Code, Name, Type, Parent, Manager, Location, Cost Center) |
| UC-DEPT-001: Create "Product Management" under Engineering | ✅ PASS | HTTP 201, appears in list (total 9), Parent=Engineering, Manager=Sumit Kumar |
| UC-DEPT-001 (neg): Delete dept with active employees | ✅ PASS (blocked) | Deletion prevented, UI shows "Cannot delete department with employees. Please reassign employees first." |
| UC-DEPT-001 (neg): Delete returns HTTP 409 | ⚠️ FINDING | Spec expects HTTP 400; actual response is HTTP 409. Error message slightly different from spec. |

---

### UC-RBAC-001, 002, 004 — RBAC Permission Matrix

| UC ID | Result | Notes |
|---|---|---|
| UC-RBAC-004: SuperAdmin GET /api/v1/payroll/runs → 200 | ✅ PASS | No 403s for any tested endpoint |
| UC-RBAC-004: SuperAdmin role = SUPER_ADMIN | ✅ PASS | /auth/me confirms role |
| UC-RBAC-004: /payroll/runs page loads for SuperAdmin | ✅ PASS | "Payroll Runs" page with "Create Payroll Run" button |
| UC-RBAC-001: Employee sidebar = limited navigation | ✅ PASS | MY SPACE, Attendance, Leave, Benefits only; no Payroll/HR Admin |
| UC-RBAC-001: Employee permissions correctly scoped | ✅ PASS | roles=["EMPLOYEE"], only VIEW_SELF permissions |
| UC-RBAC-001: "No Employee Profile Linked" for Saran demo account | ⚠️ FINDING | Quick-login Saran V auth account not linked to employee record 48000000-e001-* |
| UC-RBAC-002: Employee GET /api/v1/payroll/runs → 403 | ✅ PASS | Correct 403 |
| UC-RBAC-002: Employee GET /api/v1/employees → 403 | ✅ PASS | Correct 403 (EMPLOYEE:VIEW_SELF ≠ EMPLOYEE:VIEW) |
| UC-RBAC-002: /payroll/runs frontend → redirected | ✅ PASS | Access blocked |
| UC-RBAC-002: Redirect target is /dashboard not /me/dashboard | ❌ FAIL (F-04) | Employee redirected to /dashboard which itself shows "Error Loading Dashboard 403" |
| UC-RBAC-002: POST /api/v1/employees → 400 not 403 | ❌ FAIL (F-05) | Validation runs before authorization check — employees can probe API structure |

---

### UC-ATT-001 — Attendance Check-In/Check-Out

| UC ID | Result | Notes |
|---|---|---|
| UC-ATT-001: GET /api/v1/attendance/today → NOT_CHECKED_IN | ✅ PASS | Clean state before test |
| UC-ATT-001: POST /api/v1/attendance/check-in → 201 | ✅ PASS | checkInTime recorded, status=PRESENT |
| UC-ATT-001: POST /api/v1/attendance/check-out → 200 | ✅ PASS | checkOutTime recorded, workDurationMinutes calculated |
| UC-ATT-001: UI shows check-in/check-out times | ✅ PASS | Attendance page shows 04:29 AM IN / 04:29 AM OUT, "DAY COMPLETE" badge |
| UC-ATT-001: UI shows Upcoming Holidays | ✅ PASS | Good Friday (today), May Day, Independence Day |
| UC-ATT-001 (neg): Double check-in → HTTP 400 | ⚠️ FINDING | Spec expects HTTP 409 "Already checked in today"; actual is HTTP 400 "Invalid State" |
| UC-ATT-001: Post-checkout status = INCOMPLETE | ⚠️ FINDING | Sub-threshold session (12s) correctly returns INCOMPLETE; spec assumes minimum working session for PRESENT |
| UC-ATT-001: Today is Good Friday (public holiday) | ⚠️ FINDING | Spec precondition "today is a working day" not met — test environment date falls on a public holiday |

---

### UC-LEAVE-001 — Leave Application

| UC ID | Result | Notes |
|---|---|---|
| UC-LEAVE-001: /leave/apply page loads | ✅ PASS | Leave Type, Start/End Date, Half Day, Total Days preview, Reason, Submit |
| UC-LEAVE-001: GET /api/v1/leave-types/active → 200 | ✅ PASS | Earned Leave (18 days quota), Sick Leave, Casual Leave etc. |
| UC-LEAVE-001: GET /api/v1/leave-balances/employee/{id}/year/2026 → 200 | ✅ PASS | EL available=18, used=0 |
| UC-LEAVE-001: POST /api/v1/leave-requests → 201 | ✅ PASS | requestNumber LR-*, status=PENDING, 2 days |
| UC-LEAVE-001 (neg): Request 20 days vs 18 available → 201 | ❌ FAIL (F-06) | **CRITICAL: Balance not enforced** — system accepts over-quota leave requests |
| UC-LEAVE-001: Balance pending counter not updated | ❌ FAIL (F-07) | pending=0 after submission (should be 2); balance not real-time |
| UC-LEAVE-001: Spec endpoint /api/v1/leave/balances is 404 | ⚠️ FINDING | Actual endpoint: /api/v1/leave-balances/employee/{id}/year/{year} — spec has wrong path |

---

### UC-PAY-* — Payroll

| UC ID | Result | Notes |
|---|---|---|
| UC-PAY: GET /api/v1/payroll/runs → 200 | ✅ PASS | 0 runs (fresh system) |
| UC-PAY: GET /api/v1/payroll/payslips/employee/{id} → 200 | ✅ PASS | Payslip endpoint works |
| UC-PAY: GET /api/v1/payroll/salary-structures → 200 | ✅ PASS | Empty (no salary structures configured yet) |
| UC-PAY: /payroll/runs page (SuperAdmin) | ✅ PASS | "No Payroll Runs Yet" with "Create Payroll Run" CTA |

---

### UC-HIRE — NU-Hire Recruitment

| UC ID | Result | Notes |
|---|---|---|
| UC-HIRE: GET /api/v1/recruitment/job-openings → 200 | ✅ PASS | 51 total jobs (46 Open, 5 Closed) |
| UC-HIRE: GET /api/v1/recruitment/candidates → 200 | ✅ PASS | Candidates endpoint works |
| UC-HIRE: /recruitment/jobs page | ✅ PASS | NU-Hire app context loads, job cards with status, location, salary, priority, CRUD actions |
| UC-HIRE: Sidebar context switches to NU-HIRE | ✅ PASS | Recruitment, Onboarding, Preboarding, Offboarding, Offer Portal, Careers Page, Referrals |

---

## Bug Tracker — All Findings

### Critical (P0 — Must Fix Before Production)

| ID | Module | Description | Evidence |
|---|---|---|---|
| F-06 | Leave | **Leave balance not enforced**: POST /api/v1/leave-requests accepts 20-day request against 18-day balance (HTTP 201 instead of 400). Employees can book unlimited leave regardless of balance. | `POST /api/v1/leave-requests` with totalDays=20, available=18 → HTTP 201 |
| F-05 | RBAC | **Auth order bug**: POST /api/v1/employees returns HTTP 400 (Validation Failed) for EMPLOYEE role instead of HTTP 403. Validation middleware runs before @RequiresPermission check, exposing API field structure to unauthorized users. | Employee role POST /api/v1/employees {} → HTTP 400 with field names |

### High (P1 — Fix Before Launch)

| ID | Module | Description | Evidence |
|---|---|---|---|
| F-07 | Leave | **Leave balance not updated in real-time**: After submitting a leave request, the balance `pending` counter stays at 0 instead of reflecting on-hold days. Users have no feedback on balance impact. | After POST leave-request (2 days), GET balance shows pending=0 |
| F-04 | RBAC | **Wrong redirect for unauthorized access**: When Employee accesses /payroll/runs, they're redirected to /dashboard which itself returns "Error Loading Dashboard — 403". Employee should be redirected to /me/dashboard or /403. | Saran → /payroll/runs → /dashboard → "Error Loading Dashboard" |
| F-03 | Employee | **Edit button on employee profile does not navigate**: The Edit button on /employees/{id} profile page does not trigger navigation to the edit form. Direct URL /employees/{id}/edit works correctly. | UC-EMP-002: Edit button click → no navigation |

### Low / Info Findings

| ID | Module | Description |
|---|---|---|
| F-01 | Employee | Form tab switching loses React Hook Form state: switching tabs in Add Employee modal unmounts inactive tab fields, clearing entered data. Workaround: use API directly. |
| F-02 | Employee | Employee Code is not auto-generated: spec says "Employee ID auto-assigned" but form requires manual entry |
| F-08 | Dept | Delete dept returns HTTP 409 instead of spec-expected HTTP 400. Validation message also slightly differs: "Cannot delete department with employees. Please reassign employees first." vs spec "Cannot delete department with active employees. Move employees first." |
| F-09 | Attendance | Double check-in returns HTTP 400 "Invalid State" vs spec-expected HTTP 409 "Already checked in today" |
| F-10 | RBAC | Quick-login Saran V auth account not linked to employee record — /me/dashboard shows "No Employee Profile Linked" |
| F-11 | Leave | Spec documents wrong API paths: `/api/v1/leave/balances` (404) and `/api/v1/leave/types` (404). Actual paths: `/api/v1/leave-balances/employee/{id}/year/{year}` and `/api/v1/leave-types/active` |

---

## API Endpoint Corrections (Spec vs Actual)

| Spec Path | Actual Path | Status |
|---|---|---|
| GET /api/v1/leave/balances | GET /api/v1/leave-balances/employee/{id}/year/{year} | ⚠️ Spec wrong |
| GET /api/v1/leave/types | GET /api/v1/leave-types/active | ⚠️ Spec wrong |
| DELETE /api/v1/organization/departments/{id} | DELETE /api/v1/departments/{id} | ⚠️ Spec wrong |
| GET /api/v1/jobs | GET /api/v1/recruitment/job-openings | ⚠️ Spec wrong |
| GET /api/v1/candidates | GET /api/v1/recruitment/candidates | ⚠️ Spec wrong |
| GET /api/v1/system/health | Not found | ❓ Endpoint missing |
| GET /api/v1/admin/tenants | Not found | ❓ Endpoint missing or different path |
| GET /api/v1/reports/headcount | Not found | ❓ Endpoint missing or different path |

---

## System Observations

1. **Database seeded correctly**: 25 employees, 8 departments (9 after test), 51 job openings, proper hierarchy
2. **Redis caching active**: Permission caching and rate limiting operational
3. **JWT httpOnly cookie**: Correctly set and maintained across navigations
4. **Multi-tenant**: tenant_id `660e8400-e29b-41d4-a716-446655440001` present on all API responses
5. **SuperAdmin bypass**: All @RequiresPermission checks correctly bypassed for SUPER_ADMIN role
6. **Public holiday detection**: Attendance module correctly identifies Good Friday (Apr 3, 2026) as "Today"
7. **Attendance UI**: Real-time clock, streak counter, weekly overview chart, upcoming holidays all render correctly
8. **NU-Hire context switching**: App bar correctly switches from "NU-HRMS" to "NU-Hire" when navigating to recruitment routes
9. **Error toasts**: 3 background errors visible on attendance page (likely non-critical polling failures)

---

## Test Data Created

| Type | ID | Notes |
|---|---|---|
| Employee | 78f7aa99-c1f3-4f56-8fbe-5909912c7c55 | EMP-QA-002 "QA TestTwo" (qa.test.emp002@nulogic.io) |
| Department | (new UUID) | "Product Management" (PM), parent: Engineering, manager: Sumit Kumar |
| Leave Request | 2796a5c2-4bbb-490a-92b7-b6a3bd59b5cf | LR-1775170966062-e668a75f, Earned Leave, 2026-04-14 to 15, PENDING |
| Leave Request | (second UUID) | 20-day over-quota request — SHOULD NOT EXIST, created due to F-06 |
| Attendance | e6cdc660-e48e-4ad9-a5ab-5c958a5e352f | Check-in 04:29 AM, Check-out 04:29 AM, INCOMPLETE |

---

## Priority Actions for Engineering

### Immediate (before any production use)
1. **Fix F-06**: Add balance validation in `LeaveRequestService.create()` — check `available >= totalDays` before persisting. Return HTTP 400 with message "Insufficient leave balance. Available: X, Requested: Y".
2. **Fix F-05**: Move `@RequiresPermission` annotation processing before `@Valid` — ensure Spring Security filter chain validates permissions BEFORE Hibernate Validator runs.

### Before Sprint End
3. **Fix F-07**: Implement real-time balance update — deduct `pending` from `available` on leave request creation (before approval). Reverse on rejection.
4. **Fix F-04**: Fix RBAC middleware redirect logic — unauthorized access should redirect to `/403` or role-appropriate dashboard (`/me/dashboard` for EMPLOYEE).
5. **Fix F-03**: Fix Edit button navigation on `/employees/{id}` profile page — `onClick` handler likely missing or router.push not firing.

### Technical Debt
6. **F-01**: Fix React Hook Form tab state loss in Add Employee modal — either preserve state across tab switches using `keepMounted` or move to a multi-step wizard that doesn't unmount.
7. **F-02**: Implement Employee Code auto-generation or update spec to match current behavior.
8. **Update QA spec**: Correct API endpoint paths for leave, departments, recruitment modules.

---

*Session 1 report generated: 2026-04-03 04:35 UTC*

---

# SESSION 3 — Extended QA Run (2026-04-03 continued)

**Modules covered:** UC-EMP-006–012, UC-DEPT-002, UC-PAY-001–002, UC-LEAVE (filter/carry-forward), UC-HIRE-002, UC-GROW-001–004

---

## Session 3 Executive Summary

| Category | Count |
|---|---|
| Additional test cases executed | ~35 |
| PASS | 18 |
| FAIL / BUG | 11 |
| FINDING / Warning | 6 |
| New Critical bugs (P0) | 2 |
| New High bugs (P1) | 4 |
| New Low / Info findings | 5 |

**Cumulative Totals:** ~80 test cases, 52 PASS, 18 FAIL/BUG, 15 findings

---

## Session 3 Module Results

### UC-EMP-006 — Emergency Contact Details

| Step | Result | Notes |
|---|---|---|
| Personal Details tab has emergency contact field | ✅ PASS | Single phone field (`emergencyContactNumber`) present |
| API saves emergency contact | ✅ PASS | PUT /api/v1/employees/{id} with `emergencyContactNumber` → HTTP 200 |
| Spec endpoint `/emergency-contacts` sub-resource | ❌ FAIL | 404 — field embedded in main PUT, not sub-resource |
| Spec: full form (Name, Relationship, Phone, Email) | ⚠️ FINDING | UI has single phone field only — spec mismatch |

---

### UC-EMP-007 — Bank Account Details

| Step | Result | Notes |
|---|---|---|
| Banking & Tax tab shows bank fields | ✅ PASS | Bank Account Number, Bank Name, IFSC, Tax ID fields present |
| API saves bank details | ✅ PASS | PUT /api/v1/employees/{id} with bank fields → HTTP 200 |
| Spec endpoint `/bank-details` sub-resource | ❌ FAIL | 404 — fields embedded in main PUT |
| Bank account number masked in UI/API | ❌ FAIL | Full 16-digit account number returned in API response (not masked) |
| Invalid IFSC code rejected | ❌ FAIL | "INVALID" (not 11-char format) accepted with HTTP 200 — no backend validation |
| Banking & Tax form pre-populates saved data | ❌ FAIL | Form shows placeholder for Bank Account and Tax ID on reload — existing data not shown |

---

### UC-EMP-009 — Employee Tax ID Setup

| Step | Result | Notes |
|---|---|---|
| Tax ID (PAN) saves via PUT | ✅ PASS | `taxId` field accepted → HTTP 200 |
| Invalid PAN format rejected | ❌ FAIL | "12345ABCDE" accepted with HTTP 200 — backend does not validate PAN format (should be `[A-Z]{5}[0-9]{4}[A-Z]`) |

---

### UC-EMP-010 — Employment Transfer / Change Requests

| Step | Result | Notes |
|---|---|---|
| `/employees/change-requests` via direct URL | ❌ FAIL | Blank white page — Next.js route crash on direct navigation |
| Change Requests via button from /employees | ✅ PASS | Page renders: Pending Requests=0, Pending/All Requests tabs |
| Create Change Request button present | ❌ FAIL | No "Create Request" button on the change requests page |
| POST /api/v1/employees/change-requests | ❌ FAIL | 405 Method Not Allowed |

---

### UC-EMP-012 — Employee Deactivation

| Step | Result | Notes |
|---|---|---|
| PUT /api/v1/employees/{id}/deactivate | ❌ FAIL | 404 — endpoint does not exist |
| POST /api/v1/employees/{id}/deactivate | ❌ FAIL | 404 |
| PATCH /api/v1/employees/{id} with status=INACTIVE | ❌ FAIL | 405 Method Not Allowed |
| PUT /api/v1/employees/{id} with status=INACTIVE | ❌ FAIL | HTTP 500 Internal Server Error — server crash on deactivation attempt |

---

### UC-DEPT-002 — Edit Department

| Step | Result | Notes |
|---|---|---|
| PUT /api/v1/departments/{id} | ✅ PASS | HTTP 200, department updated correctly |

---

### UC-PAY-001 — Create Salary Structure

| Step | Result | Notes |
|---|---|---|
| Salary Structures page loads | ✅ PASS | "No Salary Structures Configured" empty state, CTA button |
| Create Structure form opens | ✅ PASS | Navigates to /payroll/salary-structures/create with form |
| Spec vs actual form: component editor | ⚠️ FINDING | Spec describes formula-based component editor; actual form is Employee ID + Base Salary (per-employee assignment, not template) |
| POST /api/v1/payroll/salary-structures (all payloads) | ❌ FAIL | HTTP 500 Internal Server Error on ALL attempts — backend completely broken |

---

### UC-PAY-002 — Payroll Runs

| Step | Result | Notes |
|---|---|---|
| /payroll/runs page loads | ✅ PASS | "No Payroll Runs Yet", "Create Payroll Run" button |
| GET /api/v1/payroll/runs | ✅ PASS | HTTP 200, 0 runs (empty) |

---

### UC-LEAVE filter — Leave Request Status Filter

| Step | Result | Notes |
|---|---|---|
| GET /api/v1/leave-requests?status=PENDING | ❌ FAIL | Returns mixed APPROVED + PENDING records — status filter not enforced |
| GET /api/v1/leave-balances/carry-forward | ❌ FAIL | 404 — endpoint not implemented |

---

### UC-HIRE-002 — Candidates Pipeline

| Step | Result | Notes |
|---|---|---|
| /recruitment/candidates page loads | ✅ PASS | NU-Hire context, 100 candidates (88 New, 4 In Interview, 0 Selected) |
| Pipeline stages visible | ✅ PASS | Recruiters Phone Call, Panel Review, Candidate Rejected, Panel Reject, Offer NDA, Offer Extended |
| "+ Add Candidate" button present | ✅ PASS | Available for creating new candidates |
| "Parse Resume" AI feature button | ✅ PASS | AI-powered resume parsing feature visible |
| GET /api/v1/recruitment/candidates | ✅ PASS | HTTP 200, totalElements=192 |
| Pipeline stages API | ❌ FAIL | GET /api/v1/recruitment/pipeline-stages → 404 |

---

### UC-GROW-001 — Performance Reviews

| Step | Result | Notes |
|---|---|---|
| /performance/reviews page loads | ✅ PASS | "No reviews found" empty state, "Create Your First Review" CTA |
| GET /api/v1/reviews | ✅ PASS | HTTP 200, totalElements=0 |
| POST /api/v1/reviews (create review) | ❌ FAIL | HTTP 400 "Data Integrity Violation" — field mapping mismatch |
| Performance Revolution page | ✅ PASS | OKR viz, 360° Competency Radar, Recognition Pulse with live kudos data |

---

### UC-GROW-002 — OKR

| Step | Result | Notes |
|---|---|---|
| /performance/okr page loads | ✅ PASS | My Objectives (0), Company Objectives (0), "+ New Objective" button |
| GET /api/v1/goals | ✅ PASS | HTTP 200, 4 goals in system |

---

### UC-GROW-003 — 360 Feedback

| Step | Result | Notes |
|---|---|---|
| /performance/360-feedback page loads | ✅ PASS | Feedback Cycles (0), Pending Reviews (0), My Results (0) tabs; "+ New Cycle" button |

---

## Session 3 Bug Tracker (New Bugs)

| ID | Severity | Module | Bug | Impact |
|---|---|---|---|---|
| F-12 | P0 | Payroll | `POST /api/v1/payroll/salary-structures` → HTTP 500 on all attempts | Cannot create any salary structures — payroll setup blocked |
| F-13 | P0 | Employee | `PUT /api/v1/employees/{id}` with `status: 'INACTIVE'` → HTTP 500 | Employee deactivation causes server crash — HR cannot off-board employees |
| F-14 | P1 | Employee | Bank account number returned unmasked in API response (full 16-digit number) | PCI/security risk — sensitive financial data exposed in API |
| F-15 | P1 | Employee | No PAN format validation — invalid PAN "12345ABCDE" accepted | Incorrect PAN stored causes TDS filing failures |
| F-16 | P1 | Employee | No IFSC format validation — invalid IFSC "INVALID" accepted | Incorrect bank routing data stored silently |
| F-17 | P1 | Leave | `GET /api/v1/leave-requests?status=PENDING` returns mixed statuses | Leave approval queue shows already-approved requests |
| F-18 | P2 | Employee | Banking & Tax edit form doesn't pre-populate existing bank account / tax ID | HR/employees must re-enter bank data every edit session |
| F-19 | P2 | Employee | `/employees/change-requests` blank page on direct URL navigation | Direct link to change requests causes page crash |
| F-20 | P2 | Employee | No employee deactivation endpoint (`/deactivate`, PATCH, status change all fail) | No programmatic way to deactivate employees via API |
| F-21 | P2 | GROW | `POST /api/v1/reviews` → 400 "Data Integrity Violation" | Cannot create performance reviews via API |
| F-22 | P3 | Employee | Emergency contact UI is phone-only, not Name+Relationship+Phone+Email form | Reduced emergency contact data captured vs. spec |

---

## Session 3 API Endpoint Corrections

| Spec Path | Actual Path | Status |
|---|---|---|
| PUT /api/v1/employees/{id}/emergency-contacts | PUT /api/v1/employees/{id} (field: emergencyContactNumber) | ⚠️ Embedded |
| PUT /api/v1/employees/{id}/bank-details | PUT /api/v1/employees/{id} (fields: bankAccountNumber, bankName, bankIfscCode) | ⚠️ Embedded |
| PUT /api/v1/employees/{id}/tax-info | PUT /api/v1/employees/{id} (field: taxId) | ⚠️ Embedded |
| PUT /api/v1/employees/{id}/deactivate | ❌ Does not exist | Missing |
| POST /api/v1/employees/change-requests | ❌ 405 — correct path unknown | Broken |
| GET /api/v1/recruitment/pipeline-stages | ❌ 404 | Missing |
| GET /api/v1/leave-balances/carry-forward | ❌ 404 | Missing |

---

## Updated Priority Actions for Engineering

### Immediate (P0 — before production)

1. **Fix F-12**: Debug `POST /api/v1/payroll/salary-structures` 500 error — check Spring exception handler, entity mapping, FK constraints in salary_structures table
2. **Fix F-13**: Debug `PUT /api/v1/employees/{id}` with `status: INACTIVE` — add null/enum check in `EmployeeService.update()` before persisting INACTIVE status
3. **Fix F-06** (from Session 1): Add balance validation in `LeaveRequestService.create()`
4. **Fix F-05** (from Session 1): Move `@RequiresPermission` before `@Valid`

### Before Sprint End (P1)

5. **Fix F-14**: Mask bank account number in API response — return `****1234` format for `bankAccountNumber` field
6. **Fix F-15 + F-16**: Add backend validation annotations on `taxId` (PAN regex: `[A-Z]{5}[0-9]{4}[A-Z]`) and `bankIfscCode` (regex: `[A-Z]{4}0[A-Z0-9]{6}`)
7. **Fix F-17**: Fix leave request status filter — ensure JPA `where status = ?` binding is applied correctly
8. **Implement deactivation**: Add `PUT /api/v1/employees/{id}/deactivate` endpoint or fix status enum handling

### Technical Debt (P2–P3)

9. **Fix F-18**: Pre-populate Banking & Tax tab from employee GET response on edit form load
10. **Fix F-19**: Fix Next.js route for `/employees/change-requests` direct URL (add missing page.tsx or dynamic routing fix)
11. **Add IFSC/PAN format validation** on frontend (Zod) to catch format errors before API call
12. **Add `POST /api/v1/reviews`** with correct field mapping (check ReviewDTO vs request body)
13. **Implement carry-forward endpoint**: `GET /api/v1/leave-balances/carry-forward`
14. **Add pipeline-stages endpoint**: `GET /api/v1/recruitment/pipeline-stages`

---

*Session 3 addendum generated: 2026-04-03 05:10 UTC*
*Sessions covered: 1 (smoke/auth), 2 (employee/dept/rbac/attendance/leave/hire), 3 (employee detail/payroll/grow/hire)*
*Total test execution time: ~3 hours across 3 sessions*

---

## Session 4 Addendum — RBAC, Security, Attendance, Assets, Leave Admin

**Session Date:** 2026-04-03
**Tester:** QA Automation (Claude Agent)
**Modules Covered:** RBAC (Manager + SuperAdmin), Security Headers, Attendance Regularization/Shifts, Assets, Leave Admin

### Updated Executive Summary (Cumulative)

| Category | Count |
|---|---|
| Total test cases executed | ~105 |
| PASS | 62 |
| FAIL / BUG | 26 |
| FINDING / Warning | 17 |
| Critical bugs (P0) | 5 |
| High bugs (P1) | 8 |
| Medium bugs (P2) | 9 |
| Low / Info findings | 4 |

---

### UC-RBAC-003 — Manager Access Boundaries

| Step | Result | Notes |
|---|---|---|
| Login as Sumit Kumar (MANAGER) | ✅ PASS | Demo login panel works; roles: `MANAGER`, `SKIP_LEVEL_MANAGER`, `REPORTING_MANAGER` |
| Sidebar scoped to manager items only (no Employees, no Admin, no Payroll, no Reports) | ✅ PASS | MY SPACE + HR OPERATIONS (Attendance, Shift, Leave) + Expenses only — correctly limited |
| `/admin` route redirected to `/me/dashboard` | ✅ PASS | Hard redirect — correct RBAC enforcement |
| `GET /api/v1/employees` → 403 | ✅ PASS | Manager cannot list all employees |
| `GET /api/v1/payroll/runs` → 403 | ✅ PASS | Manager correctly blocked from payroll |
| `POST /api/v1/payroll/salary-structures` → 403 | ✅ PASS | Manager blocked from creating salary structures |
| `GET /api/v1/leave-requests` → 403 | ✅ PASS | Manager cannot view all tenant leave requests |
| `GET /api/v1/admin/tenants` → 404/403 | ✅ PASS | Admin tenant management inaccessible |
| `/employees` route shows permission error banner (not redirect) | ⚠️ FINDING | Route loads but shows error: "You do not have permission to view employees." Inconsistent with `/admin` hard redirect |
| Manager employee profile not linked ("No Employee Profile Linked" dashboard) | ❌ FAIL | Sumit Kumar user account has no linked employee record — MY SPACE features non-functional for seed manager |
| `GET /api/v1/approvals/tasks` / `inbox` / `my-tasks` → 404 | ❌ FAIL | No approval inbox endpoint found for manager — manager cannot access approval queue via API |

---

### UC-RBAC-004 — SuperAdmin Full Access

| Step | Result | Notes |
|---|---|---|
| Login as Fayaz M (SUPER_ADMIN) | ✅ PASS | Full sidebar: all HRMS, Hire, Grow, Admin sections visible |
| `/admin` route accessible | ✅ PASS | Full admin panel loads |
| `/payroll/runs` accessible | ✅ PASS | Payroll runs page loads |
| All API endpoints return 200/201 (not 403) | ✅ PASS | Verified across Sessions 1–4; SuperAdmin bypasses all `@RequiresPermission` checks |
| `GET /api/v1/auth/me` returns `roles: [SUPER_ADMIN, ...]` | ✅ PASS | Confirmed: roles include `SUPER_ADMIN`, `SKIP_LEVEL_MANAGER`, `REPORTING_MANAGER` |

---

### UC-ATT-002 — Attendance Regularization

| Step | Result | Notes |
|---|---|---|
| `GET /api/v1/attendance/regularization` | ❌ FAIL | HTTP 404 — endpoint not found |
| `GET /api/v1/attendance/regularizations` | ❌ FAIL | HTTP 404 — endpoint not found |
| `GET /api/v1/regularization-requests` | ❌ FAIL | HTTP 404 — endpoint not found |
| Frontend `/attendance/regularization` route | ⚠️ BLOCKED | Could not test; all regularization API endpoints return 404 |

---

### UC-ATT-003 — Shift Assignment

| Step | Result | Notes |
|---|---|---|
| `GET /api/v1/shifts` | ✅ PASS | HTTP 200, 5 shifts returned (e.g. "Afternoon (2-10)", 14:00–22:00) |
| `POST /api/v1/shifts/assignments` (with `effectiveFrom`, `assignmentDate`, `assignmentType`) | ✅ PASS | HTTP 201, assignment created: Saran V → "Afternoon (2-10)" shift |
| `GET /api/v1/shifts/assignments?employeeId={id}` | ❌ FAIL | HTTP 400 — GET with employeeId query param fails validation; correct query param unknown |
| Duplicate shift assignment (negative test — should → 409) | ❌ FAIL | HTTP 201 returned again — duplicate constraint not enforced; multiple overlapping assignments created |
| `POST /api/v1/shifts/assignments` with missing required fields | ✅ PASS | HTTP 400 with field-level validation errors: `effectiveFrom`, `assignmentDate`, `assignmentType` all required |

---

### UC-SEC-002 — OWASP Security Headers

| Header | Frontend (Next.js middleware) | Backend (Spring Security) | Status |
|---|---|---|---|
| `X-Frame-Options: DENY` | ✅ Set | ✅ Set via `frameOptions().deny()` | ✅ PASS |
| `X-Content-Type-Options: nosniff` | ✅ Set | ✅ Set via `contentTypeOptions()` | ✅ PASS |
| `Referrer-Policy: strict-origin-when-cross-origin` | ✅ Set | ✅ Set via `referrerPolicy(STRICT_ORIGIN_WHEN_CROSS_ORIGIN)` | ✅ PASS |
| `Content-Security-Policy` | ✅ Comprehensive CSP (12 directives, env-aware) | ✅ Set via `contentSecurityPolicy()` | ✅ PASS |
| `Permissions-Policy` | ✅ All sensitive features blocked (geo, mic, cam, payment, USB) | ✅ Set via `permissionsPolicy()` | ✅ PASS |
| `X-XSS-Protection: 1; mode=block` | ✅ Set (legacy compat) | ℹ️ Omitted (Spring 6.2+ deprecates; CSP provides better protection) | ✅ PASS |
| `X-DNS-Prefetch-Control: off` | ✅ Set | N/A (frontend-only header) | ✅ PASS |
| `Strict-Transport-Security` | ✅ Production-only (intentional — SEC-004: HSTS loops on localhost) | ✅ Set (31536000s, includeSubDomains) | ✅ PASS |
| `Cross-Origin-Opener-Policy: same-origin-allow-popups` | ✅ Set (required for Google OAuth) | N/A | ✅ PASS |

**Overall UC-SEC-002: ✅ PASS** — All OWASP headers present and correctly configured on both layers.

---

### UC-ASSET-001 — Asset Assignment to Employee

| Step | Result | Notes |
|---|---|---|
| `/assets` page loads | ✅ PASS | Asset Management page renders: Total/Available/Assigned/In Maintenance stats, "+ Add Asset" CTA, filter dropdowns |
| `GET /api/v1/assets` | ❌ FAIL | HTTP 500 "Internal Server Error" (INTERNAL_ERROR code) — cannot list assets |
| `POST /api/v1/assets` | ❌ FAIL | HTTP 500 — asset creation fails at backend; field validation works (400 for missing `assetName`) but processing returns 500 |
| `GET /api/v1/assets/categories` | ❌ FAIL | HTTP 400 — missing required parameters |

---

### UC-LEAVE-002 — Leave Balance Carry-Forward

| Step | Result | Notes |
|---|---|---|
| `/leave/admin/carry-forward` frontend route | ❌ FAIL | Next.js 404 page — frontend route not implemented |
| `POST /api/v1/leave/admin/carry-forward` | ❌ FAIL | HTTP 404 — backend endpoint not found |
| `POST /api/v1/leave-balances/carry-forward` | ❌ FAIL | HTTP 404 — not found |

---

### UC-LEAVE-003 — Leave Encashment

| Step | Result | Notes |
|---|---|---|
| `GET /api/v1/leave/encashment` | ❌ FAIL | HTTP 404 — not found |
| `GET /api/v1/leave-encashment` | ❌ FAIL | HTTP 404 — not found |
| Frontend `/leave/encashment` route | ⚠️ NOT TESTED | Backend endpoints do not exist; frontend route existence not verified |

---

### Session 4 New Bugs

| ID | Severity | Module | Bug | Impact |
|---|---|---|---|---|
| F-23 | P0 | Platform | Backend enters HTTP 503 state mid-session — all endpoints return 503 for ~5 minutes before recovering | Production outage risk: any health indicator failure causes complete API unavailability |
| F-24 | P1 | RBAC | Manager approval inbox endpoints missing (`/approvals/tasks`, `/approvals/inbox`, `/approvals/my-tasks` all 404) | Managers cannot access approval queue via API — leave/expense approvals non-functional for managers |
| F-25 | P1 | Assets | `GET /api/v1/assets` → HTTP 500 — asset list cannot be retrieved | Asset management page renders empty even when assets exist; cannot list company assets |
| F-26 | P1 | Assets | `POST /api/v1/assets` → HTTP 500 — asset creation fails at persistence layer | Cannot add new assets to the system |
| F-27 | P1 | Attendance | `GET/POST /api/v1/attendance/regularization` → 404 — regularization endpoint missing | Employees cannot submit attendance regularization requests |
| F-28 | P2 | Shifts | Duplicate shift assignment returns 201 instead of 409 — no uniqueness enforcement per employee/date | Multiple conflicting shift assignments can be created for the same employee |
| F-29 | P2 | Shifts | `GET /api/v1/shifts/assignments?employeeId={id}` → 400 — correct query parameter unknown | Cannot retrieve an employee's active shift assignment via GET |
| F-30 | P2 | RBAC | Manager user (Sumit Kumar seed data) has no linked employee record — "No Employee Profile Linked" | Manager's MY SPACE features (payslips, personal attendance, leaves) non-functional |
| F-31 | P2 | Leave | `/leave/admin/carry-forward` — frontend route and backend endpoint both missing | HR Admin cannot run year-end leave carry-forward |
| F-32 | P2 | Leave | `GET/POST /api/v1/leave/encashment` → 404 — encashment endpoint missing | Employees cannot request leave encashment |

---

### Session 4 API Endpoint Corrections

| Spec Path | Actual Path | Status |
|---|---|---|
| POST /api/v1/attendance/regularization | ❌ 404 — endpoint not implemented | Missing |
| GET /api/v1/shifts/assignments?employeeId | ❌ 400 — correct param unknown | Broken |
| POST /api/v1/shifts/assignments | ✅ 201 — requires `effectiveFrom`, `assignmentDate`, `assignmentType` | Works (with correct fields) |
| POST /api/v1/leave/admin/carry-forward | ❌ 404 | Missing |
| POST /api/v1/leave/encashment | ❌ 404 | Missing |
| GET/POST /api/v1/assets | ❌ 500 — Internal Server Error | Broken |
| GET /api/v1/approvals/tasks (manager) | ❌ 404 | Missing |

---

### Updated Engineering Priority Actions (All Sessions)

#### Immediate — P0 (Production Blockers)

1. **Fix F-23**: Investigate backend 503 cascade — identify which health indicator (`RedisHealthIndicator`, Kafka, PostgreSQL) is triggering the unavailability. Add circuit-breaker isolation so individual dependency failures don't take down the entire API.
2. **Fix F-12** (Session 3): Fix `POST /api/v1/payroll/salary-structures` → 500
3. **Fix F-13** (Session 3): Fix `PUT /api/v1/employees/{id}` with `status: INACTIVE` → 500
4. **Fix F-25 + F-26**: Debug `GET/POST /api/v1/assets` → 500 — check `AssetService`, entity mapping, FK constraints in `assets` table
5. **Fix F-06** (Session 1): Add leave balance validation in `LeaveRequestService.create()`

#### Sprint End — P1

6. **Fix F-24**: Implement manager approval inbox endpoint (`GET /api/v1/approvals/tasks?assignedTo=me`)
7. **Fix F-27**: Implement `POST /api/v1/attendance/regularization` endpoint + approval workflow
8. **Fix F-14** (Session 3): Mask bank account number in API responses
9. **Fix F-15 + F-16** (Session 3): Add PAN and IFSC regex validation
10. **Fix F-17** (Session 3): Fix leave request status filter

#### Tech Debt — P2

11. **Fix F-28**: Add unique constraint on `(employee_id, effective_from)` in `shift_assignments` table; return 409 on conflict
12. **Fix F-29**: Fix `GET /api/v1/shifts/assignments` query parameter (check `@RequestParam` name)
13. **Fix F-30**: Link Sumit Kumar seed user to an employee record (seed data fix)
14. **Fix F-31 + F-32**: Implement carry-forward and encashment endpoints + frontend routes
15. **RBAC UX**: Redirect `/employees` to `/403` for MANAGER role (consistent with `/admin` → `/me/dashboard`)

---

*Session 4 addendum generated: 2026-04-03 05:35 UTC*
*Sessions covered: 1 (smoke/auth), 2 (employee/dept/rbac/attendance/leave/hire), 3 (employee detail/payroll/grow/hire), 4 (rbac-manager/superadmin/security/shifts/assets/leave-admin)*
*Total test execution time: ~4 hours across 4 sessions*
*Cumulative: ~105 test cases, 62 PASS, 26 FAIL, 10 new bugs (F-23 to F-32)*
