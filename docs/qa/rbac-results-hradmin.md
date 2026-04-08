# RBAC Test Results: HR ADMIN (+ Team Lead)

- **User**: Priya K (priya@nulogic.io)
- **Roles**: HR_ADMIN, TEAM_LEAD
- **Date**: 2026-04-08
- **Method**: curl against localhost:8080

## Summary

- **Total endpoints tested**: 31
- **200 OK**: 27
- **403 Forbidden**: 4 (permissions, admin/settings, wall/posts, offboarding)
- **404 Not Found**: 1 (recruitment/jobs — wrong path; correct path `/recruitment/job-openings` returns 200)

## Results

| # | Endpoint | HTTP Status | Expected | Result |
|---|----------|-------------|----------|--------|
| 1 | `/api/v1/employees` | 200 | 200 | PASS |
| 2 | `/api/v1/departments` | 200 | 200 | PASS |
| 3 | `/api/v1/attendance/today` | 200 | 200 | PASS |
| 4 | `/api/v1/leave-types` | 200 | 200 | PASS |
| 5 | `/api/v1/leave-requests` | 200 | 200 | PASS |
| 6 | `/api/v1/payroll/runs` | 200 | 200 | PASS |
| 7 | `/api/v1/payroll/salary-structures` | 200 | 200 | PASS |
| 8 | `/api/v1/payroll/components` | 200 | 200 | PASS |
| 9 | `/api/v1/expenses` | 200 | 200 | PASS |
| 10 | `/api/v1/assets` | 200 | 200 | PASS |
| 11 | `/api/v1/shifts` | 200 | 200 | PASS |
| 12 | `/api/v1/holidays/year/2026` | 200 | 200 | PASS |
| 13 | `/api/v1/overtime` | 200 | 200 | PASS |
| 14 | `/api/v1/travel` | 200 | 200 | PASS |
| 15 | `/api/v1/loans` | 200 | 200 | PASS |
| 16 | `/api/v1/probation` | 200 | 200 | PASS |
| 17 | `/api/v1/announcements` | 200 | 200 | PASS |
| 18 | `/api/v1/helpdesk/tickets` | 200 | 200 | PASS |
| 19 | `/api/v1/contracts` | 200 | 200 | PASS |
| 20 | `/api/v1/projects` | 200 | 200 | PASS |
| 21 | `/api/v1/recruitment/jobs` | 404 | 200 | SKIP — endpoint does not exist |
| 21a | `/api/v1/recruitment/job-openings` | 200 | 200 | PASS (correct endpoint) |
| 22 | `/api/v1/recruitment/candidates` | 200 | 200 | PASS |
| 23 | `/api/v1/approvals/inbox` | 200 | 200 | PASS |
| 24 | `/api/v1/reviews` | 200 | 200 | PASS |
| 25 | `/api/v1/goals` | 200 | 200 | PASS |
| 26 | `/api/v1/roles` | 200 | 200 | PASS |
| 27 | `/api/v1/permissions` | **403** | 200 | FAIL — requires `PERMISSION:MANAGE` |
| 28 | `/api/v1/admin/settings` | **403** | 200 | FAIL — requires `SYSTEM:ADMIN` |
| 29 | `/api/v1/training/programs` | 200 | 200 | PASS |
| 30 | `/api/v1/wall/posts` | **403** | 200 | FAIL — requires `WALL:VIEW` |
| 31 | `/api/v1/offboarding` | **403** | 200 | FAIL — requires `EXIT:VIEW` |

## Findings

### Correctly Permitted (27 endpoints)

HR Admin has broad access across all core HRMS modules as expected: employees, departments, attendance, leave, payroll (runs/salary-structures/components), expenses, assets, shifts, holidays, overtime, travel, loans, probation, announcements, helpdesk, contracts, projects, recruitment (job-openings + candidates), approvals, reviews, goals, roles, and training.

### Missing Permissions (4 endpoints — need investigation)

1. **`/api/v1/permissions`** — 403, requires `PERMISSION:MANAGE`. HR Admin has `ROLE:MANAGE` and `ROLE:READ` but not `PERMISSION:MANAGE`. This may be intentional (permission management reserved for Super Admin / Tenant Admin) or HR Admin may need `PERMISSION:VIEW` added.

2. **`/api/v1/admin/settings`** — 403, requires `SYSTEM:ADMIN`. HR Admin has `PLATFORM:MANAGE` and `PLATFORM:VIEW` but not `SYSTEM:ADMIN`. This is likely intentional — system settings reserved for Super/Tenant Admin.

3. **`/api/v1/wall/posts`** — 403, requires `WALL:VIEW`. HR Admin does not have this permission. This may be a gap — HR Admin should likely be able to view the company wall.

4. **`/api/v1/offboarding`** — 403, requires `EXIT:VIEW`. HR Admin has `OFFBOARDING:VIEW` and `OFFBOARDING:MANAGE` but the endpoint requires `EXIT:VIEW`. This is a **permission name mismatch** — the role has `OFFBOARDING:*` permissions but the endpoint checks for `EXIT:VIEW`.

### Endpoint Path Issue

- `/api/v1/recruitment/jobs` does not exist (404). The correct endpoint is `/api/v1/recruitment/job-openings` (200).

## Bugs to File

| ID | Severity | Description |
|----|----------|-------------|
| RBAC-HRADMIN-001 | Medium | HR Admin missing `WALL:VIEW` permission — cannot access wall/posts |
| RBAC-HRADMIN-002 | High | Offboarding endpoint requires `EXIT:VIEW` but HR Admin role has `OFFBOARDING:VIEW`/`OFFBOARDING:MANAGE` — permission name mismatch |
| RBAC-HRADMIN-003 | Low | `/api/v1/permissions` returns 403 for HR Admin (requires `PERMISSION:MANAGE`) — verify if intentional |
| RBAC-HRADMIN-004 | Low | `/api/v1/admin/settings` returns 403 for HR Admin (requires `SYSTEM:ADMIN`) — verify if intentional |
