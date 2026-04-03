package com.hrms.api.mobile.dto;

import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MobileDashboardResponse {

    // Employee summary
    private UUID employeeId;
    private String employeeName;
    private String designation;
    private String department;
    private String avatarUrl;

    // Attendance status
    private String attendanceStatus; // NOT_CHECKED_IN, CHECKED_IN, CHECKED_OUT
    private LocalDateTime lastCheckInTime;
    private LocalDateTime lastCheckOutTime;
    private Integer todayWorkMinutes;
    private Boolean todayIsLate;
    private Integer todayLateByMinutes;

    // Leave balance summary
    private LeaveBalanceSummary leaveBalance;

    // Pending approvals
    private Integer pendingApprovalsCount;
    private List<PendingApprovalSummary> recentPendingApprovals;

    // Upcoming items
    private List<UpcomingHoliday> upcomingHolidays;
    private List<Announcement> recentAnnouncements;
    private List<EmployeeReminder> reminders; // birthdays, anniversaries

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LeaveBalanceSummary {
        private Integer casualLeaveBalance;
        private Integer sickLeaveBalance;
        private Integer earnedLeaveBalance;
        private Integer totalLeavesTaken;
        private Integer totalLeavesPlanned;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PendingApprovalSummary {
        private UUID approvalId;
        private String type; // LEAVE, EXPENSE, EMPLOYMENT_CHANGE, etc.
        private String requesterName;
        private LocalDateTime submittedAt;
        private String status;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UpcomingHoliday {
        private String holidayName;
        private LocalDate date;
        private Integer daysFromToday;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Announcement {
        private UUID announcementId;
        private String title;
        private String content;
        private LocalDateTime publishedAt;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class EmployeeReminder {
        private String type; // BIRTHDAY, ANNIVERSARY
        private String employeeName;
        private LocalDate date;
    }
}
