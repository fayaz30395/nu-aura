package com.hrms.api.overtime.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OvertimeRecordResponse {
    private UUID id;
    private UUID employeeId;
    private String employeeName;
    private String employeeCode;
    private LocalDate overtimeDate;
    private UUID shiftId;
    private String shiftName;
    private BigDecimal regularHours;
    private BigDecimal actualHours;
    private BigDecimal overtimeHours;
    private String overtimeType;
    private BigDecimal multiplier;
    private BigDecimal effectiveHours;
    private String status;
    private Boolean isPreApproved;
    private UUID approvedBy;
    private String approverName;
    private LocalDateTime approvedAt;
    private UUID rejectedBy;
    private String rejectorName;
    private LocalDateTime rejectedAt;
    private String rejectionReason;
    private UUID payrollRunId;
    private Boolean processedInPayroll;
    private LocalDateTime processedAt;
    private String notes;
    private Boolean autoCalculated;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
