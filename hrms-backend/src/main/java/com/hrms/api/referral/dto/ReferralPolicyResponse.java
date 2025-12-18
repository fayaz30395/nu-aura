package com.hrms.api.referral.dto;

import com.hrms.domain.referral.ReferralPolicy;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReferralPolicyResponse {

    private UUID id;
    private String name;
    private String description;
    private ReferralPolicy.ApplicableFor applicableFor;
    private UUID departmentId;
    private String departmentName;
    private String jobLevel;

    private BigDecimal baseBonusAmount;
    private BigDecimal joiningBonusPercentage;
    private BigDecimal retentionBonusPercentage;
    private Integer retentionPeriodMonths;

    private Integer minServiceMonths;
    private Boolean probationEligible;
    private Integer maxReferralsPerMonth;
    private Boolean selfReferralAllowed;
    private Boolean sameDepartmentAllowed;

    private Boolean isActive;
    private LocalDate effectiveFrom;
    private LocalDate effectiveTo;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
