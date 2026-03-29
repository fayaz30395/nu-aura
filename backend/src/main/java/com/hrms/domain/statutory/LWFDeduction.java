package com.hrms.domain.statutory;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Records individual LWF deductions per employee per payroll period.
 *
 * <p>Each row represents one LWF deduction event tied to a specific employee
 * and payroll run. Status tracks the lifecycle from calculation through
 * deduction to government remittance.</p>
 */
@Entity
@Table(name = "lwf_deductions", indexes = {
        @Index(name = "idx_lwf_ded_tenant", columnList = "tenant_id"),
        @Index(name = "idx_lwf_ded_employee", columnList = "tenant_id, employee_id"),
        @Index(name = "idx_lwf_ded_payroll_run", columnList = "tenant_id, payroll_run_id"),
        @Index(name = "idx_lwf_ded_period", columnList = "tenant_id, deduction_month, deduction_year"),
        @Index(name = "idx_lwf_ded_state", columnList = "tenant_id, state_code")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LWFDeduction {

    @Id
    private UUID id;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(name = "employee_id", nullable = false)
    private UUID employeeId;

    @Column(name = "payroll_run_id")
    private UUID payrollRunId;

    @Column(name = "state_code", nullable = false, length = 5)
    private String stateCode;

    /**
     * Employee's LWF contribution amount (INR).
     */
    @Column(name = "employee_amount", nullable = false, precision = 10, scale = 2)
    private BigDecimal employeeAmount;

    /**
     * Employer's LWF contribution amount (INR).
     */
    @Column(name = "employer_amount", nullable = false, precision = 10, scale = 2)
    private BigDecimal employerAmount;

    @Enumerated(EnumType.STRING)
    @Column(name = "frequency", nullable = false, length = 20)
    private LWFConfiguration.LWFFrequency frequency;

    @Column(name = "deduction_month", nullable = false)
    private Integer deductionMonth;

    @Column(name = "deduction_year", nullable = false)
    private Integer deductionYear;

    /**
     * Lifecycle status of this deduction:
     * CALCULATED — computed but not yet applied to payslip.
     * DEDUCTED — applied to employee's payslip.
     * REMITTED — paid to government (LWF authority).
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private LWFDeductionStatus status = LWFDeductionStatus.CALCULATED;

    @Column(name = "gross_salary", precision = 12, scale = 2)
    private BigDecimal grossSalary;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public enum LWFDeductionStatus {
        CALCULATED,
        DEDUCTED,
        REMITTED
    }
}
