# Quick Start Guide - Architecture Challenges Implementation

**For:** Engineering Team
**Last Updated:** 2026-03-11

This is your practical, hands-on guide to implementing the 5 Architecture Decision Records (ADRs). Each section includes copy-paste ready commands, code snippets, and validation steps.

---

## 🚀 Week 1: Database Connection Pool (ADR-005)

**Goal:** Increase connection pool from 10 → 60 connections in production

### Step 1: Update Configuration (5 minutes)

Edit `/backend/src/main/resources/application.yml`:

```yaml
# Production profile (line 337+)
spring:
  config:
    activate:
      on-profile: prod
  datasource:
    hikari:
      maximum-pool-size: ${DB_POOL_MAX:60}     # Changed from 20
      minimum-idle: ${DB_POOL_MIN:15}          # Changed from 5
      connection-timeout: ${DB_CONN_TIMEOUT:8000}  # 8s (fail fast)
      idle-timeout: ${DB_IDLE_TIMEOUT:180000}      # 3 minutes
      max-lifetime: ${DB_MAX_LIFETIME:540000}      # 9 minutes
      leak-detection-threshold: 30000              # NEW: 30s leak detection
      keepalive-time: 30000                        # NEW: 30s keep-alive
      connection-test-query: SELECT 1              # NEW: validation
      validation-timeout: 3000                     # NEW: 3s validation
      register-mbeans: true                        # NEW: metrics
```

### Step 2: Validate PostgreSQL Capacity (2 minutes)

SSH to PostgreSQL server and run:

```bash
# Check current max_connections
psql -U hrms_user -d hrms -c "SHOW max_connections;"

# If < 100, increase it
# Edit postgresql.conf
sudo nano /var/lib/postgresql/data/postgresql.conf

# Set:
# max_connections = 100
# shared_buffers = 256MB

# Restart PostgreSQL
sudo systemctl restart postgresql
```

### Step 3: Test Locally (10 minutes)

```bash
# Start with dev profile (5 connections)
cd /Users/fayaz.m/IdeaProjects/nulogic/nu-aura/backend
export SPRING_PROFILES_ACTIVE=dev
./mvnw spring-boot:run

# Check HikariCP logs
tail -f logs/application.log | grep HikariPool

# Expected output:
# HikariPool-1 - configuration:
# maximumPoolSize...................................5
```

### Step 4: Deploy to Staging (1 hour)

```bash
# Build production JAR
./mvnw clean package -DskipTests

# Deploy to staging with environment variable
export SPRING_PROFILES_ACTIVE=staging
export DB_POOL_MAX=30
java -jar target/hrms-backend.jar

# Load test with 50 concurrent users
# Install k6 (if not already)
brew install k6

# Run load test
k6 run /Users/fayaz.m/IdeaProjects/nulogic/nu-aura/k6-load-test.js
```

### Step 5: Validate Metrics (30 minutes)

**Grafana Dashboard Query:**

```promql
# Connection pool utilization (target: 60-80%)
(hikaricp_connections_active{pool="hrms-db"} / hikaricp_connections_max{pool="hrms-db"}) * 100

# Connection wait time (target: < 100ms)
histogram_quantile(0.95, rate(hikaricp_connections_acquire_seconds_bucket[5m]))

# Connection timeouts (target: 0)
rate(hikaricp_connections_timeout_total[5m])
```

**Expected Results:**
- ✅ Pool utilization: 60-80%
- ✅ Connection wait time p95: < 100ms
- ✅ Timeouts: 0

### Step 6: Production Rollout (2 hours)

```bash
# Deploy during low-traffic window (2 AM - 4 AM)
# Set production environment variables
export SPRING_PROFILES_ACTIVE=prod
export DB_POOL_MAX=40  # Start conservative

# Deploy via CI/CD or manual
kubectl set env deployment/hrms-backend DB_POOL_MAX=40 -n production

# Monitor for 24 hours, then increase to 60
kubectl set env deployment/hrms-backend DB_POOL_MAX=60 -n production
```

**Total Time:** ~4 hours (including monitoring)

---

## 🎨 Week 2: Theme Migration (ADR-001)

**Goal:** Consolidate theme system to CSS variables

### Step 1: Create Theme Variables (1 hour)

Create `/frontend/app/theme-variables.css`:

```css
/* Light theme */
:root {
  --color-background: #f9fafb;
  --color-surface: #ffffff;
  --color-surface-elevated: #ffffff;
  --color-text-primary: #101828;
  --color-text-secondary: #475467;
  --color-text-tertiary: #667085;
  --color-border: #e4e7ec;
  --color-border-hover: #d0d5dd;

  --color-brand-primary: #465fff;
  --color-brand-hover: #3641f5;
  --color-brand-active: #2a31d8;

  --color-success: #12b76a;
  --color-error: #f04438;
  --color-warning: #f79009;
  --color-info: #465fff;

  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
}

/* Dark theme */
.dark {
  --color-background: #101828;
  --color-surface: #1d2939;
  --color-surface-elevated: #344054;
  --color-text-primary: #f9fafb;
  --color-text-secondary: #d0d5dd;
  --color-text-tertiary: #98a2b3;
  --color-border: #344054;
  --color-border-hover: #475467;

  --color-brand-primary: #5b6fff;
  --color-brand-hover: #7886ff;
  --color-brand-active: #465fff;

  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.3);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.4);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.5);
}

/* Smooth transitions */
* {
  transition: background-color 200ms ease-in-out,
              border-color 200ms ease-in-out,
              color 200ms ease-in-out;
}

.theme-changing * {
  transition: none !important;
}
```

Import in `/frontend/app/globals.css` (line 1):

```css
@import './theme-variables.css';
@tailwind base;
@tailwind components;
@tailwind utilities;
```

### Step 2: Update Tailwind Config (15 minutes)

Edit `/frontend/tailwind.config.js`:

```javascript
module.exports = {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: 'var(--color-background)',
        surface: {
          DEFAULT: 'var(--color-surface)',
          elevated: 'var(--color-surface-elevated)',
        },
        text: {
          primary: 'var(--color-text-primary)',
          secondary: 'var(--color-text-secondary)',
          tertiary: 'var(--color-text-tertiary)',
        },
        border: {
          DEFAULT: 'var(--color-border)',
          hover: 'var(--color-border-hover)',
        },
        brand: {
          DEFAULT: 'var(--color-brand-primary)',
          hover: 'var(--color-brand-hover)',
          active: 'var(--color-brand-active)',
        },
      },
      boxShadow: {
        sm: 'var(--shadow-sm)',
        DEFAULT: 'var(--shadow-md)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
      }
    }
  }
}
```

### Step 3: Migrate Core Components (2 days)

**Example: Card Component**

Before:
```tsx
<div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white">
```

After:
```tsx
<div className="bg-surface border border-border text-text-primary">
```

**Migration Checklist:**
- [ ] `/frontend/components/ui/Card.tsx`
- [ ] `/frontend/components/ui/Button.tsx`
- [ ] `/frontend/components/ui/Modal.tsx`
- [ ] `/frontend/components/layout/Header.tsx`
- [ ] `/frontend/components/layout/Sidebar.tsx`

### Step 4: Test Theme Switching (30 minutes)

```bash
cd /Users/fayaz.m/IdeaProjects/nulogic/nu-aura/frontend
npm run dev

# Open http://localhost:3000
# Click theme toggle
# Verify smooth transition (200ms)
# Check browser console for hydration errors (should be 0)
```

**Total Time:** 16 hours (2 days)

---

## 🔐 Week 3: JWT Optimization (ADR-002)

**Goal:** Reduce JWT from 13KB → 560 bytes

### Step 1: Create Permission Cache Service (4 hours)

Create `/backend/src/main/java/com/hrms/common/security/PermissionCacheService.java`:

```java
@Service
@RequiredArgsConstructor
public class PermissionCacheService {

    private final RedisTemplate<String, Object> redisTemplate;
    private static final String PERMISSION_CACHE_PREFIX = "user:permissions:";
    private static final long CACHE_TTL = 3600; // 1 hour

    public void cacheUserPermissions(String sessionId, UUID userId,
                                      Map<String, RoleScope> permissions,
                                      Set<String> accessibleApps) {
        String key = PERMISSION_CACHE_PREFIX + sessionId;

        PermissionCache cache = PermissionCache.builder()
                .userId(userId.toString())
                .permissions(permissions)
                .accessibleApps(accessibleApps)
                .cachedAt(Instant.now())
                .build();

        redisTemplate.opsForValue().set(key, cache, CACHE_TTL, TimeUnit.SECONDS);
    }

    public Optional<PermissionCache> getCachedPermissions(String sessionId) {
        String key = PERMISSION_CACHE_PREFIX + sessionId;
        PermissionCache cache = (PermissionCache) redisTemplate.opsForValue().get(key);
        return Optional.ofNullable(cache);
    }

    public void invalidateUserPermissions(UUID userId) {
        // Implementation: scan and delete matching keys
    }
}
```

### Step 2: Update JWT Provider (2 hours)

Edit `/backend/src/main/java/com/hrms/common/security/JwtTokenProvider.java`:

Add new method:

```java
public String generateLightweightToken(User user, UUID tenantId, String appCode,
                                        Set<String> roles, UUID employeeId) {
    Date now = new Date();
    Date expiryDate = new Date(now.getTime() + jwtExpiration);

    return Jwts.builder()
            .id(generateJti())
            .subject(user.getEmail())
            .claim("userId", user.getId().toString())
            .claim("tenantId", tenantId.toString())
            .claim("appCode", appCode)
            .claim("roles", new ArrayList<>(roles))
            .claim("employeeId", employeeId != null ? employeeId.toString() : null)
            .claim("sessionId", UUID.randomUUID().toString())  // NEW
            .issuedAt(now)
            .expiration(expiryDate)
            .signWith(getSigningKey())
            .compact();
}
```

### Step 3: Update Authentication Filter (2 hours)

Edit `/backend/src/main/java/com/hrms/common/security/JwtAuthenticationFilter.java`:

```java
@Override
protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                  FilterChain filterChain) throws ServletException, IOException {
    String jwt = getJwtFromRequest(request);

    if (StringUtils.hasText(jwt) && jwtTokenProvider.validateToken(jwt)) {
        String sessionId = jwtTokenProvider.getSessionIdFromToken(jwt);

        // Load from Redis cache
        Optional<PermissionCache> cachedPermissions = permissionCacheService.getCachedPermissions(sessionId);

        if (cachedPermissions.isEmpty()) {
            // Cache miss - reload and cache
            UUID userId = jwtTokenProvider.getUserIdFromToken(jwt);
            Map<String, RoleScope> permissions = userPermissionService.getUserPermissions(userId);
            permissionCacheService.cacheUserPermissions(sessionId, userId, permissions, /* ... */);
        }

        // Build authentication with cached permissions
        // ...
    }

    filterChain.doFilter(request, response);
}
```

### Step 4: Test Token Size (1 hour)

```bash
# Generate token and check size
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password"}'

# Response:
# {"token":"eyJhbGciOiJ...","expiresIn":3600}

# Copy token and decode at https://jwt.io
# Verify payload size < 1KB
```

**Validation:**
```bash
# Check Redis cache
redis-cli
> GET user:permissions:<sessionId>
> TTL user:permissions:<sessionId>
# Should show 3600 seconds
```

**Total Time:** 28 hours (5 days)

---

## 🔄 Week 4-8: Payroll Saga (ADR-003)

**Goal:** Implement fault-tolerant payroll workflow

### Step 1: Create Saga Entity (1 day)

Create `/backend/src/main/java/com/hrms/domain/payroll/PayrollSaga.java`:

```java
@Entity
@Table(name = "payroll_sagas")
@Getter
@Setter
@Builder
public class PayrollSaga extends BaseEntity {

    @Column(name = "payroll_run_id", nullable = false)
    private UUID payrollRunId;

    @Enumerated(EnumType.STRING)
    @Column(name = "state", nullable = false)
    private PayrollSagaState state;

    @Column(name = "current_step")
    private String currentStep;

    @Column(name = "completed_steps")
    private Integer completedSteps = 0;

    @Column(name = "total_employees")
    private Integer totalEmployees;

    @Column(name = "employee_ids", columnDefinition = "jsonb")
    @Convert(converter = UUIDListConverter.class)
    private List<UUID> employeeIds;

    // ... more fields from ADR-003
}

public enum PayrollSagaState {
    INITIATED, CALCULATING, CALCULATED,
    GENERATING_PAYSLIPS, PAYSLIPS_GENERATED,
    SENDING_NOTIFICATIONS, NOTIFICATIONS_SENT,
    UPDATING_BANK_QUEUE, BANK_QUEUE_UPDATED,
    COMPLETED, COMPENSATING, COMPENSATED, FAILED
}
```

### Step 2: Implement Orchestrator (3 days)

See full implementation in [ADR-003](./ADR-003-PAYROLL-SAGA-PATTERN.md), section "Saga Orchestrator Implementation"

### Step 3: Test Saga Flow (1 week)

```bash
# Unit tests
./mvnw test -Dtest=PayrollSagaOrchestratorTest

# Integration test: Trigger payroll run
curl -X POST http://localhost:8080/api/payroll/run \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "month": 3,
    "year": 2026,
    "employeeIds": ["uuid1", "uuid2", ...]
  }'

# Monitor saga progress
curl http://localhost:8080/api/payroll/sagas/{sagaId}

# Check saga state transitions in DB
psql -d hrms -c "SELECT id, state, current_step, completed_steps FROM payroll_sagas ORDER BY created_at DESC LIMIT 10;"
```

**Total Time:** 80 hours (5 weeks)

---

## 📋 Week 4-16: Recruitment ATS (ADR-004)

**Goal:** Implement kanban pipeline, offer letters, analytics

### Phase 1: Kanban Pipeline (Week 4-7)

#### Step 1: Create Pipeline Entities (2 days)

```java
// /backend/src/main/java/com/hrms/domain/recruitment/PipelineStage.java
@Entity
@Table(name = "pipeline_stages")
public class PipelineStage extends BaseEntity {
    @Column(name = "job_opening_id", nullable = false)
    private UUID jobOpeningId;

    @Column(name = "stage_name", nullable = false)
    private String stageName;

    @Column(name = "stage_order", nullable = false)
    private Integer stageOrder;

    @Enumerated(EnumType.STRING)
    @Column(name = "stage_type")
    private StageType stageType;

    // ... more fields
}
```

#### Step 2: Build Kanban Frontend (1 week)

```bash
# Install drag-and-drop library
cd /Users/fayaz.m/IdeaProjects/nulogic/nu-aura/frontend
npm install @dnd-kit/core @dnd-kit/sortable

# Edit /frontend/app/recruitment/[jobId]/kanban/page.tsx
# See full implementation in ADR-004
```

#### Step 3: Offer Letter Generation (1 week)

```bash
# Install PDF generation
cd /Users/fayaz.m/IdeaProjects/nulogic/nu-aura/backend
# Add to pom.xml:
# <dependency>
#   <groupId>com.itextpdf</groupId>
#   <artifactId>itextpdf</artifactId>
#   <version>5.5.13</version>
# </dependency>

# Implement OfferLetterService (see ADR-004)
```

**Total Time:** 480 hours (12 weeks, 2 engineers)

---

## 📊 Monitoring & Validation

### Grafana Dashboard Setup (1 hour)

Create dashboard with 4 panels:

**Panel 1: Connection Pool Health**
```promql
(hikaricp_connections_active / hikaricp_connections_max) * 100
```

**Panel 2: JWT Token Size**
```promql
histogram_quantile(0.99, jwt_token_size_bytes_bucket)
```

**Panel 3: Saga Success Rate**
```promql
rate(payroll_saga_completed_total[5m]) / rate(payroll_saga_started_total[5m])
```

**Panel 4: API Latency**
```promql
histogram_quantile(0.95, rate(http_server_requests_seconds_bucket[5m]))
```

### Alerting Rules

**PagerDuty Alerts:**

```yaml
# Connection pool exhaustion
- alert: ConnectionPoolExhausted
  expr: hikaricp_connections_pending > 5
  for: 5m
  annotations:
    summary: "Connection pool exhausted"

# JWT cache miss rate high
- alert: JWTCacheMissHigh
  expr: rate(redis_cache_misses_total[5m]) / rate(redis_cache_requests_total[5m]) > 0.2
  for: 10m
  annotations:
    summary: "JWT permission cache miss rate > 20%"

# Saga compensation rate high
- alert: SagaCompensationHigh
  expr: rate(payroll_saga_compensated_total[5m]) / rate(payroll_saga_started_total[5m]) > 0.05
  for: 15m
  annotations:
    summary: "Payroll saga compensation rate > 5%"
```

---

## 🐛 Common Issues & Solutions

### Issue 1: Connection Pool Still Exhausted After Increase

**Symptom:** Connection timeouts despite 60-connection pool

**Diagnosis:**
```bash
# Check PostgreSQL max_connections
psql -c "SHOW max_connections;"
# If < 100, increase in postgresql.conf
```

**Solution:**
```bash
sudo nano /var/lib/postgresql/data/postgresql.conf
# Set: max_connections = 100
sudo systemctl restart postgresql
```

---

### Issue 2: Redis Permission Cache Not Working

**Symptom:** Cache hit rate < 50%

**Diagnosis:**
```bash
redis-cli
> KEYS user:permissions:*
> GET user:permissions:<sessionId>
```

**Solution:**
- Verify Redis is running: `redis-cli ping` (should return `PONG`)
- Check TTL: `TTL user:permissions:<key>` (should be ~3600)
- Verify sessionId in JWT: Decode token at jwt.io

---

### Issue 3: Saga Stuck in CALCULATING State

**Symptom:** Saga not progressing past Step 1

**Diagnosis:**
```sql
SELECT id, state, current_step, failure_reason
FROM payroll_sagas
WHERE state NOT IN ('COMPLETED', 'COMPENSATED', 'FAILED')
ORDER BY created_at DESC;
```

**Solution:**
- Check async executor thread pool: `@Async("sagaExecutor")` must be configured
- Review application logs for exceptions
- Manually compensate if needed: `curl -X POST /api/payroll/sagas/{id}/compensate`

---

## 📚 Quick Reference Links

- [ADR Index](./ADR-INDEX.md)
- [Executive Summary](./EXECUTIVE-SUMMARY-ARCHITECTURE-CHALLENGES.md)
- [Visual Diagrams](./ARCHITECTURE-CHALLENGES-DIAGRAM.md)
- Individual ADRs:
  - [ADR-001: Theme](./ADR-001-THEME-CONSOLIDATION.md)
  - [ADR-002: JWT](./ADR-002-JWT-TOKEN-OPTIMIZATION.md)
  - [ADR-003: Saga](./ADR-003-PAYROLL-SAGA-PATTERN.md)
  - [ADR-004: ATS](./ADR-004-RECRUITMENT-ATS-GAP-ANALYSIS.md)
  - [ADR-005: DB Pool](./ADR-005-DATABASE-CONNECTION-POOL-SIZING.md)

---

**Last Updated:** 2026-03-11
**Maintained By:** Architecture Team
**Questions?** Slack: #engineering-architecture
