# RBAC Test Results — EMPLOYEE Role

**Date:** 2026-04-08
**User:** saran@nulogic.io
**Role:** EMPLOYEE
**Backend:** localhost:8080

---

## Test Results

| # | Endpoint | HTTP Status | Expected | Result |
|---|----------|:-----------:|:--------:|:------:|
| 1 | `/api/v1/employees` | 403 | 403 | PASS |
| 2 | `/api/v1/departments` | 200 | 200/403 | PASS (read-only, user has DEPARTMENT:VIEW) |
| 3 | `/api/v1/attendance/today` | 200 | 200 | PASS |
| 4 | `/api/v1/leave-types` | 200 | 200 | PASS |
| 5 | `/api/v1/leave-requests` | 403 | 200 (own) | NOTE — requires LEAVE:VIEW_ALL or LEAVE:VIEW_TEAM; employee has LEAVE:VIEW_SELF only. No `/my` endpoint tested. |
| 6 | `/api/v1/payroll/runs` | 403 | 403 | PASS |
| 7 | `/api/v1/payroll/salary-structures` | 403 | 403 | PASS |
| 8 | `/api/v1/payroll/components` | 403 | 403 | PASS |
| 9 | `/api/v1/expenses` | 403 | 403 | PASS |
| 10 | `/api/v1/assets` | 403 | 403 | PASS |
| 11 | `/api/v1/shifts` | 403 | 403 | PASS |
| 12 | `/api/v1/holidays/year/2026` | 200 | 200 | PASS |
| 13 | `/api/v1/overtime` | 403 | 403 | PASS |
| 14 | `/api/v1/travel` | 403 | 403 | PASS |
| 15 | `/api/v1/loans` | 403 | 403 | PASS |
| 16 | `/api/v1/probation` | 403 | 403 | PASS |
| 17 | `/api/v1/announcements` | 200 | 200 | PASS |
| 18 | `/api/v1/helpdesk/tickets` | 200 | 200 | PASS |
| 19 | `/api/v1/contracts` | **200** | **403** | **FAIL — VIOLATION** |
| 20 | `/api/v1/projects` | 403 | 403 | PASS |
| 21 | `/api/v1/recruitment/jobs` | 404 | 403 | NOTE — endpoint does not exist at this path |
| 22 | `/api/v1/recruitment/candidates` | 403 | 403 | PASS |
| 23 | `/api/v1/approvals/inbox` | 200 | 200 | PASS |
| 24 | `/api/v1/reviews` | 200 | 200 | PASS (returned empty — own reviews only) |
| 25 | `/api/v1/goals` | 200 | 200 | PASS |
| 26 | `/api/v1/roles` | 403 | 403 | PASS |
| 27 | `/api/v1/permissions` | 403 | 403 | PASS |
| 28 | `/api/v1/admin/settings` | 403 | 403 | PASS |
| 29 | `/api/v1/training/programs` | 200 | 200 | PASS |
| 30 | `/api/v1/wall/posts` | 403 | 200 | NOTE — requires WALL:VIEW permission; employee does not have it |
| 31 | `/api/v1/offboarding` | 403 | 403 | PASS |

---

## Summary

- **Tested:** 31 endpoints
- **Passed:** 27
- **Violations:** 1
- **Notes:** 3 (non-critical observations)

---

## VIOLATIONS

### VIOLATION 1: `/api/v1/contracts` — 200 (expected 403)

**Severity:** HIGH

**Description:** An EMPLOYEE-role user can list ALL contracts across the tenant, including contracts for other employees. The response contained full contract details (title, type, status, employee name, vendor, dates, monetary value).

**Data exposed:** Contract titles, types (FREELANCER, EMPLOYMENT), statuses, employee names, vendor names, start/end dates, monetary values (e.g., 50000.00 INR), signature counts.

**Root cause:** The `GET /api/v1/contracts` endpoint likely has `CONTRACT:VIEW` permission check, and the EMPLOYEE role has `CONTRACT:VIEW` permission in its permission set. This is too permissive — employees should only see their own contracts, not all tenant contracts.

**Recommended fix:** Either:
1. Remove `CONTRACT:VIEW` from the EMPLOYEE role, OR
2. Add row-level filtering so employees only see contracts where `employeeId` matches their own, OR
3. Split into `CONTRACT:VIEW_ALL` (admin) vs `CONTRACT:VIEW_SELF` (employee)

---

## Notes

### NOTE 1: `/api/v1/leave-requests` — 403

The employee has `LEAVE:VIEW_SELF` but the list endpoint requires `LEAVE:VIEW_ALL` or `LEAVE:VIEW_TEAM`. This is correct RBAC behavior — the employee should use a `/my` or self-service endpoint to view their own leave requests.

### NOTE 2: `/api/v1/recruitment/jobs` — 404

This endpoint does not exist. The actual path may differ (e.g., `/api/v1/jobs` or `/api/v1/recruitment/job-postings`). Not an RBAC issue.

### NOTE 3: `/api/v1/wall/posts` — 403

The employee does not have `WALL:VIEW` permission. If wall posts are intended to be visible to all employees (social wall feature), then `WALL:VIEW` should be added to the EMPLOYEE role. If wall access is intentionally restricted, this is correct.
