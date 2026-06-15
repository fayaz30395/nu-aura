package com.nulogic.domain.expense;

import com.nulogic.common.entity.TenantAware;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.SQLRestriction;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Expense advance — upfront money given to an employee before they incur expenses.
 * Must be settled (linked to expense claims) after the trip/event.
 */
@SQLRestriction("is_deleted = false")
@Entity
@Table(name = "expense_advances", indexes = {
        @Index(name = "idx_expense_adv_tenant", columnList = "tenantId"),
        @Index(name = "idx_expense_adv_tenant_employee", columnList = "tenantId,employee_id"),
        @Index(name = "idx_expense_adv_status", columnList = "status")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class ExpenseAdvance extends TenantAware {

    @Column(name = "employee_id", nullable = false)
    private UUID employeeId;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;

    @Column(length = 3)
    @Builder.Default
    private String currency = "INR";

    @Column(nullable = false, length = 500)
    private String purpose;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private AdvanceStatus status = AdvanceStatus.REQUESTED;

    @Column(name = "requested_at")
    private LocalDateTime requestedAt;

    @Column(name = "approved_by")
    private UUID approvedBy;

    @Column(name = "approved_at")
    private LocalDateTime approvedAt;

    @Column(name = "disbursed_at")
    private LocalDateTime disbursedAt;

    @Column(name = "settled_at")
    private LocalDateTime settledAt;

    @Column(name = "settlement_claim_id")
    private UUID settlementClaimId;

    @Column(length = 1000)
    private String notes;

    public void approve(UUID approverId, LocalDateTime now) {
        if (this.status != AdvanceStatus.REQUESTED) {
            throw new IllegalStateException("Can only approve advances in REQUESTED status");
        }
        this.status = AdvanceStatus.APPROVED;
        this.approvedBy = approverId;
        this.approvedAt = now;
    }

    public void disburse(LocalDateTime now) {
        if (this.status != AdvanceStatus.APPROVED) {
            throw new IllegalStateException("Can only disburse approved advances");
        }
        this.status = AdvanceStatus.DISBURSED;
        this.disbursedAt = now;
    }

    public void settle(UUID claimId, LocalDateTime now) {
        if (this.status != AdvanceStatus.DISBURSED) {
            throw new IllegalStateException("Can only settle disbursed advances");
        }
        this.status = AdvanceStatus.SETTLED;
        this.settlementClaimId = claimId;
        this.settledAt = now;
    }

    public void cancel() {
        if (this.status == AdvanceStatus.SETTLED) {
            throw new IllegalStateException("Cannot cancel settled advances");
        }
        this.status = AdvanceStatus.CANCELLED;
    }

    public enum AdvanceStatus {
        REQUESTED,
        APPROVED,
        DISBURSED,
        SETTLED,
        CANCELLED
    }
}
