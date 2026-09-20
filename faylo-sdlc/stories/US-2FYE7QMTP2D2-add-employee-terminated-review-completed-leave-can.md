# US-2FYE7QMTP2D2: Add EMPLOYEE_TERMINATED, REVIEW_COMPLETED, LEAVE_CANCELLED notifications

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

- **AC1:** Offboarding fires an in-app/email notification (IT/manager/HR) on termination, not just the external webhook; PerformanceCompensationListener notifies the employee their review completed; LeaveRequestService.cancelLeaveRequest gets a notifyLeaveCancelled counterpart matching the existing approve/reject pattern
  - **Verify:** shell bash -c "cd backend && mvn -q -DskipTests compile"
  - **Verified:** yes (2026-09-20)
