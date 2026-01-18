# Codebase Violations Report

**Generated**: January 19, 2026
**Scope**: Backend + Frontend architecture compliance
**Status**: Partial remediation completed

---

## Executive Summary

This report identifies violations of the established coding standards and architectural patterns defined in `DEVELOPER_GUIDE.md` and `FILE_STRUCTURE_REFACTOR.md`.

**Key Findings**:
- **12 controllers** bypass the service layer by directly accessing repositories
- **2 domain modules** use `/model` subdirectory when not needed (< 5 entities)
- **0 repositories** found in domain layer (GOOD - previous cleanup succeeded)
- **0 services** found in domain layer (GOOD)

---

## Violation Categories

### 1. Layer Boundary Violations (CRITICAL)

**Definition**: Controllers must only call services, never repositories directly.

**Violation Count**: 12 files

**Impact**:
- Bypasses business logic and transaction management
- Makes code difficult to test and maintain
- Violates hexagonal architecture principles

**Affected Files**:
```
src/main/java/com/hrms/api/attendance/controller/AttendanceController.java
src/main/java/com/hrms/api/platform/controller/PlatformController.java
src/main/java/com/hrms/api/meeting/controller/MeetingController.java
src/main/java/com/hrms/api/statutory/controller/StatutoryContributionController.java
src/main/java/com/hrms/api/statutory/controller/TDSController.java
src/main/java/com/hrms/api/statutory/controller/ProvidentFundController.java
src/main/java/com/hrms/api/statutory/controller/ESIController.java
src/main/java/com/hrms/api/statutory/controller/ProfessionalTaxController.java
src/main/java/com/hrms/api/psa/controller/PSAProjectController.java
src/main/java/com/hrms/api/psa/controller/PSATimesheetController.java
src/main/java/com/hrms/api/psa/controller/PSAInvoiceController.java
src/main/java/com/hrms/api/leave/controller/LeaveRequestController.java
```

**Example Violation**:
```java
// FILE: AttendanceController.java (Line 13, 41)
import com.hrms.infrastructure.employee.repository.EmployeeRepository;

@RestController
public class AttendanceController {
    private final EmployeeRepository employeeRepository; // VIOLATION!

    // Lines 453, 464, 478, 488
    employeeRepository.findByIdAndTenantId(employeeId, tenantId) // Direct repo access!
}
```

**Remediation**:
- Move repository access to service layer
- Controllers should only call service methods
- See "Fixed Violations" section for example

---

### 2. Domain Structure Inconsistency (MINOR)

**Definition**: Use `domain/<module>/model/` only when module has > 5 entities

**Violation Count**: 2 modules

**Impact**:
- Unnecessary folder nesting
- Inconsistent module structure
- Adds import complexity

**Affected Modules**:

1. **`domain/wall/model/`** (5 entities):
   - Has exactly 5 entities (at the threshold)
   - Should flatten to `domain/wall/`
   - Entities: WallPost, PostReaction, PostComment, PollOption, PollVote

2. **`domain/user/model/`** (1 entity):
   - Has only 1 entity (UserNotificationPreferences)
   - Should definitely flatten to `domain/user/`
   - Main user entities are already in `domain/user/`

**Recommendation**:
- Flatten `domain/user/model/` immediately (only 1 file)
- Consider flattening `domain/wall/model/` (borderline case)

---

### 3. Repository Placement (COMPLIANT)

**Status**: ✅ NO VIOLATIONS FOUND

All repositories correctly reside in `infrastructure/<module>/repository/`.

Previous cleanup successfully moved repositories out of domain layer.

---

### 4. Service Placement (COMPLIANT)

**Status**: ✅ NO VIOLATIONS FOUND

All services correctly reside in `application/<module>/service/`.

No services found in domain layer.

---

## Fixed Violations (Representative Sample)

### Fix #1: AttendanceController Repository Access

**File**: `src/main/java/com/hrms/api/attendance/controller/AttendanceController.java`

**Problem**:
```java
// BEFORE (Lines 13, 41)
import com.hrms.infrastructure.employee.repository.EmployeeRepository;

@RestController
public class AttendanceController {
    private final EmployeeRepository employeeRepository; // WRONG!

    private Employee getEmployeeOrThrow(UUID employeeId, UUID tenantId) {
        return employeeRepository.findByIdAndTenantId(employeeId, tenantId)
            .orElseThrow(() -> new EntityNotFoundException("Employee not found"));
    }
}
```

**Solution**:
```java
// AFTER
// Remove repository import
// Add service method in EmployeeService:

@Service
public class EmployeeService {
    private final EmployeeRepository repository;

    public Employee getByIdAndTenant(UUID id, UUID tenantId) {
        return repository.findByIdAndTenantId(id, tenantId)
            .orElseThrow(() -> new EntityNotFoundException("Employee not found"));
    }
}

// Controller uses service instead
@RestController
public class AttendanceController {
    private final EmployeeService employeeService; // CORRECT!

    private Employee getEmployeeOrThrow(UUID employeeId, UUID tenantId) {
        return employeeService.getByIdAndTenant(employeeId, tenantId);
    }
}
```

**Impact**: Controller now respects layer boundaries

---

## Remaining Violations by Priority

### Priority 1 - CRITICAL (Must Fix)

**Layer Boundary Violations** (11 remaining controllers after fix #1):
- platform/PlatformController.java
- meeting/MeetingController.java
- statutory/* (5 controllers)
- psa/* (3 controllers)
- leave/LeaveRequestController.java

**Estimated Effort**: 2-4 hours
**Risk**: High - violates core architectural principles

---

### Priority 2 - MEDIUM (Should Fix)

**Domain Structure Inconsistency**:
- Flatten `domain/user/model/` (1 file to move)
- Consider flattening `domain/wall/model/` (5 files)

**Estimated Effort**: 30 minutes
**Risk**: Low - cosmetic issue

---

### Priority 3 - LOW (Nice to Have)

None identified.

---

## Enforcement Recommendations

### Immediate Actions

1. **Add ArchUnit Tests** (Automated Enforcement):
```java
// src/test/java/com/hrms/architecture/LayerArchitectureTest.java
@Test
public void controllersShouldNotAccessRepositories() {
    noClasses()
        .that().resideInAPackage("..api..")
        .should().accessClassesThat().resideInAPackage("..infrastructure..repository..")
        .check(importedClasses);
}
```

2. **Pre-commit Hook** (`.git/hooks/pre-commit`):
```bash
#!/bin/bash
# Check for controller -> repository imports
if git diff --cached --name-only | grep -q "Controller.java"; then
    if git diff --cached | grep -q "import.*infrastructure.*repository"; then
        echo "ERROR: Controllers cannot import repositories directly!"
        exit 1
    fi
fi
```

3. **CI/CD Pipeline Check**:
```yaml
# .github/workflows/architecture-check.yml
- name: Validate Architecture
  run: mvn test -Dtest=LayerArchitectureTest
```

---

### Long-term Solutions

1. **Code Review Checklist**:
   - [ ] Controllers only inject services
   - [ ] No repositories in domain layer
   - [ ] Domain entities have no business logic
   - [ ] All exceptions properly handled

2. **IDE Live Templates**:
   - Create IntelliJ templates for correct controller/service patterns
   - Auto-generate service methods when needed

3. **Documentation Updates**:
   - ✅ DEVELOPER_GUIDE.md updated with concrete rules
   - ✅ FILE_STRUCTURE_REFACTOR.md clarified
   - ✅ .editorconfig expanded for all file types

---

## Appendix: File Statistics

### Backend Structure Compliance

| Layer | Expected Location | Violations |
|-------|-------------------|------------|
| Controllers | `api/<module>/controller/` | 0 ✅ |
| Services | `application/<module>/service/` | 0 ✅ |
| Entities | `domain/<module>/` | 2 (unnecessary /model) ⚠️ |
| Repositories | `infrastructure/<module>/repository/` | 0 ✅ |

### Dependency Compliance

| Rule | Compliant Files | Violations |
|------|----------------|------------|
| Controllers → Services only | ~90% | 12 controllers |
| Services → Repositories | 100% | 0 ✅ |
| No repos in domain | 100% | 0 ✅ |
| No services in domain | 100% | 0 ✅ |

---

## Next Steps

1. **Immediate** (This Week):
   - Fix remaining 11 controller violations
   - Flatten `domain/user/model/`
   - Add ArchUnit tests

2. **Short-term** (This Sprint):
   - Add pre-commit hooks
   - Update CI pipeline
   - Review and merge PRs

3. **Long-term** (Next Quarter):
   - Establish code review checklist
   - Create IDE templates
   - Training session on architecture

---

**Report Authors**: Development Team
**Last Updated**: January 19, 2026
**Status**: Living document - will be updated as violations are fixed
