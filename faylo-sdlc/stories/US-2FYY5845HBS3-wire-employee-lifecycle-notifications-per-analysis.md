# US-2FYY5845HBS3: Wire employee-lifecycle notifications per analysis (CREATED/PROMOTED/STATUS_CHANGED/DEPT_CHANGED/TRANSFERRED)

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

- **AC1:** New listener alongside WebhookEventListener adds in-app (+email for promotion) notifications: CREATED->manager, PROMOTED->employee+manager, STATUS_CHANGED->HR role, DEPARTMENT_CHANGED/TRANSFERRED->employee+old/new manager. EMPLOYEE_UPDATED and ATTENDANCE_CHECK_IN/OUT deliberately get no notification (signal-to-noise analysis says no).
  - **Verify:** shell bash -c "cd backend && mvn -q -DskipTests compile"
  - **Verified:** yes (2026-09-20)
