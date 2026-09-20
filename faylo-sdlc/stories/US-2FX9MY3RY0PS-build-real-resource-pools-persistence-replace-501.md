# US-2FX9MY3RY0PS: Build real resource-pools persistence (replace 501-stub controller)

> **Epic:** EP-2FWVEHJV5G29
> **Tier:** hard-gate
> **Status:** In Progress
> **Created:** 2026-09-20
> **Created-by:** faylo new

## User Story

**As a** ...
**I want** ...
**So that** ...

## Acceptance Criteria

- **AC1:** ResourcePoolController's 5 endpoints backed by a real resource_pools + resource_pool_members table (new Flyway migration), entity, repository, service - replacing the 2026 QA-sweep stub. app.features.resource-pools stays default false (operator turns on when ready)
  - **Verify:** `shell` cd backend && mvn -q -Dtest=ResourcePoolServiceTest test
  - **Verified:** pending
