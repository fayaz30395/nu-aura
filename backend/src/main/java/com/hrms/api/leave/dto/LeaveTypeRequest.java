package com.hrms.api.leave.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class LeaveTypeRequest {
    @NotBlank
    private String leaveCode;

    @NotBlank
    private String leaveName;

    private String description;
    private Boolean isPaid = true;
    private String colorCode;
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
