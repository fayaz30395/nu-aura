package com.hrms.api.selfservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SelfServiceDashboardResponse {

    // Employee Quick Info
    private String employeeName;
    private String employeeId;
    private String designation;
    private String department;
    private String reportingManager;
    private LocalDate dateOfJoining;
    private String profilePhotoUrl;

    // Leave Balance Summary
    private Map<String, Double> leaveBalances;
    private Integer pendingLeaveRequests;

    // Attendance Summary
    private Integer presentDaysThisMonth;
    private Integer absentDaysThisMonth;
    private Integer lateDaysThisMonth;
    private Double attendancePercentage;
    private String todayAttendanceStatus;

    // Pending Actions
    private Integer pendingProfileUpdates;
    private Integer pendingDocumentRequests;
    private Integer pendingApprovals;
    private Integer pendingTimesheets;

    // Recent Payslips
    private List<PayslipSummary> recentPayslips;

    // Upcoming Events
    private List<UpcomingEvent> upcomingEvents;

    // Recent Announcements
    private List<AnnouncementSummary> recentAnnouncements;

    // Team Info
    private Integer teamSize;
    private Integer teamMembersOnLeave;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class PayslipSummary {
        private String month;
        private Integer year;
        private BigDecimal netPay;
        private String downloadUrl;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class UpcomingEvent {
        private String title;
        private LocalDate date;
        private String eventType;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class AnnouncementSummary {
        private String title;
        private String excerpt;
        private LocalDate postedOn;
    }
}
