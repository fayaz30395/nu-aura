package com.hrms.common.security;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.*;

/**
 * Service for managing API keys for external integrations.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ApiKeyService {

    private final ApiKeyRepository apiKeyRepository;
    private final PasswordEncoder passwordEncoder;

    private static final String API_KEY_PREFIX = "hrms_";
    private static final int API_KEY_LENGTH = 32;
    private static final SecureRandom secureRandom = new SecureRandom();

    /**
     * Generate a new API key.
     * Returns the raw key only once - it cannot be retrieved later.
     */
    @Transactional
    public ApiKeyCreationResult createApiKey(String name, String description,
                                              Set<String> scopes, LocalDateTime expiresAt,
                                              UUID tenantId, UUID createdBy) {
        String rawKey = generateRawKey();
        String keyHash = passwordEncoder.encode(rawKey);
        String keyPrefix = rawKey.substring(0, 8);

        ApiKey apiKey = ApiKey.builder()
                .name(name)
                .description(description)
                .keyHash(keyHash)
                .keyPrefix(keyPrefix)
                .scopes(scopes != null ? scopes : new HashSet<>())
                .expiresAt(expiresAt)
                .createdBy(createdBy)
                .isActive(true)
                .build();
        apiKey.setTenantId(tenantId);

        ApiKey saved = apiKeyRepository.save(apiKey);
        log.info("Created new API key '{}' for tenant {}", name, tenantId);

        return new ApiKeyCreationResult(saved.getId(), API_KEY_PREFIX + rawKey, saved);
    }

    /**
     * Validate an API key and return the associated ApiKey entity if valid.
     */
    @Transactional
    public Optional<ApiKey> validateApiKey(String rawKey, String clientIp) {
        if (rawKey == null || !rawKey.startsWith(API_KEY_PREFIX)) {
            return Optional.empty();
        }

        String keyWithoutPrefix = rawKey.substring(API_KEY_PREFIX.length());

        // Find all active API keys and check which one matches
        List<ApiKey> allKeys = apiKeyRepository.findAll();
        for (ApiKey apiKey : allKeys) {
            if (apiKey.isValid() && passwordEncoder.matches(keyWithoutPrefix, apiKey.getKeyHash())) {
                apiKey.recordUsage(clientIp);
                apiKeyRepository.save(apiKey);
                return Optional.of(apiKey);
            }
        }

        return Optional.empty();
    }

    /**
     * Get all API keys for a tenant.
     */
    @Transactional(readOnly = true)
    public List<ApiKey> getApiKeysByTenant(UUID tenantId) {
        return apiKeyRepository.findByTenantId(tenantId);
    }

    /**
     * Get active API keys for a tenant.
     */
    @Transactional(readOnly = true)
    public List<ApiKey> getActiveApiKeysByTenant(UUID tenantId) {
        return apiKeyRepository.findByTenantIdAndIsActiveTrue(tenantId);
    }

    /**
     * Revoke an API key.
     */
    @Transactional
    public void revokeApiKey(UUID keyId, UUID tenantId) {
        ApiKey apiKey = apiKeyRepository.findByIdAndTenantId(keyId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("API key not found"));

        apiKey.setIsActive(false);
        apiKeyRepository.save(apiKey);
        log.info("Revoked API key '{}' for tenant {}", apiKey.getName(), tenantId);
    }

    /**
     * Update API key scopes.
     */
    @Transactional
    public ApiKey updateScopes(UUID keyId, UUID tenantId, Set<String> newScopes) {
        ApiKey apiKey = apiKeyRepository.findByIdAndTenantId(keyId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("API key not found"));

        apiKey.setScopes(newScopes);
        return apiKeyRepository.save(apiKey);
    }

    /**
     * Regenerate an API key (revokes old one, creates new one with same settings).
     */
    @Transactional
    public ApiKeyCreationResult regenerateApiKey(UUID keyId, UUID tenantId, UUID userId) {
        ApiKey oldKey = apiKeyRepository.findByIdAndTenantId(keyId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("API key not found"));

        // Revoke old key
        oldKey.setIsActive(false);
        apiKeyRepository.save(oldKey);

        // Create new key with same settings
        return createApiKey(
                oldKey.getName(),
                oldKey.getDescription(),
                oldKey.getScopes(),
                oldKey.getExpiresAt(),
                tenantId,
                userId
        );
    }

    /**
     * Delete an API key permanently.
     */
    @Transactional
    public void deleteApiKey(UUID keyId, UUID tenantId) {
        ApiKey apiKey = apiKeyRepository.findByIdAndTenantId(keyId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("API key not found"));

        apiKeyRepository.delete(apiKey);
        log.info("Deleted API key '{}' for tenant {}", apiKey.getName(), tenantId);
    }

    private String generateRawKey() {
        byte[] bytes = new byte[API_KEY_LENGTH];
        secureRandom.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    /**
     * Result of API key creation containing the raw key (shown only once).
     */
    public record ApiKeyCreationResult(UUID id, String rawKey, ApiKey apiKey) {}
}
