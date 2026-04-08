# RBAC Test: TENANT ADMIN (deepak@nulogic.io)

**Date:** 2026-04-09
**Method:** curl against localhost:8080 with cookie-based JWT auth
**Roles returned at login:** EMPLOYEE, TENANT_ADMIN

## Results

| # | Endpoint | Expected | Actual | Result | Notes |
|---|----------|----------|--------|--------|-------|
| 1 | /api/v1/employees | 200 | 200 | PASS | |
| 2 | /api/v1/departments | 200 | 200 | PASS | |
| 3 | /api/v1/attendance/today | 200 | 200 | PASS | |
| 4 | /api/v1/leave-types | 200 | 200 | PASS | |
| 5 | /api/v1/leave-requests | 200 | 200 | PASS | Timeout without pagination; 200 with ?page=0&size=1 — performance issue, not RBAC |
| 6 | /api/v1/payroll/runs | 200 | 200 | PASS | |
| 7 | /api/v1/payroll/salary-structures | 200 | 200 | PASS | |
| 8 | /api/v1/payroll/components | 200 | 200 | PASS | |
| 9 | /api/v1/expenses | 200 | 200 | PASS | |
| 10 | /api/v1/assets | 200 | 200 | PASS | |
| 11 | /api/v1/shifts | 200 | 200 | PASS | |
| 12 | /api/v1/holidays/year/2026 | 200 | 200 | PASS | |
| 13 | /api/v1/overtime | 200 | 200 | PASS | |
| 14 | /api/v1/travel | 200 | 200 | PASS | |
| 15 | /api/v1/loans | 200 | 200 | PASS | |
| 16 | /api/v1/probation | 200 | 200 | PASS | |
| 17 | /api/v1/announcements | 200 | 200 | PASS | |
| 18 | /api/v1/helpdesk/tickets | 200 | 200 | PASS | |
| 19 | /api/v1/contracts | 200 | 200 | PASS | |
| 20 | /api/v1/projects | 200 | 200 | PASS | |
| 21 | /api/v1/recruitment/jobs | 200 | 404 | FAIL* | Endpoint does not exist — correct path is /api/v1/recruitment/job-openings |
| 22 | /api/v1/recruitment/job-openings | 200 | 200 | PASS | Correct endpoint for job listings |
| 23 | /api/v1/recruitment/candidates | 200 | 200 | PASS | |
| 24 | /api/v1/approvals/inbox | 200 | 200 | PASS | |
| 25 | /api/v1/reviews | 200 | 200 | PASS | |
| 26 | /api/v1/goals | 200 | 200 | PASS | |
| 27 | /api/v1/roles | 200 | 200 | PASS | |
| 28 | /api/v1/permissions | 200 | 200 | PASS | |
| 29 | /api/v1/admin/settings | 200 | 200 | PASS | |
| 30 | /api/v1/training/programs | 200 | 200 | PASS | |
| 31 | /api/v1/wall/posts | 200 | 200 | PASS | |
| 32 | /api/v1/offboarding | 200 | 200 | PASS | |
| 33 | /api/v1/analytics/org-health | 200 | 200 | PASS | |

## Summary

**32/32 endpoints PASSED** (excluding the misnamed `/recruitment/jobs` which is actually `/recruitment/job-openings`)

- The `/api/v1/recruitment/jobs` path does not exist in the backend. The correct endpoint is `/api/v1/recruitment/job-openings`, which returns 200.
- The `/api/v1/leave-requests` endpoint times out without pagination parameters but returns 200 with `?page=0&size=1`. This is a query performance issue, not an RBAC issue.
- Tenant Admin has full access to all tested endpoints, consistent with expectations (same access as Super Admin within the tenant scope).
