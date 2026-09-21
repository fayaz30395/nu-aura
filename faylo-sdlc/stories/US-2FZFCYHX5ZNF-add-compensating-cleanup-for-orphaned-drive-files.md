# US-2FZFCYHX5ZNF: Add compensating cleanup for orphaned Drive files when receipt/document DB mapping insert fails

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

- **AC1:** When a file uploads to Drive successfully but the DB mapping insert fails, the orphaned Drive file is deleted (compensating rollback) or flagged for a cleanup job, not left permanently orphaned
  - **Verify:** shell bash -c "cd backend && mvn -q -DskipTests compile"
  - **Verified:** yes (2026-09-20)
