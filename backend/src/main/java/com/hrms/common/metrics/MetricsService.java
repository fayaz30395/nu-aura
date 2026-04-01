package com.hrms.common.metrics;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Tags;
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

    /**
     * Record active users (concurrent sessions)
     */
    public void recordActiveUsers(int count) {
        meterRegistry.gauge("active_users", count);
    }

    /**
     * Record API error
     */
    public void recordApiError(String endpoint, String errorType, int statusCode) {
        Counter.builder("api_errors")
                .tag("endpoint", endpoint)
                .tag("error_type", errorType)
                .tag("status_code", String.valueOf(statusCode))
                .register(meterRegistry)
                .increment();
    }

    /**
     * Record employee actions
     */
    public void recordEmployeeAction(UUID tenantId, String action) {
        Counter.builder("employee_actions")
                .tag("tenant_id", tenantId.toString())
                .tag("action", action)
                .register(meterRegistry)
                .increment();
    }

    /**
     * Record attendance events
     */
    public void recordAttendanceEvent(UUID tenantId, String eventType) {
        Counter.builder("attendance_events")
                .tag("tenant_id", tenantId.toString())
                .tag("event_type", eventType)
                .register(meterRegistry)
                .increment();
    }

    /**
     * Record leave request events
     */
    public void recordLeaveRequest(UUID tenantId, String status) {
        Counter.builder("leave_requests")
                .tag("tenant_id", tenantId.toString())
                .tag("status", status)
                .register(meterRegistry)
                .increment();
    }

    /**
     * Record payroll processing
     */
    public void recordPayrollProcessing(UUID tenantId, int employeeCount, Duration duration) {
        Counter.builder("payroll_processed")
                .tag("tenant_id", tenantId.toString())
                .register(meterRegistry)
                .increment();

        meterRegistry.gauge("payroll_employee_count", employeeCount);

        Timer.builder("payroll_processing_duration")
                .tag("tenant_id", tenantId.toString())
                .register(meterRegistry)
                .record(duration);
    }

    /**
     * Record recruitment actions
     */
    public void recordRecruitmentAction(UUID tenantId, String action) {
        Counter.builder("recruitment_actions")
                .tag("tenant_id", tenantId.toString())
                .tag("action", action)
                .register(meterRegistry)
                .increment();
    }

    /**
     * Record performance review events
     */
    public void recordPerformanceReview(UUID tenantId, String reviewType, String status) {
        Counter.builder("performance_reviews")
                .tag("tenant_id", tenantId.toString())
                .tag("review_type", reviewType)
                .tag("status", status)
                .register(meterRegistry)
                .increment();
    }

    /**
     * Record cache hit/miss
     */
    public void recordCacheEvent(String cacheName, boolean hit) {
        Counter.builder("cache_events")
                .tag("cache_name", cacheName)
                .tag("result", hit ? "hit" : "miss")
                .register(meterRegistry)
                .increment();
    }

    /**
     * Record document generation
     */
    public void recordDocumentGeneration(UUID tenantId, String documentType, boolean success) {
        Counter.builder("document_generation")
                .tag("tenant_id", tenantId.toString())
                .tag("document_type", documentType)
                .tag("success", String.valueOf(success))
                .register(meterRegistry)
                .increment();
    }

    /**
     * Record notification delivery
     */
    public void recordNotificationDelivery(String channel, boolean success) {
        Counter.builder("notification_delivery")
                .tag("channel", channel)
                .tag("success", String.valueOf(success))
                .register(meterRegistry)
                .increment();
    }

    /**
     * Record workflow execution
     */
    public void recordWorkflowExecution(UUID tenantId, String workflowType, String status, Duration duration) {
        Counter.builder("workflow_executions")
                .tag("tenant_id", tenantId.toString())
                .tag("type", workflowType)
                .tag("status", status)
                .register(meterRegistry)
                .increment();

        Timer.builder("workflow_execution_duration")
                .tag("tenant_id", tenantId.toString())
                .tag("type", workflowType)
                .register(meterRegistry)
                .record(duration);
    }

    /**
     * Record approval task events
     */
    public void recordApprovalTask(UUID tenantId, String taskType, String action) {
        Counter.builder("approval_tasks")
                .tag("tenant_id", tenantId.toString())
                .tag("type", taskType)
                .tag("action", action)
                .register(meterRegistry)
                .increment();
    }

    /**
     * Record data export
     */
    public void recordDataExport(UUID tenantId, String exportType, int recordCount, Duration duration) {
        Counter.builder("data_exports")
                .tag("tenant_id", tenantId.toString())
                .tag("type", exportType)
                .register(meterRegistry)
                .increment();

        meterRegistry.counter("export_records",
                "tenant_id", tenantId.toString(),
                "type", exportType
        ).increment(recordCount);

        Timer.builder("export_duration")
                .tag("tenant_id", tenantId.toString())
                .tag("type", exportType)
                .register(meterRegistry)
                .record(duration);
    }

    /**
     * Record scheduled job execution
     */
    public void recordScheduledJob(String jobName, boolean success, Duration duration) {
        Counter.builder("scheduled_jobs")
                .tag("name", jobName)
                .tag("success", String.valueOf(success))
                .register(meterRegistry)
                .increment();

        Timer.builder("scheduled_job_duration")
                .tag("name", jobName)
                .register(meterRegistry)
                .record(duration);
    }

    /**
     * Record contract lifecycle events (create, update, activate, terminate, renew)
     */
    public void recordContractLifecycle(UUID tenantId, String action, String contractType) {
        Counter.builder("contract_lifecycle")
                .tag("tenant_id", tenantId.toString())
                .tag("action", action)
                .tag("contract_type", contractType)
                .register(meterRegistry)
                .increment();
    }

    /**
     * Record contract lifecycle events with duration
     */
    public void recordContractLifecycle(UUID tenantId, String action, String contractType, Duration duration) {
        recordContractLifecycle(tenantId, action, contractType);

        Timer.builder("contract_lifecycle_duration")
                .tag("tenant_id", tenantId.toString())
                .tag("action", action)
                .tag("contract_type", contractType)
                .register(meterRegistry)
                .record(duration);
    }

    /**
     * Record contract status changes
     */
    public void recordContractStatusChange(UUID tenantId, String fromStatus, String toStatus) {
        Counter.builder("contract_status_transitions")
                .tag("tenant_id", tenantId.toString())
                .tag("from_status", fromStatus)
                .tag("to_status", toStatus)
                .register(meterRegistry)
                .increment();
    }

    /**
     * Record contract expiry alerts
     */
    public void recordContractExpiryAlert(UUID tenantId, int expiringCount, int expiredCount) {
        meterRegistry.gauge("contracts_expiring",
                io.micrometer.core.instrument.Tags.of("tenant_id", tenantId.toString()),
                expiringCount);
        meterRegistry.gauge("contracts_expired",
                io.micrometer.core.instrument.Tags.of("tenant_id", tenantId.toString()),
                expiredCount);
    }

    /**
     * Record webhook delivery metrics
     */
    public void recordWebhookDelivery(UUID tenantId, String eventType, boolean success, Duration duration) {
        Counter.builder("webhook_deliveries")
                .tag("tenant_id", tenantId.toString())
                .tag("event_type", eventType)
                .tag("success", String.valueOf(success))
                .register(meterRegistry)
                .increment();

        Timer.builder("webhook_delivery_duration")
                .tag("tenant_id", tenantId.toString())
                .tag("event_type", eventType)
                .register(meterRegistry)
                .record(duration);
    }

    /**
     * Record webhook retry attempts
     */
    public void recordWebhookRetry(UUID tenantId, String eventType, int attemptNumber) {
        Counter.builder("webhook_retries")
                .tag("tenant_id", tenantId.toString())
                .tag("event_type", eventType)
                .tag("attempt", String.valueOf(attemptNumber))
                .register(meterRegistry)
                .increment();
    }

    /**
     * Record webhook circuit breaker state changes
     */
    public void recordWebhookCircuitBreaker(UUID webhookId, String state) {
        Counter.builder("webhook_circuit_breaker")
                .tag("webhook_id", webhookId.toString())
                .tag("state", state)
                .register(meterRegistry)
                .increment();
    }
}
