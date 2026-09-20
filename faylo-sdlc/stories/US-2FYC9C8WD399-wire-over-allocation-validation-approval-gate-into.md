# US-2FYC9C8WD399: Wire over-allocation validation + approval gate into CreateAllocationModal

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

- **AC1:** CreateAllocationModal calls useValidateAllocation on submit; when the result flags over-allocation, AllocationApprovalModal shows current/proposed/resulting % with Submit-for-Approval or admin Skip-Approval, instead of silently allowing 150%+ allocation
  - **Verify:** shell bash -c "cd frontend && npx tsc --noEmit"
  - **Verified:** yes (2026-09-20)
