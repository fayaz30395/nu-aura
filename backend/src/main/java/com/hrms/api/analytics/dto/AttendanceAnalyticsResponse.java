package com.hrms.api.analytics.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AttendanceAnalyticsResponse {

    // Overall Attendance Metrics
    private Double averageAttendanceRate;
    private Double averagePunctualityRate;
    private Integer totalWorkingDays;
    private Integer totalPresentDays;
    private Integer totalAbsentDays;
    private Integer totalLateDays;
    private Integer totalHalfDays;

    // Today's Snapshot
    private Integer presentToday;
    private Integer absentToday;
    private Integer onLeaveToday;
    private Integer lateToday;
    private Integer workFromHomeToday;

    // Leave Analytics
    private Integer totalLeavesTaken;
    private Double averageLeavesPerEmployee;
    private Map<String, Integer> leavesByType;
    private Map<String, Double> leaveUtilizationByType;
    private Double sickLeaveRate;
    private Integer unplannedLeaves;
    private Double unplannedLeavePercentage;

    // Department-wise Attendance
    private Map<String, Double> attendanceRateByDepartment;
    private Map<String, Double> latePercentageByDepartment;
    private String bestAttendingDepartment;
    private String worstAttendingDepartment;

    // Day-wise Analysis
    private Map<String, Double> attendanceByDayOfWeek;
    private String lowestAttendanceDay;
    private String highestAttendanceDay;

    // Monthly Pattern
    private Map<Integer, Double> attendanceByDayOfMonth;
    private List<Integer> highAbsenteeismDays;

    // Overtime Analysis
    private Integer employeesWithOvertime;
    private Double totalOvertimeHours;
    private Double averageOvertimeHoursPerEmployee;
    private Map<String, Double> overtimeByDepartment;

    // Work From Home Analysis
    private Integer wfhDaysThisMonth;
    private Double wfhPercentage;
    private Map<String, Integer> wfhByDepartment;

    // Trends
    private List<TrendDataPoint> attendanceTrend;
    private List<TrendDataPoint> lateTrend;
    private List<TrendDataPoint> wfhTrend;

    // Absenteeism Analysis
    private List<AbsenteeismPattern> frequentAbsentees;
    private Double absenteeismRate;
    private Double absenteeismCost;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class TrendDataPoint {
        private String period;
        private Double value;
        private Double percentageChange;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class AbsenteeismPattern {
        private String employeeName;
        private String department;
        private Integer absentDays;
        private Double absenteeismRate;
        private String pattern;
    }
}
