package com.hrms.domain.benefits;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import org.hibernate.annotations.Where;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Enhanced Benefit Plan with comprehensive health insurance, wellness, and flexible benefits.
 */
@Where(clause = "is_deleted = false")
@Entity
@Table(name = "benefit_plans_enhanced")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class BenefitPlanEnhanced extends TenantAware {

    @Column(nullable = false)
    private String name;

    private String description;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private PlanType planType;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private PlanCategory category;

    // Provider details
    private String providerName;
    private String providerCode;
    private String policyNumber;

    // Coverage details
    private BigDecimal coverageAmount;
    private BigDecimal sumInsured;
    private BigDecimal premiumAmount;

    @Enumerated(EnumType.STRING)
    private PremiumFrequency premiumFrequency;

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

    // Retirement/Investment specific
    private BigDecimal employerMatchPercentage;
    private BigDecimal vestingPeriodYears;
    private BigDecimal maxContributionLimit;

    // Flexible benefits
    private boolean isFlexible;
    private BigDecimal flexCreditsProvided;
    private String flexibleOptions; // JSON array of options

    // Validity
    private LocalDate effectiveFrom;
    private LocalDate effectiveTo;
    private boolean isActive;

    // COBRA support (for US compliance)
    private boolean cobraEligible;
    private int cobraContinuationMonths;

    @OneToMany(mappedBy = "benefitPlan", cascade = CascadeType.ALL)
    @Builder.Default
    private List<BenefitEnrollment> enrollments = new ArrayList<>();

    // Audit fields (createdBy, createdAt, updatedAt, lastModifiedBy) inherited from BaseEntity

    public enum PlanType {
        HEALTH_INSURANCE,
        DENTAL_INSURANCE,
        VISION_INSURANCE,
        LIFE_INSURANCE,
        DISABILITY_INSURANCE,
        ACCIDENT_INSURANCE,
        CRITICAL_ILLNESS,
        RETIREMENT_401K,
        PENSION,
        PROVIDENT_FUND,
        GRATUITY,
        WELLNESS_ALLOWANCE,
        GYM_MEMBERSHIP,
        MENTAL_HEALTH,
        FLEXIBLE_SPENDING_ACCOUNT,
        HEALTH_SAVINGS_ACCOUNT,
        TRANSPORTATION,
        EDUCATION_ASSISTANCE,
        CHILDCARE,
        MEAL_ALLOWANCE,
        MOBILE_ALLOWANCE,
        WORK_FROM_HOME,
        STOCK_OPTIONS,
        ESOP,
        OTHER
    }

    public enum PlanCategory {
        HEALTH,
        INSURANCE,
        RETIREMENT,
        WELLNESS,
        LIFESTYLE,
        FINANCIAL,
        FAMILY,
        EDUCATION
    }

    public enum PremiumFrequency {
        MONTHLY,
        QUARTERLY,
        SEMI_ANNUALLY,
        ANNUALLY,
        ONE_TIME
    }

    @PrePersist
    protected void onCreate() {
        // Default initialization can be added here if needed
    }
}
