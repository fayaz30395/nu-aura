package com.hrms.api.leave.dto;

import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Data
public class LeaveBalanceResponse {
    private UUID id;
    private UUID employeeId;
    private UUID leaveTypeId;
    private String leaveTypeName;
    private Integer year;
    private BigDecimal openingBalance;
    private BigDecimal accrued;
    private BigDecimal used;
    private BigDecimal pending;
    private BigDecimal available;
    private BigDecimal carriedForward;
    private BigDecimal encashed;
    private BigDecimal lapsed;
    private LocalDate lastAccrualDate;
}
