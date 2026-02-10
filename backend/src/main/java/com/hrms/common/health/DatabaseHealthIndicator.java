package com.hrms.common.health;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Custom health indicator for database connectivity.
 * Provides detailed information about database health beyond simple connectivity.
 */
@Component
@Slf4j
@RequiredArgsConstructor
public class DatabaseHealthIndicator implements HealthIndicator {

    private final JdbcTemplate jdbcTemplate;

    @Override
    public Health health() {
        try {
            long startTime = System.currentTimeMillis();

            // Test database connectivity with a simple query
            Integer result = jdbcTemplate.queryForObject("SELECT 1", Integer.class);

            long responseTime = System.currentTimeMillis() - startTime;

            if (result != null && result == 1) {
                // Get connection pool statistics if available
                Health.Builder builder = Health.up()
                        .withDetail("database", "PostgreSQL")
                        .withDetail("responseTimeMs", responseTime);

                // Check if response time is concerning
                if (responseTime > 100) {
                    builder.withDetail("warning", "High response time detected");
                }

                return builder.build();
            } else {
                return Health.down()
                        .withDetail("error", "Unexpected query result")
                        .build();
            }
        } catch (Exception e) {
            log.error("Database health check failed", e);
            return Health.down()
                    .withDetail("error", e.getMessage())
                    .withException(e)
                    .build();
        }
    }
}
