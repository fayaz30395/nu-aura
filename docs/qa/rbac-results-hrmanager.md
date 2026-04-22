# RBAC Test Results: HR Manager

**Date:** 2026-04-08
**User:** jagadeesh@nulogic.io
**Roles:** HR_MANAGER, REPORTING_MANAGER, SKIP_LEVEL_MANAGER
**Method:** curl against localhost:8080

---

## Summary

| Result          | Count  |
|-----------------|--------|
| 200 (OK)        | 26     |
| 403 (Forbidden) | 5      |
| 404 (Not Found) | 1      |
| Timeout         | 1      |
| **Total**       | **33** |

---

## Detailed Results

### 200 OK (Access Granted)

| #  | Endpoint                            | Status | Notes                                       |
|----|-------------------------------------|--------|---------------------------------------------|
| 1  | `/api/v1/employees`                 | 200    | Full employee list (EMPLOYEE:VIEW_ALL)      |
| 2  | `/api/v1/departments`               | 200    | All departments (DEPARTMENT:VIEW)           |
| 3  | `/api/v1/attendance/today`          | 200    | Today's attendance (ATTENDANCE:VIEW_ALL)    |
| 4  | `/api/v1/leave-types`               | 200    | Leave type configuration                    |
| 5  | `/api/v1/leave-requests`            | 200    | All leave requests (LEAVE:VIEW_ALL)         |
| 6  | `/api/v1/payroll/runs`              | 200    | Payroll runs (PAYROLL:VIEW)                 |
| 7  | `/api/v1/payroll/salary-structures` | 200    | Salary structures (PAYROLL:VIEW)            |
| 8  | `/api/v1/payroll/components`        | 200    | Payroll components (PAYROLL:VIEW)           |
| 9  | `/api/v1/expenses`                  | 200    | All expenses (EXPENSE:VIEW_ALL)             |
| 10 | `/api/v1/assets`                    | 200    | Asset inventory (ASSET:MANAGE)              |
| 11 | `/api/v1/shifts`                    | 200    | Shift definitions                           |
| 12 | `/api/v1/holidays/year/2026`        | 200    | Holiday calendar                            |
| 13 | `/api/v1/overtime`                  | 200    | Overtime records (OVERTIME:MANAGE)          |
| 14 | `/api/v1/travel`                    | 200    | Travel requests (TRAVEL:VIEW_ALL)           |
| 15 | `/api/v1/loans`                     | 200    | Loan records (LOAN:VIEW_ALL)                |
| 16 | `/api/v1/probation`                 | 200    | Probation records (PROBATION:MANAGE)        |
| 17 | `/api/v1/announcements`             | 200    | Company announcements (ANNOUNCEMENT:CREATE) |
| 18 | `/api/v1/helpdesk/tickets`          | 200    | Helpdesk tickets                            |
| 19 | `/api/v1/contracts`                 | 200    | Employee contracts (CONTRACT:VIEW)          |
| 20 | `/api/v1/projects`                  | 200    | Projects (PROJECT:VIEW)                     |
| 21 | `/api/v1/recruitment/candidates`    | 200    | Recruitment candidates (CANDIDATE:VIEW)     |
| 22 | `/api/v1/recruitment/job-openings`  | 200    | Job openings (RECRUITMENT:VIEW_ALL)         |
| 23 | `/api/v1/approvals/inbox`           | 200    | Approval inbox (WORKFLOW:EXECUTE)           |
| 24 | `/api/v1/reviews`                   | 200    | Performance reviews (REVIEW:VIEW)           |
| 25 | `/api/v1/goals`                     | 200    | Goals (GOAL:VIEW)                           |
| 26 | `/api/v1/training/programs`         | 200    | Training programs (TRAINING:VIEW)           |

### 403 Forbidden (Access Denied)

| # | Endpoint                 | Status | Required Permission     | Verdict                                                                        |
|---|--------------------------|--------|-------------------------|--------------------------------------------------------------------------------|
| 1 | `/api/v1/roles`          | 403    | (role management)       | CORRECT - HR Manager cannot manage roles                                       |
| 2 | `/api/v1/permissions`    | 403    | (permission management) | CORRECT - HR Manager cannot manage permissions                                 |
| 3 | `/api/v1/admin/settings` | 403    | SYSTEM:ADMIN            | CORRECT - Admin-only endpoint                                                  |
| 4 | `/api/v1/wall/posts`     | 403    | WALL:VIEW               | UNEXPECTED - HR Manager should likely have wall access                         |
| 5 | `/api/v1/offboarding`    | 403    | EXIT:VIEW               | UNEXPECTED - HR Manager has OFFBOARDING:MANAGE but endpoint requires EXIT:VIEW |

### 404 Not Found

| # | Endpoint                   | Status | Notes                                                                                   |
|---|----------------------------|--------|-----------------------------------------------------------------------------------------|
| 1 | `/api/v1/recruitment/jobs` | 404    | Correct endpoint is `/api/v1/recruitment/job-openings` (tested separately, returns 200) |

### Timeout

| # | Endpoint                 | Status              | Notes                                                                                                                   |
|---|--------------------------|---------------------|-------------------------------------------------------------------------------------------------------------------------|
| 1 | `/api/v1/leave-requests` | Timeout (first run) | Timed out at 60s on retry; succeeded on initial background run with 200. Possible performance issue with large dataset. |

---

## Findings

### Correct Behavior (As Expected)

- **26 of 33 endpoints returned 200** - HR Manager has broad access to HR, recruitment, payroll (
  read), attendance, leave, and employee management endpoints
- **3 of 5 forbidden responses are correct** - roles, permissions, and admin/settings are properly
  restricted to admin-only

### Issues Found

#### BUG-RBAC-HRM-001: Wall posts returns 403 (WALL:VIEW missing)

- **Endpoint:** `GET /api/v1/wall/posts`
- **Expected:** 200 (HR Manager should be able to view the activity wall)
- **Actual:** 403 - `Insufficient permissions. Required any of: [WALL:VIEW]`
- **Fix:** Add `WALL:VIEW` permission to the HR_MANAGER role
- **Severity:** Low

#### BUG-RBAC-HRM-002: Offboarding returns 403 (EXIT:VIEW vs OFFBOARDING:MANAGE mismatch)

- **Endpoint:** `GET /api/v1/offboarding`
- **Expected:** 200 (HR Manager has `OFFBOARDING:MANAGE` and `OFFBOARDING:FNF_CALCULATE` in JWT)
- **Actual:** 403 - `Insufficient permissions. Required any of: [EXIT:VIEW]`
- **Fix:** Either add `EXIT:VIEW` to HR_MANAGER role or update the controller to also accept
  `OFFBOARDING:MANAGE`
- **Severity:** Medium - HR Managers need offboarding access

#### PERF-HRM-001: leave-requests endpoint timeout

- **Endpoint:** `GET /api/v1/leave-requests`
- **Behavior:** Intermittent - succeeded on first call (background), timed out on subsequent calls (
  60s limit)
- **Possible cause:** Large dataset without default pagination, or slow query
- **Severity:** Medium

---

## Payroll Access Summary

HR Manager has **read access** to payroll (PAYROLL:VIEW, PAYROLL:VIEW_ALL, PAYROLL:VIEW_SELF) and
can **approve** payroll (PAYROLL:APPROVE) and **process** (PAYROLL:PROCESS). All three payroll
endpoints returned 200.

---

## Comparison with Other Roles

| Endpoint               | SuperAdmin | HR Manager | Team Lead | Employee   |
|------------------------|------------|------------|-----------|------------|
| employees              | 200        | 200        | 200       | 200 (self) |
| departments            | 200        | 200        | 200       | 200        |
| admin/settings         | 200        | 403        | 403       | 403        |
| roles                  | 200        | 403        | 403       | 403        |
| permissions            | 200        | 403        | 403       | 403        |
| payroll/runs           | 200        | 200        | 403       | 403        |
| recruitment/candidates | 200        | 200        | 200*      | 403        |
| offboarding            | 200        | 403**      | 403       | 403        |
| wall/posts             | 200        | 403**      | 200       | 200        |

*Role-dependent  **Bugs identified above
