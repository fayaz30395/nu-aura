# US-2GBAZC4NXGZY: BUG-E1: expense receipts could never be uploaded — storage category rejected + nothing persisted the file

> **Epic:** EP-2G4FWY5JGW6W
> **Tier:** async-review
> **Status:** Draft
> **Created:** 2026-09-25
> **Created-by:** faylo new

## User Story

**As a** ...
**I want** ...
**So that** ...

## Acceptance Criteria

- **AC1:** A receipt file uploads, is persisted against the expense item, and the owner can read it back through an expense-scoped endpoint that does not require DOCUMENT:VIEW
  - **Verify:** shell bash -c "cd backend && mvn -q -Dtest=FileStorageServiceTest,ExpenseItemServiceTest -Dsurefire.failIfNoSpecifiedTests=false test"
  - **Verified:** pending
- **AC2:** Adding an expense item persists at all (expense_items.tenant_id is stamped) — found while verifying this flow end to end
  - **Verify:** shell bash -c "cd backend && mvn -q -Dtest=ExpenseItemTenantStampingTest -Dsurefire.failIfNoSpecifiedTests=false test"
  - **Verified:** pending
