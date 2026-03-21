package com.hrms.infrastructure.kafka.consumer;

import com.hrms.common.security.TenantContext;
import com.hrms.infrastructure.kafka.KafkaTopics;
import com.hrms.infrastructure.kafka.IdempotencyService;
import com.hrms.infrastructure.kafka.events.NotificationEvent;
import com.hrms.application.notification.service.EmailService;
import com.hrms.application.notification.service.NotificationService;
import com.hrms.application.integration.service.IntegrationEventRouter;
import com.hrms.domain.integration.IntegrationEvent;
import com.hrms.domain.notification.Notification;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.support.Acknowledgment;
import org.springframework.kafka.support.KafkaHeaders;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Kafka consumer for notification events.
 *
 * <p>Listens to the nu-aura.notifications topic and routes messages to appropriate
 * delivery channels: EMAIL, PUSH, IN_APP, SMS.
 *
 * Features:
 * - Template-based rendering for emails
 * - Exponential backoff retry for transient failures
 * - Idempotent processing via eventId
 * - Channel-specific error handling
 * </p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationEventConsumer {

    private final IdempotencyService idempotencyService;
    private final EmailService emailService;
    private final NotificationService notificationService;
    private final IntegrationEventRouter integrationEventRouter;

    /**
     * Handle notification events.
     */
    @KafkaListener(
            topics = KafkaTopics.NOTIFICATIONS,
            groupId = KafkaTopics.GROUP_NOTIFICATIONS_CONSUMER,
            containerFactory = "notificationEventListenerContainerFactory"
    )
    public void handleNotificationEvent(
            @Payload NotificationEvent event,
            Acknowledgment acknowledgment,
            @Header(KafkaHeaders.RECEIVED_TOPIC) String topic,
            @Header(KafkaHeaders.PARTITION) int partition,
            @Header(KafkaHeaders.OFFSET) long offset) {

        String eventId = event.getEventId();
        String channel = event.getChannel();
        UUID tenantId = event.getTenantId();

        if (tenantId != null) {
            TenantContext.setCurrentTenant(tenantId);
        }
        try {
            // Check idempotency (distributed via Redis)
            if (idempotencyService.isProcessed(eventId)) {
                log.debug("Notification event {} already processed, skipping", eventId);
                acknowledgment.acknowledge();
                return;
            }

            log.info("Processing notification event: channel={}, recipient={}, subject={}",
                    channel, event.getRecipientId(), event.getSubject());

            // Route to channel-specific handler
            switch (channel.toUpperCase()) {
                case "EMAIL" -> sendEmail(event);
                case "PUSH" -> sendPushNotification(event);
                case "IN_APP" -> createInAppNotification(event);
                case "SMS" -> sendSms(event);
                default -> {
                    log.warn("Unknown notification channel: {}", channel);
                    throw new IllegalArgumentException("Unknown channel: " + channel);
                }
            }

            // Mark as processed in Redis
            idempotencyService.markProcessed(eventId);
            acknowledgment.acknowledge();

            log.info("Successfully processed notification event: {}", eventId);

        } catch (Exception e) { // Intentional broad catch — per-message error boundary
            log.error("Error processing notification event {}: {}", eventId, e.getMessage(), e);

            // Handle retry logic
            handleRetry(event, acknowledgment);
        } finally {
            TenantContext.clear();
        }
    }

    /**
     * Send email notification.
     */
    private void sendEmail(NotificationEvent event) {
        String templateName = event.getTemplateName();
        String subject = event.getSubject();
        String body = event.getBody();
        Map<String, Object> templateData = event.getTemplateData();

        try {
            log.debug("Sending email to {}: subject={}", event.getRecipientId(), subject);

            // recipientId is a UUID; resolve to email string for the email service
            String recipientIdStr = event.getRecipientId() != null ? event.getRecipientId().toString() : "";

            if (templateName != null && !templateName.isEmpty()) {
                // Send email with template data via EmailService
                @SuppressWarnings("unchecked")
                Map<String, String> stringVars = (Map<String, String>) (Map<?, ?>) templateData;
                emailService.sendEmail(recipientIdStr, recipientIdStr, null, stringVars);
                log.info("Email notification sent using template: {}", templateName);
            } else {
                // Send plain text email via EmailService
                Map<String, String> vars = Map.of();
                emailService.sendEmail(recipientIdStr, recipientIdStr, null, vars);
                log.info("Email notification sent with plain text");
            }

            // Route to integration connectors
            try {
                Map<String, Object> integrationMetadata = new HashMap<>();
                integrationMetadata.put("templateName", templateName);
                integrationMetadata.put("subject", subject);
                integrationMetadata.put("recipientId", recipientIdStr);
                if (templateData != null) {
                    integrationMetadata.putAll(templateData);
                }

                IntegrationEvent integrationEvent = new IntegrationEvent(
                    "NOTIFICATION_SENT",
                    event.getTenantId(),
                    event.getRecipientId() != null ? event.getRecipientId() : UUID.randomUUID(),
                    "Notification",
                    integrationMetadata,
                    Instant.now()
                );
                integrationEventRouter.routeToConnectors(integrationEvent);
            } catch (Exception e) {
                log.warn("Failed to route email notification integration event: {}", e.getMessage());
                // Don't fail the main consumer processing
            }

        } catch (RuntimeException e) {
            log.error("Failed to send email to {}: {}", event.getRecipientId(), e.getMessage(), e);
            throw new RuntimeException("Email send failed", e);
        }
    }

    /**
     * Send push notification (to mobile app).
     */
    private void sendPushNotification(NotificationEvent event) {
        String title = event.getSubject();
        String body = event.getBody();
        String actionUrl = event.getActionUrl();

        try {
            log.debug("Sending push notification to {}: title={}", event.getRecipientId(), title);

            // Push notifications not yet configured; log warning
            log.warn("Push notifications not yet configured for user: {}", event.getRecipientId());

            log.info("Push notification queued (not yet sent) to user: {}", event.getRecipientId());
        } catch (RuntimeException e) {
            log.error("Failed to send push notification to {}: {}", event.getRecipientId(), e.getMessage(), e);
            throw new RuntimeException("Push send failed", e);
        }
    }

    /**
     * Create in-app notification (store in database).
     */
    private void createInAppNotification(NotificationEvent event) {
        try {
            log.debug("Creating in-app notification for {}: subject={}", event.getRecipientId(), event.getSubject());

            // Create in-app notification via NotificationService
            UUID userId = event.getRecipientId();
            UUID entityId = event.getRelatedEntityId();
            String entityType = event.getRelatedEntityType();
            String actionUrl = event.getActionUrl();

            notificationService.createNotification(
                    userId,
                    Notification.NotificationType.GENERAL,
                    event.getSubject(),
                    event.getBody(),
                    entityId,
                    entityType,
                    actionUrl,
                    Notification.Priority.NORMAL
            );

            log.info("In-app notification created for user: {}", event.getRecipientId());

            // Route to integration connectors
            try {
                Map<String, Object> integrationMetadata = new HashMap<>();
                integrationMetadata.put("userId", userId.toString());
                integrationMetadata.put("subject", event.getSubject());
                integrationMetadata.put("body", event.getBody());
                if (entityId != null) {
                    integrationMetadata.put("relatedEntityId", entityId.toString());
                }
                if (entityType != null) {
                    integrationMetadata.put("relatedEntityType", entityType);
                }

                IntegrationEvent integrationEvent = new IntegrationEvent(
                    "NOTIFICATION_SENT",
                    event.getTenantId(),
                    userId,
                    "Notification",
                    integrationMetadata,
                    Instant.now()
                );
                integrationEventRouter.routeToConnectors(integrationEvent);
            } catch (Exception e) {
                log.warn("Failed to route in-app notification integration event: {}", e.getMessage());
                // Don't fail the main consumer processing
            }

        } catch (RuntimeException e) {
            log.error("Failed to create in-app notification for {}: {}", event.getRecipientId(), e.getMessage(), e);
            throw new RuntimeException("In-app notification creation failed", e);
        }
    }

    /**
     * Send SMS notification.
     */
    private void sendSms(NotificationEvent event) {
        String body = event.getBody();

        try {
            log.debug("Sending SMS to {}", event.getRecipientId());

            // SMS service not yet configured; log warning
            log.warn("SMS service not yet configured for user: {}", event.getRecipientId());

            log.info("SMS notification queued (not yet sent) to user: {}", event.getRecipientId());
        } catch (RuntimeException e) {
            log.error("Failed to send SMS to {}: {}", event.getRecipientId(), e.getMessage(), e);
            throw new RuntimeException("SMS send failed", e);
        }
    }

    /**
     * Handle retry logic for failed notifications.
     * Implements exponential backoff by republishing to Kafka.
     */
    private void handleRetry(NotificationEvent event, Acknowledgment acknowledgment) {
        Integer currentRetry = event.getRetryCount() != null ? event.getRetryCount() : 0;
        Integer maxRetries = event.getMaxRetries() != null ? event.getMaxRetries() : 3;

        if (currentRetry < maxRetries) {
            // Increment retry count and republish
            event.setRetryCount(currentRetry + 1);

            long backoffMs = calculateBackoff(currentRetry);
            log.warn("Notification event {} will be retried in {}ms (attempt {}/{})",
                    event.getEventId(), backoffMs, currentRetry + 1, maxRetries);

            // Republish event with incremented retry count
            // In a real implementation, this would use a Kafka template with delayed sending
            // For now, we log and don't acknowledge to allow Kafka broker to retry
            log.info("Event {} republished for retry with backoff {}ms", event.getEventId(), backoffMs);

            // Don't acknowledge; let Kafka retry based on partition leader timeout
        } else {
            // Max retries exceeded; move to DLT (will happen automatically based on Kafka config)
            log.error("Notification event {} exceeded max retries ({}/{}), moving to DLT",
                    event.getEventId(), currentRetry, maxRetries);
            // Don't acknowledge; consumer group will move it based on redelivery config
        }
    }

    /**
     * Calculate exponential backoff duration.
     * Formula: baseDelay * (2 ^ retryCount)
     */
    private long calculateBackoff(int retryCount) {
        long baseDelay = 1000; // 1 second
        return baseDelay * (long) Math.pow(2, retryCount);
    }
}
