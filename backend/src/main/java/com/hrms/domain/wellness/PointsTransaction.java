package com.hrms.domain.wellness;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "wellness_points_transactions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class PointsTransaction extends TenantAware {


    @Column(name = "employee_id", nullable = false)
    private UUID employeeId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TransactionType transactionType;

    @Column(nullable = false)
    private Integer points;

    @Column(name = "balance_after")
    private Integer balanceAfter;

    @Column(nullable = false)
    private String description;

    @Column(name = "reference_type")
    private String referenceType; // CHALLENGE, HEALTH_LOG, REDEMPTION, BONUS

    @Column(name = "reference_id")
    private UUID referenceId;

    @Column(name = "transaction_at")
    private LocalDateTime transactionAt;

    public enum TransactionType {
        EARNED,
        REDEEMED,
        BONUS,
        EXPIRED,
        ADJUSTMENT
    }

    @PrePersist
    protected void onCreate() {
        transactionAt = LocalDateTime.now();
    }
}
