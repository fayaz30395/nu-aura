package com.hrms.domain.payroll;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import org.hibernate.annotations.Where;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Where(clause = "is_deleted = false")
@Entity
@Table(name = "salary_structures", indexes = {
        @Index(name = "idx_salary_employee", columnList = "employeeId"),
        @Index(name = "idx_salary_tenant", columnList = "tenantId"),
        @Index(name = "idx_salary_effective_date", columnList = "effectiveDate")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class SalaryStructure extends TenantAware {

    @Column(nullable = false)
    private UUID employeeId;

    @Column(nullable = false)
    private LocalDate effectiveDate;

    @Column
    private LocalDate endDate;

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

    @Column(precision = 12, scale = 2)
    private BigDecimal providentFund;

    @Column(precision = 12, scale = 2)
    private BigDecimal professionalTax;

    @Column(precision = 12, scale = 2)
    private BigDecimal incomeTax;

    @Column(precision = 12, scale = 2)
    private BigDecimal otherDeductions;

    @Column(nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    public BigDecimal getGrossSalary() {
        BigDecimal gross = basicSalary != null ? basicSalary : BigDecimal.ZERO;
        if (hra != null) gross = gross.add(hra);
        if (conveyanceAllowance != null) gross = gross.add(conveyanceAllowance);
        if (medicalAllowance != null) gross = gross.add(medicalAllowance);
        if (specialAllowance != null) gross = gross.add(specialAllowance);
        if (otherAllowances != null) gross = gross.add(otherAllowances);
        return gross;
    }

    public BigDecimal getTotalDeductions() {
        BigDecimal deductions = BigDecimal.ZERO;
        if (providentFund != null) deductions = deductions.add(providentFund);
        if (professionalTax != null) deductions = deductions.add(professionalTax);
        if (incomeTax != null) deductions = deductions.add(incomeTax);
        if (otherDeductions != null) deductions = deductions.add(otherDeductions);
        return deductions;
    }

    public BigDecimal getNetSalary() {
        return getGrossSalary().subtract(getTotalDeductions());
    }
}
