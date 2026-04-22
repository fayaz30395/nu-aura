package com.hrms.domain.payroll;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import org.hibernate.annotations.SQLRestriction;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@SQLRestriction("is_deleted = false")
@Entity
@Table(name = "payroll_runs", indexes = {
        @Index(name = "idx_payroll_tenant_period", columnList = "tenantId,payPeriodMonth,payPeriodYear", unique = true),
        @Index(name = "idx_payroll_tenant", columnList = "tenantId"),
        @Index(name = "idx_payroll_status", columnList = "status")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class PayrollRun extends TenantAware {

    @Column(nullable = false)
    private Integer payPeriodMonth;

    @Column(nullable = false)
    private Integer payPeriodYear;

    @Column(nullable = false)
    private LocalDate payrollDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private PayrollStatus status = PayrollStatus.DRAFT;

    @Column
    private Integer totalEmployees;

    @Column
    private UUID processedBy;

    @Column
    private LocalDateTime processedAt;

    @Column
    private UUID approvedBy;

    @Column
    private LocalDateTime approvedAt;

    @Column(columnDefinition = "TEXT")
    private String remarks;

    /**
     * Transition DRAFT → PROCESSING.
     * Called synchronously by the controller before publishing the Kafka event.
     * Prevents duplicate submissions: a second POST while the run is PROCESSING
     * will hit the same state guard and throw.
     */
    public void markProcessing(UUID triggeredBy) {
        if (this.status != PayrollStatus.DRAFT) {
            throw new IllegalStateException(
                    "Payroll run cannot be submitted for processing in status: " + this.status);
        }
        this.status = PayrollStatus.PROCESSING;
        this.processedBy = triggeredBy;
    }

    /**
     * Transition PROCESSING → PROCESSED.
     * Called by the Kafka consumer after all employees have been computed.
     */
    public void process(UUID processedBy) {
        if (this.status != PayrollStatus.PROCESSING && this.status != PayrollStatus.DRAFT) {
            throw new IllegalStateException("Only DRAFT or PROCESSING payroll runs can be transitioned to PROCESSED");
        }
        this.status = PayrollStatus.PROCESSED;
        this.processedBy = processedBy;
        this.processedAt = LocalDateTime.now();
    }

    /**
     * Transition PROCESSING → DRAFT (rollback on failure).
     * Called by the Kafka consumer when an unrecoverable error occurs so that
     * the run can be resubmitted after the issue is resolved.
     */
    public void markFailed() {
        if (this.status != PayrollStatus.PROCESSING) {
            throw new IllegalStateException(
                    "Only PROCESSING payroll runs can be rolled back to DRAFT on failure");
        }
        this.status = PayrollStatus.DRAFT;
        this.processedBy = null;
    }

    public void approve(UUID approvedBy) {
        if (this.status != PayrollStatus.PROCESSED) {
            throw new IllegalStateException("Only processed payroll runs can be approved");
        }
        this.status = PayrollStatus.APPROVED;
        this.approvedBy = approvedBy;
        this.approvedAt = LocalDateTime.now();
    }

    public void lock() {
        if (this.status != PayrollStatus.APPROVED) {
            throw new IllegalStateException("Only approved payroll runs can be locked");
        }
        this.status = PayrollStatus.LOCKED;
    }

    public enum PayrollStatus {
        DRAFT,
        PROCESSING,
        PROCESSED,
        APPROVED,
        LOCKED
    }
}
