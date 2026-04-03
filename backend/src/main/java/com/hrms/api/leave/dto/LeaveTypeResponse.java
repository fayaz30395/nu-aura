package com.hrms.api.leave.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.util.UUID;

@Data
public class LeaveTypeResponse {
    private UUID id;
    private String leaveCode;
    private String leaveName;
    private String description;
    private Boolean isPaid;
    private String colorCode;
    private BigDecimal annualQuota;
    private Integer maxConsecutiveDays;
    private Integer minDaysNotice;
    private Integer maxDaysPerRequest;
    private Boolean isCarryForwardAllowed;
    private BigDecimal maxCarryForwardDays;
    private Boolean isEncashable;
    private Boolean requiresDocument;
    private Integer applicableAfterDays;
    private String accrualType;
    private BigDecimal accrualRate;
    private String genderSpecific;
    private Boolean isActive;
}
