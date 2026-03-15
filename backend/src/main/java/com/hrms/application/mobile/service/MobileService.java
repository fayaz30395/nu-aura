package com.hrms.application.mobile.service;

import com.hrms.api.mobile.dto.MobileDashboardResponse;
import com.hrms.application.announcement.service.AnnouncementService;
import com.hrms.application.employee.service.EmployeeService;
import com.hrms.application.leave.service.LeaveBalanceService;
import com.hrms.application.leave.service.LeaveRequestService;
import com.hrms.application.workflow.service.ApprovalService;
import com.hrms.common.security.SecurityContext;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.employee.Employee;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class MobileService {

    private final EmployeeService employeeService;
    private final LeaveBalanceService leaveBalanceService;
    private final LeaveRequestService leaveRequestService;
    private final ApprovalService approvalService;
    private final AnnouncementService announcementService;

    /**
     * Get aggregated mobile dashboard data
     */
    @Transactional(readOnly = true)
    public MobileDashboardResponse getMobileDashboard() {
        UUID tenantId = TenantContext.getCurrentTenant();
        UUID userId = SecurityContext.getCurrentUserId();

        // Get employee data
        Employee employee = employeeService.getEmployeeByUserId(userId)
                .orElseThrow(() -> new IllegalStateException("Employee not found for user: " + userId));

        // Build leave balance summary
        MobileDashboardResponse.LeaveBalanceSummary leaveBalance =
                buildLeaveBalanceSummary(employee.getId(), tenantId);

        // Get pending approvals count
        Integer pendingCount = approvalService.getPendingApprovalsCount(userId);

        // Get upcoming holidays (next 3)
        List<MobileDashboardResponse.UpcomingHoliday> upcomingHolidays =
                getUpcomingHolidays(tenantId, 3);

        // Get recent announcements (last 3)
        List<MobileDashboardResponse.Announcement> recentAnnouncements =
                getRecentAnnouncements(tenantId, 3);

        // Get reminders (birthdays/anniversaries in next 30 days)
        List<MobileDashboardResponse.EmployeeReminder> reminders =
                getEmployeeReminders(tenantId, 30);

        return MobileDashboardResponse.builder()
                .employeeId(employee.getId())
                .employeeName(employee.getFullName())
                .designation(employee.getDesignation())
                .department(employee.getDepartmentId() != null ? employee.getDepartmentId().toString() : "N/A")
                .avatarUrl(null) // TODO: Add avatarUrl field to Employee entity
                .attendanceStatus("NOT_CHECKED_IN") // Will be populated with actual attendance status
                .leaveBalance(leaveBalance)
                .pendingApprovalsCount(pendingCount)
                .upcomingHolidays(upcomingHolidays)
                .recentAnnouncements(recentAnnouncements)
                .reminders(reminders)
                .build();
    }

    /**
     * Build leave balance summary for mobile view
     */
    private MobileDashboardResponse.LeaveBalanceSummary buildLeaveBalanceSummary(
            UUID employeeId, UUID tenantId) {
        try {
            // Get all leave balances for the employee
            // This is a simplified version - adjust based on actual LeaveBalanceService implementation
            return MobileDashboardResponse.LeaveBalanceSummary.builder()
                    .casualLeaveBalance(12)
                    .sickLeaveBalance(8)
                    .earnedLeaveBalance(20)
                    .totalLeavesTaken(5)
                    .totalLeavesPlanned(2)
                    .build();
        } catch (Exception e) {
            log.error("Error building leave balance summary", e);
            return MobileDashboardResponse.LeaveBalanceSummary.builder()
                    .casualLeaveBalance(0)
                    .sickLeaveBalance(0)
                    .earnedLeaveBalance(0)
                    .build();
        }
    }

    /**
     * Get upcoming holidays
     */
    private List<MobileDashboardResponse.UpcomingHoliday> getUpcomingHolidays(
            UUID tenantId, int limit) {
        try {
            LocalDate today = LocalDate.now();
            LocalDate thirtyDaysFromNow = today.plusDays(30);

            // Placeholder - integrate with actual holiday service
            List<MobileDashboardResponse.UpcomingHoliday> holidays = new ArrayList<>();
            return holidays.stream().limit(limit).toList();
        } catch (Exception e) {
            log.error("Error fetching upcoming holidays", e);
            return new ArrayList<>();
        }
    }

    /**
     * Get recent announcements
     */
    private List<MobileDashboardResponse.Announcement> getRecentAnnouncements(
            UUID tenantId, int limit) {
        try {
            // Integrate with announcement service
            return new ArrayList<>();
        } catch (Exception e) {
            log.error("Error fetching announcements", e);
            return new ArrayList<>();
        }
    }

    /**
     * Get employee reminders (birthdays, anniversaries)
     */
    private List<MobileDashboardResponse.EmployeeReminder> getEmployeeReminders(
            UUID tenantId, int daysFromNow) {
        try {
            List<MobileDashboardResponse.EmployeeReminder> reminders = new ArrayList<>();
            // Fetch birthdays and anniversaries from employee records
            // Filter for dates within next daysFromNow days
            return reminders;
        } catch (Exception e) {
            log.error("Error fetching employee reminders", e);
            return new ArrayList<>();
        }
    }
}
