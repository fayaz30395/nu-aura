# NU-AURA Technical Baseline Report

**Generated:** 2026-03-19
**Phase:** 0 -- Audit & Stabilization Baseline
**Scope:** Backend (Spring Boot 3.4.1, Java 17) + Frontend (Next.js 14, TypeScript)

---

## 1. Failing / Disabled Tests

### Backend

**Disabled test files (renamed to `.disabled`):**

| File | Notes |
|------|-------|
| `backend/src/test/java/com/hrms/application/EmployeeServiceTest.java.disabled` | Entire test class disabled by renaming |
| `backend/src/test/java/com/hrms/application/LeaveServiceTest.java.disabled` | Entire test class disabled by renaming |
| `backend/src/test/java/com/hrms/integration/EmployeeControllerIntegrationTest.java.disabled` | Integration test disabled by renaming |

**`@Disabled` / `@Ignore` annotations:** None found in active test files.

**`TODO` / `FIXME` in test files:** None found.

**Total active backend test files:** 104

### Frontend

**`test.skip` / `describe.skip` / `it.skip` / `.todo()`:** None found across all frontend test and spec files.

### Assessment

3 test files are silently disabled by file rename (`.disabled` extension), meaning they are invisible to the test runner. These likely stopped compiling after refactors and were sidelined rather than fixed. They should be either restored or formally deleted.

---

## 2. API Contract Mismatches

### 2a. Frontend calls endpoints that do NOT exist in backend

| Frontend Service | Path Called | Issue |
|-----------------|------------|-------|
| `frontend/lib/services/spotlight.service.ts` | `/api/spotlights`, `/api/spotlights/active`, `/api/spotlights/{id}` | No backend controller maps to `/api/spotlights`. No `SpotlightController` exists. |
| `frontend/lib/services/linkedin.service.ts` | `/api/v1/linkedin-posts`, `/api/v1/linkedin-posts/active`, `/api/v1/linkedin-posts/{id}` | No backend controller maps to `/api/v1/linkedin-posts`. No `LinkedInPostController` exists. |
| `frontend/lib/services/task.service.ts` | `/pm/tasks`, `/pm/tasks/{id}`, `/pm/tasks/project/{projectId}` | No backend controller maps to `/pm/tasks`. The `modules/pm/` directory exists but may not be wired. |

### 2b. Frontend uses wrong base path (missing `/api/v1/` prefix)

| Frontend Service | Path Used | Correct Backend Path |
|-----------------|-----------|---------------------|
| `frontend/lib/services/resource-management.service.ts` | `/resource-management` | `/api/v1/resource-management` |
| `frontend/lib/services/tax.service.ts` | `/tax-declarations` | `/api/v1/tax-declarations` |
| `frontend/lib/services/timesheet.service.ts` | `/psa/timesheets` | `/api/v1/psa/timesheets` |

These will produce 404 errors at runtime unless the Axios base URL already includes `/api/v1/` (verify the `apiClient` config).

### 2c. Backend controllers with NO corresponding frontend service

The following backend controllers have no matching frontend service file. Some are expected (e.g., internal admin, monitoring), others indicate incomplete frontend integration:

| Backend Controller | Base Path | Assessment |
|-------------------|-----------|------------|
| `ProbationController` | `/api/v1/probation` | No `probation.service.ts` |
| `ReferralController` | `/api/v1/referrals` | No `referral.service.ts` |
| `CustomFieldController` | `/api/v1/custom-fields` | No dedicated service (may be inline) |
| `MfaController` | `/api/v1/auth/mfa` | Covered by auth hooks |
| `SmsNotificationController` | `/api/v1/notifications/sms` | Internal |
| `MultiChannelNotificationController` | `/api/v1/notifications` | Internal |
| `PaymentConfigController` | `/api/v1/payments/config` | Partial coverage in `payment.service.ts` |
| `PaymentWebhookController` | `/api/v1/payments/webhooks` | Server-to-server, no frontend needed |
| `AIRecruitmentController` | `/api/v1/recruitment/ai` | Covered by `ai-recruitment.service.ts` |
| `JobBoardController` | `/api/v1/recruitment/job-boards` | No `job-board.service.ts` |
| `KafkaAdminController` | `/api/v1/admin/kafka` | Internal admin |
| `MonitoringController` | `/api/monitoring` | Internal |
| `DataMigrationController` | `/api/v1/migration` | Internal admin tool |
| `BudgetPlanningController` | `/api/v1/budget` | No `budget.service.ts` |
| `FeatureFlagController` | `/api/v1/feature-flags` | No `feature-flag.service.ts` |
| `ContentViewController` | `/api/v1/views` | No dedicated service |
| `ExportController` | `/api/v1/export` | No `export.service.ts` |
| `PerformanceRevolutionController` | `/api/v1/performance/revolution` | No dedicated service |
| `SurveyAnalyticsController` | `/api/v1/survey-analytics` | No dedicated service (surveys use `survey.service.ts`) |

---

## 3. Hard-Delete Call Sites

The platform uses soft deletes (`is_deleted` / `deleted_at`) as a convention, but the following locations perform **permanent hard deletes** using JPA `.delete()` / `.deleteAll()` or `DELETE FROM` JPQL:

### Repository-level DELETE FROM queries

| File | Line | Query Target |
|------|------|-------------|
| `infrastructure/webhook/repository/WebhookDeliveryRepository.java` | 66 | `DELETE FROM WebhookDelivery` (cleanup of delivered webhooks) |
| `infrastructure/wall/repository/WallPostRepository.java` | 47 | `DELETE FROM WallPost` |
| `infrastructure/customfield/repository/CustomFieldValueRepository.java` | 53 | `DELETE FROM CustomFieldValue` |
| `infrastructure/notification/repository/NotificationRepository.java` | 55, 134 | `DELETE FROM Notification` |
| `infrastructure/ai/repository/ChatbotConversationRepository.java` | 30 | `DELETE FROM ChatbotConversation` |
| `infrastructure/psa/repository/PSAProjectRepository.java` | 53 | `DELETE FROM PSAProject` |
| `infrastructure/lms/repository/QuizQuestionRepository.java` | 33 | `DELETE FROM QuizQuestion` |
| `infrastructure/engagement/repository/PulseSurveyAnswerRepository.java` | 53, 57 | `DELETE FROM PulseSurveyAnswer` |
| `infrastructure/engagement/repository/PulseSurveyQuestionRepository.java` | 38 | `DELETE FROM PulseSurveyQuestion` |
| `infrastructure/user/repository/CustomScopeTargetRepository.java` | 64 | `DELETE FROM CustomScopeTarget` |
| `infrastructure/engagement/repository/MeetingActionItemRepository.java` | 67 | `DELETE FROM MeetingActionItem` |
| `infrastructure/engagement/repository/MeetingAgendaItemRepository.java` | 28 | `DELETE FROM MeetingAgendaItem` |
| `infrastructure/payroll/repository/EmployeePayrollRecordRepository.java` | 48 | `DELETE FROM EmployeePayrollRecord` |
| `common/security/ApiKeyRepository.java` | 46 | `DELETE FROM ApiKey` |

### Service-level `.delete()` calls (JPA hard delete)

| File | Line | Entity Deleted |
|------|------|---------------|
| `application/budget/service/BudgetPlanningService.java` | 176, 365, 487 | Budget, BudgetPosition, BudgetScenario |
| `application/analytics/service/ScheduledReportService.java` | 137 | ScheduledReport |
| `application/leave/service/LeaveTypeService.java` | 111 | LeaveType |
| `common/security/ApiKeyService.java` | 182 | ApiKey |
| `application/onboarding/service/OnboardingManagementService.java` | 161, 163, 218, 348 | OnboardingTemplateTasks, Template, Task, Process |
| `application/helpdesk/service/HelpdeskService.java` | 210, 271, 343 | Ticket, TicketComment, TicketCategory |
| `application/helpdesk/service/HelpdeskSLAService.java` | 67 | TicketSLA |
| `application/overtime/service/OvertimeManagementService.java` | 168 | OvertimeRecord |
| `application/employee/service/DepartmentService.java` | 183 | Department |
| `application/employee/service/SkillService.java` | 69 | EmployeeSkill |
| `application/announcement/service/AnnouncementService.java` | 346 | Announcement |
| `application/survey/service/SurveyManagementService.java` | 173 | Survey |
| `application/performance/service/FeedbackService.java` | 107 | Feedback |
| `application/performance/service/OkrService.java` | 137, 206 | Objective, KeyResult |
| `application/performance/service/Feedback360Service.java` | 99 | Feedback360Cycle |
| `application/payroll/service/PayslipService.java` | 126 | Payslip |
| `application/payroll/service/SalaryStructureService.java` | 154 | SalaryStructure |
| `application/payroll/service/PayrollRunService.java` | 164 | PayrollRun |
| `application/timetracking/service/TimeTrackingService.java` | 186 | TimeEntry |
| `application/benefits/service/BenefitManagementService.java` | 142 | BenefitPlan |
| `application/exit/service/ExitManagementService.java` | 157, 223 | ExitProcess, ExitClearance |
| `application/knowledge/service/DocumentTemplateService.java` | 146 | DocumentTemplate |
| `application/knowledge/service/BlogCategoryService.java` | 91 | BlogCategory |
| `application/knowledge/service/WikiPageService.java` | 186 | WikiPage |
| `application/knowledge/service/WikiSpaceService.java` | 112 | WikiSpace |
| `application/knowledge/service/BlogPostService.java` | 184 | BlogPost |
| `application/engagement/service/OneOnOneMeetingService.java` | 307 | MeetingAgendaItem |
| `application/engagement/service/PulseSurveyService.java` | 141 | PulseSurvey |
| `application/project/service/ProjectTimesheetService.java` | 264, 372 | TimeEntry, ProjectMember |
| `application/user/service/RoleManagementService.java` | 157 | Role |
| `application/esignature/service/ESignatureService.java` | 229, 415 | SignatureRequest, SignatureApproval |
| `application/tax/service/TaxDeclarationService.java` | 172 | TaxDeclaration |
| `application/shift/service/ShiftManagementService.java` | 134 | Shift |
| `application/recruitment/service/JobOpeningService.java` | 179 | JobOpening |
| `application/recruitment/service/RecruitmentManagementService.java` | 231 | Candidate |
| `application/recruitment/service/ApplicantService.java` | 212 | Applicant |
| `application/recruitment/service/InterviewManagementService.java` | 223 | Interview |
| `application/training/service/TrainingManagementService.java` | 125 | TrainingProgram |
| `application/lms/service/LmsService.java` | 96, 128 | Course, CourseModule |
| `application/lms/service/QuizManagementService.java` | 98, 176 | Quiz, QuizQuestion |
| `application/customfield/service/CustomFieldService.java` | 318 | CustomFieldDefinition |
| `application/asset/service/AssetManagementService.java` | 181 | Asset |
| `application/calendar/service/CalendarService.java` | 149 | CalendarEvent |
| `application/wall/service/WallService.java` | 214 | PostReaction (toggle) |
| `application/contract/service/ContractTemplateService.java` | 133 | ContractTemplate |
| `application/contract/service/ContractService.java` | 206 | Contract |
| `application/webhook/service/WebhookService.java` | 141 | Webhook |
| `application/attendance/service/HolidayService.java` | 93 | Holiday |

### Summary

**Total hard-delete call sites: 70+** across repositories and services. This is a significant data-integrity risk for a multi-tenant SaaS platform. Critical entities being hard-deleted include: **PayrollRun, Payslip, SalaryStructure, LeaveType, Department, Role, Candidate, Contract, Asset, ExitProcess**.

Redis `.delete()` calls (AccountLockoutService, DistributedRateLimiter, TenantCacheManager) are appropriate and excluded from this risk assessment.

---

## 4. Stub / Mock Integrations

### Placeholder implementations (not wired to real services)

| File | Line | Description |
|------|------|-------------|
| `application/mobile/service/MobileApprovalService.java` | 34, 63, 84 | "This is a placeholder - integrate with actual approval service" -- returns mock data |
| `application/mobile/service/MobileSyncService.java` | 33 | "This is a placeholder - integrate with audit logs or change tracking tables" |
| `application/mobile/service/MobileNotificationService.java` | 35, 47 | "This is a placeholder implementation" / "integrate with actual notification service" |
| `application/mobile/service/MobileLeaveService.java` | 65 | "This is a placeholder - integrate with actual LeaveBalanceService" |
| `application/dataimport/service/KekaImportService.java` | 132, 207 | "For now, this is a placeholder implementation" (two methods) |

### Mock service implementations in infrastructure

| File | Description |
|------|-------------|
| `infrastructure/payment/MockPaymentService.java` | Mock payment gateway (no real Stripe/Razorpay integration) |
| `infrastructure/sms/MockSmsService.java` | Mock SMS service (no real Twilio integration) |

### Assessment

The entire **Mobile API layer** (5 controllers, 5 services) is placeholder code returning mock data. The **Keka import** has incomplete data transformation logic. Payment and SMS services have mock implementations that should be swapped for real adapters before production.

---

## 5. Critical Module Health

### Payroll

| Metric | Count |
|--------|-------|
| Controllers | 3 (PayrollController, GlobalPayrollController, PayrollStatutoryController) |
| Services | 7 (PayrollRunService, PayslipService, PayslipPdfService, SalaryStructureService, GlobalPayrollService, StatutoryDeductionService + DTO) |
| Entities | 8 (PayrollRun, Payslip, SalaryStructure, EmployeePayrollRecord, GlobalPayrollRun, PayrollLocation, ExchangeRate, Currency) |
| Tests | 5 dedicated (PayrollControllerTest, PayrollRunServiceTest, PayslipServiceTest, SalaryStructureServiceTest, GlobalPayrollServiceTest) + 1 E2E (PayrollE2ETest) |
| Issues | Hard-deletes on PayrollRun, Payslip, SalaryStructure. These are auditable financial records that should never be permanently deleted. |

### Leave

| Metric | Count |
|--------|-------|
| Controllers | 3 (LeaveRequestController, LeaveBalanceController, LeaveTypeController) |
| Services | 3 (LeaveRequestService, LeaveBalanceService, LeaveTypeService) |
| Entities | 3 (LeaveRequest, LeaveBalance, LeaveType) |
| Tests | 5 dedicated (LeaveRequestControllerTest, LeaveRequestControllerScopeTest, LeaveRequestServiceTest, LeaveBalanceServiceTest, LeaveTypeServiceTest) + 2 integration + 1 E2E |
| Issues | Hard-delete on LeaveType. 1 disabled test file (`LeaveServiceTest.java.disabled`). |

### Attendance

| Metric | Count |
|--------|-------|
| Controllers | 5 (AttendanceController, HolidayController, OfficeLocationController, CompOffController, MobileAttendanceController) |
| Services | 7 (AttendanceRecordService, HolidayService, OfficeLocationService, CompOffService, MobileAttendanceService, AttendanceImportService, AutoRegularizationScheduler) |
| Entities | 5 (AttendanceRecord, Holiday, OfficeLocation, AttendanceTimeEntry, CompOffRequest) |
| Tests | 4 dedicated (AttendanceControllerTest, AttendanceRecordServiceTest, HolidayServiceTest, OfficeLocationServiceTest) + 1 E2E |
| Issues | Hard-delete on Holiday. No test for CompOffService or MobileAttendanceService. |

### Contract

| Metric | Count |
|--------|-------|
| Controllers | 2 (ContractController, ContractTemplateController) |
| Services | 4 (ContractService, ContractTemplateService, ContractReminderService, ContractSignatureService) |
| Entities | 10 (Contract, ContractTemplate, ContractVersion, ContractSignature, ContractReminder + enums) |
| Tests | 1 (ContractServiceTest) |
| Issues | Hard-deletes on Contract and ContractTemplate. Only 1 test for 4 services. No controller test. |

### Payment

| Metric | Count |
|--------|-------|
| Controllers | 3 (PaymentController, PaymentConfigController, PaymentWebhookController) |
| Services | 4 (PaymentService, PaymentGatewayAdapter, RazorpayAdapter, StripeAdapter) |
| Entities | 10 (PaymentTransaction, PaymentBatch, PaymentConfig, PaymentRefund, PaymentWebhook + repositories) |
| Tests | 0 dedicated payment tests |
| Issues | **Zero test coverage.** `MockPaymentService` in infrastructure suggests real payment adapters are not yet integrated. Repositories are in `domain/` package (violates architecture -- repositories should be in `infrastructure/`). |

---

## 6. Architecture Observations

### Existing ArchUnit tests

`backend/src/test/java/com/hrms/architecture/LayerArchitectureTest.java` already provides comprehensive layer boundary enforcement:
- Layered architecture validation (API -> Application -> Domain -> Infrastructure)
- Controllers cannot access Repositories (with 3 documented exceptions: WebhookController, PayrollStatutoryController, IntegrationController)
- Services cannot depend on Controllers
- Domain independence from outer layers
- Naming convention enforcement

### Noted exceptions in architecture tests

3 controllers are explicitly excluded from the "no repository access" rule:
- `WebhookController`
- `PayrollStatutoryController`
- `IntegrationController`

These bypass the service layer and access repositories directly, which should be tracked as tech debt.

### Payment domain repositories

The `domain/payment/` package contains repository interfaces (`PaymentTransactionRepository`, `PaymentBatchRepository`, `PaymentConfigRepository`, `PaymentRefundRepository`, `PaymentWebhookRepository`), which violates the architecture convention that repositories belong in `infrastructure/`. The existing ArchUnit test for repository location excludes `ApiKeyRepository` but not these.

### Tenant scoping

171 out of ~200+ domain entity files contain a `tenantId` field. Entities in subpackages like `domain/event/`, some enums, and utility classes correctly lack `tenantId`.

---

## Summary of Critical Findings

| Finding | Severity | Count |
|---------|----------|-------|
| Disabled test files (silent) | Medium | 3 |
| Frontend calling non-existent backend endpoints | High | 3 services (spotlight, linkedin, pm/tasks) |
| Frontend using wrong API base path | High | 3 services (resource-mgmt, tax, timesheet) |
| Hard-delete on auditable financial entities | Critical | PayrollRun, Payslip, SalaryStructure |
| Hard-delete call sites total | High | 70+ |
| Placeholder/mock mobile services | Medium | 5 services entirely placeholder |
| Mock payment/SMS integrations | Medium | 2 |
| Payment module: zero tests | High | 0 tests for 3 controllers + 4 services |
| Contract module: minimal tests | Medium | 1 test for 4 services, 0 controller tests |
| Architecture violations (repos in domain) | Low | Payment domain package |
