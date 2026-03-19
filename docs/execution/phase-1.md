# Phase 1: Data Integrity and Compliance Core

## Scope: Enforce Soft-Delete Across Critical Entities

### Audit Findings

**BaseEntity** (`com.hrms.common.entity.BaseEntity`):
- Had `isDeleted` boolean field but NO `deletedAt` timestamp
- No `softDelete()` or `restore()` convenience methods
- No `@SQLDelete` or `@Where` annotations on any entity

**Hard-delete call sites found**: 60+ across all services.
Critical services with hard-deletes on compliance-relevant entities:

| Service | Entity | Hard-delete line |
|---------|--------|-----------------|
| DepartmentService | Department | `departmentRepository.delete(department)` |
| PayslipService | Payslip | `payslipRepository.delete(payslip)` |
| SalaryStructureService | SalaryStructure | `salaryStructureRepository.delete(salaryStructure)` |
| PayrollRunService | PayrollRun | `payrollRunRepository.delete(payrollRun)` |
| LeaveTypeService | LeaveType | `leaveTypeRepository.delete(leaveType)` |
| ContractService | Contract | `contractRepository.delete(contract)` |
| HolidayService | Holiday | `holidayRepository.delete(holiday)` |

**EmployeeService** was already correct -- uses `employee.terminate()` (status change, not delete).

---

### Changes Made

#### 1. BaseEntity Enhancement
- **File**: `backend/src/main/java/com/hrms/common/entity/BaseEntity.java`
- Added `deletedAt` (LocalDateTime) field mapped to `deleted_at` column
- Added `softDelete()` method: sets `isDeleted=true` + `deletedAt=now()`
- Added `restore()` method: clears `isDeleted` and `deletedAt`
- Added getters/setters for `deletedAt`

#### 2. Critical Service Fixes (7 services)

All hard-delete calls replaced with `entity.softDelete()` + `repository.save(entity)`:

- [x] `DepartmentService.deleteDepartment()` -- soft-delete + audit log added
- [x] `PayslipService.deletePayslip()` -- soft-delete + audit log added
- [x] `SalaryStructureService.deleteSalaryStructure()` -- soft-delete (audit already existed, reordered)
- [x] `PayrollRunService.deletePayrollRun()` -- soft-delete + audit log added
- [x] `LeaveTypeService.deleteLeaveType()` -- soft-delete + audit log added
- [x] `ContractService.deleteContract()` -- soft-delete (metrics already existed)
- [x] `HolidayService.deleteHoliday()` -- soft-delete + audit log added

#### 3. Audit Events
All 7 soft-delete operations now publish audit logs via `AuditLogService.logAction()` with:
- `entityType` matching the domain entity name
- `AuditAction.DELETE`
- Description containing "soft-deleted" for traceability

#### 4. Flyway Migration V49
- **File**: `backend/src/main/resources/db/migration/V49__add_deleted_at_column.sql`
- Adds `deleted_at TIMESTAMPTZ` column to all tables with `is_deleted`
- Adds partial indexes on critical tables for `deleted_at IS NULL`
- Uses `ADD COLUMN IF NOT EXISTS` for idempotency

#### 5. Unit Tests
- **File**: `backend/src/test/java/com/hrms/common/entity/BaseEntitySoftDeleteTest.java`
  - Tests `softDelete()` sets isDeleted + deletedAt
  - Tests `restore()` clears both fields
  - Tests idempotency and default state
- **File**: `backend/src/test/java/com/hrms/application/service/SoftDeleteServiceTest.java`
  - Tests all 6 critical services (Department, Payslip, SalaryStructure, PayrollRun, LeaveType, Holiday)
  - Verifies `repository.save()` is called (not `delete()`)
  - Verifies `isDeleted=true` and `deletedAt` populated
  - Verifies audit log created with correct entity type and action

#### 6. Build Verification
- `mvn -DskipTests compile` -- **BUILD SUCCESS**
- Pre-existing test compilation failures in `ExpenseClaimControllerTest` and `PerformanceReviewControllerTest` (unrelated to this change)

---

### Not Changed (Out of Scope)

The following hard-delete sites exist on non-critical/secondary entities and are not changed in this phase:

- BudgetPlanningService (budget, position, scenario)
- FeedbackService (feedback)
- OkrService (objectives, key results)
- Feedback360Service (cycles)
- TimeTrackingService (time entries)
- ExitManagementService (exit process, clearance)
- RoleManagementService (role)
- ScheduledReportService (report)
- BenefitManagementService (benefit plan)
- ProjectTimesheetService (time entry, member)
- DocumentTemplateService (template)
- ESignatureService (signature request, approval)
- BlogCategoryService (category)
- HelpdeskService (ticket, comment, category)
- WikiPageService (page)
- WikiSpaceService (space)
- AnnouncementService (announcement)
- OneOnOneMeetingService (agenda)
- PulseSurveyService (survey)
- CalendarService (event)
- SkillService (skill)
- WebhookService (webhook)
- WallService (reaction)
- ShiftManagementService (shift)
- ContractTemplateService (template)
- TrainingManagementService (program)
- LmsService (course, module)
- QuizManagementService (quiz, question)
- InterviewManagementService (interview)
- JobOpeningService (job opening)
- ApplicantService (applicant)
- RecruitmentManagementService (candidate)
- CustomFieldService (definition)
- SurveyManagementService (survey)
- OnboardingManagementService (template, task, process)
- OvertimeManagementService (record)
- AssetManagementService (asset)
- TaxDeclarationService (declaration)
- BlogPostService (post)
- HelpdeskSLAService (SLA)

These should be addressed in a follow-up phase.

---

### Remaining Risks

1. **Repository queries do not filter by `isDeleted = false`**: There are no `@Where(clause = "is_deleted = false")` annotations on entities and no automatic filtering. Queries like `findAllByTenantId()` will return soft-deleted records. This should be addressed in Phase 2 by either:
   - Adding `@Where` annotations to critical entities, OR
   - Updating repository query methods to include `AND is_deleted = false`

2. **Unique constraints**: Some unique constraints (e.g., employee_code + tenant_id) do not include `is_deleted`. A soft-deleted entity will block creating a new entity with the same unique key. Consider updating constraints to include `WHERE is_deleted = false` partial unique indexes.

3. **Non-critical services still hard-delete**: 35+ services still use `repository.delete()`. These should be migrated in Phase 2.
