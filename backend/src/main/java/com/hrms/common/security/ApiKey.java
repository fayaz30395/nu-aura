package com.hrms.common.security;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

/**
 * Entity representing an API key for external integrations.
 */
@Entity
@Table(name = "api_keys", indexes = {
        @Index(name = "idx_api_keys_tenant", columnList = "tenantId"),
        @Index(name = "idx_api_keys_key_hash", columnList = "keyHash", unique = true),
        @Index(name = "idx_api_keys_active", columnList = "isActive")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class ApiKey extends TenantAware {

    @Column(nullable = false, length = 100)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "key_hash", nullable = false, unique = true)
    private String keyHash;

    @Column(name = "key_prefix", length = 10)
    private String keyPrefix;

    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(
            name = "api_key_scopes",
            joinColumns = @JoinColumn(name = "api_key_id")
    )
    @Column(name = "scope")
    @Builder.Default
    private Set<String> scopes = new HashSet<>();

    @Column(name = "is_active")
    @Builder.Default
    private Boolean isActive = true;

    @Column(name = "expires_at")
    private LocalDateTime expiresAt;

    @Column(name = "last_used_at")
    private LocalDateTime lastUsedAt;

    @Column(name = "last_used_ip", length = 50)
    private String lastUsedIp;

    @Column(name = "rate_limit")
    @Builder.Default
    private Integer rateLimit = 1000;

    @Column(name = "rate_limit_window_seconds")
    @Builder.Default
    private Integer rateLimitWindowSeconds = 3600;

    @Column(name = "created_by")
    private UUID createdBy;

    public boolean isExpired() {
        return expiresAt != null && expiresAt.isBefore(LocalDateTime.now());
    }

    public boolean isValid() {
        return isActive && !isExpired();
    }

    public boolean hasScope(String scope) {
        return scopes != null && (scopes.contains("*") || scopes.contains(scope));
    }

    public void recordUsage(String ip) {
        this.lastUsedAt = LocalDateTime.now();
        this.lastUsedIp = ip;
    }
}
