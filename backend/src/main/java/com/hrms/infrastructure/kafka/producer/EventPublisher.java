package com.hrms.infrastructure.kafka.producer;

import com.hrms.infrastructure.kafka.KafkaTopics;
import com.hrms.infrastructure.kafka.events.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.kafka.common.KafkaException;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.support.KafkaHeaders;
import org.springframework.messaging.Message;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;

/**
 * Service for publishing domain events to Kafka topics.
 *
 * <p>Provides a clean, type-safe API for various event types. Handles:
 * - Event ID generation for idempotency
 * - Timestamp initialization
 * - Topic routing
 * - Error handling and logging
 * - Async send confirmation
 * </p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class EventPublisher {

    private final KafkaTemplate<String, Object> kafkaTemplate;

    /**
     * Publish an approval event (APPROVED or REJECTED).
     *
     * @param approvalId ID of the approval instance
     * @param taskId ID of the approval task
     * @param approvalType Type of approval (LEAVE, EXPENSE, ASSET, WIKI_PAGE, etc.)
     * @param status APPROVED or REJECTED
     * @param tenantId Multi-tenant context
     * @param approverId User who made the decision
     * @param requesterId User who requested the approval
     * @param comments Optional comments from approver
     * @param isTerminal Whether the workflow is complete
     * @param metadata Domain-specific metadata
     */
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
                .timestamp(LocalDateTime.now())
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

    /**
     * Publish a notification event.
     *
     * @param recipientId User to notify
     * @param channel EMAIL, PUSH, IN_APP, or SMS
     * @param subject Email subject or notification title
     * @param body Email body or notification content
     * @param templateName Optional email template name
     * @param templateData Data to render in template
     * @param tenantId Multi-tenant context
     * @param relatedEntityId ID of related business object
     * @param relatedEntityType Type of related entity
     * @param actionUrl Optional URL to include
     * @param priority HIGH, NORMAL, or LOW
     */
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
                .timestamp(LocalDateTime.now())
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

    /**
     * Publish an audit event.
     *
     * @param userId User who performed action
     * @param action Action type (CREATE, UPDATE, DELETE, APPROVE, REJECT, etc.)
     * @param entityType Resource name (Employee, LeaveRequest, ExpenseClaim, etc.)
     * @param entityId ID of affected entity
     * @param tenantId Multi-tenant context
     * @param oldValue JSON representation of previous state (optional)
     * @param newValue JSON representation of new state (optional)
     * @param ipAddress IP address of client
     * @param userAgent HTTP user agent
     * @param method HTTP method
     * @param uri Endpoint URI
     * @param statusCode HTTP response code
     * @param durationMs Operation duration
     * @param description Optional description/reason
     */
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
                .timestamp(LocalDateTime.now())
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

    /**
     * Publish an employee lifecycle event.
     *
     * @param employeeId Employee affected
     * @param eventTypeEnum Event type (HIRED, ONBOARDED, PROMOTED, TRANSFERRED, OFFBOARDED)
     * @param initiatedBy User who initiated the event
     * @param tenantId Multi-tenant context
     * @param email Employee email
     * @param name Employee name
     * @param departmentId Department assignment
     * @param managerId Reporting manager
     * @param jobTitle Job designation
     * @param employmentType Employment type
     * @param metadata Event-specific details
     * @param bulkOperation Whether part of bulk operation
     */
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
                .timestamp(LocalDateTime.now())
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

    /**
     * Publish a fluence content event (CREATED, UPDATED, PUBLISHED, or DELETED).
     *
     * @param contentType Content type: "wiki", "blog", or "template"
     * @param contentId   UUID of the content entity
     * @param action      Action performed (CREATED, UPDATED, PUBLISHED, DELETED)
     * @param tenantId    Multi-tenant context
     */
    public CompletableFuture<Void> publishFluenceContent(
            String contentType,
            UUID contentId,
            String action,
            UUID tenantId) {

        FluenceContentEvent event = FluenceContentEvent.builder()
                .eventId(UUID.randomUUID().toString())
                .eventType("FLUENCE_" + action)
                .tenantId(tenantId)
                .timestamp(LocalDateTime.now())
                .source("fluence-service")
                .contentType(contentType)
                .contentId(contentId)
                .action(action)
                .build();

        return sendEvent(KafkaTopics.FLUENCE_CONTENT, event.getEventId(), event);
    }

    // ============ PRIVATE HELPERS ============

    /**
     * Send an event to Kafka with proper error handling and failure propagation.
     *
     * <p>R2-004 FIX: The previous implementation wrapped the Kafka send in
     * {@code CompletableFuture.runAsync()}, which always completed the outer future
     * successfully even when Kafka returned an error in its own {@code whenComplete}
     * callback. Callers that checked the returned future would never detect Kafka
     * failures, making it appear as fire-and-forget.</p>
     *
     * <p>The fix converts the Kafka {@code CompletableFuture<SendResult>} directly
     * into a {@code CompletableFuture<Void>} using {@code thenAccept} / {@code handle},
     * so failures are propagated to the caller instead of being silently swallowed.</p>
     *
     * @param topic Kafka topic
     * @param key Message key for partitioning
     * @param event Event payload
     * @return CompletableFuture that completes exceptionally if the send fails
     */
    private CompletableFuture<Void> sendEvent(String topic, String key, Object event) {
        try {
            Message<Object> message = MessageBuilder.withPayload(event)
                    .setHeader(KafkaHeaders.TOPIC, topic)
                    .setHeader(KafkaHeaders.KEY, key)
                    .build();

            return kafkaTemplate.send(message)
                    .handle((sendResult, ex) -> {
                        if (ex != null) {
                            log.error("Failed to publish event to topic {} (key={}): {}",
                                    topic, key, ex.getMessage(), ex);
                            throw new RuntimeException(
                                    "Kafka publish failed for topic " + topic, ex);
                        }
                        log.debug("Event published to topic {} with key {}", topic, key);
                        return (Void) null;
                    });
        } catch (KafkaException e) {
            log.error("Error building Kafka message for topic {}: {}", topic, e.getMessage(), e);
            return CompletableFuture.failedFuture(e);
        }
    }
}
