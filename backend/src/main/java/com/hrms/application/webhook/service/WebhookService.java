package com.hrms.application.webhook.service;

import com.hrms.application.audit.service.AuditLogService;
import com.hrms.common.config.CacheConfig;
import com.hrms.common.exception.BusinessException;
import com.hrms.common.exception.ResourceNotFoundException;
import com.hrms.common.security.TenantContext;
import com.hrms.common.validation.SsrfProtectionUtils;
import com.hrms.domain.audit.AuditLog.AuditAction;
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

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
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

    /**
     * Length of the rotation window during which the previous secret remains valid for
     * verification. 24h matches our longest webhook retry backoff plus consumer redeploy
     * windows — anything shorter would risk breaking in-flight retries on slow consumers.
     */
    private static final int ROTATION_WINDOW_HOURS = 24;

    /**
     * Secret material width: 32 bytes (256 bits) of CSPRNG output, Base64-encoded.
     * Matches HMAC-SHA256 block size and is intentionally longer than the prior practice
     * of leaving the value to admins.
     */
    private static final int SECRET_BYTES = 32;

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final WebhookDeliveryRepository deliveryRepository;

    private final WebhookRepository webhookRepository;

    private final AuditLogService auditLogService;

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
        // SECURITY: belt-and-braces SSRF check at service layer. Even though WebhookUrlValidator
        // runs on the DTO, callers that bypass validation (admin imports, background jobs)
        // must still be blocked from registering internal-pointing URLs.
        try {
            SsrfProtectionUtils.validateUrlSafety(webhook.getUrl());
        } catch (BusinessException e) {
            throw new BusinessException("Webhook URL rejected: " + e.getMessage());
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
        // SECURITY: re-validate URL on every update — controllers may not re-trigger
        // bean validation when updating only a subset of fields.
        try {
            SsrfProtectionUtils.validateUrlSafety(webhook.getUrl());
        } catch (BusinessException e) {
            throw new BusinessException("Webhook URL rejected: " + e.getMessage());
        }
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

    /**
     * Admin-only: rotate a webhook's HMAC signing secret with a dual-secret window.
     *
     * <p>Behaviour:</p>
     * <ul>
     *   <li>Generates a fresh {@value #SECRET_BYTES}-byte CSPRNG secret, Base64-encoded.</li>
     *   <li>Moves the current secret into {@code previousSecret} and stamps
     *       {@code previousSecretExpiresAt} = now + {@value #ROTATION_WINDOW_HOURS}h.</li>
     *   <li>Writes the new secret into {@code secret}.</li>
     *   <li>Audits the action so we have a paper trail of who rotated and when.</li>
     *   <li>Evicts webhook caches so the dispatcher picks up the new secret immediately.</li>
     * </ul>
     *
     * <p>SCOPE NOTE: the new secret is returned to the caller only — there is no API to
     * retrieve it later. The admin is responsible for sharing it with the consumer.</p>
     *
     * @param webhookId webhook to rotate (must belong to current tenant)
     * @return the new secret + rotation-window expiry. Newly-minted secret returned ONCE.
     * @throws ResourceNotFoundException if webhook does not exist for current tenant
     */
    @Caching(evict = {
            @CacheEvict(value = CacheConfig.WEBHOOKS, key = "#root.target.tenantKey()"),
            @CacheEvict(value = CacheConfig.ACTIVE_WEBHOOKS, key = "#root.target.tenantKey()")
    })
    @Transactional
    public SecretRotationResult rotateSecret(UUID webhookId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null) {
            throw new BusinessException("Cannot rotate webhook secret: no tenant context");
        }

        Webhook webhook = webhookRepository.findByIdAndTenantId(webhookId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Webhook", "id", webhookId));

        String newSecret = generateSecret();
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime expiresAt = now.plusHours(ROTATION_WINDOW_HOURS);

        // Preserve the existing secret for the rotation window so in-flight retries
        // (and consumer-side verification of payloads signed with the old key) still work.
        // If there was no prior secret we simply leave previousSecret null — there's no
        // history to grace-period through.
        String currentSecret = webhook.getSecret();
        if (currentSecret != null && !currentSecret.isBlank()) {
            webhook.setPreviousSecret(currentSecret);
            webhook.setPreviousSecretExpiresAt(expiresAt);
        }
        webhook.setSecret(newSecret);

        webhookRepository.save(webhook);

        // Audit trail — using AuditAction.UPDATE because the enum has no dedicated
        // ROTATE_SECRET value (extending the enum is out of scope for this fix;
        // entityType + description carry the semantic detail downstream).
        auditLogService.logAction(
                "Webhook",
                webhookId,
                AuditAction.UPDATE,
                null,
                null,
                "ROTATE_SECRET — previous secret valid until " + expiresAt
        );

        log.info("Rotated secret for webhook {} (tenant {}); previous secret valid until {}",
                webhookId, tenantId, expiresAt);

        return new SecretRotationResult(webhookId, newSecret, expiresAt);
    }

    /**
     * SpEL helper for {@link #rotateSecret} cache eviction. The webhook entity carries
     * its own tenantId, but {@code #root.target} makes that awkward inside the
     * {@code @Caching} annotation — exposing the lookup via a method avoids that
     * gymnastic and keeps the cache key identical to the rest of this class
     * ({@link TenantContext#getCurrentTenant()}).
     */
    public String tenantKey() {
        UUID t = TenantContext.getCurrentTenant();
        return t == null ? "anon" : t.toString();
    }

    /**
     * Generate a {@value #SECRET_BYTES}-byte CSPRNG secret, Base64-encoded (no padding,
     * URL-safe alphabet). Result is roughly 43 characters and fits in the
     * {@code VARCHAR(255)} column comfortably with room for future encryption envelope.
     */
    private String generateSecret() {
        byte[] bytes = new byte[SECRET_BYTES];
        SECURE_RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    /**
     * Result of {@link #rotateSecret(UUID)}.
     *
     * <p>The newly generated secret is returned ONCE so the admin can share it with the
     * consumer out-of-band. We do NOT expose any endpoint to read it back — once the
     * admin loses this response the only remaining recovery is to rotate again.</p>
     *
     * <p>{@code previousSecretExpiresAt} tells the admin how long the old secret will
     * keep working — typically 24h.</p>
     */
    public record SecretRotationResult(UUID webhookId, String newSecret, LocalDateTime previousSecretExpiresAt) {
    }
}
