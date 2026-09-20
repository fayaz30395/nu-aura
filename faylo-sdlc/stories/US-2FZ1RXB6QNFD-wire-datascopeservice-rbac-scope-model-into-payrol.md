# US-2FZ1RXB6QNFD: Wire DataScopeService (RBAC scope model) into Payroll, Compensation, Performance, Benefits, Compliance

> **Epic:** EP-2FWVEHJV5G29
> **Tier:** hard-gate
> **Status:** Done
> **Created:** 2026-09-20
> **Created-by:** faylo new

## User Story

**As a** ...
**I want** ...
**So that** ...

## Acceptance Criteria

- **AC1:** Services in these 5 domains apply DataScopeService.getScopeSpecification() the same way the ~12 already-wired domains do (Attendance, Assets, Leave, Expense, Recruitment, Letters, ESignature, Employee Directory), giving row-level LOCATION/DEPARTMENT/TEAM scope enforcement instead of coarse action-level-only gating
  - **Verify:** shell bash -c "cd backend && mvn -q -DskipTests compile"
  - **Verified:** yes (2026-09-20)
