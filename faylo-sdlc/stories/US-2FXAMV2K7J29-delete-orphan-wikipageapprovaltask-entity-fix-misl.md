# US-2FXAMV2K7J29: Delete orphan WikiPageApprovalTask entity + fix misleading approval copy (Fluence cleanup)

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

- **AC1:** WikiPageApprovalTask.java (zero references) is removed, and DeleteSpaceModal's 'approval request will be sent' copy no longer claims a non-existent approval flow
  - **Verify:** shell bash -c "! test -f backend/src/main/java/com/nulogic/domain/knowledge/WikiPageApprovalTask.java"
  - **Verified:** yes (2026-09-20)
