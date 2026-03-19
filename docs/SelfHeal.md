# NU-AURA Platform — Self-Healing Report (Bugs, Edge Cases, Stability Risks)

> Last updated: 2026-03-19 | Auto-maintained by SHDS

## Critical Issues

### CRIT-1: TenantContext ThreadLocal Leakage in Async Operations
**Severity**: Critical | **Module**: Common/Security

**Risk**: `TenantContext` uses ThreadLocal storage. If async tasks (Kafka consumers, @Scheduled jobs, @Async methods) don't properly set/clear the tenant context, queries may execute with wrong or null tenant_id, potentially leaking data across tenants.

**Current Mitigation**: `TenantAwareAsyncTask` in `modules/common/` wraps async tasks. However, not all async paths may use this wrapper consistently.

**Suggested Fix**:
- Audit all `@Async` methods for TenantContext propagation
- Add TenantContext assertion in repository base class (fail-fast on null tenantId)
- Add integration tests that verify tenant isolation in all Kafka consumers
- Consider Spring's `TaskDecorator` to auto-propagate context to all async executors

### CRIT-2: Refresh Token Race Condition Window
**Severity**: High | **Module**: Auth (Frontend)

**Risk**: The Axios interceptor uses a shared Promise for refresh token requests to prevent races. However, if the refresh request itself fails (network error, expired refresh token), all queued requests fail simultaneously, potentially causing a cascade of error toasts.

**Current Mitigation**: `resetRedirectFlag()` with 5s debounce prevents permanent lockout.

**Suggested Fix**:
- Add a single error toast for batch failures instead of per-request toasts
- Implement a circuit breaker: after 2 failed refreshes, redirect immediately
- Add refresh token expiry check client-side before making the refresh call

### CRIT-3: PostgreSQL RLS Policy Bypass via Direct SQL
**Severity**: High | **Module**: Database

**Risk**: RLS policies depend on `current_setting('app.current_tenant_id')`. If the application doesn't set this session variable before queries (e.g., in Flyway migrations, health checks, or scheduled jobs), RLS won't filter correctly.

**Current Mitigation**: Application-layer filtering via `WHERE tenant_id = :tenantId` in most queries.

**Suggested Fix**:
- Ensure `SET app.current_tenant_id` is called at the beginning of every DB connection checkout (HikariCP `connectionInitSql`)
- Add a PostgreSQL function that raises an exception if `app.current_tenant_id` is not set
- Test RLS enforcement with a dedicated integration test that bypasses application layer

---

## High-Priority Issues

### HIGH-1: SimpleMessageBroker Not Production-Ready
**Severity**: High | **Module**: WebSocket

**Risk**: WebSocket uses `SimpleBrokerMessageHandler` (in-memory). This doesn't work with multiple backend replicas (K8s HPA). Users connected to different pods won't receive each other's messages.

**Suggested Fix**:
- Replace with external message broker (Redis Pub/Sub or RabbitMQ STOMP relay)
- Or implement sticky sessions at ingress level (already partially configured with `sessionAffinity: ClientIP`)

### HIGH-2: Cache Invalidation on Multi-Pod Deployment
**Severity**: High | **Module**: Caching

**Risk**: `@CacheEvict(allEntries=true)` only clears the local cache on the pod that handled the request. Other pods retain stale cache entries until TTL expires (1 hour).

**Suggested Fix**:
- Already using Redis as cache backend (shared across pods) — verify all `@Cacheable` methods use Redis, not local ConcurrentMapCache
- Ensure `spring.cache.type=redis` is set in production profile
- Add cache invalidation events via Redis Pub/Sub for cross-pod eviction

### HIGH-3: No Database Connection Pool Monitoring Alerts
**Severity**: High | **Module**: Infrastructure

**Risk**: HikariCP pool exhaustion (max 20 in prod) can cause request queueing and timeouts. Alert exists for 80% usage but may not trigger fast enough during traffic spikes.

**Suggested Fix**:
- Add HikariCP metrics to Prometheus (already exposed via Micrometer)
- Create a dashboard panel for connection pool utilization
- Add a 70% threshold alert with 2-minute duration

### HIGH-4: Kafka Consumer Offset Management
**Severity**: High | **Module**: Kafka

**Risk**: `auto-offset-reset=earliest` means if a consumer group is reset or a new consumer joins, it will reprocess ALL historical messages. With idempotency service, duplicates are handled, but this can cause massive CPU/IO spikes.

**Suggested Fix**:
- Consider `auto-offset-reset=latest` for non-critical consumers (notifications)
- Keep `earliest` for audit and approval consumers (data integrity)
- Implement message TTL / compaction on topics to limit reprocessing scope

---

## Medium-Priority Issues

### MED-1: Missing CORS Preflight Caching
**Module**: Security

**Risk**: Every cross-origin request triggers a preflight OPTIONS request, doubling latency.

**Fix**: Add `Access-Control-Max-Age: 3600` to CORS configuration.

### MED-2: No Request Deduplication for Mutations
**Module**: Frontend

**Risk**: Double-clicking a submit button can fire the mutation twice. React Query's `isPending` check in UI is the only protection.

**Fix**: Add server-side idempotency keys for critical mutations (payroll, leave approval).

### MED-3: Large Payload Risk on Employee List
**Module**: Employee API

**Risk**: Employee entity has 40+ fields. Listing all employees returns full objects. For large tenants (1000+ employees), this can be 5MB+ per page.

**Fix**: Use projection DTOs that return only list-relevant fields (id, name, department, designation, avatar).

### MED-4: No Retry on WebSocket Disconnect
**Module**: Frontend/WebSocket

**Risk**: If WebSocket connection drops (network change, sleep/wake), real-time notifications stop until page reload.

**Fix**: Implement exponential backoff reconnection in `WebSocketProvider` component.

### MED-5: Email Queue Unbounded Growth
**Module**: Notification

**Risk**: `EmailSchedulerService` processes queued emails every 5 minutes. If SMTP is down, the queue grows indefinitely. No dead-letter or max-retry mechanism.

**Fix**: Add max retry count (5), move to failed queue after exhaustion, alert on queue depth.

### MED-6: No Request Timeout on Backend Health Checks
**Module**: Kubernetes

**Risk**: If PostgreSQL is slow (but not down), readiness probe at `/actuator/health/readiness` may timeout after the configured 3s, causing pod to be marked unready. But the probe includes DB health check which may take longer under load.

**Fix**: Configure separate health check with timeout: `management.health.db.query-timeout=2s`

---

## Edge Cases

### EDGE-1: Tenant Provisioning Race Condition
If two admins create the same tenant simultaneously, `DuplicateResourceException` is thrown. But the tenant may have partial seed data from the first request.

### EDGE-2: Leave Accrual During Probation
`LeaveAccrualService` runs monthly but may not account for employees on probation who shouldn't accrue certain leave types.

### EDGE-3: Payroll Component Circular Dependency
SpEL formula engine evaluates components in DAG order. If someone creates circular dependencies (A depends on B, B depends on A), the system may hang or throw a stack overflow.

**Fix**: Add cycle detection in DAG builder before evaluation.

### EDGE-4: File Upload Size Limit Mismatch
Backend: `spring.servlet.multipart.max-file-size=10MB`. But Kubernetes ingress has no explicit body size limit configured. If nginx has a default 1MB limit, large uploads fail silently at ingress level.

**Fix**: Add `nginx.ingress.kubernetes.io/proxy-body-size: "10m"` to ingress annotations.

### EDGE-5: Timezone Handling
Attendance and leave dates use `Instant` (UTC). But employee working hours are location-based. No explicit timezone conversion exists for display purposes.

**Fix**: Add `timezone` field to `OfficeLocation` entity, convert in service layer for display.

### EDGE-6: Soft Delete + Unique Constraints
Soft-deleted records still occupy unique constraint space. If employee "john@company.com" is soft-deleted, a new employee with the same email can't be created.

**Fix**: Use partial unique indexes: `CREATE UNIQUE INDEX ... WHERE is_deleted = false`

---

## Stability Monitoring Checklist

| Check | Frequency | Alert |
|-------|-----------|-------|
| HikariCP active connections > 80% | Every 5m | Warning |
| API error rate > 5% | Every 5m | Warning |
| API p95 latency > 2s | Every 5m | Warning |
| JVM heap > 85% | Every 5m | Warning |
| Kafka consumer lag > 1000 | Every 5m | Warning |
| Redis memory > 80% | Every 5m | Warning |
| Failed login rate > 0.1/s | Every 5m | Warning (security) |
| Application down (up == 0) | Every 1m | Critical |
| Payroll not processed in 24h | Every 2h | Warning |
| Webhook delivery success < 90% | Every 10m | Warning |
