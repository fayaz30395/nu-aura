package com.hrms.domain.payroll;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "payslips", indexes = {
    @Index(name = "idx_payslip_employee_period", columnList = "employeeId,payPeriodMonth,payPeriodYear", unique = true),
    @Index(name = "idx_payslip_tenant", columnList = "tenantId"),
    @Index(name = "idx_payslip_run", columnList = "payrollRunId"),
    @Index(name = "idx_payslip_employee", columnList = "employeeId")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Payslip extends TenantAware {

    @Column(nullable = false)
    private UUID payrollRunId;

    @Column(nullable = false)
    private UUID employeeId;

    @Column(nullable = false)
    private Integer payPeriodMonth;

    @Column(nullable = false)
    private Integer payPeriodYear;

    @Column(nullable = false)
    private LocalDate payDate;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal basicSalary;

    @Column(precision = 12, scale = 2)
    private BigDecimal hra;

    @Column(precision = 12, scale = 2)
    private BigDecimal conveyanceAllowance;

    @Column(precision = 12, scale = 2)
    private BigDecimal medicalAllowance;

    @Column(precision = 12, scale = 2)
    private BigDecimal specialAllowance;

    @Column(precision = 12, scale = 2)
    private BigDecimal otherAllowances;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal grossSalary;

    @Column(precision = 12, scale = 2)
    private BigDecimal providentFund;

    @Column(precision = 12, scale = 2)
    private BigDecimal professionalTax;

    @Column(precision = 12, scale = 2)
    private BigDecimal incomeTax;

    @Column(precision = 12, scale = 2)
    private BigDecimal otherDeductions;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal totalDeductions;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal netSalary;

    @Column
    private Integer workingDays;

    @Column
    private Integer presentDays;

    @Column
    private Integer leaveDays;

    @Column
    private UUID pdfFileId;

    public void calculateTotals() {
        this.grossSalary = basicSalary;
        if (hra != null) grossSalary = grossSalary.add(hra);
        if (conveyanceAllowance != null) grossSalary = grossSalary.add(conveyanceAllowance);
        if (medicalAllowance != null) grossSalary = grossSalary.add(medicalAllowance);
        if (specialAllowance != null) grossSalary = grossSalary.add(specialAllowance);
        if (otherAllowances != null) grossSalary = grossSalary.add(otherAllowances);

        this.totalDeductions = BigDecimal.ZERO;
        if (providentFund != null) totalDeductions = totalDeductions.add(providentFund);
        if (professionalTax != null) totalDeductions = totalDeductions.add(professionalTax);
        if (incomeTax != null) totalDeductions = totalDeductions.add(incomeTax);
        if (otherDeductions != null) totalDeductions = totalDeductions.add(otherDeductions);

        this.netSalary = grossSalary.subtract(totalDeductions);
    }
}
