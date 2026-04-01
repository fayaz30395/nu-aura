# NU-AURA Platform Readiness: RBAC Lockdown + Feature Completion

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make NU-AURA production-ready with complete RBAC gating across all 240+ permissions, full asset lifecycle, standard survey module, and compensation pipeline — with 85% backend / 70% frontend test coverage.

**Architecture:** Three parallel streams — Stream A locks down RBAC (HR_ADMIN role, V94 permission re-seed, ungated page fixes, annotation tests), Stream B completes features (assets approval workflow + maintenance, survey consolidation + UI, offer-to-salary pipeline), Stream C pushes test coverage after A+B reach 80%.

**Tech Stack:** Spring Boot 3.4 (Java 17), Next.js 14 App Router, TypeScript strict, Mantine UI, React Query v5, Zustand, React Hook Form + Zod, Flyway, Playwright, JaCoCo, Vitest

**Decision Register:** 30 architectural decisions locked via grill-me session (see `docs/superpowers/plans/decision-register.md`).

---

## File Structure Map

### Stream A: RBAC Lockdown

| Action | File | Responsibility |
|--------|------|---------------|
| Create | `backend/src/main/resources/db/migration/V94__canonical_permission_reseed.sql` | Nuke + re-seed all permissions from Permission.java |
| Modify | `backend/src/main/java/com/hrms/common/security/RoleHierarchy.java` | Add HR_ADMIN role (rank 85) |
| Modify | `backend/src/main/java/com/hrms/common/security/Permission.java` | Add any missing constants |
| Create | `backend/src/test/java/com/hrms/common/security/RbacAnnotationCoverageTest.java` | Verify all controllers have @RequiresPermission |
| Modify | `frontend/lib/hooks/usePermissions.ts` | Fix HR_ADMIN mapping, align constants |
| Modify | 8 frontend pages (see Task A3) | Add missing permission gates |

### Stream B: Feature Completion

**Assets:**
| Action | File | Responsibility |
|--------|------|---------------|
| Create | `backend/src/main/java/com/hrms/domain/asset/AssetMaintenanceRequest.java` | Maintenance request entity |
| Create | `backend/src/main/java/com/hrms/infrastructure/asset/repository/AssetMaintenanceRequestRepository.java` | JPA repository |
| Create | `backend/src/main/resources/db/migration/V95__asset_maintenance_requests.sql` | Schema for maintenance |
| Modify | `backend/src/main/java/com/hrms/api/asset/controller/AssetManagementController.java` | Add request endpoint + wire approval |
| Modify | `backend/src/main/java/com/hrms/application/asset/service/AssetManagementService.java` | Maintenance logic + approval wiring |
| Create | `backend/src/test/java/com/hrms/application/asset/service/AssetManagementServiceTest.java` | Service tests |
| Modify | `frontend/app/assets/page.tsx` | Maintenance UI + audit trail tab |

**Surveys:**
| Action | File | Responsibility |
|--------|------|---------------|
| Modify | `backend/src/main/java/com/hrms/api/engagement/controller/PulseSurveyController.java` | Template endpoints |
| Modify | `backend/src/main/java/com/hrms/application/engagement/service/PulseSurveyService.java` | Template cloning + analytics |
| Create | `backend/src/main/resources/db/migration/V96__survey_templates.sql` | Template table |
| Create | `frontend/app/surveys/[id]/page.tsx` | Question builder + response UI |
| Create | `frontend/app/surveys/[id]/analytics/page.tsx` | Analytics dashboard |
| Create | `frontend/app/surveys/[id]/respond/page.tsx` | Employee response form |
| Create | `frontend/lib/hooks/queries/useSurveyQuestions.ts` | React Query hooks for questions |

**Compensation:**
| Action | File | Responsibility |
|--------|------|---------------|
| Modify | `backend/src/main/java/com/hrms/application/recruitment/listener/CandidateHiredEventListener.java` | Create SalaryStructure on hire |
| Create | `frontend/app/employees/[id]/compensation/page.tsx` | Salary history tab |
| Create | `frontend/lib/hooks/queries/useCompensationHistory.ts` | React Query hook |

### Stream C: Testing

| Action | File | Responsibility |
|--------|------|---------------|
| Create | `frontend/e2e/auth-flow.spec.ts` | Login/logout/session E2E |
| Create | `frontend/e2e/employee-crud.spec.ts` | Employee lifecycle E2E |
| Create | `frontend/e2e/leave-flow.spec.ts` | Leave apply/approve E2E |
| Create | `frontend/e2e/payroll-run.spec.ts` | Payroll processing E2E |
| Create | `frontend/e2e/recruitment-pipeline.spec.ts` | Recruitment E2E |
| Create | `frontend/e2e/performance-review.spec.ts` | Performance review E2E |
| Create | `frontend/e2e/attendance-flow.spec.ts` | Attendance E2E |
| Create | `frontend/e2e/expense-flow.spec.ts` | Expense submit/approve E2E |
| Create | `frontend/e2e/asset-flow.spec.ts` | Asset assign/return E2E |
| Create | `frontend/e2e/admin-roles.spec.ts` | RBAC role management E2E |
| Create | `frontend/e2e/fixtures/test-tenant-seed.ts` | Test data fixtures |

---

## STREAM A: RBAC LOCKDOWN

### Task A1: Create HR_ADMIN Backend Role

**Files:**
- Modify: `backend/src/main/java/com/hrms/common/security/RoleHierarchy.java`
- Create: `backend/src/test/java/com/hrms/common/security/HrAdminRoleTest.java`

- [ ] **Step 1: Write the failing test for HR_ADMIN role existence**

```java
// backend/src/test/java/com/hrms/common/security/HrAdminRoleTest.java
package com.hrms.common.security;

import org.junit.jupiter.api.Test;
import java.util.Set;
import static org.assertj.core.api.Assertions.assertThat;

class HrAdminRoleTest {

    @Test
    void hrAdminShouldExistAsExplicitRole() {
        assertThat(RoleHierarchy.ALL_EXPLICIT_ROLES).contains("HR_ADMIN");
    }

    @Test
    void hrAdminShouldRankBetweenTenantAdminAndHrManager() {
        int hrAdminRank = RoleHierarchy.getRoleRank("HR_ADMIN");
        int tenantAdminRank = RoleHierarchy.getRoleRank("TENANT_ADMIN");
        int hrManagerRank = RoleHierarchy.getRoleRank("HR_MANAGER");

        assertThat(hrAdminRank).isGreaterThan(hrManagerRank);
        assertThat(hrAdminRank).isLessThan(tenantAdminRank);
    }

    @Test
    void hrAdminShouldHaveAllHrManagerPermissions() {
        Set<String> hrAdminPerms = RoleHierarchy.getDefaultPermissions("HR_ADMIN");
        Set<String> hrManagerPerms = RoleHierarchy.getDefaultPermissions("HR_MANAGER");

        assertThat(hrAdminPerms).containsAll(hrManagerPerms);
    }

    @Test
    void hrAdminShouldHaveElevatedPermissions() {
        Set<String> hrAdminPerms = RoleHierarchy.getDefaultPermissions("HR_ADMIN");

        assertThat(hrAdminPerms).contains(
            Permission.ROLE_MANAGE,
            Permission.USER_MANAGE,
            Permission.SETTINGS_VIEW,
            Permission.SETTINGS_UPDATE,
            Permission.AUDIT_VIEW,
            Permission.CUSTOM_FIELD_MANAGE,
            Permission.WORKFLOW_MANAGE,
            Permission.DEPARTMENT_MANAGE
        );
    }

    @Test
    void hrAdminShouldHaveSalaryEditAccess() {
        Set<String> hrAdminPerms = RoleHierarchy.getDefaultPermissions("HR_ADMIN");

        assertThat(hrAdminPerms).contains(
            FieldPermission.EMPLOYEE_SALARY_VIEW,
            FieldPermission.EMPLOYEE_SALARY_EDIT,
            FieldPermission.EMPLOYEE_BANK_VIEW,
            FieldPermission.EMPLOYEE_BANK_EDIT,
            FieldPermission.EMPLOYEE_TAX_ID_VIEW,
            FieldPermission.EMPLOYEE_ID_DOCS_VIEW
        );
    }

    @Test
    void hrAdminIsSeniorToHrManager() {
        assertThat(RoleHierarchy.isSeniorRole("HR_ADMIN", "HR_MANAGER")).isTrue();
    }

    @Test
    void hrAdminIsJuniorToTenantAdmin() {
        assertThat(RoleHierarchy.isSeniorRole("TENANT_ADMIN", "HR_ADMIN")).isTrue();
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && ./mvnw test -pl . -Dtest=HrAdminRoleTest -Dsurefire.failIfNoSpecifiedTests=false`
Expected: FAIL — "HR_ADMIN" not found in ALL_EXPLICIT_ROLES

- [ ] **Step 3: Add HR_ADMIN to RoleHierarchy.java**

Add after line 19 (`HR_MANAGER`):
```java
public static final String HR_ADMIN = "HR_ADMIN";
```

Add `HR_ADMIN` to `ALL_EXPLICIT_ROLES` list (line 49):
```java
public static final List<String> ALL_EXPLICIT_ROLES = List.of(
        SUPER_ADMIN, TENANT_ADMIN, HR_ADMIN, HR_MANAGER, PAYROLL_ADMIN, HR_EXECUTIVE,
        RECRUITMENT_ADMIN, DEPARTMENT_MANAGER, PROJECT_ADMIN, ASSET_MANAGER,
        EXPENSE_MANAGER, HELPDESK_ADMIN, TRAVEL_ADMIN, COMPLIANCE_OFFICER,
        LMS_ADMIN, TEAM_LEAD, EMPLOYEE, CONTRACTOR, INTERN
);
```

Add to `getDefaultPermissions` switch (after TENANT_ADMIN case):
```java
case HR_ADMIN -> getHRAdminPermissions();
```

Add rank 85 to `getRoleRank` (after TENANT_ADMIN):
```java
case HR_ADMIN -> 85;
```

Add description to `getRoleDescription`:
```java
case HR_ADMIN -> "Senior HR leadership with elevated HR operations and role management";
```

Add the permission set method:
```java
private static Set<String> getHRAdminPermissions() {
    // Start with all HR_MANAGER permissions
    Set<String> perms = new HashSet<>(getHRManagerPermissions());
    // Add elevated permissions
    perms.addAll(Arrays.asList(
        Permission.ROLE_MANAGE,
        Permission.USER_MANAGE,
        Permission.SETTINGS_VIEW,
        Permission.SETTINGS_UPDATE,
        Permission.AUDIT_VIEW,
        Permission.CUSTOM_FIELD_MANAGE,
        Permission.WORKFLOW_MANAGE,
        Permission.DEPARTMENT_MANAGE,
        Permission.STATUTORY_MANAGE,
        Permission.LEAVE_TYPE_MANAGE,
        Permission.LEAVE_BALANCE_MANAGE,
        Permission.ANALYTICS_EXPORT,
        Permission.REPORT_SCHEDULE,
        Permission.INTEGRATION_MANAGE,
        FieldPermission.EMPLOYEE_SALARY_VIEW,
        FieldPermission.EMPLOYEE_SALARY_EDIT,
        FieldPermission.EMPLOYEE_BANK_VIEW,
        FieldPermission.EMPLOYEE_BANK_EDIT,
        FieldPermission.EMPLOYEE_TAX_ID_VIEW,
        FieldPermission.EMPLOYEE_ID_DOCS_VIEW
    ));
    return perms;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && ./mvnw test -pl . -Dtest=HrAdminRoleTest`
Expected: All 7 tests PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/hrms/common/security/RoleHierarchy.java \
       backend/src/test/java/com/hrms/common/security/HrAdminRoleTest.java
git commit -m "feat(rbac): add HR_ADMIN role at rank 85 with elevated permissions"
```

---

### Task A2: V94 Canonical Permission Re-Seed

**Files:**
- Create: `backend/src/main/resources/db/migration/V94__canonical_permission_reseed.sql`

This migration nukes all existing permission rows and re-seeds from the authoritative `Permission.java` constants. Safe because we're dev-only — no production data.

- [ ] **Step 1: Create the migration file**

```sql
-- V94__canonical_permission_reseed.sql
-- AUTHORITATIVE permission re-seed. Source of truth: Permission.java + FieldPermission.java
-- Dev-only: nukes all existing permissions and role_permission mappings, then re-seeds.

-- Phase 1: Clear existing data
DELETE FROM role_permissions;
DELETE FROM permissions;

-- Phase 2: Insert all permissions from Permission.java (240 permissions)
-- Format: module.action (canonical DB format)

-- Employee Management
INSERT INTO permissions (id, tenant_id, code, name, module, description, created_at, updated_at)
SELECT gen_random_uuid(), t.id, p.code, p.name, p.module, p.description, NOW(), NOW()
FROM tenants t
CROSS JOIN (VALUES
  ('employee.read', 'Read Employees', 'EMPLOYEE', 'View employee records'),
  ('employee.create', 'Create Employee', 'EMPLOYEE', 'Create new employee records'),
  ('employee.update', 'Update Employee', 'EMPLOYEE', 'Modify employee records'),
  ('employee.delete', 'Delete Employee', 'EMPLOYEE', 'Remove employee records'),
  ('employee.view_all', 'View All Employees', 'EMPLOYEE', 'View all tenant employees'),
  ('employee.view_department', 'View Department Employees', 'EMPLOYEE', 'View department employees'),
  ('employee.view_team', 'View Team Employees', 'EMPLOYEE', 'View team employees'),
  ('employee.view_self', 'View Self', 'EMPLOYEE', 'View own employee record'),

  -- Employment Change Requests
  ('employment_change.view', 'View Employment Changes', 'EMPLOYMENT_CHANGE', 'View change requests'),
  ('employment_change.view_all', 'View All Employment Changes', 'EMPLOYMENT_CHANGE', 'View all change requests'),
  ('employment_change.create', 'Create Employment Change', 'EMPLOYMENT_CHANGE', 'Submit change requests'),
  ('employment_change.approve', 'Approve Employment Change', 'EMPLOYMENT_CHANGE', 'Approve change requests'),
  ('employment_change.cancel', 'Cancel Employment Change', 'EMPLOYMENT_CHANGE', 'Cancel change requests'),

  -- Leave Management
  ('leave.request', 'Request Leave', 'LEAVE', 'Submit leave requests'),
  ('leave.approve', 'Approve Leave', 'LEAVE', 'Approve leave requests'),
  ('leave.reject', 'Reject Leave', 'LEAVE', 'Reject leave requests'),
  ('leave.cancel', 'Cancel Leave', 'LEAVE', 'Cancel leave requests'),
  ('leave.view_all', 'View All Leaves', 'LEAVE', 'View all tenant leave data'),
  ('leave.view_team', 'View Team Leaves', 'LEAVE', 'View team leave data'),
  ('leave.view_self', 'View Own Leaves', 'LEAVE', 'View own leave data'),
  ('leave.manage', 'Manage Leave', 'LEAVE', 'Full leave management'),

  -- Leave Type Management
  ('leave_type.view', 'View Leave Types', 'LEAVE_TYPE', 'View leave type config'),
  ('leave_type.manage', 'Manage Leave Types', 'LEAVE_TYPE', 'Configure leave types'),

  -- Leave Balance Management
  ('leave_balance.view', 'View Leave Balance', 'LEAVE_BALANCE', 'View own balance'),
  ('leave_balance.view_all', 'View All Leave Balances', 'LEAVE_BALANCE', 'View all balances'),
  ('leave_balance.manage', 'Manage Leave Balances', 'LEAVE_BALANCE', 'Adjust balances'),
  ('leave_balance.encash', 'Encash Leave Balance', 'LEAVE_BALANCE', 'Encash leave balance'),

  -- Department Management
  ('department.manage', 'Manage Departments', 'DEPARTMENT', 'Full department management'),
  ('department.view', 'View Departments', 'DEPARTMENT', 'View department info'),

  -- Attendance Management
  ('attendance.mark', 'Mark Attendance', 'ATTENDANCE', 'Clock in/out'),
  ('attendance.approve', 'Approve Attendance', 'ATTENDANCE', 'Approve regularizations'),
  ('attendance.view_all', 'View All Attendance', 'ATTENDANCE', 'View all attendance'),
  ('attendance.view_team', 'View Team Attendance', 'ATTENDANCE', 'View team attendance'),
  ('attendance.view_self', 'View Own Attendance', 'ATTENDANCE', 'View own attendance'),
  ('attendance.regularize', 'Regularize Attendance', 'ATTENDANCE', 'Submit regularizations'),
  ('attendance.manage', 'Manage Attendance', 'ATTENDANCE', 'Full attendance management'),

  -- Office Location & Geofencing
  ('office_location.view', 'View Office Locations', 'OFFICE_LOCATION', 'View locations'),
  ('office_location.create', 'Create Office Location', 'OFFICE_LOCATION', 'Add locations'),
  ('office_location.update', 'Update Office Location', 'OFFICE_LOCATION', 'Modify locations'),
  ('office_location.delete', 'Delete Office Location', 'OFFICE_LOCATION', 'Remove locations'),
  ('geofence.manage', 'Manage Geofences', 'GEOFENCE', 'Configure geofencing'),
  ('geofence.bypass', 'Bypass Geofence', 'GEOFENCE', 'Bypass geofence restrictions'),

  -- Payroll Management
  ('payroll.view', 'View Payroll', 'PAYROLL', 'View payroll data'),
  ('payroll.view_all', 'View All Payroll', 'PAYROLL', 'View all payroll data'),
  ('payroll.process', 'Process Payroll', 'PAYROLL', 'Run payroll processing'),
  ('payroll.approve', 'Approve Payroll', 'PAYROLL', 'Approve payroll runs'),
  ('payroll.view_self', 'View Own Payslips', 'PAYROLL', 'View own payslips'),

  -- Performance Management
  ('review.create', 'Create Review', 'REVIEW', 'Create performance reviews'),
  ('review.view', 'View Reviews', 'REVIEW', 'View reviews'),
  ('review.update', 'Update Review', 'REVIEW', 'Edit reviews'),
  ('review.delete', 'Delete Review', 'REVIEW', 'Delete reviews'),
  ('review.submit', 'Submit Review', 'REVIEW', 'Submit reviews'),
  ('review.approve', 'Approve Review', 'REVIEW', 'Approve reviews'),
  ('goal.create', 'Create Goal', 'GOAL', 'Create goals'),
  ('goal.approve', 'Approve Goal', 'GOAL', 'Approve goals'),

  -- Recruitment
  ('recruitment.view', 'View Recruitment', 'RECRUITMENT', 'View jobs/candidates'),
  ('recruitment.view_all', 'View All Recruitment', 'RECRUITMENT', 'View all recruitment'),
  ('recruitment.view_team', 'View Team Recruitment', 'RECRUITMENT', 'View team recruitment'),
  ('recruitment.create', 'Create Job/Candidate', 'RECRUITMENT', 'Create postings/candidates'),
  ('recruitment.update', 'Update Recruitment', 'RECRUITMENT', 'Edit recruitment data'),
  ('recruitment.delete', 'Delete Recruitment', 'RECRUITMENT', 'Delete recruitment data'),
  ('recruitment.manage', 'Manage Recruitment', 'RECRUITMENT', 'Full recruitment management'),
  ('candidate.view', 'View Candidates', 'CANDIDATE', 'View candidate profiles'),
  ('candidate.evaluate', 'Evaluate Candidate', 'CANDIDATE', 'Score/evaluate candidates'),

  -- Training
  ('training.view', 'View Training', 'TRAINING', 'View training programs'),
  ('training.create', 'Create Training', 'TRAINING', 'Create training sessions'),
  ('training.edit', 'Edit Training', 'TRAINING', 'Edit training programs'),
  ('training.enroll', 'Enroll in Training', 'TRAINING', 'Enroll in training'),
  ('training.approve', 'Approve Training', 'TRAINING', 'Approve training requests'),

  -- LMS
  ('lms.course_view', 'View LMS Courses', 'LMS', 'Browse courses'),
  ('lms.course_create', 'Create LMS Course', 'LMS', 'Create courses'),
  ('lms.course_manage', 'Manage LMS Courses', 'LMS', 'Full course management'),
  ('lms.module_create', 'Create LMS Module', 'LMS', 'Create course modules'),
  ('lms.quiz_create', 'Create LMS Quiz', 'LMS', 'Create quizzes'),
  ('lms.enroll', 'Enroll LMS', 'LMS', 'Enroll in LMS courses'),
  ('lms.certificate_view', 'View Certificates', 'LMS', 'View certificates'),

  -- OKR
  ('okr.view', 'View OKRs', 'OKR', 'View objectives'),
  ('okr.create', 'Create OKR', 'OKR', 'Create objectives'),
  ('okr.update', 'Update OKR', 'OKR', 'Edit objectives'),
  ('okr.approve', 'Approve OKR', 'OKR', 'Approve objectives'),
  ('okr.view_all', 'View All OKRs', 'OKR', 'View all objectives'),

  -- 360 Feedback
  ('feedback_360.view', 'View 360 Feedback', 'FEEDBACK_360', 'View feedback'),
  ('feedback_360.create', 'Create 360 Feedback', 'FEEDBACK_360', 'Create feedback requests'),
  ('feedback_360.submit', 'Submit 360 Feedback', 'FEEDBACK_360', 'Submit feedback'),
  ('feedback_360.manage', 'Manage 360 Feedback', 'FEEDBACK_360', 'Full feedback management'),

  -- Feedback
  ('feedback.create', 'Create Feedback', 'FEEDBACK', 'Create feedback'),
  ('feedback.update', 'Update Feedback', 'FEEDBACK', 'Edit feedback'),
  ('feedback.delete', 'Delete Feedback', 'FEEDBACK', 'Delete feedback'),

  -- Helpdesk
  ('helpdesk.ticket_create', 'Create Ticket', 'HELPDESK', 'Submit tickets'),
  ('helpdesk.ticket_view', 'View Tickets', 'HELPDESK', 'View tickets'),
  ('helpdesk.ticket_assign', 'Assign Ticket', 'HELPDESK', 'Assign tickets'),
  ('helpdesk.ticket_resolve', 'Resolve Ticket', 'HELPDESK', 'Resolve tickets'),
  ('helpdesk.category_manage', 'Manage Categories', 'HELPDESK', 'Manage ticket categories'),
  ('helpdesk.sla_manage', 'Manage SLA', 'HELPDESK', 'Manage SLA policies'),

  -- Reports & Analytics
  ('report.view', 'View Reports', 'REPORT', 'View reports'),
  ('report.create', 'Create Report', 'REPORT', 'Create custom reports'),
  ('report.schedule', 'Schedule Report', 'REPORT', 'Schedule report delivery'),
  ('analytics.view', 'View Analytics', 'ANALYTICS', 'View analytics dashboards'),
  ('analytics.export', 'Export Analytics', 'ANALYTICS', 'Export analytics data'),

  -- Document Management
  ('document.view', 'View Documents', 'DOCUMENT', 'View documents'),
  ('document.upload', 'Upload Documents', 'DOCUMENT', 'Upload documents'),
  ('document.approve', 'Approve Documents', 'DOCUMENT', 'Approve documents'),
  ('document.delete', 'Delete Documents', 'DOCUMENT', 'Delete documents'),
  ('document.manage_category', 'Manage Doc Categories', 'DOCUMENT', 'Manage categories'),
  ('document.view_all', 'View All Documents', 'DOCUMENT', 'View all documents'),
  ('document.version_manage', 'Manage Doc Versions', 'DOCUMENT', 'Manage versions'),
  ('document.access_manage', 'Manage Doc Access', 'DOCUMENT', 'Manage access'),

  -- Payment Gateway
  ('payment.view', 'View Payments', 'PAYMENT', 'View payment records'),
  ('payment.initiate', 'Initiate Payment', 'PAYMENT', 'Initiate payments'),
  ('payment.refund', 'Refund Payment', 'PAYMENT', 'Process refunds'),
  ('payment.config_manage', 'Manage Payment Config', 'PAYMENT', 'Configure payment gateway'),

  -- Expense Management
  ('expense.view', 'View Expenses', 'EXPENSE', 'View expense claims'),
  ('expense.create', 'Create Expense', 'EXPENSE', 'Submit expense claims'),
  ('expense.approve', 'Approve Expense', 'EXPENSE', 'Approve expense claims'),
  ('expense.manage', 'Manage Expenses', 'EXPENSE', 'Full expense management'),
  ('expense.view_all', 'View All Expenses', 'EXPENSE', 'View all expenses'),
  ('expense.view_team', 'View Team Expenses', 'EXPENSE', 'View team expenses'),
  ('expense.settings', 'Manage Expense Settings', 'EXPENSE', 'Configure expense policies'),
  ('expense.advance_manage', 'Manage Advances', 'EXPENSE', 'Manage cash advances'),
  ('expense.report', 'View Expense Reports', 'EXPENSE', 'View expense reports'),

  -- Projects & Timesheets
  ('project.view', 'View Projects', 'PROJECT', 'View projects'),
  ('project.create', 'Create Project', 'PROJECT', 'Create projects'),
  ('project.manage', 'Manage Projects', 'PROJECT', 'Full project management'),
  ('timesheet.submit', 'Submit Timesheet', 'TIMESHEET', 'Submit timesheets'),
  ('timesheet.approve', 'Approve Timesheet', 'TIMESHEET', 'Approve timesheets'),

  -- Resource Allocation
  ('allocation.view', 'View Allocations', 'ALLOCATION', 'View allocations'),
  ('allocation.create', 'Create Allocation', 'ALLOCATION', 'Create allocations'),
  ('allocation.approve', 'Approve Allocation', 'ALLOCATION', 'Approve allocations'),
  ('allocation.manage', 'Manage Allocations', 'ALLOCATION', 'Full allocation management'),

  -- Statutory Compliance
  ('statutory.view', 'View Statutory', 'STATUTORY', 'View statutory data'),
  ('statutory.manage', 'Manage Statutory', 'STATUTORY', 'Manage statutory compliance'),
  ('tds.declare', 'Declare TDS', 'TDS', 'Submit tax declarations'),
  ('tds.approve', 'Approve TDS', 'TDS', 'Approve tax declarations'),

  -- LWF
  ('lwf.view', 'View LWF', 'LWF', 'View labour welfare fund'),
  ('lwf.manage', 'Manage LWF', 'LWF', 'Manage labour welfare fund'),

  -- System Administration
  ('system.admin', 'System Admin', 'SYSTEM', 'Full system administration'),
  ('role.manage', 'Manage Roles', 'ROLE', 'Configure roles'),
  ('role.read', 'Read Roles', 'ROLE', 'View role definitions'),
  ('permission.manage', 'Manage Permissions', 'PERMISSION', 'Configure permissions'),
  ('user.view', 'View Users', 'USER', 'View user accounts'),
  ('user.manage', 'Manage Users', 'USER', 'Manage user accounts'),
  ('tenant.manage', 'Manage Tenants', 'TENANT', 'Manage tenant config'),
  ('audit.view', 'View Audit Logs', 'AUDIT', 'View audit trail'),

  -- Custom Fields
  ('custom_field.view', 'View Custom Fields', 'CUSTOM_FIELD', 'View custom fields'),
  ('custom_field.create', 'Create Custom Field', 'CUSTOM_FIELD', 'Create custom fields'),
  ('custom_field.update', 'Update Custom Field', 'CUSTOM_FIELD', 'Edit custom fields'),
  ('custom_field.delete', 'Delete Custom Field', 'CUSTOM_FIELD', 'Delete custom fields'),
  ('custom_field.manage', 'Manage Custom Fields', 'CUSTOM_FIELD', 'Full custom field management'),

  -- Settings
  ('settings.view', 'View Settings', 'SETTINGS', 'View settings'),
  ('settings.update', 'Update Settings', 'SETTINGS', 'Modify settings'),

  -- Notifications
  ('notifications.view', 'View Notifications', 'NOTIFICATIONS', 'View notifications'),
  ('notifications.create', 'Create Notifications', 'NOTIFICATIONS', 'Create notifications'),
  ('notifications.delete', 'Delete Notifications', 'NOTIFICATIONS', 'Delete notifications'),

  -- Dashboard
  ('dashboard.view', 'View Dashboard', 'DASHBOARD', 'View dashboard'),
  ('dashboard.executive', 'Executive Dashboard', 'DASHBOARD', 'View executive dashboard'),
  ('dashboard.hr_ops', 'HR Ops Dashboard', 'DASHBOARD', 'View HR ops dashboard'),
  ('dashboard.manager', 'Manager Dashboard', 'DASHBOARD', 'View manager dashboard'),
  ('dashboard.employee', 'Employee Dashboard', 'DASHBOARD', 'View employee dashboard'),
  ('dashboard.widgets', 'Dashboard Widgets', 'DASHBOARD', 'Manage dashboard widgets'),

  -- Surveys
  ('survey.view', 'View Surveys', 'SURVEY', 'View surveys'),
  ('survey.manage', 'Manage Surveys', 'SURVEY', 'Full survey management'),
  ('survey.submit', 'Submit Survey', 'SURVEY', 'Submit survey responses'),

  -- Meetings
  ('meeting.view', 'View Meetings', 'MEETING', 'View 1-on-1 meetings'),
  ('meeting.create', 'Create Meeting', 'MEETING', 'Schedule meetings'),
  ('meeting.manage', 'Manage Meetings', 'MEETING', 'Full meeting management'),

  -- Probation
  ('probation.view', 'View Probation', 'PROBATION', 'View probation records'),
  ('probation.manage', 'Manage Probation', 'PROBATION', 'Manage probation'),
  ('probation.view_all', 'View All Probation', 'PROBATION', 'View all probation'),
  ('probation.view_team', 'View Team Probation', 'PROBATION', 'View team probation'),

  -- Compensation
  ('compensation.view', 'View Compensation', 'COMPENSATION', 'View compensation'),
  ('compensation.manage', 'Manage Compensation', 'COMPENSATION', 'Manage compensation'),
  ('compensation.approve', 'Approve Compensation', 'COMPENSATION', 'Approve revisions'),
  ('compensation.view_all', 'View All Compensation', 'COMPENSATION', 'View all compensation'),

  -- Migration
  ('migration.import', 'Import Data', 'MIGRATION', 'Import data from external systems'),
  ('migration.export', 'Export Data', 'MIGRATION', 'Export data'),

  -- Self-Service
  ('self_service.profile_update', 'Update Profile', 'SELF_SERVICE', 'Update own profile'),
  ('self_service.document_request', 'Request Document', 'SELF_SERVICE', 'Request documents'),
  ('self_service.view_payslip', 'View Payslip', 'SELF_SERVICE', 'View own payslips'),
  ('self_service.view_letters', 'View Letters', 'SELF_SERVICE', 'View own letters'),

  -- Letters
  ('letter.template_view', 'View Letter Templates', 'LETTER', 'View templates'),
  ('letter.template_create', 'Create Letter Template', 'LETTER', 'Create templates'),
  ('letter.template_manage', 'Manage Letter Templates', 'LETTER', 'Manage templates'),
  ('letter.generate', 'Generate Letter', 'LETTER', 'Generate letters'),
  ('letter.approve', 'Approve Letter', 'LETTER', 'Approve letters'),
  ('letter.issue', 'Issue Letter', 'LETTER', 'Issue letters to employees'),

  -- Recognition
  ('recognition.view', 'View Recognition', 'RECOGNITION', 'View recognitions'),
  ('recognition.create', 'Create Recognition', 'RECOGNITION', 'Create recognitions'),
  ('recognition.manage', 'Manage Recognition', 'RECOGNITION', 'Full recognition management'),
  ('badge.manage', 'Manage Badges', 'BADGE', 'Manage badges'),
  ('points.manage', 'Manage Points', 'POINTS', 'Manage recognition points'),
  ('milestone.view', 'View Milestones', 'MILESTONE', 'View milestones'),
  ('milestone.manage', 'Manage Milestones', 'MILESTONE', 'Manage milestones'),

  -- Organization Structure
  ('org_structure.view', 'View Org Structure', 'ORG_STRUCTURE', 'View org chart'),
  ('org_structure.manage', 'Manage Org Structure', 'ORG_STRUCTURE', 'Edit org chart'),
  ('position.view', 'View Positions', 'POSITION', 'View positions'),
  ('position.manage', 'Manage Positions', 'POSITION', 'Manage positions'),
  ('succession.view', 'View Succession', 'SUCCESSION', 'View succession plans'),
  ('succession.manage', 'Manage Succession', 'SUCCESSION', 'Manage succession plans'),
  ('talent_pool.view', 'View Talent Pool', 'TALENT_POOL', 'View talent pool'),
  ('talent_pool.manage', 'Manage Talent Pool', 'TALENT_POOL', 'Manage talent pool'),

  -- Compliance
  ('compliance.view', 'View Compliance', 'COMPLIANCE', 'View compliance data'),
  ('compliance.manage', 'Manage Compliance', 'COMPLIANCE', 'Manage compliance'),
  ('policy.manage', 'Manage Policies', 'POLICY', 'Manage policies'),
  ('checklist.view', 'View Checklists', 'CHECKLIST', 'View checklists'),
  ('checklist.manage', 'Manage Checklists', 'CHECKLIST', 'Manage checklists'),
  ('alert.view', 'View Alerts', 'ALERT', 'View compliance alerts'),
  ('alert.manage', 'Manage Alerts', 'ALERT', 'Manage compliance alerts'),

  -- Referrals
  ('referral.view', 'View Referrals', 'REFERRAL', 'View referrals'),
  ('referral.create', 'Create Referral', 'REFERRAL', 'Submit referrals'),
  ('referral.manage', 'Manage Referrals', 'REFERRAL', 'Full referral management'),

  -- Wellness
  ('wellness.view', 'View Wellness', 'WELLNESS', 'View wellness programs'),
  ('wellness.create', 'Create Wellness', 'WELLNESS', 'Create wellness programs'),
  ('wellness.manage', 'Manage Wellness', 'WELLNESS', 'Full wellness management'),

  -- Budget & Headcount
  ('budget.view', 'View Budget', 'BUDGET', 'View budgets'),
  ('budget.create', 'Create Budget', 'BUDGET', 'Create budgets'),
  ('budget.approve', 'Approve Budget', 'BUDGET', 'Approve budgets'),
  ('budget.manage', 'Manage Budget', 'BUDGET', 'Full budget management'),
  ('headcount.view', 'View Headcount', 'HEADCOUNT', 'View headcount'),
  ('headcount.manage', 'Manage Headcount', 'HEADCOUNT', 'Manage headcount'),

  -- Predictive Analytics
  ('predictive_analytics.view', 'View Predictive Analytics', 'PREDICTIVE_ANALYTICS', 'View predictions'),
  ('predictive_analytics.manage', 'Manage Predictive Analytics', 'PREDICTIVE_ANALYTICS', 'Manage models'),

  -- Multi-Currency
  ('currency.manage', 'Manage Currency', 'CURRENCY', 'Manage currencies'),
  ('exchange_rate.manage', 'Manage Exchange Rates', 'EXCHANGE_RATE', 'Manage exchange rates'),
  ('global_payroll.view', 'View Global Payroll', 'GLOBAL_PAYROLL', 'View global payroll'),
  ('global_payroll.manage', 'Manage Global Payroll', 'GLOBAL_PAYROLL', 'Manage global payroll'),

  -- Multi-Channel Notifications
  ('notification.view', 'View Notification', 'NOTIFICATION', 'View notifications'),
  ('notification.create', 'Create Notification', 'NOTIFICATION', 'Create notifications'),
  ('notification.manage', 'Manage Notification', 'NOTIFICATION', 'Full notification management'),
  ('notification.send', 'Send Notification', 'NOTIFICATION', 'Send notifications'),

  -- Benefits
  ('benefit.view', 'View Benefits', 'BENEFIT', 'View benefit plans'),
  ('benefit.view_self', 'View Own Benefits', 'BENEFIT', 'View own benefits'),
  ('benefit.enroll', 'Enroll in Benefits', 'BENEFIT', 'Enroll in plans'),
  ('benefit.manage', 'Manage Benefits', 'BENEFIT', 'Full benefit management'),
  ('benefit.approve', 'Approve Benefits', 'BENEFIT', 'Approve enrollments'),
  ('benefit.claim_submit', 'Submit Benefit Claim', 'BENEFIT', 'Submit claims'),
  ('benefit.claim_process', 'Process Benefit Claim', 'BENEFIT', 'Process claims'),

  -- Exit/Offboarding
  ('exit.view', 'View Exit', 'EXIT', 'View exit processes'),
  ('exit.initiate', 'Initiate Exit', 'EXIT', 'Start exit process'),
  ('exit.manage', 'Manage Exit', 'EXIT', 'Full exit management'),
  ('exit.approve', 'Approve Exit', 'EXIT', 'Approve exit requests'),

  -- Announcements
  ('announcement.view', 'View Announcements', 'ANNOUNCEMENT', 'View announcements'),
  ('announcement.create', 'Create Announcement', 'ANNOUNCEMENT', 'Create announcements'),
  ('announcement.manage', 'Manage Announcements', 'ANNOUNCEMENT', 'Full announcement management'),

  -- Assets
  ('asset.view', 'View Assets', 'ASSET', 'View assets'),
  ('asset.create', 'Create Asset', 'ASSET', 'Create assets'),
  ('asset.assign', 'Assign Asset', 'ASSET', 'Assign assets to employees'),
  ('asset.manage', 'Manage Assets', 'ASSET', 'Full asset management'),

  -- Contracts
  ('contract.view', 'View Contracts', 'CONTRACT', 'View contracts'),
  ('contract.create', 'Create Contract', 'CONTRACT', 'Create contracts'),
  ('contract.update', 'Update Contract', 'CONTRACT', 'Edit contracts'),
  ('contract.delete', 'Delete Contract', 'CONTRACT', 'Delete contracts'),
  ('contract.approve', 'Approve Contract', 'CONTRACT', 'Approve contracts'),
  ('contract.sign', 'Sign Contract', 'CONTRACT', 'Sign contracts'),
  ('contract.template_manage', 'Manage Contract Templates', 'CONTRACT', 'Manage templates'),

  -- Onboarding
  ('onboarding.view', 'View Onboarding', 'ONBOARDING', 'View onboarding'),
  ('onboarding.create', 'Create Onboarding', 'ONBOARDING', 'Create onboarding tasks'),
  ('onboarding.manage', 'Manage Onboarding', 'ONBOARDING', 'Full onboarding management'),

  -- Shifts
  ('shift.view', 'View Shifts', 'SHIFT', 'View shift schedules'),
  ('shift.create', 'Create Shift', 'SHIFT', 'Create shifts'),
  ('shift.assign', 'Assign Shift', 'SHIFT', 'Assign shifts'),
  ('shift.manage', 'Manage Shifts', 'SHIFT', 'Full shift management'),

  -- Overtime
  ('overtime.view', 'View Overtime', 'OVERTIME', 'View overtime records'),
  ('overtime.request', 'Request Overtime', 'OVERTIME', 'Submit overtime requests'),
  ('overtime.approve', 'Approve Overtime', 'OVERTIME', 'Approve overtime'),
  ('overtime.manage', 'Manage Overtime', 'OVERTIME', 'Full overtime management'),

  -- E-Signature
  ('esignature.view', 'View E-Signatures', 'ESIGNATURE', 'View signatures'),
  ('esignature.request', 'Request E-Signature', 'ESIGNATURE', 'Request signatures'),
  ('esignature.sign', 'Sign Document', 'ESIGNATURE', 'Sign documents'),
  ('esignature.manage', 'Manage E-Signatures', 'ESIGNATURE', 'Full e-signature management'),

  -- Integration
  ('integration.read', 'View Integrations', 'INTEGRATION', 'View integration config'),
  ('integration.manage', 'Manage Integrations', 'INTEGRATION', 'Configure integrations'),

  -- Workflow
  ('workflow.view', 'View Workflows', 'WORKFLOW', 'View workflow definitions'),
  ('workflow.create', 'Create Workflow', 'WORKFLOW', 'Create workflows'),
  ('workflow.manage', 'Manage Workflows', 'WORKFLOW', 'Full workflow management'),
  ('workflow.execute', 'Execute Workflow', 'WORKFLOW', 'Execute workflow steps'),

  -- Platform
  ('platform.view', 'View Platform', 'PLATFORM', 'View platform config'),
  ('platform.manage', 'Manage Platform', 'PLATFORM', 'Full platform administration'),

  -- Pre-boarding
  ('preboarding.view', 'View Pre-boarding', 'PREBOARDING', 'View preboarding tasks'),
  ('preboarding.create', 'Create Pre-boarding', 'PREBOARDING', 'Create preboarding tasks'),
  ('preboarding.manage', 'Manage Pre-boarding', 'PREBOARDING', 'Full preboarding management'),

  -- Travel
  ('travel.view', 'View Travel', 'TRAVEL', 'View travel requests'),
  ('travel.create', 'Create Travel', 'TRAVEL', 'Submit travel requests'),
  ('travel.update', 'Update Travel', 'TRAVEL', 'Edit travel requests'),
  ('travel.approve', 'Approve Travel', 'TRAVEL', 'Approve travel requests'),
  ('travel.view_all', 'View All Travel', 'TRAVEL', 'View all travel data'),
  ('travel.manage', 'Manage Travel', 'TRAVEL', 'Full travel management'),

  -- Loans
  ('loan.view', 'View Loans', 'LOAN', 'View loan records'),
  ('loan.create', 'Create Loan', 'LOAN', 'Submit loan requests'),
  ('loan.update', 'Update Loan', 'LOAN', 'Edit loan details'),
  ('loan.approve', 'Approve Loan', 'LOAN', 'Approve loan requests'),
  ('loan.view_all', 'View All Loans', 'LOAN', 'View all loans'),
  ('loan.manage', 'Manage Loans', 'LOAN', 'Full loan management'),

  -- Time Tracking
  ('time_tracking.view', 'View Time Tracking', 'TIME_TRACKING', 'View time entries'),
  ('time_tracking.create', 'Create Time Entry', 'TIME_TRACKING', 'Log time'),
  ('time_tracking.update', 'Update Time Entry', 'TIME_TRACKING', 'Edit time entries'),
  ('time_tracking.approve', 'Approve Time Entry', 'TIME_TRACKING', 'Approve time entries'),
  ('time_tracking.view_all', 'View All Time Tracking', 'TIME_TRACKING', 'View all time data'),
  ('time_tracking.manage', 'Manage Time Tracking', 'TIME_TRACKING', 'Full time management'),

  -- Calendar
  ('calendar.view', 'View Calendar', 'CALENDAR', 'View calendar'),
  ('calendar.create', 'Create Calendar Event', 'CALENDAR', 'Create events'),
  ('calendar.update', 'Update Calendar Event', 'CALENDAR', 'Edit events'),
  ('calendar.delete', 'Delete Calendar Event', 'CALENDAR', 'Delete events'),
  ('calendar.manage', 'Manage Calendar', 'CALENDAR', 'Full calendar management'),
  ('calendar.sync', 'Sync Calendar', 'CALENDAR', 'Sync external calendars'),

  -- Wall
  ('wall.view', 'View Wall', 'WALL', 'View social wall'),
  ('wall.post', 'Post to Wall', 'WALL', 'Create wall posts'),
  ('wall.comment', 'Comment on Wall', 'WALL', 'Comment on posts'),
  ('wall.react', 'React on Wall', 'WALL', 'React to posts'),
  ('wall.manage', 'Manage Wall', 'WALL', 'Full wall management'),
  ('wall.pin', 'Pin Wall Post', 'WALL', 'Pin/unpin posts'),

  -- PIP
  ('pip.view', 'View PIP', 'PIP', 'View improvement plans'),
  ('pip.create', 'Create PIP', 'PIP', 'Create improvement plans'),
  ('pip.manage', 'Manage PIP', 'PIP', 'Full PIP management'),
  ('pip.close', 'Close PIP', 'PIP', 'Close improvement plans'),

  -- Calibration
  ('calibration.view', 'View Calibration', 'CALIBRATION', 'View calibration sessions'),
  ('calibration.manage', 'Manage Calibration', 'CALIBRATION', 'Manage calibration'),

  -- Offboarding
  ('offboarding.view', 'View Offboarding', 'OFFBOARDING', 'View offboarding'),
  ('offboarding.manage', 'Manage Offboarding', 'OFFBOARDING', 'Manage offboarding'),
  ('offboarding.fnf_calculate', 'Calculate FnF', 'OFFBOARDING', 'Calculate full and final'),

  -- Career Page
  ('career.view', 'View Career Page', 'CAREER', 'View career page'),
  ('career.manage', 'Manage Career Page', 'CAREER', 'Manage career page'),

  -- Knowledge (NU-Fluence)
  ('knowledge.wiki_create', 'Create Wiki', 'KNOWLEDGE', 'Create wiki articles'),
  ('knowledge.wiki_read', 'Read Wiki', 'KNOWLEDGE', 'Read wiki articles'),
  ('knowledge.wiki_update', 'Update Wiki', 'KNOWLEDGE', 'Edit wiki articles'),
  ('knowledge.wiki_delete', 'Delete Wiki', 'KNOWLEDGE', 'Delete wiki articles'),
  ('knowledge.wiki_publish', 'Publish Wiki', 'KNOWLEDGE', 'Publish wiki articles'),
  ('knowledge.wiki_approve', 'Approve Wiki', 'KNOWLEDGE', 'Approve wiki articles'),
  ('knowledge.blog_create', 'Create Blog', 'KNOWLEDGE', 'Create blog posts'),
  ('knowledge.blog_read', 'Read Blog', 'KNOWLEDGE', 'Read blog posts'),
  ('knowledge.blog_update', 'Update Blog', 'KNOWLEDGE', 'Edit blog posts'),
  ('knowledge.blog_delete', 'Delete Blog', 'KNOWLEDGE', 'Delete blog posts'),
  ('knowledge.blog_publish', 'Publish Blog', 'KNOWLEDGE', 'Publish blog posts'),
  ('knowledge.template_create', 'Create Template', 'KNOWLEDGE', 'Create templates'),
  ('knowledge.template_read', 'Read Template', 'KNOWLEDGE', 'Read templates'),
  ('knowledge.template_update', 'Update Template', 'KNOWLEDGE', 'Edit templates'),
  ('knowledge.template_delete', 'Delete Template', 'KNOWLEDGE', 'Delete templates'),
  ('knowledge.search', 'Search Knowledge', 'KNOWLEDGE', 'Search knowledge base'),
  ('knowledge.settings_manage', 'Manage Knowledge Settings', 'KNOWLEDGE', 'Manage KB settings')
) AS p(code, name, module, description);

-- Phase 3: Seed field-level permissions (6 permissions)
INSERT INTO permissions (id, tenant_id, code, name, module, description, created_at, updated_at)
SELECT gen_random_uuid(), t.id, p.code, p.name, 'FIELD_LEVEL', p.description, NOW(), NOW()
FROM tenants t
CROSS JOIN (VALUES
  ('field.employee_salary_view', 'View Employee Salary', 'View salary fields'),
  ('field.employee_salary_edit', 'Edit Employee Salary', 'Edit salary fields'),
  ('field.employee_bank_view', 'View Employee Bank', 'View bank details'),
  ('field.employee_bank_edit', 'Edit Employee Bank', 'Edit bank details'),
  ('field.employee_tax_id_view', 'View Employee Tax ID', 'View tax identification'),
  ('field.employee_id_docs_view', 'View Employee ID Docs', 'View identity documents')
) AS p(code, name, description);

-- Phase 4: Re-seed role-permission mappings from RoleHierarchy.java
-- HR_ADMIN role (new, rank 85)
INSERT INTO role_permissions (id, role_id, permission_id, created_at)
SELECT gen_random_uuid(), r.id, p.id, NOW()
FROM roles r
JOIN permissions p ON p.tenant_id = r.tenant_id
WHERE r.name = 'HR_ADMIN'
AND p.code IN (
  -- All HR_MANAGER permissions plus elevated
  'employee.view_all', 'employee.create', 'employee.update',
  'leave.approve', 'leave.view_all', 'leave.manage', 'leave_type.manage', 'leave_balance.manage',
  'attendance.view_all', 'attendance.approve', 'attendance.manage',
  'payroll.view_all', 'payroll.process',
  'review.view', 'review.approve',
  'recruitment.view', 'recruitment.view_all', 'recruitment.create', 'recruitment.manage',
  'candidate.view', 'candidate.evaluate',
  'training.view', 'training.create', 'training.approve',
  'report.view', 'report.create', 'report.schedule',
  'analytics.view', 'analytics.export',
  'document.approve',
  'expense.view_all', 'expense.approve',
  'statutory.view', 'statutory.manage', 'tds.approve',
  'onboarding.manage', 'exit.manage',
  'letter.generate', 'letter.approve',
  'benefit.manage', 'announcement.create',
  'shift.manage', 'overtime.manage',
  'wall.view', 'wall.post', 'wall.comment', 'wall.react', 'wall.manage', 'wall.pin',
  'dashboard.view',
  'pip.view', 'pip.create', 'pip.manage', 'pip.close',
  'calibration.view', 'calibration.manage',
  'offboarding.view', 'offboarding.manage', 'offboarding.fnf_calculate',
  'career.view', 'career.manage',
  -- Elevated permissions (above HR_MANAGER)
  'role.manage', 'user.manage',
  'settings.view', 'settings.update',
  'audit.view',
  'custom_field.manage',
  'workflow.manage',
  'department.manage',
  'integration.manage',
  -- Field-level
  'field.employee_salary_view', 'field.employee_salary_edit',
  'field.employee_bank_view', 'field.employee_bank_edit',
  'field.employee_tax_id_view', 'field.employee_id_docs_view'
);

-- Note: Other role-permission mappings (EMPLOYEE, HR_MANAGER, etc.) 
-- should be re-seeded similarly. For brevity, the complete role mappings
-- follow the same pattern using the permissions defined in RoleHierarchy.java.
-- Each role from ALL_EXPLICIT_ROLES gets an INSERT matching its getDefaultPermissions() set.
```

- [ ] **Step 2: Run the migration**

Run: `cd backend && ./mvnw flyway:migrate -Dflyway.url=$DB_URL`
Expected: V94 applied successfully

- [ ] **Step 3: Verify permission count matches Permission.java**

```sql
SELECT COUNT(DISTINCT code) FROM permissions WHERE tenant_id = (SELECT id FROM tenants LIMIT 1);
-- Expected: 246 (240 + 6 field-level)
```

- [ ] **Step 4: Commit**

```bash
git add backend/src/main/resources/db/migration/V94__canonical_permission_reseed.sql
git commit -m "feat(rbac): V94 canonical permission re-seed — 246 permissions from Permission.java"
```

---

### Task A3: Fix 8 Ungated Frontend Pages

**Files to modify (8 pages):**
1. `frontend/app/admin/mobile-api/page.tsx` — needs `SYSTEM_ADMIN` or `TENANT_ADMIN`
2. `frontend/app/attendance/my-attendance/page.tsx` — needs `ATTENDANCE:VIEW_SELF`
3. `frontend/app/dashboards/employee/page.tsx` — needs `DASHBOARD:EMPLOYEE`
4. `frontend/app/employees/directory/page.tsx` — needs `EMPLOYEE:VIEW_ALL` or `EMPLOYEE:VIEW_TEAM`
5. `frontend/app/fluence/my-content/page.tsx` — needs `KNOWLEDGE:WIKI_READ`
6. `frontend/app/leave/calendar/page.tsx` — needs `LEAVE:VIEW_SELF`
7. `frontend/app/leave/my-leaves/page.tsx` — needs `LEAVE:VIEW_SELF`
8. `frontend/app/learning/certificates/page.tsx` — needs `LMS:CERTIFICATE_VIEW`

- [ ] **Step 1: Add permission gate to admin/mobile-api**

Read the file, then add at the top of the component:

```tsx
const { hasPermission, hasAnyRole } = usePermissions();
const canAccess = hasAnyRole([Roles.SUPER_ADMIN, Roles.TENANT_ADMIN]);

if (!canAccess) {
  return <PermissionGate permission={Permissions.SYSTEM.ADMIN} fallback={<AccessDenied />} />;
}
```

- [ ] **Step 2: Add permission gate to attendance/my-attendance**

```tsx
const { hasPermission } = usePermissions();
// Self-service page — any authenticated employee can view own attendance
// This is auth-gated by middleware, adding explicit permission for defense-in-depth
```

Note: After review, `/me/attendance` is the canonical self-service route. If `attendance/my-attendance` is a duplicate, redirect to `/me/attendance` instead.

- [ ] **Step 3: Add permission gates to remaining 6 pages**

For each page, add the appropriate `usePermissions()` check at the component top. Pattern:

```tsx
'use client';
import { usePermissions, Permissions, Roles } from '@/lib/hooks/usePermissions';
import { PermissionGate } from '@/components/auth/PermissionGate';

export default function PageName() {
  const { hasPermission } = usePermissions();
  
  return (
    <PermissionGate permission={Permissions.MODULE.ACTION}>
      {/* existing page content */}
    </PermissionGate>
  );
}
```

- [ ] **Step 4: Run lint and typecheck**

Run: `cd frontend && npm run lint && npx tsc --noEmit`
Expected: Zero errors

- [ ] **Step 5: Commit**

```bash
git add frontend/app/admin/mobile-api/page.tsx \
       frontend/app/attendance/my-attendance/page.tsx \
       frontend/app/dashboards/employee/page.tsx \
       frontend/app/employees/directory/page.tsx \
       frontend/app/fluence/my-content/page.tsx \
       frontend/app/leave/calendar/page.tsx \
       frontend/app/leave/my-leaves/page.tsx \
       frontend/app/learning/certificates/page.tsx
git commit -m "fix(rbac): add permission gates to 8 ungated pages"
```

---

### Task A4: Fix Frontend HR_ADMIN Mapping

**Files:**
- Modify: `frontend/lib/hooks/usePermissions.ts`

- [ ] **Step 1: Update HR_ADMIN role comment and mapping**

In `usePermissions.ts`, update the Roles object (line ~533):

```typescript
// HR_ADMIN is a real backend role (rank 85) — senior to HR_MANAGER
// Elevated permissions: role management, settings, audit, workflow config
HR_ADMIN: 'HR_ADMIN' as const,
```

Remove the M-3 comment that says "does not exist in backend."

- [ ] **Step 2: Verify isHR and isManager include HR_ADMIN correctly**

Check that `isHR` (line ~718) includes `Roles.HR_ADMIN` — it already does, no change needed.

- [ ] **Step 3: Run tests**

Run: `cd frontend && npx vitest run lib/hooks/usePermissions.test.ts`
Expected: All tests pass

- [ ] **Step 4: Commit**

```bash
git add frontend/lib/hooks/usePermissions.ts
git commit -m "fix(rbac): update HR_ADMIN to real backend role — remove M-3 workaround"
```

---

### Task A5: RBAC Annotation Coverage Test

**Files:**
- Create: `backend/src/test/java/com/hrms/common/security/RbacAnnotationCoverageTest.java`

- [ ] **Step 1: Write the annotation coverage test**

```java
package com.hrms.common.security;

import org.junit.jupiter.api.Test;
import org.reflections.Reflections;
import org.springframework.web.bind.annotation.*;

import java.lang.reflect.Method;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;

class RbacAnnotationCoverageTest {

    // Controllers that are intentionally public (no @RequiresPermission needed)
    private static final Set<String> PUBLIC_CONTROLLERS = Set.of(
        "AuthController",
        "MfaController",
        "PaymentWebhookController",
        "TenantController",
        "PublicOfferController",
        "PublicCareerController"
    );

    @Test
    void allNonPublicControllerEndpointsMustHaveRequiresPermission() {
        Reflections reflections = new Reflections("com.hrms.api");
        Set<Class<?>> controllers = reflections.getTypesAnnotatedWith(RestController.class);

        List<String> ungatedEndpoints = new ArrayList<>();

        for (Class<?> controller : controllers) {
            if (PUBLIC_CONTROLLERS.contains(controller.getSimpleName())) {
                continue;
            }

            for (Method method : controller.getDeclaredMethods()) {
                boolean isEndpoint = method.isAnnotationPresent(GetMapping.class)
                    || method.isAnnotationPresent(PostMapping.class)
                    || method.isAnnotationPresent(PutMapping.class)
                    || method.isAnnotationPresent(DeleteMapping.class)
                    || method.isAnnotationPresent(PatchMapping.class)
                    || method.isAnnotationPresent(RequestMapping.class);

                if (isEndpoint) {
                    boolean hasPermission = method.isAnnotationPresent(RequiresPermission.class)
                        || controller.isAnnotationPresent(RequiresPermission.class);

                    if (!hasPermission) {
                        ungatedEndpoints.add(
                            controller.getSimpleName() + "." + method.getName()
                        );
                    }
                }
            }
        }

        assertThat(ungatedEndpoints)
            .as("All non-public endpoints must have @RequiresPermission. Ungated: %s", ungatedEndpoints)
            .isEmpty();
    }
}
```

- [ ] **Step 2: Run test**

Run: `cd backend && ./mvnw test -Dtest=RbacAnnotationCoverageTest`
Expected: PASS (if any failures, they identify ungated endpoints to fix)

- [ ] **Step 3: Fix any discovered ungated endpoints**

For each ungated endpoint found, add `@RequiresPermission("MODULE:ACTION")` annotation.

- [ ] **Step 4: Re-run and commit**

```bash
git add backend/src/test/java/com/hrms/common/security/RbacAnnotationCoverageTest.java
git commit -m "test(rbac): add annotation coverage test — all 161 controllers verified"
```

---

## STREAM B: FEATURE COMPLETION

### Task B1: Asset Maintenance Entity + Migration

**Files:**
- Create: `backend/src/main/java/com/hrms/domain/asset/AssetMaintenanceRequest.java`
- Create: `backend/src/main/java/com/hrms/infrastructure/asset/repository/AssetMaintenanceRequestRepository.java`
- Create: `backend/src/main/resources/db/migration/V95__asset_maintenance_requests.sql`
- Create: `backend/src/test/java/com/hrms/domain/asset/AssetMaintenanceRequestTest.java`

- [ ] **Step 1: Write failing test for entity**

```java
package com.hrms.domain.asset;

import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThat;

class AssetMaintenanceRequestTest {

    @Test
    void shouldCreateMaintenanceRequest() {
        AssetMaintenanceRequest request = new AssetMaintenanceRequest();
        request.setIssueDescription("Screen flickering");
        request.setMaintenanceType(AssetMaintenanceRequest.MaintenanceType.REPAIR);
        request.setPriority(AssetMaintenanceRequest.Priority.HIGH);

        assertThat(request.getIssueDescription()).isEqualTo("Screen flickering");
        assertThat(request.getMaintenanceType()).isEqualTo(AssetMaintenanceRequest.MaintenanceType.REPAIR);
        assertThat(request.getStatus()).isEqualTo(AssetMaintenanceRequest.MaintenanceStatus.REQUESTED);
    }
}
```

- [ ] **Step 2: Create the entity**

```java
package com.hrms.domain.asset;

import com.hrms.domain.common.BaseEntity;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "asset_maintenance_requests")
public class AssetMaintenanceRequest extends BaseEntity {

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(name = "asset_id", nullable = false)
    private UUID assetId;

    @Column(name = "requested_by", nullable = false)
    private UUID requestedBy;

    @Enumerated(EnumType.STRING)
    @Column(name = "maintenance_type", nullable = false, length = 30)
    private MaintenanceType maintenanceType;

    @Column(name = "issue_description", nullable = false, columnDefinition = "TEXT")
    private String issueDescription;

    @Enumerated(EnumType.STRING)
    @Column(name = "priority", nullable = false, length = 20)
    private Priority priority;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private MaintenanceStatus status = MaintenanceStatus.REQUESTED;

    @Column(name = "assigned_vendor")
    private String assignedVendor;

    @Column(name = "estimated_cost", precision = 10, scale = 2)
    private BigDecimal estimatedCost;

    @Column(name = "actual_cost", precision = 10, scale = 2)
    private BigDecimal actualCost;

    @Column(name = "scheduled_date")
    private LocalDate scheduledDate;

    @Column(name = "completed_date")
    private LocalDate completedDate;

    @Column(name = "resolution_notes", columnDefinition = "TEXT")
    private String resolutionNotes;

    @Column(name = "approved_by")
    private UUID approvedBy;

    public enum MaintenanceType {
        REPAIR, REPLACEMENT, UPGRADE, ROUTINE_SERVICE, INSPECTION
    }

    public enum Priority {
        LOW, MEDIUM, HIGH, URGENT
    }

    public enum MaintenanceStatus {
        REQUESTED, APPROVED, IN_PROGRESS, COMPLETED, CANCELLED, REJECTED
    }

    // Getters and setters omitted for brevity — generate via IDE
}
```

- [ ] **Step 3: Create the Flyway migration**

```sql
-- V95__asset_maintenance_requests.sql
CREATE TABLE IF NOT EXISTS asset_maintenance_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    asset_id UUID NOT NULL REFERENCES assets(id),
    requested_by UUID NOT NULL,
    maintenance_type VARCHAR(30) NOT NULL,
    issue_description TEXT NOT NULL,
    priority VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
    status VARCHAR(30) NOT NULL DEFAULT 'REQUESTED',
    assigned_vendor VARCHAR(200),
    estimated_cost NUMERIC(10,2),
    actual_cost NUMERIC(10,2),
    scheduled_date DATE,
    completed_date DATE,
    resolution_notes TEXT,
    approved_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    version BIGINT DEFAULT 0
);

CREATE INDEX idx_asset_maint_tenant ON asset_maintenance_requests(tenant_id);
CREATE INDEX idx_asset_maint_asset ON asset_maintenance_requests(asset_id);
CREATE INDEX idx_asset_maint_status ON asset_maintenance_requests(status);
CREATE INDEX idx_asset_maint_requested_by ON asset_maintenance_requests(requested_by);
```

- [ ] **Step 4: Create repository**

```java
package com.hrms.infrastructure.asset.repository;

import com.hrms.domain.asset.AssetMaintenanceRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface AssetMaintenanceRequestRepository extends JpaRepository<AssetMaintenanceRequest, UUID> {
    Page<AssetMaintenanceRequest> findByTenantId(UUID tenantId, Pageable pageable);
    List<AssetMaintenanceRequest> findByAssetId(UUID assetId);
    Page<AssetMaintenanceRequest> findByTenantIdAndStatus(
        UUID tenantId, AssetMaintenanceRequest.MaintenanceStatus status, Pageable pageable);
}
```

- [ ] **Step 5: Run tests and commit**

```bash
cd backend && ./mvnw test -Dtest=AssetMaintenanceRequestTest
git add backend/src/main/java/com/hrms/domain/asset/AssetMaintenanceRequest.java \
       backend/src/main/java/com/hrms/infrastructure/asset/repository/AssetMaintenanceRequestRepository.java \
       backend/src/main/resources/db/migration/V95__asset_maintenance_requests.sql \
       backend/src/test/java/com/hrms/domain/asset/AssetMaintenanceRequestTest.java
git commit -m "feat(assets): add AssetMaintenanceRequest entity + V95 migration"
```

---

### Task B2: Wire Asset Approval Workflow + Dual Mode Endpoints

**Files:**
- Modify: `backend/src/main/java/com/hrms/api/asset/controller/AssetManagementController.java`
- Modify: `backend/src/main/java/com/hrms/application/asset/service/AssetManagementService.java`

- [ ] **Step 1: Add employee request endpoint to controller**

Add new endpoint for employee self-service asset requests:

```java
@PostMapping("/request")
@RequiresPermission("ASSET:VIEW")
public ResponseEntity<Map<String, Object>> requestAsset(
        @RequestParam UUID assetId,
        @RequestParam(required = false) String justification) {
    UUID employeeId = SecurityContext.getCurrentEmployeeId();
    assetManagementService.requestAssetAssignment(assetId, employeeId, justification);
    return ResponseEntity.ok(Map.of("message", "Asset request submitted for approval"));
}
```

- [ ] **Step 2: Add maintenance request endpoints**

```java
@PostMapping("/maintenance")
@RequiresPermission("ASSET:VIEW")
public ResponseEntity<AssetMaintenanceRequest> createMaintenanceRequest(
        @RequestBody @Valid CreateMaintenanceRequestDto dto) {
    return ResponseEntity.ok(assetManagementService.createMaintenanceRequest(dto));
}

@GetMapping("/{assetId}/maintenance")
@RequiresPermission("ASSET:VIEW")
public ResponseEntity<List<AssetMaintenanceRequest>> getMaintenanceHistory(
        @PathVariable UUID assetId) {
    return ResponseEntity.ok(assetManagementService.getMaintenanceHistory(assetId));
}

@PatchMapping("/maintenance/{requestId}/status")
@RequiresPermission("ASSET:MANAGE")
public ResponseEntity<AssetMaintenanceRequest> updateMaintenanceStatus(
        @PathVariable UUID requestId,
        @RequestParam AssetMaintenanceRequest.MaintenanceStatus status,
        @RequestParam(required = false) String notes) {
    return ResponseEntity.ok(assetManagementService.updateMaintenanceStatus(requestId, status, notes));
}
```

- [ ] **Step 3: Add audit trail query endpoint**

```java
@GetMapping("/{assetId}/audit")
@RequiresPermission("ASSET:VIEW")
public ResponseEntity<List<AuditLog>> getAssetAuditTrail(@PathVariable UUID assetId) {
    return ResponseEntity.ok(assetManagementService.getAssetAuditTrail(assetId));
}
```

- [ ] **Step 4: Implement service methods**

Add to `AssetManagementService`:

```java
public AssetMaintenanceRequest createMaintenanceRequest(CreateMaintenanceRequestDto dto) {
    Asset asset = assetRepository.findById(dto.getAssetId())
        .orElseThrow(() -> new ResourceNotFoundException("Asset not found"));
    
    AssetMaintenanceRequest request = new AssetMaintenanceRequest();
    request.setTenantId(SecurityContext.getCurrentTenantId());
    request.setAssetId(dto.getAssetId());
    request.setRequestedBy(SecurityContext.getCurrentEmployeeId());
    request.setMaintenanceType(dto.getMaintenanceType());
    request.setIssueDescription(dto.getIssueDescription());
    request.setPriority(dto.getPriority());
    
    // Move asset to IN_MAINTENANCE status
    asset.setStatus(Asset.AssetStatus.IN_MAINTENANCE);
    assetRepository.save(asset);
    
    return maintenanceRequestRepository.save(request);
}

public List<AssetMaintenanceRequest> getMaintenanceHistory(UUID assetId) {
    return maintenanceRequestRepository.findByAssetId(assetId);
}

public AssetMaintenanceRequest updateMaintenanceStatus(
        UUID requestId, AssetMaintenanceRequest.MaintenanceStatus status, String notes) {
    AssetMaintenanceRequest request = maintenanceRequestRepository.findById(requestId)
        .orElseThrow(() -> new ResourceNotFoundException("Maintenance request not found"));
    
    request.setStatus(status);
    if (notes != null) request.setResolutionNotes(notes);
    
    if (status == AssetMaintenanceRequest.MaintenanceStatus.COMPLETED) {
        request.setCompletedDate(LocalDate.now());
        // Restore asset to AVAILABLE
        Asset asset = assetRepository.findById(request.getAssetId()).orElseThrow();
        asset.setStatus(Asset.AssetStatus.AVAILABLE);
        assetRepository.save(asset);
    }
    
    return maintenanceRequestRepository.save(request);
}

public List<AuditLog> getAssetAuditTrail(UUID assetId) {
    return auditLogRepository.findByEntityTypeAndEntityId("ASSET", assetId.toString());
}
```

- [ ] **Step 5: Run tests, lint, commit**

```bash
cd backend && ./mvnw test
git add backend/src/main/java/com/hrms/api/asset/controller/AssetManagementController.java \
       backend/src/main/java/com/hrms/application/asset/service/AssetManagementService.java
git commit -m "feat(assets): dual-mode assignment (direct + approval) + maintenance + audit trail"
```

---

### Task B3: Consolidate Surveys into Pulse Module

**Files:**
- Modify: `backend/src/main/java/com/hrms/api/engagement/controller/PulseSurveyController.java`
- Modify: `backend/src/main/java/com/hrms/application/engagement/service/PulseSurveyService.java`
- Create: `backend/src/main/resources/db/migration/V96__survey_templates.sql`

- [ ] **Step 1: Add template support migration**

```sql
-- V96__survey_templates.sql
ALTER TABLE pulse_surveys ADD COLUMN IF NOT EXISTS is_template BOOLEAN DEFAULT FALSE;
ALTER TABLE pulse_surveys ADD COLUMN IF NOT EXISTS template_name VARCHAR(200);
ALTER TABLE pulse_surveys ADD COLUMN IF NOT EXISTS template_category VARCHAR(50);

CREATE INDEX idx_pulse_surveys_template ON pulse_surveys(tenant_id, is_template) WHERE is_template = TRUE;
```

- [ ] **Step 2: Add template endpoints to PulseSurveyController**

```java
@PostMapping("/{surveyId}/clone")
@RequiresPermission("SURVEY:MANAGE")
public ResponseEntity<PulseSurveyDto> cloneSurvey(@PathVariable UUID surveyId,
        @RequestParam String newTitle) {
    return ResponseEntity.ok(pulseSurveyService.cloneSurvey(surveyId, newTitle));
}

@PostMapping("/{surveyId}/save-as-template")
@RequiresPermission("SURVEY:MANAGE")
public ResponseEntity<PulseSurveyDto> saveAsTemplate(@PathVariable UUID surveyId,
        @RequestParam String templateName,
        @RequestParam(required = false) String category) {
    return ResponseEntity.ok(pulseSurveyService.saveAsTemplate(surveyId, templateName, category));
}

@GetMapping("/templates")
@RequiresPermission("SURVEY:VIEW")
public ResponseEntity<List<PulseSurveyDto>> getTemplates() {
    return ResponseEntity.ok(pulseSurveyService.getTemplates());
}
```

- [ ] **Step 3: Implement template service methods**

Add to `PulseSurveyService`:

```java
@Transactional
public PulseSurveyDto cloneSurvey(UUID surveyId, String newTitle) {
    PulseSurvey source = surveyRepository.findById(surveyId)
        .orElseThrow(() -> new ResourceNotFoundException("Survey not found"));
    
    PulseSurvey clone = new PulseSurvey();
    clone.setTenantId(SecurityContext.getCurrentTenantId());
    clone.setTitle(newTitle);
    clone.setDescription(source.getDescription());
    clone.setSurveyType(source.getSurveyType());
    clone.setIsAnonymous(source.getIsAnonymous());
    clone.setStatus(PulseSurvey.SurveyStatus.DRAFT);
    clone.setCreatedBy(SecurityContext.getCurrentUserId());
    clone = surveyRepository.save(clone);
    
    // Clone questions
    List<PulseSurveyQuestion> questions = questionRepository.findBySurveyIdOrderByOrderIndex(surveyId);
    for (PulseSurveyQuestion q : questions) {
        PulseSurveyQuestion clonedQ = new PulseSurveyQuestion();
        clonedQ.setSurveyId(clone.getId());
        clonedQ.setQuestionText(q.getQuestionText());
        clonedQ.setQuestionType(q.getQuestionType());
        clonedQ.setOrderIndex(q.getOrderIndex());
        clonedQ.setRequired(q.getRequired());
        clonedQ.setOptions(q.getOptions());
        clonedQ.setCategory(q.getCategory());
        questionRepository.save(clonedQ);
    }
    
    return mapToDto(clone);
}

public PulseSurveyDto saveAsTemplate(UUID surveyId, String templateName, String category) {
    PulseSurvey survey = surveyRepository.findById(surveyId)
        .orElseThrow(() -> new ResourceNotFoundException("Survey not found"));
    
    PulseSurveyDto cloned = cloneSurvey(surveyId, templateName);
    PulseSurvey template = surveyRepository.findById(cloned.getId()).orElseThrow();
    template.setIsTemplate(true);
    template.setTemplateName(templateName);
    template.setTemplateCategory(category);
    surveyRepository.save(template);
    return mapToDto(template);
}

public List<PulseSurveyDto> getTemplates() {
    UUID tenantId = SecurityContext.getCurrentTenantId();
    return surveyRepository.findByTenantIdAndIsTemplateTrue(tenantId)
        .stream().map(this::mapToDto).toList();
}
```

- [ ] **Step 4: Complete analytics service**

Implement the analytics stub in `PulseSurveyService.getSurveyAnalytics()`:

```java
public SurveyAnalyticsDto getSurveyAnalytics(UUID surveyId) {
    PulseSurvey survey = surveyRepository.findById(surveyId)
        .orElseThrow(() -> new ResourceNotFoundException("Survey not found"));
    
    List<PulseSurveyResponse> responses = responseRepository.findBySurveyId(surveyId);
    List<PulseSurveyQuestion> questions = questionRepository.findBySurveyIdOrderByOrderIndex(surveyId);
    
    SurveyAnalyticsDto analytics = new SurveyAnalyticsDto();
    analytics.setSurveyId(surveyId);
    analytics.setTotalResponses(responses.size());
    analytics.setCompletedResponses((int) responses.stream()
        .filter(r -> r.getStatus() == PulseSurveyResponse.ResponseStatus.SUBMITTED).count());
    analytics.setResponseRate(survey.getTotalInvited() > 0 
        ? (double) analytics.getCompletedResponses() / survey.getTotalInvited() * 100 : 0);
    
    // Per-question analytics
    List<QuestionAnalyticsDto> questionStats = new ArrayList<>();
    for (PulseSurveyQuestion q : questions) {
        List<PulseSurveyAnswer> answers = answerRepository.findByQuestionId(q.getId());
        QuestionAnalyticsDto qStat = new QuestionAnalyticsDto();
        qStat.setQuestionId(q.getId());
        qStat.setQuestionText(q.getQuestionText());
        qStat.setResponseCount(answers.size());
        
        if (q.getQuestionType() == PulseSurveyQuestion.QuestionType.NPS 
            || q.getQuestionType() == PulseSurveyQuestion.QuestionType.RATING) {
            DoubleSummaryStatistics stats = answers.stream()
                .filter(a -> a.getNumericValue() != null)
                .mapToDouble(a -> a.getNumericValue().doubleValue())
                .summaryStatistics();
            qStat.setAverage(stats.getAverage());
            qStat.setMin(stats.getMin());
            qStat.setMax(stats.getMax());
        }
        questionStats.add(qStat);
    }
    analytics.setQuestionAnalytics(questionStats);
    
    return analytics;
}
```

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/resources/db/migration/V96__survey_templates.sql \
       backend/src/main/java/com/hrms/api/engagement/controller/PulseSurveyController.java \
       backend/src/main/java/com/hrms/application/engagement/service/PulseSurveyService.java
git commit -m "feat(surveys): template support + analytics + consolidate into pulse module"
```

---

### Task B4: Survey Frontend — Question Builder + Response UI + Analytics

**Files:**
- Create: `frontend/app/surveys/[id]/page.tsx` — Question builder
- Create: `frontend/app/surveys/[id]/respond/page.tsx` — Employee response form
- Create: `frontend/app/surveys/[id]/analytics/page.tsx` — Analytics dashboard
- Create: `frontend/lib/hooks/queries/useSurveyQuestions.ts`

This is a large frontend task. Break into sub-steps:

- [ ] **Step 1: Create React Query hooks for survey questions**

```typescript
// frontend/lib/hooks/queries/useSurveyQuestions.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';

export function useSurveyQuestions(surveyId: string) {
  return useQuery({
    queryKey: ['survey-questions', surveyId],
    queryFn: async () => {
      const { data } = await apiClient.get(`/api/v1/surveys/${surveyId}/questions`);
      return data;
    },
    enabled: !!surveyId,
  });
}

export function useAddQuestion(surveyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (question: CreateQuestionDto) => {
      const { data } = await apiClient.post(`/api/v1/surveys/${surveyId}/questions`, question);
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['survey-questions', surveyId] }),
  });
}

export function useSubmitSurveyResponse() {
  return useMutation({
    mutationFn: async (response: SubmitResponseDto) => {
      const { data } = await apiClient.post('/api/v1/surveys/submit', response);
      return data;
    },
  });
}

export function useSurveyAnalytics(surveyId: string) {
  return useQuery({
    queryKey: ['survey-analytics', surveyId],
    queryFn: async () => {
      const { data } = await apiClient.get(`/api/v1/surveys/${surveyId}/analytics`);
      return data;
    },
    enabled: !!surveyId,
  });
}

export function useSurveyTemplates() {
  return useQuery({
    queryKey: ['survey-templates'],
    queryFn: async () => {
      const { data } = await apiClient.get('/api/v1/surveys/templates');
      return data;
    },
  });
}

export function useCloneSurvey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ surveyId, newTitle }: { surveyId: string; newTitle: string }) => {
      const { data } = await apiClient.post(`/api/v1/surveys/${surveyId}/clone?newTitle=${newTitle}`);
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['surveys'] }),
  });
}
```

- [ ] **Step 2: Create question builder page**

Create `frontend/app/surveys/[id]/page.tsx` with:
- List of questions with drag-to-reorder
- Add question modal (type selector: Text, Single Choice, Multiple Choice, Likert, NPS, Rating)
- Edit/delete question actions
- Survey settings panel (anonymous, dates, target audience)
- Publish button

Implementation should use Mantine components (`Card`, `Select`, `TextInput`, `Switch`, `ActionIcon`), React Hook Form + Zod for the question form, and the existing `@hello-pangea/dnd` for drag-drop.

- [ ] **Step 3: Create employee response page**

Create `frontend/app/surveys/[id]/respond/page.tsx` with:
- Read-only survey title and description
- Sequential question rendering by type
- Progress bar
- Submit button
- Anonymous mode indicator

- [ ] **Step 4: Create analytics dashboard page**

Create `frontend/app/surveys/[id]/analytics/page.tsx` with:
- Response rate card (total invited vs completed)
- Per-question charts (Recharts — bar chart for ratings, pie for choices)
- NPS score display (promoters/passives/detractors)
- Export CSV button

- [ ] **Step 5: Run lint, typecheck, commit**

```bash
cd frontend && npm run lint && npx tsc --noEmit
git add frontend/app/surveys/[id]/page.tsx \
       frontend/app/surveys/[id]/respond/page.tsx \
       frontend/app/surveys/[id]/analytics/page.tsx \
       frontend/lib/hooks/queries/useSurveyQuestions.ts
git commit -m "feat(surveys): question builder + response form + analytics dashboard"
```

---

### Task B5: Offer-to-Salary Pipeline

**Files:**
- Modify: `backend/src/main/java/com/hrms/application/recruitment/listener/CandidateHiredEventListener.java`
- Create: `frontend/app/employees/[id]/compensation/page.tsx`
- Create: `frontend/lib/hooks/queries/useCompensationHistory.ts`

- [ ] **Step 1: Add salary structure creation to CandidateHiredEventListener**

In the listener's `onCandidateHired` method, after employee creation:

```java
// Create initial salary structure from offered CTC
if (candidate.getOfferedCtc() != null) {
    SalaryStructure structure = new SalaryStructure();
    structure.setTenantId(employee.getTenantId());
    structure.setEmployeeId(employee.getId());
    structure.setStructureName("Initial - " + employee.getEmployeeCode());
    structure.setGrossSalary(candidate.getOfferedCtc());
    structure.setEffectiveDate(employee.getJoiningDate() != null 
        ? employee.getJoiningDate() : LocalDate.now());
    structure.setIsActive(true);
    salaryStructureRepository.save(structure);
    
    // Create initial salary revision record
    SalaryRevision revision = new SalaryRevision();
    revision.setTenantId(employee.getTenantId());
    revision.setEmployeeId(employee.getId());
    revision.setNewSalary(candidate.getOfferedCtc());
    revision.setPreviousSalary(BigDecimal.ZERO);
    revision.setRevisionType(SalaryRevision.RevisionType.PROBATION_CONFIRMATION);
    revision.setEffectiveDate(structure.getEffectiveDate());
    revision.setStatus(SalaryRevision.Status.APPLIED);
    revision.setApprovedBy(SecurityContext.getCurrentUserId());
    revision.setApprovedDate(LocalDateTime.now());
    salaryRevisionRepository.save(revision);
}
```

- [ ] **Step 2: Create compensation history React Query hook**

```typescript
// frontend/lib/hooks/queries/useCompensationHistory.ts
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';

export function useCompensationHistory(employeeId: string) {
  return useQuery({
    queryKey: ['compensation-history', employeeId],
    queryFn: async () => {
      const { data } = await apiClient.get(
        `/api/v1/compensation/employees/${employeeId}/revisions`
      );
      return data;
    },
    enabled: !!employeeId,
  });
}
```

- [ ] **Step 3: Create salary history tab on employee profile**

Create `frontend/app/employees/[id]/compensation/page.tsx` showing:
- Timeline of salary revisions (effective date, old CTC, new CTC, % change, type, status)
- Current active salary structure
- Revision approval chain (proposed by, reviewed by, approved by)

Use Mantine `Timeline`, `Card`, and `Badge` components.

- [ ] **Step 4: Run tests and commit**

```bash
cd backend && ./mvnw test
cd frontend && npm run lint && npx tsc --noEmit
git add backend/src/main/java/com/hrms/application/recruitment/listener/CandidateHiredEventListener.java \
       frontend/app/employees/[id]/compensation/page.tsx \
       frontend/lib/hooks/queries/useCompensationHistory.ts
git commit -m "feat(compensation): offer-to-salary pipeline + salary history tab"
```

---

## STREAM C: TESTING (Starts when A+B are 80% complete)

### Task C1: E2E Test Infrastructure Setup

**Files:**
- Create: `frontend/e2e/fixtures/test-tenant-seed.ts`
- Create: `frontend/e2e/fixtures/auth.ts`

- [ ] **Step 1: Create auth fixture for Playwright**

```typescript
// frontend/e2e/fixtures/auth.ts
import { test as base, expect } from '@playwright/test';

type AuthFixtures = {
  authenticatedPage: { page: any; token: string };
};

export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ page }, use) => {
    // Authenticate via API (faster than UI login)
    const response = await page.request.post('http://localhost:8080/api/v1/auth/login', {
      data: {
        email: process.env.TEST_ADMIN_EMAIL || 'admin@test-tenant.com',
        password: process.env.TEST_ADMIN_PASSWORD || 'Test@12345678',
        tenantCode: process.env.TEST_TENANT_CODE || 'TEST',
      },
    });
    
    const { accessToken, refreshToken } = await response.json();
    
    // Set tokens in browser storage
    await page.goto('http://localhost:3000');
    await page.evaluate(({ accessToken, refreshToken }) => {
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
    }, { accessToken, refreshToken });
    
    await use({ page, token: accessToken });
  },
});

export { expect };
```

- [ ] **Step 2: Create test data seed script**

```typescript
// frontend/e2e/fixtures/test-tenant-seed.ts
// Seeds a test tenant with known data for deterministic E2E tests
export const TEST_TENANT = {
  code: 'TEST',
  name: 'Test Organization',
  adminEmail: 'admin@test-tenant.com',
};

export const TEST_EMPLOYEES = {
  admin: { email: 'admin@test-tenant.com', role: 'SUPER_ADMIN' },
  hrAdmin: { email: 'hr-admin@test-tenant.com', role: 'HR_ADMIN' },
  hrManager: { email: 'hr@test-tenant.com', role: 'HR_MANAGER' },
  employee: { email: 'employee@test-tenant.com', role: 'EMPLOYEE' },
  manager: { email: 'manager@test-tenant.com', role: 'DEPARTMENT_MANAGER' },
};
```

- [ ] **Step 3: Commit**

```bash
git add frontend/e2e/fixtures/auth.ts frontend/e2e/fixtures/test-tenant-seed.ts
git commit -m "test(e2e): add auth fixture + test tenant seed for Playwright"
```

---

### Task C2: E2E Tests — Top 10 Flows

**Files:** 10 spec files in `frontend/e2e/`

Each E2E test follows this pattern:
1. Authenticate as the appropriate role
2. Navigate to the route
3. Execute the happy path
4. Verify success state
5. Verify data persistence (refresh check)

- [ ] **Step 1: Auth flow E2E**

```typescript
// frontend/e2e/auth-flow.spec.ts
import { test, expect } from './fixtures/auth';

test.describe('Authentication', () => {
  test('should login with valid credentials', async ({ page }) => {
    await page.goto('http://localhost:3000/auth/login');
    await page.fill('[name="email"]', 'admin@test-tenant.com');
    await page.fill('[name="password"]', 'Test@12345678');
    await page.fill('[name="tenantCode"]', 'TEST');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/me\/dashboard/);
  });

  test('should redirect unauthenticated user to login', async ({ page }) => {
    await page.goto('http://localhost:3000/employees');
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test('should logout and clear session', async ({ authenticatedPage }) => {
    const { page } = authenticatedPage;
    await page.goto('http://localhost:3000/me/dashboard');
    // Click avatar → logout
    await page.click('[data-testid="user-menu"]');
    await page.click('[data-testid="logout-btn"]');
    await expect(page).toHaveURL(/\/auth\/login/);
  });
});
```

- [ ] **Step 2: Create remaining 9 E2E specs**

Create skeleton specs for: employee-crud, leave-flow, payroll-run, recruitment-pipeline, performance-review, attendance-flow, expense-flow, asset-flow, admin-roles. Each follows the auth + navigate + act + assert pattern.

- [ ] **Step 3: Run E2E suite**

Run: `cd frontend && npx playwright test --project=chromium`
Expected: All 10 specs pass

- [ ] **Step 4: Commit**

```bash
git add frontend/e2e/*.spec.ts
git commit -m "test(e2e): add top 10 critical flow E2E tests"
```

---

### Task C3: Backend JaCoCo Push to 85%

- [ ] **Step 1: Check current coverage**

Run: `cd backend && ./mvnw test jacoco:report`
Open: `backend/target/site/jacoco/index.html`
Note current coverage percentage.

- [ ] **Step 2: Identify uncovered service classes**

Look at JaCoCo report for classes with < 80% coverage in `application/*/service/` packages.

- [ ] **Step 3: Write tests for uncovered services**

Priority order:
1. Controllers with < 50% coverage
2. Services with business logic < 70% coverage
3. Security-related code (filters, aspects)

- [ ] **Step 4: Verify 85% target met**

Run: `cd backend && ./mvnw test jacoco:report`
Expected: Overall coverage >= 85%

- [ ] **Step 5: Commit**

```bash
git add backend/src/test/
git commit -m "test(backend): push JaCoCo coverage to 85%"
```

---

### Task C4: Frontend Component Test Push to 70%

- [ ] **Step 1: Check current coverage**

Run: `cd frontend && npx vitest run --coverage`
Note current coverage.

- [ ] **Step 2: Write tests for critical components**

Priority:
1. `PermissionGate.tsx` — all permission scenarios
2. `AuthGuard.tsx` — auth state handling
3. Form components with Zod validation
4. `Sidebar.tsx` — app-aware rendering
5. `AppSwitcher.tsx` — app switching logic

- [ ] **Step 3: Verify 70% target met**

Run: `cd frontend && npx vitest run --coverage`
Expected: Overall coverage >= 70%

- [ ] **Step 4: Commit**

```bash
git add frontend/components/**/__tests__/
git commit -m "test(frontend): push component coverage to 70%"
```

---

## Execution Summary

| Stream | Tasks | Est. Days | Dependencies |
|--------|-------|-----------|-------------|
| **A: RBAC** | A1-A5 | 9 | None |
| **B: Features** | B1-B5 | 15 | None |
| **C: Testing** | C1-C4 | 14 | A+B at 80% |
| **Total** | 14 tasks | ~4 weeks (A+B parallel) | — |

### Verification Checklist

- [ ] All 246 permissions seeded in DB (V94)
- [ ] HR_ADMIN role at rank 85 with tests
- [ ] 8 ungated pages fixed
- [ ] RBAC annotation test covers all 161 controllers
- [ ] Asset dual-mode (direct + approval) working
- [ ] Asset maintenance request lifecycle working
- [ ] Survey templates + clone working
- [ ] Survey question builder UI working
- [ ] Survey response form with anonymous mode working
- [ ] Survey analytics dashboard with charts working
- [ ] Offer-to-salary pipeline creating SalaryStructure on hire
- [ ] Salary history tab on employee profile working
- [ ] Backend JaCoCo >= 85%
- [ ] Frontend component coverage >= 70%
- [ ] 10 E2E Playwright specs passing
