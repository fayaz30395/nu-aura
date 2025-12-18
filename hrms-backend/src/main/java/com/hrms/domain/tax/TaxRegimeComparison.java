package com.hrms.domain.tax;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "tax_regime_comparisons", indexes = {
        @Index(name = "idx_tax_regime_tenant", columnList = "tenant_id"),
        @Index(name = "idx_tax_regime_employee", columnList = "tenant_id,employee_id"),
        @Index(name = "idx_tax_regime_year", columnList = "tenant_id,financial_year")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class TaxRegimeComparison {

    @Id
    private UUID id;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(name = "employee_id", nullable = false)
    private UUID employeeId;

    @Column(name = "financial_year", nullable = false, length = 10)
    private String financialYear;

    // Income Details
    @Column(name = "gross_salary", precision = 15, scale = 2)
    private BigDecimal grossSalary;

    @Column(name = "standard_deduction", precision = 15, scale = 2)
    private BigDecimal standardDeduction;

    // Old Regime Calculation
    @Column(name = "old_regime_total_deductions", precision = 15, scale = 2)
    private BigDecimal oldRegimeTotalDeductions;

    @Column(name = "old_regime_taxable_income", precision = 15, scale = 2)
    private BigDecimal oldRegimeTaxableIncome;

    @Column(name = "old_regime_tax", precision = 15, scale = 2)
    private BigDecimal oldRegimeTax;

    @Column(name = "old_regime_cess", precision = 15, scale = 2)
    private BigDecimal oldRegimeCess;

    @Column(name = "old_regime_total_tax", precision = 15, scale = 2)
    private BigDecimal oldRegimeTotalTax;

    // New Regime Calculation
    @Column(name = "new_regime_taxable_income", precision = 15, scale = 2)
    private BigDecimal newRegimeTaxableIncome;

    @Column(name = "new_regime_tax", precision = 15, scale = 2)
    private BigDecimal newRegimeTax;

    @Column(name = "new_regime_cess", precision = 15, scale = 2)
    private BigDecimal newRegimeCess;

    @Column(name = "new_regime_rebate", precision = 15, scale = 2)
    private BigDecimal newRegimeRebate;

    @Column(name = "new_regime_total_tax", precision = 15, scale = 2)
    private BigDecimal newRegimeTotalTax;

    // Comparison Results
    @Column(name = "tax_savings", precision = 15, scale = 2)
    private BigDecimal taxSavings; // Positive if old regime is better

    @Column(name = "recommended_regime", length = 20)
    @Enumerated(EnumType.STRING)
    private TaxDeclaration.TaxRegimeType recommendedRegime;

    @Column(name = "selected_regime", length = 20)
    @Enumerated(EnumType.STRING)
    private TaxDeclaration.TaxRegimeType selectedRegime;

    @Column(name = "calculation_details", columnDefinition = "TEXT")
    private String calculationDetails; // JSON with detailed breakdown

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
