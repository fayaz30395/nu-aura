package com.hrms.common.service;

import com.hrms.common.config.FeatureFlag;
import lombok.RequiredArgsConstructor;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Service;

/**
 * Service to manage and query feature flags.
 * Flags are read from application properties (e.g.
 * app.features.MATRIX_RBAC=true).
 */
@Service("configFeatureFlagService")
@RequiredArgsConstructor
public class FeatureFlagService {

    private final Environment environment;

    /**
     * Check if a feature is enabled.
     * 
     * @param feature The feature to check
     * @return true if enabled, false otherwise (defaults to false)
     */
    public boolean isEnabled(FeatureFlag feature) {
        String propKey = "app.features." + feature.name();
        Boolean isEnabled = environment.getProperty(propKey, Boolean.class);
        return Boolean.TRUE.equals(isEnabled);
    }
}
