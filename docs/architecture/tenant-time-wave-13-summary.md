# TenantTime Wave 13 — Migration Summary

> **Created:** 2026-05-20.
> **Status:** ~67 sites migrated, ~30 sites annotated JVM-local with rationale.
> **Successor:** wave 14+ (structural pushdown for remaining ~100 sites).

## What landed (wave 13a–o, 15 commits)

Wave 13 continued the wave-12 `TenantTimeService` rollout from
`backend/docs/audit/p1-progress-2026-05-14.md`.

| Sub-wave | Commit | Scope | Sites |
|---|---|---|---|
| 13 | 0d1e7c45 | 12 application packages (auth, platform, notification, recruitment, analytics, payment, document, publicapi, event, attendance, preboarding, performance) | ~57 |
| 13d | 92d007c3 | mobile, dataimport, admin | 10 |
| 13e | 2d7efea1 | 9 long-tail application packages (selfservice, dashboard, audit, project, user, workflow, resourcemanagement, report, travel) | 16 |
| 13f | 0b7a9fa7 | Kafka infrastructure (EventPublisher x6, DeadLetterHandler, KafkaEventUtil) | 8 |
| 13g | 78826bd6 | common/** (GlobalExceptionHandler migrated + JVM-local annotations) | 1 mig + 5 ann |
| 13h | 0fcf2c0d | domain/payroll entity actions (PayrollRun, PayrollAdjustment, StatutoryFilingRun) | 5 |
| 13i | dec626c4 | domain/letter (GeneratedLetter approve/issue/markDownloaded/markSent) | 4 |
| 13j | e77ab447 | domain/workflow (StepExecution, WorkflowExecution, WorkflowRule, ApprovalDelegate) | 12 |
| 13k | b08ff0ba | domain/attendance (AttendanceRecord regularization + biometric JVM-local) | 2 mig + 8 ann |
| 13l | 93f53807 | domain/expense (ExpenseClaim, MileageLog, ExpenseAdvance) | 9 |
| 13m | ffa2dc9e | domain/recognition (Recognition + JVM-local for points/milestones) | 1 mig + 6 ann |
| 13n | ef832b8e | domain/compliance + selfservice (DsrRequest, ProfileUpdateRequest, DocumentRequest) | 7 |
| 13o | b083de17 | domain/benefits (BenefitClaim, BenefitEnrollment, BenefitDependent) | 6 mig + 1 ann |

## What's still pending — ~100 sites in domain/** + small residuals

### Domain entity predicates and lifecycle stamps

These remain because each requires architectural judgement per entity:

| Package | Sites | Recommended approach |
|---|---|---|
| domain/contract | 7 | Contract#isExpired/isExpiringSoon — push predicate to ContractService with `LocalDate today` from caller. ContractReminder#isOverdue same pattern. |
| domain/engagement | 5 | OneOnOneMeeting#isUpcoming/isPast — push to service. MeetingActionItem#isOverdue same. PulseSurvey#isCurrentlyActive needs tenant-zoned today. |
| domain/compensation | 5 | SalaryRevision lifecycle stamps (propose/review/approve) — add LocalDate today arg to each method. |
| domain/contract | (ContractSignature.signedAt) | Action method — add `LocalDateTime now` arg. |
| domain/user | 4 | mostly entity-internal counters — annotate JVM-local. |
| domain/leave | 4 | LeaveRequest action stamps (approve/reject/cancel) — add `LocalDateTime now`. |
| domain/document | 4 | DocumentExpiryTracking predicates — push to service. |
| domain/webhook | 3 | Webhook delivery stamps — likely JVM-local (server reception). |
| domain/project | 3 | Project lifecycle stamps. |
| domain/platform | 3 | Tenant lifecycle stamps. |
| domain/overtime | 3 | OvertimeRequest action stamps. |
| domain/notification | 3 | Notification delivery stamps. |
| domain/employee | 3 | Employee lifecycle stamps. |
| domain/announcement | 3 | Announcement publish/expire stamps. |
| Other small packages | ~30 | Mix of action stamps and predicates. |

### common/** + api/** residuals (~15 sites)

Mostly already JVM-local-annotated. Remaining:
- `common/security/ApiKey` (predicate + lifecycle stamp; needs service pushdown if API-keys ever go cross-region).
- `common/util/TimeAuditingEntityListener`, `TenantTimestamp`, `TenantTimeService` — JavaDoc references to `LocalDate(Time).now()`; grep noise only.
- `api/payroll/controller/PayrollStatutoryController:64` — JavaDoc reference only.

## Pattern reference (for wave 14+)

The migration pattern proven across 15 sub-waves of wave 13:

### A) Entity action methods (the common case)

```java
// Before
public void approve(UUID approverId) {
    this.status = APPROVED;
    this.approvedBy = approverId;
    this.approvedAt = LocalDateTime.now();
}

// After
public void approve(UUID approverId, LocalDateTime now) {
    this.status = APPROVED;
    this.approvedBy = approverId;
    this.approvedAt = now;
}
```

Caller side:
```java
entity.approve(approverId, tenantTimeService.now(entity.getTenantId()));
```

### B) Entity predicates (less common — push to service)

```java
// Before (in entity)
public boolean isOverdue() {
    return deadline != null && LocalDateTime.now().isAfter(deadline) && status == PENDING;
}

// After (in entity)
public boolean isOverdue(LocalDateTime now) {
    return deadline != null && now.isAfter(deadline) && status == PENDING;
}
```

Caller side (service has tenantId):
```java
boolean overdue = entity.isOverdue(tenantTimeService.now(entity.getTenantId()));
```

### C) Internal/operational stamps (when entity has no business-action wrapper)

Annotate with `// JVM-local: <reason>` and accept the zone drift risk.
Examples: device heartbeat timestamps, internal points/counter trackers,
file-name suffixes used only as internal storage paths.

## Test mock pattern

Tests that hit migrated services need:

```java
@Mock private TenantTimeService tenantTimeService;

@BeforeEach
void setUp() {
    Mockito.lenient().when(tenantTimeService.now(any()))
        .thenReturn(LocalDateTime.parse("2026-05-20T12:00:00"));
}
```

For `@WebMvcTest`-style controller tests, add:
```java
@MockitoBean private TenantTimeService tenantTimeService;
```

## Acceptance for wave 14 close

- All domain entity action methods accept `LocalDateTime now` / `LocalDate today`.
- All callers thread tenantId via `tenantTimeService.now(entity.getTenantId())`.
- `grep -rn 'LocalDate(Time)\.now()' backend/src/main/java/com/nulogic/ | grep -v 'JVM-local'` returns 0 hits.
- All caller tests have `@Mock TenantTimeService` with lenient stubs.
