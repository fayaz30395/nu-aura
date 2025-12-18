package com.hrms.api.shift.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ShiftResponse {
    private UUID id;
    private String shiftCode;
    private String shiftName;
    private String description;
    private LocalTime startTime;
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
    private BigDecimal netWorkingHours;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
