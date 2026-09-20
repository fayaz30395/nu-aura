# US-2FYEK23MNGGZ: Add promotion/transfer eligibility gate (block during active probation/PIP)

> **Epic:** EP-2FWVEHJV5G29
> **Tier:** async-review
> **Status:** Done
> **Created:** 2026-09-20
> **Created-by:** faylo new

## User Story

**As a** ...
**I want** ...
**So that** ...

## Acceptance Criteria

- **AC1:** EmployeeService.updateEmployeeAdminFields rejects a level/designation change that constitutes a promotion when the employee has an active probation record or an active PIP, matching Keka's documented eligibility-gate model
  - **Verify:** shell bash -c "cd backend && mvn -q -DskipTests compile"
  - **Verified:** yes (2026-09-20)
