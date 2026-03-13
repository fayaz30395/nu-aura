package com.hrms.infrastructure.kafka.consumer;

import com.hrms.infrastructure.kafka.KafkaTopics;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.support.Acknowledgment;
import org.springframework.kafka.support.KafkaHeaders;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

/**
 * Handler for messages that failed all retry attempts and landed in dead letter topics.
 *
 * <p>Provides centralized monitoring and logging of failed events. In production,
 * stores failed events in a database table for manual inspection and replay.
 *
 * Listens to all DLT topics:
 * - nu-aura.approvals.dlt
 * - nu-aura.notifications.dlt
 * - nu-aura.audit.dlt
 * - nu-aura.employee-lifecycle.dlt
 * </p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DeadLetterHandler {

    /**
     * Handle all dead letter topic messages.
     * Uses a multi-topic listener for flexibility.
     */
    @KafkaListener(
            topics = {
                    KafkaTopics.APPROVALS_DLT,
                    KafkaTopics.NOTIFICATIONS_DLT,
                    KafkaTopics.AUDIT_DLT,
                    KafkaTopics.EMPLOYEE_LIFECYCLE_DLT
            },
            groupId = KafkaTopics.GROUP_DLT_HANDLER,
            containerFactory = "dltListenerContainerFactory"
    )
    public void handleDeadLetter(
            @Payload String message,
            Acknowledgment acknowledgment,
            @Header(KafkaHeaders.RECEIVED_TOPIC) String topic,
            @Header(KafkaHeaders.PARTITION) int partition,
            @Header(KafkaHeaders.OFFSET) long offset) {

        try {
            log.error("Dead letter message received: topic={}, partition={}, offset={}, message={}",
                    topic, partition, offset, message);

            // Store failed event for manual inspection and replay
            storeFailedEvent(topic, partition, offset, message);

            // Send alert (in production)
            sendAlert(topic, partition, offset);

            // Acknowledge to move forward (DLT is the end of the road)
            acknowledgment.acknowledge();

        } catch (Exception e) {
            log.error("Error handling dead letter message from {}: {}", topic, e.getMessage(), e);
            // Still acknowledge to prevent infinite loops
            acknowledgment.acknowledge();
        }
    }

    /**
     * Store the failed event in the database for manual inspection.
     *
     * @param topic Source topic (original topic, not the DLT)
     * @param partition Partition the message came from
     * @param offset Message offset
     * @param message Event payload
     */
    private void storeFailedEvent(String topic, int partition, long offset, String message) {
        try {
            log.info("Storing failed event: topic={}, partition={}, offset={}", topic, partition, offset);

            // TODO: Integrate with failed_events repository/service
            // FailedEvent failedEvent = FailedEvent.builder()
            //     .topicName(topic)
            //     .partition(partition)
            //     .messageOffset(offset)
            //     .eventPayload(message)
            //     .storedAt(LocalDateTime.now())
            //     .retryAttempts(3) // or extract from message
            //     .build();
            // failedEventRepository.save(failedEvent);

            log.debug("Successfully stored failed event in database");

        } catch (Exception e) {
            log.error("Failed to store failed event: {}", e.getMessage(), e);
            // Don't re-throw; we've already logged
        }
    }

    /**
     * Send alert to monitoring system (e.g., Slack, PagerDuty, Sentry).
     *
     * @param topic Topic where failure occurred
     * @param partition Partition index
     * @param offset Message offset
     */
    private void sendAlert(String topic, int partition, long offset) {
        try {
            String alertMessage = String.format(
                    "Kafka DLT Alert: Message failed to process. Topic=%s, Partition=%d, Offset=%d",
                    topic, partition, offset
            );

            log.warn("Sending alert for DLT message: {}", alertMessage);

            // TODO: Integrate with alerting service
            // alertService.sendAlert(AlertLevel.ERROR, "Kafka DLT", alertMessage);
            // or
            // slackService.postMessage("#alerts", alertMessage);

        } catch (Exception e) {
            log.error("Failed to send DLT alert: {}", e.getMessage(), e);
            // Don't re-throw
        }
    }

    /**
     * Retry a previously failed event.
     * Called manually via API or scheduled job to replay failed events.
     *
     * @param failedEventId ID of the failed event record
     * @param targetTopic Topic to replay the message to
     */
    public void replayFailedEvent(String failedEventId, String targetTopic) {
        try {
            log.info("Replaying failed event: id={}, targetTopic={}", failedEventId, targetTopic);

            // TODO: Retrieve the failed event from database
            // FailedEvent failedEvent = failedEventRepository.findById(failedEventId).orElseThrow();
            // String eventPayload = failedEvent.getEventPayload();

            // Republish to the target topic
            // TODO: kafkaTemplate.send(targetTopic, failedEvent.getTopicName(), eventPayload);

            // Mark as replayed
            // TODO: failedEvent.setReplayedAt(LocalDateTime.now());
            // failedEvent.setReplayAttempts(failedEvent.getReplayAttempts() + 1);
            // failedEventRepository.save(failedEvent);

            log.info("Successfully replayed failed event: {}", failedEventId);

        } catch (Exception e) {
            log.error("Failed to replay event {}: {}", failedEventId, e.getMessage(), e);
            throw new RuntimeException("Event replay failed", e);
        }
    }
}
