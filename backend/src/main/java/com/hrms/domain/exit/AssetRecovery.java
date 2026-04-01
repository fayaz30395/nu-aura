package com.hrms.domain.exit;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import org.hibernate.annotations.Where;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Where(clause = "is_deleted = false")
@Entity
@Table(name = "asset_recoveries")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class AssetRecovery extends TenantAware {


    @Column(name = "exit_process_id", nullable = false)
    private UUID exitProcessId;

    @Column(name = "employee_id", nullable = false)
    private UUID employeeId;

    @Column(name = "asset_id")
    private UUID assetId;

    @Column(name = "asset_name", nullable = false)
    private String assetName;

    @Enumerated(EnumType.STRING)
    @Column(name = "asset_type", nullable = false)
    private AssetType assetType;

    @Column(name = "asset_tag")
    private String assetTag;

    @Column(name = "serial_number")
    private String serialNumber;

    @Column(name = "assigned_date")
    private LocalDate assignedDate;

    @Column(name = "expected_return_date")
    private LocalDate expectedReturnDate;

    @Column(name = "actual_return_date")
    private LocalDate actualReturnDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "status")
    @Builder.Default
    private RecoveryStatus status = RecoveryStatus.PENDING;

    @Enumerated(EnumType.STRING)
    @Column(name = "condition_on_return")
    private AssetCondition conditionOnReturn;

    @Column(name = "damage_description", columnDefinition = "TEXT")
    private String damageDescription;

    @Column(name = "deduction_amount", precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal deductionAmount = BigDecimal.ZERO;

    @Column(name = "recovered_by")
    private UUID recoveredBy;

    @Column(name = "verified_by")
    private UUID verifiedBy;

    @Column(name = "verification_date")
    private LocalDate verificationDate;

    @Column(name = "remarks", columnDefinition = "TEXT")
    private String remarks;

    @Column(name = "is_waived")
    @Builder.Default
    private Boolean isWaived = false;

    @Column(name = "waiver_reason")
    private String waiverReason;

    @Column(name = "waived_by")
    private UUID waivedBy;

    public enum AssetType {
        LAPTOP,
        DESKTOP,
        MOBILE_PHONE,
        TABLET,
        MONITOR,
        KEYBOARD_MOUSE,
        HEADSET,
        WEBCAM,
        ID_CARD,
        ACCESS_CARD,
        PARKING_CARD,
        KEYS,
        UNIFORM,
        SAFETY_EQUIPMENT,
        VEHICLE,
        CREDIT_CARD,
        SIM_CARD,
        FURNITURE,
        BOOKS_MATERIALS,
        OTHER
    }

    public enum RecoveryStatus {
        PENDING,
        RETURNED,
        DAMAGED,
        LOST,
        WAIVED,
        NOT_APPLICABLE
    }

    public enum AssetCondition {
        EXCELLENT,
        GOOD,
        FAIR,
        POOR,
        DAMAGED,
        NON_FUNCTIONAL
    }

    public boolean isRecovered() {
        return status == RecoveryStatus.RETURNED ||
               status == RecoveryStatus.WAIVED ||
               status == RecoveryStatus.NOT_APPLICABLE;
    }
}
