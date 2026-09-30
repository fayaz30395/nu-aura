# US-2G9W1P18V8BT: V332: re-apply the Arun->Sumit manager_id correction that V316 silently no-op'd in prod (flyway repair realigns the checksum but never re-runs the migration)

> **Epic:** EP-2G4FWY5JGW6W
> **Tier:** async-review
> **Status:** Draft
> **Created:** 2026-09-24
> **Created-by:** faylo new

## User Story

**As a** ...
**I want** ...
**So that** ...

## Acceptance Criteria

- **AC1:** A forward migration V332 sets the correct employee-id manager_id with the RLS tenant GUC set, and is idempotent/guarded so it is safe on databases where V316's rewritten form already applied
  - **Verify:** shell bash -c "cd backend && mvn -q -Dtest=ArunManagerMigrationTest test"
  - **Verified:** yes (2026-09-25)
