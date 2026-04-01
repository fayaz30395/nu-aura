# ADR-001: Multi-Tenant Architecture with Shared Database

## Status
Accepted

## Context
Nu-Aura HRMS needs to support multiple organizations (tenants) while maintaining data isolation, cost efficiency, and operational simplicity. We need to decide on a multi-tenancy approach.

### Options Considered

1. **Separate Database per Tenant** - Each tenant gets their own database instance
2. **Separate Schema per Tenant** - Shared database with separate schemas
3. **Shared Database with Tenant ID** - Single schema with tenant_id column (Row-Level Security)

## Decision
We chose **Option 3: Shared Database with Tenant ID** (discriminator column approach).

## Rationale

### Advantages
- **Cost Efficiency**: Single database instance, reduced infrastructure costs
- **Operational Simplicity**: One database to backup, migrate, and maintain
- **Faster Provisioning**: New tenants require no database setup
- **Schema Updates**: Apply migrations once, affects all tenants
- **Connection Pooling**: Shared pool across tenants

### Trade-offs Accepted
- **Query Complexity**: Every query must include tenant_id filter
- **Risk of Data Leakage**: Requires careful implementation of tenant context
- **Noisy Neighbor**: Large tenants may impact others (mitigated by caching)

## Implementation

### Tenant Context
```java
// TenantContext.java - ThreadLocal for tenant isolation
public class TenantContext {
    private static final ThreadLocal<UUID> currentTenant = new ThreadLocal<>();

    public static void setCurrentTenant(UUID tenantId) {
        currentTenant.set(tenantId);
    }

    public static UUID getCurrentTenant() {
        return currentTenant.get();
    }
}
```

### Entity Design
All tenant-scoped entities extend `TenantAwareEntity`:
```java
@MappedSuperclass
public abstract class TenantAwareEntity {
    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;
}
```

### Repository Queries
```java
@Query("SELECT e FROM Employee e WHERE e.tenantId = :tenantId")
List<Employee> findByTenantId(@Param("tenantId") UUID tenantId);
```

### Cache Isolation
Cache keys include tenant ID prefix:
```
tenant:{tenantId}:employees:list
tenant:{tenantId}:departments:all
```

## Consequences

### Positive
- Simplified deployment and operations
- Lower infrastructure costs
- Consistent schema across tenants
- Easier to implement cross-tenant analytics (if needed)

### Negative
- Must audit all queries for tenant_id inclusion
- Performance indexes must include tenant_id
- No database-level isolation guarantees

### Mitigations
- Hibernate filters for automatic tenant filtering
- Integration tests verify tenant isolation
- All indexes include tenant_id as first column

## Related Decisions
- ADR-002: JWT-based Authentication
- ADR-003: Redis Caching Strategy
