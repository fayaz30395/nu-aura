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
public class ManagerDashboardResponse {
    private String managerId;
    private String managerName;
    private String departmentName;
    private TeamOverview teamOverview;
    private TeamAttendance teamAttendance;
    private TeamLeave teamLeave;
    private TeamPerformance teamPerformance;
    private ActionItems actionItems;
    private List<TeamMemberSummary> teamMembers;
    private List<TeamAlert> teamAlerts;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TeamOverview {
        private Integer directReports;
        private Integer totalTeamSize;
        private Integer activeMembers;
        private Integer onLeave;
        private Integer onProbation;
        private Integer newJoinersThisMonth;
        private Integer exitsThisMonth;
        private Integer teamHealthScore;
        private String teamHealthStatus;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TeamAttendance {
        private Integer presentToday;
        private Integer absentToday;
        private Integer workFromHomeToday;
        private Integer onLeaveToday;
        private Integer lateToday;
        private Double weeklyAttendanceRate;
        private Double monthlyAttendanceRate;
        private Double avgWorkingHours;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TeamLeave {
        private Integer pendingApprovals;
        private Integer onLeaveToday;
        private Integer upcomingLeaveThisWeek;
        private Double avgLeaveUtilization;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TeamPerformance {
        private Double avgPerformanceRating;
        private Double goalCompletionRate;
        private Integer oneOnOnesScheduled;
        private Integer pendingFeedbackRequests;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ActionItems {
        private Integer leaveApprovals;
        private Integer expenseApprovals;
        private Integer performanceReviewsDue;
        private Integer totalActionItems;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TeamMemberSummary {
        private String employeeId;
        private String employeeName;
        private String designation;
        private String status;
        private String todayStatus;
        private Double performanceRating;
        private Double attendanceRate;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TeamAlert {
        private String id;
        private String severity;
        private String type;
        private String title;
        private String description;
        private String employeeName;
    }
}
