package com.hrms.api.referral.dto;

import com.hrms.domain.referral.ReferralPolicy;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReferralPolicyRequest {

    @NotBlank(message = "Policy name is required")
    private String name;

    private String description;

    @NotNull(message = "Applicable for is required")
    private ReferralPolicy.ApplicableFor applicableFor;

    private UUID departmentId;
    private String jobLevel;

    @NotNull(message = "Base bonus amount is required")
    private BigDecimal baseBonusAmount;

    private BigDecimal joiningBonusPercentage;
    private BigDecimal retentionBonusPercentage;
    private Integer retentionPeriodMonths;

    private Integer minServiceMonths;
    private Boolean probationEligible;
    private Integer maxReferralsPerMonth;
    private Boolean selfReferralAllowed;
    private Boolean sameDepartmentAllowed;

    private LocalDate effectiveFrom;
    private LocalDate effectiveTo;
}
