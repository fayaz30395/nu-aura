# US-2FZ93K93RN6C: Populate pendingAcknowledgments count in compliance dashboard

> **Epic:** EP-2FWVEHJV5G29
> **Tier:** autonomous
> **Status:** Done
> **Created:** 2026-09-20
> **Created-by:** faylo new

## User Story

**As a** ...
**I want** ...
**So that** ...

## Acceptance Criteria

- **AC1:** GET /compliance/dashboard includes real pendingAcknowledgments count instead of frontend showing em-dash placeholder
  - **Verify:** shell bash -c "cd backend && mvn -q -DskipTests compile"
  - **Verified:** yes (2026-09-20)
