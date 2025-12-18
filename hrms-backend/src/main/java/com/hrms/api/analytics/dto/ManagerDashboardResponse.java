package com.hrms.api.analytics.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Manager Dashboard Response - Team-specific insights
 * Provides managers with metrics about their direct and indirect reports
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ManagerDashboardResponse {

    // Manager Info
    private UUID managerId;
    private String managerName;
    private String departmentName;

    // Team Overview
    private TeamOverview teamOverview;

    // Attendance Summary
    private TeamAttendance teamAttendance;

    // Leave Summary
    private TeamLeave teamLeave;

    // Performance Summary
    private TeamPerformance teamPerformance;

    // Action Items
    private ActionItems actionItems;

    // Team Members Quick View
    private List<TeamMemberSummary> teamMembers;

    // Team Alerts
    private List<TeamAlert> teamAlerts;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TeamOverview {
        private Integer directReports;
        private Integer totalTeamSize; // Including indirect reports
        private Integer activeMembers;
        private Integer onLeave;
        private Integer onProbation;
        private Integer newJoinersThisMonth;
        private Integer exitsThisMonth;

        // Team Health Score (composite)
        private BigDecimal teamHealthScore;
        private String teamHealthStatus; // EXCELLENT, GOOD, NEEDS_ATTENTION, CRITICAL

        // Span of Control
        private Integer hierarchyLevels;
        private BigDecimal avgSpanOfControl;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TeamAttendance {
        // Today's Status
        private Integer presentToday;
        private Integer absentToday;
        private Integer workFromHomeToday;
        private Integer onLeaveToday;
        private Integer lateToday;

        // This Week
        private BigDecimal weeklyAttendanceRate;
        private Integer totalLateArrivals;
        private Integer totalEarlyDepartures;

        // This Month
        private BigDecimal monthlyAttendanceRate;
        private BigDecimal avgWorkingHours;
        private BigDecimal monthlyAttendanceChange; // vs last month

        // Trend (7 days)
        private List<DailyAttendance> weeklyTrend;

        // Issues
        private List<AttendanceIssue> attendanceIssues;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DailyAttendance {
        private String date;
        private String dayOfWeek;
        private Integer present;
        private Integer absent;
        private Integer onLeave;
        private BigDecimal attendanceRate;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AttendanceIssue {
        private UUID employeeId;
        private String employeeName;
        private String issueType; // FREQUENT_LATE, FREQUENT_ABSENT, LOW_HOURS
        private String description;
        private Integer occurrences;
        private String period;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TeamLeave {
        // Pending Approvals
        private Integer pendingApprovals;
        private List<PendingLeave> pendingLeaveRequests;

        // Team Leave Status
        private Integer onLeaveToday;
        private Integer upcomingLeaveThisWeek;
        private Integer upcomingLeaveThisMonth;

        // Leave Utilization
        private BigDecimal avgLeaveUtilization;
        private Integer teamMembersLowLeaveBalance;

        // Leave Patterns
        private List<LeavePattern> leavePatterns;

        // Upcoming Leave Calendar
        private List<UpcomingLeave> upcomingLeaves;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PendingLeave {
        private UUID requestId;
        private UUID employeeId;
        private String employeeName;
        private String leaveType;
        private LocalDate startDate;
        private LocalDate endDate;
        private Integer days;
        private String reason;
        private String submittedAt;
        private String urgency; // HIGH if starting within 3 days
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LeavePattern {
        private String leaveType;
        private Integer totalDays;
        private Integer requestCount;
        private BigDecimal percentOfTotal;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UpcomingLeave {
        private UUID employeeId;
        private String employeeName;
        private String leaveType;
        private LocalDate startDate;
        private LocalDate endDate;
        private Integer days;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TeamPerformance {
        // Rating Distribution
        private Integer exceeding;
        private Integer meeting;
        private Integer needsImprovement;
        private Integer notRated;

        // Average Rating
        private BigDecimal avgPerformanceRating;
        private BigDecimal ratingChangeFromLastCycle;

        // Goals
        private Integer totalGoals;
        private Integer goalsOnTrack;
        private Integer goalsAtRisk;
        private Integer goalsCompleted;
        private BigDecimal goalCompletionRate;

        // One-on-Ones
        private Integer oneOnOnesScheduled;
        private Integer oneOnOnesOverdue;
        private Integer oneOnOnesCompletedThisMonth;

        // Feedback
        private Integer pendingFeedbackRequests;
        private BigDecimal avgFeedbackScore;

        // Training
        private Integer pendingTrainings;
        private BigDecimal trainingCompletionRate;

        // Performance Concerns
        private List<PerformanceConcern> performanceConcerns;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PerformanceConcern {
        private UUID employeeId;
        private String employeeName;
        private String concernType; // LOW_RATING, DECLINING_PERFORMANCE, MISSED_GOALS
        private String description;
        private String severity; // WARNING, CRITICAL
        private String recommendation;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ActionItems {
        // Approvals Pending
        private Integer leaveApprovals;
        private Integer expenseApprovals;
        private Integer timesheetApprovals;
        private Integer overtimeApprovals;

        // Reviews Due
        private Integer performanceReviewsDue;
        private Integer probationReviewsDue;
        private Integer oneOnOnesDue;

        // Overdue Items
        private Integer overdueApprovals;
        private Integer overdueReviews;

        // Total
        private Integer totalActionItems;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TeamMemberSummary {
        private UUID employeeId;
        private String employeeName;
        private String designation;
        private String profilePicUrl;
        private String status; // ACTIVE, ON_LEAVE, ON_PROBATION
        private String todayStatus; // PRESENT, ABSENT, WFH, ON_LEAVE
        private BigDecimal performanceRating;
        private BigDecimal attendanceRate;
        private Boolean hasAttritionRisk;
        private Integer pendingLeaveBalance;
        private LocalDate joiningDate;
        private Integer tenureMonths;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TeamAlert {
        private String id;
        private String severity; // INFO, WARNING, CRITICAL
        private String type; // ATTENDANCE, PERFORMANCE, LEAVE, PROBATION
        private String title;
        private String description;
        private UUID employeeId;
        private String employeeName;
        private String createdAt;
        private String actionRequired;
    }
}
