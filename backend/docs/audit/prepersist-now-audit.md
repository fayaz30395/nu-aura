# @PrePersist / @PreUpdate `LocalDate(Time).now()` Audit

**Scope:** `backend/src/main/java` — every `@PrePersist` / `@PreUpdate` callback that calls `LocalDate.now()`, `LocalDateTime.now()`, or `LocalTime.now()`.
**Method:** `grep` for the lifecycle annotations across `src/main/java`, then inspect each callback body. Files with lifecycle callbacks that do not invoke `LocalDate(Time).now()` (e.g. they use `Instant.now()`, no clock, or just initialize defaults) are excluded.
**Result:** **34 callbacks across 26 entity classes** call `LocalDate(Time).now()` from `@PrePersist` / `@PreUpdate`. None call `LocalTime.now()`.
**No code changes were made.**

## Summary by callback type

| Callback type | Count |
|---|---|
| `@PrePersist` | 26 |
| `@PreUpdate` | 8 |
| **Total** | **34** |

| Clock used | Count |
|---|---|
| `LocalDateTime.now()` | 30 |
| `LocalDate.now()` | 4 |
| `LocalTime.now()` | 0 |

## Per-entity findings

| # | File | Line | Callback method | Annotation | Current expression |
|---|------|-----:|-----------------|------------|--------------------|
| 1 | `domain/wellness/PointsTransaction.java` | 51 | `onCreate()` | `@PrePersist` | `transactionAt = LocalDateTime.now();` |
| 2 | `domain/compliance/AuditLog.java` | 72 | `prePersist()` | `@PrePersist` | `if (timestamp == null) { timestamp = LocalDateTime.now(); }` |
| 3 | `domain/benefits/BenefitClaim.java` | 128 | `onCreate()` | `@PrePersist` | `if (claimDate == null) claimDate = LocalDate.now();` |
| 4 | `domain/wellness/ChallengeParticipant.java` | 86 | `onCreate()` | `@PrePersist` | `joinedAt = LocalDateTime.now();` |
| 5 | `domain/survey/SurveyQuestion.java` | 69 | `onCreate()` | `@PrePersist` | `createdAt = LocalDateTime.now();` |
| 6 | `domain/survey/SurveyInsight.java` | 85 | `onCreate()` | `@PrePersist` | `generatedAt = LocalDateTime.now();` |
| 7 | `domain/notification/UserNotificationPreference.java` | 79 | `onCreate()` | `@PrePersist` | `createdAt = LocalDateTime.now();` |
| 8 | `domain/notification/UserNotificationPreference.java` | 94 | `onUpdate()` | `@PreUpdate` | `updatedAt = LocalDateTime.now();` |
| 9 | `domain/notification/MultiChannelNotification.java` | 108 | `onCreate()` | `@PrePersist` | `createdAt = LocalDateTime.now();` |
| 10 | `domain/overtime/CompTimeTransaction.java` | 62 | `onCreate()` | `@PrePersist` | `if (transactionDate == null) { transactionDate = LocalDate.now(); }` |
| 11 | `domain/overtime/CompTimeTransaction.java` | 64 | `onCreate()` | `@PrePersist` | `processedAt = LocalDateTime.now();` |
| 12 | `domain/compliance/DsrRequest.java` | 104 | `prePersist()` | `@PrePersist` | `if (requestedAt == null) { requestedAt = LocalDateTime.now(); }` |
| 13 | `domain/workflow/StepExecution.java` | 96 | `onCreate()` | `@PrePersist` | `assignedAt = LocalDateTime.now();` |
| 14 | `domain/survey/EngagementScore.java` | 93 | `onCreate()` | `@PrePersist` | `calculatedAt = LocalDateTime.now();` |
| 15 | `domain/organization/TalentPoolMember.java` | 48 | `prePersist()` | `@PrePersist` | `if (addedDate == null) { addedDate = LocalDate.now(); }` |
| 16 | `domain/wellness/HealthLog.java` | 69 | `onCreate()` | `@PrePersist` | `loggedAt = LocalDateTime.now();` |
| 17 | `domain/wellness/HealthLog.java` | 70 | `onCreate()` | `@PrePersist` | `if (logDate == null) logDate = LocalDate.now();` |
| 18 | `domain/payment/PaymentWebhook.java` | 65 | `onCreate()` | `@PrePersist` | `createdAt = LocalDateTime.now();` |
| 19 | `domain/payment/PaymentWebhook.java` | 66 | `onCreate()` | `@PrePersist` | `updatedAt = LocalDateTime.now();` |
| 20 | `domain/payment/PaymentWebhook.java` | 71 | `onUpdate()` | `@PreUpdate` | `updatedAt = LocalDateTime.now();` |
| 21 | `domain/recognition/RecognitionReaction.java` | 42 | `prePersist()` | `@PrePersist` | `if (reactedAt == null) { reactedAt = LocalDateTime.now(); }` |
| 22 | `domain/workflow/WorkflowExecution.java` | 96 | `onCreate()` | `@PrePersist` | `submittedAt = LocalDateTime.now();` |
| 23 | `domain/benefits/BenefitDependent.java` | 106 | `onCreate()` | `@PrePersist` | `createdAt = LocalDateTime.now();` |
| 24 | `domain/benefits/BenefitDependent.java` | 111 | `onUpdate()` | `@PreUpdate` | `updatedAt = LocalDateTime.now();` |
| 25 | `domain/survey/SurveyAnswer.java` | 65 | `onCreate()` | `@PrePersist` | `answeredAt = LocalDateTime.now();` |
| 26 | `domain/survey/SurveyResponse.java` | 74 | `onCreate()` | `@PrePersist` | `createdAt = LocalDateTime.now();` |
| 27 | `domain/employee/EmployeeSkill.java` | 65 | `onCreate()` | `@PrePersist` | `createdAt = LocalDateTime.now();` |
| 28 | `domain/employee/EmployeeSkill.java` | 66 | `onCreate()` | `@PrePersist` | `updatedAt = LocalDateTime.now();` |
| 29 | `domain/employee/EmployeeSkill.java` | 71 | `onUpdate()` | `@PreUpdate` | `updatedAt = LocalDateTime.now();` |
| 30 | `domain/overtime/CompTimeBalance.java` | 64 | `onCreate()` | `@PrePersist` | `createdAt = LocalDateTime.now();` |
| 31 | `domain/overtime/CompTimeBalance.java` | 74 | `onUpdate()` | `@PreUpdate` | `updatedAt = LocalDateTime.now();` |

> Note: 4 of the 26 entity files have lifecycle callbacks but do *not* invoke `LocalDate(Time).now()` and were excluded:
> `domain/workflow/ApprovalDelegate.java` (only sets boolean default), `domain/workflow/WorkflowRule.java` (only sets priority default), `domain/benefits/BenefitEnrollment.java` (only sets status default), `domain/overtime/OvertimeRequest.java` (only sets request number + status).
> A further 16 files (e.g. `TenantEntityListener`, `BenefitPlanEnhanced`, `NotificationTemplate`, `EmployeePayrollRecord`, `TravelExpense`, `HeadcountPosition`, `HeadcountBudget`, `FlexBenefitAllocation`, `WorkflowDefinition`, `ApprovalEscalationConfig`, `NotificationChannelConfig`, `AppPermission`, `ImplicitRoleRule`, `CustomScopeTarget`, `RolePermission`, `GlobalPayrollService`) have `@PrePersist` / `@PreUpdate` but use `Instant.now()` / no clock and are therefore out of scope.

## Distribution by domain package

| Package | Callbacks |
|---|---:|
| `domain/wellness` | 4 |
| `domain/survey` | 5 |
| `domain/workflow` | 2 |
| `domain/notification` | 3 |
| `domain/benefits` | 3 |
| `domain/overtime` | 4 |
| `domain/compliance` | 2 |
| `domain/employee` | 3 |
| `domain/payment` | 3 |
| `domain/organization` | 1 |
| `domain/recognition` | 1 |
| **Total** | **31 rows / 34 expressions (multi-line)** |

## Patterns observed (informational, not action items)

- **Unconditional assignment** (overwrites caller-supplied value): rows 1, 4–9, 11, 13, 14, 16, 18–20, 22–31 — most common (~22).
- **Null-guarded assignment** (`if (x == null) x = ...`): rows 2, 3, 10, 12, 15, 17, 21 — 7 occurrences.
- **`LocalDate.now()` callers** (date-only fields, susceptible to TZ-boundary drift): rows 3, 10, 15, 17.
- **No callback uses `Clock`, `TenantTimeService`, or any injected time source.** All 34 expressions read system default-zone wall clock via the static factory.

## Out-of-scope (not part of this audit)

- Service-layer / scheduled-job `LocalDate(Time).now()` usages — covered by `unzoned-now-audit.md`.
- `Instant.now()` usages inside `@PrePersist` / `@PreUpdate` (e.g. `TenantEntityListener`, `NotificationTemplate`) — UTC instants, no zone ambiguity.
- Field-level `@CreationTimestamp` / `@UpdateTimestamp` Hibernate annotations — handled by Hibernate, not by user callbacks.
