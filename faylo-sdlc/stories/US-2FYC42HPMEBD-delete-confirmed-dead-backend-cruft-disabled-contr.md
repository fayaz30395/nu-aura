# US-2FYC42HPMEBD: Delete confirmed-dead backend cruft (disabled controller + 5 zero-caller repo methods)

> **Epic:** EP-2FWVEHJV5G29
> **Tier:** autonomous
> **Status:** Done
> **Created:** 2026-09-20
> **Created-by:** faylo new

## User Story

**As a** ...
**I want** ...
**So that** ...

## Acceptance Criteria

- **AC1:** RecruitmentManagementController.java.disabled removed; deprecated zero-caller methods removed from EmployeePayrollRecordRepository, StepExecutionRepository, PSAProjectRepository, HeadcountPositionRepository
  - **Verify:** shell bash -c "cd backend && mvn -q -DskipTests compile"
  - **Verified:** yes (2026-09-20)
