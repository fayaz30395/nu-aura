# RBAC Test Results: TEAM LEAD Role

**User:** mani@nulogic.io
**Roles:** TEAM_LEAD, REPORTING_MANAGER
**Date:** 2026-04-08
**Method:** curl against localhost:8080

---

## Summary

| Status          | Count  |
|-----------------|--------|
| 200 (OK)        | 14     |
| 403 (Forbidden) | 14     |
| 404 (Not Found) | 1      |
| TIMEOUT         | 1      |
| **Total**       | **30** |

---

## Detailed Results

### 200 — Access Granted (14 endpoints)

| Endpoint                     | Status | Notes                               |
|------------------------------|--------|-------------------------------------|
| `/api/v1/employees`          | 200    | Team view (EMPLOYEE:VIEW_TEAM)      |
| `/api/v1/departments`        | 200    | DEPARTMENT:VIEW                     |
| `/api/v1/attendance/today`   | 200    | ATTENDANCE:VIEW_TEAM                |
| `/api/v1/leave-types`        | 200    | Read-only reference data            |
| `/api/v1/shifts`             | 200    | Read-only reference data            |
| `/api/v1/holidays/year/2026` | 200    | Read-only reference data            |
| `/api/v1/overtime`           | 200    | OVERTIME:REQUEST / OVERTIME:APPROVE |
| `/api/v1/announcements`      | 200    | Read-only                           |
| `/api/v1/helpdesk/tickets`   | 200    | Own tickets                         |
| `/api/v1/contracts`          | 200    | EMPLOYMENT_CHANGE:VIEW              |
| `/api/v1/approvals/inbox`    | 200    | Team approvals (WORKFLOW:EXECUTE)   |
| `/api/v1/reviews`            | 200    | REVIEW:VIEW                         |
| `/api/v1/goals`              | 200    | GOAL:VIEW                           |
| `/api/v1/training/programs`  | 200    | TRAINING:VIEW                       |

### 403 — Access Denied (14 endpoints)

| Endpoint                            | Status | Expected | Verdict                                                              |
|-------------------------------------|--------|----------|----------------------------------------------------------------------|
| `/api/v1/payroll/runs`              | 403    | 403      | PASS                                                                 |
| `/api/v1/payroll/salary-structures` | 403    | 403      | PASS                                                                 |
| `/api/v1/payroll/components`        | 403    | 403      | PASS                                                                 |
| `/api/v1/expenses`                  | 403    | 200      | UNEXPECTED — Team Lead has EXPENSE:CREATE but GET list is blocked    |
| `/api/v1/assets`                    | 403    | 200      | UNEXPECTED — no ASSET:VIEW permission assigned                       |
| `/api/v1/travel`                    | 403    | 200      | UNEXPECTED — has TRAVEL:APPROVE but GET list is blocked              |
| `/api/v1/loans`                     | 403    | 200      | UNEXPECTED — no LOAN:VIEW permission assigned                        |
| `/api/v1/probation`                 | 403    | 200      | UNEXPECTED — has PROBATION:VIEW_TEAM but GET list blocked            |
| `/api/v1/projects`                  | 403    | 200      | UNEXPECTED — no PROJECT:VIEW permission assigned                     |
| `/api/v1/recruitment/candidates`    | 403    | 403      | PASS — has RECRUITMENT:VIEW but candidates list requires higher perm |
| `/api/v1/roles`                     | 403    | 403      | PASS                                                                 |
| `/api/v1/permissions`               | 403    | 403      | PASS                                                                 |
| `/api/v1/admin/settings`            | 403    | 403      | PASS                                                                 |
| `/api/v1/wall/posts`                | 403    | 200      | UNEXPECTED — missing WALL:VIEW permission                            |
| `/api/v1/offboarding`               | 403    | 200      | UNEXPECTED — has OFFBOARDING:VIEW but GET list blocked               |

### 404 — Not Found (1 endpoint)

| Endpoint                   | Status | Notes                                |
|----------------------------|--------|--------------------------------------|
| `/api/v1/recruitment/jobs` | 404    | Endpoint does not exist at this path |

### TIMEOUT (1 endpoint)

| Endpoint                 | Status  | Notes                                                               |
|--------------------------|---------|---------------------------------------------------------------------|
| `/api/v1/leave-requests` | TIMEOUT | Request hangs beyond 60s — possible infinite loop or DB query issue |

---

## Bugs Found

### BUG-TL-001: `/api/v1/leave-requests` hangs (TIMEOUT)

- **Severity:** HIGH
- **Details:** GET request never returns. Team Lead has LEAVE:VIEW_TEAM, LEAVE:APPROVE permissions.
  Likely a query performance issue or infinite loop in the leave-requests controller when called
  with team-scoped permissions.

### BUG-TL-002: `/api/v1/expenses` returns 403 despite EXPENSE:CREATE

- **Severity:** MEDIUM
- **Details:** Team Lead has EXPENSE:CREATE and HRMS:EXPENSE:VIEW_TEAM but the GET /expenses list
  endpoint requires a permission not assigned (likely EXPENSE:VIEW or EXPENSE:VIEW_TEAM).

### BUG-TL-003: `/api/v1/travel` returns 403 despite TRAVEL:APPROVE

- **Severity:** MEDIUM
- **Details:** Team Lead has TRAVEL:APPROVE but cannot list travel requests. The list endpoint
  likely requires TRAVEL:VIEW or TRAVEL:VIEW_TEAM.

### BUG-TL-004: `/api/v1/probation` returns 403 despite HRMS:PROBATION:VIEW_TEAM

- **Severity:** MEDIUM
- **Details:** Has HRMS:PROBATION:VIEW_TEAM permission but GET list is blocked. Endpoint may require
  PROBATION:VIEW_TEAM (without HRMS prefix).

### BUG-TL-005: `/api/v1/wall/posts` returns 403 — missing WALL:VIEW

- **Severity:** LOW
- **Details:** Team Lead role lacks WALL:VIEW permission. The wall/posts feature should be
  accessible to all authenticated users.

### BUG-TL-006: `/api/v1/offboarding` returns 403 despite OFFBOARDING:VIEW

- **Severity:** MEDIUM
- **Details:** Has OFFBOARDING:VIEW permission but GET list still returns 403. Possible permission
  string mismatch.

### BUG-TL-007: `/api/v1/assets` returns 403 — no asset view permission

- **Severity:** LOW
- **Details:** Team Lead cannot view assets. May need ASSET:VIEW or ASSET:VIEW_TEAM permission for
  team asset tracking.

### BUG-TL-008: `/api/v1/loans` returns 403 — no loan view permission

- **Severity:** LOW
- **Details:** Team Lead cannot view loans. May need LOAN:VIEW_SELF at minimum.

### BUG-TL-009: `/api/v1/projects` returns 403 — no project view permission

- **Severity:** MEDIUM
- **Details:** Team Lead should be able to view projects they manage. Missing PROJECT:VIEW
  permission.

### BUG-TL-010: `/api/v1/recruitment/jobs` returns 404

- **Severity:** LOW
- **Details:** Endpoint path may be `/api/v1/jobs` or `/api/v1/recruitment/job-postings` instead.

---

## RBAC Verdict

**Admin endpoints correctly blocked:** roles, permissions, admin/settings (all 403) — PASS
**Payroll correctly blocked:** payroll/runs, salary-structures, components (all 403) — PASS
**Core team management accessible:** employees, departments, attendance, approvals, reviews, goals —
PASS
**Permission gaps found:** 7 endpoints where Team Lead has relevant permissions but is still
blocked (expenses, travel, probation, wall, offboarding, assets, projects)
**Critical bug:** leave-requests endpoint hangs indefinitely

**Overall: 10 bugs identified. 8 permission-gap issues, 1 timeout bug, 1 missing endpoint.**
