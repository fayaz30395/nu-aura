package com.hrms.domain.asset;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "assets")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Asset {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;
    @Column(name = "asset_code", nullable = false, length = 50)
    private String assetCode;
    @Column(name = "asset_name", nullable = false, length = 200)
    private String assetName;
    @Enumerated(EnumType.STRING)
    @Column(name = "category", length = 50)
    private AssetCategory category;
    @Column(name = "brand", length = 100)
    private String brand;
    @Column(name = "model", length = 100)
    private String model;
    @Column(name = "serial_number", length = 100)
    private String serialNumber;
    @Column(name = "purchase_date")
    private LocalDate purchaseDate;
    @Column(name = "purchase_cost", precision = 10, scale = 2)
    private BigDecimal purchaseCost;
    @Column(name = "current_value", precision = 10, scale = 2)
    private BigDecimal currentValue;
    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 20)
    private AssetStatus status = AssetStatus.AVAILABLE;
    @Column(name = "assigned_to")
    private UUID assignedTo;
    @Column(name = "location", length = 200)
    private String location;
    @Column(name = "warranty_expiry")
    private LocalDate warrantyExpiry;
    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;
    @CreationTimestamp
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    @Version
    private Long version;

    public enum AssetCategory {
        LAPTOP, DESKTOP, MONITOR, PHONE, TABLET, FURNITURE, VEHICLE, SOFTWARE_LICENSE, OTHER
    }

    public enum AssetStatus {
        AVAILABLE, ASSIGNED, IN_MAINTENANCE, RETIRED, LOST
    }
}
