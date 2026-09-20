# US-2FYERYV698AZ: Add GOAL_CREATED/UPDATED, REVIEW_STARTED, DOCUMENT_UPLOADED, TRAINING_ENROLLED/COMPLETED notifications

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

- **AC1:** GoalService, PerformanceReviewService/ReviewCycleService, document upload flow, and training enrollment/completion each fire a notification matching the established pattern, closing out the remaining mid-priority notification-coverage gaps
  - **Verify:** shell bash -c "cd backend && mvn -q -DskipTests compile"
  - **Verified:** yes (2026-09-20)
