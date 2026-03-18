package com.hrms.domain.payment;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "payment_webhooks", indexes = {
    @Index(name = "idx_payment_webhook_tenant", columnList = "tenantId"),
    @Index(name = "idx_payment_webhook_provider", columnList = "tenantId,provider"),
    @Index(name = "idx_payment_webhook_event", columnList = "tenantId,eventType"),
    @Index(name = "idx_payment_webhook_processed", columnList = "tenantId,processed"),
    @Index(name = "idx_payment_webhook_external_event_id", columnList = "externalEventId")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaymentWebhook {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private UUID tenantId;

    @Column(nullable = false, length = 50)
    private String provider;

    @Column(nullable = false, length = 100)
    private String eventType;

    @Column(length = 255)
    private String externalEventId;

    @Column(nullable = false, columnDefinition = "JSONB")
    private String payload;

    @Builder.Default
    @Column(nullable = false)
    private Boolean processed = false;

    @Column
    private LocalDateTime processedAt;

    @Builder.Default
    @Column(nullable = false, length = 50)
    private String status = "RECEIVED";

    @Column(columnDefinition = "TEXT")
    private String errorMessage;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
