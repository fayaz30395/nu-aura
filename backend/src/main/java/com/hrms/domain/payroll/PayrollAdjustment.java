package com.hrms.domain.payroll;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/**
 * One-time payroll adjustment created by cross-module events.
 * Picked up during payroll processing to add/deduct from the next payslip.
 *
 * Examples: overtime earnings, expense reimbursements, LOP deductions,
 * performance-linked increments, mileage reimbursements.
 */
@Entity
@Table(name = "payroll_adjustments", indexes = {
    @Index(name = "idx_pa_tenant_employee", columnList = "tenantId, employee_id"),
    @Index(name = "idx_pa_tenant_status", columnList = "tenantId, status"),
    @Index(name = "idx_pa_effective_date", columnList = "effective_date")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class PayrollAdjustment extends TenantAware {

    @Column(name = "employee_id", nullable = false)
    private UUID employeeId;

    @Enumerated(EnumType.STRING)
    @Column(name = "adjustment_type", nullable = false, length = 30)
    private AdjustmentType adjustmentType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private AdjustmentCategory category = AdjustmentCategory.EARNING;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;

    @Column(length = 3)
    @Builder.Default
    private String currency = "INR";

    @Column(nullable = false, length = 500)
    private String description;

    @Column(name = "source_module", nullable = false, length = 50)
    private String sourceModule;

    @Column(name = "source_id")
    private UUID sourceId;

    @Column(name = "effective_date", nullable = false)
    private LocalDate effectiveDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private AdjustmentStatus status = AdjustmentStatus.PENDING;

    @Column(name = "payroll_run_id")
    private UUID payrollRunId;

    @Column(name = "processed_at")
    private java.time.LocalDateTime processedAt;

    public enum AdjustmentType {
        OVERTIME_EARNING,
        EXPENSE_REIMBURSEMENT,
        LOP_DEDUCTION,
        MILEAGE_REIMBURSEMENT,
        PERFORMANCE_INCREMENT,
        BONUS,
        OTHER
    }

    public enum AdjustmentCategory {
        EARNING,
        DEDUCTION
    }

    public enum AdjustmentStatus {
        PENDING,
        PROCESSED,
        CANCELLED
    }

    public void markProcessed(UUID payrollRunId) {
        this.status = AdjustmentStatus.PROCESSED;
        this.payrollRunId = payrollRunId;
        this.processedAt = java.time.LocalDateTime.now();
    }
}
