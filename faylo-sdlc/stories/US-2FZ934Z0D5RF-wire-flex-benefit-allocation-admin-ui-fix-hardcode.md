# US-2FZ934Z0D5RF: Wire flex-benefit allocation admin UI + fix hardcoded flex-credits stat

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

- **AC1:** Flex credits tile shows real remaining balance from getActiveFlexAllocation, not hardcoded 0; BENEFIT_MANAGE has UI to create/view flex allocations
  - **Verify:** shell bash -c "cd frontend && npx tsc --noEmit"
  - **Verified:** yes (2026-09-20)
