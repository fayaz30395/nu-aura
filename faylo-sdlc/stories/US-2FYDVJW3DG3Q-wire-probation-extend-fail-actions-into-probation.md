# US-2FYDVJW3DG3Q: Wire probation extend/fail actions into probation page (hooks exist, no UI)

> **Epic:** EP-2FWVEHJV5G29
> **Tier:** autonomous
> **Status:** Verified
> **Created:** 2026-09-20
> **Created-by:** faylo new

## User Story

**As a** ...
**I want** ...
**So that** ...

## Acceptance Criteria

- **AC1:** app/probation/page.tsx adds Extend and Fail actions calling the existing useExtendProbation/useFailProbation hooks, alongside the current Confirm/Start-Evaluation buttons
  - **Verify:** shell bash -c "cd frontend && npx tsc --noEmit"
  - **Verified:** yes (2026-09-20)
