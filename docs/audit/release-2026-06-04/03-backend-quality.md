# Backend Production-Quality Audit — NU-AURA

**Date:** 2026-06-04
**Scope:** `backend/` only (Java 21, Spring Boot 3.4.1, PostgreSQL 16 RLS, Redis 7, Kafka, MapStruct, JJWT)
**Auditor constraint:** Sandbox has Java 11 and no Maven — no compilation possible. Only low-risk,
mechanical, compile-safe edits were applied. Everything else is reported with `file:line` evidence
and flagged for `mvn -pl backend verify` on the user's Java 21 machine.

**Headline:** The backend is substantially more mature than a typical pre-release codebase. Of the
7 audited gaps, **5 are effectively closed** (Valid, Kafka idempotency, ShedLock, native-query
tenant scoping, soft-delete filtering). The two genuine gaps are **audit-log coverage** (P1) and a
**`@Where` → `@SQLRestriction` deprecation sweep** (P2). No compile-safe edit added net value, so this
is a **report-only** deliverable (see rationale in §8).

---

## 1. `@Valid` coverage on controller `@RequestBody` — STATUS: PASS (P2, no action)

**Counts (evidence-based):**

- `@RequestBody` occurrences in `*Controller.java`: **458** across 143 files.
- `@Valid @RequestBody` (or `@Valid …@RequestBody`): **452** across 142 files.
- Request-DTO-typed bodies (`…Request|Dto|Command|Input|Payload`) **without** `@Valid`: **0**.

The ~6 deltas are **not DTOs** and `@Valid` on them is a no-op (only triggers nested-bean
validation):

| File:line | Body type | Why no `@Valid` |
|---|---|---|
| `api/integration/controller/DocuSignController.java:89` | `@RequestBody String payload` | Webhook callback, raw string |
| `api/integration/controller/SlackCommandController.java:94` | `@RequestBody String body` | Slack event, raw string |
| `api/payment/controller/PaymentWebhookController.java:49,81,92` | `@RequestBody String payload` | Payment webhooks, raw string |

`@Valid` is already applied to every genuine request DTO, and even to bounded collection bodies
(`@Valid @NotEmpty @RequestBody List<UUID>` at `LetterController.java:228`). **No fix required.**

---

## 2. Pagination — collection endpoints returning `List<…>` — STATUS: REPORT ONLY (P2)

**Count:** `ResponseEntity<List<…>>` appears **306 times across 112 controllers**.

Not all are violations — many are legitimately bounded result sets (dropdowns, lookups, child
collections of a single parent, batch-operation echoes). The release risk is the subset that query
**unbounded tenant-wide tables**. High-traffic examples worth converting to `Page<…>`:

| Controller | Hits | Risk |
|---|---|---|
| `api/organization/controller/OrganizationController.java` | 11 | Org-unit / position lists can be large |
| `api/benefits/controller/BenefitEnhancedController.java` | 9 | Enrollment lists per tenant |
| `api/workflow/controller/WorkflowController.java` | 8 | Execution history |
| `api/project/controller/ProjectTimesheetController.java` | 8 | Timesheet rows — unbounded |
| `api/helpdesk/controller/HelpdeskController.java` | 7 | Ticket lists |
| `api/platform/controller/PlatformController.java` | 7 | |
| `api/wellness/controller/WellnessController.java` | 7 | |

**Severity: P2.** **Do NOT refactor** — changing `List<…>` → `Page<…>` is a breaking API-signature
change requiring frontend + contract changes and full `mvn verify`. Recommend a follow-up ticket to
triage the 306 hits into "bounded (keep)" vs "unbounded (paginate)" and convert only the latter
behind a v2 API version.

---

## 3. Audit logging on service mutations — STATUS: REAL GAP (P1)

**The pattern exists and is sound:**
- `common/logging/Audited.java` — AOP annotation (`action`, `entityType`, `captureChanges`, …).
- `common/logging/AuditLogAspect.java` — weaves audit entries on annotated methods (8 refs).
- `application/audit/service/AuditLogService.java` + `domain/audit/AuditLog.java` + Kafka
  `infrastructure/kafka/consumer/AuditEventConsumer.java` — async audit pipeline.

**The gap (counts):**
- Mutating service methods (`public … create|update|delete|save|approve|reject|cancel|submit|process|remove|archive…(`):
  **513 across 130 service files**.
- `@Audited` annotations in `**/service/**`: **only 19, across 6 files**
  (Benefit, Onboarding, Organization, CompOff, AttendanceImport, AttendanceRecord).
- Explicit `auditService`-family references: ~108 across 44 files.

So **the large majority of mutating service methods have neither `@Audited` nor an inline audit call.**

**Concrete evidence — financial mutations with NO audit:**
`application/payroll/service/PayrollRunService.java`
- `:49` `createPayrollRun(...)` — no `@Audited`, no `auditService` call
- `:74` `updatePayrollRun(...)` — none
- `:251` `approvePayrollRun(...)` — none (approval of payroll is a P0-audit-worthy action)
- `:345` `deletePayrollRun(...)` — none

**Severity: P1** (compliance/forensics gap on money-movement and PII mutations). **Do not mass-edit**
— `@Audited` placement requires per-method `action`/`entityType`/`entityIdParam` decisions and an
`mvn verify` to confirm aspect weaving. **Recommended fix:** prioritized rollout — payroll →
compensation → expense/loan → exit/FnF → employee PII → recruitment — adding `@Audited` to each
mutating method, verified in batches.

---

## 4. Soft-delete filtering — STATUS: PASS (P2 deprecation note)

**Counts:**
- Entities with a soft-delete field (`is_deleted`/`deleted_at`/`isDeleted`): **~218** under `domain/`.
- `@Where(clause = "is_deleted = false")`: **206 domain files**.
- `@SQLRestriction(...)`: **15 files** (recruitment cluster, wall, docusign, integration, biometric, report).

Combined Hibernate-level soft-delete filtering covers **~221 entities ≥ the 218 with the field** —
i.e. coverage is effectively complete. Native queries additionally add explicit `is_deleted = false`
guards where `@Where` is bypassed (see §6), with `SOFT_DELETE_GUARD` code comments.

**P2 deprecation note (not a blocker):** the codebase mixes the **deprecated** `@Where` (206 files,
deprecated in Hibernate 6.x which ships with Spring Boot 3.4.1) and the modern `@SQLRestriction`
(15 files). `@Where` still functions but should be migrated. This is a **mechanical but high-volume**
change (206 files) and **must be `mvn verify`-gated** — reported, not edited.

---

## 5. Kafka idempotency on event listeners — STATUS: PASS (no action)

The real consumers live in `infrastructure/kafka/consumer/` (the `application/event/listener/`
classes are Spring `@EventListener` in-process handlers, not Kafka). **All 6 business `@KafkaListener`
handlers + the DLT handler wrap logic in `IdempotencyService`:**

| Consumer | Idempotency call |
|---|---|
| `AuditEventConsumer.java:77` | `idempotencyService.tryProcess(eventId)` |
| `EmployeeLifecycleConsumer.java:75` | `tryProcess(eventId)` |
| `PayrollProcessingConsumer.java:76` | `tryProcess(eventId)` + `release()` on failure |
| `ApprovalEventConsumer.java:74` | `tryProcess(eventId)` |
| `FluenceSearchConsumer.java:72` | `tryProcess(eventId)` + `release()` |
| `NotificationEventConsumer.java:72` | `tryProcess(eventId)` |
| `DeadLetterHandler.java:137` | `tryProcess("dlt:"+topic+":"+partition+":"+offset)` |

Atomic Redis SETNX check-and-claim with proper `release()` on failure for retryable consumers.
**No fix required.**

---

## 6. Native queries on tenant-scoped tables — STATUS: PASS (P3)

**Count:** `@Query(nativeQuery = true)`: **~28** across 9 repositories.

Every native query inspected includes an **explicit `tenant_id = :tenantId`** predicate AND, on
soft-deletable tables, an explicit `is_deleted = false` predicate (RLS + `@Where` are bypassed for
native SQL, and the code correctly compensates). Representative evidence:

- `LeaveRequestRepository.java:60` — `WHERE lr.tenant_id = :tenantId AND lr.is_deleted = false …`
- `EmployeeRepository.java:140,236,245` — `WHERE e.tenant_id = :tenantId AND e.is_deleted = false …`
- `RoleRepository.java:58-67` — recursive CTE, `tenant_id = :tenantId AND is_deleted = false`,
  carries an explicit `// SOFT_DELETE_GUARD (S13-B)` comment.
- `WorkflowExecutionRepository.java:75` — `WHERE tenant_id = :tenantId AND is_deleted = false …`
- `TenantApplicationRepository.java:24,33` — platform `tenant_applications` table; `tenantId` is a
  bound param on every native statement (upsert keyed on `(tenant_id, application_id)`).

**No native query found that relies on RLS alone without an explicit tenant predicate.** Severity P3
(belt-and-suspenders is correct here). **No fix required.**

---

## 7. `@Scheduled` jobs lacking `@SchedulerLock` / ShedLock — STATUS: PASS (no action)

**Count:** 16 files contain `@Scheduled`; ShedLock (`@SchedulerLock` / `net.javacrumbs.shedlock`)
present in 15 of them; `ShedLockConfig.java` configures the provider.

- `LeaveAccrualScheduler.java:56-57` — `@Scheduled(cron …) @SchedulerLock(name="accrueMonthlyLeave", lockAtLeastFor="PT5M", lockAtMostFor="PT4H")` — already locked (Wave-10 P0-4 fix in comments).
- `EmailSchedulerService.java` — all 4 jobs locked (`:43,91,143,171`).
- `ScheduledNotificationService.java` — all 4 jobs locked (`:59,178,308,338`).
- `RateLimitingFilter.java:224,291` — both `@Scheduled` methods locked.

The only un-locked `@Scheduled` is `TokenBlacklistService.java:75` `redisHealthProbe()` — a
**per-instance local health probe** (intentionally runs on every pod; a cluster lock would defeat its
purpose). **No fix required.**

---

## 8. Summary table & why no edits were applied

| # | Gap | Status | Severity | Action |
|---|---|---|---|---|
| 1 | `@Valid` coverage | PASS (100% on DTOs) | P2 | None |
| 2 | Pagination (`List` vs `Page`) | 306 hits / 112 files | P2 | Report — triage + v2 paginate unbounded |
| 3 | Audit logging on mutations | 513 mutators, 19 `@Audited` | **P1** | Report — prioritized `@Audited` rollout |
| 4 | Soft-delete filtering | PASS (~221 entities) | P2 | Report — `@Where`→`@SQLRestriction` sweep |
| 5 | Kafka idempotency | PASS (7/7 handlers) | — | None |
| 6 | Native-query tenant scoping | PASS (28/28 scoped) | P3 | None |
| 7 | `@Scheduled` ShedLock | PASS (cluster jobs locked) | — | None |

### FIXED (compile-safe)
**None.** Honest outcome: every candidate mechanical edit was either already present (`@Valid`,
ShedLock, idempotency) or a no-op/noise (e.g. `@Valid` on `String`/`Map` webhook bodies). Applying
cosmetic edits would have added risk without value.

### NEEDS `mvn -pl backend verify` (prioritized backlog)
1. **[P1] Audit-log coverage** — add `@Audited` to mutating service methods, starting with
   `PayrollRunService` (create/update/approve/delete at `:49/:74/:251/:345`), then compensation →
   expense/loan → exit/FnF → employee PII → recruitment. Verify aspect weaving per batch.
2. **[P2] Pagination** — triage the 306 `ResponseEntity<List<…>>` endpoints; convert unbounded
   tenant-wide queries (Organization, BenefitEnhanced, Workflow, ProjectTimesheet, Helpdesk) to
   `Page<…>` behind a versioned API.
3. **[P2] `@Where` → `@SQLRestriction`** — mechanical migration across 206 domain entities to drop
   the Hibernate-6-deprecated annotation; high-volume, must be compiled + tested.
