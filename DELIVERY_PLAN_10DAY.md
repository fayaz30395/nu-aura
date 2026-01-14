# NU-AURA 10-Day Delivery Plan

## Overview
Implementation of Keka-style RBAC with fine-grained scopes, permission alignment, and UI parity.

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

---

### Phase 1: Permission & Controller Alignment (Days 3-4)
**Status: IN_PROGRESS**

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
| Verify all controllers have @RequiresPermission | TODO | Audit all endpoints |

**Exit Criteria:**
- [x] LETTER_* permissions match P0 matrix
- [x] ESIGNATURE_* permissions match P0 matrix
- [x] No client-supplied approver/creator IDs
- [x] All list endpoints apply scope filtering
- [ ] All endpoints have @RequiresPermission

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

---

### Phase 3: Frontend UI Parity (Days 7-8)
**Status: PARTIAL**

| Task | Status | Notes |
|------|--------|-------|
| Scope selector in role permissions modal | DONE | Dropdown per permission |
| Custom target picker component | TODO | For CUSTOM scope selection |
| Frontend types for scope | DONE | RoleScope, CustomTarget types |
| API client for scope endpoints | DONE | assignPermissionsWithScope() |

**Exit Criteria:**
- [x] Admin can select scope per permission
- [ ] Admin can select custom targets
- [ ] Visual scope badges on permissions
- [ ] Validation for CUSTOM scope targets

---

### Phase 4: L1 Approval & Workflow (Days 9-10)
**Status: TODO**

| Task | Status | Notes |
|------|--------|-------|
| L1 approval routing (Letter) | TODO | Route to reporting manager |
| L1 approval routing (Leave) | TODO | Route to reporting manager |
| Verify approval security | DONE | Uses SecurityContext for approver |

**Exit Criteria:**
- [ ] Approvals route to immediate manager only
- [ ] No multi-level approval chains
- [ ] Manager resolved from Employee.managerId

---

## Standards Enforcement

### Mandatory for All Endpoints
- `@RequiresPermission` annotation required
- List endpoints must use `DataScopeService.getScopeSpecification()`
- No client-supplied user IDs for security operations

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
- Permission constants for LETTER_* and ESIGNATURE_*
- Controller security fixes (SecurityContext usage)
- Role management API with scope support
- Frontend scope selector UI
- Scope filtering on Letter list endpoints (getAllLetters, getPendingApprovals)
- Scope filtering on ESignature list endpoints (getAllSignatureRequests)

**Remaining:**
- Custom target picker UI component
- L1 approval routing implementation
- Full endpoint audit for @RequiresPermission

---

## Architecture Changes
See [ARCH_CHANGELOG.md](docs/architecture/ARCH_CHANGELOG.md) for detailed change log.
