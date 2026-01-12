package com.hrms.api.overtime.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OvertimeRecordRequest {

    @NotNull(message = "Employee ID is required")
    private UUID employeeId;

    @NotNull(message = "Overtime date is required")
    private LocalDate overtimeDate;

    private UUID shiftId;

    @NotNull(message = "Regular hours is required")
    private BigDecimal regularHours;

    @NotNull(message = "Actual hours is required")
    private BigDecimal actualHours;

    @NotNull(message = "Overtime hours is required")
    private BigDecimal overtimeHours;

    @NotNull(message = "Overtime type is required")
    private String overtimeType;

    private String notes;
    private Boolean isPreApproved;
}
