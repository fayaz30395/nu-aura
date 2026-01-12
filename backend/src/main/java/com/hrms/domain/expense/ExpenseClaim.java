package com.hrms.domain.expense;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "expense_claims")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExpenseClaim extends TenantAware {

    @Column(name = "employee_id", nullable = false)
    private UUID employeeId;

    @Column(name = "claim_number", unique = true, length = 50)
    private String claimNumber;

    @Column(name = "claim_date", nullable = false)
    private LocalDate claimDate;

    @Column(nullable = false, length = 50)
    @Enumerated(EnumType.STRING)
    private ExpenseCategory category;

    @Column(nullable = false, length = 500)
    private String description;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal amount;

    @Column(length = 3)
    @Builder.Default
    private String currency = "USD";

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private ExpenseStatus status = ExpenseStatus.DRAFT;

    @Column(name = "receipt_url", length = 500)
    private String receiptUrl;

    @Column(name = "submitted_at")
    private LocalDateTime submittedAt;

    @Column(name = "approved_by")
    private UUID approvedBy;

    @Column(name = "approved_at")
    private LocalDateTime approvedAt;

    @Column(name = "rejected_by")
    private UUID rejectedBy;

    @Column(name = "rejected_at")
    private LocalDateTime rejectedAt;

    @Column(name = "rejection_reason", length = 500)
    private String rejectionReason;

    @Column(name = "payment_date")
    private LocalDate paymentDate;

    @Column(name = "payment_reference", length = 100)
    private String paymentReference;

    @Column(length = 1000)
    private String notes;

    public enum ExpenseStatus {
        DRAFT,
        SUBMITTED,
        PENDING_APPROVAL,
        APPROVED,
        REJECTED,
        PAID,
        CANCELLED
    }

    public enum ExpenseCategory {
        TRAVEL,
        ACCOMMODATION,
        MEALS,
        TRANSPORT,
        OFFICE_SUPPLIES,
        EQUIPMENT,
        SOFTWARE,
        TRAINING,
        MEDICAL,
        COMMUNICATION,
        ENTERTAINMENT,
        RELOCATION,
        OTHER
    }

    public void submit() {
        if (this.status != ExpenseStatus.DRAFT) {
            throw new IllegalStateException("Can only submit expense claims in DRAFT status");
        }
        this.status = ExpenseStatus.SUBMITTED;
        this.submittedAt = LocalDateTime.now();
    }

    public void approve(UUID approverId) {
        if (this.status != ExpenseStatus.SUBMITTED && this.status != ExpenseStatus.PENDING_APPROVAL) {
            throw new IllegalStateException("Can only approve submitted expense claims");
        }
        this.status = ExpenseStatus.APPROVED;
        this.approvedBy = approverId;
        this.approvedAt = LocalDateTime.now();
    }

    public void reject(UUID rejecterId, String reason) {
        if (this.status != ExpenseStatus.SUBMITTED && this.status != ExpenseStatus.PENDING_APPROVAL) {
            throw new IllegalStateException("Can only reject submitted expense claims");
        }
        this.status = ExpenseStatus.REJECTED;
        this.rejectedBy = rejecterId;
        this.rejectedAt = LocalDateTime.now();
        this.rejectionReason = reason;
    }

    public void markAsPaid(LocalDate paymentDate, String paymentReference) {
        if (this.status != ExpenseStatus.APPROVED) {
            throw new IllegalStateException("Can only mark approved expense claims as paid");
        }
        this.status = ExpenseStatus.PAID;
        this.paymentDate = paymentDate;
        this.paymentReference = paymentReference;
    }

    public void cancel() {
        if (this.status == ExpenseStatus.PAID) {
            throw new IllegalStateException("Cannot cancel paid expense claims");
        }
        this.status = ExpenseStatus.CANCELLED;
    }
}
