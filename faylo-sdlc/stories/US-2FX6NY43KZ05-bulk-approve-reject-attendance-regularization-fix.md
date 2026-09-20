# US-2FX6NY43KZ05: Bulk approve/reject attendance regularization (FIX-013 Keka parity)

> **Epic:** EP-2FWVEHJV5G29
> **Tier:** async-review
> **Status:** Done
> **Created:** 2026-09-19
> **Created-by:** faylo new

## User Story

**As a** ...
**I want** ...
**So that** ...

## Acceptance Criteria

- **AC1:** POST /api/v1/attendance/batch-approve-regularization and /batch-reject-regularization exist, gated by ATTENDANCE_APPROVE, reuse existing per-record approve/reject via self-proxy, with unit tests
  - **Verify:** shell bash -c "grep -q '\"/batch-approve-regularization\"' backend/src/main/java/com/nulogic/api/attendance/controller/AttendanceController.java && grep -q '\"/batch-reject-regularization\"' backend/src/main/java/com/nulogic/api/attendance/controller/AttendanceController.java && grep -q 'batchApproveRegularization\|batchRejectRegularization' backend/src/main/java/com/nulogic/api/attendance/controller/AttendanceController.java"
  - **Verified:** yes (2026-09-20)
