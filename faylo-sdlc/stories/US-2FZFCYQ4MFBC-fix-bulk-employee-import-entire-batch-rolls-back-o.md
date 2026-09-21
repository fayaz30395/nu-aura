# US-2FZFCYQ4MFBC: Fix bulk employee import: entire batch rolls back on one row's DB-level failure

> **Epic:** EP-2FWVEHJV5G29
> **Tier:** hard-gate
> **Status:** Verified
> **Created:** 2026-09-20
> **Created-by:** faylo new

## User Story

**As a** ...
**I want** ...
**So that** ...

## Acceptance Criteria

- **AC1:** executeImport routes each row through a self-proxied REQUIRES_NEW transaction so a DB-level failure on one row (e.g. race-condition duplicate employee_code missed by pre-validation) doesn't roll back the other successfully-processed rows, matching its own PARTIAL_SUCCESS reporting contract
  - **Verify:** shell bash -c "cd backend && mvn -q -DskipTests compile"
  - **Verified:** yes (2026-09-20)
