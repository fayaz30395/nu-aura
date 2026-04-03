package com.hrms.domain.integration;

import java.util.Map;

/**
 * Immutable record representing the result of a connector connection test.
 *
 * <p>Contains diagnostic information to help troubleshoot integration issues.</p>
 */
public record ConnectionTestResult(
        /**
         * Whether the connection test succeeded.
         */
        boolean success,

        /**
         * Human-readable message describing the test result.
         */
        String message,

        /**
         * Latency in milliseconds for the test operation.
         */
        long latencyMs,

        /**
         * Optional diagnostic details (e.g., API response headers, version info).
         * May contain sensitive data; should not be logged to untrusted outputs.
         */
        Map<String, Object> diagnostics
) {

    /**
     * Validates that required fields are non-null.
     */
    public ConnectionTestResult {
        if (message == null) {
            throw new IllegalArgumentException("message cannot be null");
        }
        if (latencyMs < 0) {
            throw new IllegalArgumentException("latencyMs cannot be negative");
        }
        if (diagnostics == null) {
            throw new IllegalArgumentException("diagnostics cannot be null");
        }
    }

    /**
     * Factory method for a successful test result.
     */
    public static ConnectionTestResult success(String message, long latencyMs, Map<String, Object> diagnostics) {
        return new ConnectionTestResult(true, message, latencyMs, diagnostics);
    }

    /**
     * Factory method for a failed test result.
     */
    public static ConnectionTestResult failure(String message, long latencyMs, Map<String, Object> diagnostics) {
        return new ConnectionTestResult(false, message, latencyMs, diagnostics);
    }
}
