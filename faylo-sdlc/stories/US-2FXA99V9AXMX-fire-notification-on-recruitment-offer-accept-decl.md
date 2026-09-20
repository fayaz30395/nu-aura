# US-2FXA99V9AXMX: Fire notification on recruitment offer accept/decline (Hire gap)

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

- **AC1:** acceptOffer()/declineOffer() in RecruitmentManagementService publish a domain event consumed by a notification listener, matching the LeaveApprovedEvent/PerformanceReviewCompletedEvent pattern; today only auditLogService.logAction fires
  - **Verify:** shell bash -c "cd backend && mvn -q -DskipTests compile"
  - **Verified:** yes (2026-09-20)
