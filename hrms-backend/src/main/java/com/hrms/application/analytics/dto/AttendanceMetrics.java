package com.hrms.application.analytics.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;

/**
 * Attendance-related metrics DTO.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AttendanceMetrics {
    private LocalDate date;
    private long presentCount;
    private long absentCount;
    private double attendanceRate;
    private long lateArrivals;
    private List<DailyAttendance> weeklyTrend;
}
