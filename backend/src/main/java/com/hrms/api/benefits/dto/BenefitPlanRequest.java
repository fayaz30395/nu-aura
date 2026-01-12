package com.hrms.api.benefits.dto;

import com.hrms.domain.benefits.BenefitPlan;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Data
public class BenefitPlanRequest {

    @NotBlank(message = "Plan code is required")
    private String planCode;

    @NotBlank(message = "Plan name is required")
    private String planName;

    private String description;

    @NotNull(message = "Benefit type is required")
    private BenefitPlan.BenefitType benefitType;

    private UUID providerId;

    private BigDecimal coverageAmount;

    private BigDecimal employeeContribution;

    private BigDecimal employerContribution;

    private LocalDate effectiveDate;

    private LocalDate expiryDate;

    private Boolean isActive;

    private String eligibilityCriteria;
}
