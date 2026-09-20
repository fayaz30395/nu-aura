# US-2FYE6BD3P1N9: Wire FileMetadata persistence + add GET employee-documents list endpoint

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

- **AC1:** Employee document uploads persist to FileMetadata (entityType/entityId already indexed for this, currently dead schema); new GET /employees/{id}/documents returns the persisted list so the frontend documents tab survives refresh/nav
  - **Verify:** shell bash -c "cd backend && mvn -q -DskipTests compile"
  - **Verified:** yes (2026-09-20)
