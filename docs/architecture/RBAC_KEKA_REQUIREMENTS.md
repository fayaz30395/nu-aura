# Keka-Style RBAC Requirements (NU-AURA)

Last Updated: 2026-01-13 (draft)

## Purpose
Define the target RBAC model to match Keka-style behavior, based on current implementation.
This document highlights current capabilities and required deltas.

See `docs/architecture/RBAC_P0_MATRIX.md` for the P0 scope matrix template.

## Required RBAC Behavior (Keka-style)
- Access levels must support: All, Location, Department, Team (direct + indirect), Self, Custom list.
- Users can hold multiple roles; effective permission is the union of all roles.
- For a given permission, the most permissive scope wins.
- Custom scope is allowed for any permission and can target specific entities.
- Approval workflows use L1 approval only (reporting manager).
- UI must expose role permission scopes and custom targets similar to Keka.

## Current Implementation Snapshot

Backend
- Roles and permissions:
  - Multiple roles per user via `user_roles` (`backend/src/main/java/com/hrms/domain/user/User.java`).
  - Role permissions are stored in `role_permissions` with `RoleScope` (`backend/src/main/java/com/hrms/domain/user/RolePermission.java`).
- Scope types:
  - `RoleScope` includes GLOBAL, LOCATION, DEPARTMENT, TEAM, OWN
    (`backend/src/main/java/com/hrms/domain/user/RoleScope.java`).
  - No CUSTOM scope in `RoleScope` today.
- Scope enforcement:
  - `DataScopeService` applies scope filters using `SecurityContext.getPermissionScope`
    (`backend/src/main/java/com/hrms/common/security/DataScopeService.java`).
  - TEAM scope uses a single `teamId` from context; indirect reports are not included.
- Permission checks:
  - `@RequiresPermission` is enforced via `PermissionAspect`, but it does not enforce scope.
- Role management:
  - `RoleManagementService` assigns permissions with `RoleScope.GLOBAL` only, no scope input.
- Platform RBAC:
  - App-level roles in `app_roles` + `app_role_permissions` have no scope.
  - Auth uses app roles first; scope is GLOBAL in that path.

Frontend
- Role/permission UIs (`frontend/app/admin/roles/page.tsx`,
  `frontend/app/admin/permissions/page.tsx`) allow assigning permissions,
  but do not support scope or custom targets.

## Required Changes (Delta to Implement)

### 1) Scope Model
- Extend `RoleScope` to include CUSTOM (and optionally ALL if GLOBAL is renamed).
- Introduce storage for custom scope targets:
  - Option A: add `scope_type` and `scope_value` to `role_permissions`.
  - Option B: new `role_permission_scopes` table with target type + target id.
  - Targets should include: Employee, Team, Department, Location, Project (as needed).

### 2) Permission Scope Resolution
- When a user has multiple roles:
  - Pick the most permissive scope per permission (GLOBAL > LOCATION > DEPARTMENT > TEAM > OWN).
  - If any role grants GLOBAL for a permission, ignore custom lists.
  - If only CUSTOM scopes exist for a permission, union all custom targets.
- Update token claims to include scope + custom targets or load them from DB on request.

### 3) Data Scope Enforcement
- Update `DataScopeService`:
  - Support CUSTOM by filtering entities by allowed ids.
  - Expand TEAM scope to include indirect reports (org hierarchy).
- Add `OrgHierarchyService` to compute team subtree.

### 4) Role and Permission Admin UI
- Update role management UI to assign scope per permission:
  - Scope picker: All, Location, Department, Team, Self, Custom.
  - Custom selector: pick specific entities (multi-select).
- Add effective-permission view for a user:
  - List permissions, scope, and originating roles.

### 5) L1 Approval Flow (Reporting Manager)
- Standardize approval routing to L1 only:
  - Leave requests
  - Attendance regularization
  - Expense approvals
  - Offer approvals (if applicable)
- L1 resolution uses reporting manager from org hierarchy.

### 6) RBAC Consistency and Tests
- Ensure every new endpoint uses `@RequiresPermission`.
- Enforce scope checks in services/repositories.
- Add tests for:
  - Scope resolution across multiple roles
  - CUSTOM scope filtering
  - TEAM scope with indirect reports
  - L1 approval routing

## Recommended Phased Implementation

Phase 0 (Baseline)
- Add CUSTOM scope data model (DB + entity + DTOs).
- Update `RoleManagementService` and role endpoints to accept scope data.
- Extend `AuthService` permission resolution for scopes.
- Add UI primitives for scope selection.

Phase 1 (P0 coverage)
- Apply scope handling to ATS + Offers + Employee visibility.
- Add L1 approval only routing to P0 workflows.

Phase 2 (System-wide)
- Roll out scope-based controls to remaining modules.
- Expand custom target selectors and reporting UI.

## Notes
- This plan builds on the existing RBAC foundation rather than replacing it.
- Platform RBAC and legacy RBAC should converge on a single scoped model.
