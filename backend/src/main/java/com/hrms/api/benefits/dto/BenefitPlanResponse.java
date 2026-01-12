package com.hrms.api.benefits.dto;

import com.hrms.domain.benefits.BenefitPlan;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class BenefitPlanResponse {

    private UUID id;
    private UUID tenantId;
    private String planCode;
    private String planName;
    private String description;
    private BenefitPlan.BenefitType benefitType;
    private UUID providerId;
    private String providerName;
    private BigDecimal coverageAmount;
    private BigDecimal employeeContribution;
    private BigDecimal employerContribution;
    private LocalDate effectiveDate;
    private LocalDate expiryDate;
    private Boolean isActive;
    private String eligibilityCriteria;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
