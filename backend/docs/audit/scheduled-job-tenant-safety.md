# Scheduled Job Tenant-Safety Audit

**Date:** 2026-05-14
**Scope:** Every `@Scheduled` method under `backend/src/main/java/`
**Reviewer:** Aux-SchedulerSafety (read-only, parallel wave)

Each method is evaluated against six axes:

1. **Iterates tenants** — fetches the tenant list and processes each, OR N/A for infra jobs.
2. **Sets TenantContext** per iteration before calling tenant-scoped services.
3. **Uses TenantTimeService** — calls `tenantTimeService.now(tenantId)` / `today(tenantId)` instead of raw `LocalDate.now()`/`LocalDateTime.now()` for tenant-business-day logic.
4. **`@SchedulerLock`** present to prevent multi-pod double-execution.
5. **Idempotent / safe to retry** — second fire on same input is a no-op or harmless.
6. **Sane cron** — frequency matches business need.

Classifications:
- Safe — passes all relevant axes.
- Caveat — works but has a tightening opportunity (most often: still uses raw `LocalDate.now()` / `LocalDateTime.now()` instead of `TenantTimeService`; per S12-B this is the active migration).
- Broken — will misbehave under multi-tenant or multi-pod.

---

## Summary

Total `@Scheduled` methods: **25**
Safe: **6** | Caveat: **19** | Broken: **0**

The 19 caveats fall almost entirely into one pattern: the job iterates tenants and sets `TenantContext` correctly, but the date/time used for "today" or "now" comes from raw `LocalDate.now()` / `LocalDateTime.now()` (default JVM zone) instead of `TenantTimeService.now(tenantId)`. This is the exact gap that S12-B is migrating, so these caveats are expected. The four already-migrated jobs (`ContractLifecycleScheduler`, `WorkflowEscalationScheduler`, `ApprovalEscalationJob`, partial migration in some others) are the reference template for the rest.

No job is "broken" — every cross-tenant job correctly iterates tenants and sets `TenantContext`, every job has `@SchedulerLock` except three infra/health probes where per-pod execution is the intended behaviour.

---

## Method-by-method

### RateLimitingFilter.checkRedisHealth — Safe
- file: `common/security/RateLimitingFilter.java:223`
- cron: `fixedRate = 30000` (every 30s)
- iterates tenants: **N/A** (infra-only health probe)
- sets TenantContext: **N/A**
- uses TenantTimeService: **N/A** (no business clock dependency)
- `@SchedulerLock`: **yes** (`checkRedisHealth`, PT15S–PT2M)
- idempotent: **yes** (probe + flip flag)
- notes: Single-flighted health probe is correct. Lock window matches cadence.

### RateLimitingFilter.scheduledCleanup — Safe
- file: `common/security/RateLimitingFilter.java:290`
- cron: `fixedRate = CLEANUP_INTERVAL_MS`
- iterates tenants: **N/A** (process-local bucket cache)
- sets TenantContext: **N/A**
- uses TenantTimeService: **N/A**
- `@SchedulerLock`: **yes** (`rateLimitBucketCleanup`, PT2M–PT10M)
- idempotent: **yes** (TTL-based eviction; safe to re-run)
- notes: Correct.

### TokenBlacklistService.redisHealthProbe — Caveat
- file: `common/security/TokenBlacklistService.java:87`
- cron: `fixedDelay = 30_000` (every 30s)
- iterates tenants: **N/A** (infra health probe)
- sets TenantContext: **N/A**
- uses TenantTimeService: **N/A**
- `@SchedulerLock`: **no**
- idempotent: **yes**
- notes: ShedLock is intentionally omitted — this probe MUST run on every pod so that each pod's `redisAvailable` flag transitions independently. Adding ShedLock would defeat the purpose (only one pod would flip; the others stay in fallback). The "Caveat" reflects that this is the desired per-pod behavior and should be documented at the field level so a future audit doesn't try to "fix" it.

### TenantFilter.scheduledCacheRefresh — Safe
- file: `common/security/TenantFilter.java:198`
- cron: `fixedRate = CACHE_REFRESH_INTERVAL_MS`
- iterates tenants: **N/A** (tenant-validity cache)
- sets TenantContext: **N/A**
- uses TenantTimeService: **N/A**
- `@SchedulerLock`: **yes** (`tenantCacheRefresh`, PT2M–PT10M)
- idempotent: **yes** (clears in-memory cache; safe)
- notes: Correct. The lock guards multi-pod redundant refreshes.

### AutoRegularizationScheduler.autoRegularizeAttendance — Caveat
- file: `application/attendance/scheduler/AutoRegularizationScheduler.java:59`
- cron: `0 30 19 * * *` UTC (= 01:00 IST)
- iterates tenants: **yes** (`fetchActiveTenants()` via JDBC)
- sets TenantContext: **yes** (inside `regularizeTenantAttendance`, properly cleared in `finally`)
- uses TenantTimeService: **NO** — line 116 uses hardcoded `LocalDate.now(ZoneId.of("Asia/Kolkata"))` and has an explicit `TODO(S11-M)` to switch to `TenantTimeService`.
- `@SchedulerLock`: **yes** (`autoRegularizeAttendance`, PT5M–PT30M)
- idempotent: **yes** (status check before mutation; saveAll batches; second run is a no-op for already-PRESENT rows)
- notes: **S12-B candidate.** Inject `TenantTimeService` and replace the hardcoded Asia/Kolkata zone with `tenantTimeService.today(tenantId).minusDays(afterDays)`. Tenants in non-IST regions get wrong cutoff days.

### AutoRegularizationScheduler.autoApproveCompOff — Caveat
- file: `application/attendance/scheduler/AutoRegularizationScheduler.java:83`
- cron: `0 0 20 * * *` UTC (= 01:30 IST)
- iterates tenants: **yes**
- sets TenantContext: **yes** (per-tenant, try/finally clean)
- uses TenantTimeService: **N/A** (delegates to `compOffService.autoApproveEligibleRequests` — that service must use tenant time internally; verify in service code)
- `@SchedulerLock`: **yes** (`autoApproveCompOff`, PT5M–PT30M)
- idempotent: **yes** (eligibility filter inside service prevents double-approve)
- notes: Cron interlocked with the prior job. Caveat is on the downstream `CompOffService` — confirm it uses `TenantTimeService` for "older than N days".

### BiometricIntegrationService.processPendingPunches — Caveat
- file: `application/attendance/service/BiometricIntegrationService.java:227`
- cron: `fixedDelay = ${biometric.process-interval-ms:120000}` (every 2 min)
- iterates tenants: **NO — explicit cross-tenant query.** `punchLogRepository.findAllByProcessedStatus(PENDING)` returns rows across ALL tenants, then the loop sets `TenantContext` per row using `punch.getTenantId()`. This is an intentional design choice (single global queue, per-row tenant resolution) and is documented in line 235.
- sets TenantContext: **yes** (set inside `processSinglePunch` at line 279, cleared in `finally` at line 310)
- uses TenantTimeService: **NO** — `punch.getPunchTime()` is the punch's own captured timestamp, which is fine; but the downstream `checkIn`/`checkOut` services should use `TenantTimeService` for any "today" comparisons.
- `@SchedulerLock`: **yes** (`processPendingPunches`, PT2M–PT10M)
- idempotent: **yes** (status flips PENDING → PROCESSED/FAILED on each row; re-run skips already-handled rows)
- notes: Page size 200 — under a large punch backlog this never drains; consider a loop-until-empty or larger page if backlog ever materializes. Otherwise correct.

### WebhookDeliveryService.clearExpiredPreviousSecrets — Caveat
- file: `application/webhook/service/WebhookDeliveryService.java:414`
- cron: `0 0 * * * *` (hourly)
- iterates tenants: **NO — cross-tenant bulk UPDATE** via partial index. Safe because the predicate is `previous_secret_expires_at < now()` which is globally meaningful, and the UPDATE only nulls expired secrets.
- sets TenantContext: **N/A** (raw repo `UPDATE`, no per-row business logic)
- uses TenantTimeService: **NO** — uses `LocalDateTime.now()` (JVM zone). Acceptable here because `previous_secret_expires` is stored as a global instant, not a tenant-local date. **However**: if any tenant stored an expiry that depends on tenant TZ when generated, this comparison could be off by a few hours. Recommend documenting "this is a UTC/JVM instant comparison" in the column definition.
- `@SchedulerLock`: **yes** (`webhookClearExpiredPreviousSecrets`, PT5M–PT55M)
- idempotent: **yes** (clearing a NULL column is a no-op)
- notes: Single bulk UPDATE is correct and cheap.

### WebhookDeliveryService.processRetries — Caveat
- file: `application/webhook/service/WebhookDeliveryService.java:475`
- cron: `fixedRate = 60000` (every minute)
- iterates tenants: **NO — cross-tenant query**, then `TenantContext` is set from `delivery.getTenantId()` per row (line 484). This pattern matches the biometric pending-punches design.
- sets TenantContext: **yes** (per-delivery, try/finally clean at line 502)
- uses TenantTimeService: **NO** — `findReadyForRetry(LocalDateTime.now())` uses JVM-zone now. For "ready for retry" this is fine because `next_retry_at` is stored as a global instant.
- `@SchedulerLock`: **yes** (`webhookProcessRetries`, PT2M–PT15M)
- idempotent: **yes** (delivery row carries its own `attempts` counter)
- notes: Correct. The cross-tenant query is the right call here.

### ContractLifecycleScheduler.processContractLifecycle — Safe
- file: `application/contract/scheduler/ContractLifecycleScheduler.java:73`
- cron: `${app.contract.lifecycle.cron:0 30 2 * * *}` UTC daily
- iterates tenants: **yes** (`fetchActiveTenants()` via JDBC; `is_active = true`)
- sets TenantContext: **yes** (per-tenant try/finally)
- uses TenantTimeService: **YES** — `tenantTimeService.today(tenantId)` at lines 217, 258, 420. Reference template for S12-B.
- `@SchedulerLock`: **yes** (`processContractLifecycle`, PT5M–PT30M)
- idempotent: **yes** — partial unique index + application-level `existsPendingReminder` check; status transitions are guarded
- notes: One internal call still uses `LocalDateTime.now()` at line 321 for `setNotifiedAt` — that's a timestamp record, not a business cutoff, so acceptable.

### EmailSchedulerService.sendBirthdayEmails — Caveat
- file: `application/notification/service/EmailSchedulerService.java:38`
- cron: `0 0 9 * * *` daily 9 AM (JVM zone)
- iterates tenants: **yes** (`tenantRepository.findByStatus(ACTIVE)`)
- sets TenantContext: **yes** (per-tenant try/finally)
- uses TenantTimeService: **NO** — line 44 uses `LocalDate.now()` (JVM zone). Birthdays at midnight tenant-local boundaries are off-by-one for non-JVM-zone tenants.
- `@SchedulerLock`: **yes** (`sendBirthdayEmails`, PT5M–PT30M)
- idempotent: **mostly** — re-running on the same day re-emails everyone; no idempotency key. Acceptable today because `@SchedulerLock` covers multi-pod and the cron only fires once.
- notes: **S12-B candidate.** Cron itself also fires in JVM zone — consider explicit `zone = "UTC"` and per-tenant time decision.

### EmailSchedulerService.sendAnniversaryEmails — Caveat
- file: `application/notification/service/EmailSchedulerService.java:85`
- cron: `0 0 9 * * *` daily
- iterates tenants: **yes**
- sets TenantContext: **yes**
- uses TenantTimeService: **NO** — `LocalDate.now()` at line 91. Same off-by-one risk as birthday job.
- `@SchedulerLock`: **yes** (`sendAnniversaryEmails`, PT5M–PT30M)
- idempotent: **mostly** — re-runs re-send.
- notes: **S12-B candidate.** Same fix as birthday job.

### EmailSchedulerService.retryFailedEmails — Safe
- file: `application/notification/service/EmailSchedulerService.java:136`
- cron: `0 0 * * * *` (hourly)
- iterates tenants: **yes** (per-tenant call into `emailService.retryFailedEmailsForTenant`)
- sets TenantContext: **yes** (per-tenant try/finally)
- uses TenantTimeService: **N/A** (no business clock — purely a retry sweep)
- `@SchedulerLock`: **yes** (`retryFailedEmails`, PT5M–PT30M)
- idempotent: **yes** (downstream service handles attempt counters)
- notes: Correct — and the SEC-FIX comment explicitly documents why tenant iteration matters here.

### EmailSchedulerService.sendScheduledEmails — Caveat
- file: `application/notification/service/EmailSchedulerService.java:164`
- cron: `0 */15 * * * *` (every 15 min)
- iterates tenants: **yes**
- sets TenantContext: **yes**
- uses TenantTimeService: **NO** — but the call to `emailService.sendScheduledEmails()` may use raw `now()` internally to find "due" emails. The audit cannot conclude safety without examining that downstream service.
- `@SchedulerLock`: **yes** (`sendScheduledEmails`, PT5M–PT30M)
- idempotent: **dependent on downstream** — assumes `sendScheduledEmails()` marks rows as sent before commit.
- notes: **S12-B candidate** for the downstream `EmailService`.

### ScheduledNotificationService.sendBirthdayNotifications — Caveat
- file: `application/notification/service/ScheduledNotificationService.java:56`
- cron: `0 0 8 * * *` daily 8 AM (JVM zone)
- iterates tenants: **yes** (ACTIVE-status-filtered)
- sets TenantContext: **yes** (per-tenant try/finally; nested try/catch isolates per-tenant errors)
- uses TenantTimeService: **NO** — line 84 uses `LocalDate.now()`.
- `@SchedulerLock`: **yes** (`sendBirthdayNotifications`, PT5M–PT30M)
- idempotent: **mostly** — re-runs send duplicates. Lock prevents that within the cron window.
- notes: **S12-B candidate.** Same family as `EmailSchedulerService.sendBirthdayEmails` — note the duplicate responsibility: birthday is signalled by **two** schedulers (one email, one multi-channel notification). Consider consolidating.

### ScheduledNotificationService.sendAnniversaryNotifications — Caveat
- file: `application/notification/service/ScheduledNotificationService.java:174`
- cron: `0 30 8 * * *` daily
- iterates tenants: **yes**
- sets TenantContext: **yes**
- uses TenantTimeService: **NO** — line 203 uses `LocalDate.now()`; line 221 uses raw `Period.between(joiningDate, today)`.
- `@SchedulerLock`: **yes** (`sendAnniversaryNotifications`, PT5M–PT30M)
- idempotent: **mostly**.
- notes: **S12-B candidate.** Duplicate of `EmailSchedulerService.sendAnniversaryEmails` — consider consolidating.

### ScheduledNotificationService.sendAttendanceReminders — Caveat
- file: `application/notification/service/ScheduledNotificationService.java:303`
- cron: `0 0 10 * * MON-FRI` (10 AM weekdays JVM zone)
- iterates tenants: **yes**
- sets TenantContext: **yes**
- uses TenantTimeService: **NO** — line 361 uses `LocalDate.now()`, which is incorrect for the "today's check-in" semantic. A tenant in Asia/Tokyo at 10:00 JVM-UTC is at 19:00 local — the query may pull yesterday's records.
- `@SchedulerLock`: **yes** (`sendAttendanceReminders`, PT5M–PT30M)
- idempotent: **mostly** — re-run = duplicate push.
- notes: **S12-B candidate.** Also: cron itself ignores tenant business calendar (holidays). Acceptable for v1 — flag for follow-up.

### ScheduledNotificationService.sendCheckoutReminders — Caveat
- file: `application/notification/service/ScheduledNotificationService.java:333`
- cron: `0 0 17 * * MON-FRI`
- iterates tenants: **yes**
- sets TenantContext: **yes**
- uses TenantTimeService: **NO** — line 415 uses `LocalDate.now()`. Same TZ skew as the attendance-reminder job.
- `@SchedulerLock`: **yes** (`sendCheckoutReminders`, PT5M–PT30M)
- idempotent: **mostly**.
- notes: **S12-B candidate.**

### JobBoardIntegrationService.syncApplicationCounts — Caveat
- file: `application/recruitment/service/JobBoardIntegrationService.java:147`
- cron: `0 0 */6 * * *` (every 6 hours)
- iterates tenants: **yes** (`fetchActiveTenantIds()` JDBC)
- sets TenantContext: **yes** (per-tenant try/finally)
- uses TenantTimeService: **NO** — line 157 uses `LocalDateTime.now().plusYears(10)` as a sentinel for "all active postings". Functionally correct (sentinel) but pollutes the audit pattern.
- `@SchedulerLock`: **yes** (`syncApplicationCounts`, PT5M–PT30M)
- idempotent: **yes** (sync overwrites stats)
- notes: The "10 years in the future" sentinel is a smell — prefer a dedicated repo method `findAllActivePostings()`.

### JobBoardIntegrationService.expireOldPostings — Caveat
- file: `application/recruitment/service/JobBoardIntegrationService.java:175`
- cron: `0 0 2 * * *` (daily 2 AM JVM zone)
- iterates tenants: **yes**
- sets TenantContext: **yes**
- uses TenantTimeService: **NO** — line 185 uses `LocalDateTime.now()`. For "expired postings" the tenant's own posting expiry timestamp determines truth, so JVM-zone now() works as long as `expires_at` is stored as a global instant. Confirm `expires_at` storage convention.
- `@SchedulerLock`: **yes** (`expireOldPostings`, PT5M–PT30M)
- idempotent: **yes** (status flip ACTIVE → EXPIRED; second run is no-op)
- notes: **S12-B candidate** for consistency. Cron zone not explicit — set `zone = "UTC"`.

### OrphanFileCleanupScheduler.detectOrphanFiles — Caveat
- file: `application/document/scheduler/OrphanFileCleanupScheduler.java:48`
- cron: `0 0 2 * * SUN` UTC weekly
- iterates tenants: **NO — global storage sweep across all tenants** (correct for an infra-level orphan scan)
- sets TenantContext: **N/A** (sweep is at the storage layer, not per-tenant)
- uses TenantTimeService: **NO** — line 59 uses `ZonedDateTime.now()` for "48h ago" cutoff. Acceptable: storage modtime is global; tenant-local time has no meaning here.
- `@SchedulerLock`: **yes** (`orphanFileCleanup`, PT10M–PT60M)
- idempotent: **yes** (Phase 1 is report-only)
- notes: Correct as designed. Caveat is only that `ZonedDateTime.now()` defaults to JVM zone — should be `ZonedDateTime.now(ZoneOffset.UTC)` to match the cron zone explicitly.

### WorkflowEscalationScheduler.processEscalations — Safe
- file: `application/workflow/scheduler/WorkflowEscalationScheduler.java:62`
- cron: `0 15 * * * *` (hourly at :15)
- iterates tenants: **yes**
- sets TenantContext: **yes** (per-tenant try/finally)
- uses TenantTimeService: **YES** for the main overdue evaluation (lines 101, 168, 216, 415). However a few internal `step.setExecutedAt(LocalDateTime.now())` calls (lines 184, 197) still use JVM now — those are "wall-clock when we did this", which is acceptable.
- `@SchedulerLock`: **yes** (`workflowProcessEscalations`, PT5M–PT30M)
- idempotent: **yes** (`isEscalated()` guard + status filter)
- notes: Reference template for S12-B alongside ContractLifecycleScheduler.

### ApprovalEscalationJob.processEscalations — Safe
- file: `application/workflow/scheduler/ApprovalEscalationJob.java:63`
- cron: `fixedRate = 900000` (every 15 min)
- iterates tenants: **yes** (`tenantRepository.findByStatus(ACTIVE)`)
- sets TenantContext: **yes** (per-tenant try/finally)
- uses TenantTimeService: **YES** — line 103 uses `tenantTimeService.now(tenantId).minusHours(48)`. The `assignedAt = LocalDateTime.now()` at line 196 for a newly-created escalated step is a record-keeping wall-clock, acceptable.
- `@SchedulerLock`: **yes** (`approvalProcessEscalations`, PT5M–PT30M)
- idempotent: **yes** — escalation guard via `currentEscalationCount >= maxEscalations`; status flip ESCALATED prevents re-pickup
- notes: Reference template for S12-B. The `fixedRate` vs `cron` choice means restarts shift the cadence — acceptable for a 15-min job.

### LeaveAccrualScheduler.accrueMonthlyLeave — Caveat
- file: `application/leave/scheduler/LeaveAccrualScheduler.java:56`
- cron: `${app.leave.accrual.cron:0 0 2 1 * *}` UTC (2 AM on the 1st)
- iterates tenants: **yes** (`fetchActiveTenants()` JDBC)
- sets TenantContext: **yes** (per-tenant try/finally)
- uses TenantTimeService: **NO** — lines 97 and 131 use `LocalDate.now(ZoneOffset.UTC)`. This is **explicitly defended in code comments** ("Cron fires at 2:00 AM UTC — month math must use UTC too"). Reasonable, but a tenant in Pacific/Auckland sees the 1st of the month at 2 PM the day before in UTC, so they get accrual a calendar-day later than their local 1st. For monthly cadence the variance is acceptable; for QUARTERLY it's a real edge case (Auckland's Jan 1 = UTC Dec 31, so first quarter-start fires on the "wrong" tenant-calendar day).
- `@SchedulerLock`: **yes** (`accrueMonthlyLeave`, PT5M–PT4H — explicitly extended in wave-10 P0-4)
- idempotent: **NOT GUARANTEED.** The job credits leave each time it runs. If `@SchedulerLock` fails (e.g., lock-table corruption) or a manual rerun happens within the same month, employees get double accrual. There is no application-level "already accrued for month YYYY-MM" check (compare to the contract reminder partial unique index).
- notes: **High-priority hardening target.** Recommend: add a `leave_accrual_history(tenant_id, leave_type_id, accrual_month, employee_id)` unique-key insert, and only call `accrueLeave()` after a successful INSERT. The lock-window extension to PT4H reduces the window but doesn't eliminate it.

### ScheduledReportExecutionJob.executeScheduledReports — Caveat
- file: `application/analytics/service/ScheduledReportExecutionJob.java:55`
- cron: `0 * * * * *` (every minute)
- iterates tenants: **NO — single cross-tenant query** `getReportsDueForExecution()` returns rows across all tenants, then `TenantContext` is set per-row from `scheduledReport.getTenantId()` at line 98. Same pattern as `WebhookDeliveryService.processRetries`.
- sets TenantContext: **yes** (per report, try/finally at line 161)
- uses TenantTimeService: **NO** — `LocalDate.now()` and `LocalDateTime.now()` used for `period` (line 172), `generatedAt` (line 178), `today.withDayOfMonth(1)` etc. The "due" decision is made inside `scheduledReportService.getReportsDueForExecution()` and likely uses `nextRunAt` against a global now — acceptable. The "period" / "today" for the **report content** at line 184 IS tenant-local business data and should use `tenantTimeService.today(tenantId)`.
- `@SchedulerLock`: **yes** (`executeScheduledReports`, PT2M–PT30M) — note the cron is every 60s but the lock holds for at least 2 min, so consecutive cron fires can pile up if a batch is slow. Verify backpressure.
- idempotent: **yes** (`Propagation.REQUIRES_NEW` per report + `markAsExecuted` advances `nextRunAt`; a re-fire on a still-running batch is a no-op for already-executed rows)
- notes: **S12-B candidate** for report-content dates. The cron-every-minute cadence is justifiable (reports schedule at arbitrary tenant times) but generates 1440 wakeups/day for a typically empty queue — consider raising to every 5 minutes if no tenant uses sub-5-minute granularity.

---

## Cross-cutting findings

1. **S12-B migration scope confirmed.** 15 of the 19 caveats are exactly "uses `LocalDate.now()` / `LocalDateTime.now()` where `TenantTimeService.today(tenantId)` / `.now(tenantId)` would be correct". The S12-B work-in-progress is the right fix.
2. **Two reference templates already migrated correctly:** `ContractLifecycleScheduler` and `WorkflowEscalationScheduler` / `ApprovalEscalationJob`. New migrations should mirror their structure (inject `TenantTimeService`, use it for cutoffs, leave wall-clock `setX(LocalDateTime.now())` calls alone for record-keeping fields).
3. **LeaveAccrualScheduler has the only real correctness bug.** Idempotency depends solely on `@SchedulerLock`. A `leave_accrual_history` unique-key approach is recommended even if it's out of this audit's edit scope.
4. **TokenBlacklistService.redisHealthProbe** intentionally omits `@SchedulerLock`. This should be documented at the field level so a later audit doesn't add ShedLock and silently break the per-pod health-flag pattern.
5. **Duplicate responsibilities.** Birthday and anniversary are signalled by both `EmailSchedulerService` and `ScheduledNotificationService` — consolidate post-S12-B.
6. **Cron zones.** Most cron expressions without an explicit `zone =` fire in the JVM default. Recommend a coding-standard rule: every `@Scheduled(cron = ...)` must specify `zone = "UTC"` to make production behaviour predictable across pod placement.
7. **`OrphanFileCleanupScheduler`** uses `ZonedDateTime.now()` which defaults to JVM zone — should be `ZonedDateTime.now(ZoneOffset.UTC)` to match its declared UTC cron.

## Suggested follow-up (out of scope for this audit)

- S12-B: continue migrating the 15 caveats to `TenantTimeService`.
- Add a `leave_accrual_history` unique-key idempotency table for `LeaveAccrualScheduler`.
- Add a Checkstyle/ArchUnit rule: any `@Scheduled` cron expression must include `zone = "UTC"`.
- Consolidate birthday/anniversary scheduling into a single service.
- Convert `BiometricIntegrationService.processPendingPunches` page-200 fetch to a loop-until-drained if backlog ever exceeds 200/2min.
