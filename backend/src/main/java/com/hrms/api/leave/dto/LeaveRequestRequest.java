package com.hrms.api.leave.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Data
public class LeaveRequestRequest {
    @NotNull
    private UUID employeeId;
    
    @NotNull
    private UUID leaveTypeId;
    
    @NotNull
    private LocalDate startDate;
    
    @NotNull
    private LocalDate endDate;
    
    @NotNull
    private BigDecimal totalDays;
    
    private Boolean isHalfDay = false;
    private String halfDayPeriod;
    
    @NotNull
    private String reason;
    
    private String documentPath;
}
