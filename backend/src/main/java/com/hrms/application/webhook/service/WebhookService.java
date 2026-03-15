package com.hrms.application.webhook.service;

import com.hrms.common.config.CacheConfig;
import com.hrms.common.exception.ResourceNotFoundException;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.webhook.Webhook;
import com.hrms.domain.webhook.WebhookDelivery;
import com.hrms.domain.webhook.WebhookStatus;
import com.hrms.infrastructure.webhook.repository.WebhookDeliveryRepository;
import com.hrms.infrastructure.webhook.repository.WebhookRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.Caching;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Service for managing webhook subscriptions with caching support.
 *
 * <p>Provides CRUD operations for webhooks with Redis caching to optimize
 * read performance for frequently accessed webhook configurations.</p>
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class WebhookService {

    private final WebhookDeliveryRepository deliveryRepository;

    private final WebhookRepository webhookRepository;

    /**
     * Find all active webhooks for a tenant.
     * Results are cached to optimize webhook dispatch operations.
     *
     * @param tenantId Tenant ID
     * @return List of active webhooks
     */
    @Cacheable(
            value = CacheConfig.ACTIVE_WEBHOOKS,
            key = "#tenantId.toString()",
            unless = "#result.isEmpty()"
    )
    @Transactional(readOnly = true)
    public List<Webhook> findActiveWebhooks(UUID tenantId) {
        log.debug("Loading active webhooks for tenant {} (cache miss)", tenantId);
        return webhookRepository.findByTenantIdAndStatus(tenantId, WebhookStatus.ACTIVE);
    }

    /**
     * Find all webhooks for a tenant.
     *
     * @param tenantId Tenant ID
     * @return List of all webhooks
     */
    @Cacheable(
            value = CacheConfig.WEBHOOKS,
            key = "#tenantId.toString()",
            unless = "#result.isEmpty()"
    )
    @Transactional(readOnly = true)
    public List<Webhook> findAllByTenant(UUID tenantId) {
        log.debug("Loading all webhooks for tenant {} (cache miss)", tenantId);
        return webhookRepository.findByTenantId(tenantId);
    }

    /**
     * Find a specific webhook by ID for the current tenant.
     *
     * @param id Webhook ID
     * @return Optional containing the webhook if found
     */
    @Transactional(readOnly = true)
    public Optional<Webhook> findById(UUID id) {
        UUID tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null) {
            log.warn("Cannot find webhook: no tenant context");
            return Optional.empty();
        }
        return webhookRepository.findByIdAndTenantId(id, tenantId);
    }

    /**
     * Create a new webhook.
     * Evicts cache entries for the tenant.
     *
     * @param webhook Webhook to create
     * @return Created webhook
     */
    @Caching(evict = {
            @CacheEvict(value = CacheConfig.WEBHOOKS, key = "#webhook.tenantId.toString()"),
            @CacheEvict(value = CacheConfig.ACTIVE_WEBHOOKS, key = "#webhook.tenantId.toString()")
    })
    @Transactional
    public Webhook create(Webhook webhook) {
        if (webhookRepository.existsByTenantIdAndUrl(webhook.getTenantId(), webhook.getUrl())) {
            throw new IllegalArgumentException("A webhook with this URL already exists");
        }
        log.info("Creating webhook '{}' for tenant {}", webhook.getName(), webhook.getTenantId());
        return webhookRepository.save(webhook);
    }

    /**
     * Update an existing webhook.
     * Evicts cache entries for the tenant.
     *
     * @param webhook Webhook to update
     * @return Updated webhook
     */
    @Caching(evict = {
            @CacheEvict(value = CacheConfig.WEBHOOKS, key = "#webhook.tenantId.toString()"),
            @CacheEvict(value = CacheConfig.ACTIVE_WEBHOOKS, key = "#webhook.tenantId.toString()")
    })
    @Transactional
    public Webhook update(Webhook webhook) {
        log.info("Updating webhook {} for tenant {}", webhook.getId(), webhook.getTenantId());
        return webhookRepository.save(webhook);
    }

    /**
     * Delete a webhook.
     * Evicts cache entries for the tenant.
     *
     * @param id       Webhook ID
     * @param tenantId Tenant ID
     */
    @Caching(evict = {
            @CacheEvict(value = CacheConfig.WEBHOOKS, key = "#tenantId.toString()"),
            @CacheEvict(value = CacheConfig.ACTIVE_WEBHOOKS, key = "#tenantId.toString()")
    })
    @Transactional
    public void delete(UUID id, UUID tenantId) {
        webhookRepository.findByIdAndTenantId(id, tenantId).ifPresent(webhook -> {
            log.info("Deleting webhook {} for tenant {}", id, tenantId);
            webhookRepository.delete(webhook);
        });
    }

    /**
     * Activate a webhook.
     *
     * @param id       Webhook ID
     * @param tenantId Tenant ID
     * @return Updated webhook
     */
    @Caching(evict = {
            @CacheEvict(value = CacheConfig.WEBHOOKS, key = "#tenantId.toString()"),
            @CacheEvict(value = CacheConfig.ACTIVE_WEBHOOKS, key = "#tenantId.toString()")
    })
    @Transactional
    public Optional<Webhook> activate(UUID id, UUID tenantId) {
        return webhookRepository.findByIdAndTenantId(id, tenantId).map(webhook -> {
            webhook.setStatus(WebhookStatus.ACTIVE);
            webhook.setConsecutiveFailures(0);
            log.info("Activated webhook {} for tenant {}", id, tenantId);
            return webhookRepository.save(webhook);
        });
    }

    /**
     * Deactivate a webhook.
     *
     * @param id       Webhook ID
     * @param tenantId Tenant ID
     * @return Updated webhook
     */
    @Caching(evict = {
            @CacheEvict(value = CacheConfig.WEBHOOKS, key = "#tenantId.toString()"),
            @CacheEvict(value = CacheConfig.ACTIVE_WEBHOOKS, key = "#tenantId.toString()")
    })
    @Transactional
    public Optional<Webhook> deactivate(UUID id, UUID tenantId) {
        return webhookRepository.findByIdAndTenantId(id, tenantId).map(webhook -> {
            webhook.setStatus(WebhookStatus.PAUSED);
            log.info("Deactivated webhook {} for tenant {}", id, tenantId);
            return webhookRepository.save(webhook);
        });
    }

    /**
     * Evict all webhook caches for a tenant.
     * Call this after bulk operations or external changes.
     *
     * @param tenantId Tenant ID
     */
    @Caching(evict = {
            @CacheEvict(value = CacheConfig.WEBHOOKS, key = "#tenantId.toString()"),
            @CacheEvict(value = CacheConfig.ACTIVE_WEBHOOKS, key = "#tenantId.toString()")
    })
    public void evictCache(UUID tenantId) {
        log.debug("Evicted webhook cache for tenant {}", tenantId);
    }

    /**
     * BUG-008 FIX: Retry a failed webhook delivery inside a single @Transactional
     * boundary.  The controller previously called deliveryRepository.save() directly
     * with no transaction, creating a race condition: if the dispatcher picked up
     * the delivery between the status-reset and the save completing, the state
     * update could overwrite the dispatcher's DELIVERED status.
     *
     * <p>Also performs an explicit tenant ownership check on the delivery itself
     * (BUG-016 partial fix) rather than relying solely on the indirect webhook check.</p>
     *
     * @param deliveryId UUID of the delivery to retry
     * @return the reset {@link WebhookDelivery}
     */
    @Transactional
    public WebhookDelivery retryDelivery(UUID deliveryId) {
        UUID tenantId = TenantContext.getCurrentTenant();

        WebhookDelivery delivery = deliveryRepository.findById(deliveryId)
                .orElseThrow(() -> new ResourceNotFoundException("WebhookDelivery", "id", deliveryId));

        // BUG-016 FIX: Enforce tenant ownership directly on the delivery entity,
        // not just via the parent webhook lookup.
        if (!tenantId.equals(delivery.getTenantId())) {
            throw new ResourceNotFoundException("WebhookDelivery", "id", deliveryId);
        }

        delivery.setStatus(WebhookDelivery.DeliveryStatus.PENDING);
        delivery.setNextRetryAt(null);
        return deliveryRepository.save(delivery);
    }
}
