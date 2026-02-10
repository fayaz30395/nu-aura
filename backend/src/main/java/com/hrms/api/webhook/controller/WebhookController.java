package com.hrms.api.webhook.controller;

import com.hrms.api.webhook.dto.WebhookDeliveryResponse;
import com.hrms.api.webhook.dto.WebhookRequest;
import com.hrms.api.webhook.dto.WebhookResponse;
import com.hrms.application.webhook.service.WebhookService;
import com.hrms.common.exception.ResourceNotFoundException;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import com.hrms.common.security.RequiresWebhookScope;
import com.hrms.common.security.TenantContext;
import com.hrms.common.security.WebhookScopes;
import com.hrms.domain.webhook.Webhook;
import com.hrms.domain.webhook.WebhookDelivery;
import com.hrms.domain.webhook.WebhookStatus;
import com.hrms.infrastructure.webhook.repository.WebhookDeliveryRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * REST controller for managing webhooks.
 *
 * <p>Provides endpoints for CRUD operations on webhooks and
 * viewing delivery history.</p>
 *
 * <p>Supports two authentication methods:</p>
 * <ul>
 *   <li><strong>JWT</strong>: Requires SYSTEM:ADMIN permission</li>
 *   <li><strong>API Key</strong>: Requires appropriate webhook:* scopes</li>
 * </ul>
 *
 * @see WebhookScopes
 */
@Slf4j
@RestController
@RequestMapping("/api/webhooks")
@RequiredArgsConstructor
@Tag(name = "Webhooks", description = "Webhook management APIs - supports JWT and API key authentication")
@SecurityRequirement(name = "bearerAuth")
@SecurityRequirement(name = "apiKeyAuth")
public class WebhookController {

    private final WebhookService webhookService;
    private final WebhookDeliveryRepository deliveryRepository;

    /**
     * List all webhooks for the current tenant.
     */
    @GetMapping
    @RequiresPermission(Permission.SYSTEM_ADMIN)
    @RequiresWebhookScope(WebhookScopes.WEBHOOK_READ)
    @Operation(summary = "List webhooks", description = "Get all webhooks for the current tenant")
    public ResponseEntity<List<WebhookResponse>> listWebhooks() {
        UUID tenantId = TenantContext.getCurrentTenant();
        List<WebhookResponse> webhooks = webhookService.findAllByTenant(tenantId)
                .stream()
                .map(WebhookResponse::fromEntity)
                .collect(Collectors.toList());
        return ResponseEntity.ok(webhooks);
    }

    /**
     * Get a specific webhook by ID.
     */
    @GetMapping("/{id}")
    @RequiresPermission(Permission.SYSTEM_ADMIN)
    @RequiresWebhookScope(WebhookScopes.WEBHOOK_READ)
    @Operation(summary = "Get webhook", description = "Get a specific webhook by ID")
    public ResponseEntity<WebhookResponse> getWebhook(@PathVariable UUID id) {
        return webhookService.findById(id)
                .map(WebhookResponse::fromEntity)
                .map(ResponseEntity::ok)
                .orElseThrow(() -> new ResourceNotFoundException("Webhook", "id", id));
    }

    /**
     * Create a new webhook.
     */
    @PostMapping
    @RequiresPermission(Permission.SYSTEM_ADMIN)
    @RequiresWebhookScope(WebhookScopes.WEBHOOK_WRITE)
    @Operation(summary = "Create webhook", description = "Create a new webhook configuration")
    public ResponseEntity<WebhookResponse> createWebhook(@Valid @RequestBody WebhookRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();

        Webhook webhook = Webhook.builder()
                .name(request.getName())
                .description(request.getDescription())
                .url(request.getUrl())
                .secret(request.getSecret())
                .events(request.getEvents())
                .status(WebhookStatus.ACTIVE)
                .customHeaders(request.getCustomHeaders())
                .build();
        webhook.setTenantId(tenantId);

        Webhook created = webhookService.create(webhook);
        log.info("Created webhook {} for tenant {}", created.getId(), tenantId);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(WebhookResponse.fromEntity(created));
    }

    /**
     * Update an existing webhook.
     */
    @PutMapping("/{id}")
    @RequiresPermission(Permission.SYSTEM_ADMIN)
    @RequiresWebhookScope(WebhookScopes.WEBHOOK_WRITE)
    @Operation(summary = "Update webhook", description = "Update an existing webhook configuration")
    public ResponseEntity<WebhookResponse> updateWebhook(
            @PathVariable UUID id,
            @Valid @RequestBody WebhookRequest request) {

        Webhook existing = webhookService.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Webhook", "id", id));

        existing.setName(request.getName());
        existing.setDescription(request.getDescription());
        existing.setUrl(request.getUrl());
        if (request.getSecret() != null && !request.getSecret().isBlank()) {
            existing.setSecret(request.getSecret());
        }
        existing.setEvents(request.getEvents());
        existing.setCustomHeaders(request.getCustomHeaders());

        Webhook updated = webhookService.update(existing);
        log.info("Updated webhook {}", id);

        return ResponseEntity.ok(WebhookResponse.fromEntity(updated));
    }

    /**
     * Delete a webhook.
     */
    @DeleteMapping("/{id}")
    @RequiresPermission(Permission.SYSTEM_ADMIN)
    @RequiresWebhookScope(WebhookScopes.WEBHOOK_DELETE)
    @Operation(summary = "Delete webhook", description = "Delete a webhook configuration")
    public ResponseEntity<Void> deleteWebhook(@PathVariable UUID id) {
        UUID tenantId = TenantContext.getCurrentTenant();
        webhookService.delete(id, tenantId);
        log.info("Deleted webhook {} for tenant {}", id, tenantId);
        return ResponseEntity.noContent().build();
    }

    /**
     * Activate a webhook.
     */
    @PostMapping("/{id}/activate")
    @RequiresPermission(Permission.SYSTEM_ADMIN)
    @RequiresWebhookScope(WebhookScopes.WEBHOOK_MANAGE)
    @Operation(summary = "Activate webhook", description = "Activate a disabled webhook")
    public ResponseEntity<WebhookResponse> activateWebhook(@PathVariable UUID id) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return webhookService.activate(id, tenantId)
                .map(WebhookResponse::fromEntity)
                .map(ResponseEntity::ok)
                .orElseThrow(() -> new ResourceNotFoundException("Webhook", "id", id));
    }

    /**
     * Deactivate a webhook.
     */
    @PostMapping("/{id}/deactivate")
    @RequiresPermission(Permission.SYSTEM_ADMIN)
    @RequiresWebhookScope(WebhookScopes.WEBHOOK_MANAGE)
    @Operation(summary = "Deactivate webhook", description = "Deactivate an active webhook")
    public ResponseEntity<WebhookResponse> deactivateWebhook(@PathVariable UUID id) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return webhookService.deactivate(id, tenantId)
                .map(WebhookResponse::fromEntity)
                .map(ResponseEntity::ok)
                .orElseThrow(() -> new ResourceNotFoundException("Webhook", "id", id));
    }

    /**
     * Get delivery history for a webhook.
     */
    @GetMapping("/{id}/deliveries")
    @RequiresPermission(Permission.SYSTEM_ADMIN)
    @RequiresWebhookScope(WebhookScopes.WEBHOOK_DELIVERIES_READ)
    @Operation(summary = "Get deliveries", description = "Get delivery history for a webhook")
    public ResponseEntity<Page<WebhookDeliveryResponse>> getDeliveries(
            @PathVariable UUID id,
            Pageable pageable) {

        // Verify webhook exists and belongs to tenant
        webhookService.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Webhook", "id", id));

        Page<WebhookDeliveryResponse> deliveries = deliveryRepository
                .findByWebhookIdOrderByCreatedAtDesc(id, pageable)
                .map(WebhookDeliveryResponse::fromEntity);

        return ResponseEntity.ok(deliveries);
    }

    /**
     * Retry a failed delivery.
     */
    @PostMapping("/deliveries/{deliveryId}/retry")
    @RequiresPermission(Permission.SYSTEM_ADMIN)
    @RequiresWebhookScope(WebhookScopes.WEBHOOK_DELIVERIES_RETRY)
    @Operation(summary = "Retry delivery", description = "Retry a failed webhook delivery")
    public ResponseEntity<WebhookDeliveryResponse> retryDelivery(@PathVariable UUID deliveryId) {
        WebhookDelivery delivery = deliveryRepository.findById(deliveryId)
                .orElseThrow(() -> new ResourceNotFoundException("WebhookDelivery", "id", deliveryId));

        // Verify webhook belongs to current tenant
        webhookService.findById(delivery.getWebhookId())
                .orElseThrow(() -> new ResourceNotFoundException("Webhook", "id", delivery.getWebhookId()));

        // Reset for retry
        delivery.setStatus(WebhookDelivery.DeliveryStatus.PENDING);
        delivery.setNextRetryAt(null);
        WebhookDelivery saved = deliveryRepository.save(delivery);

        log.info("Scheduled retry for delivery {}", deliveryId);
        return ResponseEntity.ok(WebhookDeliveryResponse.fromEntity(saved));
    }
}
