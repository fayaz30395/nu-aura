package com.hrms.domain.expense;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import org.hibernate.annotations.Where;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Where(clause = "is_deleted = false")
@Entity
@Table(name = "mileage_logs", indexes = {
        @Index(name = "idx_mileage_log_tenant", columnList = "tenantId"),
        @Index(name = "idx_mileage_log_tenant_employee", columnList = "tenantId,employee_id"),
        @Index(name = "idx_mileage_log_status", columnList = "status"),
        @Index(name = "idx_mileage_log_tenant_status", columnList = "tenantId,status"),
        @Index(name = "idx_mileage_log_travel_date", columnList = "travel_date"),
        @Index(name = "idx_mileage_log_expense_claim", columnList = "expense_claim_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class MileageLog extends TenantAware {

    @Column(name = "employee_id", nullable = false)
    private UUID employeeId;

    @Column(name = "travel_date", nullable = false)
    private LocalDate travelDate;

    @Column(name = "from_location", nullable = false, length = 500)
    private String fromLocation;

    @Column(name = "to_location", nullable = false, length = 500)
    private String toLocation;

    @Column(name = "distance_km", nullable = false, precision = 8, scale = 2)
    private BigDecimal distanceKm;

    @Column(length = 1000)
    private String purpose;

    @Enumerated(EnumType.STRING)
    @Column(name = "vehicle_type", nullable = false, length = 30)
    @Builder.Default
    private VehicleType vehicleType = VehicleType.CAR;

    @Column(name = "rate_per_km", precision = 6, scale = 2)
    private BigDecimal ratePerKm;

    @Column(name = "reimbursement_amount", precision = 10, scale = 2)
    private BigDecimal reimbursementAmount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private MileageStatus status = MileageStatus.DRAFT;

    @Column(name = "expense_claim_id")
    private UUID expenseClaimId;

    @Column(name = "approved_by")
    private UUID approvedBy;

    @Column(name = "approved_at")
    private LocalDateTime approvedAt;

    @Column(name = "rejection_reason", length = 500)
    private String rejectionReason;

    @Column(length = 1000)
    private String notes;

    public void submit() {
        if (this.status != MileageStatus.DRAFT) {
            throw new IllegalStateException("Can only submit mileage logs in DRAFT status");
        }
        this.status = MileageStatus.SUBMITTED;
    }

    public void approve(UUID approverId) {
        if (this.status != MileageStatus.SUBMITTED) {
            throw new IllegalStateException("Can only approve submitted mileage logs");
        }
        this.status = MileageStatus.APPROVED;
        this.approvedBy = approverId;
        this.approvedAt = LocalDateTime.now();
    }

    public void reject(UUID rejecterId, String reason) {
        if (this.status != MileageStatus.SUBMITTED) {
            throw new IllegalStateException("Can only reject submitted mileage logs");
        }
        this.status = MileageStatus.REJECTED;
        this.approvedBy = rejecterId;
        this.approvedAt = LocalDateTime.now();
        this.rejectionReason = reason;
    }

    public enum VehicleType {
        CAR,
        MOTORCYCLE,
        BICYCLE,
        PUBLIC_TRANSPORT
    }

    public enum MileageStatus {
        DRAFT,
        SUBMITTED,
        APPROVED,
        REJECTED,
        PAID
    }
}
