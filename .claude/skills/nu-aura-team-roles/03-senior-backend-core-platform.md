# Senior Backend Engineer - Core Platform

**Role**: Senior Backend Engineer  
**Focus**: Auth, multi-tenancy, Kafka, Redis, WebSocket, security  
**Stack**: Java 21, Spring Boot 3.4.1, PostgreSQL 16, Redis 7, Kafka 7.6.0

## Core Responsibilities

### 1. Authentication & Authorization
- JWT-based auth (JJWT 0.12.6)
- RBAC (500+ permissions, `MODULE:ACTION` format)
- SuperAdmin bypass logic
- OAuth2 (Google, SSO)
- MFA implementation

**Key Files**: `SecurityConfig.java`, `JwtAuthenticationFilter.java`, `PermissionAspect.java`

### 2. Multi-Tenant Architecture
- PostgreSQL RLS (Row-Level Security)
- Tenant context management (`TenantFilter.java`)
- Shared DB, shared schema
- Tenant isolation validation

**Pattern**:
```java
@Column(name = "tenant_id", nullable = false)
private UUID tenantId;

// All queries auto-filtered by tenant_id via RLS
```

### 3. Event-Driven Architecture (Kafka)
- 5 topics + 5 DLT (Dead Letter Topics)
- Event publishing (`KafkaProducer.java`)
- Consumer retry logic
- Failed event handling (`FailedKafkaEvent` table)

**Topics**: `nu-aura.approvals`, `nu-aura.notifications`, `nu-aura.audit`, `nu-aura.employee-lifecycle`, `nu-aura.fluence-content`

### 4. Caching (Redis)
- Permission cache (TTL: 1 hour)
- Rate limiting (Bucket4j 8.7.0)
- Session storage
- Cache invalidation strategies

**Limits**: 5/min (auth), 100/min (API), 5/5min (exports)

### 5. Real-Time (WebSocket)
- STOMP + SockJS
- Notifications push
- Presence tracking
- Connection management

### 6. Security
- OWASP headers
- CSRF protection (double-submit cookie)
- Password policy (12+ chars, complexity, history of 5, 90-day max age)
- Rate limiting
- Audit logging

## Key Patterns

**RBAC Check**:
```java
@RequiresPermission("EMPLOYEE:READ")
public EmployeeResponse getEmployee(UUID id) {
    return employeeService.getById(id);
}
```

**Kafka Event**:
```java
kafkaProducer.send("nu-aura.approvals", ApprovalEvent.builder()
    .approvalId(approvalId)
    .status(APPROVED)
    .build()
);
```

**Redis Cache**:
```java
@Cacheable(value = "permissions", key = "#userId")
public Set<String> getCachedPermissions(UUID userId) {
    return permissionRepo.findByUserId(userId);
}
```

## Database

- **Flyway**: V0-V62 active, next = V63
- **Connection Pool**: HikariCP (max 20, min 5)
- **Indexes**: All foreign keys, tenant_id columns

## Tests

- Unit tests (Mockito, JUnit 5)
- Integration tests (Testcontainers)
- Security tests (RBAC, RLS validation)
- Coverage: 80%+ (JaCoCo)

## Success Criteria

- ✅ Zero auth vulnerabilities
- ✅ Multi-tenant isolation 100% (no cross-tenant data)
- ✅ API <200ms p95
- ✅ Kafka message delivery 99.9%
- ✅ Redis cache hit rate >80%

## Escalation

**Escalate when**: Security breach, Kafka data loss, Redis cluster failure, major auth issue
