# Tenant-Aware Time Migration Guide

How to migrate a new service away from `LocalDate.now()` / `LocalDateTime.now()` and onto
`TenantTimeService`. Audience: future contributors writing or touching backend services that
deal with dates, schedules, accruals, cutoffs, expiry windows, or anything time-sensitive.

---

## 1. Why this matters

NU-AURA is multi-tenant and **country-aware** (the `country` column landed in V155; the IANA
`timezone` column on `tenants` landed in [V165](../../src/main/resources/db/migration/V165__tenant_timezone.sql)).
A `LocalDate.now()` call with no zone reads the JVM default — fine while every tenant lives in
IST and the pods run in `Asia/Kolkata`, **silently wrong** the moment a tenant in a different
zone is onboarded or the pod gets rescheduled to a UTC node. Payroll cutoffs, attendance
windows, leave accrual years, contract reminders, and expiry alerts all become "wrong by one
day" without a stack trace. The fix is to route every "now" through
[`TenantTimeService`](../../src/main/java/com/nulogic/common/util/TenantTimeService.java),
which resolves the tenant's stored zone from the [`Tenant`](../../src/main/java/com/nulogic/domain/tenant/Tenant.java)
entity (cached for 1 hour) and falls back to `Asia/Kolkata` only when the row or zone string is
unusable.

The S12-B wave migrated the first 28 sites. The broader
[unzoned-now audit](../audit/unzoned-now-audit.md) tracks ~145 P0 sites remaining. This guide
is the recipe for closing each one.

---

## 2. The 4-step recipe

### Step 1 — Inject `TenantTimeService`

Add a Lombok-managed final field. The class must already use `@RequiredArgsConstructor` (or
add it); if it has an explicit constructor, add the parameter and assign it.

```java
import com.nulogic.common.util.TenantTimeService;

@Service
@RequiredArgsConstructor
@Slf4j
public class MyService {
    private final MyRepository myRepository;
    private final TenantTimeService tenantTimeService; // <— add this
}
```

### Step 2 — Source the tenant id in scope

Pick the strategy that matches the calling context (see Section 3 for full snippets):

| Context | How to get `tenantId` |
|---|---|
| Request-path service / controller | `TenantContext.requireCurrentTenant()` |
| `@Scheduled` job | loop variable from `fetchActiveTenants()` |
| `@EventListener` | `event.getTenantId()` |
| Entity `@PrePersist` / `@PreUpdate` | `entity.getTenantId()` — **see anti-pattern note in §3.4** |

### Step 3 — Replace the call

```java
// Before
LocalDate today = LocalDate.now();
LocalDateTime now = LocalDateTime.now();
LocalDate todayIst = LocalDate.now(ZoneId.of("Asia/Kolkata"));

// After
LocalDate today = tenantTimeService.today(tenantId);
LocalDateTime now = tenantTimeService.now(tenantId);
LocalDate today  = tenantTimeService.today(tenantId); // replaces the hardcoded IST too
```

If you need the zone itself (e.g. for `Year.now(zone)` or formatting), use
`tenantTimeService.zoneFor(tenantId)`.

### Step 4 — Update tests

Mockito-based unit tests need the new collaborator stubbed, otherwise every `today(...)` call
returns `null` and assertions blow up far from the cause:

```java
@Mock
private TenantTimeService tenantTimeService;

@BeforeEach
void setUp() {
    // Default stub — return real today() for tests that don't care about zone semantics.
    // Override per-test with .thenReturn(LocalDate.of(2026, 5, 14)) when the date matters.
    lenient().when(tenantTimeService.today(any())).thenReturn(LocalDate.now());
    lenient().when(tenantTimeService.now(any())).thenReturn(LocalDateTime.now());
}
```

See [`ContractServiceTest`](../../src/test/java/com/nulogic/application/contract/service/ContractServiceTest.java#L69)
lines 69–98 for the canonical setup.

---

## 3. Patterns by context

### 3.1 Request-context service

Tenant comes from the thread-local `TenantContext` populated by `TenantFilter`. Use
`requireCurrentTenant()` — never `getCurrentTenant()` — so a missing context fails loud instead
of leaking across tenants.

Reference: [`LeaveBalanceService:55-63`](../../src/main/java/com/nulogic/application/leave/service/LeaveBalanceService.java#L55)

```java
@Transactional(isolation = Isolation.REPEATABLE_READ)
public LeaveBalance getOrCreateBalance(UUID employeeId, UUID leaveTypeId, Integer year) {
    UUID tenantId = TenantContext.requireCurrentTenant();
    int currentYear = tenantTimeService.today(tenantId).getYear();
    return leaveBalanceRepository
            .findByEmployeeIdAndLeaveTypeIdAndYearAndTenantId(
                    employeeId, leaveTypeId, currentYear, tenantId)
            .orElseGet(() -> createBalanceForYear(employeeId, leaveTypeId, currentYear, tenantId));
}
```

### 3.2 `@Scheduled` job

Schedulers run outside any request — there is no thread-local tenant. The pattern is:
enumerate active tenants, set `TenantContext` per iteration (so repository tenant filters
still work), pass `tenantId` explicitly to `tenantTimeService`.

Reference: [`WorkflowEscalationScheduler:62-93`](../../src/main/java/com/nulogic/application/workflow/scheduler/WorkflowEscalationScheduler.java#L62)

```java
@Scheduled(cron = "0 15 * * * *")
@SchedulerLock(name = "workflowProcessEscalations", lockAtLeastFor = "PT5M", lockAtMostFor = "PT30M")
public void processEscalations() {
    for (UUID tenantId : fetchActiveTenants()) {
        try {
            TenantContext.setCurrentTenant(tenantId);
            LocalDateTime now = tenantTimeService.now(tenantId);
            stepExecutionRepository.findOverdueStepsWithExecution(tenantId, now)
                    .forEach(this::escalateIfDue);
        } catch (Exception e) { // scheduled-job error boundary
            log.error("Escalation failed for tenant {}: {}", tenantId, e.getMessage(), e);
        } finally {
            TenantContext.clear();
        }
    }
}
```

Always wrap in `try/finally` with `TenantContext.clear()` — schedulers run on a pooled thread
that the next tick will reuse.

### 3.3 `@EventListener`

Domain events carry their own tenant id (set when the event was published). Read it from the
event, don't trust the listener thread.

Reference: [`OfferLetterSignatureListener:73-93`](../../src/main/java/com/nulogic/application/recruitment/listener/OfferLetterSignatureListener.java#L73)

```java
@EventListener
@Transactional
public void handleSignatureCompleted(SignatureCompletedEvent event) {
    TenantContext.setCurrentTenant(event.getTenantId());
    try {
        Candidate candidate = candidateRepository
                .findByIdAndTenantId(extractCandidateId(event), event.getTenantId())
                .orElseThrow();
        switch (event.getStatus()) {
            case COMPLETED -> candidate.setOfferAcceptedDate(
                    tenantTimeService.today(event.getTenantId()));
            case DECLINED  -> candidate.setOfferDeclinedDate(
                    tenantTimeService.today(event.getTenantId()));
            default -> { /* ignore */ }
        }
        candidateRepository.save(candidate);
    } finally {
        TenantContext.clear();
    }
}
```

### 3.4 Entity `@PrePersist` / `@PreUpdate`

**This is the hard case.** JPA callbacks are invoked by Hibernate on the entity instance —
there is no DI, no constructor injection, no field-level access to `TenantTimeService`.

Today's pattern (e.g. [`TalentPoolMember:45-53`](../../src/main/java/com/nulogic/domain/organization/TalentPoolMember.java#L45))
still uses `LocalDate.now()`:

```java
@PrePersist
public void prePersist() {
    if (addedDate == null) {
        addedDate = LocalDate.now(); // <— unzoned, audit P0
    }
    if (status == null) {
        status = MemberStatus.ACTIVE;
    }
}
```

**Two acceptable fixes**, in order of preference:

1. **Move the default into the service layer.** The repository's caller already knows the
   tenant id and has `TenantTimeService` injected. Set `entity.setAddedDate(tenantTimeService.today(tenantId))`
   in the create method, drop the line from `@PrePersist`. This is the canonical fix and the
   one the audit recommends.
2. **Static seam.** If callback logic must stay on the entity (multi-entry-point legacy code),
   expose a static `TenantTimeService` setter wired by a `@Component @PostConstruct` adapter
   and call it from the callback. Used sparingly — gets you out of trouble without a full
   service refactor, but couples the entity to Spring lifecycle.

Do **not** read `TenantContext` directly from a callback; the JPA flush may happen on a
different thread than the request that triggered it (async listeners, transactional sync).

---

## 4. Anti-patterns

| Anti-pattern | Why it's wrong | Fix |
|---|---|---|
| `LocalDate.now()` / `LocalDateTime.now()` zero-arg | Reads JVM default zone; silently drifts when the pod moves zones or a non-IST tenant onboards. | `tenantTimeService.today(tenantId)` |
| `LocalDate.now(ZoneId.of("Asia/Kolkata"))` | Hardcoded IST assumption — locks the platform to India-only. Originally written when V165 didn't exist; legacy debt. | `tenantTimeService.today(tenantId)` |
| `Year.now(ZoneId.of("Asia/Kolkata")).getValue()` | Same as above. There are still `TODO(S11-M)` markers in `LeaveBalanceService:234` and similar lines tagging these. | `tenantTimeService.today(tenantId).getYear()` |
| Catching `DateTimeException` to fall back to UTC | `TenantTimeService` already falls back (to `Asia/Kolkata`, per app convention) and logs at ERROR. Catching and re-falling-back masks the audit signal. | Let `TenantTimeService` handle it; remove the local try/catch. |
| Reading `TenantContext` inside an entity callback | Callback may run on a different thread than the originating request; context will be null or, worse, **wrong tenant**. | Move the default to the service layer. |
| Using `ZonedDateTime.now()` for "now" | Inconsistent with the rest of the codebase, which is `LocalDate` + tenant zone. | `tenantTimeService.now(tenantId)`; if you genuinely need an `Instant`, just use `Instant.now()` — instants are zone-free. |

---

## 5. References

- **Production class:** [`backend/src/main/java/com/nulogic/common/util/TenantTimeService.java`](../../src/main/java/com/nulogic/common/util/TenantTimeService.java)
- **Tenant entity (timezone column):** [`backend/src/main/java/com/nulogic/domain/tenant/Tenant.java`](../../src/main/java/com/nulogic/domain/tenant/Tenant.java)
- **DB migration:** [`backend/src/main/resources/db/migration/V165__tenant_timezone.sql`](../../src/main/resources/db/migration/V165__tenant_timezone.sql)
- **TenantContext API:** [`backend/src/main/java/com/nulogic/common/security/TenantContext.java`](../../src/main/java/com/nulogic/common/security/TenantContext.java)
- **Backlog audit (P0 sites remaining):** [`backend/docs/audit/unzoned-now-audit.md`](../audit/unzoned-now-audit.md)
- **Initial migration wave:** `git log --grep "S12-B"` — 28 sites across attendance,
  contract, recruitment, workflow, payroll, leave, helpdesk, LMS. Canonical examples:
  - Scheduler: [`ContractLifecycleScheduler:216-258`](../../src/main/java/com/nulogic/application/contract/scheduler/ContractLifecycleScheduler.java#L216)
  - Listener: [`OfferLetterSignatureListener:77-86`](../../src/main/java/com/nulogic/application/recruitment/listener/OfferLetterSignatureListener.java#L77)
  - Request-context service: [`LeaveBalanceService:161-219`](../../src/main/java/com/nulogic/application/leave/service/LeaveBalanceService.java#L161)
  - Test setup: [`ContractServiceTest:69-98`](../../src/test/java/com/nulogic/application/contract/service/ContractServiceTest.java#L69)
- **Follow-up wave:** `git log --grep "S14-C"` — 5 service+test pairs migrated using this
  recipe; use these as reviewer-approved templates.
