package com.hrms.api.dashboard.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardMetricsResponse {

    private EmployeeMetrics employeeMetrics;
    private AttendanceMetrics attendanceMetrics;
    private LeaveMetrics leaveMetrics;
    private DepartmentMetrics departmentMetrics;
    private List<RecentActivity> recentActivities;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class EmployeeMetrics {
        private Long totalEmployees;
        private Long activeEmployees;
        private Long inactiveEmployees;
        private Long newEmployeesThisMonth;
        private Map<String, Long> employeesByDepartment;
        private Map<String, Long> employeesByStatus;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AttendanceMetrics {
        private Long presentToday;
        private Long absentToday;
        private Long lateArrivals;
        private Long earlyDepartures;
        private Double averageAttendanceRate;
        private List<DailyAttendance> last7Days;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DailyAttendance {
        private LocalDate date;
        private Long present;
        private Long absent;
        private Long late;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LeaveMetrics {
        private Long pendingLeaveRequests;
        private Long approvedLeavesThisMonth;
        private Long totalLeavesThisMonth;
        private Map<String, Long> leavesByType;
        private List<UpcomingLeave> upcomingLeaves;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UpcomingLeave {
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
    public static class DepartmentMetrics {
        private Map<String, DepartmentStats> departmentStats;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DepartmentStats {
        private String departmentName;
        private Long totalEmployees;
        private Double attendanceRate;
        private Long pendingLeaves;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RecentActivity {
        private String actorName;
        private String action;
        private String entityType;
        private String description;
        private String timestamp;
    }
}
