package com.nulogic.domain.payment;

import com.nulogic.common.util.TenantTimestamp;
import com.nulogic.common.util.TimeAuditingEntityListener;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Payment webhook event log. Migrated to {@link TimeAuditingEntityListener} per the
 * {@code backend/docs/audit/prepersist-now-audit.md} rollout (rows 18-20) so the
 * {@code createdAt} / {@code updatedAt} stamps respect the tenant's IANA zone instead
 * of the JVM default zone.
 *
 * <p>Note: this entity is not {@code TenantAware} — it owns its own {@code tenantId}
 * column. {@link TimeAuditingEntityListener#tenantIdOf(Object)} returns {@code null}
 * for non-{@code TenantAware} entities and {@code TenantTimeService} then falls back to
 * its configured default zone ({@code Asia/Kolkata}). If per-tenant webhook timestamping
 * becomes a hard requirement, switch this entity to extend {@code TenantAware}.</p>
 */
@Entity
@Table(name = "payment_webhooks", indexes = {
        @Index(name = "idx_payment_webhook_tenant", columnList = "tenantId"),
        @Index(name = "idx_payment_webhook_provider", columnList = "tenantId,provider"),
        @Index(name = "idx_payment_webhook_event", columnList = "tenantId,eventType"),
        @Index(name = "idx_payment_webhook_processed", columnList = "tenantId,processed"),
        @Index(name = "idx_payment_webhook_external_event_id", columnList = "externalEventId")
})
@EntityListeners(TimeAuditingEntityListener.class)
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

    @TenantTimestamp
    @Column(nullable = false)
    private LocalDateTime createdAt;

    @TenantTimestamp(updateOnChange = true)
    @Column(nullable = false)
    private LocalDateTime updatedAt;
}
