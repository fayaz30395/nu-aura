package com.hrms.domain.expense;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import org.hibernate.annotations.Where;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Expense advance — upfront money given to an employee before they incur expenses.
 * Must be settled (linked to expense claims) after the trip/event.
 */
@Where(clause = "is_deleted = false")
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

    public enum AdvanceStatus {
        REQUESTED,
        APPROVED,
        DISBURSED,
        SETTLED,
        CANCELLED
    }

    public void approve(UUID approverId) {
        if (this.status != AdvanceStatus.REQUESTED) {
            throw new IllegalStateException("Can only approve advances in REQUESTED status");
        }
        this.status = AdvanceStatus.APPROVED;
        this.approvedBy = approverId;
        this.approvedAt = LocalDateTime.now();
    }

    public void disburse() {
        if (this.status != AdvanceStatus.APPROVED) {
            throw new IllegalStateException("Can only disburse approved advances");
        }
        this.status = AdvanceStatus.DISBURSED;
        this.disbursedAt = LocalDateTime.now();
    }

    public void settle(UUID claimId) {
        if (this.status != AdvanceStatus.DISBURSED) {
            throw new IllegalStateException("Can only settle disbursed advances");
        }
        this.status = AdvanceStatus.SETTLED;
        this.settlementClaimId = claimId;
        this.settledAt = LocalDateTime.now();
    }

    public void cancel() {
        if (this.status == AdvanceStatus.SETTLED) {
            throw new IllegalStateException("Cannot cancel settled advances");
        }
        this.status = AdvanceStatus.CANCELLED;
    }
}
