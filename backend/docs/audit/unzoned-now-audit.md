# Unzoned now() Audit — Roadmap

> **Auditor:** Aux-UnzonedNowAudit (read-only sibling agent, Wave parallel to S12-B).
> **Scope:** `backend/src/main/java/`.
> **Date:** 2026-05-14.
> **Status of S12-B:** 28 sites being migrated to `TenantTimeService` in flight by 11 sibling agents — *not* covered in the tables below (those are already accounted for in MEMORY.md).

This document maps the **remainder** of the ~785-site follow-up so it can be sprint-batched.

## Summary

| Pattern | Total occurrences |
|---|---:|
| `LocalDateTime.now()` (zero-arg, JVM zone) | 472 |
| `LocalDate.now()` (zero-arg, JVM zone) | 309 |
| `Instant.now()` (UTC, generally acceptable) | 34 |
| `LocalDateTime.now(ZoneId.of("Asia/Kolkata"))` / `LocalDate.now(...)` / `Year.now(...)` (hardcoded IST) | 24 |
| `new java.util.Date()` (legacy) | 5 |
| `System.currentTimeMillis()` (often acceptable) | 57 |
| Hardcoded `"Asia/Kolkata"` string literals (incl. defaults & comments) | 29 |
| **GRAND TOTAL (all patterns)** | **913** |

Cross-checking against the MEMORY.md figure of ~785 sites, the gap (913 vs 785) is because that estimate counted only `LocalDate.now()` + `LocalDateTime.now()` (which sum to 781 here — close to 785). The audit numbers are a few sites higher because S12-B and earlier waves have been removing them on a rolling basis and a few have been added back by feature work. Use this count as the live baseline.

**Classification (whole codebase, excluding the 28 S12-B in-flight):**

| Severity | Approx count | Definition |
|---|---:|---|
| **P0** — business-decision time read | **~145** | Drives cutoffs, accrual, SLA, payroll dates, deadlines, "today" math, scheduler tick comparisons |
| **P1** — user-visible audit/timestamp | **~510** | Created/updated/approved/reviewed/published timestamps on domain entities. Currently coherent because JVM=Asia/Kolkata, but breaks for cross-region tenants once we leave IST |
| **P2** — logs / diagnostics / harmless | **~230** | Exception responses, health checks, biometric heartbeat probes, metric tickers, file-name suffixes |
| **Already migrated (S12-B in flight)** | 28 | Tracked by sibling agents |

Numbers are bucketed by automated pattern + manual sampling; final classification per site requires the implementing engineer to confirm the surrounding business intent.

---

## P0 — must migrate (business decisions)

Grouped by module; each row cites the canonical site. Where a file is the same hotspot, a single row covers it.

### Payroll & Statutory

| File | Line | Pattern | Justification |
|---|---:|---|---|
| `application/payroll/service/GlobalPayrollService.java` | 312 | `LocalDateTime.now()` → `setProcessedAt` | Payroll run timestamp — cross-tenant payroll could span a midnight crossover in tenant zone |
| `application/payroll/service/GlobalPayrollService.java` | 338 | `LocalDateTime.now()` → `setApprovedAt` | Same; payroll approval cutoff |
| `application/payroll/service/PayslipService.java` | 198 | `LocalDateTime.now()` → `setStatutoryCalculatedAt` | Statutory deduction calc timestamp determines period |
| `application/payroll/listener/PayrollIntegrationListener.java` | 88 | `LocalDate.now(ZoneId.of("Asia/Kolkata"))` → `effectiveDate` | Hardcoded IST — must use `TenantTimeService.today(tenantId)` |
| `application/payroll/service/StatutoryDeductionService.java` | 120 | `LocalDate.now(ZoneId.of("Asia/Kolkata"))` | Statutory month/year boundary; hardcoded IST |
| `application/payroll/service/PayslipPdfService.java` | 299 | `LocalDate.now(ZoneId.of("Asia/Kolkata"))` → PDF "Generated on" | User-facing payslip date; tenant-local |
| `domain/payroll/PayrollRun.java` | 84, 107 | `LocalDateTime.now()` → processedAt/approvedAt setters | Domain entity drives downstream period filters |
| `domain/payroll/PayrollAdjustment.java` | 79 | `LocalDateTime.now()` → processedAt | Adjustment effective period |
| `domain/payroll/StatutoryFilingRun.java` | 98, 119 | `LocalDateTime.now()` → generatedAt/submittedAt | Statutory filing window |
| `application/statutory/service/StatutoryService.java` | 82, 117 | `LocalDateTime.now()` → submittedAt/approvedAt | PF/ESI/PT period claims |
| `application/statutory/service/LWFService.java` | 163 | `LocalDate.now()` → `setEffectiveTo` | LWF config effective-to closes the prior config; tenant-local |
| `api/payroll/controller/GlobalPayrollController.java` | 84, 95 | `LocalDate.now()` default for `effectiveDate` query param | Tenant-local "today" |
| `api/payroll/controller/PayrollController.java` | 450 | `LocalDate.now()` | Tenant-local "today" |
| `api/payroll/controller/PayrollStatutoryController.java` | 77 | `LocalDate.now()` | Tenant-local "today" |
| `application/tax/service/TaxDeclarationService.java` | 100, 120, 136, 225 | `LocalDateTime.now()` → submitted/approved/rejected/verified | Tax assessment year & section 80 windows |

### Attendance, Shift, Overtime, CompOff

| File | Line | Pattern | Justification |
|---|---:|---|---|
| `application/attendance/scheduler/AutoRegularizationScheduler.java` | 116 | `LocalDate.now(ZoneId.of("Asia/Kolkata"))` minus N days | Scheduled job tick — must be tenant-zone today |
| `application/attendance/service/AttendanceRecordService.java` | 88, 184, 290, 291, 320, 321, 681, 695 | hardcoded IST `LocalDateTime.now(ZoneId.of("Asia/Kolkata"))` | Check-in/out, today-attendance lookup; hardcoded IST — migrate |
| `application/attendance/service/AttendanceImportService.java` | 100 | `LocalDate.now(ZoneId.of("Asia/Kolkata"))` | Import sample row "today"; hardcoded IST |
| `application/attendance/service/AttendanceImportService.java` | 137 | `LocalDateTime.now()` for batch id stamp | Batch ID embeds date — if midnight crossover, deterministic ID drifts |
| `application/attendance/service/CompOffService.java` | 126, 153, 206 | `LocalDateTime.now()` → reviewedAt | Approval timestamp drives lookback windows on the same service |
| `application/attendance/service/CompOffService.java` | 190, 197, 230 | `LocalDate.now(ZoneId.of("Asia/Kolkata"))` (& `Year.now(IST)`) | Auto-approve cutoff, 6-month lookback, fiscal-year — all hardcoded IST |
| `application/attendance/service/RestrictedHolidayService.java` | 210, 238, 265 | `LocalDateTime.now()` → setApprovedAt | Year-bounded counter |
| `api/attendance/controller/AttendanceController.java` | 71, 94, 124, 151, 174, 191, 229, 243 | `LocalDateTime.now()` / `LocalDate.now()` | Check-in fallback + date defaults — must be tenant-zone |
| `application/shift/service/ShiftSwapService.java` | 70, 93, 98, 101, 124, 143, 149, 166 | `LocalDateTime.now()` → requestedAt/acceptedAt/etc | Shift-swap deadline math |
| `application/overtime/service/OvertimeManagementService.java` | 128, 143 | `LocalDateTime.now()` → approvedAt/rejectedAt | Overtime calc period |
| `application/overtime/service/OvertimeManagementService.java` | 213, 228, 241, 273 | `LocalDate.now().getYear()` for fiscal year & transaction date | Fiscal year boundary at midnight tenant-zone |
| `domain/overtime/OvertimeRequest.java` | 110, 117 | `LocalDateTime.now()` | Approval audit time |
| `domain/overtime/CompTimeBalance.java` | 64, 74 | `LocalDateTime.now()` | Balance ledger time |
| `domain/overtime/CompTimeTransaction.java` | 62, 64 | `LocalDate.now()`, `LocalDateTime.now()` | Ledger txn date — fiscal year impact |

### Leave & Holiday

| File | Line | Pattern | Justification |
|---|---:|---|---|
| `application/leave/service/LeaveBalanceService.java` | 159, 171, 192, 211, 226, 235 | `Year.now(ZoneId.of("Asia/Kolkata"))` (TODO comments already exist) | Leave-year boundary; the TODOs explicitly point to `tenantTimeService.today(tenantId).getYear()` |
| `domain/leave/LeaveRequest.java` | 72, 102, 112, 121 | `LocalDateTime.now()` → applied/approved/cancelled | Calendar-day boundaries for leave application windows |
| `domain/leave/LeaveBalance.java` | 120 | `LocalDate.now()` → `setLastAccrualDate` | Accrual cron tick — must be tenant-local today |

### Workflow / Approval Escalation

| File | Line | Pattern | Justification |
|---|---:|---|---|
| `application/workflow/scheduler/WorkflowEscalationScheduler.java` | 184, 197 | `LocalDateTime.now()` → step.setExecutedAt during escalation | Escalation cron compares deadline; midnight skew misses tickets |
| `application/workflow/scheduler/ApprovalEscalationJob.java` | 196 | `LocalDateTime.now()` → `assignedAt` of escalation step | Same cron |
| `application/workflow/service/ApprovalEscalationService.java` | 230, 243 | `LocalDateTime.now()` | Same |
| `domain/workflow/StepExecution.java` | 96, 106, 116, 126, 137, 144, **156** | `LocalDateTime.now()` (line 156 is `isAfter(deadline)` — direct comparison) | **Line 156 is the canonical "is this step overdue" check** — driftable |
| `domain/workflow/WorkflowExecution.java` | 96, 133, 139, 144 | `LocalDateTime.now()` | Execution submission window |
| `domain/workflow/WorkflowRule.java` | 116 | `LocalDateTime.now()` | Time-bounded rule predicate |
| `domain/workflow/ApprovalDelegate.java` | 117 | `LocalDateTime.now()` → revokedAt | Delegate validity window |

### Compliance / GDPR DSR

| File | Line | Pattern | Justification |
|---|---:|---|---|
| `application/compliance/service/ComplianceService.java` | 80, 143, 149, 269, 342, 348, 525, 526, 532, 539 | `LocalDate.now()` repeated; `policy.setApprovedAt(LocalDate.now())`, "find overdue", "expiring in 30d" | Every "active/overdue/expiring" filter uses unzoned today — primary compliance reporting bug surface for non-IST tenants |
| `application/compliance/service/ComplianceService.java` | 183, 366, 565 | `LocalDateTime.now()` | Audit-activity 7-day window, acknowledgedAt, auditLog.setTimestamp |
| `application/compliance/service/DsrExportService.java` | 205, 252, 293 | `LocalDate.now()` / `LocalDateTime.now()` | DSR generated-at stamp shown to data subject (GDPR Art. 15) — must reflect tenant zone |
| `application/compliance/service/DsrErasureService.java` | 418 | `LocalDateTime.now()` | GDPR Art. 17 fulfilment receipt timestamp |
| `application/compliance/service/UserAnonymizer.java` | 153 | `LocalDateTime.now()` → setAnonymizedAt | Right-to-be-forgotten audit time |
| `domain/compliance/DsrRequest.java` | 104, 118, 128 | `LocalDateTime.now()` | DSR SLA clock (30-day statutory window) |
| `domain/compliance/AuditLog.java` | 72 | `LocalDateTime.now()` | Audit log timestamp |

### Probation / Exit / Onboarding / Referral

| File | Line | Pattern | Justification |
|---|---:|---|---|
| `application/probation/service/ProbationService.java` | 289, 353, 362, 372, 381 | `LocalDate.now()` for evaluation/overdue/upcoming | Probation period boundary math |
| `domain/probation/ProbationPeriod.java` | 106, 116, 123, 129, 135 | `LocalDate.now()` confirmation/termination + isOverdue/isDueEval | Domain predicates |
| `application/exit/service/FnFCalculationService.java` | 111, 137, 144 | `LocalDate.now()` → settlement.setApprovalDate; activeContract lookup | F&F settlement amount depends on date — affects final pay |
| `application/exit/service/ExitManagementService.java` | 517, 530, 591, 715, 769, 818 | `LocalDate.now()` — approval/payment/actualReturn/verification dates | F&F dates, asset-return, exit-interview SLA |
| `application/referral/service/ReferralService.java` | 88, 149, 150, 151, 153, 158, 160, 191, 196, 225 | `LocalDate.now()` for stage-transition dates + `bonusEligibleDate = now().plusMonths(...)` | Referral bonus eligibility math |
| `application/onboarding/service/...` | (5 sites — `application/onboarding`) | `LocalDate.now()` | Onboarding milestone dates |

### SLA / Helpdesk

| File | Line | Pattern | Justification |
|---|---:|---|---|
| `application/helpdesk/service/HelpdeskSLAService.java` | 39, 48, 102, 131, 181, 205, 235, 246, 247, 257, 267 | `LocalDateTime.now()` on SLA, escalation, metrics, CSAT | SLA breach decisions — drift by even a few hours fires false breaches |
| `api/helpdesk/controller/HelpdeskSLAController.java` | 42, 98 | `LocalDateTime.now()` | SLA created/updated |

### Notification scheduling

| File | Line | Pattern | Justification |
|---|---:|---|---|
| `application/notification/service/ScheduledNotificationService.java` | 84, 203, 361, 415 | `LocalDate.now()` "today" inside scheduler | Birthday/anniversary reminders fire on wrong day for non-IST tenants |
| `application/notification/service/EmailSchedulerService.java` | 44, 91 | `LocalDate.now()` | Email scheduler tick |
| `application/notification/service/MultiChannelNotificationService.java` | 183 | `LocalDateTime.now()` (compared to scheduledAt) | Delivery cron tick |
| `application/notification/service/SlackNotificationService.java` | 385, 397, 408 | `LocalDate.now()` formatted into Slack message | User-visible date in IM |
| `application/integration/service/SlackCommandService.java` | 238 | `LocalDate.now().plusDays(1)` | "Tomorrow" needs tenant-local today |

### Contract / Performance / Resource Management

| File | Line | Pattern | Justification |
|---|---:|---|---|
| `application/contract/scheduler/ContractLifecycleScheduler.java` | 321, 343 | `LocalDateTime.now()` → reminder.setNotifiedAt | Contract-renewal cron |
| `application/performance/service/OkrService.java` | 238 | `LocalDateTime.now()` for checkInDate | Cycle boundary |
| `application/performance/service/Feedback360Service.java` | 45 | `LocalDateTime.now()` cycle.setCreatedAt | Cycle window |
| `application/resourcemanagement/service/WorkloadAnalyticsService.java` | 303-304, 330-331, 362 | `LocalDate.now()` defaults for period filters | Workload "as-of" date |
| `api/resourcemanagement/ResourceManagementController.java` | 40, 50, 59, 72, 81 | `LocalDate.now()` defaults | Same |
| `application/letter/service/LetterService.java` | 208, 274, 438, 558, 607, 608, 636, 834, 886, 888 | `LocalDate.now()` — offer-letter date, year prefix, template vars | Offer-letter currentDate visible to candidate |

### Analytics dashboards (date-bucket math)

| File | Line | Pattern | Justification |
|---|---:|---|---|
| `application/analytics/service/ManagerDashboardService.java` | 71, 434 | `LocalDate.now()` | "Today's headcount" |
| `application/analytics/service/DashboardAnalyticsService.java` | 59, 244, 338, 418 | `LocalDate.now()` | Dashboard period boundaries |
| `application/analytics/service/ScheduledReportExecutionJob.java` | 172, 228, 314 | `LocalDate.now()` | Scheduled report cron — period boundary |
| `application/analytics/service/ScheduledReportService.java` | 232 | `LocalDate.now()` | Same |
| `application/analytics/service/AdvancedAnalyticsService.java` | 92-95, 108 | `LocalDate.now()` — startOfMonth/Year/Quarter | Fiscal-period boundary calc |

**P0 module summary (~145 sites total across the above tables and their siblings).**

---

## P1 — should migrate (user-visible timestamps)

These are domain-entity `createdAt`/`updatedAt`/`publishedAt`/`viewedAt` setters. They're consistent today because JVM is IST and tenants are IST, but they will display the wrong calendar date to users in non-IST tenants the moment we expand. They don't drive business logic, so they're sprint-2 priority.

Highest-density modules (full enumeration would balloon the doc):

| Module | Hot files | Approx sites |
|---|---|---:|
| `application/performance/service/` | `OkrService.java`, `Feedback360Service.java`, `ReviewService.java` | ~31 |
| `application/lms/service/` | `LmsService.java`, `QuizManagementService.java`, `QuizAssessmentService.java` | ~26 |
| `application/knowledge/service/` | `BlogPostService.java`, `WikiPageService.java`, `WikiSpaceService.java`, `WikiInlineCommentService.java`, `SpacePermissionService.java` | ~11 |
| `application/recruitment/service/` | `ApplicantService.java`, `ScorecardService.java`, `AgencyService.java`, `JobBoardIntegrationService.java` | ~9 |
| `application/document/service/` | `DocumentWorkflowService.java`, `DocumentVersionService.java` | ~12 |
| `application/esignature/service/` | `ESignEnvelopeService.java` | ~12 |
| `application/engagement/service/` | (recognition, kudos) | ~8 |
| `application/recognition/`, `application/announcement/`, `application/survey/`, `application/wellness/` | various | ~25 combined |
| `application/employee/service/` | `EmployeeOnboardingService.java`, `EmployeeProfileService.java` | ~8 |
| `application/user/service/` | `NotificationPreferencesService.java` | ~4 |
| `application/report/service/` | `CustomReportService.java` | ~7 |
| `application/auth/service/` | `LoginAuditService.java`, password-history setters | ~7 |
| `application/calendar/service/` | calendar event creation timestamps | ~4 |
| `application/project/`, `application/budget/`, `application/expense/`, `application/event/`, `application/loan/`, `application/travel/`, `application/benefits/`, `application/compensation/`, `application/training/` | feature CRUD | ~50 combined |
| `domain/*` entity setters (createdAt/updatedAt patterns outside the P0 hotspots above) | broad | ~80 |
| `api/integration/controller/DocuSignController.java`, `IntegrationController.java`, `api/performance/controller/*Controller.java` | controllers patching `updatedAt` directly | ~17 |

**Representative cite per row:**
- `application/lms/service/LmsService.java:40` — `course.setCreatedAt(LocalDateTime.now())`
- `application/knowledge/service/WikiPageService.java:113` — `page.setLastViewedAt(LocalDateTime.now())`
- `application/performance/service/OkrService.java:45` — `objective.setCreatedAt(LocalDateTime.now())`
- `application/recruitment/service/ApplicantService.java:95` — `applicant.setCurrentStageEnteredAt(LocalDateTime.now())`
- `application/document/service/DocumentWorkflowService.java:128` — `workflow.setCompletedAt(LocalDateTime.now())`
- `application/engagement/service/RecognitionService.java:*` — kudos `createdAt`
- `api/performance/controller/OkrController.java:202, 227, 252, 359, 389` — `existing.setUpdatedAt(LocalDateTime.now())`

**P1 module summary (~510 sites total).** Most are mechanically refactorable: inject `TenantTimeService`, replace `LocalDateTime.now()` with `tenantTimeService.now(tenantId)`. The cost is largely the constructor-wiring churn across services + entities (where `@PrePersist` can't easily inject a Spring bean → use a JPA `EntityListener` or a small `TimeProvider` static-holder seam).

---

## P2 — leave (logs / diagnostics / harmless)

Server-zone is fine because (a) the value is never compared to tenant-local data, or (b) it's a heartbeat/probe that just needs monotonic-ish behaviour.

| File | Line | Pattern | Why leave |
|---|---:|---|---|
| `common/exception/GlobalExceptionHandler.java` | 85 | `LocalDateTime.now()` in error response body | Diagnostic only |
| `common/health/WebhookHealthIndicator.java` | (single site) | `LocalDateTime.now()` | Health probe |
| `common/entity/BaseEntity.java` | 67 | `this.deletedAt = LocalDateTime.now()` | Tombstone; never user-facing |
| `common/security/ApiKey.java` | (multi) | `LocalDateTime.now()` | API-key audit; server-zone is fine |
| `domain/attendance/BiometricApiKey.java` | 63, 71 | `LocalDateTime.now()` | Heartbeat / `expiresAt.isBefore(...)`; comparing two server-zone instants is safe |
| `domain/attendance/BiometricDevice.java` | 84, 88, 92 | `LocalDateTime.now()` | `lastSyncAt`, `lastHeartbeatAt` |
| `domain/attendance/BiometricPunchLog.java` | 71, 78, 83 | `LocalDateTime.now()` | `processedAt` of ingest pipeline — comparison is server-zone-internal |
| `application/audit/service/AuditLogService.java` | 320 | `LocalDateTime now = LocalDateTime.now()` | Audit table timestamps — diagnostic |
| `infrastructure/kafka/*` | 9 sites | `LocalDateTime.now()` | Producer/consumer logs |
| `infrastructure/payment/*` | 4 sites | `LocalDateTime.now()` | Provider call tracing |
| `common/export/ExportService.java` | (single) | `LocalDateTime.now()` for export filename suffix | Filename uniqueness only |
| `application/migration/*` | 2 sites | `LocalDateTime.now()` | One-shot migration tooling |
| All `System.currentTimeMillis()` (57 sites) | — | — | These are timing/duration measurements, rate-limit windows, cache TTL math; correct usage |
| All `Instant.now()` (34 sites) | — | — | `Instant` is UTC by definition; safe |
| `new java.util.Date()` (5 sites) | — | — | All in serialization/legacy adapters; flag but low risk |

**P2 module summary (~230 sites total). No action recommended.**

---

## Suggested next sprints

Each batch is sized around a single agent-sprint (~25–40 sites with shared mechanical refactor).

### Sprint S13-A — Payroll, Statutory, Tax (~25 sites)
- `application/payroll/**` (services, listener, scheduler) + `domain/payroll/**`
- `application/statutory/**`, `application/tax/**`
- `api/payroll/controller/**`
- Acceptance: all `LocalDate.now()` and `LocalDateTime.now()` in these packages routed through `TenantTimeService`; integration tests for cross-zone (set JVM zone = UTC, tenant zone = IST → identical results).

### Sprint S13-B — Attendance, Shift, Overtime, CompOff (~35 sites)
- Replace the existing hardcoded `ZoneId.of("Asia/Kolkata")` in `AttendanceRecordService`, `CompOffService`, `AutoRegularizationScheduler` with `tenantTimeService.now(tenantId)` / `today(tenantId)`.
- `application/shift/**`, `application/overtime/**`, `domain/overtime/**`.
- Acceptance: kill all `Asia/Kolkata` literals in these packages; biometric-device clocks remain server-zone (P2).

### Sprint S13-C — Leave & Workflow Escalation (~20 sites)
- `application/leave/service/LeaveBalanceService.java` — implement the existing TODOs (lines 159, 171, 192, 211, 226, 235) using `tenantTimeService.today(tenantId).getYear()`.
- `domain/leave/LeaveRequest.java`, `LeaveBalance.java`.
- `application/workflow/scheduler/**`, `application/workflow/service/ApprovalEscalationService.java`, `domain/workflow/StepExecution.java` (especially line 156's `isAfter(deadline)` check).
- Acceptance: leave-year boundary tests pass for a tenant in `Pacific/Auckland`.

### Sprint S13-D — Compliance & GDPR DSR (~25 sites)
- `application/compliance/service/ComplianceService.java` (10+ sites — all the "active / overdue / expiring" filters).
- `DsrExportService.java`, `DsrErasureService.java`, `UserAnonymizer.java`, `domain/compliance/DsrRequest.java`, `domain/compliance/AuditLog.java`.
- Acceptance: DSR receipts show tenant-local generation time; "overdue policies" report respects tenant fiscal year.

### Sprint S13-E — Probation, Exit, Referral, Onboarding (~25 sites)
- `application/probation/**`, `domain/probation/ProbationPeriod.java`.
- `application/exit/service/FnFCalculationService.java`, `ExitManagementService.java`.
- `application/referral/service/ReferralService.java` (10 sites — referral bonus eligibility math).
- `application/onboarding/**`.
- Acceptance: F&F approval/payment dates display in tenant zone.

### Sprint S13-F — SLA / Helpdesk / Scheduled Notifications (~25 sites)
- `application/helpdesk/service/HelpdeskSLAService.java` (11 sites), `api/helpdesk/controller/HelpdeskSLAController.java`.
- `application/notification/service/ScheduledNotificationService.java`, `EmailSchedulerService.java`, `MultiChannelNotificationService.java`, `SlackNotificationService.java`.
- `application/integration/service/SlackCommandService.java`.
- Acceptance: birthday/anniversary reminders fire on correct tenant-local day.

### Sprint S13-G — Contract / Letter / Analytics period math (~30 sites)
- `application/contract/scheduler/ContractLifecycleScheduler.java`.
- `application/letter/service/LetterService.java` (10 sites including offer-letter template currentDate).
- `application/analytics/service/**` (~20 sites in dashboards & scheduled reports — but only `LocalDate.now()` "today" comparisons; created/updated stamps go in P1 batches).
- `application/resourcemanagement/**`, `api/resourcemanagement/**`.

### Sprint S13-H — Performance, LMS, Knowledge (P1) (~70 sites)
- `application/performance/service/**` (OKRs, 360 feedback, reviews).
- `application/lms/service/**` (courses, quizzes, enrolments).
- `application/knowledge/service/**` (wiki, blogs, comments).
- Bulk mechanical refactor; lower risk because they're entity-stamp setters.

### Sprint S13-I — Recruitment, Document, e-Signature (P1) (~33 sites)
- `application/recruitment/service/**`, `application/document/service/**`, `application/esignature/service/**`.

### Sprint S13-J — Long-tail P1 sweep (~120 sites)
- Everything else under `application/**/service/**` + `domain/**` entity setters.
- Including the controllers that hand-set `updatedAt` directly (`api/performance/controller/OkrController.java`, `DocuSignController.java`, `IntegrationController.java`, `Feedback360Controller.java`).
- Strategy: add a JPA `@EntityListener` or `AbstractAuditable` base class that calls `TenantTimeService` from a Spring-managed listener so individual entity `@PrePersist` methods stop needing to do it.

### Sprint S13-K — P2 review (deferred)
- Skim the P2 list to confirm classification.
- Optionally migrate `BaseEntity.deletedAt` (line 67) for consistency, but no business impact.

---

## Implementation notes

1. **Entity setter problem.** JPA entities can't easily inject Spring beans into `@PrePersist`/`@PreUpdate` hooks. Two options:
   - **Option A (preferred):** introduce `com.nulogic.common.util.TimeProvider` — a thin static-holder seam wired by Spring at startup. Entities call `TimeProvider.nowFor(tenantId)`; service code calls `TenantTimeService` directly.
   - **Option B:** route all entity creation through service-layer factories that pre-populate timestamps. More invasive.

2. **Tenant ID availability.** In schedulers, the tenant loop is explicit. In service-layer code, `TenantContext.getTenantId()` (existing ThreadLocal) provides it. In entity `@PrePersist` callbacks, the listener must read it from `TenantContext` because the entity may not carry the tenant FK directly.

3. **Fallback.** `TenantTimeService` already returns `Asia/Kolkata` on null/missing/unparseable tenant. Existing IST behaviour is preserved.

4. **Test strategy per sprint.**
   - Add a single integration-test profile that sets `-Duser.timezone=UTC` and a single test tenant with `timezone='America/Los_Angeles'`.
   - Run the module's existing tests; any failure flags a residual unzoned site.

5. **S12-B coverage.** The 28 sites already in flight cover the most exposed payroll + leave + compliance hot rows. This roadmap excludes them — coordinate with the controller agent before starting S13-A to avoid double-edits.

---

## Appendix — raw counts cross-check

```
backend/src/main/java$ grep -rn 'LocalDateTime\.now()' --include='*.java' | wc -l   →  472
backend/src/main/java$ grep -rn 'LocalDate\.now()' --include='*.java' | wc -l       →  309
backend/src/main/java$ grep -rn 'Instant\.now()'   --include='*.java' | wc -l       →   34
backend/src/main/java$ grep -rn 'new Date()'       --include='*.java' | wc -l       →    5
backend/src/main/java$ grep -rn 'System\.currentTimeMillis()' --include='*.java' | wc -l → 57
backend/src/main/java$ grep -rn 'Asia/Kolkata'     --include='*.java' | wc -l       →   29
backend/src/main/java$ grep -rn 'TenantTimeService' --include='*.java' | wc -l      →   86  (existing migration uptake)
```
