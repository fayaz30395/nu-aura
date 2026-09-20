# US-2FYDSHQHW68Z: Build exit-process asset-recovery UI (return/lost/waive/verify) — real backend, zero frontend

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

- **AC1:** Offboarding pages call the 5 unused ExitManagementService asset-recovery endpoints so a manager can actually mark laptop/badge/etc as returned/lost/waived during exit, not just list assets read-only
  - **Verify:** shell bash -c "cd frontend && npx tsc --noEmit"
  - **Verified:** yes (2026-09-20)
