package com.hrms.common.health;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Component;

/**
 * Custom health indicator for Redis connectivity.
 * Provides detailed Redis health information including memory usage.
 */
@Component
@Slf4j
@RequiredArgsConstructor
@ConditionalOnBean(RedisConnectionFactory.class)
public class RedisHealthIndicator implements HealthIndicator {

    private final RedisTemplate<String, Object> redisTemplate;

    @Override
    public Health health() {
        try {
            long startTime = System.currentTimeMillis();

            // Test Redis connectivity with PING
            String pong = redisTemplate.getConnectionFactory()
                    .getConnection()
                    .ping();

            long responseTime = System.currentTimeMillis() - startTime;

            if ("PONG".equals(pong)) {
                Health.Builder builder = Health.up()
                        .withDetail("responseTimeMs", responseTime);

                // Try to get Redis info
                try {
                    var connection = redisTemplate.getConnectionFactory().getConnection();
                    var serverCommands = connection.serverCommands();
                    var info = serverCommands.info("memory");

                    if (info != null) {
                        String usedMemory = info.getProperty("used_memory_human");
                        String maxMemory = info.getProperty("maxmemory_human");

                        if (usedMemory != null) {
                            builder.withDetail("usedMemory", usedMemory);
                        }
                        if (maxMemory != null && !"0".equals(maxMemory)) {
                            builder.withDetail("maxMemory", maxMemory);
                        }
                    }
                } catch (Exception e) {
                    // Info command might not be available, continue without it
                    log.debug("Could not retrieve Redis info: {}", e.getMessage());
                }

                if (responseTime > 50) {
                    builder.withDetail("warning", "High response time detected");
                }

                return builder.build();
            } else {
                return Health.down()
                        .withDetail("error", "Unexpected PING response: " + pong)
                        .build();
            }
        } catch (Exception e) {
            log.error("Redis health check failed", e);
            return Health.down()
                    .withDetail("error", e.getMessage())
                    .build();
        }
    }
}
