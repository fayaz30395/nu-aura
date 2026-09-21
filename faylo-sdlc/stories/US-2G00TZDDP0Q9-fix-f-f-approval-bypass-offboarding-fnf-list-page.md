# US-2G00TZDDP0Q9: Fix F&F approval bypass: offboarding/fnf list page allows approving settlements in DRAFT status (not just PENDING_APPROVAL), letting reviewers skip the submit-for-approval step - inconsistent with [id]/fnf and settlements pages which correctly gate on PENDING_APPROVAL only

> **Epic:** EP-2FWT73TBXRCF
> **Tier:** hard-gate
> **Status:** Verified
> **Created:** 2026-09-21
> **Created-by:** faylo new

## User Story

**As a** ...
**I want** ...
**So that** ...

## Acceptance Criteria

- **AC1:** canApprove on offboarding/fnf list page only allows approval when status is PENDING_APPROVAL, matching the other two pages
  - **Verify:** shell cd frontend && npx tsc --noEmit
  - **Verified:** yes (2026-09-21)
