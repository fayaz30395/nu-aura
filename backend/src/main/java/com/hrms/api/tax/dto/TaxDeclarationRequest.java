package com.hrms.api.tax.dto;

import com.hrms.domain.tax.TaxDeclaration;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TaxDeclarationRequest {
    private UUID employeeId;

    @NotBlank(message = "Financial year is required")
    @Pattern(regexp = "^\\d{4}-\\d{4}$", message = "Financial year must be in format YYYY-YYYY (e.g. 2025-2026)")
    private String financialYear;

    @NotNull(message = "Tax regime is required")
    private TaxDeclaration.TaxRegimeType taxRegime;

    // Section 80C fields
    @Min(value = 0, message = "Amount must be non-negative")
    private BigDecimal sec80cPpf;
    @Min(value = 0, message = "Amount must be non-negative")
    private BigDecimal sec80cEpf;
    @Min(value = 0, message = "Amount must be non-negative")
    private BigDecimal sec80cLifeInsurance;
    @Min(value = 0, message = "Amount must be non-negative")
    private BigDecimal sec80cElss;
    @Min(value = 0, message = "Amount must be non-negative")
    private BigDecimal sec80cNsc;
    @Min(value = 0, message = "Amount must be non-negative")
    private BigDecimal sec80cHomeLoanPrincipal;
    @Min(value = 0, message = "Amount must be non-negative")
    private BigDecimal sec80cTuitionFees;
    @Min(value = 0, message = "Amount must be non-negative")
    private BigDecimal sec80cSukanyaSamriddhi;
    @Min(value = 0, message = "Amount must be non-negative")
    private BigDecimal sec80cNpsEmployee;

    // Other deductions
    @Min(value = 0, message = "Amount must be non-negative")
    private BigDecimal sec80ccd1bNpsAdditional;
    @Min(value = 0, message = "Amount must be non-negative")
    private BigDecimal sec80dSelfFamily;
    @Min(value = 0, message = "Amount must be non-negative")
    private BigDecimal sec80dParents;
    @Min(value = 0, message = "Amount must be non-negative")
    private BigDecimal sec80dPreventiveHealth;
    @Min(value = 0, message = "Amount must be non-negative")
    private BigDecimal sec80eEducationLoan;
    @Min(value = 0, message = "Amount must be non-negative")
    private BigDecimal sec80gDonations;
    @Min(value = 0, message = "Amount must be non-negative")
    private BigDecimal sec80ggRentPaid;
    @Min(value = 0, message = "Amount must be non-negative")
    private BigDecimal sec24HomeLoanInterest;

    // HRA
    private Boolean hraMetroCity;
    @Min(value = 0, message = "Amount must be non-negative")
    private BigDecimal hraRentPaid;

    // Other income
    @Min(value = 0, message = "Amount must be non-negative")
    private BigDecimal otherIncomeInterest;
    @Min(value = 0, message = "Amount must be non-negative")
    private BigDecimal otherIncomeRental;
    private BigDecimal otherIncomeCapitalGains;

    // Previous employment
    @Size(max = 200, message = "Previous employer name must not exceed 200 characters")
    private String previousEmployerName;
    @Pattern(regexp = "^$|^[A-Z]{5}[0-9]{4}[A-Z]$", message = "PAN must be in valid format (e.g. ABCDE1234F)")
    private String previousEmployerPan;
    @Min(value = 0, message = "Amount must be non-negative")
    private BigDecimal previousEmployerIncome;
    @Min(value = 0, message = "Amount must be non-negative")
    private BigDecimal previousEmployerTax;

    @Size(max = 2000, message = "Notes must not exceed 2000 characters")
    private String notes;
}
