package com.hrms.infrastructure.webhook.repository;

import com.hrms.domain.webhook.WebhookDelivery;
import com.hrms.domain.webhook.WebhookDelivery.DeliveryStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Repository for webhook delivery tracking.
 */
@Repository
public interface WebhookDeliveryRepository extends JpaRepository<WebhookDelivery, UUID> {

    /**
     * Find deliveries ready for retry.
     */
    @Query("SELECT d FROM WebhookDelivery d WHERE d.status = 'RETRYING' AND d.nextRetryAt <= :now")
    List<WebhookDelivery> findReadyForRetry(@Param("now") LocalDateTime now);

    /**
     * Find pending deliveries.
     */
    List<WebhookDelivery> findByStatusOrderByCreatedAtAsc(DeliveryStatus status);

    /**
     * Find deliveries for a specific webhook.
     */
    Page<WebhookDelivery> findByWebhookIdOrderByCreatedAtDesc(UUID webhookId, Pageable pageable);

    /**
     * BUG-016 FIX: Find deliveries for a webhook with an explicit tenant guard.
     * Use this in preference to the tenant-blind variant above so the delivery
     * query has its own isolation check independent of the webhook lookup.
     */
    Page<WebhookDelivery> findByWebhookIdAndTenantIdOrderByCreatedAtDesc(
            UUID webhookId, UUID tenantId, Pageable pageable);

    /**
     * Find deliveries for a tenant.
     */
    Page<WebhookDelivery> findByTenantIdOrderByCreatedAtDesc(UUID tenantId, Pageable pageable);

    /**
     * Count failed deliveries for a webhook in a time period.
     */
    @Query("SELECT COUNT(d) FROM WebhookDelivery d WHERE d.webhookId = :webhookId " +
            "AND d.status = 'FAILED' AND d.createdAt >= :since")
    long countFailedDeliveries(@Param("webhookId") UUID webhookId, @Param("since") LocalDateTime since);

    /**
     * Check if event was already delivered (for idempotency).
     */
    boolean existsByWebhookIdAndEventId(UUID webhookId, String eventId);

    /**
     * Clean up old delivered records.
     */
    @Query("DELETE FROM WebhookDelivery d WHERE d.status = 'DELIVERED' AND d.deliveredAt < :before")
    void deleteOldDeliveries(@Param("before") LocalDateTime before);

    /**
     * Count deliveries by status (for health checks).
     */
    long countByStatus(DeliveryStatus status);

    /**
     * Count deliveries by status created after a specific time (for metrics).
     */
    long countByStatusAndCreatedAtAfter(DeliveryStatus status, LocalDateTime after);
}
