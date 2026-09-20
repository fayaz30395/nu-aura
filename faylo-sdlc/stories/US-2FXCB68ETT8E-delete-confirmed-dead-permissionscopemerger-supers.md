# US-2FXCB68ETT8E: Delete confirmed-dead PermissionScopeMerger (superseded by AuthService+ScopeContextService)

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

- **AC1:** PermissionScopeMerger.java removed - confirmed the same scope-merge/custom-target-union logic is already live via AuthService.mergeLegacyRolePermissions() and ScopeContextService.loadCustomScopeTargets()
  - **Verify:** shell bash -c "! test -f backend/src/main/java/com/nulogic/application/user/service/PermissionScopeMerger.java && cd backend && mvn -q -DskipTests compile"
  - **Verified:** yes (2026-09-20)
