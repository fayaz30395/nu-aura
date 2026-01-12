package com.hrms.api.analytics.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Employee Dashboard Response - Personal analytics for individual employees
 * Provides self-service insights into attendance, leave, performance, and career
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EmployeeDashboardResponse {

    // Employee Info
    private UUID employeeId;
    private String employeeName;
    private String designation;
    private String department;
    private String reportingManager;
    private LocalDate joiningDate;
    private Integer tenureMonths;
    private String profilePicUrl;

    // Quick Stats
    private QuickStats quickStats;

    // Attendance Summary
    private AttendanceSummary attendance;

    // Leave Summary
    private LeaveSummary leave;

    // Payroll Summary
    private PayrollSummary payroll;

    // Performance Summary
    private PerformanceSummary performance;

    // Learning & Development
    private LearningProgress learning;

    // Career Progress
    private CareerProgress career;

    // Upcoming Events
    private List<UpcomingEvent> upcomingEvents;

    // Tasks & To-dos
    private List<TaskItem> pendingTasks;

    // Announcements
    private List<Announcement> recentAnnouncements;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class QuickStats {
        private Integer daysWorkedThisMonth;
        private Integer leavesRemaining;
        private BigDecimal lastMonthSalary;
        private BigDecimal currentRating;
        private Integer pendingApprovals;
        private Integer completedTrainings;
        private Integer recognitionsReceived;
        private Integer goalsOnTrack;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AttendanceSummary {
        // This Month
        private Integer presentDays;
        private Integer absentDays;
        private Integer leaveDays;
        private Integer holidayDays;
        private Integer workingDays;
        private BigDecimal attendancePercentage;

        // Working Hours
        private BigDecimal totalHoursThisMonth;
        private BigDecimal avgHoursPerDay;
        private BigDecimal expectedHoursThisMonth;
        private BigDecimal overtimeHours;

        // Punctuality
        private Integer lateDays;
        private Integer earlyDepartures;
        private BigDecimal avgCheckInTime;
        private BigDecimal avgCheckOutTime;

        // Trend (30 days)
        private List<DailyAttendanceRecord> attendanceHistory;

        // Status
        private String todayStatus; // PRESENT, ABSENT, ON_LEAVE, HOLIDAY, WFH
        private String checkInTime;
        private String checkOutTime;
        private String workLocation;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DailyAttendanceRecord {
        private String date;
        private String status; // PRESENT, ABSENT, LEAVE, HOLIDAY, WEEKEND, WFH
        private String checkIn;
        private String checkOut;
        private BigDecimal hoursWorked;
        private Boolean isLate;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LeaveSummary {
        // Balances
        private List<LeaveBalance> leaveBalances;
        private BigDecimal totalLeaveBalance;
        private BigDecimal totalLeaveTaken;
        private BigDecimal totalLeaveAccrued;

        // Requests
        private Integer pendingRequests;
        private Integer approvedThisYear;
        private Integer rejectedThisYear;

        // Recent Requests
        private List<LeaveRequest> recentRequests;

        // Leave Pattern
        private BigDecimal avgLeavesPerMonth;
        private String mostUsedLeaveType;

        // Upcoming
        private List<ApprovedLeave> upcomingLeaves;

        // Holidays
        private List<UpcomingHoliday> upcomingHolidays;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LeaveBalance {
        private String leaveType;
        private String leaveTypeName;
        private BigDecimal entitled;
        private BigDecimal taken;
        private BigDecimal balance;
        private BigDecimal pending;
        private BigDecimal carryForward;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LeaveRequest {
        private UUID requestId;
        private String leaveType;
        private LocalDate startDate;
        private LocalDate endDate;
        private BigDecimal days;
        private String status; // PENDING, APPROVED, REJECTED, CANCELLED
        private String submittedAt;
        private String approverName;
        private String remarks;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ApprovedLeave {
        private String leaveType;
        private LocalDate startDate;
        private LocalDate endDate;
        private BigDecimal days;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UpcomingHoliday {
        private String name;
        private LocalDate date;
        private String dayOfWeek;
        private Integer daysFromNow;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PayrollSummary {
        // Latest Payslip
        private String payPeriod;
        private BigDecimal grossSalary;
        private BigDecimal netSalary;
        private BigDecimal deductions;
        private BigDecimal taxes;
        private LocalDate paymentDate;
        private String payslipStatus; // GENERATED, PAID

        // YTD Summary
        private BigDecimal ytdGross;
        private BigDecimal ytdNet;
        private BigDecimal ytdDeductions;
        private BigDecimal ytdTaxes;

        // Salary Components (latest)
        private List<SalaryComponent> salaryComponents;

        // Pay Trend (6 months)
        private List<PayTrendPoint> payTrend;

        // Reimbursements
        private BigDecimal pendingReimbursements;
        private BigDecimal approvedReimbursements;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SalaryComponent {
        private String componentName;
        private String componentType; // EARNING, DEDUCTION
        private BigDecimal amount;
        private BigDecimal ytdAmount;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PayTrendPoint {
        private String month;
        private BigDecimal grossSalary;
        private BigDecimal netSalary;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PerformanceSummary {
        // Current Cycle
        private String currentCycle;
        private BigDecimal currentRating;
        private String ratingLabel; // "Exceeds Expectations", etc.
        private String reviewStatus; // PENDING, IN_PROGRESS, COMPLETED

        // Goals
        private Integer totalGoals;
        private Integer completedGoals;
        private Integer inProgressGoals;
        private Integer overdueGoals;
        private BigDecimal goalCompletionRate;

        // Recent Goals
        private List<GoalSummary> activeGoals;

        // Feedback
        private Integer feedbackReceived;
        private Integer feedbackGiven;
        private BigDecimal avgFeedbackRating;

        // 1-on-1s
        private LocalDate lastOneOnOne;
        private LocalDate nextOneOnOne;
        private Integer oneOnOnesThisQuarter;

        // Recognition
        private Integer recognitionsReceived;
        private Integer recognitionsGiven;
        private Integer pointsEarned;
        private Integer pointsBalance;

        // Rating History
        private List<RatingHistory> ratingHistory;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class GoalSummary {
        private UUID goalId;
        private String title;
        private BigDecimal progress;
        private String status; // ON_TRACK, AT_RISK, OVERDUE, COMPLETED
        private LocalDate dueDate;
        private String priority; // HIGH, MEDIUM, LOW
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RatingHistory {
        private String cycle;
        private BigDecimal rating;
        private String ratingLabel;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LearningProgress {
        // Overall Progress
        private Integer totalAssignedCourses;
        private Integer completedCourses;
        private Integer inProgressCourses;
        private Integer overdueCourses;
        private BigDecimal completionRate;

        // Learning Hours
        private BigDecimal totalLearningHours;
        private BigDecimal learningHoursThisMonth;
        private BigDecimal targetLearningHours;

        // Certifications
        private Integer activeCertifications;
        private Integer expiringSoon; // Within 90 days
        private Integer expired;

        // Current Courses
        private List<CourseSummary> activeCourses;

        // Skills
        private List<SkillProgress> skills;

        // Achievements
        private List<LearningAchievement> recentAchievements;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CourseSummary {
        private UUID courseId;
        private String courseName;
        private BigDecimal progress;
        private LocalDate dueDate;
        private String status; // NOT_STARTED, IN_PROGRESS, COMPLETED, OVERDUE
        private Integer modulesCompleted;
        private Integer totalModules;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SkillProgress {
        private String skillName;
        private String category;
        private Integer currentLevel; // 1-5
        private Integer targetLevel;
        private String status; // ACQUIRED, IN_PROGRESS, GAP
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LearningAchievement {
        private String type; // COURSE_COMPLETED, CERTIFICATION_EARNED, SKILL_ACQUIRED
        private String title;
        private LocalDate earnedDate;
        private String badgeUrl;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CareerProgress {
        // Career Timeline
        private List<CareerMilestone> milestones;

        // Current Position
        private String currentPosition;
        private String currentGrade;
        private LocalDate positionSince;
        private Integer timeInRoleMonths;

        // Career Path
        private String nextPossibleRole;
        private BigDecimal readinessForPromotion;
        private List<String> skillsToAcquire;

        // Compensation
        private BigDecimal currentCtc;
        private BigDecimal lastIncrement;
        private LocalDate lastIncrementDate;
        private BigDecimal incrementPercentage;

        // Career Growth Metrics
        private Integer promotionsCount;
        private Integer lateralMovesCount;
        private BigDecimal careerGrowthScore;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CareerMilestone {
        private String type; // JOINING, PROMOTION, ROLE_CHANGE, ACHIEVEMENT
        private String title;
        private String description;
        private LocalDate date;
        private String icon;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UpcomingEvent {
        private String type; // BIRTHDAY, ANNIVERSARY, MEETING, TRAINING, DEADLINE, HOLIDAY
        private String title;
        private LocalDate date;
        private String time;
        private Integer daysFromNow;
        private String description;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TaskItem {
        private String type; // APPROVAL, REVIEW, TRAINING, DOCUMENT, OTHER
        private String title;
        private String description;
        private LocalDate dueDate;
        private String priority; // HIGH, MEDIUM, LOW
        private String actionUrl;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Announcement {
        private UUID announcementId;
        private String title;
        private String summary;
        private String category;
        private LocalDateTime publishedAt;
        private Boolean isRead;
        private String priority; // NORMAL, IMPORTANT, URGENT
    }
}
