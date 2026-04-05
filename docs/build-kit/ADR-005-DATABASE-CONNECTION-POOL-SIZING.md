# ADR-005: Database Connection Pool Sizing & Optimization

**Status:** Proposed
**Date:** 2026-03-11
**Decision Makers:** Infrastructure & Backend Team
**Priority:** Critical (Performance & Stability)

---

## Context

The current HikariCP connection pool configuration in `application.yml` is set to a **maximum of 10
connections**, which is insufficient for production workloads and can lead to:

- Connection exhaustion under concurrent load
- Thread blocking waiting for connections
- Degraded API response times
- Database connection timeout errors

### Current Configuration Analysis

From `/backend/src/main/resources/application.yml`:

```yaml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/hrms
    username: hrms_user
    password: hrms_pass
    driver-class-name: org.postgresql.Driver
    hikari:
      maximum-pool-size: 10          # TOO LOW for production
      minimum-idle: 5
      connection-timeout: 30000      # 30 seconds
      idle-timeout: 600000           # 10 minutes
      max-lifetime: 1800000          # 30 minutes
```

**Production Profile:**

```yaml
spring:
  config:
    activate:
      on-profile: prod
  datasource:
    hikari:
      maximum-pool-size: ${DB_POOL_MAX:20}  # Still too low
      minimum-idle: ${DB_POOL_MIN:5}
      connection-timeout: 30000
      idle-timeout: 300000
      max-lifetime: 600000
```

### Problems with Current Configuration

1. **Undersized Pool**: 10-20 connections cannot handle 100+ concurrent users
2. **No Leak Detection**: No configuration for detecting leaked connections
3. **No Connection Validation**: No keep-alive queries to detect stale connections
4. **Suboptimal Timeout**: 30s connection timeout is too long (blocks threads)
5. **Missing Production Tuning**: No differentiation between dev/staging/prod

---

## Load Analysis

### Concurrent User Calculation

**Scenario: 100 Concurrent Users in an HRMS System**

Typical user behavior:

- 60% passive (reading dashboards, viewing reports)
- 30% active (creating/updating records)
- 10% heavy (running payroll, bulk operations)

**Database Connection Usage:**

| User Type | % of Users | Avg Requests/Min | Avg Connection Hold Time | Concurrent Connections Needed |
|-----------|------------|------------------|--------------------------|-------------------------------|
| Passive   | 60         | 5                | 100ms                    | 0.5 connections               |
| Active    | 30         | 15               | 200ms                    | 1.5 connections               |
| Heavy     | 10         | 30               | 500ms                    | 2.5 connections               |

**Total Concurrent Connection Demand:**

- Passive: 60 users × 0.5 = 30 connections
- Active: 30 users × 1.5 = 45 connections
- Heavy: 10 users × 2.5 = 25 connections
- **Total: ~100 active connections at peak**

**With Current Pool (10 connections):**

- 90 requests queued/blocked
- Average wait time: ~9 seconds (unacceptable)

---

## Connection Pool Sizing Formula

### HikariCP's Recommended Formula

```
connections = ((core_count * 2) + effective_spindle_count)
```

**Where:**

- `core_count`: Number of CPU cores (PostgreSQL server)
- `effective_spindle_count`: Number of hard drives (1 for SSD, 4-8 for spinning disks)

**Typical Cloud PostgreSQL Setup (AWS RDS db.t3.large):**

- CPU cores: 2
- Storage: SSD (1 effective spindle)
- **Formula result**: (2 × 2) + 1 = **5 connections per thread**

**Alternative Formula for Web Applications:**

```
max_pool_size = (max_concurrent_requests / avg_request_duration_sec) + buffer
```

**For 100 concurrent users:**

- Max concurrent requests: 100
- Avg request duration: 200ms (0.2s)
- **Result**: (100 / 0.2) × 1.2 (20% buffer) = **60 connections**

---

## PostgreSQL Server Capacity

### PostgreSQL Max Connections Configuration

**Default PostgreSQL Settings:**

```sql
SHOW max_connections;  -- Usually 100-200
```

**Connection Breakdown:**

- Reserved for superuser: 3
- Reserved for replication: 5-10
- Available for application: ~87-187

**Our Application:**

- Backend service: 60 connections
- Background jobs (Quartz): 10 connections
- Admin connections: 5 connections
- Monitoring (Grafana, etc.): 5 connections
- **Total: ~80 connections** (within default limit)

### Connection Distribution Strategy

For **microservices architecture** (future-proofing):

| Service           | Max Pool Size | Instances | Total Connections |
|-------------------|---------------|-----------|-------------------|
| HRMS API          | 30            | 2         | 60                |
| Background Jobs   | 10            | 1         | 10                |
| Analytics Service | 20            | 1         | 20                |
| **Total**         |               |           | **90**            |

**PostgreSQL Max Connections Required:** 100 (with 10 buffer)

---

## Decision

Implement **Environment-Specific Connection Pool Sizing** with monitoring and auto-tuning
capabilities.

### Recommended Configuration

#### Development Environment

```yaml
spring:
  config:
    activate:
      on-profile: dev

  datasource:
    hikari:
      # Small pool for local development
      maximum-pool-size: 5
      minimum-idle: 2
      connection-timeout: 20000           # 20s (faster failure for debugging)
      idle-timeout: 600000                # 10 minutes
      max-lifetime: 1800000               # 30 minutes
      leak-detection-threshold: 60000     # Warn if connection held > 60s
      connection-test-query: SELECT 1     # Validate connections
```

#### Staging Environment

```yaml
spring:
  config:
    activate:
      on-profile: staging

  datasource:
    hikari:
      # Simulate production load with 50% capacity
      maximum-pool-size: ${DB_POOL_MAX:30}
      minimum-idle: ${DB_POOL_MIN:10}
      connection-timeout: 10000           # 10s
      idle-timeout: 300000                # 5 minutes
      max-lifetime: 600000                # 10 minutes
      leak-detection-threshold: 30000     # Warn if connection held > 30s
      keepalive-time: 60000               # Keep-alive every 60s
      connection-test-query: SELECT 1
      validation-timeout: 3000            # 3s validation timeout

      # HikariCP Metrics (Prometheus)
      register-mbeans: true
```

#### Production Environment

```yaml
spring:
  config:
    activate:
      on-profile: prod

  datasource:
    hikari:
      # Sized for 100 concurrent users + buffer
      maximum-pool-size: ${DB_POOL_MAX:60}
      minimum-idle: ${DB_POOL_MIN:15}

      # Aggressive timeouts for production reliability
      connection-timeout: ${DB_CONN_TIMEOUT:8000}     # 8s (fail fast)
      idle-timeout: ${DB_IDLE_TIMEOUT:180000}         # 3 minutes (faster cleanup)
      max-lifetime: ${DB_MAX_LIFETIME:540000}         # 9 minutes (prevent stale connections)

      # Connection leak detection (critical in prod)
      leak-detection-threshold: ${DB_LEAK_THRESHOLD:30000}  # 30s

      # Keep-alive to prevent connection closure by firewall/load balancer
      keepalive-time: ${DB_KEEPALIVE:30000}           # 30s

      # Connection validation
      connection-test-query: SELECT 1
      validation-timeout: ${DB_VALIDATION_TIMEOUT:3000}  # 3s

      # Pooled connection properties (PostgreSQL-specific optimizations)
      data-source-properties:
        # Disable auto-commit for better transaction performance
        autoCommit: false
        # TCP keep-alive
        tcpKeepAlive: true
        # Application name for PostgreSQL monitoring
        ApplicationName: hrms-backend
        # Connection-level statement timeout (prevent runaway queries)
        options: "-c statement_timeout=30s"

      # HikariCP Metrics and Monitoring
      register-mbeans: true

# PostgreSQL Server Configuration (document required settings)
# max_connections = 100 (minimum)
# shared_buffers = 256MB (for db.t3.large)
# effective_cache_size = 1GB
# maintenance_work_mem = 64MB
# checkpoint_completion_target = 0.9
# wal_buffers = 16MB
# default_statistics_target = 100
# random_page_cost = 1.1 (for SSD)
# work_mem = 4MB
```

---

## Connection Pool Sizing Calculations

### Formula Application

**Production Calculation (100 concurrent users):**

**Method 1: PostgreSQL Formula**

```
connections = (core_count * 2) + effective_spindle_count
            = (4 * 2) + 1  [assuming db.t3.xlarge with 4 vCPU]
            = 9 connections per thread

max_pool_size = 9 * expected_parallelism
              = 9 * 6  [6 parallel requests typical for HRMS]
              = 54 connections
```

**Method 2: Web Application Formula**

```
max_pool_size = (peak_concurrent_requests / avg_db_time_per_request) * buffer
              = (100 / 0.2s) * 1.2
              = 500 * 1.2
              = 60 connections
```

**Method 3: Little's Law**

```
L = λ × W
where:
  L = number of connections needed
  λ = arrival rate (requests/second)
  W = average time in system (seconds)

Assuming:
  λ = 100 users * 10 requests/minute / 60 = 16.67 req/s
  W = 200ms = 0.2s

L = 16.67 * 0.2 = 3.33 connections (steady state)

With burstiness factor (3x) = 3.33 * 3 = 10 connections
With safety buffer (2x) = 10 * 2 = 20 connections
```

**Recommended: 60 connections** (conservative, handles bursts)

---

## Monitoring & Auto-Tuning

### Metrics to Track

**HikariCP Metrics (via Actuator/Prometheus):**

```java
// Custom metrics configuration
@Configuration
public class HikariMetricsConfig {

    @Bean
    public MetricsEndpoint metricsEndpoint(HikariDataSource dataSource) {
        dataSource.setMetricRegistry(new MetricRegistry());
        return new MetricsEndpoint();
    }
}
```

**Key Metrics:**

| Metric                          | Description                     | Alert Threshold |
|---------------------------------|---------------------------------|-----------------|
| `hikaricp.connections.active`   | Connections currently in use    | > 80% of max    |
| `hikaricp.connections.idle`     | Idle connections in pool        | < 10% of max    |
| `hikaricp.connections.pending`  | Threads waiting for connection  | > 5             |
| `hikaricp.connections.timeout`  | Connection acquisition timeouts | > 0             |
| `hikaricp.connections.usage`    | Average connection usage time   | > 500ms         |
| `hikaricp.connections.creation` | Time to create new connection   | > 100ms         |

**Grafana Dashboard Queries:**

```promql
# Connection pool utilization
(hikaricp_connections_active{pool="hrms-db"} / hikaricp_connections_max{pool="hrms-db"}) * 100

# Connection wait time (p95)
histogram_quantile(0.95, rate(hikaricp_connections_acquire_seconds_bucket[5m]))

# Connection timeouts (should be 0)
rate(hikaricp_connections_timeout_total[5m])

# Pool exhaustion events
rate(hikaricp_connections_pending_total[5m])
```

### Auto-Tuning Strategy

**Dynamic Pool Sizing (Future Enhancement):**

```java
@Component
@Slf4j
public class ConnectionPoolAutoTuner {

    @Autowired
    private HikariDataSource dataSource;

    @Autowired
    private MeterRegistry meterRegistry;

    @Scheduled(fixedDelay = 300000) // Every 5 minutes
    public void tunePoolSize() {
        int currentMax = dataSource.getMaximumPoolSize();
        int currentActive = dataSource.getHikariPoolMXBean().getActiveConnections();
        int currentIdle = dataSource.getHikariPoolMXBean().getIdleConnections();
        int currentPending = dataSource.getHikariPoolMXBean().getThreadsAwaitingConnection();

        double utilizationRate = (double) currentActive / currentMax;

        log.info("Connection Pool Stats - Max: {}, Active: {}, Idle: {}, Pending: {}, Utilization: {:.2f}%",
                 currentMax, currentActive, currentIdle, currentPending, utilizationRate * 100);

        // Scale up if consistently high utilization
        if (utilizationRate > 0.8 && currentPending > 0) {
            int newMax = Math.min(currentMax + 10, 100); // Cap at 100
            dataSource.setMaximumPoolSize(newMax);
            log.warn("Connection pool scaled UP from {} to {} due to high utilization", currentMax, newMax);
        }

        // Scale down if consistently low utilization (after 1 hour)
        if (utilizationRate < 0.3 && currentIdle > currentActive) {
            int newMax = Math.max(currentMax - 5, 20); // Floor at 20
            dataSource.setMaximumPoolSize(newMax);
            log.info("Connection pool scaled DOWN from {} to {} due to low utilization", currentMax, newMax);
        }
    }
}
```

---

## Migration Plan

### Phase 1: Development & Staging Update (Week 1)

**Day 1-2: Configuration Update**

- [ ] Update `application.yml` with environment-specific profiles
- [ ] Add connection validation and leak detection
- [ ] Deploy to development environment
- [ ] Test connection pool behavior under load

**Day 3-5: Staging Validation**

- [ ] Deploy updated configuration to staging
- [ ] Run load tests (JMeter/Gatling) simulating 100 concurrent users
- [ ] Monitor HikariCP metrics in Grafana
- [ ] Validate no connection timeouts or pool exhaustion
- [ ] Document baseline metrics

### Phase 2: Production Rollout (Week 2)

**Day 1-2: Pre-Production Preparation**

- [ ] Validate PostgreSQL max_connections setting (ensure >= 100)
- [ ] Set up Grafana dashboard for connection pool monitoring
- [ ] Configure PagerDuty alerts for connection pool issues
- [ ] Create rollback plan (environment variables)

**Day 3: Production Deployment**

- [ ] Deploy during low-traffic window (2 AM - 4 AM)
- [ ] Set initial `DB_POOL_MAX=40` (conservative)
- [ ] Monitor for 24 hours
- [ ] Gradually increase to 60 based on observed utilization

**Day 4-5: Post-Deployment Monitoring**

- [ ] Analyze connection pool metrics
- [ ] Validate no connection timeouts
- [ ] Compare API response time percentiles (p50, p95, p99)
- [ ] Document final configuration

### Phase 3: Monitoring & Optimization (Ongoing)

- [ ] Weekly review of connection pool metrics
- [ ] Quarterly capacity planning based on user growth
- [ ] Annual PostgreSQL server capacity review

---

## Performance Expectations

### Before (Current Configuration)

| Metric                   | Value                        |
|--------------------------|------------------------------|
| Max Pool Size            | 10 connections               |
| 100 Concurrent Users     | 90 requests queued           |
| P95 API Latency          | ~9 seconds (connection wait) |
| Connection Timeout Rate  | ~30% (high)                  |
| Database CPU Utilization | 10-15% (underutilized)       |

### After (Optimized Configuration)

| Metric                   | Value                         | Improvement           |
|--------------------------|-------------------------------|-----------------------|
| Max Pool Size            | 60 connections                | 6x increase           |
| 100 Concurrent Users     | 0 requests queued             | 100% improvement      |
| P95 API Latency          | ~200ms (normal DB query time) | 97.8% faster          |
| Connection Timeout Rate  | < 0.1%                        | 99.7% reduction       |
| Database CPU Utilization | 40-60% (optimal)              | Better resource usage |

---

## Cost Impact Analysis

### AWS RDS PostgreSQL Instance Sizing

**Current (Undersized Pool):**

- Instance: db.t3.medium (2 vCPU, 4 GB RAM)
- Monthly Cost: ~$60
- **Problem:** Connection pool limits prevent using full DB capacity

**Recommended (Right-Sized):**

- Instance: db.t3.large (2 vCPU, 8 GB RAM)
- Monthly Cost: ~$120
- **Benefit:** Supports 60 connections + buffer, better query performance

**Alternative (High Availability):**

- Instance: db.r5.large (2 vCPU, 16 GB RAM, optimized for memory)
- Monthly Cost: ~$180
- **Benefit:** Better for read-heavy HRMS workloads (reports, dashboards)

**Recommendation:** Start with db.t3.large, upgrade to db.r5.large at 500+ users.

---

## Connection Leak Prevention

### Common Leak Scenarios

1. **Unclosed ResultSets**
   ```java
   // BAD: ResultSet not closed
   public List<Employee> getEmployees() {
       ResultSet rs = jdbcTemplate.query("SELECT * FROM employees");
       return mapToEmployees(rs); // LEAK: ResultSet not closed
   }

   // GOOD: Try-with-resources
   public List<Employee> getEmployees() {
       try (ResultSet rs = jdbcTemplate.query("SELECT * FROM employees")) {
           return mapToEmployees(rs);
       }
   }
   ```

2. **Long-Running Transactions**
   ```java
   // BAD: Transaction held during external API call
   @Transactional
   public void processPayroll() {
       calculateSalaries(); // DB operation
       sendEmailNotifications(); // 30s external API call - HOLDS CONNECTION
       updateStatus(); // DB operation
   }

   // GOOD: Transaction only for DB operations
   public void processPayroll() {
       calculateSalariesTransactional(); // @Transactional
       sendEmailNotifications(); // No transaction
       updateStatusTransactional(); // @Transactional
   }
   ```

3. **Connection Leak in Exception Handling**
   ```java
   // BAD: Connection not returned on exception
   public void updateEmployee(Employee emp) {
       Connection conn = dataSource.getConnection();
       // ... update logic ...
       // If exception occurs, connection not returned
   }

   // GOOD: Spring's @Transactional handles this
   @Transactional
   public void updateEmployee(Employee emp) {
       employeeRepository.save(emp);
   }
   ```

### Leak Detection Configuration

```yaml
hikari:
  leak-detection-threshold: 30000  # 30 seconds

  # If connection held longer than threshold, log stack trace
  # Log example:
  # WARN: Connection leak detection triggered for connection ...
  # Stack trace shows where connection was acquired
```

---

## PostgreSQL Server Tuning

**Required PostgreSQL Configuration Changes:**

```sql
-- /var/lib/postgresql/data/postgresql.conf

-- Connection settings
max_connections = 100                   # Increased from default 50
shared_buffers = 256MB                  # 25% of RAM for db.t3.large
effective_cache_size = 1GB              # 50% of RAM
work_mem = 4MB                          # Per connection sort/hash memory
maintenance_work_mem = 64MB             # For VACUUM, CREATE INDEX

-- Write-ahead log (WAL) settings
wal_buffers = 16MB
checkpoint_completion_target = 0.9
wal_compression = on

-- Query planner settings
random_page_cost = 1.1                  # Lower for SSD (default: 4.0)
effective_io_concurrency = 200          # Higher for SSD

-- Logging (for debugging slow queries)
log_min_duration_statement = 1000       # Log queries > 1s
log_lock_waits = on
log_checkpoints = on
log_connections = on
log_disconnections = on

-- Connection pooling (if using PgBouncer in future)
# PgBouncer recommended for 500+ concurrent users
```

---

## Decision

**Approved for Implementation**: Environment-Specific Connection Pool Sizing

**Configuration:**

- Development: 5 connections
- Staging: 30 connections
- Production: 60 connections (scalable to 100)

**PostgreSQL Server:**

- Current: db.t3.medium (sufficient for < 50 users)
- Upgrade to: db.t3.large (for 100+ users)
- Future: db.r5.large or PgBouncer (for 500+ users)

**Responsible Team**: Infrastructure & Backend Team
**Implementation Start**: Week 1 (immediate)
**Review Date**: After 1 week in production
**Success Metrics:**

- Connection timeout rate < 0.1%
- P95 API latency < 500ms
- Database CPU utilization 40-60%
- Zero connection pool exhaustion events

---

## References

- [HikariCP Configuration Guide](https://github.com/brettwooldridge/HikariCP#configuration-knobs-baby)
- [PostgreSQL Connection Pooling Best Practices](https://wiki.postgresql.org/wiki/Number_Of_Database_Connections)
- [About Pool Sizing - HikariCP Wiki](https://github.com/brettwooldridge/HikariCP/wiki/About-Pool-Sizing)
- [Spring Boot Database Connection Pooling](https://docs.spring.io/spring-boot/docs/current/reference/html/data.html#data.sql.datasource.connection-pool)
- [PostgreSQL Performance Tuning](https://wiki.postgresql.org/wiki/Performance_Optimization)
