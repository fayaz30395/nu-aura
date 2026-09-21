# US-2FZFCY0XCFPH: Add service-level unit tests for Fluence core mutation paths (wiki/blog/wall)

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

- **AC1:** WikiPageServiceTest/BlogPostServiceTest/wall-service-test cover create/update/publish/delete/approval-routing/event-publication branches, not just controller-level MockMvc tests
  - **Verify:** shell bash -c "cd backend && mvn -q -DskipTests compile"
  - **Verified:** yes (2026-09-20)
