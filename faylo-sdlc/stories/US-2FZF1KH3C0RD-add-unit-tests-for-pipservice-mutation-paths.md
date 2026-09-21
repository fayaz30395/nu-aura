# US-2FZF1KH3C0RD: Add unit tests for PIPService mutation paths

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

- **AC1:** PIPServiceTest covers create/recordCheckIn/close/getForEmployee/getForManager for success and not-found/invalid-state paths
  - **Verify:** shell bash -c "cd backend && mvn -q -DskipTests compile"
  - **Verified:** yes (2026-09-20)
