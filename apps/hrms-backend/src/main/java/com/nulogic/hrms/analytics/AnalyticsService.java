package com.nulogic.hrms.analytics;

import com.nulogic.hrms.analytics.dto.DashboardAnalyticsResponse;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class AnalyticsService {

    public DashboardAnalyticsResponse getDashboardAnalytics(UUID userId) {
        // Return dummy data for now to fix frontend error
        return DashboardAnalyticsResponse.builder()
                .viewType("ADMIN")
                .viewLabel("Organization View")
                .teamSize(125L)
                .attendance(DashboardAnalyticsResponse.AttendanceAnalytics.builder()
                        .present(118L)
                        .absent(2L)
                        .onLeave(5L)
                        .onTime(105L)
                        .late(13L)
                        .attendancePercentage(94.4)
                        .trend(new ArrayList<>())
                        .build())
                .leave(DashboardAnalyticsResponse.LeaveAnalytics.builder()
                        .pending(8L)
                        .approved(24L)
                        .rejected(3L)
                        .utilizationPercentage(12.5)
                        .trend(new ArrayList<>())
                        .distribution(new ArrayList<>())
                        .build())
                .headcount(DashboardAnalyticsResponse.HeadcountAnalytics.builder()
                        .total(125L)
                        .newJoinees(4L)
                        .exits(1L)
                        .growthPercentage(2.4)
                        .trend(new ArrayList<>())
                        .departmentDistribution(new ArrayList<>())
                        .build())
                .upcomingEvents(DashboardAnalyticsResponse.UpcomingEvents.builder()
                        .birthdays(new ArrayList<>())
                        .anniversaries(new ArrayList<>())
                        .holidays(List.of(
                            DashboardAnalyticsResponse.HolidayEvent.builder()
                                .name("Republic Day")
                                .date("2026-01-26")
                                .type("Public Holiday")
                                .build()
                        ))
                        .build())
                .payroll(DashboardAnalyticsResponse.PayrollAnalytics.builder()
                        .currentMonth(DashboardAnalyticsResponse.CurrentMonthPayroll.builder()
                                .total(new BigDecimal("4500000"))
                                .processed(125L)
                                .pending(0L)
                                .status("PROCESSED")
                                .build())
                        .costTrend(new ArrayList<>())
                        .averageSalary(new BigDecimal("36000"))
                        .build())
                .build();
    }
}
