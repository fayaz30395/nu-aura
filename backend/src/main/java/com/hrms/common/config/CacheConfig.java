package com.hrms.common.config;

import com.hrms.common.security.TenantContext;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.CachingConfigurer;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.interceptor.CacheErrorHandler;
import org.springframework.cache.interceptor.KeyGenerator;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializationContext;
import org.springframework.data.redis.serializer.StringRedisSerializer;

import java.time.Duration;
import java.util.HashMap;
import java.util.Map;
import java.util.StringJoiner;
import java.util.UUID;

/**
 * Redis cache configuration for HRMS application.
 * Defines cache names and their TTL (Time To Live) settings.
 *
 * <p><strong>SECURITY:</strong> All cache keys are automatically prefixed with
 * the current tenant ID to prevent cross-tenant data leakage in multi-tenant
 * environments.</p>
 */
@Configuration
@EnableCaching
public class CacheConfig implements CachingConfigurer {

    // Cache names
    public static final String LEAVE_TYPES = "leaveTypes";
    public static final String DEPARTMENTS = "departments";
    public static final String DESIGNATIONS = "designations";
    public static final String OFFICE_LOCATIONS = "officeLocations";
    public static final String SHIFT_POLICIES = "shiftPolicies";
    public static final String BENEFIT_PLANS = "benefitPlans";
    public static final String HOLIDAYS = "holidays";
    public static final String TENANT_SETTINGS = "tenantSettings";
    public static final String EMPLOYEE_BASIC = "employeeBasic";
    public static final String PERMISSIONS = "permissions";
    public static final String ROLES = "roles";
    public static final String ROLE_PERMISSIONS = "rolePermissions";
    public static final String WEBHOOKS = "webhooks";
    public static final String ACTIVE_WEBHOOKS = "activeWebhooks";
    public static final String LEAVE_BALANCES = "leaveBalances";
    public static final String EMPLOYEES = "employees";
    public static final String EMPLOYEE_WITH_DETAILS = "employeeWithDetails";
    public static final String FEATURE_FLAGS = "featureFlags";
    public static final String ANALYTICS_SUMMARY = "analyticsSummary";
    public static final String DASHBOARD_METRICS = "dashboardMetrics";
    public static final String TENANT_ATTENDANCE_CONFIG = "tenantAttendanceConfig";

    @Bean
    @ConditionalOnBean(RedisConnectionFactory.class)
    public CacheManager cacheManager(RedisConnectionFactory redisConnectionFactory) {
        RedisCacheConfiguration defaultConfig = RedisCacheConfiguration.defaultCacheConfig()
                .entryTtl(Duration.ofHours(1))
                .serializeKeysWith(RedisSerializationContext.SerializationPair.fromSerializer(new StringRedisSerializer()))
                .serializeValuesWith(RedisSerializationContext.SerializationPair.fromSerializer(new GenericJackson2JsonRedisSerializer()))
                .disableCachingNullValues();

        Map<String, RedisCacheConfiguration> cacheConfigurations = new HashMap<>();

        // Long-lived caches (rarely change) - 24 hours
        cacheConfigurations.put(LEAVE_TYPES, defaultConfig.entryTtl(Duration.ofHours(24)));
        cacheConfigurations.put(DESIGNATIONS, defaultConfig.entryTtl(Duration.ofHours(24)));
        cacheConfigurations.put(SHIFT_POLICIES, defaultConfig.entryTtl(Duration.ofHours(24)));
        cacheConfigurations.put(HOLIDAYS, defaultConfig.entryTtl(Duration.ofHours(24)));
        cacheConfigurations.put(PERMISSIONS, defaultConfig.entryTtl(Duration.ofHours(24)));
        cacheConfigurations.put(ROLES, defaultConfig.entryTtl(Duration.ofHours(24)));
        cacheConfigurations.put(ROLE_PERMISSIONS, defaultConfig.entryTtl(Duration.ofMinutes(15)));

        // Medium-lived caches (occasional changes) - 4 hours
        cacheConfigurations.put(DEPARTMENTS, defaultConfig.entryTtl(Duration.ofHours(4)));
        cacheConfigurations.put(OFFICE_LOCATIONS, defaultConfig.entryTtl(Duration.ofHours(4)));
        cacheConfigurations.put(BENEFIT_PLANS, defaultConfig.entryTtl(Duration.ofHours(4)));
        cacheConfigurations.put(TENANT_SETTINGS, defaultConfig.entryTtl(Duration.ofHours(4)));
        cacheConfigurations.put(TENANT_ATTENDANCE_CONFIG, defaultConfig.entryTtl(Duration.ofHours(4)));

        // Short-lived caches (frequent reads but may change) - 15 minutes
        cacheConfigurations.put(EMPLOYEE_BASIC, defaultConfig.entryTtl(Duration.ofMinutes(15)));
        cacheConfigurations.put(EMPLOYEES, defaultConfig.entryTtl(Duration.ofMinutes(15)));
        cacheConfigurations.put(EMPLOYEE_WITH_DETAILS, defaultConfig.entryTtl(Duration.ofMinutes(10)));

        // Leave balances: read on every attendance/leave check; invalidated on any balance mutation - 5 minutes
        cacheConfigurations.put(LEAVE_BALANCES, defaultConfig.entryTtl(Duration.ofMinutes(5)));

        // Webhook caches - medium TTL since webhooks don't change frequently
        cacheConfigurations.put(WEBHOOKS, defaultConfig.entryTtl(Duration.ofHours(1)));
        cacheConfigurations.put(ACTIVE_WEBHOOKS, defaultConfig.entryTtl(Duration.ofMinutes(30)));

        // Feature flags - checked frequently, but changes are rare; invalidated on toggle
        cacheConfigurations.put(FEATURE_FLAGS, defaultConfig.entryTtl(Duration.ofHours(4)));

        // Analytics caches - short-lived to reflect near-real-time data
        cacheConfigurations.put(ANALYTICS_SUMMARY, defaultConfig.entryTtl(Duration.ofMinutes(5)));
        cacheConfigurations.put(DASHBOARD_METRICS, defaultConfig.entryTtl(Duration.ofMinutes(5)));

        return RedisCacheManager.builder(redisConnectionFactory)
                .cacheDefaults(defaultConfig)
                .withInitialCacheConfigurations(cacheConfigurations)
                .build();
    }

    /**
     * Tenant-aware key generator that prefixes all cache keys with the current tenant ID.
     * This prevents cross-tenant cache collisions in multi-tenant environments.
     *
     * <p>Key format: {@code tenant:{tenantId}:{className}.{methodName}:{params}}</p>
     *
     * @return KeyGenerator that includes tenant ID in all cache keys
     */
    @Bean
    @Override
    public KeyGenerator keyGenerator() {
        return (target, method, params) -> {
            UUID tenantId = TenantContext.getCurrentTenant();
            StringJoiner joiner = new StringJoiner(":");

            // Prefix with tenant ID (use "global" for tenant-agnostic caches)
            joiner.add("tenant");
            joiner.add(tenantId != null ? tenantId.toString() : "global");

            // Add class and method for context
            joiner.add(target.getClass().getSimpleName());
            joiner.add(method.getName());

            // Add parameters
            for (Object param : params) {
                joiner.add(param != null ? param.toString() : "null");
            }

            return joiner.toString();
        };
    }

    /**
     * Named key generator for explicit tenant-aware caching.
     * Use with @Cacheable(keyGenerator = "tenantAwareKeyGenerator")
     */
    @Bean("tenantAwareKeyGenerator")
    public KeyGenerator tenantAwareKeyGenerator() {
        return keyGenerator();
    }

    /**
     * Graceful cache degradation: log errors and bypass cache on Redis failure.
     * Prevents 500 errors when Redis is unavailable — application falls through
     * to database queries instead.
     */
    @Override
    public CacheErrorHandler errorHandler() {
        return new CacheErrorHandler() {
            private static final org.slf4j.Logger log =
                org.slf4j.LoggerFactory.getLogger("CacheErrorHandler");

            @Override
            public void handleCacheGetError(RuntimeException exception, Cache cache, Object key) {
                log.warn("Cache GET failed for key={} in cache={}: {}",
                    key, cache.getName(), exception.getMessage());
            }

            @Override
            public void handleCachePutError(RuntimeException exception, Cache cache, Object key, Object value) {
                log.warn("Cache PUT failed for key={} in cache={}: {}",
                    key, cache.getName(), exception.getMessage());
            }

            @Override
            public void handleCacheEvictError(RuntimeException exception, Cache cache, Object key) {
                log.warn("Cache EVICT failed for key={} in cache={}: {}",
                    key, cache.getName(), exception.getMessage());
            }

            @Override
            public void handleCacheClearError(RuntimeException exception, Cache cache) {
                log.warn("Cache CLEAR failed for cache={}: {}",
                    cache.getName(), exception.getMessage());
            }
        };
    }
}
