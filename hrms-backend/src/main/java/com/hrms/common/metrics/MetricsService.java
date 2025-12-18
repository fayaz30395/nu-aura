package com.hrms.common.metrics;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.function.Supplier;

/**
 * Service for recording application metrics.
 *
 * Playbook Reference: Prompt 13 - Observability baseline
 */
@Service
@RequiredArgsConstructor
public class MetricsService {

    private final MeterRegistry meterRegistry;

    /**
     * Record successful login
     */
    public void recordLoginSuccess(String method) {
        Counter.builder("auth_login")
                .tag("status", "success")
                .tag("method", method)
                .register(meterRegistry)
                .increment();
    }

    /**
     * Record failed login
     */
    public void recordLoginFailure(String method, String reason) {
        Counter.builder("auth_login")
                .tag("status", "failure")
                .tag("method", method)
                .tag("reason", reason)
                .register(meterRegistry)
                .increment();
    }

    /**
     * Record rate limit exceeded
     */
    public void recordRateLimitExceeded(String endpoint, String clientKey) {
        Counter.builder("rate_limit_exceeded")
                .tag("endpoint", endpoint)
                .register(meterRegistry)
                .increment();
    }

    /**
     * Record tenant-level usage
     */
    public void recordTenantUsage(UUID tenantId, String operation) {
        Counter.builder("tenant_usage")
                .tag("tenant_id", tenantId.toString())
                .tag("operation", operation)
                .register(meterRegistry)
                .increment();
    }

    /**
     * Record API request by module
     */
    public void recordApiRequest(String module, String operation) {
        Counter.builder("api_requests")
                .tag("module", module)
                .tag("operation", operation)
                .register(meterRegistry)
                .increment();
    }

    /**
     * Time an operation and return its result
     */
    public <T> T timeOperation(String name, String[] tags, Supplier<T> operation) {
        Timer timer = Timer.builder(name)
                .tags(tags)
                .register(meterRegistry);
        return timer.record(operation);
    }

    /**
     * Time an operation with a callable
     */
    public <T> T timeOperation(String name, Callable<T> callable) throws Exception {
        Timer timer = Timer.builder(name)
                .register(meterRegistry);
        return timer.recordCallable(callable);
    }

    /**
     * Record operation duration manually
     */
    public void recordDuration(String name, Duration duration, String... tags) {
        Timer.builder(name)
                .tags(tags)
                .register(meterRegistry)
                .record(duration);
    }

    /**
     * Record database query count
     */
    public void recordDbQuery(String operation, String table) {
        Counter.builder("db_queries")
                .tag("operation", operation)
                .tag("table", table)
                .register(meterRegistry)
                .increment();
    }

    /**
     * Record email sent
     */
    public void recordEmailSent(String type, boolean success) {
        Counter.builder("email_sent")
                .tag("type", type)
                .tag("success", String.valueOf(success))
                .register(meterRegistry)
                .increment();
    }

    /**
     * Record file upload
     */
    public void recordFileUpload(UUID tenantId, String fileType, long sizeBytes) {
        Counter.builder("file_uploads")
                .tag("tenant_id", tenantId.toString())
                .tag("type", fileType)
                .register(meterRegistry)
                .increment();

        meterRegistry.counter("file_upload_bytes",
                "tenant_id", tenantId.toString(),
                "type", fileType
        ).increment(sizeBytes);
    }

    /**
     * Record feature flag usage
     */
    public void recordFeatureFlagCheck(String featureKey, boolean enabled) {
        Counter.builder("feature_flag_checks")
                .tag("feature", featureKey)
                .tag("enabled", String.valueOf(enabled))
                .register(meterRegistry)
                .increment();
    }
}
