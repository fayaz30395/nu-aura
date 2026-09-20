# US-2FXCB6R6V47Y: Route WikiSpaceController approval config through WikiSpaceApprovalService.configureApproval()

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

- **AC1:** WikiSpaceController's create/update handlers call WikiSpaceApprovalService.configureApproval() instead of setting approvalEnabled/approverEmployeeId directly on the DTO
  - **Verify:** shell bash -c "cd backend && mvn -q -DskipTests compile"
  - **Verified:** yes (2026-09-20)
