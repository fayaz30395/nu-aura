---
name: distributed-scheduler-lock
tags: [scheduler, shedlock, redis, multi-pod, race-condition, scheduled]
applies_to: [backend, scheduled-jobs]
references: [audit/wave-10-deep-audit-report.md#P0-4]
---

# Distributed Scheduler Lock

## When to use

You are adding a **new `@Scheduled`** method, OR you are reviewing an existing one for the
multi-pod deployment. Production runs 3 backend replicas (`values-prod.yaml`). Without a
lock, every `@Scheduled` job fires on every replica → 3× the work, and for accumulators (leave
accrual, billing meter) → 3× the data.

This is the wave-10 P0-4 finding: `LeaveAccrualScheduler` could double/triple-credit leave
balances across replicas.

## Canonical implementation

```java
@Component
@RequiredArgsConstructor
@Slf4j
public class LeaveAccrualScheduler {

    private final LeaveAccrualService accrualService;
    private final TenantTimeService tenantTime;

    // Run at 02:05 every day. Lock for AT MOST 2 hours (defensive), AT LEAST 1 hour
    // (so a quick failure doesn't immediately retry on another pod).
    @Scheduled(cron = "0 5 2 * * *")
    @SchedulerLock(
        name = "leave-accrual-daily",
        lockAtMostFor = "PT2H",
        lockAtLeastFor = "PT1H"
    )
    public void accrueForAllTenants() {
        // ShedLock guarantees only ONE pod runs this. If we crash, the lock
        // releases after lockAtMostFor.
        tenantService.streamActiveTenants().forEach(tenant -> {
            try {
                accrualService.accrueForTenant(tenant.getId(), tenantTime.todayFor(tenant));
            } catch (Exception e) {
                log.error("Accrual failed for tenant {}", tenant.getId(), e);
                // Don't rethrow — let other tenants accrue
            }
        });
    }
}
```

### ShedLock configuration (one-time setup)

```java
// infrastructure/scheduling/SchedulerLockConfig.java
@Configuration
@EnableSchedulerLock(defaultLockAtMostFor = "PT30M")
public class SchedulerLockConfig {

    @Bean
    public LockProvider lockProvider(DataSource dataSource) {
        return new JdbcTemplateLockProvider(
            JdbcTemplateLockProvider.Configuration.builder()
                .withJdbcTemplate(new JdbcTemplate(dataSource))
                .withTableName("shedlock")
                .usingDbTime()  // use DB clock, not pod clock
                .build()
        );
    }
}
```

### Migration

```sql
-- V1NN__shedlock.sql
CREATE TABLE shedlock (
    name VARCHAR(64) PRIMARY KEY,
    lock_until TIMESTAMPTZ NOT NULL,
    locked_at  TIMESTAMPTZ NOT NULL,
    locked_by  VARCHAR(255) NOT NULL
);
-- NOT tenant-scoped: this is a system-level table.
-- NOT covered by RLS.
```

## Anti-patterns

- **DON'T** add a `@Scheduled` method without `@SchedulerLock`. Multi-pod is the default
  and the bug only manifests in production.
- **DON'T** set `lockAtMostFor` shorter than the worst-case execution time. The lock releases
  early; another pod picks it up; you double-execute.
- **DON'T** set `lockAtLeastFor = 0`. A quick failure (10ms) immediately retries on another
  pod; if the failure is deterministic, you hammer the system.
- **DON'T** rely on `lockAtLeastFor` to be exact. It's a floor, not a fence — the lock
  releases between `lockAtLeastFor` and `lockAtMostFor`.
- **DON'T** use Redis as the lock store for scheduler locks. We use PostgreSQL because we
  always have a DB; Redis-down should not stop scheduled jobs. (`FluenceEditLockService` is
  different — short-TTL UI locks where Redis-down failing closed is acceptable.)
- **DON'T** name two `@SchedulerLock`s the same. Pick a distinct, descriptive name.

## Tests required

- Integration: two `@SpringBootTest` instances with the same shedlock table → only one
  fires the scheduled method per cycle (use `@SpyBean` to count invocations across both)
- Unit: simulate a crash mid-execution → lock releases after `lockAtMostFor` (via clock
  manipulation)
- Migration: V1NN runs cleanly when `shedlock` already exists (defensive
  `CREATE TABLE IF NOT EXISTS`)

## Notes

- Existing 25 `@Scheduled` jobs (per CLAUDE.md) — audit them as a follow-up. Wave-10 P0-4
  flags this work.
- ShedLock vs custom Redis lock: we chose ShedLock because (a) battle-tested,
  (b) DB-native means it's resilient to Redis outages, (c) we already use ShedLock-equivalent
  for `FluenceEditLockService`'s short-TTL use case so the pattern is known.
- `usingDbTime()` is critical: pod clocks drift; DB clock is authoritative.
