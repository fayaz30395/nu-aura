# US-2FZSWH5ZHSQD: Fix IDOR: MeetingController.getByEmployee lets any employee read another's 1:1 meeting notes with only EMPLOYEE_VIEW_SELF

> **Epic:** EP-2FWT73TBXRCF
> **Tier:** hard-gate
> **Status:** Done
> **Created:** 2026-09-21
> **Created-by:** faylo new

## User Story

**As a** ...
**I want** ...
**So that** ...

## Acceptance Criteria

- **AC1:** Endpoint enforces ownership/manager relationship or is repointed to the already-secured OneOnOneMeetingController
  - **Verify:** shell mvn -q -DskipTests compile
  - **Verified:** yes (2026-09-21)
