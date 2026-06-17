package com.nulogic.infrastructure.kafka.producer;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nulogic.common.util.TenantTimeService;
import com.nulogic.infrastructure.kafka.KafkaTopics;
import com.nulogic.infrastructure.kafka.events.*;
import com.nulogic.infrastructure.kafka.outbox.OutboxEvent;
import com.nulogic.infrastructure.kafka.outbox.OutboxEventRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;

/**
 * Service for publishing domain events via the transactional outbox pattern.
 *
 * <p>Events are written to the outbox_events table atomically with the business
 * operation. OutboxEventProcessor polls and dispatches them to consumer handlers.
 * This ensures durability on Railway where Kafka is not provisioned.</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class EventPublisher {

    private final OutboxEventRepository outboxEventRepository;
    private final ObjectMapper objectMapper;
    private final TenantTimeService tenantTimeService;

    public CompletableFuture<Void> publishApprovalEvent(
            UUID approvalId,
            UUID taskId,
            String approvalType,
            String status,
            UUID tenantId,
            UUID approverId,
            UUID requesterId,
            String comments,
            boolean isTerminal,
            Map<String, Object> metadata) {

        ApprovalEvent event = ApprovalEvent.builder()
                .eventId(UUID.randomUUID().toString())
                .eventType("APPROVAL_" + status)
                .tenantId(tenantId)
                .timestamp(tenantTimeService.now(tenantId))
                .source("approval-service")
                .approvalId(approvalId)
                .taskId(taskId)
                .approvalType(approvalType)
                .status(status)
                .approverId(approverId)
                .requesterId(requesterId)
                .comments(comments)
                .isTerminal(isTerminal)
                .metadata(metadata)
                .build();

        return sendEvent(KafkaTopics.APPROVALS, event.getEventId(), event);
    }

    public CompletableFuture<Void> publishNotificationEvent(
            UUID recipientId,
            String channel,
            String subject,
            String body,
            String templateName,
            Map<String, Object> templateData,
            UUID tenantId,
            UUID relatedEntityId,
            String relatedEntityType,
            String actionUrl,
            String priority) {

        NotificationEvent event = NotificationEvent.builder()
                .eventId(UUID.randomUUID().toString())
                .eventType("NOTIFICATION_" + channel)
                .tenantId(tenantId)
                .timestamp(tenantTimeService.now(tenantId))
                .source("notification-service")
                .recipientId(recipientId)
                .channel(channel)
                .subject(subject)
                .body(body)
                .templateName(templateName)
                .templateData(templateData)
                .relatedEntityId(relatedEntityId)
                .relatedEntityType(relatedEntityType)
                .actionUrl(actionUrl)
                .priority(priority)
                .retryCount(0)
                .maxRetries(3)
                .build();

        return sendEvent(KafkaTopics.NOTIFICATIONS, event.getEventId(), event);
    }

    public CompletableFuture<Void> publishAuditEvent(
            UUID userId,
            String action,
            String entityType,
            UUID entityId,
            UUID tenantId,
            String oldValue,
            String newValue,
            String ipAddress,
            String userAgent,
            String method,
            String uri,
            Integer statusCode,
            Long durationMs,
            String description) {

        AuditEvent event = AuditEvent.builder()
                .eventId(UUID.randomUUID().toString())
                .eventType("AUDIT_" + action)
                .tenantId(tenantId)
                .timestamp(tenantTimeService.now(tenantId))
                .source("audit-service")
                .userId(userId)
                .action(action)
                .entityType(entityType)
                .entityId(entityId)
                .oldValue(oldValue)
                .newValue(newValue)
                .ipAddress(ipAddress)
                .userAgent(userAgent)
                .method(method)
                .uri(uri)
                .statusCode(statusCode)
                .durationMs(durationMs)
                .description(description)
                .build();

        return sendEvent(KafkaTopics.AUDIT, event.getEventId(), event);
    }

    public CompletableFuture<Void> publishEmployeeLifecycleEvent(
            UUID employeeId,
            String eventTypeEnum,
            UUID initiatedBy,
            UUID tenantId,
            String email,
            String name,
            UUID departmentId,
            UUID managerId,
            String jobTitle,
            String employmentType,
            Map<String, Object> metadata,
            boolean bulkOperation) {

        EmployeeLifecycleEvent event = EmployeeLifecycleEvent.builder()
                .eventId(UUID.randomUUID().toString())
                .eventType("EMPLOYEE_" + eventTypeEnum)
                .tenantId(tenantId)
                .timestamp(tenantTimeService.now(tenantId))
                .source("employee-service")
                .employeeId(employeeId)
                .eventTypeEnum(eventTypeEnum)
                .initiatedBy(initiatedBy)
                .email(email)
                .name(name)
                .departmentId(departmentId)
                .managerId(managerId)
                .jobTitle(jobTitle)
                .employmentType(employmentType)
                .metadata(metadata)
                .bulkOperation(bulkOperation)
                .build();

        return sendEvent(KafkaTopics.EMPLOYEE_LIFECYCLE, event.getEventId(), event);
    }

    public CompletableFuture<Void> publishPayrollProcessingEvent(
            UUID runId,
            UUID tenantId,
            UUID triggeredBy,
            Integer payPeriodMonth,
            Integer payPeriodYear) {

        PayrollProcessingEvent event = PayrollProcessingEvent.builder()
                .eventId(UUID.randomUUID().toString())
                .eventType("PAYROLL_PROCESSING_REQUESTED")
                .tenantId(tenantId)
                .timestamp(tenantTimeService.now(tenantId))
                .source("payroll-service")
                .runId(runId)
                .triggeredBy(triggeredBy)
                .payPeriodMonth(payPeriodMonth)
                .payPeriodYear(payPeriodYear)
                .build();

        return sendEvent(KafkaTopics.PAYROLL_PROCESSING, event.getEventId(), event);
    }

    public CompletableFuture<Void> publishFluenceContent(
            String contentType,
            UUID contentId,
            String action,
            UUID tenantId) {

        FluenceContentEvent event = FluenceContentEvent.builder()
                .eventId(UUID.randomUUID().toString())
                .eventType("FLUENCE_" + action)
                .tenantId(tenantId)
                .timestamp(tenantTimeService.now(tenantId))
                .source("fluence-service")
                .contentType(contentType)
                .contentId(contentId)
                .action(action)
                .build();

        return sendEvent(KafkaTopics.FLUENCE_CONTENT, event.getEventId(), event);
    }

    // ============ PRIVATE HELPERS ============

    /**
     * Persist the event to the outbox table. The OutboxEventProcessor polls
     * and dispatches it to the appropriate consumer handler.
     */
    private CompletableFuture<Void> sendEvent(String topic, String key, BaseKafkaEvent event) {
        try {
            String payload = objectMapper.writeValueAsString(event);
            OutboxEvent outboxEvent = new OutboxEvent();
            outboxEvent.setEventId(key);
            outboxEvent.setTopic(topic);
            outboxEvent.setPartitionKey(key);
            outboxEvent.setEventClass(event.getClass().getName());
            outboxEvent.setPayload(payload);
            outboxEvent.setStatus("PENDING");
            outboxEvent.setTenantId(event.getTenantId());
            outboxEventRepository.save(outboxEvent);
            log.debug("Event queued to outbox: topic={}, eventId={}", topic, key);
            return CompletableFuture.completedFuture(null);
        } catch (Exception e) {
            log.error("Failed to queue event to outbox: topic={}, key={}: {}", topic, key, e.getMessage(), e);
            return CompletableFuture.failedFuture(e);
        }
    }
}
