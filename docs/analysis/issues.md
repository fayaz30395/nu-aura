# NU-AURA Performance Issues & Optimization Guide

**Date**: 2026-03-22
**Environment**: Development (localhost)
**Backend**: Spring Boot 3.4.1 (Java 23.0.2)
**Database**: PostgreSQL (Neon Cloud)

---

## Executive Summary

Performance audit of NU-AURA backend revealed **critical performance issues** affecting user experience:

- **Dashboard Load Time**: 25+ seconds (CRITICAL)
- **Database Response Time**: 400-500ms average (HIGH)
- **Slow Query Count**: 20+ queries exceeding 200ms threshold
- **N+1 Query Pattern**: Multiple sequential queries in dashboard service

**Impact**: Employee dashboard takes 25 seconds to load, severely degrading UX.

---

## 🔴 Critical Issues (P0)

### 1. Employee Dashboard Performance

**Issue**: Dashboard API takes 25+ seconds to respond

```
Location: EmployeeDashboardService.getEmployeeDashboard
Endpoint: GET /api/v1/dashboards/employee
Duration: 25,146ms (25.1 seconds)
Status: 200 OK
```

**Root Cause**:
- Sequential execution of multiple slow queries
- N+1 query pattern for payslip data (11 sequential queries for same month range)
- Missing database indexes on frequently queried columns
- No query result caching

**Affected Code Locations**:
```
backend/src/main/java/com/hrms/application/analytics/service/EmployeeDashboardService.java
  - getEmployeeDashboard() method
```

**Queries Involved**:
1. Attendance records lookup (multiple calls: 444-467ms each)
2. Leave request counts (multiple calls: 223-245ms each)
3. Payslip details (11 sequential calls: 222-333ms each)
4. Leave balance aggregation (517ms)
5. Holiday lookups (224-281ms)

**Recommended Fixes**:
- [ ] **Batch queries**: Fetch data in single queries instead of N loops
- [ ] **Add database indexes**: See "Database Optimization" section
- [ ] **Implement result caching**: Redis cache for dashboard data (5-min TTL)
- [ ] **Use DTOs with JOIN FETCH**: Eliminate N+1 queries
- [ ] **Add pagination**: Limit data ranges (e.g., last 3 months only)
- [ ] **Parallel query execution**: Use CompletableFuture for independent queries

**Expected Improvement**: 25 seconds → **< 2 seconds**

---

## 🟠 High Priority Issues (P1)

### 2. User Authentication Performance

**Issue**: User login/auth taking 1.3+ seconds

```
Service: CustomUserDetailsService.loadUserByUsername
Duration: 1,338ms
User: sumit@nulogic.io
```

**Slow Queries**:
1. `findByEmailAndTenantId`: 224ms
2. User roles join: 221ms
3. Role permissions lookup: 445ms
4. Permissions by ID: 442ms

**Affected Code**:
```
backend/src/main/java/com/hrms/application/user/service/CustomUserDetailsService.java
  - loadUserByUsername() method
```

**Recommended Fixes**:
- [ ] **Add composite index**: `users(email, tenant_id)`
- [ ] **Cache user permissions**: Redis with 15-min TTL
- [ ] **Use single JOIN query**: Fetch user + roles + permissions in one query
- [ ] **Pre-load authorities**: Use Spring Security's UserCache

**Expected Improvement**: 1,338ms → **< 200ms**

---

### 3. Attendance Record Queries

**Issue**: Repeated slow queries for attendance records

```
Query: findByTenantIdAndEmployeeIdAndDate
Duration: 223ms - 467ms (multiple occurrences)
Table: attendance_records
```

**SQL Pattern**:
```sql
SELECT ar.* FROM public.attendance_records ar
WHERE ar.tenant_id = ?
  AND ar.employee_id = ?
  AND ar.attendance_date = ?
```

**Affected Code**:
```
backend/src/main/java/com/hrms/infrastructure/attendance/repository/AttendanceRecordRepository.java
  - findByTenantIdAndEmployeeIdAndDate()
```

**Recommended Fixes**:
- [ ] **Add composite index**: `attendance_records(tenant_id, employee_id, attendance_date)`
- [ ] **Add covering index**: Include frequently selected columns
- [ ] **Use query batching**: Fetch multiple dates at once
- [ ] **Implement Redis cache**: Cache today's attendance (6-hour TTL)

**Expected Improvement**: 450ms → **< 50ms**

---

### 4. Leave Request Queries

**Issue**: Multiple slow count queries for leave requests

```
Queries:
- countByTenantIdAndDateAndStatusAndEmployeeId: 224-233ms
- countByTenantIdAndStatusAndEmployeeId: 233ms
- countByTenantIdAndStatusAndEmployeeIdAndDateAfter: 228-245ms
```

**SQL Pattern**:
```sql
SELECT COUNT(lr.id) FROM public.leave_requests lr
WHERE lr.tenant_id = ?
  AND lr.status = ?
  AND lr.employee_id = ?
  AND lr.start_date >= ?
```

**Affected Code**:
```
backend/src/main/java/com/hrms/infrastructure/leave/repository/LeaveRequestRepository.java
  - countByTenantIdAndDateAndStatusAndEmployeeId()
  - countByTenantIdAndStatusAndEmployeeId()
  - countByTenantIdAndStatusAndEmployeeIdAndDateAfter()
```

**Recommended Fixes**:
- [ ] **Add composite indexes**:
  - `leave_requests(tenant_id, employee_id, status, start_date)`
  - `leave_requests(tenant_id, start_date, end_date, status)`
- [ ] **Use materialized counts**: Store aggregated counts in separate table
- [ ] **Implement Redis cache**: Cache leave stats per employee (10-min TTL)

**Expected Improvement**: 240ms → **< 30ms**

---

### 5. Payslip Queries (N+1 Problem)

**Issue**: 11 sequential queries for payslip data (same query repeated)

```
Query: findPayslipDetailsByEmployeeIdAndYearAndMonth
Duration: 222-333ms per query
Total Time: ~2.5 seconds for 11 months
```

**SQL Pattern**:
```sql
SELECT p.gross_salary, p.net_salary, p.total_deductions, p.income_tax
FROM public.payslips p
WHERE p.tenant_id = ?
  AND p.employee_id = ?
  AND p.pay_period_year = ?
  AND p.pay_period_month = ?
```

**Affected Code**:
```
backend/src/main/java/com/hrms/infrastructure/payroll/repository/PayslipRepository.java
  - findPayslipDetailsByEmployeeIdAndYearAndMonth()

backend/src/main/java/com/hrms/application/analytics/service/EmployeeDashboardService.java
  - Loop calling payslip query 11 times
```

**Recommended Fixes**:
- [ ] **Batch query**: Fetch all months in single query with `IN (month1, month2, ...)`
- [ ] **Add composite index**: `payslips(tenant_id, employee_id, pay_period_year, pay_period_month)`
- [ ] **Use projection**: Only select needed columns (already done)
- [ ] **Limit range**: Only fetch last 3 months instead of 11

**Expected Improvement**: 2,500ms → **< 100ms**

---

### 6. Holiday Queries

**Issue**: Repeated slow queries for holiday lookups

```
Query: findAllByTenantIdAndHolidayDateBetween
Duration: 224-281ms
Occurrences: Multiple times per dashboard load
```

**SQL Pattern**:
```sql
SELECT h.* FROM public.holidays h
WHERE h.tenant_id = ?
  AND h.holiday_date BETWEEN ? AND ?
```

**Affected Code**:
```
backend/src/main/java/com/hrms/infrastructure/attendance/repository/HolidayRepository.java
  - findAllByTenantIdAndHolidayDateBetween()
```

**Recommended Fixes**:
- [ ] **Add composite index**: `holidays(tenant_id, holiday_date)`
- [ ] **Cache holidays**: Redis cache with daily TTL (holidays rarely change)
- [ ] **Application-level cache**: `@Cacheable` on holiday service
- [ ] **Pre-load holidays**: Load current year holidays at startup

**Expected Improvement**: 270ms → **< 20ms**

---

### 7. Leave Balance Query

**Issue**: Complex aggregation query taking 500+ ms

```
Query: findBalancesByEmployeeId
Duration: 517ms
```

**SQL Pattern**:
```sql
SELECT lt.leave_code, lt.leave_name, lb.opening_balance, lb.used, lb.available, lb.pending
FROM leave_balances lb
JOIN leave_types lt ON lb.leave_type_id = lt.id
WHERE lb.tenant_id = ?
  AND lb.employee_id = ?
  AND lb.year = ?
```

**Affected Code**:
```
backend/src/main/java/com/hrms/infrastructure/leave/repository/LeaveBalanceRepository.java
  - findBalancesByEmployeeId()
```

**Recommended Fixes**:
- [ ] **Add composite index**: `leave_balances(tenant_id, employee_id, year)`
- [ ] **Add foreign key index**: `leave_balances(leave_type_id)`
- [ ] **Cache balances**: Redis cache with 5-min TTL (updated on leave approval)
- [ ] **Optimize JOIN**: Use INNER JOIN explicitly

**Expected Improvement**: 517ms → **< 50ms**

---

## 🟡 Medium Priority Issues (P2)

### 8. Database Connection Performance

**Issue**: High database response time detected

```
Database: PostgreSQL 17.8 (Neon Cloud)
Average Response Time: 449-503ms
Warning: High response time detected in health check
```

**Possible Causes**:
- Using pooled endpoint (`-pooler` in connection string)
- Network latency to Neon cloud (US East 1)
- Connection pool not optimized
- Long-running transactions

**Recommended Fixes**:
- [ ] **Review connection pool settings**: HikariCP configuration
  ```yaml
  spring.datasource.hikari:
    maximum-pool-size: 20
    minimum-idle: 5
    connection-timeout: 20000
    idle-timeout: 300000
    max-lifetime: 1200000
  ```
- [ ] **Use direct endpoint for migrations**: Already configured in Flyway ✅
- [ ] **Add connection metrics**: Monitor pool usage
- [ ] **Consider read replicas**: For read-heavy queries

**Expected Improvement**: 500ms → **< 100ms** (network limited)

---

### 9. Scheduled Report Queries

**Issue**: Background job experiencing slow queries

```
Query: findDueForExecution (scheduled_reports)
Duration: 237ms
Frequency: Every minute
```

**Affected Code**:
```
backend/src/main/java/com/hrms/infrastructure/analytics/repository/ScheduledReportRepository.java
  - findDueForExecution()
```

**Recommended Fixes**:
- [ ] **Add index**: `scheduled_reports(is_active, next_run_at)`
- [ ] **Optimize cron frequency**: Run every 5 minutes instead of 1 minute
- [ ] **Use query hints**: Add `@QueryHints` for read-only

**Expected Improvement**: 237ms → **< 30ms**

---

## 📊 Database Optimization Plan

### Missing Indexes (Priority Order)

```sql
-- P0: Critical indexes for dashboard performance
CREATE INDEX idx_attendance_lookup ON attendance_records(tenant_id, employee_id, attendance_date);
CREATE INDEX idx_payslips_lookup ON payslips(tenant_id, employee_id, pay_period_year, pay_period_month);
CREATE INDEX idx_leave_balance_lookup ON leave_balances(tenant_id, employee_id, year);

-- P1: High-priority indexes for auth and queries
CREATE INDEX idx_users_email_tenant ON users(email, tenant_id);
CREATE INDEX idx_leave_requests_status ON leave_requests(tenant_id, employee_id, status, start_date);
CREATE INDEX idx_holidays_date_range ON holidays(tenant_id, holiday_date);

-- P2: Supporting indexes
CREATE INDEX idx_scheduled_reports_active ON scheduled_reports(is_active, next_run_at) WHERE is_active = true;
CREATE INDEX idx_role_permissions_role ON role_permissions(role_id);
CREATE INDEX idx_user_roles_user ON user_roles(user_id);
```

### Query Optimization Checklist

- [ ] **Analyze slow queries**: Run `EXPLAIN ANALYZE` on all identified queries
- [ ] **Update table statistics**: Run `ANALYZE` on affected tables
- [ ] **Review execution plans**: Identify sequential scans vs index scans
- [ ] **Add covering indexes**: Include frequently selected columns
- [ ] **Partition large tables**: Consider partitioning by tenant_id or date

---

## 🚀 Caching Strategy

### Redis Cache Implementation

**Cache Keys Pattern**:
```
hrms:dashboard:{tenantId}:{employeeId}:v1
hrms:permissions:{userId}:v1
hrms:attendance:{tenantId}:{employeeId}:{date}:v1
hrms:holidays:{tenantId}:{year}:v1
hrms:leave-balance:{tenantId}:{employeeId}:{year}:v1
```

**Recommended TTLs**:
- Dashboard data: 5 minutes
- User permissions: 15 minutes
- Attendance (today): 6 hours
- Holidays (current year): 24 hours
- Leave balances: 5 minutes

**Cache Invalidation Strategy**:
- On leave approval → Clear leave balance cache
- On attendance check-in/out → Clear attendance cache
- On role update → Clear permissions cache
- On holiday add/update → Clear holiday cache

**Spring Cache Configuration**:
```java
@Cacheable(value = "dashboard", key = "#tenantId + ':' + #employeeId")
public DashboardResponse getEmployeeDashboard(UUID tenantId, UUID employeeId) {
    // ... implementation
}

@CacheEvict(value = "leave-balance", key = "#tenantId + ':' + #employeeId")
public void approveLeave(UUID tenantId, UUID employeeId, UUID leaveRequestId) {
    // ... implementation
}
```

---

## 📈 Code Optimization Recommendations

### 1. Batch Query Pattern

**Before** (N+1 Problem):
```java
// BAD: 11 separate queries
for (int month = 1; month <= 11; month++) {
    PayslipDetails details = payslipRepository
        .findPayslipDetailsByEmployeeIdAndYearAndMonth(employeeId, year, month);
    payslipData.add(details);
}
```

**After** (Single Batch Query):
```java
// GOOD: 1 query for all months
List<Integer> months = IntStream.rangeClosed(1, 11).boxed().collect(Collectors.toList());
List<PayslipDetails> details = payslipRepository
    .findPayslipDetailsByEmployeeIdAndYearAndMonths(employeeId, year, months);
```

**New Repository Method**:
```java
@Query("SELECT new com.hrms.api.dto.PayslipDetails(p.grossSalary, p.netSalary, p.totalDeductions, p.incomeTax) " +
       "FROM Payslip p " +
       "WHERE p.tenantId = :tenantId AND p.employeeId = :employeeId " +
       "AND p.payPeriodYear = :year AND p.payPeriodMonth IN :months")
List<PayslipDetails> findPayslipDetailsByEmployeeIdAndYearAndMonths(
    @Param("employeeId") UUID employeeId,
    @Param("year") Integer year,
    @Param("months") List<Integer> months
);
```

---

### 2. Parallel Query Execution

**Before** (Sequential):
```java
// BAD: Queries run one after another (25+ seconds total)
var attendance = getAttendanceData(employeeId);
var leaves = getLeaveData(employeeId);
var payslips = getPayslipData(employeeId);
var balances = getLeaveBalances(employeeId);
```

**After** (Parallel):
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

// Wait for all to complete
CompletableFuture.allOf(attendanceFuture, leaveFuture, payslipFuture, balanceFuture).join();

var attendance = attendanceFuture.get();
var leaves = leaveFuture.get();
var payslips = payslipFuture.get();
var balances = balanceFuture.get();
```

**Executor Configuration**:
```java
@Bean(name = "dashboardExecutor")
public Executor dashboardExecutor() {
    ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
    executor.setCorePoolSize(4);
    executor.setMaxPoolSize(8);
    executor.setQueueCapacity(100);
    executor.setThreadNamePrefix("dashboard-");
    executor.initialize();
    return executor;
}
```

---

### 3. JOIN FETCH Pattern

**Before** (N+1 with lazy loading):
```java
@Query("SELECT u FROM User u WHERE u.email = :email AND u.tenantId = :tenantId")
Optional<User> findByEmailAndTenantId(@Param("email") String email, @Param("tenantId") UUID tenantId);

// Later: accessing roles triggers separate query
user.getRoles(); // N+1 query here
```

**After** (Eager loading with JOIN FETCH):
```java
@Query("SELECT DISTINCT u FROM User u " +
       "LEFT JOIN FETCH u.roles r " +
       "LEFT JOIN FETCH r.permissions p " +
       "WHERE u.email = :email AND u.tenantId = :tenantId")
Optional<User> findByEmailAndTenantIdWithRolesAndPermissions(
    @Param("email") String email,
    @Param("tenantId") UUID tenantId
);
```

---

## 🧪 Testing & Validation

### Performance Test Checklist

- [ ] **Baseline metrics**: Record current performance (done: 25s dashboard)
- [ ] **Apply index changes**: Add all critical indexes
- [ ] **Re-run performance test**: Measure improvement
- [ ] **Load testing**: Test with 100 concurrent users
- [ ] **Cache hit ratio**: Monitor Redis cache effectiveness
- [ ] **Query execution plans**: Verify indexes are being used

### Monitoring Setup

**Add to Prometheus metrics**:
```yaml
# Query timing histogram
hrms.query.duration{repository="AttendanceRecordRepository", method="findByTenantIdAndEmployeeIdAndDate"}

# Cache metrics
hrms.cache.hits{cache="dashboard"}
hrms.cache.misses{cache="dashboard"}
hrms.cache.evictions{cache="dashboard"}

# Dashboard API timing
http.server.requests{uri="/api/v1/dashboards/employee", status="200"}
```

**Grafana Dashboard Panels**:
- [ ] Dashboard load time (target: < 2s)
- [ ] Top 10 slowest queries
- [ ] Cache hit/miss ratio
- [ ] Database connection pool usage
- [ ] Query count per request

---

## 📅 Implementation Roadmap

### Week 1: Critical Fixes (P0)
- [ ] Day 1-2: Add database indexes (attendance, payslips, leave_balances)
- [ ] Day 3-4: Implement batch queries for payslips and dashboard
- [ ] Day 5: Add Redis caching for dashboard data
- [ ] Day 6-7: Test and validate improvements

**Target**: Dashboard load time < 2 seconds

### Week 2: High Priority (P1)
- [ ] Day 8-9: Optimize user authentication (indexes + caching)
- [ ] Day 10-11: Implement parallel query execution in dashboard
- [ ] Day 12-13: Add caching for holidays and leave balances
- [ ] Day 14: Performance testing and metrics

**Target**: All queries < 200ms

### Week 3: Medium Priority (P2)
- [ ] Day 15-16: Optimize connection pool settings
- [ ] Day 17-18: Add monitoring and alerting
- [ ] Day 19-20: Load testing and fine-tuning
- [ ] Day 21: Documentation and handoff

**Target**: System handles 100+ concurrent users

---

## 📊 Expected Performance Improvements

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Dashboard Load Time | 25,146ms | < 2,000ms | **92% faster** |
| User Authentication | 1,338ms | < 200ms | **85% faster** |
| Attendance Query | 450ms | < 50ms | **89% faster** |
| Payslip Queries (11x) | 2,500ms | < 100ms | **96% faster** |
| Leave Balance Query | 517ms | < 50ms | **90% faster** |
| Holiday Query | 270ms | < 20ms | **93% faster** |

**Overall Expected Improvement**: **10-15x faster** for dashboard operations

---

## 🔧 Quick Wins (Can Implement Today)

### 1. Add Critical Indexes (30 minutes)

```sql
-- Run in Neon DB console
CREATE INDEX CONCURRENTLY idx_attendance_lookup
ON attendance_records(tenant_id, employee_id, attendance_date);

CREATE INDEX CONCURRENTLY idx_payslips_lookup
ON payslips(tenant_id, employee_id, pay_period_year, pay_period_month);

CREATE INDEX CONCURRENTLY idx_leave_balance_lookup
ON leave_balances(tenant_id, employee_id, year);
```

**Expected Impact**: 40-50% improvement immediately

---

### 2. Enable Query Result Caching (1 hour)

Add to `application-dev.yml`:
```yaml
spring:
  cache:
    type: redis
    redis:
      time-to-live: 300000  # 5 minutes
    cache-names:
      - dashboard
      - permissions
      - holidays
```

Add annotations:
```java
@Cacheable("dashboard")
public DashboardResponse getEmployeeDashboard(UUID tenantId, UUID employeeId) {
    // ...
}
```

**Expected Impact**: 70-80% improvement for repeat requests

---

### 3. Limit Dashboard Data Range (15 minutes)

Change payslip query to last 3 months instead of 11:
```java
// Change from:
for (int month = 1; month <= 11; month++) { ... }

// To:
LocalDate now = LocalDate.now();
for (int i = 0; i < 3; i++) {
    LocalDate date = now.minusMonths(i);
    // Query for date.getYear(), date.getMonthValue()
}
```

**Expected Impact**: 60-70% reduction in payslip query time

---

## 📞 Support & References

**Related Documentation**:
- Database Schema: `docs/build-kit/05_DATABASE_SCHEMA_DESIGN.md`
- Caching Strategy: `docs/adr/003-caching-strategy.md`
- Performance SLOs: `deployment/monitoring/prometheus-rules.yml`

**Flyway Migration for Indexes**:
- Next migration: `V66__add_performance_indexes.sql`
- Location: `backend/src/main/resources/db/migration/`

**Contact**:
- Performance issues: Backend team
- Database optimization: DBA team
- Monitoring: SRE team

---

**Document Version**: 1.0
**Last Updated**: 2026-03-22
**Next Review**: After index implementation (Week 1)
