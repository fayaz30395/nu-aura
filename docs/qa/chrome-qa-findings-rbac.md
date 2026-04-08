# NU-AURA Chrome QA Findings - Phase 2 RBAC Tests
## Date: 2026-04-08
## Browser: Chrome via Claude-in-Chrome MCP

---

## STATUS: BLOCKED - Backend Unstable

RBAC testing requires stable backend to:
1. Login as different roles (Employee, Team Lead, HR Manager)
2. Verify permission-based access control on routes
3. Confirm denial responses for unauthorized access

The backend (localhost:8080) experienced 3 outages during Phase 1 testing, preventing Phase 2 from starting.

**Pre-requisite**: Stable backend for at least 15 minutes to complete all RBAC tests.

---

## Planned RBAC Test Matrix

### AS EMPLOYEE (Saran V - saran@nulogic.io):
| Route | Expected | Status |
|-------|----------|--------|
| /dashboard | PASS (own data) | UNTESTED |
| /me/profile | PASS | UNTESTED |
| /admin | DENY | UNTESTED |
| /payroll/runs | DENY | UNTESTED |
| /recruitment | DENY | UNTESTED |
| /leave | PASS (own) | UNTESTED |
| /attendance | PASS (own) | UNTESTED |
| /fluence/wiki | PASS (read) | UNTESTED |

### AS TEAM LEAD (Mani S - mani@nulogic.io):
| Route | Expected | Status |
|-------|----------|--------|
| /dashboard | PASS (team data) | UNTESTED |
| /leave/approvals | PASS (team) | UNTESTED |
| /admin | DENY | UNTESTED |
| /payroll/runs | DENY | UNTESTED |

### AS HR MANAGER (Jagadeesh N - jagadeesh@nulogic.io):
| Route | Expected | Status |
|-------|----------|--------|
| /employees | PASS (full) | UNTESTED |
| /leave/approvals | PASS | UNTESTED |
| /recruitment | PASS | UNTESTED |
| /admin | DENY | UNTESTED |
