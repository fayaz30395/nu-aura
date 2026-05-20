package com.nulogic.domain.attendance;

import com.nulogic.common.entity.TenantAware;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.SQLRestriction;
import org.hibernate.annotations.Where;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * API keys for biometric device authentication.
 * Devices use API key auth (not JWT) since they cannot perform OAuth flows.
 */
@Where(clause = "is_deleted = false")
@Entity
@SQLRestriction("is_deleted = false")
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
        // JVM-local: API-key expiry; tenant-zone risk bounded to clock-skew, and expiresAt is server-set.
        return expiresAt != null && expiresAt.isBefore(LocalDateTime.now()); // JVM-local: entity-layer; push to service per docs/architecture/tenant-time-wave-13-summary.md if cross-region zone correctness is needed
    }

    public boolean isValid() {
        return isActive && !isExpired() && !isDeleted();
    }

    public void recordUsage() {
        this.lastUsedAt = LocalDateTime.now(); // JVM-local: server reception stamp
    }

    public void revoke() {
        this.isActive = false;
    }
}
