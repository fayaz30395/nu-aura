package com.hrms.domain.webhook;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Records each webhook delivery attempt for auditing and retry logic.
 */
@Entity
@Table(name = "webhook_deliveries", indexes = {
        @Index(name = "idx_delivery_webhook", columnList = "webhookId"),
        @Index(name = "idx_delivery_status", columnList = "status"),
        @Index(name = "idx_delivery_created", columnList = "createdAt"),
        @Index(name = "idx_delivery_event", columnList = "eventType")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class WebhookDelivery extends TenantAware {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    /**
     * Reference to the webhook subscription.
     */
    @Column(nullable = false)
    private UUID webhookId;

    /**
     * Type of event that triggered this delivery.
     */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private WebhookEventType eventType;

    /**
     * Unique event ID for idempotency.
     */
    @Column(nullable = false, length = 50)
    private String eventId;

    /**
     * JSON payload sent to the webhook.
     */
    @Column(columnDefinition = "TEXT")
    private String payload;

    /**
     * Current delivery status.
     */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private DeliveryStatus status = DeliveryStatus.PENDING;

    /**
     * Number of delivery attempts made.
     */
    @Column(nullable = false)
    @Builder.Default
    private int attempts = 0;

    /**
     * Next scheduled retry time.
     */
    private LocalDateTime nextRetryAt;

    /**
     * HTTP status code from last attempt.
     */
    private Integer responseStatus;

    /**
     * Response body from last attempt (truncated).
     */
    @Column(length = 2000)
    private String responseBody;

    /**
     * Duration of last request in milliseconds.
     */
    private Long durationMs;

    /**
     * Error message from last failed attempt.
     */
    @Column(length = 1000)
    private String errorMessage;

    /**
     * Timestamp of first delivery attempt.
     */
    private LocalDateTime firstAttemptAt;

    /**
     * Timestamp of last delivery attempt.
     */
    private LocalDateTime lastAttemptAt;

    /**
     * Timestamp of successful delivery.
     */
    private LocalDateTime deliveredAt;

    /**
     * Record a delivery attempt.
     */
    public void recordAttempt(int statusCode, String response, long durationMs, String error) {
        this.attempts++;
        this.lastAttemptAt = LocalDateTime.now();
        this.responseStatus = statusCode;
        this.responseBody = truncate(response, 2000);
        this.durationMs = durationMs;
        this.errorMessage = error;

        if (this.firstAttemptAt == null) {
            this.firstAttemptAt = this.lastAttemptAt;
        }

        if (statusCode >= 200 && statusCode < 300) {
            this.status = DeliveryStatus.DELIVERED;
            this.deliveredAt = LocalDateTime.now();
            this.nextRetryAt = null;
        } else if (error != null || statusCode >= 400) {
            if (this.attempts >= 5) {
                this.status = DeliveryStatus.FAILED;
                this.nextRetryAt = null;
            } else {
                this.status = DeliveryStatus.RETRYING;
                // Exponential backoff: 1min, 5min, 15min, 1hr
                int delayMinutes = switch (this.attempts) {
                    case 1 -> 1;
                    case 2 -> 5;
                    case 3 -> 15;
                    case 4 -> 60;
                    default -> 60;
                };
                this.nextRetryAt = LocalDateTime.now().plusMinutes(delayMinutes);
            }
        }
    }

    private String truncate(String text, int maxLength) {
        if (text == null) return null;
        return text.length() <= maxLength ? text : text.substring(0, maxLength);
    }

    /**
     * Delivery status.
     */
    public enum DeliveryStatus {
        PENDING,
        DELIVERING,
        DELIVERED,
        RETRYING,
        FAILED
    }
}
