# R4 Feature Completeness Audit — Green-Flag Gate

**Date:** 2026-06-21  
**Scope:** Backend stubs, frontend dead-ends, validation gaps, carry-over items DEV-8 and UI-03  
**Methodology:** Code-only evidence — file:line citations throughout

---

## Summary

| Priority | Count | Description |
|----------|-------|-------------|
| P0 | 4 | Blocks core HR/payroll flow for the India target market |
| P1 | 6 | Degrades a named feature; users see errors or silent failures |
| P2 | 4 | Cosmetic / minor data gap, no production risk |

---

## Carry-Over Items — Current State

### DEV-8: LWF `calculateForPayrollRun`

**Current state: STILL A STUB — throws `UnsupportedOperationException` when called.**

File: `backend/src/main/java/com/nulogic/application/statutory/service/LWFService.java:296-300`

```java
public List<LWFDeduction> calculateForPayrollRun(LWFCalculationRequest request) {
    if (!lwfEnabled) {
        throw new UnsupportedOperationException(
                "Labor Welfare Fund computation not implemented — IN payroll cannot run safely...");
    }
```

The feature flag `app.features.lwf` defaults to `false` (line 76–77). When `false`, every call to `POST /api/v1/payroll/lwf/calculate` returns HTTP 501. The controller at `backend/src/main/java/com/nulogic/api/statutory/controller/LWFController.java:139` calls the service directly with no alternate path. India-target payroll runs that include LWF deductions will 501 until the flag is flipped and the per-employee deduction iteration is implemented. This is classified **P0** because IN is the primary market.

### UI-03: Leave-approval notification to employee

**Current state: IMPLEMENTED AND WIRED — not a bug.**

File: `backend/src/main/java/com/nulogic/application/leave/service/LeaveRequestService.java:232`

```java
// afterCommit() block — runs after transaction commits
notifyLeaveApproved(saved);
publishLeaveApprovedEvent(saved, tenantId, approverId, daysToDeduct);
```

`notifyLeaveApproved` (line 679–694) calls `webSocketNotificationService.notifyLeaveApproved(...)` which sends a WebSocket push to the employee's user ID. The same path runs for workflow-triggered approvals at line 535. UI-03 is **closed** — notification delivery is wired correctly.

---

## Findings Table

| ID | Priority | Module | What's Incomplete | Evidence (file:line) | Impact | Suggested Fix |
|----|----------|--------|--------------------|----------------------|--------|---------------|
| F-001 | P0 | Payroll / LWF | `LWFService.calculateForPayrollRun` throws `UnsupportedOperationException` when `app.features.lwf=false` (default). Every `POST /api/v1/payroll/lwf/calculate` returns HTTP 501. Per-employee deduction iteration not implemented. | `LWFService.java:296-300`, `LWFController.java:139` | IN-market payroll runs that include LWF fail with 501. Payroll cannot be marked compliant for India without this. | Implement per-employee deduction loop in `calculateForPayrollRun`; set `app.features.lwf=true` in Railway env after implementation ships. |
| F-002 | P0 | Payment | Both `RazorpayAdapter.parseWebhookPayload` and `StripeAdapter.parseWebhookPayload` throw `UnsupportedOperationException`. `PaymentService.processWebhook` calls `adapter.parseWebhookPayload(payload)` (line 276) — any live payment webhook returns HTTP 500 to the provider. | `RazorpayAdapter.java:137`, `StripeAdapter.java:142`, `PaymentService.java:276` | Any Razorpay or Stripe payment event (payment.completed, refund, etc.) will 500 and the payment will not be recorded. Subscription payments will silently fail. | Parse the provider JSON payloads; map to `PaymentWebhookData`. Payments module is gated behind `ENABLE_PAYMENTS` feature flag, so this is only P0 when payments are enabled in the env. |
| F-003 | P0 | Mobile / Leave | `MobileLeaveService.getLeaveBalance()` throws `UnsupportedOperationException` unconditionally (`app.features.mobile-leave-balance=false` by default). The endpoint `GET /api/v1/mobile/leave/balance` is publicly declared in `MobileLeaveController` with `@RequiresPermission` but returns 501 for all callers. | `MobileLeaveService.java:79-86`, `MobileLeaveController.java:35-39` | Any mobile client calling the leave balance endpoint gets 501. If the mobile app ships before this flag is enabled, leave balance screen is permanently broken. | Implement `LeaveBalanceService → MobileLeaveDto` mapping; enable `app.features.mobile-leave-balance=true`. |
| F-004 | P0 | Payroll / Statutory | `UsStatutoryCalculator.calculate()` and `UkStatutoryCalculator.calculate()` both throw `UnsupportedOperationException`. Both are `@ConditionalOnProperty` gated, so harmless unless `app.statutory.country=US` or `=GB` is set — but there is no runtime guard in `StatutoryCalculatorFactory` to block a misconfigured tenant from triggering this at payroll run time. | `UsStatutoryCalculator.java:52-55`, `UkStatutoryCalculator.java:56-59`, `StatutoryCalculatorFactory.java` | Any tenant whose country resolves to US or UK gets a 500 on payroll run. Not P0 if only IN is in scope for launch, but becomes P0 for any multi-country deployment. | Add an `isImplemented()` guard in `StatutoryCalculatorFactory` that blocks payroll run creation for unimplemented countries and returns a clear 422. US/UK calculators already expose `isImplemented()=false` — just enforce it. |
| F-005 | P1 | Calendar / Integration | `CalendarService.importGoogleCalendarEvents`, `importOutlookCalendarEvents`, and `syncCalendar` throw `UnsupportedOperationException` when `calendar.sync.mock-mode=false`. Production env is expected to set `mock-mode=false`. Any user-facing "Sync Calendar" button will 500. | `CalendarService.java:267-279`, `CalendarService.java:337-341` | Calendar sync feature (Google/Outlook) is completely non-functional in production mode. Users see 500. | Implement Google Calendar API OAuth flow + Outlook Graph API, or set `calendar.sync.mock-mode=true` in prod env until implemented and remove the sync button from UI. |
| F-006 | P1 | Resource Management / Export | `WorkloadAnalyticsService.exportWorkloadReport` silently falls back to CSV when `format=xlsx` or `format=pdf` is requested, logging a `warn` but returning `Content-Type: text/csv` with no error. The endpoint `GET /api/v1/resource/workload/export?format=xlsx` responds 200 with CSV data — users downloading Excel will get a mis-named file. | `WorkloadAnalyticsService.java:255-261`, `ResourceManagementController.java:280-282` | Users requesting Excel/PDF export get a CSV file silently. A confusing UX breakage, not a 500. | Either implement XLSX export using Apache POI (already on classpath) or return HTTP 400 with a clear error when an unsupported format is requested. |
| F-007 | P1 | Mobile / Approvals | `MobileApprovalService.getPendingApprovals`, `approveRequest`, and `rejectRequest` all throw `UnsupportedOperationException` when `app.features.mobile-approvals=false` (default). `MobileApprovalController` is live at `/api/v1/mobile/approvals`. | `MobileApprovalService.java:86`, `MobileApprovalController.java` | Mobile approval workflow is 501 for all callers. If the mobile app exposes approval screens, they all fail. |Implement workflow integration or remove the routes from the mobile app until ready. |
| F-008 | P1 | Projects Calendar | `frontend/app/projects/calendar/page.tsx:135-137` hard-codes `return [] as TaskWithProject[]` for the task query — the calendar never shows tasks, only projects. This is intentional-placeholder code left in production. | `projects/calendar/page.tsx:135-137` | Projects calendar always shows 0 tasks. Users see empty task rows. | Implement `GET /api/v1/projects/{id}/tasks` on the backend and wire the query. |
| F-009 | P1 | Benefits | `BenefitManagementService` at line 162 returns `providerName(null)` for the standard `BenefitPlan` DTO with an inline comment "Provider entity not implemented". The `GET /api/v1/benefits/plans` endpoint always returns `providerName: null`. | `BenefitManagementService.java:162` | Benefits plan list shows no provider name for any plan. Users cannot identify benefit providers from the standard list. | Join to the provider entity in the query and map `providerName` from the result, or fall back to `BenefitPlanEnhanced` endpoint which does populate it. |
| F-010 | P1 | Recruitment / Job Boards | `JobBoardIntegrationService` throws `IllegalStateException("Naukri API credentials not configured")`, same for Indeed and LinkedIn. The "Pause" operation for any board falls through a `default -> log.warn("Pause not implemented for {}")` with no action taken. | `JobBoardIntegrationService.java:134,243,310,384` | Any user who attempts to post a job to Naukri/Indeed/LinkedIn without pre-configuring credentials gets a 500. The "Pause posting" button is a no-op. | Gate job board POST buttons in the UI on whether credentials are configured; show a "Configure credentials" CTA instead of 500. Implement Pause for all providers. |
| F-011 | P2 | Calendar week/day view | `frontend/app/nu-calendar/page.tsx:767` renders "Coming soon. Use Month or Agenda view for now." for Week and Day calendar views. | `nu-calendar/page.tsx:762-769` | Week and Day calendar views are permanently "coming soon" — minor since Month/Agenda work. | Implement or hide the view toggle buttons until ready. |
| F-012 | P2 | Manager Dashboard | Manager dashboard at `frontend/app/dashboards/manager/page.tsx:663` shows "Coming soon — Team project allocations will appear here once the feature is deployed" inside an error branch. This renders whenever the project allocation API call fails or returns no data. | `dashboards/manager/page.tsx:663` | Manager dashboard has a visible "Coming soon" block for project allocations. | Wire a real project allocation query or omit the section until the API is ready. |
| F-013 | P2 | Performance / Revolution | "Share Progress" button in `frontend/app/performance/revolution/page.tsx:56-58` is `disabled` with `title="Coming soon"` and `opacity-50 cursor-not-allowed`. | `performance/revolution/page.tsx:56-58` | Share button is permanently disabled with "coming soon" tooltip. | Remove the button or implement share functionality. |
| F-014 | P2 | Data Import / Keka | `KekaImportService` API-driven import throws `UnsupportedOperationException("API-driven Keka import not implemented; use KekaMigrationService via CLI")` for both `importEmployees` and `importAll`. The `/api/v1/import/keka` endpoint returns 501. | `KekaImportService.java:124,236` | Keka-to-NU-AURA migration via UI is broken. CLI migration path still works. Only impacts migration phase, not ongoing production usage. | Implement API-driven import or hide the Keka import UI option and document CLI-only path. |

---

## Validation Coverage (Task 4)

All key create flows have `@Valid` + `@Validated` on controllers and `@NotNull`/`@NotBlank` on DTOs. No gaps found:

| Module | Controller | Validation |
|--------|-----------|------------|
| Employee create | `EmployeeController.java:73` | `@Valid @RequestBody CreateEmployeeRequest` |
| Leave create | `LeaveRequestController.java:58` | `@Valid @RequestBody`, class `@Validated` |
| Expense create | `ExpenseAdvanceController.java:24` | `@Validated`, all DTOs have `@NotNull`/`@NotBlank` |
| Payroll run create | `PayrollController.java:53` | `@Valid @RequestBody CreatePayrollRunRequest` |
| Payroll component create | `PayrollController.java:483` | `@Valid @RequestBody CreatePayrollComponentRequest` |
| Organization unit create | `OrganizationController.java:38` | `@Valid @RequestBody` + record constraints |

Validation coverage is adequate across all checked modules. No missing server-side validation found.

---

## DEV-8 and UI-03 Verdicts (One-Line Summary)

**DEV-8 (LWF `calculateForPayrollRun`):** STILL STUB — throws `UnsupportedOperationException` at `LWFService.java:299`; `app.features.lwf=false` by default; endpoint returns 501; India payroll compliance blocked.

**UI-03 (Leave approval notification to employee):** CLOSED — `notifyLeaveApproved()` is called at `LeaveRequestService.java:232` inside `afterCommit()`, delivering a WebSocket push to the employee. Both direct and workflow-triggered approval paths are wired.
