---
title: Backend Controller Index — Complete Enumeration
tags: [backend, api, controllers, rest, catalog, index]
---

# Backend Controller Index — Complete Enumeration

> The exhaustive **1:1 companion** to [[APIs]] (which is the curated, endpoint-level
> catalog). Where [[APIs]] documents *what each endpoint does* with selective depth, this
> note guarantees that **every `@RestController` class appears exactly once** with its
> owning `api/<domain>` package, base path, and sub-app. If a controller exists in the
> source tree, it is in the table below — no more, no less.

## Purpose

Provide a complete, evidence-based enumeration of the NU-AURA backend HTTP surface so any
controller can be located without reading source. Each row maps a controller class to its
`api/<domain>` package, its class-level `@RequestMapping` base path (or `method-level` when
paths are declared per-handler), and the sub-app that owns the domain. The row count is
pinned to the live count of true `@RestController` classes; see [[APIs]] for endpoint-level
detail and [[Services]] for the service layer behind these controllers.

## Counts

> **Verified from source, 2026-06-18.** Reconciliation with the raw `grep` is explicit
> below because the naive command over-counts.

| Metric | Count | Evidence |
|--------|-------|----------|
| Raw `grep -rl '@RestController' … \| wc -l` | **184** | matches `.disabled` + 3 non-controllers |
| Disabled (excluded from build) | 1 | `RecruitmentManagementController.java.disabled` |
| `@RestControllerAdvice` / marker-source matches (not controllers) | 3 | `ApiResponseBodyAdvice`, `GlobalExceptionHandler` (advice); `WrapResponse` (annotation source, mentions `@RestController` in Javadoc) |
| **True `@RestController` classes (live)** | **180** | `grep -rlE '^\s*@RestController\s*(\(|$)' --include='*.java'` |
| — under `api/<domain>` | 178 | the 68 `api/*` packages |
| — outside `api/` | 2 | `common/security/ApiKeyController`, `domain/notification/WebSocketNotificationController` |
| `api/*` domain packages | 68 | `ls com/nulogic/api` |

**Why 180, not 184:** the raw `grep -rl '@RestController' backend/src/main/java/com/nulogic`
has no `--include`, so it also reads `RecruitmentManagementController.java.disabled` (+1),
and matches three classes that contain the *text* `@RestController` but are not controllers:
`ApiResponseBodyAdvice` and `GlobalExceptionHandler` are `@RestControllerAdvice`, and
`WrapResponse` is a custom annotation whose Javadoc references `@RestController`. Subtracting
those four leaves **180 live controllers** — the row count of the table below.

### Per-sub-app controller count

| Sub-app | Controllers | Domains |
|---------|-------------|---------|
| [[Nu-HRMS]] | 71 | employee, organization, user, customfield, selfservice, attendance, timetracking, shift, overtime, leave, payroll, compensation, loan, payment, tax, statutory, budget, benefits, asset, expense, travel, project, psa, resourcemanagement |
| [[Shared-Platform]] | 56 | auth, admin, platform, featureflag, monitoring, migration, dataimport, compliance, audit, workflow, analytics, dashboard, report, home, notification, announcement, meeting, calendar, helpdesk, integration, webhook, mobile, document, export, common, common(security), domain(notification) |
| [[Nu-Hire]] | 19 | recruitment, onboarding, preboarding, probation, referral, exit, esignature, letter, publicapi, contract |
| [[Nu-Grow]] | 18 | performance, lms, training, survey, recognition, engagement, wellness |
| [[Nu-Fluence]] | 16 | knowledge, wall |
| **Total** | **180** | 68 `api/*` packages + 2 non-`api` |

## Controllers by domain package

> Base path is the class-level `@RequestMapping` value; `method-level` means the controller
> declares no class-level mapping and sets paths per handler. Sub-app ownership follows the
> [[APIs]] **Domain Map**; domains not named there are inferred and flagged in
> [Notes](#notes). Every controller appears exactly once.

### NU-HRMS — Core HR, Time, Payroll, Finance, Projects

| Controller | api package | Base path |
|---|---|---|
| `DepartmentController` | employee | `/api/v1/departments` |
| `EmployeeController` | employee | `/api/v1/employees` |
| `EmployeeDirectoryController` | employee | `/api/v1/employees/directory` |
| `EmployeeDocumentController` | employee | `/api/v1/employees` |
| `EmployeeImportController` | employee | `/api/v1/employees/import` |
| `EmployeeSkillController` | employee | `/api/v1/employees` |
| `EmploymentChangeRequestController` | employee | `/api/v1/employment-change-requests` |
| `TalentProfileController` | employee | `/api/v1/employees/{id}/talent-profile` |
| `OrganizationController` | organization | `/api/v1/organization` |
| `CustomFieldController` | customfield | `/api/v1/custom-fields` |
| `SelfServiceController` | selfservice | `/api/v1/self-service` |
| `ImplicitRoleRuleController` | user | `/api/v1/implicit-role-rules` |
| `NotificationPreferencesController` | user | `/api/v1/notification-preferences` |
| `PermissionController` | user | `/api/v1/permissions` |
| `RoleController` | user | `/api/v1/roles` |
| `UserController` | user | `/api/v1/users` |
| `AttendanceController` | attendance | `/api/v1/attendance` |
| `BiometricDeviceController` | attendance | `/api/v1/biometric` |
| `CompOffController` | attendance | `/api/v1/comp-off` |
| `HolidayController` | attendance | `/api/v1/holidays` |
| `MobileAttendanceController` | attendance | `/api/v1/mobile/attendance` |
| `OfficeLocationController` | attendance | `/api/v1/office-locations` |
| `RestrictedHolidayController` | attendance | `/api/v1/restricted-holidays` |
| `TimeTrackingController` | timetracking | `/api/v1/time-tracking` |
| `ShiftManagementController` | shift | `/api/v1/shifts` |
| `ShiftSwapController` | shift | `/api/v1/shift-swaps` |
| `OvertimeManagementController` | overtime | `/api/v1/overtime` |
| `LeaveBalanceController` | leave | `/api/v1/leave-balances` |
| `LeaveRequestController` | leave | `/api/v1/leave-requests` |
| `LeaveTypeController` | leave | `/api/v1/leave-types` |
| `BonusController` | payroll | `/api/v1/payroll/bonus` |
| `GlobalPayrollController` | payroll | `/api/v1/global-payroll` |
| `PayrollController` | payroll | `/api/v1/payroll` |
| `PayrollStatutoryController` | payroll | `/api/v1/payroll/statutory` |
| `StatutoryFilingController` | payroll | `/api/v1/payroll/statutory-filings` |
| `CompensationController` | compensation | `/api/v1/compensation` |
| `LoanController` | loan | `/api/v1/loans` |
| `PaymentConfigController` | payment | `/api/v1/payments/config` |
| `PaymentController` | payment | `/api/v1/payments` |
| `PaymentWebhookController` | payment | `/api/v1/payments/webhooks` |
| `TaxDeclarationController` | tax | `/api/v1/tax-declarations` |
| `ESIController` | statutory | `/api/v1/statutory/esi` |
| `LWFController` | statutory | `/api/v1/payroll/lwf` |
| `ProfessionalTaxController` | statutory | `/api/v1/statutory/pt` |
| `ProvidentFundController` | statutory | `/api/v1/statutory/pf` |
| `StatutoryContributionController` | statutory | `/api/v1/statutory/contributions` |
| `TDSController` | statutory | `/api/v1/statutory/tds` |
| `BudgetPlanningController` | budget | `/api/v1/budget` |
| `BenefitEnhancedController` | benefits | `/api/v1/benefits-enhanced` |
| `BenefitManagementController` | benefits | `/api/v1/benefits` |
| `AssetManagementController` | asset | `/api/v1/assets` |
| `ExpenseAdvanceController` | expense | `/api/v1/expenses/advances` |
| `ExpenseCategoryController` | expense | `/api/v1/expenses/categories` |
| `ExpenseClaimController` | expense | `/api/v1/expenses` |
| `ExpenseItemController` | expense | `/api/v1/expenses/claims/{claimId}/items` |
| `ExpensePolicyController` | expense | `/api/v1/expenses/policies` |
| `ExpenseReportController` | expense | `/api/v1/expenses/reports` |
| `MileageController` | expense | `/api/v1/expenses/mileage` |
| `MileagePolicyController` | expense | `/api/v1/expenses/mileage/policies` |
| `OcrReceiptController` | expense | `/api/v1/expenses/receipts` |
| `TravelController` | travel | `/api/v1/travel` |
| `TravelExpenseController` | travel | `/api/v1/travel/expenses` |
| `ProjectController` | project | `/api/v1/projects` |
| `ProjectTimesheetController` | project | `/api/v1/project-timesheets` |
| `ResourceController` | project | `/api/v1/resources` |
| `PSAInvoiceController` | psa | `/api/v1/psa/invoices` |
| `PSAProjectController` | psa | `/api/v1/psa/projects` |
| `PSATimesheetController` | psa | `/api/v1/psa/timesheets` |
| `ResourceConflictController` | resourcemanagement | `/api/v1/resource-management/conflicts` |
| `ResourceManagementController` | resourcemanagement | `/api/v1/resource-management` |
| `ResourcePoolController` | resourcemanagement | `/api/v1/resource-pools` |

### NU-Hire — Recruitment, Onboarding, Contracts & E-Signature

| Controller | api package | Base path |
|---|---|---|
| `AgencyController` | recruitment | `/api/v1/recruitment/agencies` |
| `AIRecruitmentController` | recruitment | `/api/v1/recruitment/ai` |
| `ApplicantController` | recruitment | `/api/v1/recruitment/applicants` |
| `JobBoardController` | recruitment | `/api/v1/recruitment/job-boards` |
| `RecruitmentController` | recruitment | `/api/v1/recruitment` |
| `ScorecardController` | recruitment | `/api/v1/recruitment/scorecards` |
| `OnboardingManagementController` | onboarding | `/api/v1/onboarding` |
| `PreboardingController` | preboarding | `/api/v1/preboarding` |
| `ProbationController` | probation | `/api/v1/probation` |
| `ReferralController` | referral | `/api/v1/referrals` |
| `ExitManagementController` | exit | `/api/v1/exit` |
| `FnFController` | exit | `/api/v1/exit` |
| `OffboardingController` | exit | `/api/v1/offboarding` |
| `ESignatureController` | esignature | `/api/v1/esignature` |
| `LetterController` | letter | `/api/v1/letters` |
| `PublicCareerController` | publicapi | `/api/v1/public/careers` |
| `PublicOfferController` | publicapi | `/api/v1/public/offers` |
| `ContractController` | contract | `/api/v1/contracts` |
| `ContractTemplateController` | contract | `/api/v1/contracts/templates` |

### NU-Grow — Performance, Learning, Surveys, Engagement

| Controller | api package | Base path |
|---|---|---|
| `Feedback360Controller` | performance | `/api/v1/feedback360` |
| `FeedbackController` | performance | `/api/v1/feedback` |
| `GoalController` | performance | `/api/v1/goals` |
| `OkrController` | performance | `/api/v1/okr` |
| `PerformanceReviewController` | performance | `/api/v1/reviews` |
| `PerformanceRevolutionController` | performance | `/api/v1/performance/revolution` |
| `PIPController` | performance | `/api/v1/performance/pip` |
| `ReviewCycleController` | performance | `/api/v1/review-cycles` |
| `CourseEnrollmentController` | lms | `/api/v1/lms` |
| `LmsController` | lms | `/api/v1/lms` |
| `QuizController` | lms | `/api/v1/lms/quizzes` |
| `TrainingManagementController` | training | `/api/v1/training` |
| `SurveyAnalyticsController` | survey | `/api/v1/survey-analytics` |
| `SurveyManagementController` | survey | `/api/v1/survey-management` |
| `RecognitionController` | recognition | `/api/v1/recognition` |
| `OneOnOneMeetingController` | engagement | `/api/v1/meetings` |
| `PulseSurveyController` | engagement | `/api/v1/surveys` |
| `WellnessController` | wellness | `/api/v1/wellness` |

### NU-Fluence — Knowledge & Social

| Controller | api package | Base path |
|---|---|---|
| `BlogCategoryController` | knowledge | `/api/v1/knowledge/blogs/categories` |
| `BlogPostController` | knowledge | `/api/v1/knowledge/blogs` |
| `ContentEngagementController` | knowledge | `/api/v1/fluence/engagement` |
| `FluenceActivityController` | knowledge | `/api/v1/fluence/activities` |
| `FluenceAttachmentController` | knowledge | `/api/v1/fluence/attachments` |
| `FluenceChatController` | knowledge | `/api/v1/fluence/chat` |
| `FluenceCommentController` | knowledge | `/api/v1/fluence/comments` |
| `FluenceEditLockController` | knowledge | `/api/v1/fluence/edit-lock` |
| `FluenceSearchController` | knowledge | `/api/v1/fluence/search` |
| `KnowledgeSearchController` | knowledge | `/api/v1/knowledge/search` |
| `LinkedinPostController` | knowledge | `/api/v1/linkedin-posts` |
| `TemplateController` | knowledge | `/api/v1/knowledge/templates` |
| `WikiInlineCommentController` | knowledge | method-level |
| `WikiPageController` | knowledge | `/api/v1/knowledge/wiki/pages` |
| `WikiSpaceController` | knowledge | `/api/v1/knowledge/wiki/spaces` |
| `WallController` | wall | `/api/v1/wall` |

### Shared-Platform — Auth, Admin, Analytics, Comms, Integrations, Mobile

| Controller | api package | Base path |
|---|---|---|
| `AuthController` | auth | `/api/v1/auth` |
| `MfaController` | auth | `/api/v1/auth/mfa` |
| `SamlConfigController` | auth | `/api/v1/auth/saml` |
| `AdminController` | admin | `/api/v1/admin` |
| `EncryptionBackfillController` | admin | `/api/v1/admin/encryption-backfill` |
| `KafkaAdminController` | admin | `/api/v1/admin/kafka` |
| `SystemAdminController` | admin | `/api/v1/admin/system` |
| `SystemAuditLogController` | admin | `/api/v1/admin/system/audit-logs` |
| `PlatformController` | platform | `/api/v1/platform` |
| `RootProbeController` | platform | method-level |
| `TenantController` | platform | `/api/v1/tenants` |
| `FeatureFlagController` | featureflag | `/api/v1/admin/feature-flags` |
| `MonitoringController` | monitoring | `/api/monitoring` |
| `DataMigrationController` | migration | `/api/v1/migration` |
| `KekaImportController` | dataimport | `/api/v1/keka-import` |
| `ComplianceController` | compliance | `/api/v1/compliance` |
| `DsrAdminFulfillmentController` | compliance | `/api/v1/admin/dsr` |
| `DsrController` | compliance | `/api/v1/me/dsr` |
| `AuditLogController` | audit | method-level |
| `ApprovalEscalationController` | workflow | `/api/v1/escalation` |
| `ApprovalsController` | workflow | `/api/v1/approvals` |
| `WorkflowController` | workflow | `/api/v1/workflow` |
| `AdvancedAnalyticsController` | analytics | `/api/v1/analytics/advanced` |
| `AnalyticsController` | analytics | `/api/v1/analytics` |
| `DashboardsController` | analytics | `/api/v1/dashboards` |
| `OrganizationHealthController` | analytics | `/api/v1/analytics/org-health` |
| `PredictiveAnalyticsController` | analytics | `/api/v1/predictive-analytics` |
| `ScheduledReportController` | analytics | `/api/v1/scheduled-reports` |
| `DashboardController` | dashboard | `/api/v1/dashboard` |
| `CustomReportController` | report | `/api/v1/reports/custom` |
| `ReportController` | report | `/api/v1/reports` |
| `HomeController` | home | `/api/v1/home` |
| `MultiChannelNotificationController` | notification | `/api/v1/notifications` |
| `NotificationController` | notification | `/api/v1/notifications` |
| `SmsNotificationController` | notification | `/api/v1/notifications/sms` |
| `AnnouncementController` | announcement | `/api/v1/announcements` |
| `MeetingController` | meeting | `/api/v1/one-on-one` |
| `CalendarController` | calendar | `/api/v1/calendar` |
| `HelpdeskController` | helpdesk | `/api/v1/helpdesk` |
| `HelpdeskSLAController` | helpdesk | `/api/v1/helpdesk/sla` |
| `DocuSignController` | integration | `/api/v1/integrations/docusign` |
| `IntegrationConnectorController` | integration | `/api/v1/integrations` |
| `IntegrationController` | integration | `/api/v1/integrations` |
| `SlackCommandController` | integration | `/api/v1/integrations/slack` |
| `WebhookController` | webhook | `/api/webhooks` |
| `WebhookRotationController` | webhook | `/api/v1/admin/webhooks` |
| `MobileApprovalController` | mobile | `/api/v1/mobile/approvals` |
| `MobileDashboardController` | mobile | `/api/v1/mobile/dashboard` |
| `MobileLeaveController` | mobile | `/api/v1/mobile/leave` |
| `MobileNotificationController` | mobile | `/api/v1/mobile/notifications` |
| `MobileSyncController` | mobile | `/api/v1/mobile/sync` |
| `FileUploadController` | document | `/api/v1/files` |
| `ExportController` | export | `/api/v1/export` |
| `ContentViewController` | common | `/api/v1/views` |
| `ApiKeyController` | *common/security* (non-`api`) | `/api/v1/admin/api-keys` |
| `WebSocketNotificationController` | *domain/notification* (non-`api`) | `/api/ws-notifications` |

## Notes

- **Disabled controller (excluded from count):**
  `api/recruitment/controller/RecruitmentManagementController.java.disabled` exists on disk
  but carries the `.disabled` extension, so it is not compiled and its endpoints are not
  live. It is excluded from the 180-controller count and from every table above.
- **Two controllers outside `api/`:** `ApiKeyController` lives in `common/security` and
  `WebSocketNotificationController` lives in `domain/notification`. Both are genuine
  `@RestController` classes and are counted in the 180; they are grouped under
  [[Shared-Platform]] (admin API-key management and the WebSocket notification handler,
  respectively).
- **Inferred sub-app mappings (not explicit in the [[APIs]] Domain Map):**
  - `engagement` (`OneOnOneMeetingController`, `PulseSurveyController`) → [[Nu-Grow]],
    consistent with the Domain Map listing `engagement` under "Performance/Learning".
  - `common` (`ContentViewController`, `/api/v1/views`) → [[Shared-Platform]] as a generic
    cross-cutting view-tracking endpoint.
  - `contract` / `letter` / `esignature` → [[Nu-Hire]], following the Domain Map's
    "Recruitment/Onboarding" grouping (`api/esignature`, `api/letter` are listed there).
- **Dual / overlapping base paths are intentional and preserved here:**
  `ExitManagementController` and `FnFController` both map `/api/v1/exit`; `NotificationController`
  and `MultiChannelNotificationController` both map `/api/v1/notifications`;
  `IntegrationController` and `IntegrationConnectorController` both map `/api/v1/integrations`;
  `LmsController` and `CourseEnrollmentController` both map `/api/v1/lms`. They split the
  surface by method-level paths — see [[APIs]] for endpoint-level detail.
- **`method-level` base paths:** `AuditLogController` (`/api/v1/audit` + `/api/v1/audit-logs`,
  set per-method — see [[APIs]]), `WikiInlineCommentController`, and `RootProbeController`
  (`/`, GET/HEAD liveness) declare no class-level `@RequestMapping`.
- **Re-verify the count:**
  `grep -rlE '^\s*@RestController\s*(\(|$)' backend/src/main/java/com/nulogic --include='*.java' | wc -l`
  should return **180**. The naive `grep -rl '@RestController' … | wc -l` returns 184 (it
  also matches the `.disabled` file and 3 non-controllers — see [Counts](#counts)).

## Related Links

- [[APIs]] — curated endpoint-level catalog (the depth companion to this breadth index)
- [[Services]] — service layer behind these controllers · [[Middleware]] — request filter chain
- [[Roles]] · [[Permissions]] — authorization model
- [[Nu-HRMS]] · [[Nu-Hire]] · [[Nu-Grow]] · [[Nu-Fluence]] · [[Shared-Platform]]
- [[00-Home]]
