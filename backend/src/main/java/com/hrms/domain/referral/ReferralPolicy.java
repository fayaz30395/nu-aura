package com.hrms.domain.referral;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import org.hibernate.annotations.Where;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.util.UUID;

@Where(clause = "is_deleted = false")
@Entity
@Table(name = "referral_policies")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class ReferralPolicy extends TenantAware {


    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "applicable_for")
    private ApplicableFor applicableFor;

    @Column(name = "department_id")
    private UUID departmentId;

    @Column(name = "job_level")
    private String jobLevel;

    // Bonus Structure
    @Column(name = "base_bonus_amount", precision = 12, scale = 2)
    private BigDecimal baseBonusAmount;

    @Column(name = "joining_bonus_percentage", precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal joiningBonusPercentage = new BigDecimal("50");

    @Column(name = "retention_bonus_percentage", precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal retentionBonusPercentage = new BigDecimal("50");

    @Column(name = "retention_period_months")
    @Builder.Default
    private Integer retentionPeriodMonths = 6;

    // Eligibility
    @Column(name = "min_service_months")
    @Builder.Default
    private Integer minServiceMonths = 3;

    @Column(name = "probation_eligible")
    @Builder.Default
    private Boolean probationEligible = false;

    @Column(name = "max_referrals_per_month")
    private Integer maxReferralsPerMonth;

    @Column(name = "self_referral_allowed")
    @Builder.Default
    private Boolean selfReferralAllowed = false;

    @Column(name = "same_department_allowed")
    @Builder.Default
    private Boolean sameDepartmentAllowed = true;

    // Status
    @Column(name = "is_active")
    @Builder.Default
    private Boolean isActive = true;

    @Column(name = "effective_from")
    private java.time.LocalDate effectiveFrom;

    @Column(name = "effective_to")
    private java.time.LocalDate effectiveTo;

    public enum ApplicableFor {
        ALL,
        DEPARTMENT_SPECIFIC,
        LEVEL_SPECIFIC
    }
}
