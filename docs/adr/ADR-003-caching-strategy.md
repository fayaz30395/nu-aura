# ADR-003: Redis Caching with Tenant-Aware Key Generation

## Status

Accepted

## Context

The HRMS platform serves multiple tenants with shared infrastructure. We need a caching strategy
that:

- Improves read performance for frequently accessed data
- Maintains tenant data isolation
- Scales horizontally
- Provides cache invalidation mechanisms

### Options Considered

1. **In-Memory Cache (Caffeine)** - Local JVM cache
2. **Distributed Cache (Redis)** - Shared cache across instances
3. **Hybrid Approach** - L1 local + L2 Redis

## Decision

We chose **Option 2: Redis as primary cache** with tenant-aware key generation.

## Rationale

### Why Redis?

- **Horizontal Scaling**: All app instances share cache state
- **Persistence Options**: RDB/AOF for recovery after restarts
- **Rich Data Structures**: Sorted sets, hashes for complex caching
- **TTL Support**: Automatic expiration without manual cleanup
- **Pub/Sub**: Cache invalidation across instances

### Why Not Hybrid?

- Added complexity not justified for current scale
- Redis performance sufficient (sub-millisecond for most operations)
- Consistency issues between L1 and L2 caches

## Implementation

### Key Format

```
tenant:{tenantId}:{cacheName}:{methodName}:{params}
```

Example keys:

```
tenant:550e8400-...:employees:findById:emp-001
tenant:550e8400-...:departments:findAll
tenant:550e8400-...:leaveTypes:findActive
```

### Cache TTL Configuration

| Cache Name    | TTL | Rationale                             |
|---------------|-----|---------------------------------------|
| leaveTypes    | 24h | Rarely changes                        |
| departments   | 4h  | Occasional updates                    |
| holidays      | 24h | Yearly configuration                  |
| employeeBasic | 15m | Frequently updated                    |
| roles         | 24h | Security-critical, infrequent changes |
| webhooks      | 30m | External integrations                 |

### Spring Cache Configuration

```java
@Cacheable(
    value = "departments",
    key = "#tenantId.toString()",
    unless = "#result.isEmpty()"
)
public List<Department> findByTenantId(UUID tenantId) {
    return departmentRepository.findByTenantId(tenantId);
}
```

### Cache Invalidation

```java
@Caching(evict = {
    @CacheEvict(value = "departments", key = "#dept.tenantId.toString()"),
    @CacheEvict(value = "employeeBasic", allEntries = true)
})
public Department update(Department dept) {
    return departmentRepository.save(dept);
}
```

### Tenant Cache Manager

```java
public void invalidateTenantCaches(UUID tenantId) {
    String pattern = "tenant:" + tenantId + ":*";
    Set<String> keys = redisTemplate.keys(pattern);
    redisTemplate.delete(keys);
}
```

## Cache Bypass Scenarios

1. **Writes**: Always write-through to database
2. **Admin Operations**: Bypass cache for audit accuracy
3. **Real-time Data**: Attendance check-in/out times
4. **Financial Data**: Payroll calculations

## Monitoring

### Metrics Exposed

- `cache.hits` - Cache hit count
- `cache.misses` - Cache miss count
- `cache.evictions` - Eviction count
- `cache.size` - Current cache size

### Alerting Thresholds

| Metric       | Warning | Critical |
|--------------|---------|----------|
| Hit Rate     | < 80%   | < 60%    |
| Latency p99  | > 10ms  | > 50ms   |
| Memory Usage | > 70%   | > 90%    |

## Consequences

### Positive

- Significant read performance improvement
- Reduced database load
- Consistent caching across instances
- Built-in tenant isolation

### Negative

- Additional infrastructure dependency (Redis)
- Cache invalidation complexity
- Potential stale data windows

### Mitigations

- Redis Sentinel for high availability
- Conservative TTLs for sensitive data
- Explicit invalidation on writes

## Related Decisions

- ADR-001: Multi-Tenant Architecture
- ADR-006: Performance Indexing Strategy
