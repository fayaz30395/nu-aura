package com.hrms.common.resilience;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Registry for managing circuit breakers across the application.
 *
 * <p>Provides pre-configured circuit breakers for common external services
 * and allows custom circuit breakers to be created on demand.</p>
 */
@Slf4j
@Component
public class CircuitBreakerRegistry {

    // Pre-defined circuit breaker names
    public static final String SLACK = "slack";
    public static final String AI_SERVICE = "ai-service";
    public static final String EMAIL = "email";
    public static final String SMS = "sms";
    public static final String STORAGE = "storage";
    public static final String GOOGLE_AUTH = "google-auth";
    public static final String DOCUSIGN = "docusign";
    private final Map<String, CircuitBreaker> circuitBreakers = new ConcurrentHashMap<>();

    /**
     * Get or create a circuit breaker for Slack notifications.
     */
    public CircuitBreaker forSlack() {
        return getOrCreate(SLACK, ServiceConfig.NOTIFICATION);
    }

    /**
     * Get or create a circuit breaker for AI services.
     */
    public CircuitBreaker forAIService() {
        return getOrCreate(AI_SERVICE, ServiceConfig.AI);
    }

    /**
     * Get or create a circuit breaker for email services.
     */
    public CircuitBreaker forEmail() {
        return getOrCreate(EMAIL, ServiceConfig.NOTIFICATION);
    }

    /**
     * Get or create a circuit breaker for SMS services.
     */
    public CircuitBreaker forSMS() {
        return getOrCreate(SMS, ServiceConfig.NOTIFICATION);
    }

    /**
     * Get or create a circuit breaker for file storage (Google Drive).
     */
    public CircuitBreaker forStorage() {
        return getOrCreate(STORAGE, ServiceConfig.STORAGE);
    }

    /**
     * Get or create a circuit breaker for Google Auth.
     */
    public CircuitBreaker forGoogleAuth() {
        return getOrCreate(GOOGLE_AUTH, ServiceConfig.AUTH);
    }

    /**
     * Get or create a circuit breaker for DocuSign eSignature API.
     */
    public CircuitBreaker forDocuSign() {
        return getOrCreate(DOCUSIGN, ServiceConfig.DEFAULT);
    }

    /**
     * Get or create a circuit breaker with default configuration.
     */
    public CircuitBreaker get(String name) {
        return getOrCreate(name, ServiceConfig.DEFAULT);
    }

    /**
     * Get or create a circuit breaker with custom configuration.
     */
    public CircuitBreaker get(String name, int failureThreshold, int successThreshold, Duration openDuration) {
        return circuitBreakers.computeIfAbsent(name, n ->
                new CircuitBreaker(n, failureThreshold, successThreshold, openDuration)
        );
    }

    /**
     * Get the current state of all circuit breakers.
     */
    public Map<String, CircuitBreakerStatus> getAllStatus() {
        Map<String, CircuitBreakerStatus> status = new ConcurrentHashMap<>();
        circuitBreakers.forEach((name, cb) ->
                status.put(name, new CircuitBreakerStatus(
                        cb.getName(),
                        cb.getState().name(),
                        cb.getFailureCount()
                ))
        );
        return status;
    }

    /**
     * Force a specific circuit breaker to open.
     */
    public void forceOpen(String name) {
        CircuitBreaker cb = circuitBreakers.get(name);
        if (cb != null) {
            cb.forceOpen();
        }
    }

    /**
     * Force a specific circuit breaker to close.
     */
    public void forceClose(String name) {
        CircuitBreaker cb = circuitBreakers.get(name);
        if (cb != null) {
            cb.forceClose();
        }
    }

    /**
     * Reset all circuit breakers.
     */
    public void resetAll() {
        circuitBreakers.values().forEach(CircuitBreaker::forceClose);
        log.info("All circuit breakers have been reset");
    }

    private CircuitBreaker getOrCreate(String name, ServiceConfig config) {
        return circuitBreakers.computeIfAbsent(name, n ->
                new CircuitBreaker(n, config.failureThreshold, config.successThreshold, config.openDuration)
        );
    }

    /**
     * Configuration for different service types.
     */
    private enum ServiceConfig {
        // Fast failure for non-critical notifications
        NOTIFICATION(3, 2, Duration.ofSeconds(30)),
        // More tolerance for AI services (might be slow)
        AI(5, 3, Duration.ofSeconds(60)),
        // Critical auth services - strict
        AUTH(3, 2, Duration.ofSeconds(15)),
        // Storage services
        STORAGE(5, 2, Duration.ofSeconds(45)),
        // Default configuration
        DEFAULT(5, 2, Duration.ofSeconds(30));

        final int failureThreshold;
        final int successThreshold;
        final Duration openDuration;

        ServiceConfig(int failureThreshold, int successThreshold, Duration openDuration) {
            this.failureThreshold = failureThreshold;
            this.successThreshold = successThreshold;
            this.openDuration = openDuration;
        }
    }

    /**
     * Status record for circuit breaker monitoring.
     */
    public record CircuitBreakerStatus(
            String name,
            String state,
            int failureCount
    ) {
    }
}
