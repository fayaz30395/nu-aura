package com.hrms.common.config;

import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
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

/**
 * Redis cache configuration for HRMS application.
 * Defines cache names and their TTL (Time To Live) settings.
 */
@Configuration
@EnableCaching
public class CacheConfig {

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

        // Medium-lived caches (occasional changes) - 4 hours
        cacheConfigurations.put(DEPARTMENTS, defaultConfig.entryTtl(Duration.ofHours(4)));
        cacheConfigurations.put(OFFICE_LOCATIONS, defaultConfig.entryTtl(Duration.ofHours(4)));
        cacheConfigurations.put(BENEFIT_PLANS, defaultConfig.entryTtl(Duration.ofHours(4)));
        cacheConfigurations.put(TENANT_SETTINGS, defaultConfig.entryTtl(Duration.ofHours(4)));

        // Short-lived caches (frequent reads but may change) - 15 minutes
        cacheConfigurations.put(EMPLOYEE_BASIC, defaultConfig.entryTtl(Duration.ofMinutes(15)));

        return RedisCacheManager.builder(redisConnectionFactory)
                .cacheDefaults(defaultConfig)
                .withInitialCacheConfigurations(cacheConfigurations)
                .build();
    }
}
