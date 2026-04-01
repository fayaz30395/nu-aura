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
@Table(name = "tax_declarations", indexes = {
        @Index(name = "idx_tax_decl_tenant", columnList = "tenant_id"),
        @Index(name = "idx_tax_decl_employee", columnList = "tenant_id,employee_id"),
        @Index(name = "idx_tax_decl_year", columnList = "tenant_id,financial_year"),
        @Index(name = "idx_tax_decl_status", columnList = "tenant_id,status")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class TaxDeclaration {

    @Id
    private UUID id;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(name = "employee_id", nullable = false)
    private UUID employeeId;

    @Column(name = "financial_year", nullable = false, length = 10)
    private String financialYear; // e.g., "2024-25"

    @Column(name = "tax_regime", nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private TaxRegimeType taxRegime;

    @Column(name = "status", nullable = false, length = 50)
    @Enumerated(EnumType.STRING)
    private DeclarationStatus status;

    // Section 80C - Investments (Max 1.5 Lakh)
    @Column(name = "sec_80c_ppf", precision = 15, scale = 2)
    private BigDecimal sec80cPpf;

    @Column(name = "sec_80c_epf", precision = 15, scale = 2)
    private BigDecimal sec80cEpf;

    @Column(name = "sec_80c_life_insurance", precision = 15, scale = 2)
    private BigDecimal sec80cLifeInsurance;

    @Column(name = "sec_80c_elss", precision = 15, scale = 2)
    private BigDecimal sec80cElss;

    @Column(name = "sec_80c_nsc", precision = 15, scale = 2)
    private BigDecimal sec80cNsc;

    @Column(name = "sec_80c_home_loan_principal", precision = 15, scale = 2)
    private BigDecimal sec80cHomeLoanPrincipal;

    @Column(name = "sec_80c_tuition_fees", precision = 15, scale = 2)
    private BigDecimal sec80cTuitionFees;

    @Column(name = "sec_80c_sukanya_samriddhi", precision = 15, scale = 2)
    private BigDecimal sec80cSukanyaSamriddhi;

    @Column(name = "sec_80c_nps_employee", precision = 15, scale = 2)
    private BigDecimal sec80cNpsEmployee;

    @Column(name = "sec_80c_total", precision = 15, scale = 2)
    private BigDecimal sec80cTotal;

    // Section 80CCD(1B) - Additional NPS (Max 50k)
    @Column(name = "sec_80ccd_1b_nps_additional", precision = 15, scale = 2)
    private BigDecimal sec80ccd1bNpsAdditional;

    // Section 80D - Health Insurance
    @Column(name = "sec_80d_self_family", precision = 15, scale = 2)
    private BigDecimal sec80dSelfFamily;

    @Column(name = "sec d_parents", precision = 15, scale = 2)
    private BigDecimal sec80dParents;

    @Column(name = "sec_80d_preventive_health", precision = 15, scale = 2)
    private BigDecimal sec80dPreventiveHealth;

    @Column(name = "sec_80d_total", precision = 15, scale = 2)
    private BigDecimal sec80dTotal;

    // Section 80E - Education Loan Interest
    @Column(name = "sec_80e_education_loan", precision = 15, scale = 2)
    private BigDecimal sec80eEducationLoan;

    // Section 80G - Donations
    @Column(name = "sec_80g_donations", precision = 15, scale = 2)
    private BigDecimal sec80gDonations;

    // Section 80GG - Rent Paid (if HRA not received)
    @Column(name = "sec_80gg_rent_paid", precision = 15, scale = 2)
    private BigDecimal sec80ggRentPaid;

    // Section 24 - Home Loan Interest
    @Column(name = "sec_24_home_loan_interest", precision = 15, scale = 2)
    private BigDecimal sec24HomeLoanInterest;

    // HRA Details
    @Column(name = "hra_metro_city")
    private Boolean hraMetroCity;

    @Column(name = "hra_rent_paid", precision = 15, scale = 2)
    private BigDecimal hraRentPaid;

    @Column(name = "hra_exemption", precision = 15, scale = 2)
    private BigDecimal hraExemption;

    // Other Income
    @Column(name = "other_income_interest", precision = 15, scale = 2)
    private BigDecimal otherIncomeInterest;

    @Column(name = "other_income_rental", precision = 15, scale = 2)
    private BigDecimal otherIncomeRental;

    @Column(name = "other_income_capital_gains", precision = 15, scale = 2)
    private BigDecimal otherIncomeCapitalGains;

    @Column(name = "other_income_total", precision = 15, scale = 2)
    private BigDecimal otherIncomeTotal;

    // Previous Employment Details
    @Column(name = "previous_employer_name", length = 255)
    private String previousEmployerName;

    @Column(name = "previous_employer_pan", length = 10)
    private String previousEmployerPan;

    @Column(name = "previous_employer_income", precision = 15, scale = 2)
    private BigDecimal previousEmployerIncome;

    @Column(name = "previous_employer_tax", precision = 15, scale = 2)
    private BigDecimal previousEmployerTax;

    // Calculated Fields
    @Column(name = "total_deductions", precision = 15, scale = 2)
    private BigDecimal totalDeductions;

    @Column(name = "taxable_income", precision = 15, scale = 2)
    private BigDecimal taxableIncome;

    @Column(name = "estimated_tax", precision = 15, scale = 2)
    private BigDecimal estimatedTax;

    // Approval Workflow
    @Column(name = "submitted_at")
    private LocalDateTime submittedAt;

    @Column(name = "approved_by")
    private UUID approvedBy;

    @Column(name = "approved_at")
    private LocalDateTime approvedAt;

    @Column(name = "rejected_by")
    private UUID rejectedBy;

    @Column(name = "rejected_at")
    private LocalDateTime rejectedAt;

    @Column(name = "rejection_reason", columnDefinition = "TEXT")
    private String rejectionReason;

    @Column(name = "locked_at")
    private LocalDateTime lockedAt; // After Form 16 generation

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public enum TaxRegimeType {
        OLD_REGIME,     // Old regime with deductions
        NEW_REGIME      // New regime without deductions (lower tax rates)
    }

    public enum DeclarationStatus {
        DRAFT,          // Employee is filling
        SUBMITTED,      // Submitted for review
        APPROVED,       // Approved by HR
        REJECTED,       // Rejected, needs revision
        LOCKED          // Locked for processing (Form 16 generated)
    }
}
