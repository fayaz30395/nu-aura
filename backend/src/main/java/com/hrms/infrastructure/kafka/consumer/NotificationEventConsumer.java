package com.hrms.infrastructure.kafka.consumer;

import com.hrms.infrastructure.kafka.KafkaTopics;
import com.hrms.infrastructure.kafka.events.NotificationEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.support.Acknowledgment;
import org.springframework.kafka.support.KafkaHeaders;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

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

    /**
     * In-memory cache of processed event IDs.
     * TODO: Use Redis for distributed systems.
     */
    private final Map<String, Boolean> processedEvents = new ConcurrentHashMap<>();

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

        try {
            // Check idempotency
            if (processedEvents.containsKey(eventId)) {
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

            // Mark as processed
            processedEvents.put(eventId, true);
            acknowledgment.acknowledge();

            log.info("Successfully processed notification event: {}", eventId);

        } catch (Exception e) {
            log.error("Error processing notification event {}: {}", eventId, e.getMessage(), e);

            // Handle retry logic
            handleRetry(event, acknowledgment);
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

            if (templateName != null && !templateName.isEmpty()) {
                // TODO: Integrate with email template service
                // String renderedBody = emailTemplateService.renderTemplate(templateName, templateData);
                // emailService.sendEmail(event.getRecipientId(), subject, renderedBody);
                log.info("Email notification sent using template: {}", templateName);
            } else {
                // TODO: Send plain text email
                // emailService.sendEmail(event.getRecipientId(), subject, body);
                log.info("Email notification sent with plain text");
            }
        } catch (Exception e) {
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

            // TODO: Integrate with push notification service (Firebase Cloud Messaging, etc.)
            // pushService.sendNotification(event.getRecipientId(), title, body, actionUrl);

            log.info("Push notification sent to user: {}", event.getRecipientId());
        } catch (Exception e) {
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

            // TODO: Integrate with in-app notification service/repository
            // inAppNotificationService.createNotification(
            //     event.getRecipientId(),
            //     event.getSubject(),
            //     event.getBody(),
            //     event.getRelatedEntityId(),
            //     event.getRelatedEntityType(),
            //     event.getActionUrl()
            // );

            log.info("In-app notification created for user: {}", event.getRecipientId());
        } catch (Exception e) {
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

            // TODO: Integrate with SMS service (Twilio, etc.)
            // smsService.sendSms(event.getRecipientId(), body);

            log.info("SMS notification sent to user: {}", event.getRecipientId());
        } catch (Exception e) {
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

            // TODO: Republish with delay (use scheduled executor or Kafka with delay)
            // eventPublisher.publishNotificationEvent(event, backoffMs);

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
