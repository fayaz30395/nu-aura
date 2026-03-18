# NU-AURA Platform — Senior Architecture & Code Review

**Reviewer:** AI Architecture Reviewer (Principal Architect level)
**Date:** March 18, 2026
**Scope:** Full-stack codebase analysis — Frontend, Backend, Infrastructure, DevOps
**Verdict:** Mature enterprise codebase with strong fundamentals. Several critical gaps need addressing before production hardening.

---

## Executive Summary

NU-AURA is an ambitious, well-architected multi-tenant SaaS platform with 4 sub-applications (HRMS, Hire, Grow, Fluence). The codebase demonstrates solid engineering decisions — shared schema multi-tenancy, JWT + RBAC, Kafka event streaming, proper cache layering — but has **7 critical issues** and **12 high-priority improvements** that need attention before scaling to production tenants.

**Codebase Stats:**
- 137 REST controllers, 150+ service files, 65 domain packages (backend)
- 78 routes, 80+ React Query hooks, 120+ type files (frontend)
- 36 Flyway migrations, 94 test files
- ~100K+ lines of code across both stacks

---

## 1. CRITICAL ISSUES (Must Fix)

### C1. PostgreSQL RLS Is Effectively Disabled

**Location:** `backend/src/main/resources/db/migration/V24__fix_rls_policies.sql`
**Severity:** 🔴 Critical — Data Leak Risk

The V24 migration acknowledges that RLS policies for Contract and Fluence tables use `current_setting('app.current_tenant_id')`, but the `TenantFilter` only sets a Java `ThreadLocal` — it never calls `SET app.current_tenant_id = ?` on the JDBC connection. The "fix" was to make policies `PERMISSIVE` (allow-all), which effectively disables RLS.

**Impact:** If application-layer tenant filtering is ever bypassed (custom queries, SQL injection, new developer mistake), there is **zero database-level protection**. This violates defense-in-depth.

**Recommendation:**
Implement a Hibernate `StatementInspector` or Spring `ConnectionPreparer` that runs `SET app.current_tenant_id = :tenantId` on every connection checkout from the pool. Then re-enable restrictive RLS policies. This is your V25 TODO — prioritize it.

```java
@Component
public class TenantConnectionPreparer implements ConnectionPreparer {
    @Override
    public void prepare(Connection connection) throws SQLException {
        String tenantId = TenantContext.getCurrentTenant();
        if (tenantId != null) {
            try (var stmt = connection.prepareStatement("SET app.current_tenant_id = ?")) {
                stmt.setString(1, tenantId);
                stmt.execute();
            }
        }
    }
}
```

---

### C2. Rate Limiting Is Globally Disabled

**Location:** `backend/src/main/resources/application.yml` → `app.rate-limit.enabled: false`
**Severity:** 🔴 Critical — DDoS / Brute Force Risk

The `RateLimitingFilter` exists and is well-implemented (Bucket4j, per-endpoint buckets), but it's turned off. Authentication endpoints without rate limiting are trivially brute-forceable.

**Recommendation:** Enable immediately. At minimum, auth endpoints need 10 req/min limits. Add monitoring alerts when rate limits are hit.

---

### C3. strictNullChecks Disabled in TypeScript

**Location:** `frontend/tsconfig.json` → `strictNullChecks: false`
**Severity:** 🔴 Critical — Runtime Crash Risk

With 78 routes and 150+ services, disabled null checks mean `undefined` values propagate silently until they cause runtime crashes. This is especially dangerous in data-heavy HR modules (payroll calculations, attendance records).

**Recommendation:** Enable `strictNullChecks: true` incrementally. Start with `lib/` (services, hooks, utils), then `components/`, then `app/`. Use `// @ts-expect-error` sparingly during migration. This will surface dozens of latent bugs.

---

### C4. No Database-Level Soft Delete Index

**Location:** All entities extending `BaseEntity` have `isDeleted` column
**Severity:** 🟠 Critical for Performance

Every query likely filters `WHERE is_deleted = false`, but there's no composite index including `is_deleted`. On tables with millions of rows (attendance_records, audit_logs), this causes full table scans.

**Recommendation:**
Add partial indexes for high-volume tables:
```sql
CREATE INDEX idx_employees_active ON employees (tenant_id, department_id) WHERE is_deleted = false;
CREATE INDEX idx_attendance_active ON attendance_records (tenant_id, employee_id, date) WHERE is_deleted = false;
```

---

### C5. H2 Test Database Masks PostgreSQL-Specific Bugs

**Location:** `backend/src/test/resources/application-test.yml` → H2 with PostgreSQL mode
**Severity:** 🟠 Critical for Reliability

H2's "PostgreSQL compatibility mode" is a loose approximation. UUID handling, JSONB columns, array types, window functions, and especially RLS behave differently. Bugs that pass H2 tests will fail in production PostgreSQL.

**Recommendation:** Use Testcontainers with PostgreSQL 16 for integration tests. Keep H2 only for pure unit tests that don't touch the DB.

```xml
<dependency>
    <groupId>org.testcontainers</groupId>
    <artifactId>postgresql</artifactId>
    <scope>test</scope>
</dependency>
```

---

### C6. JWT Secret Validation Is Insufficient

**Location:** `JwtTokenProvider.java`
**Severity:** 🟠 Critical — Security

The secret is loaded from `${JWT_SECRET}` env var. If this is a weak secret (short string, common phrase), tokens can be forged. There's no startup validation that the secret meets minimum entropy requirements.

**Recommendation:** Add a `@PostConstruct` check that validates: minimum 256 bits (32 bytes), not a common string, Base64-encoded. Fail startup if validation fails.

---

### C7. No Permission Refresh During Active Sessions

**Location:** `frontend/lib/hooks/useAuth.ts`
**Severity:** 🟠 Critical for UX & Security

Permissions are extracted from the JWT at login time and stored in Zustand. If an admin changes a user's role while they're logged in, the user retains their old permissions until they logout/login. Worse, the JWT still contains old claims until it expires (1 hour).

**Recommendation:** Add a `/api/v1/auth/permissions` endpoint that returns current permissions. Call it on WebSocket reconnect, on approval notifications, and every 15 minutes via React Query background refetch. Update Zustand store with fresh permissions.

---

## 2. HIGH-PRIORITY IMPROVEMENTS

### H1. Kafka Error Recovery Is Unclear

Dead-letter topics exist (`*.dlt`) and a `DeadLetterHandler` consumer is registered, but the retry strategy is undocumented. Failed events go to a `failed_kafka_events` DB table, but there's no scheduled job to retry them, no alerting, and no SLA.

**Recommendation:** Implement a retry scheduler (Quartz) that re-publishes failed events with exponential backoff (1min, 5min, 30min, 2hr). Add a dashboard endpoint showing failed event counts. Alert when events are stuck > 1 hour.

---

### H2. No API Response Pagination Standards

Controllers likely use mixed pagination approaches. Without a standardized `PageResponse<T>` wrapper, frontend code must handle different response shapes.

**Recommendation:** Enforce a single pagination contract:
```json
{
  "data": [...],
  "page": { "number": 0, "size": 20, "totalElements": 150, "totalPages": 8 }
}
```

---

### H3. Missing Circuit Breaker for External Services

The platform integrates with Google OAuth, MinIO, SMTP, Twilio SMS, and OpenAI. None of these have circuit breakers. If Google OAuth is down, login attempts will hang until TCP timeout.

**Recommendation:** Add Resilience4j circuit breakers around all external service calls. Configure fallback behaviors (e.g., skip resume parsing if OpenAI is down, queue emails if SMTP is down).

---

### H4. Frontend Bundle Size Risk

78 routes in a single Next.js app without explicit code splitting strategy means the initial bundle could be massive. The `next.config.js` has webpack chunk splitting for vendor/react-query/charts, but route-level lazy loading isn't enforced.

**Recommendation:** Audit bundle with `next-bundle-analyzer`. Consider app-based splitting: HRMS routes, Hire routes, Grow routes in separate chunks. Lazy-load heavy components (rich text editor TipTap, chart libraries) with `dynamic()`.

---

### H5. No Database Connection Pool Monitoring

HikariCP is the default pool but there's no metrics export or alerting on pool exhaustion. Under load, a connection leak will silently stall the application.

**Recommendation:** Enable HikariCP metrics export to Prometheus. Alert when `hikaricp_connections_pending` > 5 for > 30 seconds.

---

### H6. Duplicate Date Utility Libraries

**Location:** `frontend/lib/utils/date-utils.ts` AND `frontend/lib/utils/dateUtils.ts`
Plus `date-fns` AND `dayjs` in package.json.

Two date utility files and two date libraries is a maintenance hazard. Developers will use whichever they find first, leading to inconsistent formatting.

**Recommendation:** Pick one (date-fns is already heavily used). Consolidate into a single `date-utils.ts`. Remove dayjs from package.json.

---

### H7. LazyInitializationException Time Bomb

User entity has LAZY-loaded `roles` ManyToMany. A comment warns developers, but warnings don't prevent bugs. New developers will inevitably access `user.getRoles()` outside a transaction and get a runtime crash.

**Recommendation:** Remove the LAZY collection and always use explicit `@EntityGraph` or dedicated query methods. Alternatively, use Hibernate's `@BatchSize` or a DTO projection to avoid the N+1 while still being safe.

---

### H8. No Outbox Pattern for Kafka Events

Domain events are published to Kafka directly from service methods. If the database transaction commits but Kafka publish fails (or vice versa), you get inconsistent state — the DB says "leave approved" but no notification event was sent.

**Recommendation:** Implement the Transactional Outbox pattern: write events to an `outbox_events` table within the same DB transaction, then have a separate poller publish them to Kafka. This guarantees at-least-once delivery with full consistency.

---

### H9. No Structured Logging Format in Frontend

Backend has MDC-based structured logging (requestId, tenantId). Frontend has a `logger.ts` utility but no structured format, no correlation with backend request IDs, and no log aggregation strategy.

**Recommendation:** Use a structured logger (e.g., pino) with JSON output. Pass the backend's `X-Request-ID` response header into frontend logs. Ship to the same log aggregation platform.

---

### H10. CORS Configuration Needs Audit

CORS allowed origins are configured via environment variable. In development, this likely allows `localhost:3000`. Verify that production doesn't accidentally allow wildcard origins or include development URLs.

---

### H11. No Health Check for Kafka and Redis in Actuator

Docker health check calls `/actuator/health`, but it's unclear if Kafka and Redis health indicators are active. If Redis is down, the app will report "UP" while cache operations fail silently.

**Recommendation:** Ensure `management.health.redis.enabled=true` and `management.health.kafka.enabled=true`. Include these in the Docker health check and Kubernetes readiness probe.

---

### H12. CI Pipeline Skips Backend Tests on Build

**Location:** `pom.xml` → `maven.test.skip=true` during package phase
**Location:** `.github/workflows/ci.yml` → Tests run separately

While CI does run tests in a separate step, the POM's `maven.test.skip=true` means developers can build and deploy without running tests locally. This encourages "push and pray" development.

**Recommendation:** Remove `maven.test.skip` from the POM. Let the CI pipeline's test step be the gate, but don't make it easy to skip locally.

---

## 3. ARCHITECTURE STRENGTHS (What You Got Right)

### S1. Multi-Tenant Design Is Sound
Shared schema + `tenant_id` on all tables + application-layer isolation + cache key prefixing is the right choice for this scale. Just fix the RLS gap (C1).

### S2. Security Posture Is Above Average
httpOnly cookies, CSRF double-submit, XSS sanitization (DOMPurify), CSP headers, encryption at rest (AES), audit logging — this is enterprise-grade. The permission model (`module.action` with scopes) is well-designed.

### S3. Event-Driven Architecture with Kafka
Using Kafka for approval workflows, notifications, audit logging, and employee lifecycle events is the right pattern. Dead-letter topics show foresight. Just add the outbox pattern (H8) and retry strategy (H1).

### S4. Caching Strategy Is Thoughtful
11 named caches with appropriate TTLs (24hr for static data, 5min for volatile data), tenant-prefixed keys, explicit eviction on mutations — this is well-designed. Consider adding cache warming on startup for reference data.

### S5. Frontend Architecture Is Modern and Clean
React Query for server state, Zustand for client state, Zod for validation, Mantine for components — this is a best-practice frontend stack. The separation of concerns (pages → components → services → API) is clean.

### S6. API Design with OpenAPI Documentation
137 controllers with Swagger annotations, consistent error response structure, versioned APIs — this enables good developer experience for API consumers.

### S7. CI/CD Pipeline with Security Scanning
Trivy vulnerability scanning, ESLint, TypeScript strict checking, unit tests, E2E tests, Docker image builds — this is a mature CI pipeline.

### S8. WebSocket Real-Time Notifications
STOMP over SockJS with auto-reconnect, heartbeats, and topic-based subscriptions (broadcast, user-specific, approval-specific) enables real-time UX without polling.

---

## 4. CODE QUALITY OBSERVATIONS

### Patterns That Are Well-Executed
- Consistent use of React Query hooks (80+ hooks following the same pattern)
- MapStruct for entity-to-DTO mapping (zero boilerplate)
- Global exception handler with structured error responses
- Correlation ID propagation (MDC → X-Request-ID)
- Aspect-oriented permission checks (`@RequiresPermission`)

### Patterns That Need Attention
- Some services are very large (likely 500+ lines) — consider splitting into command/query handlers
- No clear bounded context separation between modules — services may cross-reference freely
- Missing input sanitization on some backend endpoints (rely on frontend Zod validation)
- No API versioning strategy beyond `/v1/` — plan for backward compatibility now

---

## 5. RECOMMENDED PRIORITY ORDER

| Priority | Item | Effort | Impact |
|----------|------|--------|--------|
| P0 | C1: Fix RLS — implement StatementInspector | 2 days | Prevents data leaks |
| P0 | C2: Enable rate limiting | 1 hour | Prevents brute force |
| P0 | C6: JWT secret validation | 2 hours | Prevents token forgery |
| P1 | C3: Enable strictNullChecks | 2 weeks | Prevents runtime crashes |
| P1 | C5: Testcontainers for PostgreSQL | 3 days | Catches DB-specific bugs |
| P1 | C7: Permission refresh endpoint | 2 days | Prevents stale permissions |
| P1 | H8: Transactional outbox pattern | 1 week | Prevents event loss |
| P2 | C4: Soft delete indexes | 1 day | Performance at scale |
| P2 | H1: Kafka retry scheduler | 3 days | Reliability |
| P2 | H3: Circuit breakers | 3 days | External service resilience |
| P2 | H4: Bundle size audit | 2 days | Frontend performance |
| P3 | H5-H12: Remaining improvements | 2 weeks | Overall quality |

---

## 6. FINAL VERDICT

**Rating: 7.5/10** — Strong engineering foundation with critical gaps in defense-in-depth.

This codebase was clearly designed by engineers who understand enterprise SaaS patterns. The multi-tenant architecture, security layering, event-driven design, and frontend patterns are all well-thought-out. The technology choices are modern and appropriate.

However, the gap between "designed right" and "implemented completely" is evident. RLS is designed but not functional. Rate limiting is built but disabled. Null safety is configured but relaxed. These gaps suggest the team prioritized feature velocity over hardening — understandable for a startup, but must be addressed before onboarding real tenants with real employee data.

**Bottom line:** Fix the P0 items this week. Plan the P1 items for this sprint. The P2/P3 items can go into the next quarter's roadmap. The architecture itself is sound — it's the last-mile implementation that needs attention.

---

*End of Review*
