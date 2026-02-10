package com.hrms.config;

import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.mockito.Mockito;
import org.springframework.cache.CacheManager;
import org.springframework.cache.concurrent.ConcurrentMapCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.context.annotation.Profile;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

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

    @Bean
    @Primary
    public StringRedisTemplate stringRedisTemplate() {
        StringRedisTemplate template = Mockito.mock(StringRedisTemplate.class);
        ValueOperations<String, String> valueOperations = Mockito.mock(ValueOperations.class);
        Mockito.when(template.opsForValue()).thenReturn(valueOperations);
        return template;
    }

    @Bean
    @Primary
    public RedisTemplate<String, Object> redisTemplate() {
        RedisTemplate<String, Object> template = Mockito.mock(RedisTemplate.class);
        ValueOperations<String, Object> valueOperations = Mockito.mock(ValueOperations.class);
        Mockito.when(template.opsForValue()).thenReturn(valueOperations);
        return template;
    }
}
