package com.hrms.api.leave.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class LeaveTypeRequest {
    @NotBlank
    private String leaveCode;

    // BUG-QA2-001 FIX: Accept both "leaveName" (backend field) and "name" (spec/frontend alias).
    @NotBlank
    @JsonAlias("name")
    private String leaveName;

    private String description;
    private Boolean isPaid = true;
    private String colorCode;

    // BUG-QA2-001 FIX: Accept both "annualQuota" (backend field) and "maxDaysPerYear" (spec/frontend alias).
    @JsonAlias("maxDaysPerYear")
    private BigDecimal annualQuota;
    private Integer maxConsecutiveDays;
    private Integer minDaysNotice = 0;
    private Integer maxDaysPerRequest;
    private Boolean isCarryForwardAllowed = false;
    private BigDecimal maxCarryForwardDays;
    private Boolean isEncashable = false;
    private Boolean requiresDocument = false;
    private Integer applicableAfterDays = 0;
    private String accrualType;
    private BigDecimal accrualRate;
    private String genderSpecific;
    private Boolean isActive = true;
}
