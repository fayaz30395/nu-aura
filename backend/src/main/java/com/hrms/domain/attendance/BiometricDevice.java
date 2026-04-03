package com.hrms.domain.attendance;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import org.hibernate.annotations.Where;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Represents a biometric device (fingerprint, face, iris, card reader)
 * registered for a tenant's attendance tracking.
 */
@Where(clause = "is_deleted = false")
@Entity
@Table(name = "biometric_devices", indexes = {
        @Index(name = "idx_biometric_device_tenant", columnList = "tenantId"),
        @Index(name = "idx_biometric_device_serial", columnList = "serialNumber"),
        @Index(name = "idx_biometric_device_active", columnList = "tenantId, isActive")
}, uniqueConstraints = {
        @UniqueConstraint(name = "uk_biometric_device_serial_tenant",
                columnNames = {"serialNumber", "tenantId"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class BiometricDevice extends TenantAware {

    @Column(name = "device_name", nullable = false, length = 200)
    private String deviceName;

    @Enumerated(EnumType.STRING)
    @Column(name = "device_type", nullable = false, length = 30)
    private DeviceType deviceType;

    @Column(name = "serial_number", nullable = false, length = 100)
    private String serialNumber;

    @Column(name = "location_id")
    private UUID locationId;

    @Column(name = "location_name", length = 200)
    private String locationName;

    @Column(name = "ip_address", length = 50)
    private String ipAddress;

    @Column(name = "manufacturer", length = 100)
    private String manufacturer;

    @Column(name = "model", length = 100)
    private String model;

    @Column(name = "firmware_version", length = 50)
    private String firmwareVersion;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @Column(name = "last_sync_at")
    private LocalDateTime lastSyncAt;

    @Column(name = "last_heartbeat_at")
    private LocalDateTime lastHeartbeatAt;

    @Column(name = "api_key_hash", length = 128)
    private String apiKeyHash;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    /**
     * Returns true if the device has communicated within the last 10 minutes.
     */
    public boolean isOnline() {
        if (lastHeartbeatAt == null) {
            return false;
        }
        return lastHeartbeatAt.isAfter(LocalDateTime.now().minusMinutes(10));
    }

    public void recordSync() {
        this.lastSyncAt = LocalDateTime.now();
    }

    public void recordHeartbeat() {
        this.lastHeartbeatAt = LocalDateTime.now();
    }

    public void deactivate() {
        this.isActive = false;
    }

    public void activate() {
        this.isActive = true;
    }

    public enum DeviceType {
        FINGERPRINT,
        FACE,
        IRIS,
        CARD,
        MULTI_MODAL
    }
}
