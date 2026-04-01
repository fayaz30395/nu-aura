package com.hrms.domain.payroll;

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
@Table(name = "global_payroll_runs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class GlobalPayrollRun extends TenantAware {


    @Column(name = "run_code", nullable = false)
    private String runCode;

    @Column(name = "description")
    private String description;

    @Column(name = "pay_period_start", nullable = false)
    private LocalDate payPeriodStart;

    @Column(name = "pay_period_end", nullable = false)
    private LocalDate payPeriodEnd;

    @Column(name = "payment_date")
    private LocalDate paymentDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    @Builder.Default
    private PayrollRunStatus status = PayrollRunStatus.DRAFT;

    // Aggregated amounts in base currency
    @Column(name = "total_gross_base", precision = 15, scale = 2)
    private BigDecimal totalGrossBase;

    @Column(name = "total_deductions_base", precision = 15, scale = 2)
    private BigDecimal totalDeductionsBase;

    @Column(name = "total_net_base", precision = 15, scale = 2)
    private BigDecimal totalNetBase;

    @Column(name = "total_employer_cost_base", precision = 15, scale = 2)
    private BigDecimal totalEmployerCostBase;

    @Column(name = "base_currency", length = 3)
    @Builder.Default
    private String baseCurrency = "USD";

    // Count
    @Column(name = "employee_count")
    private Integer employeeCount;

    @Column(name = "location_count")
    private Integer locationCount;

    // Processing
    @Column(name = "processed_at")
    private LocalDateTime processedAt;

    @Column(name = "processed_by")
    private UUID processedBy;

    @Column(name = "approved_at")
    private LocalDateTime approvedAt;

    @Column(name = "approved_by")
    private UUID approvedBy;

    @Column(name = "error_count")
    @Builder.Default
    private Integer errorCount = 0;

    @Column(name = "warning_count")
    @Builder.Default
    private Integer warningCount = 0;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    public enum PayrollRunStatus {
        DRAFT,
        PROCESSING,
        PENDING_APPROVAL,
        APPROVED,
        PAID,
        CANCELLED,
        ERROR
    }
}
