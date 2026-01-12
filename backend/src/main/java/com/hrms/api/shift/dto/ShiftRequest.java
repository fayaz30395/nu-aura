package com.hrms.api.shift.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ShiftRequest {

    @NotBlank(message = "Shift code is required")
    private String shiftCode;

    @NotBlank(message = "Shift name is required")
    private String shiftName;

    private String description;

    @NotNull(message = "Start time is required")
    private LocalTime startTime;

    @NotNull(message = "End time is required")
    private LocalTime endTime;

    private Integer gracePeriodInMinutes;
    private Integer lateMarkAfterMinutes;
    private Integer halfDayAfterMinutes;
    private BigDecimal fullDayHours;
    private Integer breakDurationMinutes;
    private Boolean isNightShift;
    private String workingDays;
    private Boolean isActive;
    private String shiftType;
    private String colorCode;
    private Boolean allowsOvertime;
    private BigDecimal overtimeMultiplier;
}
