# NU-AURA 10-Day Delivery Plan

## Overview
Implementation of Keka-style RBAC with fine-grained scopes, permission alignment, and UI parity.

## RBAC Architecture Note

**Supported Path:** Legacy RBAC using `permissions` and `role_permissions` tables (seeded in `099-seed-rbac-permissions-roles.xml`).

The app-level RBAC system (`app_permissions`, `app_role_permissions` in `086-create-nu-platform-tables.sql`) exists for future NU Platform multi-app support but is **not currently integrated** with `@RequiresPermission`. All permission enforcement uses the legacy RBAC path.

## Phase Tracking

### Phase 0: RBAC Core Foundation (Days 1-2)
**Status: COMPLETED**

| Task | Status | Notes |
|------|--------|-------|
| Add CUSTOM scope to RoleScope enum | DONE | ALL, LOCATION, DEPARTMENT, TEAM, SELF, CUSTOM |
| Create CustomScopeTarget entity | DONE | Stores employee/department/location targets |
| Create custom_scope_targets table (migration 118) | DONE | With indexes and FK constraints |
| Update DataScopeService for CUSTOM scope | DONE | Handles custom target filtering |
| Update TEAM scope for indirect reports | DONE | Recursive hierarchy traversal |
| Create ScopeContextService | DONE | Loads reportees + custom targets |
| Update JwtAuthenticationFilter | DONE | Populates scope context on auth |
| Migrate GLOBAL→ALL, OWN→SELF | DONE | In migration 118 |

**Exit Criteria:**
- [x] RoleScope enum has all 6 scopes
- [x] CustomScopeTarget entity persists targets
- [x] DataScopeService filters by all scope types
- [x] TEAM scope includes indirect reports
- [x] SecurityContext populated with scope data

**Evidence:**
- `RoleScope.java` - enum with ALL, LOCATION, DEPARTMENT, TEAM, SELF, CUSTOM
- `CustomScopeTarget.java` - entity for storing custom targets
- `DataScopeService.java` - getScopeSpecification() with CUSTOM handling
- Migration `118-create-custom-scope-targets-table.xml`

---

### Phase 1: Permission & Controller Alignment (Days 3-4)
**Status: COMPLETED**

| Task | Status | Notes |
|------|--------|-------|
| Define LETTER_* permissions in Permission.java | DONE | LETTER:TEMPLATE_VIEW, GENERATE, APPROVE, ISSUE |
| Define ESIGNATURE_* permissions | DONE | ESIGNATURE:VIEW, REQUEST, SIGN, MANAGE |
| Update LetterController permissions | DONE | Uses @RequiresPermission with LETTER_* |
| Update ESignatureController permissions | DONE | Uses @RequiresPermission with ESIGNATURE_* |
| Remove client-supplied IDs (Letter) | DONE | Uses SecurityContext.getCurrentEmployeeId() |
| Remove client-supplied IDs (ESign) | DONE | Uses SecurityContext.getCurrentEmployeeId() |
| Add scope filtering to Letter list endpoints | DONE | getAllLetters(), getPendingApprovals() |
| Add scope filtering to ESign list endpoints | DONE | getAllSignatureRequests() |
| Add @RequiresPermission to HomeController | DONE | DASHBOARD_VIEW, ATTENDANCE_VIEW_SELF |
| Add @RequiresPermission to WallController | DONE | WALL_VIEW, WALL_POST, WALL_COMMENT, WALL_REACT, WALL_PIN, WALL_MANAGE |
| Add WALL_* permissions to Permission.java | DONE | 6 WALL permissions + ATTENDANCE_VIEW_SELF |
| Seed WALL_* permissions in migration | DONE | 099-seed-rbac-permissions-roles.xml |
| Add WALL_* to RoleHierarchy defaults | DONE | EMPLOYEE gets basic WALL access, HR_MANAGER gets MANAGE+PIN+DASHBOARD |
| Fix WallController permission mapping | DONE | DELETE uses {WALL_POST, WALL_MANAGE}, votes use WALL_REACT |
| Fix HomeController attendance endpoint | DONE | Changed to /attendance/me with SecurityContext enforcement |
| Update frontend/tests for endpoint change | DONE | home.service.ts, tests updated |
| Verify high-risk controllers secured | DONE | PayrollController, UserController, RoleController, DataMigrationController |

**Exit Criteria:**
- [x] LETTER_* permissions match P0 matrix
- [x] ESIGNATURE_* permissions match P0 matrix
- [x] No client-supplied approver/creator IDs
- [x] All list endpoints apply scope filtering
- [x] HomeController has correct permissions (DASHBOARD_VIEW, ATTENDANCE_VIEW_SELF)
- [x] WallController has correct permissions ({WALL_POST, WALL_MANAGE} for delete, WALL_REACT for polls)
- [x] WALL_* and DASHBOARD_VIEW permissions seeded in database
- [x] Role defaults include WALL_* and DASHBOARD_VIEW (EMPLOYEE + HR_MANAGER)
- [x] High-risk controllers have @RequiresPermission
- [x] Attendance endpoint enforces self-only access via SecurityContext
- [x] Frontend and tests updated for /attendance/me endpoint

**Evidence:**
- `WallController.java:77` - `@RequiresPermission({WALL_POST, WALL_MANAGE})` for delete
- `HomeController.java:67-73` - `/attendance/me` with SecurityContext.getCurrentEmployeeId()
- `099-seed-rbac-permissions-roles.xml:479-568` - WALL_*, DASHBOARD_VIEW, ATTENDANCE_VIEW_SELF seeded
- `099-seed-rbac-permissions-roles.xml:1083-1087` - HR_MANAGER gets DASHBOARD_VIEW
- `RoleHierarchy.java:306-311` - EMPLOYEE gets WALL_* and DASHBOARD_VIEW
- `home.service.ts:116-118` - getMyAttendanceToday() calls /attendance/me
- `HomeControllerIntegrationTest.java:210` - tests /attendance/me

---

### Phase 2: Role Management API & Scope Assignment (Days 5-6)
**Status: COMPLETED**

| Task | Status | Notes |
|------|--------|-------|
| RoleManagementService accepts scope data | DONE | assignPermissionsWithScope() |
| RoleController exposes scope endpoints | DONE | PUT /permissions-with-scope |
| AuthService preserves scope from RolePermission | DONE | Loads scope per permission |
| PermissionScopeMerger for multi-role | DONE | Most permissive scope wins |

**Exit Criteria:**
- [x] API accepts scope + custom targets
- [x] Scopes persisted in role_permissions table
- [x] Custom targets persisted in custom_scope_targets
- [x] Multi-role merging uses most permissive scope

**Evidence:**
- `RoleManagementService.java` - assignPermissionsWithScope()
- `RoleController.java` - PUT /permissions-with-scope endpoint
- `PermissionScopeMerger.java` - merges scopes across roles

---

### Phase 3: Frontend UI Parity (Days 7-8)
**Status: COMPLETED**

| Task | Status | Notes |
|------|--------|-------|
| Scope selector in role permissions modal | DONE | Dropdown per permission with icons |
| Custom target picker component | DONE | Search & select employees/departments/locations |
| Frontend types for scope | DONE | RoleScope, CustomTarget types |
| API client for scope endpoints | DONE | assignPermissionsWithScope() |
| Inline custom target picker in permissions modal | DONE | Expands when CUSTOM scope selected |
| Validation warning for CUSTOM without targets | DONE | Amber warning in summary section |

**Exit Criteria:**
- [x] Admin can select scope per permission
- [x] Admin can select custom targets (employees, departments, locations)
- [x] Visual scope icons on scope selector buttons
- [x] Validation warning for CUSTOM scope without targets selected

**Evidence:**
- `CustomTargetPicker.tsx:40-56` - Module-level cache for office locations
- `CustomTargetPicker.tsx:119-137` - Search with cached locations filtering
- `ScopeSelector.tsx:24-56` - Scope icons and CustomTargetPicker integration
- `app/admin/roles/page.tsx:640-651` - ScopeSelector used per permission in modal
- `app/admin/roles/page.tsx:694-713` - Save disabled when CUSTOM has zero targets

---

### Phase 4: L1 Approval & Workflow (Days 9-10)
**Status: COMPLETED**

| Task | Status | Notes |
|------|--------|-------|
| L1 approval routing (Letter) | DONE | HR workflow - uses SecurityContext, scope-filtered |
| L1 approval routing (Leave) | DONE | Manager-only validation enforced |
| Verify approval security | DONE | Uses SecurityContext for approver |
| Remove client-supplied approverId (Leave) | DONE | Now derived from SecurityContext |
| Manager validation in LeaveRequestService | DONE | validateApproverIsManager() added |

**Exit Criteria:**
- [x] Leave approvals route to immediate manager only
- [x] No multi-level approval chains (L1 only)
- [x] Manager resolved from Employee.managerId
- [x] No client-supplied approver IDs in leave endpoints

**Evidence:**
- `LeaveRequestController.java:111-130` - Removed approverId param, uses SecurityContext
- `LeaveRequestService.java:111-126` - validateApproverIsManager() enforces L1 routing
- `LetterController.java:142` - Already uses SecurityContext.getCurrentEmployeeId()

**Design Note:**
Letters follow HR workflow (HR generates → HR Manager approves → HR issues) where approval is permission-based via LETTER_APPROVE with data scope filtering. Leave follows employee workflow where direct manager approval is required.

---

## Standards Enforcement

### Mandatory for All Endpoints
- `@RequiresPermission` annotation required
- List endpoints must use `DataScopeService.getScopeSpecification()`
- No client-supplied user IDs for security operations
- Self-only endpoints must use `SecurityContext.getCurrentEmployeeId()`

### Permission Naming Convention
- Format: `MODULE:ACTION` (e.g., `LETTER:GENERATE`)
- Actions: VIEW, CREATE, UPDATE, DELETE, MANAGE, APPROVE

---

## Current Progress Summary

**Completed:**
- RBAC core infrastructure (scopes, entities, migrations)
- DataScopeService with all scope types
- TEAM scope indirect reports
- Custom scope target storage
- Permission constants for LETTER_*, ESIGNATURE_*, WALL_*, DASHBOARD_VIEW, ATTENDANCE_VIEW_SELF
- Controller security fixes (SecurityContext usage)
- Role management API with scope support
- Frontend scope selector UI
- Scope filtering on Letter list endpoints (getAllLetters, getPendingApprovals)
- Scope filtering on ESignature list endpoints (getAllSignatureRequests)
- @RequiresPermission on HomeController (6 endpoints with correct permissions)
- @RequiresPermission on WallController (14 endpoints with correct permissions)
- WALL_* and DASHBOARD_VIEW permissions seeded in 099-seed-rbac-permissions-roles.xml
- WALL_* and DASHBOARD_VIEW added to RoleHierarchy.java defaults (EMPLOYEE, HR_MANAGER)
- High-risk controllers verified: PayrollController, UserController, RoleController, DataMigrationController
- Self-only enforcement on attendance endpoint via SecurityContext
- Frontend home.service.ts updated for /attendance/me
- All tests updated for /attendance/me endpoint
- Unused CONTENT_VIEW_* permissions removed
- CustomTargetPicker UI component with search and filtering
- ScopeSelector with icons and CustomTargetPicker integration
- Inline custom target picker in role permissions modal
- Validation warning for CUSTOM scope without targets

**Remaining:**
- None - All phases completed

---

## Architecture Changes
See [ARCH_CHANGELOG.md](../architecture/ARCH_CHANGELOG.md) for detailed change log.
