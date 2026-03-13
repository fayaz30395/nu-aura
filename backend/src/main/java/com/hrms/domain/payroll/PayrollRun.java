package com.hrms.domain.payroll;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

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

    public enum PayrollStatus {
        DRAFT,
        PROCESSING,
        PROCESSED,
        APPROVED,
        LOCKED
    }

    public void process(UUID processedBy) {
        if (this.status != PayrollStatus.DRAFT) {
            throw new IllegalStateException("Only draft payroll runs can be processed");
        }
        this.status = PayrollStatus.PROCESSED;
        this.processedBy = processedBy;
        this.processedAt = LocalDateTime.now();
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
}
