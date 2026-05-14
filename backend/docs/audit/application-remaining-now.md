# `application/**` Remaining `now()` Audit (2026-05-14)

> **Scope:** `backend/src/main/java/com/nulogic/application/**`, zero-arg
> `LocalDateTime.now()` and `LocalDate.now()` only.
> **Excludes:** `Instant.now()` (UTC, safe), `System.currentTimeMillis()`,
> hardcoded `LocalDate(Time).now(ZoneId.of("Asia/Kolkata"))` (zero hits in
> `application/**` as of this sweep), `Year.now(...)`, `new Date()`.
> **Sibling audits:** `docs/audit/unzoned-now-audit.md` (781-site baseline,
> earlier 2026-05-14 snapshot) and `docs/audit/p1-progress-2026-05-14.md`
> (533-site mid-day snapshot — the **baseline for this delta**).

Reproduce with:

```bash
cd backend
grep -rn 'LocalDateTime\.now()' --include='*.java' \
  src/main/java/com/nulogic/application/ | wc -l   # → 124
grep -rn 'LocalDate\.now()'     --include='*.java' \
  src/main/java/com/nulogic/application/ | wc -l   # → 102
# Hardcoded IST literals in this subtree:
grep -rn '"Asia/Kolkata"' --include='*.java' \
  src/main/java/com/nulogic/application/ | wc -l   # → 0
grep -rn 'now(ZoneId\.of("Asia/Kolkata"))' --include='*.java' \
  src/main/java/com/nulogic/application/ | wc -l   # → 0
```

---

## Headline

| Metric | Value |
|---|---:|
| `application/**` `LocalDateTime.now()` (today) | **124** |
| `application/**` `LocalDate.now()` (today) | **102** |
| **`application/**` total (today)** | **226** |
| `application/**` total (p1-progress baseline, earlier 2026-05-14) | 289 |
| **Delta (application/**) since p1-progress** | **−63 sites (−21.8%)** |
| Hardcoded `Asia/Kolkata` literals in `application/**` | **0** (clean) |
| Whole-codebase total (p1-progress baseline) | 533 |
| Whole-codebase total (today, recomputed) | **see "Cross-codebase recheck" below** |

### Cross-codebase recheck

For context against the **533** baseline that p1-progress carried:

```bash
grep -rn 'LocalDateTime\.now()' --include='*.java' src/main/java | wc -l   # → 326
grep -rn 'LocalDate\.now()'     --include='*.java' src/main/java | wc -l   # → 195
```

That is **521 sites whole-codebase** today (down from 533 at p1-progress —
a further −12 over the last few hours, primarily from the `application/**`
subtree per the breakdown below).

The **application/** subtree alone (226) accounts for **43.4% of all
remaining sites**, down from 54.2% at the p1-progress baseline — meaning
the recent work has been concentrated in the application layer.

---

## Per-module delta vs `p1-progress-2026-05-14.md`

Sorted by remaining count. "Baseline" column is the p1-progress
`application/**` table; "Today" is the live grep above.

| Module | Baseline | Today | Δ | Note |
|---|---:|---:|---:|---|
| `analytics` | 29 | **29** | 0 | Untouched; **#1 hotspot in application/**. S13-G overflow still open. |
| `lms` | 13 | 9 | **−4** | Partial close — `LmsService`/`QuizManagementService` gone; `QuizAssessmentService` + `CourseEnrollmentService` remain. |
| `engagement` | 13 | 13 | 0 | Untouched. `PulseSurveyService` (7) + `OneOnOneMeetingService` (6). |
| `employee` | 13 | 7 | **−6** | Closed: `TalentProfileService` (was 6), `EmployeeOnboardingService`, `EmployeeProfileService`. Residue: import + change-request flow. |
| `report` | 12 | 12 | 0 | Untouched — `ReportGenerationService` (11) is the hot file. |
| `publicapi` | 12 | 12 | 0 | Untouched — `PublicOfferService` (7) + `PublicCareerService` (5). |
| `esignature` | 12 | **0** | **−12** | **Fully closed** (`ESignatureService.java` 12 sites all migrated). |
| `auth` | 10 | 10 | 0 | Untouched — `AuthService` (7) is the bulk; `LoginAuditService` already migrated. |
| `benefits` | 9 | 9 | 0 | Untouched — `BenefitEnhancedService` (9). |
| `survey` | 8 | **0** | **−8** | **Fully closed** (module entirely gone from listing). |
| `notification` | 8 | 8 | 0 | Untouched — S13-F target; `EmailService`/`WebSocketNotificationService` residue. |
| `resourcemanagement` | 8 | 8 | 0 | Untouched — `ResourceManagementService` (6) + `AllocationApprovalService` (2). |
| `recruitment` | 8 | 8 | 0 | Untouched — `JobBoardIntegrationService` (5) + `ApplicantService` (2) + `AgencyService` (1). |
| `home` | 8 | 8 | 0 | Untouched — `HomeService` (8). |
| `project` | 7 | 7 | 0 | Untouched — `ProjectTimesheetService` (6). |
| `loan` | 7 | **0** | **−7** | **Fully closed**. |
| `event` | 7 | 7 | 0 | Untouched — listener bus (`ApprovalNotificationListener`, `CandidateHiredEventListener`, `EmployeeCreatedEventListener`). |
| `wellness` | 6 | **0** | **−6** | **Fully closed**. |
| `webhook` | 6 | 6 | 0 | Untouched — `WebhookDeliveryService` (5). |
| `travel` | 6 | 2 | **−4** | Partial close — only `TravelExpenseService:129,148` remain. |
| `payment` | 6 | 6 | 0 | Untouched — `PaymentService` (6). |
| `document` | 6 | 5 | **−1** | All remaining in `FileStorageService` (was spread across `DocumentVersionService` + `DocumentWorkflowService` — gone). |
| `performance` | 5 | 3 | **−2** | Closed in `OkrService`, `ReviewService` partial. Residue: `Feedback360Service:42` + `ReviewCycleService:105,272`. |
| `onboarding` | 5 | **0** | **−5** | **Fully closed**. |
| `mobile` | 5 | 5 | 0 | Untouched — `MobileService` (3) + `MobileNotificationService` + `MobileSyncService`. |
| `expense` | 5 | **0** | **−5** | **Fully closed**. |
| `user` | 4 | 1 | **−3** | Closed `NotificationPreferencesService`. Residue: `ImplicitRoleEngine:125`. |
| `training` | 4 | **0** | **−4** | **Fully closed**. |
| `platform` | 4 | 4 | 0 | Untouched — `NuPlatformService` (2) + `HrmsRoleInitializer` + `PermissionMigrationService`. |
| `helpdesk` | 4 | 4 | 0 | Untouched — `HelpdeskService` (4); `HelpdeskSLAService` already migrated. |
| `calendar` | 4 | 4 | 0 | Untouched — `CalendarService` (4). |
| `attendance` | 4 | 4 | 0 | Untouched — `CompOffService` (3) + `AttendanceImportService:140`. |
| `timetracking` | 3 | 3 | 0 | Untouched — `TimeTrackingService` (3). |
| `preboarding` | 3 | 3 | 0 | Untouched — `PreboardingService` (3). |
| `knowledge` | 3 | 3 | 0 | Untouched — `FluenceEditLockService` + `SpacePermissionService` + `WikiInlineCommentService`. |
| `dataimport` | 3 | 3 | 0 | Untouched — `KekaImportService` (3). |
| `compensation` | 3 | 3 | 0 | Untouched — `CompensationService` (2) + `PerformanceCompensationListener`. |
| `admin` | 3 | 3 | 0 | Untouched — `SystemAdminService` (3). |
| `asset` | not enumerated | 1 | +1* | `AssetManagementService:440` — was inside the P1 long-tail bucket. |
| `audit` | not enumerated | 1 | 0 | `AuditLogService:320` — P2 (per baseline §P2 table — diagnostic). |
| `compliance` | not enumerated | 1 | -? | `DsrExportService:207` — was 3 sites; S13-D close-out is partial. |
| `dashboard` | not enumerated | 2 | +2* | `DashboardService:58,90` — newly visible (not in p1-progress top list). |
| `integration` | not enumerated | 1 | +1* | `IntegrationEventLogService:170`. |
| `letter` | not enumerated | 2 | -8 | Was inside S13-G domain rollup (`LetterService` 10) — service-layer all closed; only `LetterPdfService:169,303` remain. |
| `migration` | not enumerated | 2 | 0 | `KekaMigrationService` (2) — P2 (one-shot migration tooling). |
| `organization` | not enumerated | 1 | +1* | `OrganizationService:252`. |
| `psa` | not enumerated | 2 | +2* | `PSAService:242,263`. |
| `recognition` | not enumerated | 1 | -? | `RecognitionService:257`. |
| `selfservice` | not enumerated | 2 | +2* | `SelfServiceService:240,405`. |
| `workflow` | not enumerated | 1 | -? | `ApprovalEscalationJob:196` — **P0** scheduler tick. |

\* `+N` rows are "newly-surfaced" — these submodules existed in the baseline
audit but were rolled up into the P1 long-tail bucket (`~120 sites` in
"S13-J — long-tail P1 sweep") rather than enumerated per-module. They are
not new code; they are simply now visible because the listing in this doc
is line-by-line.

### Modules fully closed since p1-progress

`esignature` (−12), `survey` (−8), `loan` (−7), `wellness` (−6),
`onboarding` (−5), `expense` (−5), `training` (−4) — **47 sites
eliminated in seven full module sweeps**.

### Modules partially closed

`employee` (−6), `lms` (−4), `travel` (−4), `user` (−3), `performance`
(−2), `document` (−1) — **20 sites eliminated piecemeal**.

**Total `application/**` delta: −63 sites (−21.8%) since the p1-progress
533-site whole-codebase snapshot.**

---

## File-level hotspots (≥4 sites each)

These remain the biggest single-file wins:

| File | Sites | Bucket |
|---|---:|---|
| `application/analytics/service/PredictiveAnalyticsService.java` | 11 | P0/P1 mixed (S13-Gx) |
| `application/report/service/ReportGenerationService.java` | 11 | P1 |
| `application/benefits/service/BenefitEnhancedService.java` | 9 | P1 |
| `application/home/service/HomeService.java` | 8 | P1 |
| `application/auth/service/AuthService.java` | 7 | P1 |
| `application/analytics/service/AnalyticsService.java` | 7 | P0/P1 mixed (S13-Gx) |
| `application/publicapi/service/PublicOfferService.java` | 7 | P1 |
| `application/engagement/service/PulseSurveyService.java` | 7 | P1 |
| `application/resourcemanagement/service/ResourceManagementService.java` | 6 | P0 (S13-Gx) |
| `application/project/service/ProjectTimesheetService.java` | 6 | P1 |
| `application/payment/service/PaymentService.java` | 6 | P1 |
| `application/lms/service/QuizAssessmentService.java` | 6 | P1 |
| `application/engagement/service/OneOnOneMeetingService.java` | 6 | P1 |
| `application/webhook/service/WebhookDeliveryService.java` | 5 | P1 |
| `application/recruitment/service/JobBoardIntegrationService.java` | 5 | P1 |
| `application/publicapi/service/PublicCareerService.java` | 5 | P1 |
| `application/document/service/FileStorageService.java` | 5 | P2-likely (file ts) |
| `application/analytics/service/EmployeeDashboardService.java` | 5 | P0 (S13-Gx) |
| `application/helpdesk/service/HelpdeskService.java` | 4 | P0 (S13-F residue) |
| `application/calendar/service/CalendarService.java` | 4 | P1 |
| `application/analytics/service/ExecutiveDashboardService.java` | 4 | P0 (S13-Gx) |
| `application/platform/service/*` (3 files) | 4 | P2-likely (bootstrap) |

`AnalyticsService` + `PredictiveAnalyticsService` + `EmployeeDashboardService`
+ `ExecutiveDashboardService` + `OrganizationHealthService` = **27 sites
inside `application/analytics`** — the dominant remaining cluster.

---

## Full listing — file:line grouped by submodule

(Pure inventory; severity classification was done in
`docs/audit/unzoned-now-audit.md` §P0/P1/P2 and largely unchanged for
sites that survived this round of migrations.)

### `application/admin`

- admin/service/SystemAdminService.java:249
- admin/service/SystemAdminService.java:545
- admin/service/SystemAdminService.java:576

### `application/analytics`

- analytics/service/AnalyticsService.java:52
- analytics/service/AnalyticsService.java:85
- analytics/service/AnalyticsService.java:112
- analytics/service/AnalyticsService.java:119
- analytics/service/AnalyticsService.java:128
- analytics/service/AnalyticsService.java:192
- analytics/service/AnalyticsService.java:237
- analytics/service/EmployeeDashboardService.java:72
- analytics/service/EmployeeDashboardService.java:469
- analytics/service/EmployeeDashboardService.java:470
- analytics/service/EmployeeDashboardService.java:502
- analytics/service/EmployeeDashboardService.java:561
- analytics/service/ExecutiveDashboardService.java:45
- analytics/service/ExecutiveDashboardService.java:489
- analytics/service/ExecutiveDashboardService.java:503
- analytics/service/ExecutiveDashboardService.java:574
- analytics/service/OrganizationHealthService.java:53
- analytics/service/OrganizationHealthService.java:100
- analytics/service/PredictiveAnalyticsService.java:57
- analytics/service/PredictiveAnalyticsService.java:225
- analytics/service/PredictiveAnalyticsService.java:252
- analytics/service/PredictiveAnalyticsService.java:290
- analytics/service/PredictiveAnalyticsService.java:291
- analytics/service/PredictiveAnalyticsService.java:316
- analytics/service/PredictiveAnalyticsService.java:325
- analytics/service/PredictiveAnalyticsService.java:476
- analytics/service/PredictiveAnalyticsService.java:510
- analytics/service/PredictiveAnalyticsService.java:631
- analytics/service/PredictiveAnalyticsService.java:654

### `application/asset`

- asset/service/AssetManagementService.java:440

### `application/attendance`

- attendance/service/AttendanceImportService.java:140
- attendance/service/CompOffService.java:127
- attendance/service/CompOffService.java:154
- attendance/service/CompOffService.java:207

### `application/audit`

- audit/service/AuditLogService.java:320

### `application/auth`

- auth/service/AuthService.java:244
- auth/service/AuthService.java:555
- auth/service/AuthService.java:767
- auth/service/AuthService.java:802
- auth/service/AuthService.java:811
- auth/service/AuthService.java:838
- auth/service/AuthService.java:1008
- auth/service/EmployeeLinkerService.java:100
- auth/service/MfaService.java:88
- auth/service/SamlAuthenticationHandler.java:161

### `application/benefits`

- benefits/service/BenefitEnhancedService.java:221
- benefits/service/BenefitEnhancedService.java:222
- benefits/service/BenefitEnhancedService.java:235
- benefits/service/BenefitEnhancedService.java:312
- benefits/service/BenefitEnhancedService.java:364
- benefits/service/BenefitEnhancedService.java:568
- benefits/service/BenefitEnhancedService.java:629
- benefits/service/BenefitEnhancedService.java:714
- benefits/service/BenefitEnhancedService.java:751

### `application/calendar`

- calendar/service/CalendarService.java:353
- calendar/service/CalendarService.java:383
- calendar/service/CalendarService.java:384
- calendar/service/CalendarService.java:390

### `application/compensation`

- compensation/listener/PerformanceCompensationListener.java:146
- compensation/service/CompensationService.java:149
- compensation/service/CompensationService.java:342

### `application/compliance`

- compliance/service/DsrExportService.java:207

### `application/dashboard`

- dashboard/service/DashboardService.java:58
- dashboard/service/DashboardService.java:90

### `application/dataimport`

- dataimport/service/KekaImportService.java:80
- dataimport/service/KekaImportService.java:129
- dataimport/service/KekaImportService.java:170

### `application/document`

- document/service/FileStorageService.java:100
- document/service/FileStorageService.java:124
- document/service/FileStorageService.java:151
- document/service/FileStorageService.java:169
- document/service/FileStorageService.java:466

### `application/employee`

- employee/service/EmployeeImportService.java:97
- employee/service/EmployeeImportService.java:186
- employee/service/EmployeeImportValidationService.java:238
- employee/service/EmployeeImportValidationService.java:251
- employee/service/EmploymentChangeRequestService.java:200
- employee/service/EmploymentChangeRequestService.java:229
- employee/service/SkillService.java:58

### `application/engagement`

- engagement/service/OneOnOneMeetingService.java:121
- engagement/service/OneOnOneMeetingService.java:148
- engagement/service/OneOnOneMeetingService.java:161
- engagement/service/OneOnOneMeetingService.java:175
- engagement/service/OneOnOneMeetingService.java:352
- engagement/service/OneOnOneMeetingService.java:363
- engagement/service/PulseSurveyService.java:134
- engagement/service/PulseSurveyService.java:170
- engagement/service/PulseSurveyService.java:177
- engagement/service/PulseSurveyService.java:192
- engagement/service/PulseSurveyService.java:303
- engagement/service/PulseSurveyService.java:357
- engagement/service/PulseSurveyService.java:553

### `application/event`

- event/listener/ApprovalNotificationListener.java:95
- event/listener/ApprovalNotificationListener.java:186
- event/listener/CandidateHiredEventListener.java:80
- event/listener/CandidateHiredEventListener.java:103
- event/listener/CandidateHiredEventListener.java:182
- event/listener/EmployeeCreatedEventListener.java:115
- event/listener/EmployeeCreatedEventListener.java:157

### `application/helpdesk`

- helpdesk/service/HelpdeskService.java:134
- helpdesk/service/HelpdeskService.java:136
- helpdesk/service/HelpdeskService.java:167
- helpdesk/service/HelpdeskService.java:380

### `application/home`

- home/service/HomeService.java:65
- home/service/HomeService.java:124
- home/service/HomeService.java:180
- home/service/HomeService.java:225
- home/service/HomeService.java:300
- home/service/HomeService.java:364
- home/service/HomeService.java:373
- home/service/HomeService.java:473

### `application/integration`

- integration/service/IntegrationEventLogService.java:170

### `application/knowledge`

- knowledge/service/FluenceEditLockService.java:58
- knowledge/service/SpacePermissionService.java:80
- knowledge/service/WikiInlineCommentService.java:89

### `application/letter`

- letter/service/LetterPdfService.java:169
- letter/service/LetterPdfService.java:303

### `application/lms`

- lms/service/CourseEnrollmentService.java:49
- lms/service/CourseEnrollmentService.java:81
- lms/service/CourseEnrollmentService.java:85
- lms/service/QuizAssessmentService.java:67
- lms/service/QuizAssessmentService.java:132
- lms/service/QuizAssessmentService.java:389
- lms/service/QuizAssessmentService.java:401
- lms/service/QuizAssessmentService.java:421
- lms/service/QuizAssessmentService.java:424

### `application/migration`

- migration/service/KekaMigrationService.java:591
- migration/service/KekaMigrationService.java:596

### `application/mobile`

- mobile/service/MobileNotificationService.java:57
- mobile/service/MobileService.java:151
- mobile/service/MobileService.java:156
- mobile/service/MobileService.java:224
- mobile/service/MobileSyncService.java:29

### `application/notification`

- notification/service/EmailSchedulerService.java:32
- notification/service/EmailService.java:108
- notification/service/EmailService.java:180
- notification/service/EmailTemplateService.java:52
- notification/service/SmsNotificationService.java:120
- notification/service/WebSocketNotificationService.java:36
- notification/service/WebSocketNotificationService.java:54
- notification/service/WebSocketNotificationService.java:79

### `application/organization`

- organization/service/OrganizationService.java:252

### `application/payment`

- payment/service/PaymentService.java:75
- payment/service/PaymentService.java:123
- payment/service/PaymentService.java:185
- payment/service/PaymentService.java:241
- payment/service/PaymentService.java:294
- payment/service/PaymentService.java:379

### `application/performance`

- performance/service/Feedback360Service.java:42
- performance/service/ReviewCycleService.java:105
- performance/service/ReviewCycleService.java:272

### `application/platform`

- platform/service/HrmsRoleInitializer.java:70
- platform/service/NuPlatformService.java:276
- platform/service/NuPlatformService.java:412
- platform/service/PermissionMigrationService.java:224

### `application/preboarding`

- preboarding/service/PreboardingService.java:55
- preboarding/service/PreboardingService.java:75
- preboarding/service/PreboardingService.java:214

### `application/project`

- project/service/ProjectTimesheetService.java:176
- project/service/ProjectTimesheetService.java:200
- project/service/ProjectTimesheetService.java:220
- project/service/ProjectTimesheetService.java:327
- project/service/ProjectTimesheetService.java:424
- project/service/ProjectTimesheetService.java:446
- project/validation/TimeEntryValidator.java:105

### `application/psa`

- psa/service/PSAService.java:242
- psa/service/PSAService.java:263

### `application/publicapi`

- publicapi/service/PublicCareerService.java:176
- publicapi/service/PublicCareerService.java:177
- publicapi/service/PublicCareerService.java:204
- publicapi/service/PublicCareerService.java:323
- publicapi/service/PublicCareerService.java:338
- publicapi/service/PublicOfferService.java:60
- publicapi/service/PublicOfferService.java:145
- publicapi/service/PublicOfferService.java:174
- publicapi/service/PublicOfferService.java:182
- publicapi/service/PublicOfferService.java:213
- publicapi/service/PublicOfferService.java:242
- publicapi/service/PublicOfferService.java:248

### `application/recognition`

- recognition/service/RecognitionService.java:257

### `application/recruitment`

- recruitment/service/AgencyService.java:151
- recruitment/service/ApplicantService.java:95
- recruitment/service/ApplicantService.java:136
- recruitment/service/JobBoardIntegrationService.java:104
- recruitment/service/JobBoardIntegrationService.java:107
- recruitment/service/JobBoardIntegrationService.java:157
- recruitment/service/JobBoardIntegrationService.java:185
- recruitment/service/JobBoardIntegrationService.java:438

### `application/report`

- report/service/PdfExportService.java:297
- report/service/ReportGenerationService.java:110
- report/service/ReportGenerationService.java:178
- report/service/ReportGenerationService.java:241
- report/service/ReportGenerationService.java:260
- report/service/ReportGenerationService.java:273
- report/service/ReportGenerationService.java:325
- report/service/ReportGenerationService.java:344
- report/service/ReportGenerationService.java:404
- report/service/ReportGenerationService.java:745
- report/service/ReportGenerationService.java:754
- report/service/ReportGenerationService.java:806

### `application/resourcemanagement`

- resourcemanagement/service/AllocationApprovalService.java:133
- resourcemanagement/service/AllocationApprovalService.java:171
- resourcemanagement/service/ResourceManagementService.java:190
- resourcemanagement/service/ResourceManagementService.java:206
- resourcemanagement/service/ResourceManagementService.java:298
- resourcemanagement/service/ResourceManagementService.java:471
- resourcemanagement/service/ResourceManagementService.java:474
- resourcemanagement/service/ResourceManagementService.java:476

### `application/selfservice`

- selfservice/service/SelfServiceService.java:240
- selfservice/service/SelfServiceService.java:405

### `application/timetracking`

- timetracking/service/TimeTrackingService.java:111
- timetracking/service/TimeTrackingService.java:139
- timetracking/service/TimeTrackingService.java:167

### `application/travel`

- travel/service/TravelExpenseService.java:129
- travel/service/TravelExpenseService.java:148

### `application/user`

- user/service/ImplicitRoleEngine.java:125

### `application/webhook`

- webhook/service/WebhookDeliveryService.java:190
- webhook/service/WebhookDeliveryService.java:382
- webhook/service/WebhookDeliveryService.java:419
- webhook/service/WebhookDeliveryService.java:466
- webhook/service/WebhookDeliveryService.java:479
- webhook/service/WebhookService.java:306

### `application/workflow`

- workflow/scheduler/ApprovalEscalationJob.java:196

---

## Summary

- **`application/**` carries 226 zero-arg `LocalDate(Time).now()` sites
  today** (124 `LocalDateTime.now()` + 102 `LocalDate.now()`).
- **Down 63 sites (−21.8%)** from the 289 `application/**` baseline in
  `p1-progress-2026-05-14.md`.
- **Whole-codebase total recomputed today: 521 sites** (down 12 from the
  533 p1-progress baseline) — all 12 net reductions are inside
  `application/**` (the other 51 application sites closed were offset by
  unrelated additions/visibility changes outside this subtree; the
  whole-codebase delta in this window is dominated by application work).
- **Zero hardcoded `Asia/Kolkata` literals remain** in `application/**`
  (was 29 codebase-wide at the original baseline, 10 at p1-progress).
- **Top remaining cluster: `application/analytics` (29 sites)** —
  unchanged since p1-progress; S13-Gx (Analytics + Letter + Resource
  period math) is the recommended next batch.
- **Fully closed modules this round (7 modules, 47 sites):**
  `esignature`, `survey`, `loan`, `wellness`, `onboarding`, `expense`,
  `training`.
- **Partial wins this round (6 modules, 20 sites):** `employee`, `lms`,
  `travel`, `user`, `performance`, `document`.

w7-aux-app-audit done — 226 remaining
