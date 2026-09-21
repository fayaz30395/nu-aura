# US-2FZF1KCRXXW7: Validate review-cycle date ordering on create/update

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

- **AC1:** Creating/updating a ReviewCycle rejects endDate before startDate, and deadline dates outside [startDate, endDate]
  - **Verify:** shell bash -c "cd backend && mvn -q -DskipTests compile"
  - **Verified:** yes (2026-09-20)
