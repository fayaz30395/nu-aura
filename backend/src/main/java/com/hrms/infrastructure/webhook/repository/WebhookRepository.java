package com.hrms.infrastructure.webhook.repository;

import com.hrms.domain.webhook.Webhook;
import com.hrms.domain.webhook.WebhookStatus;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository for webhook subscription management.
 */
@Repository
public interface WebhookRepository extends JpaRepository<Webhook, UUID> {

    /**
     * Find all active webhooks for a tenant.
     *
     * @EntityGraph ensures events collection is loaded in a single JOIN to avoid
     * LazyInitializationException when subscribesTo() is called on returned webhooks.
     */
    @EntityGraph(attributePaths = {"events"})
    List<Webhook> findByTenantIdAndStatus(UUID tenantId, WebhookStatus status);

    /**
     * Find all webhooks for a tenant.
     */
    @EntityGraph(attributePaths = {"events"})
    List<Webhook> findByTenantId(UUID tenantId);

    /**
     * Find webhook by ID and tenant.
     */
    Optional<Webhook> findByIdAndTenantId(UUID id, UUID tenantId);

    /**
     * Find all active webhooks across all tenants (for batch processing).
     */
    @EntityGraph(attributePaths = {"events"})
    @Query("SELECT w FROM Webhook w WHERE w.status = :status")
    List<Webhook> findAllByStatus(@Param("status") WebhookStatus status);

    /**
     * Check if a webhook URL already exists for a tenant.
     */
    boolean existsByTenantIdAndUrl(UUID tenantId, String url);

    /**
     * V166: scheduled cleanup — null out previous_secret on every webhook whose rotation
     * window has elapsed. Bulk UPDATE keeps the sweep cheap (one round-trip per pass) and
     * the partial index {@code idx_webhooks_previous_secret_expires} keeps the predicate
     * fast on tables with mostly-NULL rotation columns.
     *
     * @param now cutoff timestamp — typically {@link LocalDateTime#now()} when called
     * @return number of rows cleared
     */
    @Modifying
    @Query("UPDATE Webhook w SET w.previousSecret = NULL, w.previousSecretExpiresAt = NULL " +
            "WHERE w.previousSecretExpiresAt IS NOT NULL AND w.previousSecretExpiresAt < :now")
    int clearExpiredPreviousSecrets(@Param("now") LocalDateTime now);
}
