package com.nulogic.hrms.dashboard.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EmployeeDashboardData {
    private String employeeId;
    private String employeeName;
    private String designation;
    private String department;
    private AttendanceSummary attendanceSummary;
    private List<LeaveBalanceItem> leaveBalances;
    private CareerProgress careerProgress;
    private List<UpcomingEvent> upcomingEvents;
    private Stats stats;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AttendanceSummary {
        private AttendanceCurrentMonth currentMonth;
        private List<AttendanceHistory> recentHistory;
        private List<AttendanceTrend> weeklyTrend;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AttendanceCurrentMonth {
        private Integer present;
        private Integer absent;
        private Integer late;
        private Integer onLeave;
        private Integer totalWorkingDays;
        private Double attendancePercentage;
        private Double averageWorkHours;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AttendanceHistory {
        private String date;
        private String status; // PRESENT, ABSENT, etc.
        private String checkInTime;
        private String checkOutTime;
        private Double totalWorkHours;
        private Boolean isLate;
        private Integer lateByMinutes;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AttendanceTrend {
        private String date;
        private Integer present;
        private Integer onTime;
        private Integer late;
        private Double totalHours;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LeaveBalanceItem {
        private String leaveTypeId;
        private String leaveTypeName;
        private String leaveTypeCode;
        private String colorCode;
        private Double totalQuota;
        private Double available;
        private Double used;
        private Double pending;
        private Double percentage;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CareerProgress {
        private List<CareerGoal> currentGoals;
        private List<PerformanceReview> recentReviews;
        private Integer completedTrainings;
        private Integer upcomingTrainings;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CareerGoal {
        private String id;
        private String title;
        private String description;
        private String targetDate;
        private String status;
        private Double progress;
        private String createdAt;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PerformanceReview {
        private String id;
        private String reviewPeriod;
        private String reviewType;
        private Double overallRating;
        private String status;
        private String reviewDate;
        private String reviewerName;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UpcomingEvent {
        private String id;
        private String title;
        private String type; // HOLIDAY, BIRTHDAY, etc.
        private String date;
        private String description;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Stats {
        private Integer totalLeavesTaken;
        private Integer totalLeavesRemaining;
        private Integer pendingLeaveRequests;
        private Integer pendingApprovals;
    }
}
