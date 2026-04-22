package com.hrms.domain.payroll;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import org.hibernate.annotations.SQLRestriction;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@SQLRestriction("is_deleted = false")
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
@SuperBuilder
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

    // ─── Statutory deduction columns (added in V5 migration) ──────────────

    @Column(name = "employee_pf", precision = 10, scale = 2)
    private BigDecimal employeePf;

    @Column(name = "employer_pf", precision = 10, scale = 2)
    private BigDecimal employerPf;

    @Column(name = "employee_esi", precision = 10, scale = 2)
    private BigDecimal employeeEsi;

    @Column(name = "employer_esi", precision = 10, scale = 2)
    private BigDecimal employerEsi;

    @Transient
    private BigDecimal statutoryProfessionalTax;

    @Column(name = "tds_monthly", precision = 10, scale = 2)
    private BigDecimal tdsMonthly;

    @Column(name = "statutory_calculated_at")
    private LocalDateTime statutoryCalculatedAt;

    public void calculateTotals() {
        this.grossSalary = basicSalary;
        if (hra != null) grossSalary = grossSalary.add(hra);
        if (conveyanceAllowance != null) grossSalary = grossSalary.add(conveyanceAllowance);
        if (medicalAllowance != null) grossSalary = grossSalary.add(medicalAllowance);
        if (specialAllowance != null) grossSalary = grossSalary.add(specialAllowance);
        if (otherAllowances != null) grossSalary = grossSalary.add(otherAllowances);

        // NEW-01 FIX: Pro-rata salary for mid-month joiners / partial attendance.
        // When both workingDays and presentDays are set and presentDays < workingDays,
        // scale gross salary proportionally: gross * (presentDays / workingDays).
        if (workingDays != null && presentDays != null
                && workingDays > 0 && presentDays < workingDays) {
            BigDecimal ratio = new BigDecimal(presentDays)
                    .divide(new BigDecimal(workingDays), 6, java.math.RoundingMode.HALF_UP);
            this.grossSalary = grossSalary.multiply(ratio)
                    .setScale(2, java.math.RoundingMode.HALF_UP);
        }

        this.totalDeductions = BigDecimal.ZERO;
        if (providentFund != null) totalDeductions = totalDeductions.add(providentFund);
        if (professionalTax != null) totalDeductions = totalDeductions.add(professionalTax);
        if (incomeTax != null) totalDeductions = totalDeductions.add(incomeTax);
        if (otherDeductions != null) totalDeductions = totalDeductions.add(otherDeductions);

        this.netSalary = grossSalary.subtract(totalDeductions);
    }
}
