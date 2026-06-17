---
title: Reusable Code Patterns
tags: [architecture, patterns, redis, multi-tenant, backend, reference]
summary: "Reference for seven cross-cutting backend coordination patterns: Redis caching, RLS tenant scoping, Kafka idempotency, distributed rate limiting, token blacklist, distributed locks (Redis edit-lock + ShedLock job-lock)."
---

# Reusable Code Patterns

Cross-cutting backend patterns that recur across the platform. Each section gives the
**problem** it solves, the **solution** as implemented, short verified code excerpts, and
**where it is used**. Every claim is grounded in a file path you can open.

A unifying theme runs through all of these: **Redis is the distributed coordination layer,
and every Redis-dependent path degrades gracefully** (in-memory fallback or fail-open/closed)
so a Redis outage never takes the whole API down.

```mermaid
flowchart TD
    REQ[HTTP request] --> RL[Rate limiting<br/>DistributedRateLimiter]
    REQ --> TC[TenantContext<br/>ThreadLocal tenant id]
    TC --> TX[TenantRlsTransactionManager<br/>SET LOCAL app.current_tenant_id]
    TX --> PG[(PostgreSQL<br/>RLS policies)]
    SVC[Service layer] -->|@Cacheable| CACHE[CacheConfig<br/>25 named caches]
    SVC -->|write event| EP[EventPublisher<br/>outbox_events table]
    EP -.->|polled by| OUTBOX[OutboxEventProcessor]
    OUTBOX -->|dispatch| CONS[Kafka consumer handlers]
    OUTBOX -->|tryProcess| IDEM[IdempotencyService<br/>SETNX dedup]
    AUTH[Auth / logout] --> BL[TokenBlacklistService]
    EDIT[Fluence editing] --> LOCK[FluenceEditLockService]
    RL -.-> REDIS[(Redis)]
    CACHE -.-> REDIS
    IDEM -.-> REDIS
    BL -.-> REDIS
    LOCK -.-> REDIS
    SCHED[Scheduled jobs] --> SHED[ShedLock<br/>shedlock DB table]
    SHED -.-> PG
```

See [[Services]] for where these patterns are wired into the service layer, [[Middleware]]
for the request-filter consumers (rate limiting, tenant context, JWT/token-blacklist), and
[[Schema]] for the database structures the RLS and ShedLock patterns rely on.

---

## 1. Redis Caching (`CacheConfig`)

**File:** `backend/src/main/java/com/nulogic/common/config/CacheConfig.java`

### Problem
Reference data (leave types, departments, roles, permissions) is read on nearly every
request but changes rarely. Hitting PostgreSQL each time wastes connections and adds
latency. In a multi-tenant app, a naive cache key risks serving **one tenant's data to
another**.

### Solution
Spring's `@EnableCaching` backed by a `RedisCacheManager` with **tiered, per-cache TTLs**
and a **tenant-aware key generator** that prefixes every key with the current tenant ID.
Cache failures degrade to direct DB reads instead of throwing.

TTL tiers (`CacheConfig.cacheManager`):

| Tier | TTL | Example caches |
|------|-----|----------------|
| Long-lived | 24h | `LEAVE_TYPES`, `DESIGNATIONS`, `SHIFT_POLICIES`, `HOLIDAYS`, `PERMISSIONS`, `ROLES`, `UPCOMING_BIRTHDAYS`, `UPCOMING_ANNIVERSARIES` |
| Medium | 4h | `DEPARTMENTS`, `OFFICE_LOCATIONS`, `BENEFIT_PLANS`, `TENANT_SETTINGS`, `FEATURE_FLAGS`, `TENANT_ATTENDANCE_CONFIG` |
| Short | 30m / 15m / 10m | `ACTIVE_WEBHOOKS` (30m); `EMPLOYEES`, `EMPLOYEE_BASIC`, `ROLE_PERMISSIONS` (15m); `EMPLOYEE_WITH_DETAILS` (10m) |
| Medium-short | 1h | `WEBHOOKS` |
| Volatile | 5m | `LEAVE_BALANCES`, `ANALYTICS_SUMMARY`, `DASHBOARD_METRICS` |
| Near-real-time | 30s | `TENANT_STATUS` (JWT-filter tenant check), `UNREAD_COUNT_BY_USER` (bell-icon poll) |

The tenant-aware key generator prevents cross-tenant collisions:

```java
// CacheConfig#keyGenerator — key format: tenant:{tenantId}:{ClassName}:{method}:{params}
UUID tenantId = TenantContext.getCurrentTenant();
StringJoiner joiner = new StringJoiner(":");
joiner.add("tenant");
joiner.add(tenantId != null ? tenantId.toString() : "global");
joiner.add(target.getClass().getSimpleName());
joiner.add(method.getName());
for (Object param : params) {
    joiner.add(param != null ? param.toString() : "null");
}
return joiner.toString();
```

Graceful degradation — `CacheConfig#errorHandler()` logs and bypasses cache on Redis
failure, so the application falls through to the database rather than returning 500s:

```java
public void handleCacheGetError(RuntimeException exception, Cache cache, Object key) {
    log.warn("Cache GET failed for key={} in cache={}: {}", key, cache.getName(), exception.getMessage());
}
```

### Usage pattern
```java
@Cacheable(value = CacheConfig.LEAVE_TYPES, key = "#tenantId")
public List<LeaveType> getLeaveTypes(UUID tenantId) { ... }

@CacheEvict(value = CacheConfig.LEAVE_TYPES, key = "#tenantId")
public void invalidateLeaveTypes(UUID tenantId) { ... }
```

### Where used
- `backend/src/main/java/com/nulogic/common/config/CacheWarmUpService.java` — pre-loads
  long-lived caches per tenant on startup.
- `backend/src/main/java/com/nulogic/common/security/SecurityService.java` and
  `application/user/service/RoleManagementService.java` — cache role/permission lookups
  (`ROLE_PERMISSIONS`, `PERMISSIONS`). See [[Permissions]] and [[Roles]].
- `TENANT_STATUS` / `UNREAD_COUNT_BY_USER` notes in `CacheConfig` document the JWT-filter
  and notification bell-icon consumers that drove the 30s TTLs.

> The `cacheManager` bean is `@ConditionalOnBean(RedisConnectionFactory.class)` — when
> Redis is absent (some local/test profiles) caching is simply disabled.

---

## 2. RLS Tenant Scoping (`TenantRlsTransactionManager` + `TenantContext`)

**Files:**
`backend/src/main/java/com/nulogic/common/config/TenantRlsTransactionManager.java`,
`backend/src/main/java/com/nulogic/common/security/TenantContext.java`,
`backend/src/main/java/com/nulogic/common/security/RlsStartupProbe.java`,
`backend/src/main/resources/db/migration/V177__strict_tenant_rls_policies.sql`

### Problem
This is a **shared-database, shared-schema** multi-tenant app: every tenant-aware table
carries `tenant_id`. Application-layer `WHERE tenant_id = ?` filtering is the first line of
defense, but a single forgotten clause leaks another tenant's rows. PostgreSQL RLS policies
provide defense-in-depth — but those policies read the session variable
`app.current_tenant_id`, which Spring's stock `JpaTransactionManager` never sets.

### Solution
Two layers that must agree:

1. **Application layer** — `TenantContext` is a `ThreadLocal<UUID>` populated by the request
   filter. Service code calls `requireCurrentTenant()` to fail fast when context is missing:

   ```java
   public static UUID requireCurrentTenant() {
       UUID tenantId = currentTenant.get();
       if (tenantId == null) {
           throw new IllegalStateException(
               "Tenant context not set. This operation requires a valid tenant context...");
       }
       return tenantId;
   }
   ```

2. **Database layer** — `TenantRlsTransactionManager` extends `JpaTransactionManager` and,
   right after the transaction begins, sets the PostgreSQL session variable from the
   ThreadLocal using a **transaction-scoped `SET LOCAL` via bound parameter** (no string
   concatenation — CRIT-002):

   ```java
   private static final String SET_TENANT_SQL =
       "SELECT set_config('app.current_tenant_id', ?, true)"; // 3rd arg true = SET LOCAL
   private static final String RESET_TENANT_SQL = "RESET app.current_tenant_id";

   @Override
   protected void doBegin(Object transaction, TransactionDefinition definition) {
       super.doBegin(transaction, definition);
       UUID tenantId = TenantContext.getCurrentTenant();
       if (tenantId == null) { resetTenantOnConnection(true); return; }
       setTenantOnConnection(tenantId);
   }
   ```

   On completion it explicitly `RESET`s the variable (`doCleanupAfterCompletion`) so a pooled
   connection never carries stale tenant context into a no-tenant request (e.g. health checks).

`SET LOCAL` is auto-scoped to the transaction; the explicit reset is defense-in-depth. When
no tenant is present, the transaction is reset rather than inheriting a prior value.

### Fail-closed policies + startup canary
- `V177__strict_tenant_rls_policies.sql` removed the old graceful `OR current_setting(...) IS
  NULL` fallback from `<table>_tenant_rls` policies. With strict semantics, an unset session
  var makes the comparison `NULL` → the RESTRICTIVE policy fails → **zero rows visible**.
- Flyway runs as a dedicated `nu_migration` role with `BYPASSRLS`; the **runtime app role must
  NOT have BYPASSRLS or SUPERUSER** (PostgreSQL superusers bypass RLS).
- `RlsStartupProbe` is the canary: at boot it opens a connection **without** setting
  `app.current_tenant_id`, asserts the runtime role cannot bypass RLS, verifies every
  `public` UUID-`tenant_id` table has RLS enabled + forced + a context-required policy, and
  fails startup if any tenant-owned rows are visible (when
  `app.security.rls.probe.fail-on-bypass=true`).

```java
// RlsStartupProbe — fail fast rather than leak
if (!visibleTables.isEmpty()) {
    handleBypassDetected("RLS bypass detected — strict policy not active...");
}
```

### Where used
- The transaction manager is registered as the primary `PlatformTransactionManager` in
  `JpaConfig`, so **every `@Transactional` JPA path** gets tenant scoping transparently.
- `TenantContext.requireCurrentTenant()` is called throughout service/controller code to
  guard against null-tenant operations.
- `RlsStartupProbe` runs on every non-`test` boot (skippable only via `RLS_PROBE_SKIP` for
  local Flyway bootstrap).

> The tenant-scoping request filter that populates `TenantContext` lives in [[Middleware]];
> the RLS policies and `shedlock`/tenant tables they guard are documented in [[Schema]] and
> [[ERD]]. Cross-tenant leak findings are tracked in [[Security-Audit]].

---

## 3. Event Idempotency / Dedup (`IdempotencyService`)

**File:** `backend/src/main/java/com/nulogic/infrastructure/kafka/IdempotencyService.java`

> **Architecture note (2026-06-18):** domain events now flow through the **transactional
> outbox** rather than direct Kafka publish. `EventPublisher` writes to the `outbox_events`
> table atomically with the business operation; `OutboxEventProcessor` polls every 5 s and
> invokes the consumer `process()` methods directly. On Railway, `app.kafka.enabled=false`
> — no broker is needed. `IdempotencyService` guards the consumer `process()` invocation
> regardless of whether that call came via Kafka or the outbox dispatcher.

### Problem
The event transport delivers at-least-once. With multiple consumer instances (or outbox
poll retries on failure), the same event can be processed twice — or two consumers can race
on the same event. A naive `isProcessed()` + `markProcessed()` pair has a check-then-act
race where both consumers see "not processed" and both proceed.

### Solution
A single **atomic Redis `SETNX` (SET IF NOT EXISTS) with TTL** collapses check-and-claim into
one operation. The first caller to claim an event ID proceeds; everyone else skips.

```java
private static final String PREFIX = "kafka:idempotent:";
private static final long TTL_HOURS = 24;

public boolean tryProcess(String eventId) {
    try {
        String key = PREFIX + eventId;
        Boolean result = redisTemplate.opsForValue()
                .setIfAbsent(key, "processed", TTL_HOURS, TimeUnit.HOURS); // atomic SETNX + TTL
        return Boolean.TRUE.equals(result);     // true => first claimer, process it
    } catch (RuntimeException e) {
        // Redis down: allow processing (fail-open). DB constraints / business
        // logic are the safety net against the resulting potential duplicate.
        log.warn("Redis unavailable for idempotency check on event {}: {}", eventId, e.getMessage());
        return true;
    }
}
```

Crucially, there is a **`release(eventId)`** for the failure path: if a consumer claimed the
event but the business operation then failed, releasing the key lets Kafka's redelivery
retry — otherwise the 24h TTL would silently swallow every retry until expiry.

```java
public void release(String eventId) {        // call on the consumer exception path
    try { redisTemplate.delete(PREFIX + eventId); }
    catch (RuntimeException e) { log.warn("Failed to release idempotency key {}: {}", eventId, e.getMessage()); }
}
```

### Usage pattern
```java
if (!idempotencyService.tryProcess(event.getId())) {
    return; // already handled by another consumer / earlier delivery
}
try {
    handle(event);
} catch (Exception ex) {
    idempotencyService.release(event.getId()); // allow Kafka redelivery
    throw ex;
}
```

### Where used
Consumer handlers under `backend/src/main/java/com/nulogic/infrastructure/kafka/consumer/`
(approval, notification, audit, employee-lifecycle, payroll-processing, Fluence search). These
are invoked either by the Kafka listener (when a broker is available) or by
`OutboxEventProcessor.dispatch()` (transactional outbox path). The 24h TTL window means events
older than a day are re-processable.

---

## 4. Distributed Rate Limiting (`DistributedRateLimiter`)

**Files:** `backend/src/main/java/com/nulogic/common/config/DistributedRateLimiter.java`,
`backend/src/main/java/com/nulogic/common/security/RateLimitingFilter.java`

### Problem
Rate limits must be enforced **consistently across all pods** — a per-instance counter lets
an attacker spread load and bypass the limit. They must also survive a Redis outage without
breaking the API, while still protecting brute-force-sensitive endpoints.

### Solution
A **Redis Lua script** does atomic `INCR` + `EXPIRE` (sliding window), so the increment and
TTL set happen as one operation shared by every pod:

```lua
-- RATE_LIMIT_SCRIPT (DistributedRateLimiter)
local current = redis.call('INCR', key)
if current == 1 then redis.call('EXPIRE', key, window) end
if current > limit then return 0 end
return limit - current
```

A second Lua script (`TENANT_RATE_LIMIT_SCRIPT`) supports **multi-token** consumption with
`INCRBY` and reverts via `DECRBY` on rejection, used for per-tenant + per-resource buckets so
one noisy tenant cannot exhaust the global budget (default 1000 req/min/resource/tenant,
key `rl:tenant:{tenantId}:{resource}`, tunable via `app.ratelimit.tenant.<resource>.*`).

**Fallback:** when Redis errors, the limiter falls back to in-memory **Bucket4j** buckets
(per-instance), with a bounded `ConcurrentHashMap` (`MAX_FALLBACK_BUCKETS = 10_000`).

**Fail policy** is asymmetric and deliberate (`tryAcquire`):

```java
if (remaining == null) {
    if (type == RateLimitType.AUTH) {           // brute-force protection
        return new RateLimitResult(false, 0, type.getWindowSeconds()); // fail CLOSED
    }
    return new RateLimitResult(true, type.getLimit(), type.getWindowSeconds()); // fail OPEN
}
```

Configured limits (`RateLimitType` enum):

| Type | Limit | Window |
|------|-------|--------|
| `AUTH` | 5 | 60s |
| `API` | 100 | 60s |
| `EXPORT` | 5 | 300s |
| `WALL` | 30 | 60s |
| `UPLOAD` | 20 | 60s |
| `WEBHOOK` | 50 | 60s |

### Where used
- `RateLimitingFilter` (`OncePerRequestFilter`) is the request-hot-path consumer; it uses
  `DistributedRateLimiter` as primary and its own Bucket4j map as fallback, with a scheduled
  sweep (every 5 min) and a hard cap (`MAX_BUCKETS = 50_000`) to bound memory. See
  [[Middleware]].
- Per-tenant buckets via `tryConsumePerTenant(...)` for resource-scoped throttling
  (exports, webhooks, etc.).

---

## 5. Token Blacklist (`TokenBlacklistService`)

**File:** `backend/src/main/java/com/nulogic/common/security/TokenBlacklistService.java`

### Problem
JWTs are stateless — once issued they are valid until expiry. Logout, password change, and
account compromise all require **invalidating tokens before their natural expiry**, and that
revocation must be visible to **every pod**.

### Solution
Redis-backed blacklist with TTL matched to token lifetime, plus a **per-pod in-memory
fallback** so revocation still works (best-effort, single-pod) during a Redis outage. A
30-second `@Scheduled` health probe flips `redisAvailable` on state transitions so the
service automatically returns to Redis-backed mode when Redis recovers.

Three revocation granularities:

| Granularity | Redis key | Use case |
|-------------|-----------|----------|
| Single token | `token:blacklist:{jti}` | logout one session |
| All user tokens before a time | `user:token:revoked_before:{userId}` | password change, "logout everywhere" |
| All tenant tokens before a time | `revoked_before_tenant:{tenantId}` | tenant suspend race-window guard |

```java
public void blacklistToken(String jti, Date expiration) {
    long ttlMillis = expiration.getTime() - System.currentTimeMillis();
    if (ttlMillis <= 0) return;                      // already expired
    if (redisAvailable) {
        redisTemplate.opsForValue().set(BLACKLIST_PREFIX + jti, "revoked", Duration.ofMillis(ttlMillis));
    } else {
        warnFallbackUsedOnce();                      // one warn per outage
        blacklistInMemory(jti, expiration.getTime());
    }
}
```

The tenant-wide marker is **fail-open** on purpose — the JWT filter's tenant-status check
remains the primary defense, and this marker only closes the race where a token was minted
the instant an admin clicked "suspend".

```java
public boolean isTenantTokenRevokedBefore(UUID tenantId, Instant tokenIssuedAt) {
    try {
        String value = redisTemplate.opsForValue().get("revoked_before_tenant:" + tenantId);
        return value != null && Long.parseLong(value) > tokenIssuedAt.toEpochMilli();
    } catch (RuntimeException e) {
        return false; // fail-open; tenant-status check is primary
    }
}
```

There is also a dedicated `revokeImpersonationToken(impersonationJti, ...)` that revokes
only the impersonation session by its own JTI, so revoking an impersonation does not nuke the
SuperAdmin's home session (Sprint-4 M-C4).

### Where used
Authentication / logout flow and `JwtAuthenticationFilter` (token-status checks, see
[[Middleware]]); password change and account-compromise paths; SuperAdmin impersonation
revocation.

---

## 6. Distributed Locks

Two distinct distributed-lock patterns exist, for two distinct purposes.

### 6a. Application edit lock — `FluenceEditLockService` (Redis)
**File:** `backend/src/main/java/com/nulogic/application/knowledge/service/FluenceEditLockService.java`

**Problem:** two users editing the same wiki/blog content concurrently overwrite each other.

**Solution:** a Redis key per `{tenantId}:{contentType}:{contentId}` holding the lock owner,
with a **5-minute TTL** so an abandoned editor's lock auto-expires. Acquire is owner-aware
(re-acquiring as the same user refreshes), release/refresh only succeed for the owner.

```java
private static final long LOCK_TTL_MINUTES = 5;
private static final String KEY_PREFIX = "fluence:edit-lock:";

// acquire: held by another user -> return existing holder; else set with TTL
redisTemplate.opsForValue().set(key, serialize(lockInfo), LOCK_TTL_MINUTES, TimeUnit.MINUTES);
// refresh: extend TTL only if caller owns the lock
redisTemplate.expire(key, LOCK_TTL_MINUTES, TimeUnit.MINUTES);
```

**Where used:** NU-Fluence collaborative wiki/blog editing.

### 6b. Scheduled-job lock — ShedLock (database)
**File:** `backend/src/main/java/com/nulogic/common/config/ShedLockConfig.java`

**Problem:** in a multi-pod K8s deployment every `@Scheduled` job fires on **every pod**, so
attendance rollups, leave accrual, webhook retries, etc. would run N times.

**Solution:** ShedLock with a `JdbcTemplateLockProvider` over a shared `shedlock` table
guarantees at most one pod runs each job per lock window. Default max lock is 30 minutes;
jobs override per-method.

```java
@Configuration
@EnableSchedulerLock(defaultLockAtMostFor = "PT30M")
public class ShedLockConfig {
    @Bean
    public LockProvider lockProvider(DataSource dataSource) {
        return new JdbcTemplateLockProvider(
            JdbcTemplateLockProvider.Configuration.builder()
                .withJdbcTemplate(new JdbcTemplate(dataSource))
                .usingDbTime()                  // use DB clock, not pod clock
                .build());
    }
}
```

**Usage pattern:**
```java
@Scheduled(cron = "0 30 19 * * *")
@SchedulerLock(name = "autoRegularization", lockAtMostFor = "PT10M", lockAtLeastFor = "PT1M")
public void runAutoRegularization() { ... }
```

**Where used:** the platform's `@Scheduled` jobs (attendance, contract lifecycle, scheduled
notifications, webhook delivery, report execution, leave accrual). Note `usingDbTime()`
removes reliance on synchronized pod clocks. The `shedlock` table is documented in [[Schema]].

> **Why two mechanisms?** Edit locks are short-lived, user-facing, and tenant-scoped — Redis
> TTL fits. Job locks must be correct even if Redis is down (they gate data-mutating cron
> work), so they live in the same PostgreSQL transaction boundary as the work itself.

---

## Pattern Cheat-Sheet

| Pattern | Backing store | Key shape | TTL / window | Failure mode |
|---------|---------------|-----------|--------------|--------------|
| Redis cache | Redis | `tenant:{id}:{Class}:{method}:{params}` | 30s–24h per cache | bypass to DB |
| RLS scoping | PostgreSQL | `SET LOCAL app.current_tenant_id` | per-transaction | fail-closed (0 rows) |
| Kafka dedup | Redis | `kafka:idempotent:{eventId}` | 24h | fail-open (DB safety net) |
| Rate limit | Redis Lua → Bucket4j | `ratelimit:{type}:{client}` / `rl:tenant:{id}:{res}` | 60s–300s | fail-closed (AUTH) / open (rest) |
| Token blacklist | Redis → in-memory | `token:blacklist:{jti}` etc. | = token lifetime | per-pod fallback |
| Edit lock | Redis | `fluence:edit-lock:{tenant}:{type}:{id}` | 5m | lock not held |
| Job lock | PostgreSQL (`shedlock`) | job name | ≤ `lockAtMostFor` (30m default) | job skipped |

---

## Related

- [[System-Overview]] — platform-wide context for these patterns
- [[Services]] — service layer that consumes caching, idempotency, and edit-lock patterns
- [[Middleware]] — request filters (rate limiting, tenant context, JWT/token blacklist)
- [[APIs]] — endpoints fronted by rate limiting and tenant scoping
- [[Schema]] — schema underlying the RLS policies and `shedlock` table
- [[ERD]] — tenant-owned tables guarded by RLS
- [[Security-Audit]] — cross-tenant leak findings and RLS hardening history
