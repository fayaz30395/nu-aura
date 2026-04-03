package com.hrms.common.health;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.boot.info.BuildProperties;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

import java.lang.management.ManagementFactory;
import java.lang.management.MemoryMXBean;
import java.lang.management.RuntimeMXBean;
import java.time.Duration;
import java.util.Arrays;
import java.util.Optional;

/**
 * Application-level health indicator providing runtime information.
 * Exposes JVM metrics, uptime, and build information.
 */
@Component("application")
@Slf4j
@RequiredArgsConstructor
public class ApplicationHealthIndicator implements HealthIndicator {

    // Memory thresholds
    private static final double MEMORY_WARNING_THRESHOLD = 0.8;
    private static final double MEMORY_CRITICAL_THRESHOLD = 0.95;
    private final Environment environment;
    private final Optional<BuildProperties> buildProperties;

    @Override
    public Health health() {
        try {
            RuntimeMXBean runtimeMXBean = ManagementFactory.getRuntimeMXBean();
            MemoryMXBean memoryMXBean = ManagementFactory.getMemoryMXBean();

            // Calculate uptime
            long uptimeMs = runtimeMXBean.getUptime();
            Duration uptime = Duration.ofMillis(uptimeMs);
            String uptimeFormatted = formatDuration(uptime);

            // Calculate memory usage
            long heapUsed = memoryMXBean.getHeapMemoryUsage().getUsed();
            long heapMax = memoryMXBean.getHeapMemoryUsage().getMax();
            double memoryUsageRatio = (double) heapUsed / heapMax;
            String memoryUsagePercent = String.format("%.1f%%", memoryUsageRatio * 100);

            Health.Builder builder = Health.up()
                    .withDetail("uptime", uptimeFormatted)
                    .withDetail("uptimeMs", uptimeMs)
                    .withDetail("heapUsed", formatBytes(heapUsed))
                    .withDetail("heapMax", formatBytes(heapMax))
                    .withDetail("heapUsagePercent", memoryUsagePercent)
                    .withDetail("availableProcessors", Runtime.getRuntime().availableProcessors())
                    .withDetail("activeProfiles", Arrays.asList(environment.getActiveProfiles()));

            // Add build info if available
            buildProperties.ifPresent(props -> {
                builder.withDetail("version", props.getVersion());
                builder.withDetail("buildTime", props.getTime().toString());
            });

            // Check memory thresholds — report as UP with warning to avoid 503 cascade;
            // critical memory is a signal to alert on, not to take the whole API down.
            if (memoryUsageRatio >= MEMORY_CRITICAL_THRESHOLD) {
                return Health.up()
                        .withDetail("warning", "Critical memory usage — consider restarting")
                        .withDetail("heapUsagePercent", memoryUsagePercent)
                        .build();
            }

            if (memoryUsageRatio >= MEMORY_WARNING_THRESHOLD) {
                builder.withDetail("warning", "High memory usage");
            }

            return builder.build();

        } catch (RuntimeException e) {
            log.error("Application health check failed", e);
            return Health.unknown()
                    .withDetail("error", e.getMessage())
                    .build();
        }
    }

    private String formatDuration(Duration duration) {
        long days = duration.toDays();
        long hours = duration.toHoursPart();
        long minutes = duration.toMinutesPart();
        long seconds = duration.toSecondsPart();

        if (days > 0) {
            return String.format("%dd %dh %dm", days, hours, minutes);
        } else if (hours > 0) {
            return String.format("%dh %dm %ds", hours, minutes, seconds);
        } else if (minutes > 0) {
            return String.format("%dm %ds", minutes, seconds);
        } else {
            return String.format("%ds", seconds);
        }
    }

    private String formatBytes(long bytes) {
        if (bytes < 1024) {
            return bytes + " B";
        } else if (bytes < 1024 * 1024) {
            return String.format("%.1f KB", bytes / 1024.0);
        } else if (bytes < 1024 * 1024 * 1024) {
            return String.format("%.1f MB", bytes / (1024.0 * 1024));
        } else {
            return String.format("%.2f GB", bytes / (1024.0 * 1024 * 1024));
        }
    }
}
