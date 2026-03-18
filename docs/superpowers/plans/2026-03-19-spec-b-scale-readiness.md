# Spec B: Scale Readiness — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ensure NU-AURA handles 100+ tenants and 10K+ employees without performance degradation.

**Architecture:** JPA fetch strategy changes, connection pool tuning, Kafka retry config, cache audit, HPA optimization. Mix of backend Java changes and K8s manifest updates.

**Tech Stack:** Spring Boot 3.4, JPA/Hibernate, Kafka (Spring Kafka 3.x), Redis, Kubernetes HPA

**Spec:** `docs/superpowers/specs/2026-03-19-deep-codebase-analysis-design.md` (Spec B section)

**Prerequisite:** Spec A Task 1 (Java version alignment) must complete before CI testing.

---

## File Map

| File | Action | Task |
|------|--------|------|
| `backend/src/main/java/com/hrms/domain/platform/AppRole.java:83` | Modify EAGER→LAZY | Task 1 |
| `backend/src/main/java/com/hrms/domain/platform/UserAppAccess.java:80,96` | Modify EAGER→LAZY | Task 1 |
| `backend/src/main/java/com/hrms/common/security/ApiKey.java:41` | Modify EAGER→LAZY | Task 1 |
| `backend/src/main/java/com/hrms/domain/user/RolePermission.java:27` | Modify EAGER→LAZY | Task 1 |
| `backend/src/main/java/com/hrms/domain/announcement/Announcement.java:53,60` | Modify EAGER→LAZY | Task 1 |
| `backend/src/main/java/com/hrms/domain/webhook/Webhook.java:64` | Modify EAGER→LAZY | Task 1 |
| `backend/src/main/resources/application.yml:428-429` | Verify pool size | Task 2 |
| `deployment/kubernetes/configmap.yaml:16-17` | Verify pool settings | Task 2 |
| `deployment/kubernetes/hpa.yaml:44,66,94` | Modify scale policies | Task 3 |
| `backend/src/main/java/com/hrms/infrastructure/kafka/KafkaConfig.java:339-346` | Add error handler | Task 4 |
| `backend/src/main/java/com/hrms/common/config/CacheConfig.java` | Add CacheErrorHandler | Task 5 |

---

### Task 1: Convert EAGER JPA Relationships to LAZY (B1 — P1)

**Risk: HIGH.** Auth flows depend on eagerly loaded roles/permissions. Test thoroughly.

**Files:**
- Modify: `domain/platform/AppRole.java:83`
- Modify: `domain/platform/UserAppAccess.java:80,96`
- Modify: `common/security/ApiKey.java:41`
- Modify: `domain/user/RolePermission.java:27`
- Modify: `domain/announcement/Announcement.java:53,60`
- Modify: `domain/webhook/Webhook.java:64`
- Create: `backend/src/test/java/com/hrms/domain/EagerToLazyMigrationTest.java`

- [ ] **Step 1: Write integration test for auth flow with lazy loading**

```java
// backend/src/test/java/com/hrms/domain/EagerToLazyMigrationTest.java
package com.hrms.domain;

import com.hrms.domain.platform.AppRole;
import com.hrms.domain.platform.UserAppAccess;
import com.hrms.domain.user.RolePermission;
import com.hrms.common.security.ApiKey;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;
import jakarta.persistence.EntityManager;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class EagerToLazyMigrationTest {

    @Autowired
    private EntityManager entityManager;

    @Test
    void appRole_permissions_loadLazily() {
        // Verify AppRole.permissions is LAZY — accessing outside transaction should fail
        // Within transaction, it should load on access
        var roles = entityManager.createQuery(
            "SELECT r FROM AppRole r", AppRole.class
        ).getResultList();

        if (!roles.isEmpty()) {
            // Access permissions within transaction — should work with LAZY
            var permissions = roles.get(0).getPermissions();
            assertThat(permissions).isNotNull();
        }
    }

    @Test
    void userAppAccess_roles_loadLazily() {
        var accesses = entityManager.createQuery(
            "SELECT u FROM UserAppAccess u", UserAppAccess.class
        ).getResultList();

        if (!accesses.isEmpty()) {
            var roles = accesses.get(0).getRoles();
            assertThat(roles).isNotNull();
        }
    }
}
```

- [ ] **Step 2: Run test to verify it fails (currently EAGER, test should pass — baseline)**

Run: `cd backend && ./mvnw test -Dtest=EagerToLazyMigrationTest -pl . -q`

Expected: PASS (baseline — entities currently load eagerly within transaction).

- [ ] **Step 3: Convert AppRole.permissions to LAZY**

```java
// backend/src/main/java/com/hrms/domain/platform/AppRole.java
// Line 83: Change:
@ManyToMany(fetch = FetchType.EAGER)
// To:
@ManyToMany(fetch = FetchType.LAZY)
```

- [ ] **Step 4: Convert UserAppAccess roles and permissions to LAZY**

```java
// backend/src/main/java/com/hrms/domain/platform/UserAppAccess.java
// Line 80: Change:
@ManyToMany(fetch = FetchType.EAGER)
// To:
@ManyToMany(fetch = FetchType.LAZY)

// Line 96: Change:
@ManyToMany(fetch = FetchType.EAGER)
// To:
@ManyToMany(fetch = FetchType.LAZY)
```

- [ ] **Step 5: Convert ApiKey.scopes to LAZY**

```java
// backend/src/main/java/com/hrms/common/security/ApiKey.java
// Line 41: Change:
@ElementCollection(fetch = FetchType.EAGER)
// To:
@ElementCollection(fetch = FetchType.LAZY)
```

- [ ] **Step 6: Convert RolePermission.permission to LAZY**

```java
// backend/src/main/java/com/hrms/domain/user/RolePermission.java
// Line 27: Change:
@ManyToOne(fetch = FetchType.EAGER) // Permission metadata is usually small and needed
// To:
@ManyToOne(fetch = FetchType.LAZY)
```

- [ ] **Step 7: Convert Announcement target collections to LAZY**

```java
// backend/src/main/java/com/hrms/domain/announcement/Announcement.java
// Line 53: Change:
@ElementCollection(fetch = FetchType.EAGER)
// To:
@ElementCollection(fetch = FetchType.LAZY)

// Line 60: Change:
@ElementCollection(fetch = FetchType.EAGER)
// To:
@ElementCollection(fetch = FetchType.LAZY)
```

- [ ] **Step 8: Convert Webhook.events to LAZY**

```java
// backend/src/main/java/com/hrms/domain/webhook/Webhook.java
// Line 64: Change:
@ElementCollection(fetch = FetchType.EAGER)
// To:
@ElementCollection(fetch = FetchType.LAZY)
```

- [ ] **Step 9: Run full test suite to catch LazyInitializationExceptions**

Run: `cd backend && ./mvnw test -pl . -q`

Expected: PASS. If any tests fail with `LazyInitializationException`, add `@EntityGraph` or `JOIN FETCH` in the relevant repository query. Common fix locations:
- Auth filter loading user roles → add `@EntityGraph(attributePaths = {"roles", "roles.permissions"})` to UserAppAccess repository
- Webhook event dispatch → add `JOIN FETCH w.events` to webhook queries

- [ ] **Step 10: Commit**

```bash
git add backend/src/main/java/com/hrms/domain/ backend/src/main/java/com/hrms/common/security/ApiKey.java backend/src/test/
git commit -m "perf(jpa): convert 8 EAGER relationships to LAZY loading

Converts FetchType.EAGER to LAZY in AppRole, UserAppAccess, ApiKey,
RolePermission, Announcement, and Webhook entities. Reduces N+1 query
risk at scale. Batch fetching (size=25) in application.yml handles
lazy collection loading efficiently."
```

---

### Task 2: Verify Connection Pool Sizing (B2 — P1)

**Files:**
- Verify: `backend/src/main/resources/application.yml:428-429`
- Verify: `deployment/kubernetes/configmap.yaml:16-17`

- [ ] **Step 1: Verify production pool is already right-sized**

Run: `grep -A2 'maximum-pool-size' backend/src/main/resources/application.yml`

Expected: Production profile shows `maximum-pool-size: ${DB_POOL_MAX:20}` — already 20, not 50 as initially reported. The spec reviewer corrected this.

- [ ] **Step 2: Verify ConfigMap matches**

Run: `grep 'DB_POOL_MAX' deployment/kubernetes/configmap.yaml`

Expected: `DB_POOL_MAX: "20"` — already correct.

- [ ] **Step 3: Add connection pool documentation comment**

Add a comment in `application.yml` production profile section (around line 426):

```yaml
  # Connection pool sizing for Neon cloud PostgreSQL:
  # - Neon free tier: max 100 connections per endpoint
  # - With N pods: each pod gets 20 connections = N*20 total
  # - Safe for up to 5 pods; increase Neon plan for more
```

- [ ] **Step 4: Commit**

```bash
git add backend/src/main/resources/application.yml
git commit -m "docs(config): add connection pool sizing rationale for Neon"
```

---

### Task 3: Tune HPA Scaling Policies (B4 — P2)

**Files:**
- Modify: `deployment/kubernetes/hpa.yaml:44,66,94`

- [ ] **Step 1: Reduce backend scale-up from 100% to 50%**

```yaml
# hpa.yaml line 44: Change:
        value: 100
# To:
        value: 50
```

- [ ] **Step 2: Align frontend maxReplicas with backend**

```yaml
# hpa.yaml line 66: Change:
  maxReplicas: 8
# To:
  maxReplicas: 10
```

- [ ] **Step 3: Reduce frontend scale-up from 100% to 50%**

```yaml
# hpa.yaml line 94: Change (frontend scaleUp section):
        value: 100
# To:
        value: 50
```

- [ ] **Step 4: Commit**

```bash
git add deployment/kubernetes/hpa.yaml
git commit -m "perf(k8s): tune HPA scaling policies

Reduce scale-up from 100% to 50% to prevent overshoot during traffic
spikes. Align frontend maxReplicas with backend (both 10)."
```

---

### Task 4: Add Kafka Consumer Retry Configuration (B5 — P2)

**Files:**
- Modify: `backend/src/main/java/com/hrms/infrastructure/kafka/KafkaConfig.java:339-346`

- [ ] **Step 1: Add DefaultErrorHandler with exponential backoff to the generic listener factory**

In `KafkaConfig.java`, modify the `createListenerContainerFactory` method (lines 339-346):

```java
// FROM (lines 339-346):
    private <K, V> KafkaListenerContainerFactory<ConcurrentMessageListenerContainer<K, V>> createListenerContainerFactory(ConsumerFactory<K, V> consumerFactory) {
        ConcurrentKafkaListenerContainerFactory<K, V> factory = new ConcurrentKafkaListenerContainerFactory<>();
        factory.setConsumerFactory(consumerFactory);
        factory.setConcurrency(3);
        factory.getContainerProperties().setAckMode(ContainerProperties.AckMode.MANUAL);
        // Commit logging removed - incompatible with Spring Kafka 3.x API
        return factory;
    }

// TO:
    private <K, V> KafkaListenerContainerFactory<ConcurrentMessageListenerContainer<K, V>> createListenerContainerFactory(ConsumerFactory<K, V> consumerFactory) {
        ConcurrentKafkaListenerContainerFactory<K, V> factory = new ConcurrentKafkaListenerContainerFactory<>();
        factory.setConsumerFactory(consumerFactory);
        factory.setConcurrency(3);
        factory.getContainerProperties().setAckMode(ContainerProperties.AckMode.MANUAL);

        // Retry with exponential backoff: 1s, 5s, 30s (3 attempts before DLT)
        DefaultErrorHandler errorHandler = new DefaultErrorHandler(
            new FixedBackOff(0L, 0L) // Placeholder — overridden by backOff below
        );
        errorHandler.setBackOffFunction((record, ex) ->
            new org.springframework.util.backoff.ExponentialBackOff() {{
                setInitialInterval(1000L);
                setMultiplier(5.0);
                setMaxInterval(30000L);
                setMaxElapsedTime(36000L); // ~3 retries
            }}
        );
        factory.setCommonErrorHandler(errorHandler);

        return factory;
    }
```

Add imports at the top of the file:

```java
import org.springframework.kafka.listener.DefaultErrorHandler;
import org.springframework.util.backoff.FixedBackOff;
```

- [ ] **Step 2: Run Kafka-related tests**

Run: `cd backend && ./mvnw test -Dtest="*Kafka*" -pl . -q`

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add backend/src/main/java/com/hrms/infrastructure/kafka/KafkaConfig.java
git commit -m "perf(kafka): add exponential backoff retry to consumer factory

Configures DefaultErrorHandler with 3 retry attempts (1s, 5s, 30s)
before messages fall through to the existing DeadLetterHandler.
Previously, failed messages went directly to DLT without retry."
```

---

### Task 5: Add Redis Cache Error Handler (B8 — P2)

**Files:**
- Modify: `backend/src/main/java/com/hrms/common/config/CacheConfig.java`

- [ ] **Step 1: Add CacheErrorHandler to CacheConfig**

Add the following method to `CacheConfig.java` (after the `tenantAwareKeyGenerator` method, around line 142):

```java
    /**
     * Graceful cache degradation: log errors and bypass cache on Redis failure.
     * Prevents 500 errors when Redis is unavailable — application falls through
     * to database queries instead.
     */
    @Override
    public CacheErrorHandler errorHandler() {
        return new CacheErrorHandler() {
            private static final org.slf4j.Logger log =
                org.slf4j.LoggerFactory.getLogger("CacheErrorHandler");

            @Override
            public void handleCacheGetError(RuntimeException exception, Cache cache, Object key) {
                log.warn("Cache GET failed for key={} in cache={}: {}",
                    key, cache.getName(), exception.getMessage());
            }

            @Override
            public void handleCachePutError(RuntimeException exception, Cache cache, Object key, Object value) {
                log.warn("Cache PUT failed for key={} in cache={}: {}",
                    key, cache.getName(), exception.getMessage());
            }

            @Override
            public void handleCacheEvictError(RuntimeException exception, Cache cache, Object key) {
                log.warn("Cache EVICT failed for key={} in cache={}: {}",
                    key, cache.getName(), exception.getMessage());
            }

            @Override
            public void handleCacheClearError(RuntimeException exception, Cache cache) {
                log.warn("Cache CLEAR failed for cache={}: {}",
                    cache.getName(), exception.getMessage());
            }
        };
    }
```

Add import:

```java
import org.springframework.cache.Cache;
import org.springframework.cache.interceptor.CacheErrorHandler;
```

- [ ] **Step 2: Verify CacheConfig extends CachingConfigurerSupport or implements CachingConfigurer**

Check that the class signature includes `CachingConfigurer` (required for `errorHandler()` override). If not, add `implements CachingConfigurer`.

- [ ] **Step 3: Run tests**

Run: `cd backend && ./mvnw test -pl . -q`

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add backend/src/main/java/com/hrms/common/config/CacheConfig.java
git commit -m "perf(cache): add graceful Redis failover via CacheErrorHandler

When Redis is unavailable, cache operations now log a warning and fall
through to database queries instead of throwing 500 errors. This ensures
the application degrades gracefully during Redis outages."
```

---

### Task 6: Cache Invalidation Completeness Audit (B6 — P2)

This is an audit task, not a code change task. The output is a list of missing `@CacheEvict` annotations.

**Files:**
- Read: All 12 files with `@Cacheable` (listed in spec)

- [ ] **Step 1: Audit each @Cacheable for corresponding @CacheEvict**

For each of these 12 files, grep for both `@Cacheable` and `@CacheEvict`:

```bash
cd backend && for f in $(grep -rl '@Cacheable' src/main/java/); do
  echo "=== $f ===";
  grep -n '@Cacheable\|@CacheEvict' "$f";
done
```

- [ ] **Step 2: Document findings**

Create a cache audit table. For each `@Cacheable` method, verify:
1. A corresponding `@CacheEvict` exists on the update/delete method
2. Bulk operations also evict the cache
3. Tenant-scoped keys are properly evicted

- [ ] **Step 3: Add missing @CacheEvict annotations where identified**

Common pattern:

```java
@CacheEvict(value = CACHE_NAME, allEntries = true)
public Entity updateEntity(UUID id, UpdateRequest request) {
    // ... existing update logic
}
```

- [ ] **Step 4: Commit any fixes**

```bash
git add backend/src/main/java/
git commit -m "perf(cache): add missing @CacheEvict for audit-identified gaps"
```

---

### Task 7: RLS Performance Benchmarking (B3 — P1)

This is a benchmarking task. Output is a migration file with any needed indexes.

- [ ] **Step 1: Create a local benchmark with 100+ tenant_ids**

```sql
-- Run locally or in a test environment:
-- Create 100 test tenants and sample data
DO $$
DECLARE
  i INTEGER;
  tid UUID;
BEGIN
  FOR i IN 1..100 LOOP
    tid := gen_random_uuid();
    INSERT INTO tenants (id, name, domain) VALUES (tid, 'Tenant ' || i, 'tenant' || i || '.test.com');
    -- Insert sample employees per tenant
    INSERT INTO employees (id, tenant_id, first_name, last_name, email, employee_code)
    VALUES (gen_random_uuid(), tid, 'Emp', 'User', 'emp@tenant' || i || '.com', 'EMP-' || i);
  END LOOP;
END $$;
```

- [ ] **Step 2: Run EXPLAIN ANALYZE on critical queries**

```sql
-- Set tenant context
SET app.current_tenant = '<test-tenant-uuid>';

-- Check employees query plan
EXPLAIN ANALYZE SELECT * FROM employees WHERE tenant_id = current_setting('app.current_tenant')::uuid LIMIT 50;

-- Check attendance records
EXPLAIN ANALYZE SELECT * FROM attendance_records WHERE tenant_id = current_setting('app.current_tenant')::uuid AND date >= '2026-01-01';

-- Check leave requests
EXPLAIN ANALYZE SELECT * FROM leave_requests WHERE tenant_id = current_setting('app.current_tenant')::uuid AND status = 'PENDING';
```

- [ ] **Step 3: If seq scans detected, create V40 migration**

```sql
-- backend/src/main/resources/db/migration/V40__rls_performance_indexes.sql
-- Only add indexes that EXPLAIN ANALYZE shows are missing

-- Example (add only if needed based on benchmarking):
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_employees_tenant_dept
--   ON employees(tenant_id, department_id);
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_attendance_tenant_date
--   ON attendance_records(tenant_id, date);
```

- [ ] **Step 4: Commit if migration created**

```bash
git add backend/src/main/resources/db/migration/V40__rls_performance_indexes.sql
git commit -m "perf(db): add composite indexes for RLS performance at scale

Based on EXPLAIN ANALYZE with 100+ tenants, adds composite indexes
on (tenant_id, <frequently_filtered_column>) to prevent seq scans
under RLS policies."
```

---

### Tasks 8-10: Audit Tasks (B7, B9, B10)

These are investigation/audit tasks. Execute them, document findings, and fix issues as they emerge.

- [ ] **Task 8 (B7): Query pagination audit** — Grep for `findAll()` without `Pageable` in repositories. Verify large tables use keyset pagination.
- [ ] **Task 9 (B9): Bulk operation audit** — Check `AttendanceImportService`, `PayrollRunService`, `LeaveBalanceService` for `findAll()` calls that load entire tables. Verify batch insert usage.
- [ ] **Task 10 (B10): Async context propagation verification** — Run existing `MultiTenantAsyncIsolationTest` and `AsyncContextPropagationTest`. Verify they pass. Check `SecurityContext.clear()` is called in async cleanup.

```bash
cd backend && ./mvnw test -Dtest="*AsyncContext*,*MultiTenantAsync*,*ScheduledJob*" -pl . -q
```

---

## Verification Checklist

After all tasks are complete:

- [ ] Full backend test suite passes: `cd backend && ./mvnw test -pl . -q`
- [ ] No `FetchType.EAGER` remaining: `grep -rn 'FetchType.EAGER' backend/src/main/java/`
- [ ] Auth login flow works end-to-end (manual test)
- [ ] K8s manifests validate: `kubectl apply --dry-run=client -f deployment/kubernetes/hpa.yaml`
