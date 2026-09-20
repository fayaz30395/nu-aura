# US-2FX576KC3WDC: Bulk approve/reject leave requests (FIX-013 Keka parity)

> **Epic:** EP-2FWVEHJV5G29
> **Tier:** async-review
> **Status:** In Progress
> **Created:** 2026-09-19
> **Created-by:** faylo new

## User Story

**As a** ...
**I want** ...
**So that** ...

## Acceptance Criteria

- **AC1:** POST /api/v1/leave-requests/batch-approve and /batch-reject exist, gated by LEAVE_APPROVE/LEAVE_REJECT, reuse the existing per-request approve/reject service methods via self-proxy so one bad ID doesn't roll back the batch, with unit tests
  - **Verify:** shell bash -c "grep -q '\"/batch-approve\"' backend/src/main/java/com/nulogic/api/leave/controller/LeaveRequestController.java && grep -q '\"/batch-reject\"' backend/src/main/java/com/nulogic/api/leave/controller/LeaveRequestController.java && grep -q 'RequiresPermission(Permission.LEAVE_APPROVE)' backend/src/main/java/com/nulogic/api/leave/controller/LeaveRequestController.java && grep -q 'RequiresPermission(Permission.LEAVE_REJECT)' backend/src/main/java/com/nulogic/api/leave/controller/LeaveRequestController.java && grep -q 'batchApprove\|batchReject' backend/src/main/java/com/nulogic/application/leave/service/LeaveRequestService.java"
  - **Verified:** pending
