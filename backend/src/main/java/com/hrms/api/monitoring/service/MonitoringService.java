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
     * Get system health status
     */
    @Transactional(readOnly = true)
    public SystemHealthResponse getSystemHealth() {
        HealthComponent healthComponent = healthEndpoint.health();
        Status status = healthComponent.getStatus();

        // Extract cache health from composite health if available
        SystemHealthResponse.CacheHealth cacheHealth = getCacheHealthFromComponent(healthComponent);

        return SystemHealthResponse.builder()
                .status(status.getCode())
                .timestamp(Instant.now())
                .database(getDatabaseHealth())
                .cache(cacheHealth)
                .jvm(getJvmHealth())
                .api(getApiHealth())
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
        try (Connection conn = dataSource.getConnection();
             Statement stmt = conn.createStatement()) {

            // Get HikariCP metrics
            Double activeConnections = meterRegistry.get("hikaricp.connections.active").gauge().value();
            Double maxConnections = meterRegistry.get("hikaricp.connections.max").gauge().value();

            return SystemHealthResponse.DatabaseHealth.builder()
                    .status("UP")
                    .activeConnections(activeConnections.intValue())
                    .maxConnections(maxConnections.intValue())
                    .connectionPoolUsage((activeConnections / maxConnections) * 100)
                    .build();
        } catch (Exception e) {
            log.error("Error getting database health", e);
            return SystemHealthResponse.DatabaseHealth.builder()
                    .status("DOWN")
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
        } catch (Exception e) {
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
        } catch (Exception e) {
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
        } catch (Exception e) {
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
                    } catch (Exception e) {
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
        } catch (Exception e) {
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
        } catch (Exception e) {
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
        } catch (Exception e) {
            return 0;
        }
    }

    private double getProcessCpuLoad() {
        try {
            return ManagementFactory.getPlatformMXBean(
                    com.sun.management.OperatingSystemMXBean.class
            ).getProcessCpuLoad() * 100;
        } catch (Exception e) {
            return 0.0;
        }
    }
}
