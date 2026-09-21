# US-2FZSWHKP439Z: Fix IDOR: PIPService.getById scopes only by tenant, not employee/manager relationship (same class as fixed Feedback IDOR, never ported)

> **Epic:** EP-2FWT73TBXRCF
> **Tier:** hard-gate
> **Status:** Done
> **Created:** 2026-09-21
> **Created-by:** faylo new

## User Story

**As a** ...
**I want** ...
**So that** ...

## Acceptance Criteria

- **AC1:** PIP record access enforces ownership check mirroring FeedbackController.enforceFeedbackOwnershipCheck
  - **Verify:** shell mvn -q -DskipTests compile
  - **Verified:** yes (2026-09-21)
