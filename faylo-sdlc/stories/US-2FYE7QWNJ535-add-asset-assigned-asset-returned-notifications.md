# US-2FYE7QWNJ535: Add ASSET_ASSIGNED + ASSET_RETURNED notifications

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

- **AC1:** AssetManagementService.assignAsset/returnAsset fire a notification on the actual action, distinct from the existing approval-workflow notifyAssetApproved/Rejected which only cover the approval decision
  - **Verify:** shell bash -c "cd backend && mvn -q -DskipTests compile"
  - **Verified:** yes (2026-09-20)
