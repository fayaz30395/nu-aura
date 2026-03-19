package com.hrms.common.exception;

/**
 * Thrown when a request targets a feature module that has been disabled
 * via static configuration (application.yml kill-switch).
 *
 * Maps to HTTP 503 Service Unavailable — the feature exists but is
 * intentionally turned off.
 */
public class FeatureDisabledException extends RuntimeException {

    private final String featureName;

    public FeatureDisabledException(String featureName) {
        super("Feature '" + featureName + "' is currently disabled.");
        this.featureName = featureName;
    }

    public FeatureDisabledException(String featureName, String message) {
        super(message);
        this.featureName = featureName;
    }

    public String getFeatureName() {
        return featureName;
    }
}
