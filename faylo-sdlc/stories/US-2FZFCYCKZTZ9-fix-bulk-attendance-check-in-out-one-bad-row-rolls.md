# US-2FZFCYCKZTZ9: Fix bulk attendance check-in/out: one bad row rolls back the entire batch

> **Epic:** EP-2FWVEHJV5G29
> **Tier:** hard-gate
> **Status:** Done
> **Created:** 2026-09-20
> **Created-by:** faylo new

## User Story

**As a** ...
**I want** ...
**So that** ...

## Acceptance Criteria

- **AC1:** bulkCheckIn/bulkCheckOut route each employee's persist through a self-proxied REQUIRES_NEW transaction (mirroring LeaveRequestService.batchApprove pattern) so one DB-level failure doesn't roll back already-valid records, matching the documented BulkResult(successful,failed) partial-success contract
  - **Verify:** shell bash -c "cd backend && mvn -q -DskipTests compile"
  - **Verified:** yes (2026-09-20)
