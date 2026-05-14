---
name: redis-cache-with-fallback
tags: [redis, cache, fallback, resilience, circuit-breaker, defense-in-depth]
applies_to: [backend, service-layer]
references: [ADR-003, CLAUDE.md#Redis-Architecture]
---

# Redis Cache with In-Memory Fallback

## When to use

Hot read path where (a) we want sub-millisecond reads under normal conditions and (b) a Redis
outage must NOT take the endpoint down. Examples: permission resolution, tenant config,
feature flags, rate-limit counters.

## Canonical implementation

```java
@Service
@RequiredArgsConstructor
public class PermissionResolver {

    private final RedisTemplate<String, Set<String>> redis;
    private final PermissionRepository repository;
    private final RedisHealthIndicator redisHealth;

    // In-process fallback. Bounded; expires after 60s.
    private final Cache<String, Set<String>> localFallback = Caffeine.newBuilder()
        .maximumSize(10_000)
        .expireAfterWrite(Duration.ofSeconds(60))
        .build();

    public Set<String> resolve(UUID tenantId, Set<String> roles) {
        String key = cacheKey(tenantId, roles);

        // 1) Local in-process cache (always tried first; ~10ns)
        Set<String> hit = localFallback.getIfPresent(key);
        if (hit != null) return hit;

        // 2) Redis (skipped if unhealthy)
        if (redisHealth.isUp()) {
            try {
                Set<String> redisHit = redis.opsForValue().get(key);
                if (redisHit != null) {
                    localFallback.put(key, redisHit);
                    return redisHit;
                }
            } catch (Exception e) {
                log.warn("Redis read failed for key={}, falling back to DB", key, e);
                // Continue to DB
            }
        }

        // 3) Source of truth: PostgreSQL
        Set<String> resolved = repository.findPermissionCodesByRoles(tenantId, roles);
        localFallback.put(key, resolved);

        // Best-effort populate Redis (don't block on failure)
        if (redisHealth.isUp()) {
            try {
                redis.opsForValue().set(key, resolved, Duration.ofMinutes(15));
            } catch (Exception e) {
                log.debug("Redis write failed for key={}, will retry on next miss", key);
            }
        }
        return resolved;
    }

    private String cacheKey(UUID tenantId, Set<String> roles) {
        return "perm:%s:%s".formatted(tenantId, String.join(",", new TreeSet<>(roles)));
    }
}
```

## Anti-patterns

- **DON'T** call Redis without checking `redisHealth.isUp()`. A 30-second connection timeout
  per request will brown out the whole service.
- **DON'T** skip the local Caffeine layer. It's the difference between "Redis down ⇒ DB
  hammered" and "Redis down ⇒ DB sees only cache misses for new keys."
- **DON'T** swallow Redis exceptions silently. Log at `warn` so observability can correlate
  cache-miss spikes with Redis incidents.
- **DON'T** put tenant-isolated data behind a non-tenant-prefixed key. Every cache key MUST
  include the tenant UUID (or be a tenant-global concept like `permissions_catalog`).

## Tests required

- Unit: `redisHealth.isDown()` → Redis is never called, DB is queried, returned value is
  cached locally
- Unit: Redis throws → fallback to DB, exception logged
- Integration: with Testcontainers Redis, cache hit returns same instance ref across calls
- Integration: kill Testcontainers Redis mid-test; subsequent calls succeed

## Notes

- TTL choice: shorter when staleness costs money (rate limits → 1m), longer when staleness is
  harmless (permissions → 15m, with explicit invalidation on role change).
- `RedisHealthIndicator` is in `infrastructure/cache/`. It runs a `PING` every 5s and
  short-circuits to `DOWN` after 3 failures, recovering after 1 success.
- See `CacheConfig` for the 20+ named caches and their TTLs.
