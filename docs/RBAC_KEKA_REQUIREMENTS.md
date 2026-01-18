# Keka-Style RBAC Requirements (NU-AURA)

Last Updated: 2026-01-16

## Completed Implementation Summary

All core RBAC features have been successfully implemented and tested:
- ✅ Scope-based permissions (ALL, LOCATION, DEPARTMENT, TEAM, SELF, CUSTOM)
- ✅ Custom target picker UI with employee/department/location search
- ✅ L1 approval routing (reporting manager only)
- ✅ Expense RBAC scope enforcement (39 passing tests)
- ✅ Recruitment RBAC scope enforcement
- ✅ Attendance date endpoint with scope enforcement
- ✅ Custom target names resolution
- ✅ Leave request scope validation
- ✅ Complete role-permission seeding

## Purpose
Define the target RBAC model to match Keka-style behavior, based on current implementation.
This document highlights current capabilities and required deltas.

See `docs/architecture/RBAC_P0_MATRIX.md` for the P0 scope matrix template.

## Required RBAC Behavior (Keka-style)
- Access levels must support: ALL, LOCATION, DEPARTMENT, TEAM (direct + indirect), SELF, CUSTOM.
- Users can hold multiple roles; effective permission is the union of all roles.
- For a given permission, the most permissive scope wins.
- Custom scope is allowed for any permission and can target specific entities.
- Approval workflows use L1 approval only (reporting manager).
- UI must expose role permission scopes and custom targets similar to Keka.

## Current Implementation Status

### Backend - COMPLETED

#### Roles and Permissions
- Multiple roles per user via `user_roles` (`backend/src/main/java/com/hrms/domain/user/User.java`).
- Role permissions stored in `role_permissions` with `RoleScope` (`backend/src/main/java/com/hrms/domain/user/RolePermission.java`).

#### Scope Types - COMPLETED
- `RoleScope` enum includes: **ALL, LOCATION, DEPARTMENT, TEAM, SELF, CUSTOM**
  (`backend/src/main/java/com/hrms/domain/user/RoleScope.java`).
- Legacy aliases `GLOBAL -> ALL` and `OWN -> SELF` are supported for backward compatibility.
- Scope ranking implemented: ALL(100) > LOCATION(80) > DEPARTMENT(60) > TEAM(40) > SELF(20) > CUSTOM(10).

#### Custom Scope Targets - COMPLETED
- `CustomScopeTarget` entity stores targets per role-permission (`backend/src/main/java/com/hrms/domain/user/CustomScopeTarget.java`).
- Target types supported: `EMPLOYEE`, `DEPARTMENT`, `LOCATION`.
- Repository: `CustomScopeTargetRepository` with finder methods.
- Database table: `custom_scope_targets` (migration `118-create-custom-scope-targets-table.xml`).

#### Scope Enforcement - COMPLETED
- `DataScopeService` applies scope filters using JPA Specifications:
  - **ALL**: No filtering (full access).
  - **LOCATION**: Filters by `officeLocationId` or `locationId`.
  - **DEPARTMENT**: Filters by `departmentId`.
  - **TEAM**: Filters by current user + all direct/indirect reportees.
  - **SELF**: Filters by current user's `employeeId` or `userId`.
  - **CUSTOM**: Filters by explicitly selected employee, department, or location IDs.
- `SecurityContext` stores permission scopes and custom targets per permission in ThreadLocal.
- Custom target IDs are loaded during authentication via `AuthService.loadCustomScopeTargets()`.

#### Scope Resolution - COMPLETED
- `PermissionScopeMerger` merges permissions across multiple roles:
  - Most permissive scope wins (higher rank).
  - For CUSTOM scope, targets are unioned across roles.
- `AuthService.buildPermissionMap()` uses the merger for token/context setup.

#### Endpoint Scope Enforcement - COMPLETED
- Leave endpoints enforce scope:
  - `GET /api/v1/leave-requests/{id}` validates access based on scope.
  - `GET /api/v1/leave-requests/employee/{employeeId}` validates employee access.
  - Scope validation helpers in `LeaveRequestController`.
- Tests: `LeaveRequestControllerScopeTest` covers SELF, TEAM, DEPARTMENT, ALL scope scenarios.

#### L1 Approval Flow - COMPLETED
- Leave approval routed to L1 (reporting manager) only:
  - `LeaveRequestService.validateApproverIsManager()` enforces manager relationship.
  - Controller uses `SecurityContext.getCurrentEmployeeId()` as approver (no client input).
- Letter approval already uses `SecurityContext.getCurrentEmployeeId()`.
- Tests: `LeaveRequestServiceTest` covers L1 approval validation.

#### Role Management Service - COMPLETED
- `RoleManagementService.assignPermissionsWithScope()` accepts scope and custom targets.
- API endpoint: `PUT /api/v1/roles/{roleId}/permissions-with-scope`.
- DTO: `AssignPermissionsWithScopeRequest` with `PermissionScopeRequest` list.

### Frontend - COMPLETED

#### Role Management UI
- Role permissions page (`frontend/app/admin/roles/page.tsx`) supports:
  - Scope selection per permission via `ScopeSelector` component.
  - Custom target picker with search for employees, departments, locations.
  - Save button disabled when CUSTOM scope has no targets selected.

#### Custom Target Picker - COMPLETED
- `CustomTargetPicker.tsx` component with:
  - Tabbed interface for Employee/Department/Location selection.
  - Debounced search with API integration.
  - Module-level caching for office locations.
  - Badge display for selected targets.

#### Scope Selector - COMPLETED
- `ScopeSelector.tsx` component with:
  - Icons for each scope type.
  - Compact mode option.
  - Integration with CustomTargetPicker for CUSTOM scope.

## API Endpoints

### Role Permission Management
```
GET    /api/v1/roles/{roleId}/permissions          - Get permissions for role
POST   /api/v1/roles/{roleId}/permissions          - Assign permissions (basic)
PUT    /api/v1/roles/{roleId}/permissions-with-scope  - Assign permissions with scopes and targets
DELETE /api/v1/roles/{roleId}/permissions/{code}   - Remove permission from role
```

### Leave Requests (Scope-Enforced)
```
GET    /api/v1/leave-requests/{id}                 - Get by ID (scope validated)
GET    /api/v1/leave-requests/employee/{empId}     - Get by employee (scope validated)
GET    /api/v1/leave-requests                      - Get all (spec-based filtering)
POST   /api/v1/leave-requests/{id}/approve         - Approve (L1 manager only)
POST   /api/v1/leave-requests/{id}/reject          - Reject (L1 manager only)
```

## Files Modified/Created

### Backend
- `domain/user/RoleScope.java` - Extended with CUSTOM, ranking, legacy aliases
- `domain/user/CustomScopeTarget.java` - New entity for custom targets
- `domain/user/TargetType.java` - Enum: EMPLOYEE, DEPARTMENT, LOCATION
- `infrastructure/user/repository/CustomScopeTargetRepository.java` - New repository
- `common/security/SecurityContext.java` - Added custom target storage
- `common/security/DataScopeService.java` - Added CUSTOM scope handling
- `application/user/service/PermissionScopeMerger.java` - New scope merger
- `application/user/service/RoleManagementService.java` - Extended for scopes
- `application/auth/service/AuthService.java` - Loads custom targets
- `api/user/controller/RoleController.java` - New endpoint
- `api/user/dto/AssignPermissionsWithScopeRequest.java` - New DTO
- `api/user/dto/PermissionScopeRequest.java` - New DTO
- `api/leave/controller/LeaveRequestController.java` - Scope validation added
- `application/leave/service/LeaveRequestService.java` - L1 approval validation
- `resources/db/changelog/changes/118-create-custom-scope-targets-table.xml` - Migration

### Frontend
- `components/admin/ScopeSelector.tsx` - Scope dropdown with icons
- `components/admin/CustomTargetPicker.tsx` - Custom target search/select
- `app/admin/roles/page.tsx` - Integrated scope management
- `lib/types/roles.ts` - Extended types
- `lib/api/roles.ts` - New API methods

### Tests
- `api/leave/LeaveRequestControllerScopeTest.java` - 11 scope enforcement tests
- `application/leave/service/LeaveRequestServiceTest.java` - L1 approval tests

## Implementation Status

### Phase 1: Core RBAC Infrastructure - ✅ COMPLETED
- ✅ RoleScope enum with ALL, LOCATION, DEPARTMENT, TEAM, SELF, CUSTOM
- ✅ CustomScopeTarget entity and repository
- ✅ DataScopeService with scope filtering logic
- ✅ PermissionScopeMerger for multi-role permission resolution
- ✅ SecurityContext enhancements for custom targets
- ✅ Database migration for custom_scope_targets table

### Phase 2: API & Service Layer - ✅ COMPLETED
- ✅ RoleManagementService.assignPermissionsWithScope()
- ✅ Leave request scope enforcement with validation
- ✅ Expense scope enforcement (39 tests passing)
- ✅ Recruitment scope enforcement
- ✅ Attendance date endpoint scope enforcement
- ✅ L1 approval routing (reporting manager validation)

### Phase 3: Custom Target Picker UI - ✅ COMPLETED
- ✅ ScopeSelector component with icons
- ✅ CustomTargetPicker with employee/department/location tabs
- ✅ Debounced search with API integration
- ✅ Module-level caching for office locations
- ✅ Badge display for selected targets
- ✅ Integration in role management page

### Phase 4: L1 Approval Routing - ✅ COMPLETED
- ✅ LeaveRequestService.validateApproverIsManager()
- ✅ Controller uses SecurityContext.getCurrentEmployeeId()
- ✅ Letter approval already using SecurityContext
- ✅ Tests covering L1 approval validation

### Future Enhancements (Optional)
- [ ] Effective permission viewer for users
- [ ] Audit logging for permission changes
- [ ] Bulk permission assignment UI
- [ ] Role cloning with scope preservation
- [ ] Apply scope enforcement to employee directory endpoints

## Notes
- This implementation builds on the existing RBAC foundation rather than replacing it.
- Platform RBAC and legacy RBAC converge on the scoped model.
- CUSTOM scope always includes user's own data as a fallback.
- Legacy scope names (GLOBAL, OWN) are supported for backward compatibility.
