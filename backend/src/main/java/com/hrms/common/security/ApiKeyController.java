package com.hrms.common.security;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/**
 * Controller for managing API keys.
 */
@RestController
@RequestMapping("/api/v1/admin/api-keys")
@RequiredArgsConstructor
@Tag(name = "API Keys", description = "Manage API keys for external integrations")
public class ApiKeyController {

    private final ApiKeyService apiKeyService;

    @PostMapping
    @RequiresPermission(Permission.SYSTEM_ADMIN)
    @Operation(summary = "Create API key", description = "Create a new API key. The raw key is only shown once.")
    public ResponseEntity<ApiKeyCreationResponse> createApiKey(@Valid @RequestBody CreateApiKeyRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();
        UUID userId = SecurityContext.getCurrentUserId();

        ApiKeyService.ApiKeyCreationResult result = apiKeyService.createApiKey(
                request.name(),
                request.description(),
                request.scopes(),
                request.expiresAt(),
                tenantId,
                userId
        );

        return ResponseEntity.status(HttpStatus.CREATED).body(new ApiKeyCreationResponse(
                result.id(),
                result.rawKey(),
                result.apiKey().getName(),
                result.apiKey().getKeyPrefix(),
                result.apiKey().getScopes(),
                result.apiKey().getExpiresAt()
        ));
    }

    @GetMapping
    @RequiresPermission(Permission.SYSTEM_ADMIN)
    @Operation(summary = "List API keys", description = "Get all API keys for the current tenant")
    public ResponseEntity<List<ApiKeyResponse>> listApiKeys(
            @RequestParam(defaultValue = "false") boolean includeInactive) {
        UUID tenantId = TenantContext.getCurrentTenant();

        List<ApiKey> keys = includeInactive
                ? apiKeyService.getApiKeysByTenant(tenantId)
                : apiKeyService.getActiveApiKeysByTenant(tenantId);

        List<ApiKeyResponse> response = keys.stream()
                .map(this::toResponse)
                .toList();

        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{keyId}")
    @RequiresPermission(Permission.SYSTEM_ADMIN)
    @Operation(summary = "Revoke API key", description = "Revoke an API key (soft delete)")
    public ResponseEntity<Void> revokeApiKey(@PathVariable UUID keyId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        apiKeyService.revokeApiKey(keyId, tenantId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{keyId}/regenerate")
    @RequiresPermission(Permission.SYSTEM_ADMIN)
    @Operation(summary = "Regenerate API key", description = "Revoke old key and create a new one with same settings")
    public ResponseEntity<ApiKeyCreationResponse> regenerateApiKey(@PathVariable UUID keyId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        UUID userId = SecurityContext.getCurrentUserId();

        ApiKeyService.ApiKeyCreationResult result = apiKeyService.regenerateApiKey(keyId, tenantId, userId);

        return ResponseEntity.ok(new ApiKeyCreationResponse(
                result.id(),
                result.rawKey(),
                result.apiKey().getName(),
                result.apiKey().getKeyPrefix(),
                result.apiKey().getScopes(),
                result.apiKey().getExpiresAt()
        ));
    }

    @PutMapping("/{keyId}/scopes")
    @RequiresPermission(Permission.SYSTEM_ADMIN)
    @Operation(summary = "Update API key scopes", description = "Update the scopes for an existing API key")
    public ResponseEntity<ApiKeyResponse> updateScopes(
            @PathVariable UUID keyId,
            @Valid @RequestBody UpdateScopesRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();
        ApiKey updated = apiKeyService.updateScopes(keyId, tenantId, request.scopes());
        return ResponseEntity.ok(toResponse(updated));
    }

    @DeleteMapping("/{keyId}/permanent")
    @RequiresPermission(Permission.SYSTEM_ADMIN)
    @Operation(summary = "Permanently delete API key", description = "Permanently delete an API key")
    public ResponseEntity<Void> deleteApiKey(@PathVariable UUID keyId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        apiKeyService.deleteApiKey(keyId, tenantId);
        return ResponseEntity.noContent().build();
    }

    private ApiKeyResponse toResponse(ApiKey key) {
        return new ApiKeyResponse(
                key.getId(),
                key.getName(),
                key.getDescription(),
                key.getKeyPrefix() + "...",
                key.getScopes(),
                key.getIsActive(),
                key.getExpiresAt(),
                key.getLastUsedAt(),
                key.getLastUsedIp(),
                key.getCreatedAt()
        );
    }

    // Request/Response DTOs

    public record CreateApiKeyRequest(
            @NotBlank @Size(max = 100) String name,
            String description,
            Set<String> scopes,
            LocalDateTime expiresAt
    ) {
    }

    public record UpdateScopesRequest(
            Set<String> scopes
    ) {
    }

    public record ApiKeyCreationResponse(
            UUID id,
            String rawKey,
            String name,
            String keyPrefix,
            Set<String> scopes,
            LocalDateTime expiresAt
    ) {
    }

    public record ApiKeyResponse(
            UUID id,
            String name,
            String description,
            String maskedKey,
            Set<String> scopes,
            Boolean isActive,
            LocalDateTime expiresAt,
            LocalDateTime lastUsedAt,
            String lastUsedIp,
            LocalDateTime createdAt
    ) {
    }
}
