package com.hrms.api.tax.dto;

import com.hrms.domain.tax.TaxDeclaration;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TaxDeclarationResponse {
    private UUID id;
    private UUID tenantId;
    private UUID employeeId;
    private String employeeName;
    private String financialYear;
    private TaxDeclaration.TaxRegimeType taxRegime;
    private TaxDeclaration.DeclarationStatus status;

    // Section 80C
    private BigDecimal sec80cTotal;
    private BigDecimal sec80ccd1bNpsAdditional;

    // Section 80D
    private BigDecimal sec80dTotal;

    // Other sections
    private BigDecimal sec80eEducationLoan;
    private BigDecimal sec80gDonations;
    private BigDecimal sec80ggRentPaid;
    private BigDecimal sec24HomeLoanInterest;
    private BigDecimal hraExemption;

    // Other income
    private BigDecimal otherIncomeTotal;

    // Previous employment
    private String previousEmployerName;
    private BigDecimal previousEmployerIncome;
    private BigDecimal previousEmployerTax;

    // Calculated fields
    private BigDecimal totalDeductions;
    private BigDecimal taxableIncome;
    private BigDecimal estimatedTax;

    // Workflow
    private LocalDateTime submittedAt;
    private UUID approvedBy;
    private String approvedByName;
    private LocalDateTime approvedAt;
    private UUID rejectedBy;
    private String rejectedByName;
    private LocalDateTime rejectedAt;
    private String rejectionReason;
    private LocalDateTime lockedAt;
    private String notes;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    private List<TaxProofResponse> proofs;
}
