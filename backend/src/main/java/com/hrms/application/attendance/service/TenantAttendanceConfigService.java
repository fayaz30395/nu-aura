package com.hrms.application.attendance.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.common.config.CacheConfig;
import com.hrms.domain.tenant.Tenant;
import com.hrms.infrastructure.tenant.repository.TenantRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Service for loading per-tenant attendance configuration from the tenant settings JSONB column.
 * Falls back to sensible defaults when a tenant has not configured custom values.
 *
 * <p>Settings are stored under the key {@code "attendance"} inside the tenant's {@code settings}
 * JSON column. Example:
 * <pre>
 * {
 *   "attendance": {
 *     "fullDayMinutes": 480,
 *     "halfDayMinutes": 240,
 *     "overtimeThresholdMinutes": 540,
 *     "standardWorkHours": 8.00
 *   }
 * }
 * </pre>
 *
 * <p>Cached under {@link CacheConfig#TENANT_ATTENDANCE_CONFIG} with a 4-hour TTL.
 * Evict via {@link #evictCache(UUID)} when a tenant updates their settings.
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class TenantAttendanceConfigService {

    private static final String SETTINGS_KEY = "attendance";

    // Defaults — match the original hardcoded constants
    public static final int DEFAULT_FULL_DAY_MINUTES = 480;
    public static final int DEFAULT_HALF_DAY_MINUTES = 240;
    public static final int DEFAULT_OVERTIME_THRESHOLD_MINUTES = 540;
    public static final BigDecimal DEFAULT_STANDARD_WORK_HOURS = BigDecimal.valueOf(8.00);

    private final TenantRepository tenantRepository;
    private final ObjectMapper objectMapper;

    /**
     * Load the attendance configuration for a tenant, cached for performance.
     */
    @Cacheable(value = CacheConfig.TENANT_ATTENDANCE_CONFIG, keyGenerator = "tenantAwareKeyGenerator")
    public TenantAttendanceConfig getConfig(UUID tenantId) {
        try {
            Tenant tenant = tenantRepository.findById(tenantId).orElse(null);
            if (tenant != null && tenant.getSettings() != null && !tenant.getSettings().isBlank()) {
                Map<String, Object> settings = objectMapper.readValue(
                        tenant.getSettings(), new TypeReference<Map<String, Object>>() {});
                Object attendanceObj = settings.get(SETTINGS_KEY);
                if (attendanceObj instanceof Map) {
                    @SuppressWarnings("unchecked")
                    Map<String, Object> attendanceMap = (Map<String, Object>) attendanceObj;
                    return parseConfig(attendanceMap);
                }
            }
        } catch (Exception e) { // Intentional broad catch — attendance processing error boundary
            log.warn("Failed to parse attendance config for tenant {}, using defaults: {}",
                    tenantId, e.getMessage());
        }
        return TenantAttendanceConfig.defaults();
    }

    /**
     * Evict cached config when tenant settings are updated.
     */
    @CacheEvict(value = CacheConfig.TENANT_ATTENDANCE_CONFIG, keyGenerator = "tenantAwareKeyGenerator")
    public void evictCache(UUID tenantId) {
        log.info("Evicted attendance config cache for tenant {}", tenantId);
    }

    // ---- Convenience accessors ----

    public int getFullDayMinutes(UUID tenantId) {
        return getConfig(tenantId).fullDayMinutes();
    }

    public int getHalfDayMinutes(UUID tenantId) {
        return getConfig(tenantId).halfDayMinutes();
    }

    public int getOvertimeThresholdMinutes(UUID tenantId) {
        return getConfig(tenantId).overtimeThresholdMinutes();
    }

    public BigDecimal getStandardWorkHours(UUID tenantId) {
        return getConfig(tenantId).standardWorkHours();
    }

    // ---- Internal ----

    private TenantAttendanceConfig parseConfig(Map<String, Object> map) {
        int fullDay = getIntOrDefault(map, "fullDayMinutes", DEFAULT_FULL_DAY_MINUTES);
        int halfDay = getIntOrDefault(map, "halfDayMinutes", DEFAULT_HALF_DAY_MINUTES);
        int overtimeThreshold = getIntOrDefault(map, "overtimeThresholdMinutes", DEFAULT_OVERTIME_THRESHOLD_MINUTES);
        BigDecimal standardHours = getBigDecimalOrDefault(map, "standardWorkHours", DEFAULT_STANDARD_WORK_HOURS);
        return new TenantAttendanceConfig(fullDay, halfDay, overtimeThreshold, standardHours);
    }

    private int getIntOrDefault(Map<String, Object> map, String key, int defaultValue) {
        Object val = map.get(key);
        if (val instanceof Number number) {
            return number.intValue();
        }
        return defaultValue;
    }

    private BigDecimal getBigDecimalOrDefault(Map<String, Object> map, String key, BigDecimal defaultValue) {
        Object val = map.get(key);
        if (val instanceof Number number) {
            return BigDecimal.valueOf(number.doubleValue());
        }
        return defaultValue;
    }

    /**
     * Immutable record holding per-tenant attendance thresholds.
     */
    public record TenantAttendanceConfig(
            int fullDayMinutes,
            int halfDayMinutes,
            int overtimeThresholdMinutes,
            BigDecimal standardWorkHours
    ) {
        public static TenantAttendanceConfig defaults() {
            return new TenantAttendanceConfig(
                    DEFAULT_FULL_DAY_MINUTES,
                    DEFAULT_HALF_DAY_MINUTES,
                    DEFAULT_OVERTIME_THRESHOLD_MINUTES,
                    DEFAULT_STANDARD_WORK_HOURS
            );
        }
    }
}
