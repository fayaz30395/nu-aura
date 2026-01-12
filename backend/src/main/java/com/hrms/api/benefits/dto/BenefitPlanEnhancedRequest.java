package com.hrms.api.benefits.dto;

import com.hrms.domain.benefits.BenefitPlanEnhanced;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class BenefitPlanEnhancedRequest {

    @NotBlank(message = "Plan name is required")
    private String name;

    private String description;

    @NotNull(message = "Plan type is required")
    private BenefitPlanEnhanced.PlanType planType;

    @NotNull(message = "Plan category is required")
    private BenefitPlanEnhanced.PlanCategory category;

    // Provider details
    private String providerName;
    private String providerCode;
    private String policyNumber;

    // Coverage details
    private BigDecimal coverageAmount;
    private BigDecimal sumInsured;
    private BigDecimal premiumAmount;
    private BenefitPlanEnhanced.PremiumFrequency premiumFrequency;

    // Cost sharing
    private BigDecimal employerContribution;
    private BigDecimal employeeContribution;
    private BigDecimal employerContributionPercentage;
    private BigDecimal employeeContributionPercentage;

    // Eligibility
    private Integer waitingPeriodDays;
    private Integer minServiceMonths;
    private String eligibleGrades;
    private String eligibleDepartments;
    private Boolean dependentsCovered;
    private Integer maxDependents;

    // Health insurance specific
    private Boolean maternityBenefits;
    private BigDecimal maternityCoverage;
    private Boolean preExistingCovered;
    private Integer preExistingWaitingYears;
    private BigDecimal roomRentLimit;
    private BigDecimal copayPercentage;
    private BigDecimal deductibleAmount;
    private Boolean networkHospitalsOnly;

    // Wellness specific
    private BigDecimal annualWellnessAllowance;
    private Boolean gymMembershipIncluded;
    private Boolean mentalHealthSupport;
    private Integer counselingSessionsPerYear;

    // Retirement/Investment specific
    private BigDecimal employerMatchPercentage;
    private BigDecimal vestingPeriodYears;
    private BigDecimal maxContributionLimit;

    // Flexible benefits
    private Boolean isFlexible;
    private BigDecimal flexCreditsProvided;
    private String flexibleOptions;

    // Validity
    private LocalDate effectiveFrom;
    private LocalDate effectiveTo;
    private Boolean isActive = true;

    // COBRA support
    private Boolean cobraEligible;
    private Integer cobraContinuationMonths;
}
