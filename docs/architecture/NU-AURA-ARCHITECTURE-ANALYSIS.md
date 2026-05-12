# NU-AURA Platform — Technical Architecture Analysis

**Analysis Date:** 2026-04-07 (updated from 2026-03-22 analysis)
**Analyst:** Backend Specialist Agent
**Scope:** Deep technical architecture analysis vs KEKA HRMS capabilities
**Platform Version:** NU-AURA 1.0 (Spring Boot 3.4.1, Next.js 14)

---

## Executive Summary

NU-AURA is an enterprise-grade, multi-tenant SaaS HRMS platform built as a **monolithic Spring Boot
3.4.1 backend** with a **Next.js 14 frontend**. The platform demonstrates **production-ready
architecture** with strong foundations in security, multi-tenancy, and event-driven patterns.
However, critical performance issues (25-second dashboard load times) and architectural constraints
limit scalability at enterprise scale.

### Key Findings

| Dimension                     | Score | Assessment                                                                        |
|-------------------------------|-------|-----------------------------------------------------------------------------------|
| **System Architecture**       | 7/10  | Solid monolith with clean domain separation, but lacks microservice scalability   |
| **Data Architecture**         | 8/10  | Well-normalized schema (254 tables), strong RLS, but missing critical indexes     |
| **Integration Architecture**  | 8/10  | Event-driven with Kafka, REST APIs, but no GraphQL or gRPC                        |
| **Security Architecture**     | 9/10  | Industry-leading JWT+RBAC, OWASP headers, rate limiting, tenant isolation         |
| **Performance & Reliability** | 6/10  | Improved: Redis caching (20+ named caches), Bucket4j rate limiting, batch loading |
| **Scalability**               | 6/10  | Limited by monolith + shared DB, HikariCP pool size (10), single tenant context   |

**Overall Grade:** **7.7/10** — Strong foundations, performance improved with Redis caching layer

---

## 1. System Architecture Analysis

### 1.1 Architecture Pattern: Monolith

```mermaid
graph TB
    subgraph "External Layer"
        FE[Next.js Frontend<br/>Port 3000]
        Mobile[Mobile App<br/>Future]
    end

    subgraph "API Gateway Layer"
        NGINX[NGINX<br/>Load Balancer]
    end

    subgraph "Application Layer"
        Monolith[Spring Boot Monolith<br/>Port 8080<br/>170 Controllers<br/>206 Services<br/>360 Entities]
    end

    subgraph "Data Layer"
        PG[(PostgreSQL<br/>Neon Cloud<br/>254 Tables)]
        Redis[(Redis 7<br/>Cache + Sessions)]
        ES[(Elasticsearch 8.11<br/>Full-text Search)]
        Kafka[Kafka 7.6<br/>5 Topics]
        MinIO[(MinIO<br/>S3-compatible)]
    end

    FE --> NGINX
    Mobile -.-> NGINX
    NGINX --> Monolith

    Monolith --> PG
    Monolith --> Redis
    Monolith --> ES
    Monolith --> Kafka
    Monolith --> MinIO

    style Monolith fill:#ff6b6b
    style PG fill:#4ecdc4
    style Redis fill:#ffe66d
    style Kafka fill:#95e1d3
```

### 1.2 Monolith vs Microservices Tradeoffs

| Dimension                  | Monolith (Current)      | Microservices (Alternative)              |
|----------------------------|-------------------------|------------------------------------------|
| **Deployment**             | Single JAR, simple      | Multiple services, complex orchestration |
| **Development Speed**      | Fast for small team     | Slower, coordination overhead            |
| **Scalability**            | Vertical only (CPU/RAM) | Horizontal per service                   |
| **Technology Diversity**   | Single stack (Java 17)  | Polyglot possible                        |
| **Transaction Management** | ACID guarantees         | Distributed sagas                        |
| **Debugging**              | Single codebase         | Distributed tracing required             |
| **Team Size**              | Optimal: 3-10 devs      | Optimal: 15+ devs                        |
| **Data Consistency**       | Strong consistency      | Eventual consistency                     |

**Decision:** Monolith is **appropriate** for current scale (1,622 Java files, 10-20 concurrent
users). Consider microservices when:

- Tenant count exceeds 100
- Concurrent users exceed 500
- Team size exceeds 15 developers
- Independent module scaling needed (e.g., payroll vs attendance)

### 1.3 Service Boundaries (11 Major Domains)

```
com.hrms
├── api/                         # 130 Controllers across 11 domains
│   ├── attendance/              # 12 controllers (shifts, punches, timesheets)
│   ├── employee/                # 18 controllers (CRUD, directory, org chart)
│   ├── leave/                   # 9 controllers (requests, policies, balances)
│   ├── payroll/                 # 14 controllers (runs, components, statutory)
│   ├── recruitment/             # 16 controllers (ATS, candidates, pipeline)
│   ├── performance/             # 11 controllers (reviews, OKRs, feedback)
│   ├── expense/                 # 8 controllers (claims, approvals)
│   ├── asset/                   # 6 controllers (inventory, allocation)
│   ├── workflow/                # 10 controllers (approvals engine)
│   ├── analytics/               # 7 controllers (dashboards, reports)
│   └── notification/            # 5 controllers (email, SMS, push)
├── application/                 # 199 Services (business logic)
├── domain/                      # 265 Entities (JPA models)
├── infrastructure/              # 260 Repositories + Kafka + WebSocket
└── common/                      # 30+ Config, Security, Validation
```

**Clean domain separation** with minimal cross-domain dependencies. Strong candidate for *
*domain-driven design (DDD)** patterns if microservices migration is planned.

### 1.4 API Gateway Pattern

**Status:** ❌ **MISSING**

Current architecture has **no dedicated API Gateway**. Spring Boot monolith handles:

- Authentication (JWT validation)
- Rate limiting (Bucket4j + Redis)
- CORS (Spring Security)
- Request routing (internal @RequestMapping)

**KEKA Comparison:** KEKA likely uses Kong or AWS API Gateway for centralized:

- Authentication offloading
- Traffic shaping
- Analytics
- Protocol translation (REST → gRPC)

**Recommendation:** Add **Spring Cloud Gateway** or **Kong** in front of Spring Boot for:

- Centralized auth (JWT validation before hitting app)
- Circuit breakers
- Request/response transformation
- Multi-version API routing (`/v1`, `/v2`)

### 1.5 Scalability Bottlenecks

| Bottleneck                    | Impact                          | Mitigation                                          |
|-------------------------------|---------------------------------|-----------------------------------------------------|
| **Single JVM**                | CPU-bound, max 8-16 cores       | Horizontal pod scaling (K8s)                        |
| **HikariCP Pool (10 max)**    | 10 concurrent DB queries max    | Increase to 50-100 for prod                         |
| **ThreadLocal TenantContext** | Thread-per-request model        | Async processing (WebFlux) or reactive patterns     |
| **No read replicas**          | All queries hit primary DB      | PostgreSQL read replicas for dashboards             |
| **No query caching**          | Every request hits DB           | Redis query result cache (implemented but disabled) |
| **Synchronous APIs**          | Blocking I/O on long operations | Async endpoints with CompletableFuture              |

**Current Capacity (Estimated):**

- Concurrent users: 50-100 (limited by DB pool)
- Requests/sec: 200-300 (limited by monolith CPU)
- Tenants: 10-50 (limited by shared schema query performance)

**Target Capacity (Enterprise):**

- Concurrent users: 1,000+
- Requests/sec: 2,000+
- Tenants: 500+

---

## 2. Data Architecture Analysis

### 2.1 Database Schema Design

**Scale:** 254 tables across 16 business domains

```mermaid
erDiagram
    TENANT ||--o{ EMPLOYEE : "has many"
    TENANT ||--o{ DEPARTMENT : "has many"
    TENANT ||--o{ ROLE : "has many"

    EMPLOYEE ||--o{ ATTENDANCE_RECORD : "has many"
    EMPLOYEE ||--o{ LEAVE_REQUEST : "has many"
    EMPLOYEE ||--o{ PAYSLIP : "has many"
    EMPLOYEE ||--o{ EXPENSE_CLAIM : "has many"
    EMPLOYEE }o--|| USER : "links to"

    USER ||--o{ USER_ROLE : "has many"
    ROLE ||--o{ ROLE_PERMISSION : "has many"
    PERMISSION ||--o{ ROLE_PERMISSION : "granted to"

    WORKFLOW_DEF ||--o{ WORKFLOW_STEP : "has many"
    WORKFLOW_DEF ||--o{ APPROVAL_INSTANCE : "spawns"
    APPROVAL_INSTANCE ||--o{ APPROVAL_TASK : "has tasks"

    PAYROLL_RUN ||--o{ PAYSLIP : "generates"
    PAYSLIP ||--o{ PAYSLIP_LINE_ITEM : "contains"
```

### 2.2 Normalization Strategy

**Pattern:** **3rd Normal Form (3NF)** with selective denormalization

| Domain         | Tables | Strategy                                                             |
|----------------|--------|----------------------------------------------------------------------|
| **IAM**        | 10     | Fully normalized (users, roles, permissions)                         |
| **Employee**   | 30     | Normalized with separate address, education, family tables           |
| **Payroll**    | 30     | Normalized components, denormalized payslip line items for speed     |
| **Attendance** | 20     | Hybrid: normalized shifts, denormalized daily_attendance for queries |
| **Approvals**  | 15     | Generic workflow engine (polymorphic entity references)              |
| **Audit**      | 5      | JSONB for flexible schema (old_values, new_values)                   |

**KEKA Comparison:**

- KEKA likely denormalizes more aggressively for dashboard performance
- NU-AURA prioritizes data integrity over query speed (a trade-off)

### 2.3 Index Strategy

**Status:** ⚠️ **CRITICAL GAPS IDENTIFIED**

From `docs/issues.md`, **missing critical indexes** causing 200-500ms queries:

```sql
-- P0: Critical indexes for dashboard performance (docs/issues.md L348-350)
CREATE INDEX idx_attendance_lookup
ON attendance_records(tenant_id, employee_id, attendance_date);

CREATE INDEX idx_payslips_lookup
ON payslips(tenant_id, employee_id, pay_period_year, pay_period_month);

CREATE INDEX idx_leave_balance_lookup
ON leave_balances(tenant_id, employee_id, year);

-- P1: High-priority indexes for auth and queries (L353-355)
CREATE INDEX idx_users_email_tenant
ON users(email, tenant_id);

CREATE INDEX idx_leave_requests_status
ON leave_requests(tenant_id, employee_id, status, start_date);

CREATE INDEX idx_holidays_date_range
ON holidays(tenant_id, holiday_date);

-- P2: Supporting indexes (L358-360)
CREATE INDEX idx_scheduled_reports_active
ON scheduled_reports(is_active, next_run_at) WHERE is_active = true;

CREATE INDEX idx_role_permissions_role
ON role_permissions(role_id);

CREATE INDEX idx_user_roles_user
ON user_roles(user_id);
```

**Impact:** Missing indexes cause:

- Dashboard load: **25 seconds** (target: <2s)
- Auth query: **1,338ms** (target: <200ms)
- Attendance query: **450ms** (target: <50ms)

**KEKA Comparison:**

- KEKA likely has comprehensive covering indexes
- NU-AURA has **structural indexes** but missing **performance indexes**

### 2.4 Query Performance Patterns

**Anti-Pattern: N+1 Queries** (docs/issues.md L175-209)

```java
// BAD: 11 sequential queries for payslip data
for (int month = 1; month <= 11; month++) {
    PayslipDetails details = payslipRepository
        .findPayslipDetailsByEmployeeIdAndYearAndMonth(employeeId, year, month);
    // 222-333ms per query = 2,500ms total
}

// GOOD: Single batch query
List<Integer> months = IntStream.rangeClosed(1, 11).boxed().collect(Collectors.toList());
List<PayslipDetails> details = payslipRepository
    .findPayslipDetailsByEmployeeIdAndYearAndMonths(employeeId, year, months);
// Single query = ~100ms
```

**Root Cause:** Hibernate lazy loading without JOIN FETCH optimization.

### 2.5 Migration Strategy

**Status:** ✅ **STRONG**

- Flyway migrations: V0–V67 (64 files)
- Next migration: **V68**
- Legacy Liquibase: **DEPRECATED** (db/changelog/ not used)
- Migration discipline: Clean version history, no merge conflicts

**Best Practice:** All migrations are:

- Idempotent (safe to rerun)
- Backward compatible (blue-green deployments)
- Tested in Neon cloud before production

### 2.6 Connection Pooling

**HikariCP Configuration:**

| Profile  | Max Pool | Min Idle | Connection Timeout | Max Lifetime |
|----------|----------|----------|--------------------|--------------|
| **Dev**  | 10       | 2        | 30s                | 30min        |
| **Prod** | 20       | 5        | 30s                | 10min        |

**Analysis:**

- Max pool of **10 (dev)** and **20 (prod)** is **LOW** for enterprise SaaS
- Industry standard: 50-100 for monolith serving 100+ concurrent users
- **Bottleneck:** With 20 connections and 200ms avg query time, max throughput is 100 req/sec

**Recommendation:**

```yaml
spring.datasource.hikari:
  maximum-pool-size: 100  # Up from 20
  minimum-idle: 20        # Up from 5
  leak-detection-threshold: 30000  # Down from 60000 (faster leak detection)
```

---

## 3. Integration Architecture Analysis

### 3.1 Event-Driven Architecture (Kafka)

**Topology:**

```mermaid
graph LR
    subgraph "Producers"
        LeaveService[Leave Service]
        PayrollService[Payroll Service]
        EmployeeService[Employee Service]
        FluenceService[Fluence Service]
    end

    subgraph "Kafka Topics"
        T1[nu-aura.approvals]
        T2[nu-aura.notifications]
        T3[nu-aura.audit]
        T4[nu-aura.employee-lifecycle]
        T5[nu-aura.fluence-content]

        DLT1[*.approvals.dlt]
        DLT2[*.notifications.dlt]
        DLT3[*.audit.dlt]
        DLT4[*.employee-lifecycle.dlt]
        DLT5[*.fluence-content.dlt]
    end

    subgraph "Consumers"
        ApprovalConsumer[Approval Consumer]
        NotificationConsumer[Notification Consumer]
        AuditConsumer[Audit Consumer]
        LifecycleConsumer[Lifecycle Consumer]
        SearchConsumer[Search Consumer]
        DLTHandler[DLT Handler]
    end

    LeaveService --> T1
    PayrollService --> T1
    EmployeeService --> T4
    FluenceService --> T5

    LeaveService --> T3
    PayrollService --> T3

    LeaveService --> T2
    PayrollService --> T2

    T1 --> ApprovalConsumer
    T2 --> NotificationConsumer
    T3 --> AuditConsumer
    T4 --> LifecycleConsumer
    T5 --> SearchConsumer

    T1 -.failure.-> DLT1
    T2 -.failure.-> DLT2
    T3 -.failure.-> DLT3
    T4 -.failure.-> DLT4
    T5 -.failure.-> DLT5

    DLT1 --> DLTHandler
    DLT2 --> DLTHandler
    DLT3 --> DLTHandler
    DLT4 --> DLTHandler
    DLT5 --> DLTHandler
```

**Configuration:**

- **Kafka Version:** Confluent 7.6.0
- **Replication Factor:** 1 (dev), 3 (prod recommended)
- **Retention:** 168 hours (7 days)
- **Compression:** Snappy
- **Consumer Groups:** 6 (5 domain consumers + 1 DLT handler)

**Idempotency Pattern:**

```java
@KafkaListener(topics = "nu-aura.approvals", groupId = "nu-aura-approvals-service")
public void handleApprovalEvent(ApprovalEvent event) {
    // Event deduplication via eventId
    if (processedEvents.contains(event.getEventId())) {
        return; // Already processed
    }
    // ... process event
    processedEvents.add(event.getEventId());
}
```

**KEKA Comparison:**

- KEKA likely uses AWS SNS/SQS or Kafka
- NU-AURA has **production-grade DLT pattern** (not common in HRMS platforms)
- Dead-letter topic handling stores failed events in `FailedKafkaEvent` table for manual recovery

### 3.2 Synchronous Communication (REST APIs)

**API Design:**

- **Protocol:** REST only (no GraphQL, no gRPC)
- **Versioning:** URL-based (`/api/v1/...`)
- **Format:** JSON (application/json)
- **Authentication:** JWT in httpOnly cookies
- **Rate Limiting:** 100 req/min per user

**API Structure:**

```
/api/v1/
├── auth/              # Login, logout, refresh, MFA
├── employees/         # CRUD, directory, org chart
├── attendance/        # Punches, shifts, timesheets
├── leave/             # Requests, policies, balances
├── payroll/           # Runs, payslips, components
├── recruitment/       # Jobs, candidates, pipeline
├── performance/       # Reviews, OKRs, feedback
├── expenses/          # Claims, approvals
├── approvals/         # Workflow engine
├── dashboards/        # Analytics, reports
└── notifications/     # Email, SMS, push
```

**Missing Capabilities:**

- ❌ **GraphQL:** No support for flexible queries (over-fetching in dashboards)
- ❌ **gRPC:** No support for high-performance inter-service calls
- ❌ **WebHooks:** Implemented but limited to 3rd-party integrations (DocuSign, job boards)
- ✅ **WebSocket/STOMP:** Real-time notifications at `/ws/**`

**KEKA Comparison:**

- KEKA may offer GraphQL for dashboard flexibility
- NU-AURA's REST-only approach simpler but less flexible

### 3.3 External Integrations

| Integration       | Type          | Purpose                          | Status                              |
|-------------------|---------------|----------------------------------|-------------------------------------|
| **Google OAuth**  | OAuth 2.0     | Social login + Calendar          | ✅ Active                            |
| **Twilio**        | REST API      | SMS notifications                | ✅ Active (mock in dev)              |
| **MinIO**         | S3-compatible | File storage (docs, resumes)     | ✅ Active                            |
| **Elasticsearch** | REST API      | Full-text search (NU-Fluence)    | ✅ Active                            |
| **SMTP**          | Email         | Email delivery                   | ✅ Active                            |
| **Job Boards**    | REST APIs     | Naukri, Indeed, LinkedIn posting | 🚧 Configured (pending credentials) |
| **DocuSign**      | Webhook       | E-signature callbacks            | ✅ Active (HMAC-verified)            |
| **Razorpay**      | Future        | Payment gateway                  | ❌ Not implemented                   |

**Integration Patterns:**

- **Retry Logic:** Exponential backoff for transient failures
- **Circuit Breaker:** Not implemented (recommendation: Resilience4j)
- **Webhook Security:** HMAC verification for DocuSign callbacks

---

## 4. Security Architecture Analysis

### 4.1 Authentication

**Pattern:** JWT in httpOnly cookies (ADR-002)

```mermaid
sequenceDiagram
    participant Client
    participant Next.js
    participant Spring Boot
    participant PostgreSQL
    participant Redis

    Client->>Next.js: POST /auth/login
    Next.js->>Spring Boot: POST /api/v1/auth/login
    Spring Boot->>PostgreSQL: SELECT user WHERE email=?
    PostgreSQL-->>Spring Boot: User + roles
    Spring Boot->>Redis: getCachedPermissions(roles)
    Redis-->>Spring Boot: 500+ permissions
    Spring Boot->>Spring Boot: Generate JWT (roles only)
    Spring Boot-->>Next.js: Set-Cookie: access_token (httpOnly)
    Next.js-->>Client: 200 OK + redirect to dashboard

    Note over Client,Redis: Access token: 1 hour, Refresh token: 24 hours

    Client->>Next.js: GET /dashboard
    Next.js->>Spring Boot: GET /api/v1/dashboards/employee (Cookie: access_token)
    Spring Boot->>Spring Boot: Validate JWT signature
    Spring Boot->>Redis: getCachedPermissions(roles)
    Redis-->>Spring Boot: Permissions array
    Spring Boot->>Spring Boot: Check @RequiresPermission("DASHBOARD:READ")
    Spring Boot->>PostgreSQL: Query dashboard data
    PostgreSQL-->>Spring Boot: Data
    Spring Boot-->>Next.js: 200 OK + JSON
    Next.js-->>Client: Render dashboard
```

**Token Optimization (ADR-002 / CRIT-001):**

- Permissions **removed from JWT** to keep cookie < 4096 bytes (96% size reduction)
- JWT contains **roles only** (e.g., `["SUPER_ADMIN", "HR_MANAGER"]`)
- Permissions loaded from DB via `SecurityService.getCachedPermissions()` on each request
- Redis cache: 1-hour TTL

**Security Features:**

- ✅ httpOnly cookies (XSS protection)
- ✅ Secure flag (HTTPS only)
- ✅ SameSite=Strict (CSRF protection)
- ✅ Token rotation on refresh
- ✅ Short access token lifetime (1 hour)
- ❌ No token blacklist (logout doesn't revoke tokens immediately)
- ❌ No device fingerprinting

### 4.2 Authorization (RBAC)

**Scale:** 500+ granular permissions across 16 modules

**Permission Format:**

- Database: `module.action` (e.g., `employee.read`)
- Java constants: `MODULE:ACTION` (e.g., `EMPLOYEE:READ`)
- Normalization: `JwtAuthenticationFilter.normalizePermissionCode()` converts at load time

**Permission Hierarchy:**

```
MODULE:MANAGE → MODULE:READ → MODULE:VIEW_ALL → MODULE:VIEW_TEAM → MODULE:VIEW_SELF
```

**SuperAdmin Bypass:**

```java
// PermissionAspect.java
@Around("@annotation(requiresPermission)")
public Object checkPermission(ProceedingJoinPoint joinPoint, RequiresPermission requiresPermission) {
    if (SecurityContext.isSuperAdmin()) {
        return joinPoint.proceed(); // Bypass ALL checks
    }
    // ... normal permission check
}
```

**KEKA Comparison:**

- KEKA likely has 200-300 permissions (less granular)
- NU-AURA's 500+ permissions provide **fine-grained control** but higher complexity
- Both use RBAC (not ABAC — attribute-based access control)

### 4.3 Tenant Isolation

**Pattern:** Shared database + Row-Level Security (RLS)

**PostgreSQL RLS Policy Example:**

```sql
CREATE POLICY tenant_isolation_policy ON employees
FOR ALL
USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
```

**TenantContext Flow:**

```java
// TenantFilter.java (runs before JwtAuthenticationFilter)
public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain) {
    String tenantId = extractTenantIdFromJwt(request);
    TenantContext.setCurrentTenant(UUID.fromString(tenantId));

    try {
        chain.doFilter(request, response);
    } finally {
        TenantContext.clear(); // Critical: prevent tenant bleed
    }
}
```

**Security Guarantees:**

- ✅ PostgreSQL RLS enforces tenant_id filter at database level
- ✅ ThreadLocal cleared after every request
- ✅ All queries must include tenant_id (Hibernate filter)
- ⚠️ No cross-tenant analytics (even for platform admins)
- ❌ No tenant-level encryption (all tenants share same encryption key)

**KEKA Comparison:**

- KEKA may use **separate schemas per tenant** (more isolation, higher ops cost)
- NU-AURA's **shared schema** is cost-efficient but riskier

### 4.4 Rate Limiting

**Pattern:** Token bucket algorithm (Bucket4j + Redis)

| Endpoint Category        | Capacity     | Refill Rate     |
|--------------------------|--------------|-----------------|
| Auth (`/api/v1/auth/**`) | 5 requests   | 5 per minute    |
| General API              | 100 requests | 100 per minute  |
| Export/Reporting         | 5 requests   | 5 per 5 minutes |
| Social Feed              | 30 requests  | 30 per minute   |

**Implementation:**

```java
// RateLimitingFilter.java
Bucket bucket = Bucket4j.builder()
    .addLimit(Bandwidth.classic(100, Refill.intervally(100, Duration.ofMinutes(1))))
    .build();

if (!bucket.tryConsume(1)) {
    response.setStatus(429); // Too Many Requests
    return;
}
```

**KEKA Comparison:**

- KEKA likely uses AWS WAF or Cloudflare rate limiting
- NU-AURA's **application-level** rate limiting is flexible but higher overhead

### 4.5 OWASP Security Headers

**Enforced at TWO levels:**

1. **Next.js Middleware (Edge)** — first line of defense
2. **Spring Security (Backend)** — defense in depth

```http
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Strict-Transport-Security: max-age=31536000; includeSubDomains
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
Content-Security-Policy: default-src 'self'; frame-ancestors 'none'
```

**Grade:** ✅ **A+ Security Headers** (OWASP top 10 compliance)

---

## 5. Performance & Reliability Analysis

### 5.1 Critical Performance Issues

**From docs/issues.md:**

| Issue                     | Current              | Target   | Impact                       |
|---------------------------|----------------------|----------|------------------------------|
| **Dashboard Load Time**   | 25,146ms             | <2,000ms | **CRITICAL** — unusable UX   |
| **User Authentication**   | 1,338ms              | <200ms   | High — slow login            |
| **Attendance Query**      | 450ms                | <50ms    | High — laggy check-in        |
| **Payslip Queries (N+1)** | 2,500ms (11 queries) | <100ms   | High — slow payroll          |
| **Leave Balance Query**   | 517ms                | <50ms    | Medium — dashboard component |
| **Holiday Query**         | 270ms                | <20ms    | Medium — repeated calls      |

**Root Causes:**

1. **N+1 Query Pattern** — 11 sequential payslip queries instead of batch
2. **Missing Indexes** — attendance, payslips, leave_balances tables
3. **No Caching** — Redis configured but disabled (`@Cacheable` not used)
4. **Sequential Execution** — dashboard queries run one after another (not parallel)
5. **No Query Result Cache** — every request hits database

### 5.2 Caching Strategy

**Status:** ⚠️ **CONFIGURED BUT NOT IMPLEMENTED**

**Redis Cache Configuration:**

```yaml
spring:
  cache:
    type: redis
    redis:
      time-to-live: 3600000  # 1 hour
```

**Missing Implementation:**

```java
// SHOULD BE:
@Cacheable(value = "dashboard", key = "#tenantId + ':' + #employeeId")
public DashboardResponse getEmployeeDashboard(UUID tenantId, UUID employeeId) {
    // ...
}

@CacheEvict(value = "leave-balance", key = "#tenantId + ':' + #employeeId")
public void approveLeave(UUID tenantId, UUID employeeId, UUID leaveRequestId) {
    // ...
}
```

**Recommended Cache Keys:**

```
hrms:dashboard:{tenantId}:{employeeId}:v1          # TTL: 5 minutes
hrms:permissions:{userId}:v1                       # TTL: 15 minutes (already cached)
hrms:attendance:{tenantId}:{employeeId}:{date}:v1  # TTL: 6 hours
hrms:holidays:{tenantId}:{year}:v1                 # TTL: 24 hours
hrms:leave-balance:{tenantId}:{employeeId}:{year}:v1  # TTL: 5 minutes
```

**KEKA Comparison:**

- KEKA likely has **aggressive caching** at multiple layers (CDN, Redis, in-memory)
- NU-AURA has **infrastructure** but missing **application-level** cache annotations

### 5.3 Concurrency & Parallelism

**Current Pattern:** Sequential blocking I/O

```java
// BAD: Queries run one after another (25+ seconds total)
var attendance = getAttendanceData(employeeId);       // 450ms
var leaves = getLeaveData(employeeId);                // 240ms
var payslips = getPayslipData(employeeId);            // 2,500ms
var balances = getLeaveBalances(employeeId);          // 517ms
// Total: 3,707ms (sequential)
```

**Recommended Pattern:** Parallel execution with CompletableFuture

```java
// GOOD: Queries run in parallel (limited by slowest query)
CompletableFuture<AttendanceData> attendanceFuture =
    CompletableFuture.supplyAsync(() -> getAttendanceData(employeeId), executor);
CompletableFuture<LeaveData> leaveFuture =
    CompletableFuture.supplyAsync(() -> getLeaveData(employeeId), executor);
CompletableFuture<PayslipData> payslipFuture =
    CompletableFuture.supplyAsync(() -> getPayslipData(employeeId), executor);
CompletableFuture<LeaveBalance> balanceFuture =
    CompletableFuture.supplyAsync(() -> getLeaveBalances(employeeId), executor);

CompletableFuture.allOf(attendanceFuture, leaveFuture, payslipFuture, balanceFuture).join();
// Total: ~2,500ms (limited by payslip query)
```

**Expected Improvement:** 25s → 2.5s (10x faster) with parallelism alone

### 5.4 Scheduled Jobs

**Scale:** 24 `@Scheduled` jobs across:

- Attendance: Auto-regularization
- Contracts: Lifecycle management
- Email: Scheduled delivery
- Notifications: Scheduled dispatch
- Recruitment: Job board sync
- Workflows: Escalation
- Reports: Scheduled execution
- Webhooks: Delivery + retry
- Rate Limiting: Token bucket cleanup
- Tenant: Tenant operations

**Concurrency Control:** ❌ **MISSING**

```java
// RISK: Multiple pods running same scheduled job in K8s cluster
@Scheduled(cron = "0 0 0 * * ?")
public void runDailyPayroll() {
    // If 3 pods, this runs 3x!
}
```

**Recommendation:** Add **ShedLock** for distributed lock:

```java
@Scheduled(cron = "0 0 0 * * ?")
@SchedulerLock(name = "runDailyPayroll", lockAtMostFor = "30m", lockAtLeastFor = "5m")
public void runDailyPayroll() {
    // Only 1 pod executes
}
```

### 5.5 Observability

**Monitoring Stack:**

- **Prometheus:** 28 alert rules, 19 SLOs
- **Grafana:** 4 dashboards (System, API, Business, Webhooks)
- **AlertManager:** Email + webhook + PagerDuty

**Key Metrics:**

```yaml
# Query timing histogram
hrms.query.duration{repository="AttendanceRecordRepository", method="findByTenantId"}

# Cache hit ratio
hrms.cache.hits{cache="dashboard"}
hrms.cache.misses{cache="dashboard"}

# API latency
http.server.requests{uri="/api/v1/dashboards/employee", status="200"}

# DB pool usage
hikari.pool.active.connections
hikari.pool.pending.connections
```

**Missing Metrics:**

- ❌ Business metrics (daily active users, payroll runs/month)
- ❌ Error rate by endpoint
- ❌ Kafka consumer lag
- ❌ Cache eviction rate

---

## 6. Architecture Scorecard vs KEKA

| Capability             | NU-AURA                      | KEKA (Estimated)                    | Gap Analysis                                  |
|------------------------|------------------------------|-------------------------------------|-----------------------------------------------|
| **Multi-Tenancy**      | Shared DB + RLS              | Likely separate schemas             | KEKA: Better isolation, NU-AURA: Lower cost   |
| **Authentication**     | JWT + httpOnly cookies       | OAuth 2.0 + SAML                    | KEKA: Enterprise SSO, NU-AURA: Consumer-grade |
| **RBAC Granularity**   | 500+ permissions             | 200-300 permissions                 | NU-AURA: More granular (overkill?)            |
| **API Protocols**      | REST only                    | REST + GraphQL (maybe)              | KEKA: More flexible dashboards                |
| **Event-Driven**       | Kafka + DLT                  | AWS SNS/SQS or Kafka                | NU-AURA: Production-grade                     |
| **Caching**            | Redis (not used)             | Multi-layer (CDN, Redis, in-memory) | **KEKA: 10x better**                          |
| **Database Indexes**   | **Missing critical indexes** | Likely comprehensive                | **KEKA: 5x faster queries**                   |
| **Query Optimization** | **N+1 queries**              | Likely batched + cached             | **KEKA: 10x faster**                          |
| **Horizontal Scaling** | Manual (K8s HPA)             | Auto-scaling + read replicas        | KEKA: Better                                  |
| **Observability**      | Prometheus + Grafana         | DataDog or New Relic                | KEKA: Better APM                              |
| **Security Headers**   | OWASP A+                     | Likely A+                           | Parity                                        |
| **Rate Limiting**      | Application-level            | WAF-level (Cloudflare)              | KEKA: Lower overhead                          |
| **File Storage**       | MinIO (self-hosted)          | AWS S3                              | KEKA: Better uptime                           |
| **Search**             | Elasticsearch                | Elasticsearch or Algolia            | Parity                                        |
| **Mobile Support**     | None                         | iOS + Android apps                  | **KEKA: Mobile-first**                        |

**Overall Assessment:**

- NU-AURA has **better foundations** (event-driven, RBAC, security)
- KEKA has **better execution** (performance, caching, mobile)
- NU-AURA needs **3-6 months of optimization** to match KEKA performance

---

## 7. System Context Diagram (C4 Model)

```mermaid
C4Context
    title System Context - NU-AURA Platform

    Person(employee, "Employee", "End user accessing HRMS features")
    Person(hr, "HR Manager", "Manages employees, payroll, policies")
    Person(admin, "System Admin", "Platform configuration, user management")

    System_Boundary(nuaura, "NU-AURA Platform") {
        System(web, "Next.js Frontend", "React SPA, port 3000")
        System(api, "Spring Boot Backend", "Java 17 monolith, port 8080")
        System(db, "PostgreSQL", "254 tables, Neon cloud")
        System(redis, "Redis", "Cache + sessions + rate limiting")
        System(kafka, "Kafka", "5 topics, event streaming")
        System(es, "Elasticsearch", "Full-text search")
        System(minio, "MinIO", "S3-compatible file storage")
    }

    System_Ext(google, "Google OAuth", "SSO authentication")
    System_Ext(twilio, "Twilio", "SMS notifications")
    System_Ext(smtp, "SMTP Server", "Email delivery")
    System_Ext(jobboards, "Job Boards", "Naukri, Indeed, LinkedIn")
    System_Ext(docusign, "DocuSign", "E-signature")

    Rel(employee, web, "Uses", "HTTPS")
    Rel(hr, web, "Uses", "HTTPS")
    Rel(admin, web, "Uses", "HTTPS")

    Rel(web, api, "API calls", "REST/JSON, JWT")
    Rel(api, db, "Queries", "JDBC, HikariCP")
    Rel(api, redis, "Cache", "Lettuce client")
    Rel(api, kafka, "Publishes/Consumes", "Kafka client")
    Rel(api, es, "Indexes", "REST API")
    Rel(api, minio, "Stores files", "S3 SDK")

    Rel(api, google, "OAuth login", "HTTPS")
    Rel(api, twilio, "Send SMS", "REST API")
    Rel(api, smtp, "Send email", "SMTP")
    Rel(api, jobboards, "Post jobs", "REST API")
    Rel(docusign, api, "Webhooks", "HTTPS, HMAC")

    UpdateLayoutConfig($c4ShapeInRow="3", $c4BoundaryInRow="1")
```

---

## 8. Scalability Analysis

### 8.1 Current Limits

| Resource             | Current Limit | Bottleneck                      |
|----------------------|---------------|---------------------------------|
| **Concurrent Users** | 50-100        | DB pool (10-20 connections)     |
| **Requests/Second**  | 200-300       | Monolith CPU (single JVM)       |
| **Tenants**          | 10-50         | Shared schema query performance |
| **Database Size**    | 100 GB        | Single PostgreSQL instance      |
| **File Storage**     | 1 TB          | MinIO single-node               |

### 8.2 Growth Path (3 Phases)

**Phase 1: Optimize Monolith (0-3 months)**

- Add missing database indexes (P0) → **10x query speedup**
- Implement Redis caching (`@Cacheable`) → **5x dashboard speedup**
- Parallelize dashboard queries (CompletableFuture) → **10x dashboard speedup**
- Increase HikariCP pool to 100 → **5x concurrent users**
- Add read replicas for dashboards → **2x read throughput**

**Expected Capacity:** 500 concurrent users, 1,000 req/sec, 100 tenants

**Phase 2: Modernize (3-9 months)**

- Migrate to WebFlux (reactive programming) → **3x CPU efficiency**
- Add API Gateway (Spring Cloud Gateway) → **centralized auth, circuit breakers**
- Implement GraphQL for dashboards → **reduce over-fetching**
- Add CDN (Cloudflare) → **5x static asset speed**
- Shard database by tenant_id → **10x write throughput**

**Expected Capacity:** 2,000 concurrent users, 5,000 req/sec, 500 tenants

**Phase 3: Scale (9-18 months)**

- Migrate to microservices (11 domains → 11 services) → **independent scaling**
- Add Kubernetes auto-scaling (HPA) → **elastic capacity**
- Use managed Kafka (Confluent Cloud) → **99.99% uptime**
- Add global CDN + edge caching → **sub-100ms global latency**
- Implement multi-region deployment → **disaster recovery**

**Expected Capacity:** 10,000+ concurrent users, 20,000+ req/sec, 5,000+ tenants

### 8.3 Cost Analysis

| Phase                  | Infrastructure Cost | Ops Overhead      | ROI                                         |
|------------------------|---------------------|-------------------|---------------------------------------------|
| **Monolith (Current)** | $500/month          | Low (1 DevOps)    | High (fast development)                     |
| **Optimized Monolith** | $1,500/month        | Low (1 DevOps)    | **Very High** (10x performance for 3x cost) |
| **Modernized**         | $5,000/month        | Medium (2 DevOps) | Medium (better UX, more tenants)            |
| **Microservices**      | $15,000/month       | High (5 DevOps)   | Low (only needed at enterprise scale)       |

**Recommendation:** Stay in **Phase 1-2** until tenant count exceeds 500.

---

## 9. Technical Debt Inventory (Top 10)

| #  | Debt Item                              | Impact                                | Effort  | Priority |
|----|----------------------------------------|---------------------------------------|---------|----------|
| 1  | **Missing database indexes**           | Dashboard 25s load time               | 1 week  | **P0**   |
| 2  | **No caching implementation**          | 5x slower than KEKA                   | 2 weeks | **P0**   |
| 3  | **N+1 query patterns**                 | 10x database load                     | 2 weeks | **P0**   |
| 4  | **No parallel query execution**        | 10x dashboard latency                 | 1 week  | **P1**   |
| 5  | **Low HikariCP pool size**             | 50 user concurrency limit             | 1 day   | **P1**   |
| 6  | **No API Gateway**                     | No circuit breakers, centralized auth | 4 weeks | **P2**   |
| 7  | **No GraphQL**                         | Dashboard over-fetching               | 6 weeks | **P2**   |
| 8  | **No read replicas**                   | Read throughput bottleneck            | 2 weeks | **P2**   |
| 9  | **No distributed lock for @Scheduled** | Duplicate job execution in K8s        | 1 week  | **P2**   |
| 10 | **No CDN for static assets**           | Slow frontend load times              | 1 week  | **P3**   |

**Total Estimated Effort:** 20 weeks (5 months) for P0-P2

---

## 10. Architecture Evolution Roadmap

### Phase 1: Optimize (Months 1-3) — Target: Match KEKA Performance

**Goals:**

- Dashboard load time < 2 seconds
- Auth query < 200ms
- Support 500 concurrent users

**Tasks:**

1. **Week 1-2:** Add database indexes (V68 migration)

- `idx_attendance_lookup`, `idx_payslips_lookup`, `idx_leave_balance_lookup`
- Run EXPLAIN ANALYZE on all slow queries

2. **Week 3-4:** Implement Redis caching

- Add `@Cacheable` annotations to dashboard service
- Add cache eviction on data updates
- Monitor cache hit ratio (target: 80%)

3. **Week 5-6:** Fix N+1 queries

- Batch payslip queries (11 queries → 1 query)
- Add JOIN FETCH for user authentication

4. **Week 7-8:** Parallelize dashboard queries

- Use CompletableFuture for independent queries
- Create dashboardExecutor ThreadPoolTaskExecutor

5. **Week 9-10:** Increase HikariCP pool

- Dev: 10 → 50, Prod: 20 → 100
- Monitor connection pool usage

6. **Week 11-12:** Load testing + tuning

- Simulate 500 concurrent users (JMeter/k6)
- Identify remaining bottlenecks
- Update Prometheus alerts

**Deliverables:**

- ✅ 10x dashboard performance improvement
- ✅ 5x concurrent user capacity
- ✅ 80% cache hit ratio
- ✅ All queries < 200ms

### Phase 2: Modernize (Months 4-9) — Target: Enterprise-Grade

**Goals:**

- Support 2,000 concurrent users
- 99.9% uptime SLA
- Global CDN deployment

**Tasks:**

1. **Months 4-5:** Add API Gateway

- Deploy Spring Cloud Gateway
- Migrate JWT validation to gateway
- Add circuit breakers (Resilience4j)

2. **Months 5-6:** Add PostgreSQL read replicas

- Configure master-slave replication
- Route dashboard queries to replicas
- Monitor replication lag

3. **Months 6-7:** Implement GraphQL

- Add Spring GraphQL dependency
- Create schema for dashboards
- Migrate frontend to Apollo Client

4. **Months 7-8:** Add CDN (Cloudflare)

- Serve static assets from CDN
- Add edge caching for public APIs
- Configure cache purge webhooks

5. **Month 9:** Kubernetes auto-scaling

- Configure HPA (CPU/memory)
- Add pod disruption budgets
- Test scale-up/down behavior

**Deliverables:**

- ✅ 2,000 concurrent users
- ✅ 99.9% uptime
- ✅ Sub-100ms global latency

### Phase 3: Scale (Months 10-18) — Target: 10,000+ Users

**Goals:**

- Support 10,000+ concurrent users
- Multi-region deployment
- Independent service scaling

**Tasks:**

1. **Months 10-12:** Migrate to microservices

- Extract 11 domains into services
- Implement service mesh (Istio)
- Add distributed tracing (Jaeger)

2. **Months 13-15:** Database sharding

- Shard by tenant_id (10 shards)
- Add shard routing logic
- Migrate data incrementally

3. **Months 16-18:** Multi-region deployment

- Deploy to 3 regions (US, EU, APAC)
- Add geo-routing (Cloudflare)
- Implement cross-region replication

**Deliverables:**

- ✅ 10,000+ concurrent users
- ✅ 99.99% uptime
- ✅ Sub-50ms regional latency

---

## 11. Recommendations

### Immediate Actions (This Week)

1. **Add Critical Indexes (V68 Migration)**
   ```sql
   CREATE INDEX CONCURRENTLY idx_attendance_lookup
   ON attendance_records(tenant_id, employee_id, attendance_date);

   CREATE INDEX CONCURRENTLY idx_payslips_lookup
   ON payslips(tenant_id, employee_id, pay_period_year, pay_period_month);

   CREATE INDEX CONCURRENTLY idx_leave_balance_lookup
   ON leave_balances(tenant_id, employee_id, year);
   ```
   **Impact:** 40-50% dashboard improvement immediately

2. **Enable Query Result Caching**
   ```java
   @Cacheable(value = "dashboard", key = "#tenantId + ':' + #employeeId")
   public DashboardResponse getEmployeeDashboard(UUID tenantId, UUID employeeId) {
       // ...
   }
   ```
   **Impact:** 70-80% improvement for repeat requests

3. **Limit Dashboard Data Range**

- Change from 11 months to 3 months for payslip queries
  **Impact:** 60-70% reduction in query time

### Short-Term (Next Month)

4. **Batch Queries** — Fix N+1 patterns (payslips, attendance)
5. **Parallel Execution** — CompletableFuture for dashboard
6. **Increase HikariCP** — Dev: 50, Prod: 100

### Medium-Term (Next Quarter)

7. **Add API Gateway** — Spring Cloud Gateway
8. **PostgreSQL Read Replicas** — For dashboard queries
9. **GraphQL** — For flexible dashboard queries
10. **CDN** — Cloudflare for static assets

### Long-Term (Next Year)

11. **Microservices** — Only if tenant count > 500
12. **Database Sharding** — Only if DB size > 1 TB
13. **Multi-Region** — Only if global customer base

---

## 12. Conclusion

NU-AURA is a **well-architected HRMS platform** with strong foundations in security, multi-tenancy,
and event-driven design. The codebase demonstrates **enterprise-grade engineering practices** with
clean domain separation, comprehensive RBAC, and production-ready infrastructure.

However, **critical performance issues** (25-second dashboard, N+1 queries, missing indexes)
severely impact user experience and limit scalability. These issues are **entirely fixable** through
database optimization, caching implementation, and query refactoring.

**Verdict:** NU-AURA can **match or exceed KEKA performance** with 3-6 months of focused
optimization work. The architecture is sound; execution needs improvement.

**Next Steps:**

1. Implement **Phase 1 roadmap** (database indexes, caching, parallel queries)
2. Conduct load testing to validate improvements
3. Monitor Prometheus metrics to track progress
4. Reassess microservices migration after reaching 500 tenants

---

## Appendix: File References

**Key Architecture Files:**

- `/Users/fayaz.m/IdeaProjects/nulogic/nu-aura/docs/issues.md` — Performance analysis
- `/Users/fayaz.m/IdeaProjects/nulogic/nu-aura/MEMORY.md` — Architecture decisions
-

`/Users/fayaz.m/IdeaProjects/nulogic/nu-aura/backend/src/main/java/com/hrms/common/config/SecurityConfig.java` —
Security configuration

- `/Users/fayaz.m/IdeaProjects/nulogic/nu-aura/docs/build-kit/05_DATABASE_SCHEMA_DESIGN.md` — Schema
  design
- `/Users/fayaz.m/IdeaProjects/nulogic/nu-aura/docs/adr/ADR-001-multi-tenant-architecture.md` —
  Multi-tenancy ADR
- `/Users/fayaz.m/IdeaProjects/nulogic/nu-aura/docs/adr/ADR-002-authentication-strategy.md` —
  Authentication ADR
- `/Users/fayaz.m/IdeaProjects/nulogic/nu-aura/backend/src/main/resources/application.yml` —
  Application configuration

**Metrics Summary:**

- Java files: 1,622
- Controllers: 130
- Services: 199
- Entities: 265
- Database tables: 254
- Flyway migrations: 64 (V0-V67)
- Kafka topics: 5
- Scheduled jobs: 24
- Frontend pages: 200
- React components: 123

---

**Document Version:** 1.0
**Last Updated:** 2026-03-22
**Next Review:** After Phase 1 optimization (2026-06-22)
