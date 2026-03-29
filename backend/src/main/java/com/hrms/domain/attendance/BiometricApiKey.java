package com.hrms.domain.attendance;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * API keys for biometric device authentication.
 * Devices use API key auth (not JWT) since they cannot perform OAuth flows.
 */
@Entity
@Table(name = "biometric_api_keys", indexes = {
    @Index(name = "idx_biometric_api_key_tenant", columnList = "tenantId"),
    @Index(name = "idx_biometric_api_key_hash", columnList = "keyHash"),
    @Index(name = "idx_biometric_api_key_device", columnList = "deviceId")
}, uniqueConstraints = {
    @UniqueConstraint(name = "uk_biometric_api_key_hash", columnNames = {"keyHash"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class BiometricApiKey extends TenantAware {

    @Column(name = "key_name", nullable = false, length = 200)
    private String keyName;

    /**
     * SHA-256 hash of the API key. The plaintext key is only shown once at creation time.
     */
    @Column(name = "key_hash", nullable = false, length = 128)
    private String keyHash;

    /**
     * Last 4 characters of the key for display/identification purposes.
     */
    @Column(name = "key_suffix", length = 8)
    private String keySuffix;

    @Column(name = "device_id")
    private UUID deviceId;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @Column(name = "expires_at")
    private LocalDateTime expiresAt;

    @Column(name = "last_used_at")
    private LocalDateTime lastUsedAt;

    public boolean isExpired() {
        return expiresAt != null && expiresAt.isBefore(LocalDateTime.now());
    }

    public boolean isValid() {
        return isActive && !isExpired() && !isDeleted();
    }

    public void recordUsage() {
        this.lastUsedAt = LocalDateTime.now();
    }

    public void revoke() {
        this.isActive = false;
    }
}
