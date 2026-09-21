# US-2FZF1K3ATY44: Validate goal progress and target values at API boundary

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

- **AC1:** GoalController.updateProgress rejects progressPercentage outside 0-100; GoalRequest rejects negative targetValue/currentValue and dueDate before startDate
  - **Verify:** shell bash -c "cd backend && mvn -q -DskipTests compile"
  - **Verified:** yes (2026-09-20)
