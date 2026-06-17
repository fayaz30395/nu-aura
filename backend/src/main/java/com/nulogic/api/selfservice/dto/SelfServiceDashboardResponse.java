package com.nulogic.api.selfservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
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
    // Offset-aware so the client can compute the live "working" elapsed timer correctly regardless
    // of the browser timezone (tenant-local instant carries the tenant's UTC offset). See
    // SelfServiceService where this is converted from the stored tenant-local LocalDateTime.
    private OffsetDateTime todayCheckInTime;
    // Display-only wall-clock time; rendered as the tenant-local clock, no offset needed.
    private LocalDateTime todayCheckOutTime;

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
