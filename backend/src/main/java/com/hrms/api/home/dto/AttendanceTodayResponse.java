package com.hrms.api.home.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AttendanceTodayResponse {
    private UUID attendanceId;
    private UUID employeeId;
    private LocalDate date;
    private String status; // PRESENT, ABSENT, ON_LEAVE, HOLIDAY, WEEKLY_OFF, NOT_MARKED
    private LocalDateTime checkInTime;
    private LocalDateTime checkOutTime;
    private Double totalWorkHours;
    private boolean isCheckedIn;
    private boolean canCheckIn;
    private boolean canCheckOut;
    private String source; // WEB, MOBILE, BIOMETRIC
    private String location;
}
