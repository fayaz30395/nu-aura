# RBAC Implementation Summary

## Completed Tasks

### 1. Leave Request RBAC Scope Enforcement ✅
- **Files Modified:**
  - `LeaveRequestController.java` - Super admin bypass fix (isSuperAdmin)
  - `LeaveRequestController.java` - MANAGE permission fallback
  - `Permission.java` - Added LEAVE_MANAGE constant
  - `099-seed-rbac-permissions-roles.xml` - Added LEAVE:MANAGE permission
  - `LeaveRequestScopeIntegrationTest.java` - 28 comprehensive tests

- **Key Features:**
  - Scope validation on all view endpoints (ALL/LOCATION/DEPT/TEAM/SELF/CUSTOM)
  - DataScopeService integration for list endpoints
  - Super admin role bypass
  - MANAGE permission implies VIEW permissions

- **Test Results:** 28/28 passing

---

## Pending Tasks - Implementation Plan

### 2. Expense RBAC Scope Enforcement (HIGH PRIORITY)
**Status:** In Progress

**Security Issues:**
- ❌ Approve/reject endpoints accept client-supplied approverId/rejecterId
- ❌ No scope validation on approval/rejection
- ❌ All list endpoints lack scope filtering
- ❌ View endpoint lacks scope validation

**Required Changes:**

#### Backend - ExpenseClaimController.java
```java
// BEFORE:
@PostMapping("/{claimId}/approve")
public ResponseEntity<ExpenseClaimResponse> approveExpenseClaim(
    @PathVariable UUID claimId,
    @RequestParam UUID approverId) { // ❌ Security vulnerability

// AFTER:
@PostMapping("/{claimId}/approve")
public ResponseEntity<ExpenseClaimResponse> approveExpenseClaim(
    @PathVariable UUID claimId) { // ✅ No client parameter
```

#### Backend - ExpenseClaimService.java
- Inject `DataScopeService`
- Use `SecurityContext.getCurrentEmployeeId()` for approver/rejecter
- Add `validateEmployeeAccess()` helper (following LeaveRequestController pattern)
- Apply scope filtering to:
  - `getAllExpenseClaims()`
  - `getExpenseClaimsByEmployee()`
  - `getExpenseClaimsByStatus()`
  - `getPendingApprovals()` ⚠️ Critical for approvers
  - `getExpenseClaimsByDateRange()`
  - `getExpenseSummary()`

#### Frontend - expense.service.ts
```typescript
// BEFORE:
async processApproval(claimId: string, approverId: string, approval: ApprovalRequest)

// AFTER:
async processApproval(claimId: string, approval: ApprovalRequest) // Remove approverId
```

**Estimated Time:** 2-3 hours

---

### 3. Recruitment RBAC Scope Enforcement (HIGH PRIORITY)
**Status:** Planned

**Current State:**
- ✅ `getAllJobOpenings()` - Has scope filtering
- ✅ `getAllCandidates()` - Has scope filtering
- ❌ `getJobOpeningsByStatus()` - Missing scope filtering
- ❌ `getCandidatesByJobOpening()` - Missing scope filtering
- ❌ `getInterviewsByCandidate()` - Missing scope filtering
- ❌ All get-by-id methods - Missing scope validation

**DataScopeService Support:**
- Already supports `hiringManagerId`, `assignedRecruiterId`, `interviewerId`
- Ready for TEAM, SELF, CUSTOM scope filtering

**Required Changes:**

#### Backend - RecruitmentManagementService.java
```java
// Add scope filtering pattern:
Specification<JobOpening> scopeSpec = dataScopeService
    .getScopeSpecification(Permission.RECRUITMENT_VIEW);
Specification<JobOpening> combinedSpec = Specification
    .where(tenantSpec).and(statusSpec).and(scopeSpec);
```

- Update 3 list methods with scope specifications
- Add 3 validation methods: `validateRecruitmentAccess()`, `validateCandidateAccess()`, `validateInterviewAccess()`
- Call validation in get-by-id methods

**Estimated Time:** 2 hours

---

### 4. Attendance Date Endpoint (MEDIUM PRIORITY)
**Status:** Planned

**Issue:** Frontend calls `/attendance/date/{date}` but endpoint doesn't exist

**Solution:** Add new endpoint

#### Backend - AttendanceController.java
```java
@GetMapping("/date/{date}")
@RequiresPermission({ Permission.ATTENDANCE_VIEW_ALL, Permission.ATTENDANCE_VIEW_TEAM })
public ResponseEntity<List<AttendanceResponse>> getAttendanceByDate(
    @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {

    String permission = SecurityContext.hasPermission(Permission.ATTENDANCE_VIEW_ALL)
        ? Permission.ATTENDANCE_VIEW_ALL
        : Permission.ATTENDANCE_VIEW_TEAM;

    Specification<AttendanceRecord> scopeSpec = dataScopeService
        .getScopeSpecification(permission);

    List<AttendanceRecord> records = attendanceService.getAttendanceByDate(date, scopeSpec);
    return ResponseEntity.ok(records.stream().map(this::toResponse).collect(Collectors.toList()));
}
```

#### Backend - AttendanceRecordService.java
```java
@Transactional(readOnly = true)
public List<AttendanceRecord> getAttendanceByDate(
    LocalDate date,
    Specification<AttendanceRecord> scopeSpec) {
    // Implementation with tenant + date + scope specs
}
```

**Estimated Time:** 1 hour

---

### 5. Custom Target Names Resolution (LOW PRIORITY)
**Status:** Planned

**TODO Location:** `RoleManagementService.java:499`

**Required Changes:**
- Inject `EmployeeRepository`, `DepartmentRepository`, `OfficeLocationRepository`
- Implement `resolveTargetName()` method
- Update `mapPermissionToResponse()` to populate targetName

```java
private String resolveTargetName(CustomScopeTarget target) {
    switch (target.getTargetType()) {
        case EMPLOYEE:
            return employeeRepository.findById(target.getTargetId())
                .map(emp -> emp.getFirstName() + " " + emp.getLastName())
                .orElse("Unknown Employee");
        case DEPARTMENT:
            return departmentRepository.findById(target.getTargetId())
                .map(Department::getName)
                .orElse("Unknown Department");
        case LOCATION:
            return officeLocationRepository.findById(target.getTargetId())
                .map(OfficeLocation::getName)
                .orElse("Unknown Location");
    }
}
```

**Estimated Time:** 1-2 hours

---

### 6. Workload Persistence API (LOW PRIORITY)
**Status:** Planned

**TODO Location:** Frontend workload `page.tsx:289-291`

**Required Changes:**

#### Backend
1. Add PUT endpoint to `ResourceManagementController.java`
2. Create `UpdateAllocationRequest.java` DTO
3. Add `updateEmployeeAllocation()` method to `ResourceManagementService.java`

#### Frontend
1. Add method to `resource-management.service.ts`
2. Update `page.tsx` handleEditAllocation to call API

**Estimated Time:** 2 hours (1.5h backend + 0.5h frontend)

---

## Test Requirements

### Expense Tests (Priority: High)
- [ ] Test approve/reject with TEAM scope
- [ ] Test approve/reject with DEPARTMENT scope
- [ ] Test approve/reject with LOCATION scope
- [ ] Test approve/reject with ALL scope
- [ ] Verify approver cannot approve out-of-scope expenses
- [ ] Test list endpoints filter by scope
- [ ] Test SELF scope only shows own expenses
- [ ] Test CUSTOM scope with employee/dept/location targets

### Recruitment Tests (Priority: High)
- [ ] Test scope filtering on getJobOpeningsByStatus
- [ ] Test scope filtering on getCandidatesByJobOpening
- [ ] Test scope filtering on getInterviewsByCandidate
- [ ] Verify get-by-id throws AccessDeniedException for out-of-scope
- [ ] Test CUSTOM scope with recruitment targets

### Attendance Tests (Priority: Medium)
- [ ] Test /date/{date} endpoint with ATTENDANCE_VIEW_ALL
- [ ] Test /date/{date} endpoint with ATTENDANCE_VIEW_TEAM
- [ ] Verify date parameter parsing
- [ ] Test empty results for dates with no attendance

---

## Implementation Sequence

### Phase 1: Critical Security Fixes (4-5 hours)
1. Expense RBAC (2-3h)
2. Recruitment RBAC (2h)

### Phase 2: Feature Completion (2-3 hours)
3. Attendance Date Endpoint (1h)
4. Custom Target Names (1-2h)

### Phase 3: Enhancement (2 hours)
5. Workload Persistence (2h)

**Total Estimated Time:** 8-10 hours

---

## Documentation Alignment

### Files to Update:
- `RBAC_KEKA_REQUIREMENTS.md` - Ensure Phase 3/4 marked complete
- `DELIVERY_PLAN_10DAY.md` - Update progress tracking

---

## Pattern Reference

All implementations should follow the established pattern from `LeaveRequestController.java`:

```java
// 1. Permission annotation
@RequiresPermission({Permission.MODULE_VIEW_ALL, Permission.MODULE_VIEW_TEAM})

// 2. Determine permission with scope
private String determineViewPermission() {
    if (SecurityContext.getPermissionScope(Permission.MODULE_VIEW_ALL) != null) {
        return Permission.MODULE_VIEW_ALL;
    }
    // ... check other permissions in priority order
}

// 3. Apply scope specification to queries
Specification<Entity> scopeSpec = dataScopeService.getScopeSpecification(permission);
Specification<Entity> combinedSpec = Specification.where(tenantSpec).and(scopeSpec);
return repository.findAll(combinedSpec, pageable);

// 4. Validate access on individual records
private void validateEmployeeAccess(UUID targetEmployeeId, String permission) {
    if (SecurityContext.isSuperAdmin()) return;

    RoleScope scope = SecurityContext.getPermissionScope(permission);
    switch (scope) {
        case ALL: return;
        case TEAM: // check reportees
        case SELF: // check own ID
        // ... other scope checks
    }
    throw new AccessDeniedException("No access");
}
```

---

## Success Criteria

### Expense Module
- ✅ No client-supplied approver/rejecter IDs
- ✅ All list endpoints use DataScopeService
- ✅ View endpoint validates scope
- ✅ Tests cover all scope types

### Recruitment Module
- ✅ All list endpoints use DataScopeService
- ✅ All get-by-id methods validate scope
- ✅ Tests cover recruitment-specific fields

### Attendance Module
- ✅ Date endpoint exists and works
- ✅ Proper scope filtering applied
- ✅ Frontend integration working

### General
- ✅ All changes follow established patterns
- ✅ No security vulnerabilities
- ✅ Comprehensive test coverage
- ✅ Documentation updated
