package com.hrms.infrastructure.webhook.repository;

import com.hrms.domain.webhook.Webhook;
import com.hrms.domain.webhook.WebhookStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

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
     */
    List<Webhook> findByTenantIdAndStatus(UUID tenantId, WebhookStatus status);

    /**
     * Find all webhooks for a tenant.
     */
    List<Webhook> findByTenantId(UUID tenantId);

    /**
     * Find webhook by ID and tenant.
     */
    Optional<Webhook> findByIdAndTenantId(UUID id, UUID tenantId);

    /**
     * Find all active webhooks across all tenants (for batch processing).
     */
    @Query("SELECT w FROM Webhook w WHERE w.status = :status")
    List<Webhook> findAllByStatus(@Param("status") WebhookStatus status);

    /**
     * Check if a webhook URL already exists for a tenant.
     */
    boolean existsByTenantIdAndUrl(UUID tenantId, String url);
}
