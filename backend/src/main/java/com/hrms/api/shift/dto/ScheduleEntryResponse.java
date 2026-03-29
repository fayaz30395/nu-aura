package com.hrms.api.shift.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ScheduleEntryResponse {
    private UUID assignmentId;
    private UUID employeeId;
    private String employeeName;
    private String employeeCode;
    private UUID shiftId;
    private String shiftName;
    private String shiftCode;
    private String colorCode;
    private LocalTime startTime;
    private LocalTime endTime;
    private LocalDate date;
    private Boolean isNightShift;
    private Boolean isDayOff;
    private String assignmentType;
    private String status;
}
