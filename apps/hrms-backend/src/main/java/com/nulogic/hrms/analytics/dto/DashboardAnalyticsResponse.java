package com.nulogic.hrms.analytics.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardAnalyticsResponse {
    private String viewType;  // ADMIN, MANAGER, or EMPLOYEE
    private String viewLabel; // Human-readable label
    private Long teamSize;
    private AttendanceAnalytics attendance;
    private LeaveAnalytics leave;
    private PayrollAnalytics payroll;
    private HeadcountAnalytics headcount;
    private UpcomingEvents upcomingEvents;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AttendanceAnalytics {
        private Long present;
        private Long absent;
        private Long onLeave;
        private Long onTime;
        private Long late;
        private Double attendancePercentage;
        private List<TrendData> trend;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LeaveAnalytics {
        private Long pending;
        private Long approved;
        private Long rejected;
        private Double utilizationPercentage;
        private List<TrendData> trend;
        private List<LeaveTypeDistribution> distribution;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PayrollAnalytics {
        private CurrentMonthPayroll currentMonth;
        private List<PayrollTrendData> costTrend;
        private BigDecimal averageSalary;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CurrentMonthPayroll {
        private BigDecimal total;
        private Long processed;
        private Long pending;
        private String status;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class HeadcountAnalytics {
        private Long total;
        private Long newJoinees;
        private Long exits;
        private Double growthPercentage;
        private List<TrendData> trend;
        private List<DepartmentDistribution> departmentDistribution;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UpcomingEvents {
        private List<BirthdayEvent> birthdays;
        private List<AnniversaryEvent> anniversaries;
        private List<HolidayEvent> holidays;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TrendData {
        private String date;
        private Long value;
        private String label;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PayrollTrendData {
        private String month;
        private BigDecimal amount;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LeaveTypeDistribution {
        private String leaveType;
        private Long count;
        private String color;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DepartmentDistribution {
        private String department;
        private Long count;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class BirthdayEvent {
        private String employeeName;
        private String date;
        private String department;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AnniversaryEvent {
        private String employeeName;
        private String date;
        private Integer years;
        private String department;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class HolidayEvent {
        private String name;
        private String date;
        private String type;
    }
}
