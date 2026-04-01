package com.hrms.application.featureflag;

import com.hrms.common.config.CacheConfig;
import com.hrms.common.security.SecurityContext;
import com.hrms.domain.featureflag.FeatureFlag;
import com.hrms.infrastructure.featureflag.FeatureFlagRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Service for managing feature flags.
 *
 * Playbook Reference: Prompt 34 - Feature flags (tenant-level)
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class FeatureFlagService {

    private final FeatureFlagRepository featureFlagRepository;

    /**
     * Check if a feature is enabled for the current tenant
     */
    @Transactional(readOnly = true)
    @Cacheable(value = CacheConfig.FEATURE_FLAGS, key = "#featureKey + '_' + T(com.hrms.common.security.SecurityContext).getCurrentTenantId()")
    public boolean isFeatureEnabled(String featureKey) {
        UUID tenantId = SecurityContext.getCurrentTenantId();
        if (tenantId == null) {
            log.warn("No tenant context available, defaulting feature {} to false", featureKey);
            return false;
        }

        return featureFlagRepository.isFeatureEnabled(tenantId, featureKey)
                .orElse(false);
    }

    /**
     * Check if a feature is enabled for a specific tenant
     */
    @Transactional(readOnly = true)
    @Cacheable(value = CacheConfig.FEATURE_FLAGS, key = "#featureKey + '_' + #tenantId")
    public boolean isFeatureEnabled(String featureKey, UUID tenantId) {
        return featureFlagRepository.isFeatureEnabled(tenantId, featureKey)
                .orElse(false);
    }

    /**
     * Get all feature flags for current tenant
     */
    @Transactional(readOnly = true)
    public List<FeatureFlag> getAllFlags() {
        UUID tenantId = SecurityContext.getCurrentTenantId();
        return featureFlagRepository.findByTenantId(tenantId);
    }

    /**
     * Get all enabled features for current tenant
     */
    @Transactional(readOnly = true)
    public List<String> getEnabledFeatures() {
        UUID tenantId = SecurityContext.getCurrentTenantId();
        return featureFlagRepository.findByTenantIdAndEnabled(tenantId, true)
                .stream()
                .map(FeatureFlag::getFeatureKey)
                .toList();
    }

    /**
     * Get feature flags by category
     */
    @Transactional(readOnly = true)
    public List<FeatureFlag> getFlagsByCategory(String category) {
        UUID tenantId = SecurityContext.getCurrentTenantId();
        return featureFlagRepository.findByTenantIdAndCategory(tenantId, category);
    }

    /**
     * Create or update a feature flag
     */
    @Transactional
    @CacheEvict(value = CacheConfig.FEATURE_FLAGS, key = "#featureKey + '_' + T(com.hrms.common.security.SecurityContext).getCurrentTenantId()")
    public FeatureFlag setFeatureFlag(String featureKey, boolean enabled, String name, String description, String category) {
        UUID tenantId = SecurityContext.getCurrentTenantId();
        UUID userId = SecurityContext.getCurrentUserId();

        FeatureFlag flag = featureFlagRepository.findByTenantIdAndFeatureKey(tenantId, featureKey)
                .orElse(FeatureFlag.builder()
                        .tenantId(tenantId)
                        .featureKey(featureKey)
                        .createdBy(userId)
                        .build());

        flag.setEnabled(enabled);
        flag.setFeatureName(name != null ? name : featureKey);
        flag.setDescription(description);
        flag.setCategory(category);
        flag.setUpdatedBy(userId);

        return featureFlagRepository.save(flag);
    }

    /**
     * Toggle a feature flag
     */
    @Transactional
    @CacheEvict(value = CacheConfig.FEATURE_FLAGS, key = "#featureKey + '_' + T(com.hrms.common.security.SecurityContext).getCurrentTenantId()")
    public FeatureFlag toggleFeature(String featureKey) {
        UUID tenantId = SecurityContext.getCurrentTenantId();

        FeatureFlag flag = featureFlagRepository.findByTenantIdAndFeatureKey(tenantId, featureKey)
                .orElseThrow(() -> new IllegalArgumentException("Feature flag not found: " + featureKey));

        flag.setEnabled(!flag.isEnabled());
        flag.setUpdatedBy(SecurityContext.getCurrentUserId());

        log.info("Feature {} toggled to {} for tenant {}", featureKey, flag.isEnabled(), tenantId);
        return featureFlagRepository.save(flag);
    }

    /**
     * Initialize default feature flags for a new tenant
     */
    @Transactional
    public void initializeDefaultFlags(UUID tenantId, UUID createdBy) {
        List<FeatureFlag> defaultFlags = Arrays.asList(
                createDefaultFlag(tenantId, createdBy, FeatureFlag.ENABLE_PROJECTS, "Projects Module", "Enable project management features", "PROJECTS", true),
                createDefaultFlag(tenantId, createdBy, FeatureFlag.ENABLE_TIMESHEETS, "Timesheets", "Enable timesheet tracking", "PROJECTS", true),
                createDefaultFlag(tenantId, createdBy, FeatureFlag.ENABLE_DOCUMENTS, "Documents", "Enable document management", "HRMS", true),
                createDefaultFlag(tenantId, createdBy, FeatureFlag.ENABLE_GOOGLE_DRIVE, "Google Drive", "Enable Google Drive integration", "INTEGRATION", false),
                createDefaultFlag(tenantId, createdBy, FeatureFlag.ENABLE_AI_RECRUITMENT, "AI Recruitment", "Enable AI-powered recruitment features", "HRMS", false),
                createDefaultFlag(tenantId, createdBy, FeatureFlag.ENABLE_WELLNESS, "Wellness", "Enable wellness programs", "HRMS", false),
                createDefaultFlag(tenantId, createdBy, FeatureFlag.ENABLE_LMS, "Learning Management", "Enable training/LMS features", "HRMS", false),
                createDefaultFlag(tenantId, createdBy, FeatureFlag.ENABLE_PAYROLL, "Payroll", "Enable payroll processing", "HRMS", true),
                createDefaultFlag(tenantId, createdBy, FeatureFlag.ENABLE_PERFORMANCE, "Performance", "Enable performance management", "HRMS", true),
                createDefaultFlag(tenantId, createdBy, FeatureFlag.ENABLE_HELPDESK, "Helpdesk", "Enable helpdesk/support tickets", "HRMS", false),
                createDefaultFlag(tenantId, createdBy, FeatureFlag.ENABLE_PAYMENTS, "Payments", "Enable payment gateway integration (Razorpay, Stripe, etc.)", "HRMS", false)
        );

        for (FeatureFlag flag : defaultFlags) {
            if (!featureFlagRepository.existsByTenantIdAndFeatureKey(tenantId, flag.getFeatureKey())) {
                featureFlagRepository.save(flag);
            }
        }

        log.info("Initialized {} default feature flags for tenant {}", defaultFlags.size(), tenantId);
    }

    private FeatureFlag createDefaultFlag(UUID tenantId, UUID createdBy, String key, String name, String description, String category, boolean enabled) {
        return FeatureFlag.builder()
                .tenantId(tenantId)
                .featureKey(key)
                .featureName(name)
                .description(description)
                .category(category)
                .enabled(enabled)
                .createdBy(createdBy)
                .build();
    }

    /**
     * Get feature flags as a map for frontend consumption
     */
    @Transactional(readOnly = true)
    public Map<String, Boolean> getFlagsAsMap() {
        Map<String, Boolean> flagsMap = new HashMap<>();
        getAllFlags().forEach(flag -> flagsMap.put(flag.getFeatureKey(), flag.isEnabled()));
        return flagsMap;
    }
}
