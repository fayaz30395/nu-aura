package com.hrms.api.monitoring.service;

import com.hrms.api.monitoring.dto.MetricsResponse;
import com.hrms.api.monitoring.dto.SystemHealthResponse;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import io.micrometer.core.instrument.search.Search;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthComponent;
import org.springframework.boot.actuate.health.HealthEndpoint;
import org.springframework.boot.actuate.health.Status;
import org.springframework.boot.actuate.health.CompositeHealth;
import org.springframework.stereotype.Service;

import javax.sql.DataSource;
import java.lang.management.ManagementFactory;
import java.lang.management.MemoryMXBean;
import java.lang.management.MemoryUsage;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.Statement;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.TimeUnit;

import org.springframework.transaction.annotation.Transactional;

/**
 * Service for aggregating monitoring metrics for frontend display
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class MonitoringService {

    private final MeterRegistry meterRegistry;
    private final HealthEndpoint healthEndpoint;
    private final DataSource dataSource;

    /**
     * Get system health status.
     *
     * <p>Each subsystem check is wrapped in its own try/catch so that a single
     * failing service (e.g. Redis down, HikariCP metrics not yet registered)
     * does not crash the entire health endpoint with a 500. Instead, the
     * individual component reports DEGRADED/DOWN and the overall status
     * reflects the worst component.</p>
     */
    @Transactional(readOnly = true)
    public SystemHealthResponse getSystemHealth() {
        // 1. Spring Boot aggregate health (may throw if an indicator is broken)
        String overallStatus;
        SystemHealthResponse.CacheHealth cacheHealth;
        try {
            HealthComponent healthComponent = healthEndpoint.health();
            overallStatus = healthComponent.getStatus().getCode();
            cacheHealth = getCacheHealthFromComponent(healthComponent);
        } catch (Exception e) { // Intentional broad catch — health check error boundary
            log.warn("Spring Boot health aggregation failed — reporting DEGRADED: {}", e.getMessage());
            overallStatus = "DEGRADED";
            cacheHealth = SystemHealthResponse.CacheHealth.builder()
                    .status("UNKNOWN")
                    .redisAvailable(false)
                    .build();
        }

        // 2. Individual subsystem checks (each resilient)
        SystemHealthResponse.DatabaseHealth dbHealth = getDatabaseHealth();
        SystemHealthResponse.JvmHealth jvmHealth = getJvmHealth();
        SystemHealthResponse.ApiHealth apiHealth = getApiHealth();

        // 3. Derive worst-case overall status
        if ("DOWN".equals(dbHealth.getStatus())) {
            overallStatus = "DOWN";
        } else if ("DOWN".equals(cacheHealth.getStatus()) && !"DOWN".equals(overallStatus)) {
            overallStatus = "DEGRADED";
        }

        return SystemHealthResponse.builder()
                .status(overallStatus)
                .timestamp(Instant.now())
                .database(dbHealth)
                .cache(cacheHealth)
                .jvm(jvmHealth)
                .api(apiHealth)
                .build();
    }

    /**
     * Get comprehensive metrics
     */
    @Transactional(readOnly = true)
    public MetricsResponse getMetrics() {
        return MetricsResponse.builder()
                .timestamp(Instant.now())
                .system(getSystemMetrics())
                .business(getBusinessMetrics())
                .api(getApiMetricsDetailed())
                .build();
    }

    private SystemHealthResponse.DatabaseHealth getDatabaseHealth() {
        // 1. Verify basic connectivity
        try (Connection conn = dataSource.getConnection();
             Statement stmt = conn.createStatement()) {
            stmt.execute("SELECT 1");
        } catch (Exception e) { // Intentional broad catch — health check error boundary
            log.error("Database connectivity check failed", e);
            return SystemHealthResponse.DatabaseHealth.builder()
                    .status("DOWN")
                    .activeConnections(0)
                    .maxConnections(0)
                    .connectionPoolUsage(0.0)
                    .build();
        }

        // 2. Try to read HikariCP pool metrics (may not be registered yet)
        try {
            Double activeConnections = meterRegistry.get("hikaricp.connections.active").gauge().value();
            Double maxConnections = meterRegistry.get("hikaricp.connections.max").gauge().value();

            double poolUsage = (maxConnections > 0) ? (activeConnections / maxConnections) * 100 : 0.0;

            return SystemHealthResponse.DatabaseHealth.builder()
                    .status("UP")
                    .activeConnections(activeConnections.intValue())
                    .maxConnections(maxConnections.intValue())
                    .connectionPoolUsage(poolUsage)
                    .build();
        } catch (Exception e) { // Intentional broad catch — health check error boundary
            log.warn("HikariCP metrics not available — DB is UP but pool stats unknown: {}", e.getMessage());
            return SystemHealthResponse.DatabaseHealth.builder()
                    .status("UP")
                    .activeConnections(0)
                    .maxConnections(0)
                    .connectionPoolUsage(0.0)
                    .build();
        }
    }

    private SystemHealthResponse.CacheHealth getCacheHealthFromComponent(HealthComponent healthComponent) {
        try {
            if (healthComponent instanceof CompositeHealth compositeHealth) {
                Map<String, HealthComponent> components = compositeHealth.getComponents();
                if (components != null) {
                    HealthComponent redisComponent = components.get("redis");
                    boolean redisAvailable = redisComponent != null && redisComponent.getStatus() == Status.UP;
                    return SystemHealthResponse.CacheHealth.builder()
                            .status(redisAvailable ? "UP" : "DOWN")
                            .redisAvailable(redisAvailable)
                            .build();
                }
            }
            return SystemHealthResponse.CacheHealth.builder()
                    .status("UNKNOWN")
                    .redisAvailable(false)
                    .build();
        } catch (Exception e) { // Intentional broad catch — health check error boundary
            return SystemHealthResponse.CacheHealth.builder()
                    .status("UNKNOWN")
                    .redisAvailable(false)
                    .build();
        }
    }

    private SystemHealthResponse.JvmHealth getJvmHealth() {
        MemoryMXBean memoryBean = ManagementFactory.getMemoryMXBean();
        MemoryUsage heapUsage = memoryBean.getHeapMemoryUsage();
        MemoryUsage nonHeapUsage = memoryBean.getNonHeapMemoryUsage();

        long heapUsed = heapUsage.getUsed();
        long heapMax = heapUsage.getMax();
        double heapPercent = (double) heapUsed / heapMax * 100;

        return SystemHealthResponse.JvmHealth.builder()
                .heapUsed(heapUsed)
                .heapMax(heapMax)
                .heapUsagePercent(heapPercent)
                .nonHeapUsed(nonHeapUsage.getUsed())
                .build();
    }

    private SystemHealthResponse.ApiHealth getApiHealth() {
        try {
            // Get total request count
            double totalRequests = Search.in(meterRegistry)
                    .name("http.server.requests")
                    .counters()
                    .stream()
                    .mapToDouble(Counter::count)
                    .sum();

            // Get error count (4xx and 5xx)
            double errorCount = Search.in(meterRegistry)
                    .name("http.server.requests")
                    .tagKeys("status")
                    .counters()
                    .stream()
                    .filter(c -> {
                        String status = c.getId().getTag("status");
                        return status != null && (status.startsWith("4") || status.startsWith("5"));
                    })
                    .mapToDouble(Counter::count)
                    .sum();

            double errorRate = totalRequests > 0 ? (errorCount / totalRequests) * 100 : 0;

            // Get average response time
            double avgResponseTime = Search.in(meterRegistry)
                    .name("http.server.requests")
                    .timers()
                    .stream()
                    .mapToDouble(t -> t.mean(TimeUnit.MILLISECONDS))
                    .average()
                    .orElse(0.0);

            return SystemHealthResponse.ApiHealth.builder()
                    .totalRequests((long) totalRequests)
                    .errorCount((long) errorCount)
                    .errorRate(errorRate)
                    .avgResponseTime(avgResponseTime)
                    .build();
        } catch (Exception e) { // Intentional broad catch — health check error boundary
            log.error("Error calculating API health", e);
            return SystemHealthResponse.ApiHealth.builder().build();
        }
    }

    private MetricsResponse.SystemMetrics getSystemMetrics() {
        MemoryMXBean memoryBean = ManagementFactory.getMemoryMXBean();
        MemoryUsage heapUsage = memoryBean.getHeapMemoryUsage();

        // Get active users gauge
        int activeUsers = 0;
        try {
            activeUsers = (int) meterRegistry.get("active_users").gauge().value();
        } catch (Exception e) { // Intentional broad catch — health check error boundary
            log.debug("Active users metric not found");
        }

        long uptime = ManagementFactory.getRuntimeMXBean().getUptime();

        return MetricsResponse.SystemMetrics.builder()
                .activeUsers(activeUsers)
                .uptime(uptime)
                .cpuUsage(getProcessCpuLoad())
                .totalMemory(heapUsage.getMax())
                .usedMemory(heapUsage.getUsed())
                .build();
    }

    private MetricsResponse.BusinessMetrics getBusinessMetrics() {
        long employeeActions = getCounterValue("employee_actions_total");
        long attendanceEvents = getCounterValue("attendance_events_total");
        long leaveRequests = getCounterValue("leave_requests_total");
        long payrollProcessed = getCounterValue("payroll_processed_total");
        long recruitmentActions = getCounterValue("recruitment_actions_total");

        return MetricsResponse.BusinessMetrics.builder()
                .employeeActionsToday(employeeActions)
                .attendanceEventsToday(attendanceEvents)
                .leaveRequestsToday(leaveRequests)
                .payrollProcessedToday(payrollProcessed)
                .recruitmentActionsToday(recruitmentActions)
                .build();
    }

    private MetricsResponse.ApiMetrics getApiMetricsDetailed() {
        double totalRequests = Search.in(meterRegistry)
                .name("http.server.requests")
                .counters()
                .stream()
                .mapToDouble(Counter::count)
                .sum();

        double successRequests = Search.in(meterRegistry)
                .name("http.server.requests")
                .tag("status", "200")
                .counters()
                .stream()
                .mapToDouble(Counter::count)
                .sum();

        double errorCount = Search.in(meterRegistry)
                .name("http.server.requests")
                .counters()
                .stream()
                .filter(c -> {
                    String status = c.getId().getTag("status");
                    return status != null && (status.startsWith("4") || status.startsWith("5"));
                })
                .mapToDouble(Counter::count)
                .sum();

        double errorRate = totalRequests > 0 ? (errorCount / totalRequests) * 100 : 0;

        double avgResponseTime = Search.in(meterRegistry)
                .name("http.server.requests")
                .timers()
                .stream()
                .mapToDouble(t -> t.mean(TimeUnit.MILLISECONDS))
                .average()
                .orElse(0.0);

        double p95ResponseTime = Search.in(meterRegistry)
                .name("http.server.requests")
                .timers()
                .stream()
                .mapToDouble(t -> {
                    try {
                        return t.percentile(0.95, TimeUnit.MILLISECONDS);
                    } catch (Exception e) { // Intentional broad catch — health check error boundary
                        return t.mean(TimeUnit.MILLISECONDS);
                    }
                })
                .average()
                .orElse(0.0);

        Map<String, Long> requestsByModule = getRequestsByModule();
        Map<String, Long> errorsByType = getErrorsByType();

        return MetricsResponse.ApiMetrics.builder()
                .totalRequests((long) totalRequests)
                .successfulRequests((long) successRequests)
                .failedRequests((long) errorCount)
                .errorRate(errorRate)
                .avgResponseTime(avgResponseTime)
                .p95ResponseTime(p95ResponseTime)
                .requestsByModule(requestsByModule)
                .errorsByType(errorsByType)
                .build();
    }

    private Map<String, Long> getRequestsByModule() {
        Map<String, Long> moduleRequests = new HashMap<>();

        try {
            Search.in(meterRegistry)
                    .name("api_requests_total")
                    .counters()
                    .forEach(counter -> {
                        String module = counter.getId().getTag("module");
                        if (module != null) {
                            moduleRequests.merge(module, (long) counter.count(), Long::sum);
                        }
                    });
        } catch (Exception e) { // Intentional broad catch — health check error boundary
            log.debug("Error getting module requests", e);
        }

        return moduleRequests;
    }

    private Map<String, Long> getErrorsByType() {
        Map<String, Long> errorsByType = new HashMap<>();

        try {
            Search.in(meterRegistry)
                    .name("api_errors_total")
                    .counters()
                    .forEach(counter -> {
                        String errorType = counter.getId().getTag("error_type");
                        if (errorType != null) {
                            errorsByType.merge(errorType, (long) counter.count(), Long::sum);
                        }
                    });
        } catch (Exception e) { // Intentional broad catch — health check error boundary
            log.debug("Error getting errors by type", e);
        }

        return errorsByType;
    }

    private long getCounterValue(String counterName) {
        try {
            return (long) Search.in(meterRegistry)
                    .name(counterName)
                    .counters()
                    .stream()
                    .mapToDouble(Counter::count)
                    .sum();
        } catch (Exception e) { // Intentional broad catch — health check error boundary
            return 0;
        }
    }

    private double getProcessCpuLoad() {
        try {
            return ManagementFactory.getPlatformMXBean(
                    com.sun.management.OperatingSystemMXBean.class
            ).getProcessCpuLoad() * 100;
        } catch (Exception e) { // Intentional broad catch — health check error boundary
            return 0.0;
        }
    }
}
