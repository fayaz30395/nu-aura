package com.hrms.api.tax.dto;

import com.hrms.domain.tax.TaxDeclaration;
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
    private String financialYear;
    private TaxDeclaration.TaxRegimeType taxRegime;

    // Section 80C fields
    private BigDecimal sec80cPpf;
    private BigDecimal sec80cEpf;
    private BigDecimal sec80cLifeInsurance;
    private BigDecimal sec80cElss;
    private BigDecimal sec80cNsc;
    private BigDecimal sec80cHomeLoanPrincipal;
    private BigDecimal sec80cTuitionFees;
    private BigDecimal sec80cSukanyaSamriddhi;
    private BigDecimal sec80cNpsEmployee;

    // Other deductions
    private BigDecimal sec80ccd1bNpsAdditional;
    private BigDecimal sec80dSelfFamily;
    private BigDecimal sec80dParents;
    private BigDecimal sec80dPreventiveHealth;
    private BigDecimal sec80eEducationLoan;
    private BigDecimal sec80gDonations;
    private BigDecimal sec80ggRentPaid;
    private BigDecimal sec24HomeLoanInterest;

    // HRA
    private Boolean hraMetroCity;
    private BigDecimal hraRentPaid;

    // Other income
    private BigDecimal otherIncomeInterest;
    private BigDecimal otherIncomeRental;
    private BigDecimal otherIncomeCapitalGains;

    // Previous employment
    private String previousEmployerName;
    private String previousEmployerPan;
    private BigDecimal previousEmployerIncome;
    private BigDecimal previousEmployerTax;

    private String notes;
}
