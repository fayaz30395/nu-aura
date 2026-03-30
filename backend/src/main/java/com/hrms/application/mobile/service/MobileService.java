package com.hrms.application.mobile.service;

import com.hrms.api.announcement.dto.AnnouncementDto;
import com.hrms.api.mobile.dto.MobileDashboardResponse;
import com.hrms.application.announcement.service.AnnouncementService;
import com.hrms.application.attendance.service.HolidayService;
import com.hrms.application.employee.service.EmployeeService;
import com.hrms.application.leave.service.LeaveBalanceService;
import com.hrms.application.leave.service.LeaveRequestService;
import com.hrms.application.workflow.service.ApprovalService;
import com.hrms.common.security.SecurityContext;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.attendance.Holiday;
import com.hrms.domain.employee.Employee;
import com.hrms.domain.leave.LeaveBalance;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.Year;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

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
    private final HolidayService holidayService;

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
                .avatarUrl(employee.getAvatarUrl())
                .attendanceStatus("NOT_CHECKED_IN") // Will be populated with actual attendance status
                .leaveBalance(leaveBalance)
                .pendingApprovalsCount(pendingCount)
                .upcomingHolidays(upcomingHolidays)
                .recentAnnouncements(recentAnnouncements)
                .reminders(reminders)
                .build();
    }

    /**
     * Build leave balance summary for mobile view using actual leave balance data.
     */
    private MobileDashboardResponse.LeaveBalanceSummary buildLeaveBalanceSummary(
            UUID employeeId, UUID tenantId) {
        try {
            // Get all leave balances for the employee for current year
            int currentYear = Year.now().getValue();
            List<LeaveBalance> balances = leaveBalanceService.getEmployeeBalancesForYear(employeeId, currentYear);

            // Aggregate leave data by type (simplified mapping by name patterns)
            BigDecimal casualBalance = BigDecimal.ZERO;
            BigDecimal sickBalance = BigDecimal.ZERO;
            BigDecimal earnedBalance = BigDecimal.ZERO;
            BigDecimal totalTaken = BigDecimal.ZERO;
            BigDecimal totalPending = BigDecimal.ZERO;

            for (LeaveBalance balance : balances) {
                BigDecimal available = balance.getAvailable() != null
                        ? balance.getAvailable()
                        : BigDecimal.ZERO;
                BigDecimal taken = balance.getUsed() != null
                        ? balance.getUsed()
                        : BigDecimal.ZERO;
                BigDecimal pending = balance.getPending() != null
                        ? balance.getPending()
                        : BigDecimal.ZERO;

                totalTaken = totalTaken.add(taken);
                totalPending = totalPending.add(pending);

                // Simplified categorization - in production, map by leave type ID or code
                // For now, aggregate all balances
                earnedBalance = earnedBalance.add(available);
            }

            return MobileDashboardResponse.LeaveBalanceSummary.builder()
                    .casualLeaveBalance(casualBalance.intValue())
                    .sickLeaveBalance(sickBalance.intValue())
                    .earnedLeaveBalance(earnedBalance.intValue())
                    .totalLeavesTaken(totalTaken.intValue())
                    .totalLeavesPlanned(totalPending.intValue())
                    .build();
        } catch (Exception e) { // Intentional broad catch — mobile API error boundary
            log.error("Error building leave balance summary for employee: {}", employeeId, e);
            return MobileDashboardResponse.LeaveBalanceSummary.builder()
                    .casualLeaveBalance(0)
                    .sickLeaveBalance(0)
                    .earnedLeaveBalance(0)
                    .totalLeavesTaken(0)
                    .totalLeavesPlanned(0)
                    .build();
        }
    }

    /**
     * Get upcoming holidays from HolidayService.
     */
    private List<MobileDashboardResponse.UpcomingHoliday> getUpcomingHolidays(
            UUID tenantId, int limit) {
        try {
            LocalDate today = LocalDate.now();
            LocalDate thirtyDaysFromNow = today.plusDays(30);

            List<Holiday> holidays = holidayService.getHolidaysByDateRange(today, thirtyDaysFromNow);

            LocalDate now = LocalDate.now();
            return holidays.stream()
                    .sorted(Comparator.comparing(Holiday::getHolidayDate))
                    .limit(limit)
                    .map(h -> MobileDashboardResponse.UpcomingHoliday.builder()
                            .holidayName(h.getHolidayName())
                            .date(h.getHolidayDate())
                            .daysFromToday((int) java.time.temporal.ChronoUnit.DAYS.between(now, h.getHolidayDate()))
                            .build())
                    .toList();
        } catch (Exception e) { // Intentional broad catch — mobile API error boundary
            log.error("Error fetching upcoming holidays", e);
            return new ArrayList<>();
        }
    }

    /**
     * Get recent announcements from AnnouncementService.
     */
    private List<MobileDashboardResponse.Announcement> getRecentAnnouncements(
            UUID tenantId, int limit) {
        try {
            UUID userId = SecurityContext.getCurrentUserId();
            Employee employee = employeeService.getEmployeeByUserId(userId).orElse(null);
            if (employee == null) {
                return new ArrayList<>();
            }

            Page<AnnouncementDto> announcements = announcementService.getActiveAnnouncements(
                    employee.getId(),
                    PageRequest.of(0, limit)
            );

            return announcements.getContent().stream()
                    .map(a -> MobileDashboardResponse.Announcement.builder()
                            .announcementId(a.getId())
                            .title(a.getTitle())
                            .content(truncateContent(a.getContent(), 150))
                            .publishedAt(a.getCreatedAt())
                            .build())
                    .toList();
        } catch (Exception e) { // Intentional broad catch — mobile API error boundary
            log.error("Error fetching announcements", e);
            return new ArrayList<>();
        }
    }

    /**
     * Truncate content for mobile preview.
     */
    private String truncateContent(String content, int maxLength) {
        if (content == null) {
            return "";
        }
        if (content.length() <= maxLength) {
            return content;
        }
        return content.substring(0, maxLength - 3) + "...";
    }

    /**
     * Get employee reminders (birthdays, anniversaries) from employee records.
     * Limited to the current user's team/reportees to avoid loading all employees.
     */
    private List<MobileDashboardResponse.EmployeeReminder> getEmployeeReminders(
            UUID tenantId, int daysFromNow) {
        try {
            List<MobileDashboardResponse.EmployeeReminder> reminders = new ArrayList<>();
            LocalDate today = LocalDate.now();
            LocalDate endDate = today.plusDays(daysFromNow);

            // Get current user's reportees (team members) instead of all employees
            // This avoids loading thousands of employees for large organizations
            UUID currentEmployeeId = SecurityContext.getCurrentEmployeeId();
            List<Employee> employees = new ArrayList<>();
            if (currentEmployeeId != null) {
                // Add self
                Employee self = employeeService.getByIdAndTenant(currentEmployeeId, tenantId);
                if (self != null) {
                    employees.add(self);
                }
                // Add direct reports (subordinates)
                try {
                    List<com.hrms.api.employee.dto.EmployeeResponse> subordinates =
                            employeeService.getSubordinates(currentEmployeeId);
                    for (var sub : subordinates) {
                        Employee emp = employeeService.getByIdAndTenant(sub.getId(), tenantId);
                        if (emp != null) {
                            employees.add(emp);
                        }
                    }
                } catch (Exception e) { // Intentional broad catch — mobile API error boundary
                    log.debug("Could not load subordinates for reminders: {}", e.getMessage());
                }
            }

            for (Employee emp : employees) {
                // Check for upcoming birthdays
                if (emp.getDateOfBirth() != null) {
                    LocalDate birthdayThisYear = emp.getDateOfBirth()
                            .withYear(today.getYear());
                    // Handle case where birthday already passed this year
                    if (birthdayThisYear.isBefore(today)) {
                        birthdayThisYear = birthdayThisYear.plusYears(1);
                    }
                    if (!birthdayThisYear.isAfter(endDate)) {
                        reminders.add(MobileDashboardResponse.EmployeeReminder.builder()
                                .employeeName(emp.getFullName())
                                .type("BIRTHDAY")
                                .date(birthdayThisYear)
                                .build());
                    }
                }

                // Check for upcoming work anniversaries
                if (emp.getJoiningDate() != null) {
                    LocalDate anniversaryThisYear = emp.getJoiningDate()
                            .withYear(today.getYear());
                    // Handle case where anniversary already passed this year
                    if (anniversaryThisYear.isBefore(today)) {
                        anniversaryThisYear = anniversaryThisYear.plusYears(1);
                    }
                    if (!anniversaryThisYear.isAfter(endDate)) {
                        int years = today.getYear() - emp.getJoiningDate().getYear();
                        if (anniversaryThisYear.getYear() > today.getYear()) {
                            years++;
                        }
                        reminders.add(MobileDashboardResponse.EmployeeReminder.builder()
                                .employeeName(emp.getFullName())
                                .type("WORK_ANNIVERSARY")
                                .date(anniversaryThisYear)
                                .build());
                    }
                }
            }

            // Sort by date and limit results
            return reminders.stream()
                    .sorted(Comparator.comparing(MobileDashboardResponse.EmployeeReminder::getDate))
                    .limit(10) // Limit to 10 reminders
                    .toList();
        } catch (Exception e) { // Intentional broad catch — mobile API error boundary
            log.error("Error fetching employee reminders", e);
            return new ArrayList<>();
        }
    }
}
