package com.hrms.api.attendance.dto;

import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class AttendanceResponse {
    private UUID id;
    private UUID employeeId;
    private UUID shiftId;
    private LocalDate attendanceDate;
    private LocalDateTime checkInTime;
    private LocalDateTime checkOutTime;
    private String checkInSource;
    private String checkOutSource;
    private String status;
    private Integer workDurationMinutes;
    private Integer breakDurationMinutes;
    private Integer overtimeMinutes;
    private Boolean isLate;
    private Integer lateByMinutes;
    private Boolean isEarlyDeparture;
    private Integer earlyDepartureMinutes;
    private Boolean regularizationRequested;
    private Boolean regularizationApproved;
    private String regularizationReason;
}
