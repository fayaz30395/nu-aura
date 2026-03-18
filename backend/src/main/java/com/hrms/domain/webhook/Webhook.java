package com.hrms.domain.webhook;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

/**
 * Webhook subscription entity for external integrations.
 *
 * <p>Allows external systems to receive real-time notifications
 * for events occurring within the HRMS platform.</p>
 */
@Entity
@Table(name = "webhooks", indexes = {
        @Index(name = "idx_webhook_tenant", columnList = "tenantId"),
        @Index(name = "idx_webhook_status", columnList = "status"),
        @Index(name = "idx_webhook_tenant_status", columnList = "tenantId,status")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class Webhook extends TenantAware {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    /**
     * Human-readable name for this webhook.
     */
    @Column(nullable = false, length = 100)
    private String name;

    /**
     * Description of what this webhook is used for.
     */
    @Column(length = 500)
    private String description;

    /**
     * Target URL to deliver webhook payloads.
     */
    @Column(nullable = false, length = 2048)
    private String url;

    /**
     * Secret key for HMAC signature verification.
     * Stored encrypted in database.
     */
    @Column(length = 256)
    private String secret;

    /**
     * Events this webhook subscribes to.
     */
    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(name = "webhook_events", joinColumns = @JoinColumn(name = "webhook_id"))
    @Column(name = "event_type")
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private Set<WebhookEventType> events = new HashSet<>();

    /**
     * Current status of the webhook.
     */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private WebhookStatus status = WebhookStatus.ACTIVE;

    /**
     * Number of consecutive delivery failures.
     * Used for circuit breaker logic.
     */
    @Column(nullable = false)
    @Builder.Default
    private int consecutiveFailures = 0;

    /**
     * Last successful delivery timestamp.
     */
    private LocalDateTime lastSuccessAt;

    /**
     * Last failed delivery timestamp.
     */
    private LocalDateTime lastFailureAt;

    /**
     * Last error message.
     */
    @Column(length = 1000)
    private String lastErrorMessage;

    /**
     * Whether to include full payload or just event reference.
     */
    @Column(nullable = false)
    @Builder.Default
    private boolean includePayload = true;

    /**
     * Custom headers to include with each request.
     * Stored as JSON.
     */
    @Column(columnDefinition = "TEXT")
    private String customHeaders;

    /**
     * Maximum retry attempts for failed deliveries.
     */
    @Column(nullable = false)
    @Builder.Default
    private int maxRetries = 3;

    /**
     * Timeout in seconds for webhook calls.
     */
    @Column(nullable = false)
    @Builder.Default
    private int timeoutSeconds = 30;

    /**
     * Record a successful delivery.
     */
    public void recordSuccess() {
        this.consecutiveFailures = 0;
        this.lastSuccessAt = LocalDateTime.now();
        this.lastErrorMessage = null;
        if (this.status == WebhookStatus.DISABLED_FAILURES) {
            this.status = WebhookStatus.ACTIVE;
        }
    }

    /**
     * Record a failed delivery.
     */
    public void recordFailure(String errorMessage) {
        this.consecutiveFailures++;
        this.lastFailureAt = LocalDateTime.now();
        this.lastErrorMessage = errorMessage;

        // Disable after 10 consecutive failures
        if (this.consecutiveFailures >= 10 && this.status == WebhookStatus.ACTIVE) {
            this.status = WebhookStatus.DISABLED_FAILURES;
        }
    }

    /**
     * Check if this webhook subscribes to a specific event.
     */
    public boolean subscribesTo(WebhookEventType eventType) {
        return events.contains(eventType) || events.contains(WebhookEventType.ALL);
    }
}
