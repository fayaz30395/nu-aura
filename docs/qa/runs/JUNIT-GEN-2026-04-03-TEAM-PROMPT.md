# NU-AURA JUnit Generation Agent Team — 2026-04-03

> **Paste this entire prompt into a new Claude Code session (co-work or tmux).**
>
> **Pre-conditions:**
> 1. Working directory: `/Users/fayaz.m/IdeaProjects/nulogic/nu-aura`
> 2. Backend compiles: `cd backend && mvn compile -q` → no errors
> 3. Existing tests run: `cd backend && mvn test -q` → note current pass count

---

## The Prompt

```text
Goal: Generate JUnit 5 integration tests for all 318 use cases defined in
docs/qa/NU-AURA-QA-USE-CASES.md. Each UC must have at minimum:
  (a) A happy-path test method
  (b) A negative-path test method (wrong input, missing field, etc.)
  (c) An RBAC boundary test if the UC has a Persona restriction

CRITICAL: ~240 test files already exist in backend/src/test/. Before
creating any new test class, check if the UC's endpoint is already
covered in an existing file. EXTEND existing classes — do NOT duplicate.

---

## PROJECT CONTEXT

Package root: com.hrms
Test root: backend/src/test/java/com/hrms/
Source root: backend/src/main/java/com/hrms/

Test stack:
  - JUnit 5 (@Test, @BeforeEach, @AfterEach, @Nested)
  - Spring Boot Test (@SpringBootTest, @AutoConfigureMockMvc)
  - MockMvc (perform, andExpect, jsonPath, status)
  - TestSecurityConfig (sets SYSTEM_ADMIN permission — bypasses RBAC)
  - For RBAC tests: override SecurityContext per test with restricted permissions

Standard test class template:
  ```java
  package com.hrms.integration;

  import com.fasterxml.jackson.databind.ObjectMapper;
  import com.hrms.common.security.Permission;
  import com.hrms.common.security.SecurityContext;
  import com.hrms.config.TestSecurityConfig;
  import com.hrms.domain.user.RoleScope;
  import org.junit.jupiter.api.BeforeEach;
  import org.junit.jupiter.api.DisplayName;
  import org.junit.jupiter.api.Nested;
  import org.junit.jupiter.api.Test;
  import org.springframework.beans.factory.annotation.Autowired;
  import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
  import org.springframework.boot.test.context.SpringBootTest;
  import org.springframework.context.annotation.Import;
  import org.springframework.http.MediaType;
  import org.springframework.security.test.context.support.WithMockUser;
  import org.springframework.test.context.ActiveProfiles;
  import org.springframework.test.web.servlet.MockMvc;

  import java.util.HashMap;
  import java.util.HashSet;
  import java.util.Map;
  import java.util.Set;
  import java.util.UUID;

  import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
  import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

  @SpringBootTest
  @AutoConfigureMockMvc(addFilters = false)
  @ActiveProfiles("test")
  @Import(TestSecurityConfig.class)
  class XxxUseCaseIntegrationTest {

      @Autowired MockMvc mockMvc;
      @Autowired ObjectMapper objectMapper;

      private static final String BASE_URL = "/api/v1/xxx";
      private static final UUID TENANT_ID  = UUID.fromString("550e8400-e29b-41d4-a716-446655440000");
      private static final UUID USER_ID    = UUID.fromString("660e8400-e29b-41d4-a716-446655440000");
      private static final UUID EMPLOYEE_ID= UUID.fromString("111e8400-e29b-41d4-a716-446655440099");

      @BeforeEach
      void setUpSuperAdminContext() {
          Map<String, RoleScope> permissions = new HashMap<>();
          permissions.put(Permission.SYSTEM_ADMIN, RoleScope.ALL);
          SecurityContext.setCurrentUser(USER_ID, EMPLOYEE_ID,
              Set.of("SUPER_ADMIN"), permissions);
          SecurityContext.setCurrentTenantId(TENANT_ID);
      }

      // ── UC-XXX-001: <Title> ────────────────────────────────────────────
      @Test
      @WithMockUser(username = "fayaz.m@nulogic.io", roles = {"SUPER_ADMIN"})
      @DisplayName("UC-XXX-001 Happy Path: <description>")
      void ucXxx001_happyPath_returnsExpected() throws Exception {
          // arrange
          // act + assert
          mockMvc.perform(get(BASE_URL).param("page", "0").param("size", "10"))
                 .andExpect(status().isOk())
                 .andExpect(jsonPath("$.content").isArray());
      }

      @Test
      @WithMockUser(username = "saran@nulogic.io", roles = {"EMPLOYEE"})
      @DisplayName("UC-XXX-001 Negative: invalid input returns 400")
      void ucXxx001_invalidInput_returns400() throws Exception {
          // assert
          mockMvc.perform(post(BASE_URL)
                     .contentType(MediaType.APPLICATION_JSON)
                     .content("{}"))  // missing required fields
                 .andExpect(status().isBadRequest());
      }

      @Test
      @WithMockUser(username = "saran@nulogic.io", roles = {"EMPLOYEE"})
      @DisplayName("UC-XXX-001 RBAC: EMPLOYEE cannot access HR-only endpoint")
      void ucXxx001_employeeRole_returns403() throws Exception {
          // set EMPLOYEE-only permissions (no SYSTEM_ADMIN bypass)
          Map<String, RoleScope> permissions = new HashMap<>();
          permissions.put("hrms.xxx.view_self", RoleScope.SELF);
          SecurityContext.setCurrentUser(USER_ID, EMPLOYEE_ID,
              Set.of("EMPLOYEE"), permissions);

          mockMvc.perform(get(BASE_URL))
                 .andExpect(status().isForbidden());
      }
  }
  ```

Permission format in tests:
  - `Permission.SYSTEM_ADMIN` → bypass all (SuperAdmin happy-path tests)
  - `"module.action"` e.g. `"hrms.leave.request"` → granular permissions
  - DB format is `module.action`, code uses `MODULE:ACTION` — in tests always use
    the constant from `com.hrms.common.security.Permission` class, or the string
    `"module.action"` matching the @RequiresPermission annotation on the endpoint.

Existing test IDs to use:
  TENANT_ID  = UUID.fromString("550e8400-e29b-41d4-a716-446655440000")
  USER_ID    = UUID.fromString("660e8400-e29b-41d4-a716-446655440000")
  EMPLOYEE_ID= UUID.fromString("111e8400-e29b-41d4-a716-446655440099")

Test method naming:
  Happy path:    uc{Group}{N}_{verb}_{expectation}
  Negative path: uc{Group}{N}_{condition}_returns{Status}
  RBAC:          uc{Group}{N}_{role}_returns403

---

## STEP 1 — Orchestrator: Create Status File

Before spawning any teammate, YOU (the orchestrator) must:

1. Create docs/qa/runs/2026-04-03/junit-status.md:

   # JUnit Generation Status — 2026-04-03

   | UC ID | Target Test Class | Method Count | Status | Notes |
   |-------|------------------|-------------|--------|-------|
   | UC-AUTH-001 | AuthControllerTest.java | 3 | PENDING | |
   ... (one row per UC, Status=PENDING)

   Extract UC IDs from docs/qa/NU-AURA-QA-USE-CASES.md.
   Pre-fill Target Test Class from the mapping below.

2. Existing class mapping (pre-fill in the status file):

   UC-AUTH-*       → integration/AuthControllerTest.java (EXTEND)
   UC-PAY-*        → integration/PayrollControllerTest.java (EXTEND)
   UC-APPR-*       → integration/ApprovalChainIntegrationTest.java (EXTEND)
   UC-EMP-*        → integration/EmployeeControllerTest.java (EXTEND)
   UC-ATT-*        → integration/AttendanceControllerTest.java (EXTEND)
   UC-LEAVE-*      → integration/LeaveRequestControllerIntegrationTest.java (EXTEND)
   UC-BEN-*        → integration/BenefitManagementControllerTest.java (EXTEND)
   UC-ASSET-*      → integration/AssetManagementControllerTest.java (EXTEND)
   UC-EXP-*        → integration/ExpenseClaimControllerTest.java (EXTEND)
   UC-LOAN-*       → integration/LoanControllerTest.java (EXTEND)
   UC-TRAVEL-*     → integration/TravelServiceTest.java (EXTEND)
   UC-STAT-*       → integration/LWFControllerTest.java (EXTEND)
   UC-HELP-*       → integration/HelpdeskControllerTest.java (EXTEND)
   UC-TIME-*       → integration/TimesheetControllerTest.java (EXTEND)
   UC-RESOURCE-*   → integration/ResourceManagementAllocationIntegrationTest.java (EXTEND)
   UC-REPORT-*     → integration/ReportControllerTest.java (EXTEND)
   UC-ADMIN-*      → integration/FeatureFlagControllerTest.java (EXTEND for flags) / integration/HolidayServiceTest.java (for holidays)
   UC-NOTIF-*      → integration/NotificationControllerTest.java (EXTEND)
   UC-DEPT-*       → integration/DepartmentControllerTest.java (EXTEND)
   UC-CONTRACT-*   → integration/ContractControllerTest.java (EXTEND)
   UC-LETTER-*     → integration/LetterControllerTest.java (EXTEND)
   UC-COMP-*       → integration/CompensationServiceTest.java (EXTEND)
   UC-PROB-*       → NEW: integration/ProbationUseCaseIntegrationTest.java
   UC-MY-*         → NEW: integration/MySpaceUseCaseIntegrationTest.java
   UC-SETTINGS-*   → NEW: integration/SettingsUseCaseIntegrationTest.java
   UC-APPSW-*      → NEW: integration/AppSwitcherUseCaseIntegrationTest.java
   UC-SMOKE-*      → NEW: integration/SmokeUseCaseIntegrationTest.java
   UC-HIRE-*       → integration/RecruitmentControllerTest.java (EXTEND)
   UC-GROW-*       → integration/PerformanceReviewControllerTest.java (EXTEND) + OkrControllerTest.java + TrainingManagementControllerTest.java
   UC-RBAC-*       → security/RoleHierarchyTest.java (EXTEND) + NEW: security/RbacUseCaseBoundaryTest.java
   UC-TENANT-*     → security/TenantIsolationNegativeTest.java (EXTEND)
   UC-SEC-*        → common/security/JwtSecurityTest.java (EXTEND) + NEW: security/SecurityUseCaseTest.java
   UC-DASH-*       → integration/DashboardControllerTest.java (EXTEND)
   UC-FNF-*        → integration/FnFCalculationServiceTest.java (EXTEND)
   UC-PERF-*       → NEW: performance/PerformanceUseCaseBenchmarkTest.java
   UC-COMP-*       → integration/CompensationServiceTest.java (EXTEND)

3. Once status file is created, spawn 5 teammates simultaneously.

---

## Create a team of 5 teammates:

---

### Teammate 1 — Writer-1: Platform & Finance UCs

"You are Test Writer 1 for NU-AURA. Write JUnit 5 integration tests for
your assigned use cases. Read each UC from docs/qa/NU-AURA-QA-USE-CASES.md,
understand the API, then write tests in the mapped test class.

PROJECT CONTEXT:
  Package root:   com.hrms
  Test root:      backend/src/test/java/com/hrms/
  Source root:    backend/src/main/java/com/hrms/
  Test profile:   @ActiveProfiles('test')
  Security setup: TestSecurityConfig (sets SYSTEM_ADMIN — bypasses all RBAC)
  MockMvc filter: @AutoConfigureMockMvc(addFilters = false)
  Existing test IDs:
    TENANT_ID   = UUID.fromString('550e8400-e29b-41d4-a716-446655440000')
    USER_ID     = UUID.fromString('660e8400-e29b-41d4-a716-446655440000')
    EMPLOYEE_ID = UUID.fromString('111e8400-e29b-41d4-a716-446655440099')

YOUR ASSIGNMENTS:

GROUP A — UC-AUTH-001 through UC-AUTH-007
  Target file: backend/src/test/java/com/hrms/integration/AuthControllerTest.java
  READ this file first. Then ADD methods for any UC not already covered.
  Key endpoints: POST /api/v1/auth/login, /logout, /refresh, /reset-password,
                 /mfa/setup, /mfa/verify, /mfa-login, /google
  UC-AUTH-001: test email/password login (200), wrong password (401), lockout after 5 fails (423)
  UC-AUTH-002: test Google OAuth token exchange (200), invalid token (400)
  UC-AUTH-003: test MFA setup (200 returns QR), MFA verify (200), wrong TOTP (401)
  UC-AUTH-004: test logout (200, cookie cleared), blacklisted token (401)
  UC-AUTH-005: test token refresh (200 new token), expired refresh (401)
  UC-AUTH-006: test reset-password email (200), invalid email (404)
  UC-AUTH-007: test rate limiting (429 after 5 rapid requests)

GROUP B — UC-PAY-001 through UC-PAY-006
  Target file: backend/src/test/java/com/hrms/integration/PayrollControllerTest.java
  READ this file first. ADD methods for uncovered UCs.
  Key endpoints: POST /api/v1/payroll/structures, POST /api/v1/payroll/runs,
                 GET /api/v1/payroll/payslips/{id}/pdf, PUT /api/v1/payroll/runs/{id}/lock,
                 POST /api/v1/payroll/adjustments
  UC-PAY-001: create salary structure (201), duplicate name (409)
  UC-PAY-002: initiate payroll run (202 accepted), run when already in progress (409)
  UC-PAY-003: verify SpEL formula evaluation (200 with correct computed salary)
  UC-PAY-004: generate payslip PDF (200 Content-Type: application/pdf), no payslip (404)
  UC-PAY-005: lock payroll run (200), lock already locked run (409)
  UC-PAY-006: add payroll adjustment (201), adjustment after lock (409)

GROUP C — UC-APPR-001 through UC-APPR-005
  Target file: backend/src/test/java/com/hrms/integration/ApprovalChainIntegrationTest.java
  READ this file first. ADD methods for uncovered UCs.
  Key endpoints: POST /api/v1/approvals/{id}/approve, /reject, GET /api/v1/approvals/inbox
  UC-APPR-001: full leave approval chain (200 chain progresses)
  UC-APPR-002: leave rejection with comment (200, status REJECTED, reason saved)
  UC-APPR-003: expense approval chain (200 chain progresses)
  UC-APPR-004: overtime approval (200), wrong approver (403)
  UC-APPR-005: escalation on timeout (status ESCALATED after timeout trigger)

GROUP D — UC-FNF-001 through UC-FNF-005
  Target file: backend/src/test/java/com/hrms/integration/FnFCalculationServiceTest.java
  READ this file first. ADD methods for uncovered UCs.
  UC-FNF-001: pro-rata calculation (200 with correct last-month salary)
  UC-FNF-002: leave encashment included in FnF (200, non-zero encashment amount)
  UC-FNF-003: pending expense included in FnF total (200)
  UC-FNF-004: loan deduction in FnF (200, outstanding loan deducted)
  UC-FNF-005: final payslip generated (200, PDF downloadable)

GROUP E — UC-PERF-001 through UC-PERF-008
  Target file: NEW backend/src/test/java/com/hrms/performance/PerformanceUseCaseBenchmarkTest.java
  WRITE a new test class. Each test verifies API response time via System.nanoTime():
  UC-PERF-001: dashboard loads < 3000ms
  UC-PERF-002: employee list 500 rows loads < 5000ms
  UC-PERF-003: payroll run completes < 60000ms (async — poll status)
  UC-PERF-004: API median response < 300ms (10 consecutive calls average)
  UC-PERF-005: leave form submit < 500ms
  UC-PERF-006: 1000-row export completes < 30000ms
  UC-PERF-007: WebSocket notification delivered (verify endpoint responds < 500ms)
  UC-PERF-008: N concurrent requests all return 200 (use 5 parallel MockMvc calls)

HOW TO WRITE EACH TEST:
1. Read the UC from docs/qa/NU-AURA-QA-USE-CASES.md
2. Identify: API Endpoint, Expected Result, Negative Test, HTTP status codes
3. Read the existing target test file (if EXTEND)
4. Check if a method already tests this endpoint with similar inputs
5. If coverage exists: skip (no duplication). If missing: write the methods.
6. For happy path: use SYSTEM_ADMIN context (set in @BeforeEach)
7. For negative path: test invalid inputs, duplicate keys, missing fields
8. For RBAC: override SecurityContext in test with restricted permissions
9. After writing, update docs/qa/runs/2026-04-03/junit-status.md:
   Change Status PENDING → WRITTEN for each UC

After each group (A/B/C/D/E), compile-check your work:
  cd backend && mvn test-compile -pl . -q 2>&1 | tail -20
If compile errors: fix them before moving to next group.

After all groups done, post 'WRITER-1 COMPLETE' to task list."

---

### Teammate 2 — Writer-2: HRMS Core UCs

"You are Test Writer 2 for NU-AURA. Write JUnit 5 integration tests for
your assigned HRMS core use cases.

PROJECT CONTEXT: (same as Writer-1 above)

YOUR ASSIGNMENTS:

GROUP A — UC-EMP-001 through UC-EMP-005
  Target: backend/src/test/java/com/hrms/integration/EmployeeControllerTest.java
  Endpoints: POST /api/v1/employees, PUT /api/v1/employees/{id},
             POST /api/v1/employees/import, POST /api/v1/employees/{id}/changes,
             GET /api/v1/organization/org-chart
  UC-EMP-001: create employee (201, employee ID assigned), duplicate email (409), missing field (400)
  UC-EMP-002: HR updates any field (200), Employee updates salary (403 or field ignored)
  UC-EMP-003: bulk import 5 valid rows (200, count+=5), missing required field (partial import 207)
  UC-EMP-004: employment change with future effective date (201), past date (400)
  UC-EMP-005: org chart returns hierarchical structure (200, contains managerId/children fields)

GROUP B — UC-ATT-001 through UC-ATT-003
  Target: backend/src/test/java/com/hrms/integration/AttendanceControllerTest.java
  Endpoints: POST /api/v1/attendance/check-in, /check-out,
             POST /api/v1/attendance/regularization, PUT /api/v1/attendance/shifts/{id}/assign
  UC-ATT-001: check-in (201), check-out (200), duplicate check-in (409)
  UC-ATT-002: regularization submit (201 PENDING), approve (200 APPROVED), reject (200 REJECTED)
  UC-ATT-003: shift assignment (200), invalid shift ID (404)

GROUP C — UC-LEAVE-001 through UC-LEAVE-003
  Target: backend/src/test/java/com/hrms/integration/LeaveRequestControllerIntegrationTest.java
  Endpoints: POST /api/v1/leave-requests, GET /api/v1/leave-balances,
             POST /api/v1/leave/encash
  UC-LEAVE-001: apply annual leave (201 PENDING), insufficient balance (400)
  UC-LEAVE-002: verify carry-forward applied (200 balance includes carried days)
  UC-LEAVE-003: encashment request (201), encash non-encashable type (400)

GROUP D — UC-BEN-001 through UC-BEN-002
  Target: backend/src/test/java/com/hrms/integration/BenefitManagementControllerTest.java
  Endpoints: POST /api/v1/benefits/enrollments, POST /api/v1/benefits/auto-enroll
  UC-BEN-001: benefit enrollment (201, effective from today), already enrolled (409)
  UC-BEN-002: new hire auto-enrollment trigger (200, enrollment created)

GROUP E — UC-ASSET-001 through UC-ASSET-002
  Target: backend/src/test/java/com/hrms/integration/AssetManagementControllerTest.java
  Endpoints: POST /api/v1/assets/assignments, PUT /api/v1/assets/assignments/{id}/return
  UC-ASSET-001: assign asset (201), assign already-assigned asset (409)
  UC-ASSET-002: return asset on exit (200, asset status AVAILABLE)

GROUP F — UC-DEPT-001 (1 UC)
  Target: backend/src/test/java/com/hrms/integration/DepartmentControllerTest.java
  Endpoints: POST /api/v1/departments, PUT /api/v1/departments/{id},
             DELETE /api/v1/departments/{id}
  UC-DEPT-001: create department (201), create with duplicate code (409),
               delete department with active employees (400)

GROUP G — UC-COMP-001 (1 UC)
  Target: backend/src/test/java/com/hrms/integration/CompensationServiceTest.java
  Endpoints: GET /api/v1/compensation/bands, POST /api/v1/compensation/history
  UC-COMP-001: view compensation bands (200), add compensation history entry (201)

GROUP H — UC-PROB-001 through UC-PROB-005
  Target: NEW backend/src/test/java/com/hrms/integration/ProbationUseCaseIntegrationTest.java
  Endpoints: GET /api/v1/probation, PUT /api/v1/probation/{id}/confirm,
             PUT /api/v1/probation/{id}/extend
  UC-PROB-001: probation list loads (200), confirm employee (200 status→CONFIRMED)
  UC-PROB-002: extend probation with reason (200 new end date saved)
  UC-PROB-003: manager submits review (201, rating and recommendation saved)
  UC-PROB-004: auto-notification on probation end (test scheduler triggers event)
  UC-PROB-005: HR probation dashboard aggregates correctly (200, counts match DB)

GROUP I — UC-MY-001 through UC-MY-008
  Target: NEW backend/src/test/java/com/hrms/integration/MySpaceUseCaseIntegrationTest.java
  Endpoints: GET /api/v1/self-service/profile, /payslips, /leave, /assets, /documents, /loans
  UC-MY-001: all MY SPACE endpoints return 200 (employee sees own data only)
  UC-MY-002: payslip history returns employee's own records (not other employees')
  UC-MY-003: payslip PDF download returns 200 application/pdf
  UC-MY-004: leave balance view returns correct balances
  UC-MY-005: attendance history returns own records with pagination
  UC-MY-006: my assets view returns assigned assets
  UC-MY-007: loan status returns active loan repayment schedule
  UC-MY-008: profile self-update allowed fields (200), restricted field (403 or ignored)

RBAC note for UC-MY-*: set EMPLOYEE-level permissions in each test:
  permissions.put('hrms.self_service.view', RoleScope.SELF)

After each group, compile-check:
  cd backend && mvn test-compile -pl . -q 2>&1 | tail -20

After all groups done, post 'WRITER-2 COMPLETE' to task list."

---

### Teammate 3 — Writer-3: HRMS Extended + Settings UCs

"You are Test Writer 3 for NU-AURA. Write JUnit 5 integration tests.

PROJECT CONTEXT: (same as Writer-1)

YOUR ASSIGNMENTS:

GROUP A — UC-EXP-001, UC-LOAN-001, UC-TRAVEL-001
  UC-EXP-001 → ExpenseClaimControllerTest.java
    POST /api/v1/expense-claims: submit claim (201 PENDING), exceed limit (400),
    EMPLOYEE cannot access another's claim (403)
  UC-LOAN-001 → LoanControllerTest.java
    POST /api/v1/loans: apply (201), multiple active loans (400)
    GET /api/v1/loans/{id}/schedule: repayment schedule (200)
  UC-TRAVEL-001 → TravelServiceTest.java
    POST /api/v1/travel/requests: submit (201 PENDING), past travel date (400)
    PUT /api/v1/travel/requests/{id}/approve: approve (200 APPROVED)

GROUP B — UC-STAT-001 through UC-STAT-003
  Target: backend/src/test/java/com/hrms/integration/LWFControllerTest.java (EXTEND)
  Also check: PayrollStatutoryControllerTest.java
  UC-STAT-001: PF calculation (200 with correct amounts matching formula)
  UC-STAT-002: TDS declaration submit (201), Form 16 download (200 PDF)
  UC-STAT-003: LWF deduction applied (200, correct state-based amount)

GROUP C — UC-HELP-001 (1 UC)
  Target: backend/src/test/java/com/hrms/integration/HelpdeskControllerTest.java
  POST /api/v1/helpdesk/tickets: create (201 OPEN), GET /{id} (200),
  PUT /{id}/resolve (200 RESOLVED), EMPLOYEE cannot access another's ticket (403)

GROUP D — UC-TIME-001 (1 UC)
  Target: backend/src/test/java/com/hrms/integration/TimesheetControllerTest.java
  POST /api/v1/time-entries: log time (201), exceeds daily limit (400),
  GET /api/v1/timesheets: employee sees own (200), EMPLOYEE sees own only (not all)

GROUP E — UC-RESOURCE-001 (1 UC)
  Target: backend/src/test/java/com/hrms/integration/ResourceManagementAllocationIntegrationTest.java
  POST /api/v1/resources/allocations: allocate (201), over-allocate (400 or 409)

GROUP F — UC-CONTRACT-001, UC-LETTER-001
  UC-CONTRACT-001 → ContractControllerTest.java
    POST /api/v1/contracts: create (201), e-sign flow (200 SIGNED)
    GET /api/v1/contracts/{id}: view (200), EMPLOYEE cannot view another's (403)
  UC-LETTER-001 → LetterControllerTest.java
    POST /api/v1/letters/generate: generate experience letter (200 PDF content)
    EMPLOYEE can generate own letter (200), cannot generate for others (403)

GROUP G — UC-REPORT-001 through UC-REPORT-002
  Target: backend/src/test/java/com/hrms/integration/ReportControllerTest.java
  UC-REPORT-001: headcount report (200, JSON with count > 0)
  UC-REPORT-002: scheduled report create (201), invalid cron expression (400),
                 EMPLOYEE cannot access reports (403)

GROUP H — UC-ADMIN-001 through UC-ADMIN-002
  UC-ADMIN-001 → FeatureFlagControllerTest.java
    PUT /api/v1/admin/feature-flags/{key}: enable (200), disable (200)
    EMPLOYEE cannot toggle flags (403)
  UC-ADMIN-002 → HolidayServiceTest.java
    POST /api/v1/admin/holidays: create holiday (201), duplicate date (409)
    EMPLOYEE cannot create holidays (403)

GROUP I — UC-NOTIF-001 (1 UC)
  Target: backend/src/test/java/com/hrms/integration/NotificationControllerTest.java
  GET /api/v1/notifications: user sees own (200, list), mark-read (200)
  Employee sees only own notifications (count matches expectations)

GROUP J — UC-SETTINGS-001 through UC-SETTINGS-007
  Target: NEW backend/src/test/java/com/hrms/integration/SettingsUseCaseIntegrationTest.java
  UC-SETTINGS-001: change password (200), wrong current password (401),
                   reuse recent password (400)
  UC-SETTINGS-002: change password enforces complexity (400 on weak password)
  UC-SETTINGS-003: MFA setup from settings (200 returns QR), enable (200)
  UC-SETTINGS-004: revoke active session (200, token invalidated)
  UC-SETTINGS-005: update notification preferences (200, setting persisted)
  UC-SETTINGS-006: view SSO configuration (200 for configured tenants)
  UC-SETTINGS-007: update display preferences (200, preference saved)

After each group, compile-check:
  cd backend && mvn test-compile -pl . -q 2>&1 | tail -20

After all groups done, post 'WRITER-3 COMPLETE' to task list."

---

### Teammate 4 — Writer-4: NU-Hire + NU-Grow UCs

"You are Test Writer 4 for NU-AURA. Write JUnit 5 integration tests
for NU-Hire (UC-HIRE-*) and NU-Grow (UC-GROW-*).

PROJECT CONTEXT: (same as Writer-1)

YOUR ASSIGNMENTS:

GROUP A — UC-HIRE-001 through UC-HIRE-018
  Primary target: backend/src/test/java/com/hrms/integration/RecruitmentControllerTest.java
  Secondary targets: OnboardingManagementControllerTest.java, OfferLetterWorkflowIntegrationTest.java,
                     ApplicantControllerTest.java, AIRecruitmentFileParsingIntegrationTest.java

  UC-HIRE-001: create job requisition (201), missing job title (400)
  UC-HIRE-002: move candidate to next stage in pipeline (200), invalid stage (400)
  UC-HIRE-003: schedule interview (201), submit feedback (201 with score)
  UC-HIRE-004: generate offer letter (200 PDF), send to candidate (200)
  UC-HIRE-005: preboarding valid token (200), expired token (401)
  UC-HIRE-006: onboarding checklist create (201), complete task (200 progress updated)
  UC-HIRE-007: offboarding initiate (201), FnF calculation triggered (200)
  UC-HIRE-008: employee referral submit (201, referral_bonus pending)
  UC-HIRE-009: resume parse from upload (200 with parsed fields)
  UC-HIRE-010: bulk candidate import CSV (200, count matches rows)
  UC-HIRE-011: offer letter expiry — resend expired offer (200 new expiry)
  UC-HIRE-012: preboarding with invalid token (401)
  UC-HIRE-013: preboarding with expired token (401 expired)
  UC-HIRE-014: exit interview via public URL (200 accessible without auth)
  UC-HIRE-015: career portal job listing (200 public endpoint, no auth needed)
  UC-HIRE-016: referral with rewards — verify points credited after hire (200)
  UC-HIRE-017: interview scorecard submission (201 with ratings)
  UC-HIRE-018: onboarding document checklist (201, documents tracked)

GROUP B — UC-GROW-001 through UC-GROW-022
  Primary target: backend/src/test/java/com/hrms/integration/PerformanceReviewControllerTest.java
  Additional targets: OkrControllerTest.java, TrainingManagementControllerTest.java,
                      RecognitionControllerTest.java, PulseSurveyControllerTest.java,
                      WellnessControllerTest.java, Feedback360ServiceTest.java,
                      GoalControllerTest.java, ReviewCycleControllerTest.java

  UC-GROW-001: create review cycle (201), duplicate cycle (409)
  UC-GROW-002: submit self-review (201), submit twice (409)
  UC-GROW-003: manager review submitted (201), final rating calculated (200)
  UC-GROW-004: 360 feedback request (201), anonymous response (200 anonymized)
  UC-GROW-005: create OKR (201), cascade to team (200)
  UC-GROW-006: enroll in LMS course (201), complete module (200 progress updated)
  UC-GROW-007: send kudos to peer (201 appears in recognition feed)
  UC-GROW-008: survey creation (201), employee responds (201 response saved)
  UC-GROW-009: wellness program join (201)
  UC-GROW-010: calibration session 9-box (200 grid data populated)
  UC-GROW-011: 9-box grid assessment create/update (200)
  UC-GROW-012: PIP initiation (201 with manager/HR as reviewers)
  UC-GROW-013: PIP progress update (200 milestone logged)
  UC-GROW-014: goal check-in (201 check-in recorded)
  UC-GROW-015: OKR cascade company→team (200 child OKR created)
  UC-GROW-016: OKR progress scoring (200 score updated)
  UC-GROW-017: 360 feedback anonymity (200 respondent name NOT in response)
  UC-GROW-018: aggregate performance scores (200 department averages computed)
  UC-GROW-019: training certificate generation (200 PDF, certificate issued)
  UC-GROW-020: training prerequisite enforcement (400 if prerequisite not complete)
  UC-GROW-021: pulse survey launch and results (201 launch, 200 results for HR)
  UC-GROW-022: one-on-one notes (201 created, 200 retrieved by manager and employee)

For each UC: read the full UC section first, identify the endpoint,
then add the happy-path + negative test methods.

After each group (A or B), compile-check:
  cd backend && mvn test-compile -pl . -q 2>&1 | tail -20

After all groups done, post 'WRITER-4 COMPLETE' to task list."

---

### Teammate 5 — Writer-5 + Reviewer: RBAC, Security, Dashboards + Test Runner

"You are Test Writer 5 AND the Test Runner/Reviewer for NU-AURA.
Two responsibilities:

RESPONSIBILITY 1 — WRITE (runs in parallel with Writers 1-4):

YOUR UC ASSIGNMENTS:

GROUP A — UC-RBAC-001 through UC-RBAC-020
  Primary: backend/src/test/java/com/hrms/security/RoleHierarchyTest.java (EXTEND)
  New class: backend/src/test/java/com/hrms/security/RbacUseCaseBoundaryTest.java

  For EACH RBAC UC, write a test that:
  1. Sets up a restricted permission context (NOT SYSTEM_ADMIN)
  2. Attempts the forbidden action
  3. Asserts status().isForbidden() or the correct scoped response

  Permission setup pattern for RBAC boundary tests:
    Map<String, RoleScope> restrictedPerms = new HashMap<>();
    restrictedPerms.put('hrms.leave.view_self', RoleScope.SELF); // EMPLOYEE only
    SecurityContext.setCurrentUser(USER_ID, EMPLOYEE_ID, Set.of('EMPLOYEE'), restrictedPerms);

  UC-RBAC-001: EMPLOYEE access to own data returns 200
  UC-RBAC-002: EMPLOYEE tries admin route → 403
  UC-RBAC-003: MANAGER accesses team data → 200 (scoped)
  UC-RBAC-004: SUPER_ADMIN accesses everything → 200
  UC-RBAC-005: HR_MANAGER cannot access payroll config → 403
  UC-RBAC-006: TENANT_ADMIN cannot access super-admin endpoints → 403
  UC-RBAC-007: self-approval blocked (approverId == requesterId → 400)
  UC-RBAC-008: sidebar isolation (test via /api/v1/navigation/menu — scoped items)
  UC-RBAC-009: API permission boundary (403 with correct error body format)
  UC-RBAC-010: permission cache invalidation after role change (200 new perms)
  UC-RBAC-011: permission delegation (temporary access) → 200 within window
  UC-RBAC-012: MY SPACE routes need NO permission → always 200 for any auth user
  UC-RBAC-013: expired JWT → 401
  UC-RBAC-014: SUPER_ADMIN bypasses all checks → 200 everywhere
  UC-RBAC-015: HR_ADMIN cannot see other tenant payroll → 403
  UC-RBAC-016: NEW_JOINER role restrictions (limited access) → 403 on admin routes
  UC-RBAC-017: manager cannot approve own expense (conflict) → 400
  UC-RBAC-018: cannot grant role higher than own → 400
  UC-RBAC-019: HR_MANAGER scoped to own department → filtered results
  UC-RBAC-020: permission check failures logged in audit → audit log entry created

GROUP B — UC-TENANT-001 (1 UC)
  Target: backend/src/test/java/com/hrms/security/TenantIsolationNegativeTest.java (EXTEND)
  UC-TENANT-001: Tenant A user attempts to access Tenant B data
    Setup: SecurityContext.setCurrentTenantId(TENANT_A_ID)
    Request: GET /api/v1/employees (returns Tenant A employees only)
    Assert: response does NOT contain any Tenant B employee ID
    Hint: use a second UUID constant TENANT_B_ID and verify isolation

GROUP C — UC-SEC-001 through UC-SEC-012
  New class: backend/src/test/java/com/hrms/security/SecurityUseCaseTest.java
  Also extend: JwtSecurityTest.java, AuthControllerSecurityTest.java

  UC-SEC-001: concurrent sessions — second login does NOT invalidate first (200 both work)
  UC-SEC-002: OWASP headers present on every response (verify header names in MockMvc result)
    Note: addFilters=false skips Spring Security; for header tests use @SpringBootTest with
    addFilters=true or verify headers explicitly in SecurityConfig unit test
  UC-SEC-003: CSRF protection — POST without CSRF header returns 403 (test with filters=true)
  UC-SEC-004: XSS — store <script>alert('x')</script> in input, GET returns it HTML-escaped
  UC-SEC-005: account lockout after 5 fails → 423 on 6th attempt
  UC-SEC-006: CSRF token double-submit verification
  UC-SEC-007: SQL injection in search param → 200 with 0 results (not 500)
  UC-SEC-008: XSS in rich text (TipTap) → stored as sanitized HTML, script tags stripped
  UC-SEC-009: export endpoint rate limit → 429 after limit exceeded
  UC-SEC-010: sensitive fields NOT in API response (password, mfaSecret not in GET /employees)
  UC-SEC-011: audit trail created for sensitive operations (verify audit log after delete)
  UC-SEC-012: file upload MIME validation (application/pdf accepted, text/javascript 400)

GROUP D — UC-DASH-001 through UC-DASH-008
  Target: backend/src/test/java/com/hrms/integration/DashboardControllerTest.java (EXTEND)
  UC-DASH-001: dashboard load (200, response < 3s — use timing assertion)
  UC-DASH-002: executive dashboard for TENANT_ADMIN (200, contains org-level metrics)
  UC-DASH-003: manager dashboard (200, contains team metrics)
  UC-DASH-004: employee dashboard (200, contains own metrics only)
  UC-DASH-005: HR dashboard (200, contains all HR metrics)
  UC-DASH-006: predictive analytics widget (200, contains predictions array)
  UC-DASH-007: org health score (200, score between 0-100)
  UC-DASH-008: partial widget failure — if one widget 500s, others still return (200 partial)

---

RESPONSIBILITY 2 — TEST RUNNER (after all 4 Writers post COMPLETE):

Wait for WRITER-1, WRITER-2, WRITER-3, WRITER-4 to all post COMPLETE.
Then:

1. Compile check:
   cd /Users/fayaz.m/IdeaProjects/nulogic/nu-aura/backend
   mvn test-compile -q 2>&1 | tail -30

   Fix any compilation errors yourself. Common issues:
   - Missing imports → add to the failing class
   - Missing constructor args → match existing record/DTO structure
   - Unknown method → check the actual controller/service for correct method name

2. Run all UC-tagged tests:
   mvn test -q -Dtest='*UseCaseIntegrationTest,*BoundaryTest,*BenchmarkTest' \
     2>&1 | tail -50

3. If test failures:
   - Read the failure reason
   - Fix the test (not the production code — unless a genuine bug is found)
   - Genuine production bugs: file in docs/qa/runs/2026-04-03/bugs.md
     and leave the test @Disabled with a comment: '@Disabled(\"Bug BUG-N filed\")'

4. Run full test suite:
   mvn test -q 2>&1 | grep -E 'Tests run|FAIL|ERROR|BUILD' | tail -20

5. Write final summary to docs/qa/runs/2026-04-03/junit-status.md (append):

   ## Final Results
   Total new test methods written: <count>
   Compile errors fixed: <count>
   Test failures found: <count>
   Production bugs filed: <count>
   New test classes created: <list>
   Extended test classes: <list>

6. Update each row in junit-status.md from WRITTEN → PASS or FAIL.

After all done, post 'WRITER-5+REVIEWER COMPLETE' to task list."

---

## TASK DEPENDENCIES

1. Orchestrator creates docs/qa/runs/2026-04-03/junit-status.md FIRST
2. Writers 1-4 start SIMULTANEOUSLY
3. Writer-5 writes their RBAC/SEC/DASH tests simultaneously with 1-4
4. Writer-5 ALSO waits for Writers 1-4 to finish, then runs the full suite
5. All writers compile-check after each group before moving forward

## COORDINATION PROTOCOL

- Each writer compile-checks after every group
- If compile error touches a shared file (e.g. TestSecurityConfig),
  post to task list before editing: 'WRITER-2 editing TestSecurityConfig'
- Writers must NOT modify production code — only add test files
- Exception: if a genuine bug is found, file it and @Disabled the test

## FINAL DELIVERABLES

1. New test methods added/created covering all 318 UCs
2. docs/qa/runs/2026-04-03/junit-status.md — all UCs marked WRITTEN/PASS/FAIL
3. Full test suite still GREEN (no regressions)
4. Production bugs found during test writing filed in bugs.md
```

---

## Quick Reference

### Compile & Run

```bash
cd /Users/fayaz.m/IdeaProjects/nulogic/nu-aura/backend

# Compile only (fast check)
mvn test-compile -q 2>&1 | tail -20

# Run specific test class
mvn test -Dtest=AuthControllerTest -q 2>&1 | tail -30

# Run all new UC tests
mvn test -Dtest='*UseCaseIntegrationTest,*BoundaryTest,*BenchmarkTest' -q 2>&1 | tail -30

# Run full suite
mvn test -q 2>&1 | grep -E 'Tests run|BUILD' | tail -5
```

### Test Class Template (Copy-Paste)

```java
package com.hrms.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.common.security.Permission;
import com.hrms.common.security.SecurityContext;
import com.hrms.config.TestSecurityConfig;
import com.hrms.domain.user.RoleScope;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import java.util.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc(addFilters = false)
@ActiveProfiles("test")
@Import(TestSecurityConfig.class)
class XxxUseCaseIntegrationTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;

    private static final String BASE_URL = "/api/v1/xxx";
    private static final UUID TENANT_ID   = UUID.fromString("550e8400-e29b-41d4-a716-446655440000");
    private static final UUID USER_ID     = UUID.fromString("660e8400-e29b-41d4-a716-446655440000");
    private static final UUID EMPLOYEE_ID = UUID.fromString("111e8400-e29b-41d4-a716-446655440099");

    @BeforeEach
    void superAdminContext() {
        SecurityContext.setCurrentUser(USER_ID, EMPLOYEE_ID,
            Set.of("SUPER_ADMIN"),
            Map.of(Permission.SYSTEM_ADMIN, RoleScope.ALL));
        SecurityContext.setCurrentTenantId(TENANT_ID);
    }

    // Helper for restricted role context
    void setEmployeeContext() {
        SecurityContext.setCurrentUser(USER_ID, EMPLOYEE_ID,
            Set.of("EMPLOYEE"),
            Map.of("hrms.self_service.view", RoleScope.SELF));
        SecurityContext.setCurrentTenantId(TENANT_ID);
    }
}
```

### Existing Test Class Coverage Map

| UC Group | Existing Test File | Action |
|----------|--------------------|--------|
| UC-AUTH | AuthControllerTest.java | EXTEND |
| UC-PAY | PayrollControllerTest.java | EXTEND |
| UC-APPR | ApprovalChainIntegrationTest.java | EXTEND |
| UC-EMP | EmployeeControllerTest.java | EXTEND |
| UC-ATT | AttendanceControllerTest.java | EXTEND |
| UC-LEAVE | LeaveRequestControllerIntegrationTest.java | EXTEND |
| UC-BEN | BenefitManagementControllerTest.java | EXTEND |
| UC-ASSET | AssetManagementControllerTest.java | EXTEND |
| UC-HIRE | RecruitmentControllerTest.java | EXTEND |
| UC-GROW | PerformanceReviewControllerTest.java + others | EXTEND |
| UC-RBAC | RoleHierarchyTest.java | EXTEND + NEW |
| UC-TENANT | TenantIsolationNegativeTest.java | EXTEND |
| UC-SEC | JwtSecurityTest.java + AuthControllerSecurityTest.java | EXTEND + NEW |
| UC-PROB | — | NEW |
| UC-MY | — | NEW |
| UC-SETTINGS | — | NEW |
| UC-PERF | — | NEW |
| UC-DASH | DashboardControllerTest.java | EXTEND |
| UC-FNF | FnFCalculationServiceTest.java | EXTEND |

### Writer Assignment Summary

| Writer | UC Groups | Approx UCs | Key New Files |
|--------|-----------|-----------|---------------|
| Writer-1 | AUTH, PAY, APPR, FNF, PERF | ~31 | PerformanceUseCaseBenchmarkTest.java |
| Writer-2 | EMP, ATT, LEAVE, BEN, ASSET, DEPT, COMP, PROB, MY | ~32 | ProbationUseCaseIntegrationTest.java, MySpaceUseCaseIntegrationTest.java |
| Writer-3 | EXP, LOAN, TRAVEL, STAT, HELP, TIME, RESOURCE, CONTRACT, LETTER, REPORT, ADMIN, NOTIF, SETTINGS | ~30 | SettingsUseCaseIntegrationTest.java |
| Writer-4 | HIRE, GROW | ~40 | — (extends existing) |
| Writer-5 | RBAC, TENANT, SEC, DASH + runs full suite | ~40 | RbacUseCaseBoundaryTest.java, SecurityUseCaseTest.java |
