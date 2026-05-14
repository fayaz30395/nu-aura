# ADR-012: Tenant-Aware Timezone Handling

**Status:** Proposed
**Date:** 2026-05-14
**Decision Makers:** Backend Architecture, Payroll Team
**Closes:** wave-10 P0-1, P0-3
**Related:** `docs/audit/frontend-date-handling.md`

---

## Context

The wave-10 audit identified **855 callsites** of `LocalDate.now()`, `LocalDateTime.now()`, or
`Instant.now()` in backend Java code that do NOT pass an explicit `ZoneId`. The JVM default
zone is whatever the container inherits — in our GKE deployment that is UTC because the
base image doesn't pin `TZ`.

This is not academic. An Indian tenant pays payroll on calendar boundaries. A Friday-evening
payroll run started at 18:35 IST executes on a UTC pod where it's 13:05 UTC the same day —
fine. But a Friday 23:30 IST run is Saturday 18:00 UTC, so `LocalDate.now()` returns Saturday.
Every payslip dated Saturday, every attendance "today" view, every leave-accrual cycle anchor
is off by one day.

Two existing scaffolds:

1. `common/util/TenantTimeService.java` — already exists but is used in only 12 of the 855
   callsites. It centralizes "tenant-zone now."
2. `common/util/TenantTimestamp.java` — a JPA `@PrePersist`/`@PreUpdate` listener that fills
   `createdAt`/`updatedAt` using tenant time.

Missing: a `Tenant.timezone` column. Currently `Tenant` has `country` but no explicit
timezone (resolved implicitly as `country=IN → Asia/Kolkata`). A US tenant could be PST or
EST and we can't tell.

---

## Decision

**Three coordinated changes:**

### 1. Add `tenants.timezone` column (V163 migration)

```sql
ALTER TABLE tenants
  ADD COLUMN timezone VARCHAR(40) NOT NULL DEFAULT 'Asia/Kolkata';

-- Validity check at app start (TenantTimezoneValidator @PostConstruct):
-- iterates SELECT id, timezone FROM tenants and calls ZoneId.of(timezone).
-- Any invalid value fails the boot.
```

### 2. Pin container timezone to UTC, never JVM-default

```yaml
# backend Dockerfile / values-prod.yaml
env:
  - name: TZ
    value: "UTC"
JAVA_OPTS: "... -Duser.timezone=UTC ..."
```

Rationale: we want the JVM default to be **explicit and well-known**, not whatever the base
image happens to inherit. UTC, not `Asia/Kolkata`, because (a) it matches our DB convention
of storing `TIMESTAMPTZ` in UTC, and (b) it forces every code path that cares about local
time to go through `TenantTimeService`.

### 3. Migrate all 855 callsites to `TenantTimeService`

Phased over three sprints. Phase order:

| Phase | Surface area | Why this order |
|-------|--------------|----------------|
| 1     | `application/payroll/`, `application/leave/scheduler/` | Direct money / leave-balance impact |
| 2     | `application/attendance/`, controllers, `@Scheduled` jobs | "Today" semantics |
| 3     | Audit logs, metrics, low-impact paths | These can stay UTC indefinitely; migration is cleanup |

A SpotBugs custom rule `DateTimeNowWithoutZoneDetector` flags any new occurrence of
`LocalDate.now()` / `LocalDateTime.now()` / `Instant.now()` without a `ZoneId` arg. Builds
fail with the rule once Phase 1 is complete.

### Canonical pattern

```java
// BAD
LocalDate today = LocalDate.now();

// GOOD
LocalDate today = tenantTimeService.today();  // resolves tenant from TenantContext

// ALSO GOOD (when you want a stable, non-tenant time, e.g. for system logs)
Instant now = Instant.now();  // UTC, no ambiguity
```

`TenantTimeService.today()` reads `TenantContext.currentTenant()` → looks up
`tenants.timezone` (cached) → returns `LocalDate.now(zoneId)`.

---

## Rationale

### Alternatives considered

**A. Pin JVM to `Asia/Kolkata` and ignore the problem.**
Rejected: works for IN-only tenants today but blocks the global expansion called out in
S7-B/S9-D. The whole point of having multi-tenant support is to support tenants in
different zones.

**B. Store timezone per-user instead of per-tenant.**
Rejected as the primary mechanism: payroll and leave accrual cycles are tenant-level
operations and need tenant-level time. A future ADR can add `users.timezone` for UI
"viewer's local time" but that's a different problem.

**C. Use `Instant` everywhere and convert at render time.**
The right answer for `TIMESTAMPTZ` columns (we already do this — DB stores UTC, JPA gives us
`OffsetDateTime`). But many payroll and leave concepts are **calendar-day**, not instant —
"the 15th of the month" is fuzzy in UTC if the tenant is in IN. So we still need a
tenant-zone `LocalDate.now()`.

### Why graceful resolution

`TenantTimeService.today()` falls back to `Asia/Kolkata` if `TenantContext` is unset
(matches the dominant tenant base today). This is consistent with the RLS graceful-mode
philosophy in ADR-010: out-of-context code paths (migrations, ops scripts) get a sensible
default rather than crashing.

---

## Consequences

### Positive

- Cross-zone payroll bugs become structurally impossible at the controller path.
- Future global expansion is unblocked (US, UK, AU tenants).
- One place to audit: `TenantTimeService` usage.

### Negative

- 855 callsites to migrate. Mechanical but not zero — Phase 3 may take a sprint.
- Cache-warmup adds a tenant→timezone lookup. Already O(1) via `CacheConfig`'s
  `tenant.timezone` cache (TTL: 24h).
- Wall-clock-dependent tests must seed `TenantContext` with a stable timezone in setup.

### Mitigations

- Static analysis rule enforces the pattern on new code.
- The fallback-to-`Asia/Kolkata` keeps unconverted callsites working during the phased
  migration.
- The cache invalidates on tenant update (already wired via `TenantUpdated` event).

---

## Edge cases

| Scenario | Behaviour |
|----------|-----------|
| Tenant updates timezone | Cache invalidates on `TenantUpdated` event. Next request sees new TZ. In-flight requests use the snapshot they read. |
| Scheduled job runs at the tenant's midnight | ShedLock-wrapped scheduler iterates tenants and calls `tenantTimeService.todayFor(tenant)` — no `TenantContext` ambiguity. |
| Daylight saving transition | `ZoneId.of("America/New_York")` handles DST. `LocalDate` is unambiguous; `LocalDateTime` at the transition gap/overlap requires `withResolverStyle` — flagged in code review for any time-of-day-sensitive logic. |
| Tenant has invalid TZ string in DB | App fails to start (validator @PostConstruct). Operator alerted. Better than running with a guessed default. |

---

## Verification

Integration test `TenantTimeServiceIntegrationTest`:

- `todayResolvesPerTenant` — two tenants with different TZs see different `today()` at the
  same UTC instant (test runs at 19:00 UTC on Dec 31 → IN tenant sees Jan 1, US-East tenant
  sees Dec 31)
- `fallbackWhenContextUnset` — no `TenantContext` → returns `Asia/Kolkata` time

Migration validation: `V163` Flyway migration includes a `DO $$ ... $$` block that asserts
every `tenants.timezone` value parses as a valid IANA zone (runs `EXECUTE format('SET timezone
TO %L', timezone)` and catches the error).

---

## Implementation Checklist

- [ ] V163 migration: `tenants.timezone` column + default + validity check
- [ ] `TenantTimezoneValidator` @PostConstruct
- [ ] Update `tenant.timezone` Redis cache invalidation in `TenantService.update()`
- [ ] Pin container `TZ=UTC` in `Dockerfile` and `values-prod.yaml`
- [ ] Phase 1 migration: payroll + leave-accrual callsites
- [ ] SpotBugs `DateTimeNowWithoutZoneDetector`
- [ ] Phase 2 + Phase 3 migration tickets (separate sprints)
- [ ] Frontend `frontend/lib/datetime.ts` mirrors the pattern (tracked in
      `docs/audit/frontend-date-handling.md`)

---

## Related Decisions

- [ADR-001](ADR-001-multi-tenant-architecture.md) — tenant is the primary scope unit
- [ADR-010](ADR-010-row-level-security-tenancy.md) — graceful-mode parallel
- [Audit: frontend-date-handling.md](../audit/frontend-date-handling.md) — frontend mirror
