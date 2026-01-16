# NU-AURA 10-Day Delivery Plan

**Last Updated:** 2026-01-16
**Author:** Fayaz
**Status:** All Phases Complete ✅

## Overview

Keka-style RBAC implementation with fine-grained scopes (ALL, LOCATION, DEPARTMENT, TEAM, SELF, CUSTOM), permission alignment across all modules, and complete UI parity.

**Architecture:** Legacy RBAC using `permissions` and `role_permissions` tables (seeded in `099-seed-rbac-permissions-roles.xml`). App-level RBAC (`app_permissions`) exists for future NU Platform but is not currently integrated.

---

## Phase Summary

### Phase 0: RBAC Core Foundation ✅
**Days 1-2 | Status: COMPLETED**

**Deliverables:**
- RoleScope enum with 6 scopes (ALL, LOCATION, DEPARTMENT, TEAM, SELF, CUSTOM)
- CustomScopeTarget entity + database table (migration 118)
- DataScopeService with CUSTOM scope support
- TEAM scope with indirect reports (recursive hierarchy)
- ScopeContextService for loading reportees + custom targets
- JwtAuthenticationFilter populates SecurityContext with scope data
- Migrated GLOBAL→ALL, OWN→SELF

**Evidence:**
- `RoleScope.java` - 6 scope enum values
- `CustomScopeTarget.java` - entity
- `DataScopeService.java` - getScopeSpecification()
- `118-create-custom-scope-targets-table.xml` - migration

---

### Phase 1: Permission & Controller Alignment ✅
**Days 3-4 | Status: COMPLETED**

**Deliverables:**
- LETTER_*, ESIGNATURE_*, WALL_*, DASHBOARD_VIEW, ATTENDANCE_VIEW_SELF permissions
- @RequiresPermission on all controllers (Letter, ESignature, Home, Wall)
- Removed client-supplied IDs (uses SecurityContext.getCurrentEmployeeId())
- Scope filtering on Letter/ESignature list endpoints
- Self-only enforcement on /attendance/me endpoint
- Permission seeding in 099-seed-rbac-permissions-roles.xml
- RoleHierarchy defaults updated (EMPLOYEE, HR_MANAGER)
- High-risk controllers verified (Payroll, User, Role, DataMigration)

**Security Fixes:**
- Letter/ESignature: No client-supplied creator/approver IDs
- Home: /attendance/me enforces self-only via SecurityContext
- Wall: Correct permission mappings (DELETE uses {WALL_POST, WALL_MANAGE})

**Evidence:**
- `WallController.java:77` - DELETE permission
- `HomeController.java:67-73` - /attendance/me endpoint
- `099-seed-rbac-permissions-roles.xml:479-568` - WALL_* permissions
- `RoleHierarchy.java:306-311` - EMPLOYEE defaults

---

### Phase 2: Role Management API ✅
**Days 5-6 | Status: COMPLETED**

**Deliverables:**
- RoleManagementService.assignPermissionsWithScope()
- RoleController PUT /permissions-with-scope endpoint
- AuthService preserves scope from RolePermission
- PermissionScopeMerger for multi-role scope resolution (most permissive wins)
- Scopes persisted in role_permissions.scope column
- Custom targets persisted in custom_scope_targets table

**Evidence:**
- `RoleManagementService.java` - assignPermissionsWithScope()
- `RoleController.java` - PUT endpoint
- `PermissionScopeMerger.java` - merge logic

---

### Phase 3: Frontend UI Parity ✅
**Days 7-8 | Status: COMPLETED**

**Deliverables:**
- Scope selector dropdown per permission with visual icons
- CustomTargetPicker component (search employees/departments/locations)
- Frontend types (RoleScope, CustomTarget)
- API client for assignPermissionsWithScope()
- Inline custom target picker in permissions modal
- Validation warning for CUSTOM scope without targets

**Evidence:**
- `CustomTargetPicker.tsx:40-56` - Location cache
- `ScopeSelector.tsx:24-56` - Icons + integration
- `app/admin/roles/page.tsx:640-651` - Modal usage
- `app/admin/roles/page.tsx:694-713` - Validation

---

### Phase 4: L1 Approval & Workflow ✅
**Days 9-10 | Status: COMPLETED**

**Deliverables:**
- Leave approvals route to immediate manager only (L1)
- Manager validation enforced (validateApproverIsManager())
- No client-supplied approver IDs (uses SecurityContext)
- Letter HR workflow (HR → HR Manager → HR) with scope filtering

**Design:**
- **Letters:** Permission-based HR workflow with scope filtering
- **Leave:** Employee workflow with direct manager L1 approval

**Evidence:**
- `LeaveRequestController.java:111-130` - SecurityContext usage
- `LeaveRequestService.java:111-126` - validateApproverIsManager()

---

## Phase 1.5: Expense/Recruitment/Attendance RBAC ✅

**Added After Phase 4 | Status: COMPLETED**

### Expense Module
**Security Fixes:**
- Removed client-supplied approverId/rejecterId (CRITICAL)
- Added scope filtering to 6 list endpoints
- Added scope validation to get-by-id endpoint
- Frontend API route alignment

**Tests:** 39/39 passing (SELF, TEAM, ALL, LOCATION*, CUSTOM, admin bypass)
- *LOCATION/DEPARTMENT tests are negative cases only (require Employee fixtures for positive tests)

**Files:**
- `ExpenseClaimController.java` - Permission guards
- `ExpenseClaimService.java` - DataScopeService integration
- `expense.service.ts` - Removed approverId param
- `ExpenseClaimScopeIntegrationTest.java` - 39 tests

**Commits:**
- `58a9933` - Expense RBAC implementation
- `addaecf` - Expense RBAC tests
- `cb05ad7` - Scope determination fixes

### Recruitment Module
**Scope Enforcement:**
- List endpoints: getJobOpeningsByStatus, getCandidatesByJobOpening, getInterviewsByCandidate
- Get-by-id validation: getJobOpeningById, getCandidateById, getInterviewById
- Field mappings: hiringManagerId, assignedRecruiterId, interviewerId

**Tests:** 14/14 passing (SELF, TEAM, CUSTOM, ALL)
- **Note:** Uses mixed permissions (RECRUITMENT_VIEW, CANDIDATE_VIEW, RECRUITMENT_MANAGE)

**Files:**
- `RecruitmentManagementService.java` - Scope filtering + validation
- `RecruitmentManagementController.java` - Multiple permission types
- `RecruitmentScopeIntegrationTest.java` - 14 tests

**Commit:**
- `bfad374` - Recruitment RBAC + Attendance endpoint

### Attendance Module
**New Endpoint:**
- `GET /attendance/date/{date}` with TEAM/ALL scope filtering
- Addresses frontend API mismatch

**Files:**
- `AttendanceController.java` - New endpoint
- `AttendanceRecordService.java` - Service method

**Commit:**
- `bfad374` - Attendance date endpoint

### Additional Enhancements
**Custom Target Names:**
- Resolves TODO in RoleManagementService.java
- Displays human-readable names for CUSTOM scope targets
- Tenant-scoped lookups (EMPLOYEE/DEPARTMENT/LOCATION)

**Commit:**
- `da4163c` - Custom target names

**Permission Seeding:**
- RECRUITMENT_VIEW_ALL, RECRUITMENT_VIEW_TEAM, ATTENDANCE_MANAGE
- RoleHierarchy defaults updated (HR_MANAGER, TEAM_LEAD)

**Commit:**
- `d113b38` - Permission seeding

**Workload Persistence:**
- PUT /allocation endpoint with validation
- Frontend service integration
- Tenant-safe with comprehensive validation

**Files:**
- `ResourceManagementController.java` - Endpoint
- `AllocationDTOs.java` - UpdateAllocationRequest
- `ResourceManagementService.java` - updateAllocation()
- `resource-management.service.ts` - Frontend

---

## Standards Enforcement

### Mandatory Requirements
- ✅ @RequiresPermission annotation on all endpoints
- ✅ List endpoints use DataScopeService.getScopeSpecification()
- ✅ No client-supplied user IDs for security operations
- ✅ Self-only endpoints use SecurityContext.getCurrentEmployeeId()
- ✅ All queries filtered by TenantContext

### Permission Naming
Format: `MODULE:ACTION` (e.g., `LETTER:GENERATE`)
Actions: VIEW, CREATE, UPDATE, DELETE, MANAGE, APPROVE

---

## Test Coverage

| Module | Tests | Status |
|--------|-------|--------|
| Expense | 39 | ✅ PASSING |
| Recruitment | 14 | ✅ PASSING |
| Leave | 28 | ✅ PASSING |
| **Total** | **81** | **✅ ALL PASSING** |

---

## Deployment

### Pre-Deployment
- [x] All 81 tests passing
- [x] Database migrations validated
- [x] Frontend/backend synchronized

### Migration
```bash
# Liquibase auto-applies:
# - 118-create-custom-scope-targets-table.xml
# - 099-seed-rbac-permissions-roles.xml
```

### Verification
- [ ] Expense approvals scoped to TEAM/SELF
- [ ] Recruitment lists filtered by scope
- [ ] Attendance /date/{date} works
- [ ] Workload allocation edits persist
- [ ] Custom target names display correctly

---

## References

- [Implementation Report](RBAC_PHASE1_IMPLEMENTATION_REPORT.md) - Technical details
- [Executive Summary](RBAC_PHASE1_EXEC_SUMMARY.md) - Quick reference
- [RBAC Requirements](../architecture/RBAC_KEKA_REQUIREMENTS.md) - Canonical specs
- [Implementation Summary](../../RBAC_IMPLEMENTATION_SUMMARY.md) - Task tracking
- [Final Validation Summary](../../FINAL_VALIDATION_SUMMARY.md) - Corrections recap
- [Validation Summary (Detailed)](../../VALIDATION_SUMMARY_CORRECTED.md) - Full validation details

## Future Enhancements

1. **Test Coverage Improvements**
   - Add positive LOCATION/DEPARTMENT scope tests with Employee fixtures
   - Add integration test for workload update endpoint (PUT /allocation)
   - Add performance benchmarks for scope filtering

2. **Code Improvements**
   - Consolidate Recruitment permissions (currently uses VIEW/CANDIDATE_VIEW/MANAGE)
   - Add automated permission audit script
   - Cache permission scopes in Redis for better performance

---

## Architecture Changes

See [ARCH_CHANGELOG.md](../architecture/ARCH_CHANGELOG.md) for detailed changelog.
