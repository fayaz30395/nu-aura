# RBAC Test: SUPER ADMIN (fayaz.m@nulogic.io)

**Date:** 2026-04-09
**Method:** curl against localhost:8080 with cookie-based JWT auth
**Roles returned at login:** SUPER_ADMIN, SKIP_LEVEL_MANAGER, REPORTING_MANAGER

## Results

| # | Endpoint | Expected | Actual | Result | Notes |
|---|----------|----------|--------|--------|-------|
| 1 | /api/v1/employees | 200 | 200 | PASS | |
| 2 | /api/v1/employees/1 | 200 | 400 | PASS* | Expects UUID, not integer — not an RBAC issue |
| 3 | /api/v1/employees/{uuid} | 200 | 200 | PASS | Tested with valid UUID (550e8400-e29b-41d4-a716-446655440040) |
| 4 | /api/v1/departments | 200 | 200 | PASS | |
| 5 | /api/v1/attendance/today | 200 | 200 | PASS | |
| 6 | /api/v1/leave-types | 200 | 200 | PASS | |
| 7 | /api/v1/leave-requests | 200 | 200 | PASS | |
| 8 | /api/v1/payroll/runs | 200 | 200 | PASS | |
| 9 | /api/v1/payroll/salary-structures | 200 | 200 | PASS | |
| 10 | /api/v1/payroll/components | 200 | 200 | PASS | |
| 11 | /api/v1/payroll/payslips | 200 | 200 | PASS | |
| 12 | /api/v1/payroll/statutory-filings | 200 | 200 | PASS | |
| 13 | /api/v1/expenses | 200 | 200 | PASS | |
| 14 | /api/v1/assets | 200 | 200 | PASS | |
| 15 | /api/v1/shifts | 200 | 200 | PASS | |
| 16 | /api/v1/holidays/year/2026 | 200 | 200 | PASS | |
| 17 | /api/v1/overtime | 200 | 200 | PASS | |
| 18 | /api/v1/travel | 200 | 200 | PASS | |
| 19 | /api/v1/loans | 200 | 200 | PASS | |
| 20 | /api/v1/probation | 200 | 200 | PASS | |
| 21 | /api/v1/letters | 200 | 200 | PASS | |
| 22 | /api/v1/announcements | 200 | 200 | PASS | |
| 23 | /api/v1/helpdesk/tickets | 200 | 200 | PASS | |
| 24 | /api/v1/contracts | 200 | 200 | PASS | |
| 25 | /api/v1/projects | 200 | 200 | PASS | |
| 26 | /api/v1/surveys | 200 | 200 | PASS | |
| 27 | /api/v1/performance/pip | 200 | 200 | PASS | |
| 28 | /api/v1/recruitment/jobs | 200 | 404 | FAIL* | Endpoint does not exist — correct path is /api/v1/recruitment/job-boards |
| 29 | /api/v1/recruitment/job-boards | 200 | 200 | PASS | Corrected endpoint |
| 30 | /api/v1/recruitment/candidates | 200 | 200 | PASS | |
| 31 | /api/v1/recruitment/interviews | 200 | 200 | PASS | |
| 32 | /api/v1/recruitment/agencies | 200 | 200 | PASS | |
| 33 | /api/v1/approvals/inbox | 200 | 200 | PASS | |
| 34 | /api/v1/benefits/plans | 200 | 200 | PASS | |
| 35 | /api/v1/time-tracking/entries | 200 | 200 | PASS | |
| 36 | /api/v1/okr/objectives | 200 | 200 | PASS | |
| 37 | /api/v1/reviews | 200 | 200 | PASS | |
| 38 | /api/v1/goals | 200 | 200 | PASS | |
| 39 | /api/v1/review-cycles | 200 | 200 | PASS | |
| 40 | /api/v1/wellness/dashboard | 200 | 200 | PASS | |
| 41 | /api/v1/roles | 200 | 200 | PASS | |
| 42 | /api/v1/permissions | 200 | 200 | PASS | |
| 43 | /api/v1/feedback360/cycles | 200 | 200 | PASS | |
| 44 | /api/v1/referrals | 200 | 200 | PASS | |
| 45 | /api/v1/implicit-role-rules | 200 | 200 | PASS | |
| 46 | /api/v1/office-locations | 200 | 200 | PASS | |
| 47 | /api/v1/analytics/org-health | 200 | 200 | PASS | |
| 48 | /api/v1/training/programs | 200 | 200 | PASS | |
| 49 | /api/v1/wall/posts | 200 | 200 | PASS | |
| 50 | /api/v1/admin/settings | 200 | 200 | PASS | |
| 51 | /api/v1/offboarding | 200 | 200 | PASS | |

## Summary

**49/49 RBAC checks PASSED** — Super Admin has unrestricted access to all endpoints.

**0 RBAC violations found.**

### Non-RBAC Issues (2)

1. **`/api/v1/employees/1`** returned 400 — the endpoint expects a UUID path variable, not an integer. When tested with a valid UUID, it returned 200. This is correct API behavior, not an RBAC issue.

2. **`/api/v1/recruitment/jobs`** returned 404 — this endpoint does not exist in the codebase. The correct path is `/api/v1/recruitment/job-boards` (mapped in `JobBoardController`), which returns 200. This is a test specification issue, not an RBAC issue.

### Conclusion

Super Admin RBAC is working correctly. The `SUPER_ADMIN` role bypasses all permission checks as designed, granting unrestricted access across all 49 tested endpoints spanning NU-HRMS, NU-Hire, NU-Grow, NU-Fluence, and platform admin modules.
