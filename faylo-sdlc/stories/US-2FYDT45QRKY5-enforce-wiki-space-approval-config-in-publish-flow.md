# US-2FYDT45QRKY5: Enforce wiki space approval config in publish flow (currently config-only, no enforcement)

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

- **AC1:** WikiPageService.publishPage() checks WikiSpaceApprovalService.isApprovalRequired(spaceId); if true, page goes to PENDING_APPROVAL status and routes to the configured approver instead of publishing directly
  - **Verify:** shell bash -c "cd backend && mvn -q -DskipTests compile"
  - **Verified:** yes (2026-09-20)
