package com.hrms.config;

import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.cache.CacheManager;
import org.springframework.cache.concurrent.ConcurrentMapCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.context.annotation.Profile;

/**
 * Test configuration that replaces Redis with in-memory cache for tests.
 * This allows E2E tests to run without requiring a Redis instance.
 */
@Configuration
@Profile("test")
public class TestCacheConfig {

    @Bean
    @Primary
    @ConditionalOnMissingBean(name = "cacheManager")
    public CacheManager cacheManager() {
        return new ConcurrentMapCacheManager(
                "employees",
                "departments",
                "leaveTypes",
                "leaveBalances",
                "users",
                "roles",
                "permissions",
                "analytics"
        );
    }
}
