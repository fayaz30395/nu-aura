package com.hrms.domain.payroll;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import org.hibernate.annotations.SQLRestriction;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.util.UUID;

@SQLRestriction("is_deleted = false")
@Entity
@Table(name = "employee_payroll_records")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class EmployeePayrollRecord extends TenantAware {


    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "payroll_run_id", nullable = false)
    private GlobalPayrollRun payrollRun;

    @Column(name = "employee_id", nullable = false)
    private UUID employeeId;

    @Column(name = "employee_name")
    private String employeeName;

    @Column(name = "employee_number")
    private String employeeNumber;

    @Column(name = "location_id")
    private UUID locationId;

    @Column(name = "location_code")
    private String locationCode;

    @Column(name = "department_id")
    private UUID departmentId;

    @Column(name = "department_name")
    private String departmentName;

    // Local Currency Amounts
    @Column(name = "local_currency", length = 3, nullable = false)
    private String localCurrency;

    @Column(name = "base_salary_local", precision = 15, scale = 2)
    private BigDecimal baseSalaryLocal;

    @Column(name = "allowances_local", precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal allowancesLocal = BigDecimal.ZERO;

    @Column(name = "bonuses_local", precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal bonusesLocal = BigDecimal.ZERO;

    @Column(name = "overtime_local", precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal overtimeLocal = BigDecimal.ZERO;

    @Column(name = "gross_pay_local", precision = 15, scale = 2)
    private BigDecimal grossPayLocal;

    // Deductions in local currency
    @Column(name = "income_tax_local", precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal incomeTaxLocal = BigDecimal.ZERO;

    @Column(name = "social_security_local", precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal socialSecurityLocal = BigDecimal.ZERO;

    @Column(name = "other_deductions_local", precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal otherDeductionsLocal = BigDecimal.ZERO;

    @Column(name = "total_deductions_local", precision = 15, scale = 2)
    private BigDecimal totalDeductionsLocal;

    @Column(name = "net_pay_local", precision = 15, scale = 2)
    private BigDecimal netPayLocal;

    // Employer contributions
    @Column(name = "employer_social_security_local", precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal employerSocialSecurityLocal = BigDecimal.ZERO;

    @Column(name = "employer_other_contributions_local", precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal employerOtherContributionsLocal = BigDecimal.ZERO;

    @Column(name = "total_employer_cost_local", precision = 15, scale = 2)
    private BigDecimal totalEmployerCostLocal;

    // Exchange rate used
    @Column(name = "exchange_rate", precision = 18, scale = 8)
    private BigDecimal exchangeRate;

    @Column(name = "rate_date")
    private java.time.LocalDate rateDate;

    // Base Currency Amounts (for consolidation)
    @Column(name = "gross_pay_base", precision = 15, scale = 2)
    private BigDecimal grossPayBase;

    @Column(name = "total_deductions_base", precision = 15, scale = 2)
    private BigDecimal totalDeductionsBase;

    @Column(name = "net_pay_base", precision = 15, scale = 2)
    private BigDecimal netPayBase;

    @Column(name = "total_employer_cost_base", precision = 15, scale = 2)
    private BigDecimal totalEmployerCostBase;

    // Status
    @Enumerated(EnumType.STRING)
    @Column(name = "status")
    @Builder.Default
    private RecordStatus status = RecordStatus.PENDING;

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    @PrePersist
    @PreUpdate
    public void calculateTotals() {
        // Calculate gross pay
        grossPayLocal = baseSalaryLocal != null ? baseSalaryLocal : BigDecimal.ZERO;
        if (allowancesLocal != null) grossPayLocal = grossPayLocal.add(allowancesLocal);
        if (bonusesLocal != null) grossPayLocal = grossPayLocal.add(bonusesLocal);
        if (overtimeLocal != null) grossPayLocal = grossPayLocal.add(overtimeLocal);

        // Calculate total deductions
        totalDeductionsLocal = BigDecimal.ZERO;
        if (incomeTaxLocal != null) totalDeductionsLocal = totalDeductionsLocal.add(incomeTaxLocal);
        if (socialSecurityLocal != null) totalDeductionsLocal = totalDeductionsLocal.add(socialSecurityLocal);
        if (otherDeductionsLocal != null) totalDeductionsLocal = totalDeductionsLocal.add(otherDeductionsLocal);

        // Calculate net pay
        netPayLocal = grossPayLocal.subtract(totalDeductionsLocal);

        // Calculate employer cost
        totalEmployerCostLocal = grossPayLocal;
        if (employerSocialSecurityLocal != null) totalEmployerCostLocal = totalEmployerCostLocal.add(employerSocialSecurityLocal);
        if (employerOtherContributionsLocal != null) totalEmployerCostLocal = totalEmployerCostLocal.add(employerOtherContributionsLocal);

        // Convert to base currency if exchange rate is set
        if (exchangeRate != null && exchangeRate.compareTo(BigDecimal.ZERO) > 0) {
            grossPayBase = grossPayLocal.multiply(exchangeRate);
            totalDeductionsBase = totalDeductionsLocal.multiply(exchangeRate);
            netPayBase = netPayLocal.multiply(exchangeRate);
            totalEmployerCostBase = totalEmployerCostLocal.multiply(exchangeRate);
        }
    }

    public enum RecordStatus {
        PENDING,
        CALCULATED,
        APPROVED,
        PAID,
        ERROR,
        ON_HOLD
    }
}
