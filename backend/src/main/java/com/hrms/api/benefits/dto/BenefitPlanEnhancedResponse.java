package com.hrms.api.benefits.dto;

import com.hrms.domain.benefits.BenefitPlanEnhanced;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class BenefitPlanEnhancedResponse {

    private UUID id;
    private String name;
    private String description;
    private BenefitPlanEnhanced.PlanType planType;
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
    private int waitingPeriodDays;
    private int minServiceMonths;
    private String eligibleGrades;
    private String eligibleDepartments;
    private boolean dependentsCovered;
    private int maxDependents;

    // Health insurance specific
    private boolean maternityBenefits;
    private BigDecimal maternityCoverage;
    private boolean preExistingCovered;
    private int preExistingWaitingYears;
    private BigDecimal roomRentLimit;
    private BigDecimal copayPercentage;
    private BigDecimal deductibleAmount;
    private boolean networkHospitalsOnly;

    // Wellness specific
    private BigDecimal annualWellnessAllowance;
    private boolean gymMembershipIncluded;
    private boolean mentalHealthSupport;
    private int counselingSessionsPerYear;

    // Retirement specific
    private BigDecimal employerMatchPercentage;
    private BigDecimal vestingPeriodYears;
    private BigDecimal maxContributionLimit;

    // Flexible benefits
    private boolean isFlexible;
    private BigDecimal flexCreditsProvided;
    private String flexibleOptions;

    // Validity
    private LocalDate effectiveFrom;
    private LocalDate effectiveTo;
    private boolean isActive;

    // COBRA support
    private boolean cobraEligible;
    private int cobraContinuationMonths;

    // Stats
    private long enrollmentCount;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static BenefitPlanEnhancedResponse from(BenefitPlanEnhanced plan) {
        return BenefitPlanEnhancedResponse.builder()
                .id(plan.getId())
                .name(plan.getName())
                .description(plan.getDescription())
                .planType(plan.getPlanType())
                .category(plan.getCategory())
                .providerName(plan.getProviderName())
                .providerCode(plan.getProviderCode())
                .policyNumber(plan.getPolicyNumber())
                .coverageAmount(plan.getCoverageAmount())
                .sumInsured(plan.getSumInsured())
                .premiumAmount(plan.getPremiumAmount())
                .premiumFrequency(plan.getPremiumFrequency())
                .employerContribution(plan.getEmployerContribution())
                .employeeContribution(plan.getEmployeeContribution())
                .employerContributionPercentage(plan.getEmployerContributionPercentage())
                .employeeContributionPercentage(plan.getEmployeeContributionPercentage())
                .waitingPeriodDays(plan.getWaitingPeriodDays())
                .minServiceMonths(plan.getMinServiceMonths())
                .eligibleGrades(plan.getEligibleGrades())
                .eligibleDepartments(plan.getEligibleDepartments())
                .dependentsCovered(plan.isDependentsCovered())
                .maxDependents(plan.getMaxDependents())
                .maternityBenefits(plan.isMaternityBenefits())
                .maternityCoverage(plan.getMaternityCoverage())
                .preExistingCovered(plan.isPreExistingCovered())
                .preExistingWaitingYears(plan.getPreExistingWaitingYears())
                .roomRentLimit(plan.getRoomRentLimit())
                .copayPercentage(plan.getCopayPercentage())
                .deductibleAmount(plan.getDeductibleAmount())
                .networkHospitalsOnly(plan.isNetworkHospitalsOnly())
                .annualWellnessAllowance(plan.getAnnualWellnessAllowance())
                .gymMembershipIncluded(plan.isGymMembershipIncluded())
                .mentalHealthSupport(plan.isMentalHealthSupport())
                .counselingSessionsPerYear(plan.getCounselingSessionsPerYear())
                .employerMatchPercentage(plan.getEmployerMatchPercentage())
                .vestingPeriodYears(plan.getVestingPeriodYears())
                .maxContributionLimit(plan.getMaxContributionLimit())
                .isFlexible(plan.isFlexible())
                .flexCreditsProvided(plan.getFlexCreditsProvided())
                .flexibleOptions(plan.getFlexibleOptions())
                .effectiveFrom(plan.getEffectiveFrom())
                .effectiveTo(plan.getEffectiveTo())
                .isActive(plan.isActive())
                .cobraEligible(plan.isCobraEligible())
                .cobraContinuationMonths(plan.getCobraContinuationMonths())
                .enrollmentCount(plan.getEnrollments() != null ? plan.getEnrollments().size() : 0)
                .createdAt(plan.getCreatedAt())
                .updatedAt(plan.getUpdatedAt())
                .build();
    }
}
