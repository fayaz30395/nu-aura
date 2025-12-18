package com.hrms.api.tax.dto;

import com.hrms.domain.tax.TaxDeclaration;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TaxRegimeComparisonResponse {
    private UUID id;
    private UUID tenantId;
    private UUID employeeId;
    private String employeeName;
    private String financialYear;
    private BigDecimal grossSalary;

    // Old Regime
    private BigDecimal oldRegimeTotalDeductions;
    private BigDecimal oldRegimeTaxableIncome;
    private BigDecimal oldRegimeTotalTax;

    // New Regime
    private BigDecimal newRegimeTaxableIncome;
    private BigDecimal newRegimeTotalTax;

    // Comparison
    private BigDecimal taxSavings;
    private TaxDeclaration.TaxRegimeType recommendedRegime;
    private TaxDeclaration.TaxRegimeType selectedRegime;
    private String calculationDetails;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
