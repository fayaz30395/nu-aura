package com.hrms.application.analytics.service;

import com.hrms.api.analytics.dto.DashboardAnalyticsResponse;
import com.hrms.api.analytics.dto.DashboardAnalyticsResponse.*;
import com.hrms.api.analytics.dto.DashboardContext;
import com.hrms.domain.employee.Employee;
import com.hrms.domain.leave.LeaveRequest;
import com.hrms.infrastructure.attendance.repository.AttendanceRecordRepository;
import com.hrms.infrastructure.attendance.repository.HolidayRepository;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import com.hrms.infrastructure.leave.repository.LeaveRequestRepository;
import com.hrms.infrastructure.payroll.repository.PayslipRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class DashboardAnalyticsService {

    private final EmployeeRepository employeeRepository;
    private final AttendanceRecordRepository attendanceRepository;
    private final LeaveRequestRepository leaveRequestRepository;
    private final PayslipRepository payslipRepository;
    private final HolidayRepository holidayRepository;

    /**
     * Legacy method for backward compatibility - returns admin view
     */
    public DashboardAnalyticsResponse getDashboardAnalytics(UUID tenantId) {
        DashboardContext context = DashboardContext.builder()
                .tenantId(tenantId)
                .viewType(DashboardContext.ViewType.ADMIN)
                .targetEmployeeIds(null)
                .build();
        return getDashboardAnalytics(context);
    }

    /**
     * Role-based dashboard analytics.
     * - ADMIN: See all organization data
     * - MANAGER: See only team/reportee data
     * - EMPLOYEE: See only personal data
     */
    public DashboardAnalyticsResponse getDashboardAnalytics(DashboardContext context) {
        LocalDate today = LocalDate.now();
        UUID tenantId = context.getTenantId();

        String viewLabel = switch (context.getViewType()) {
            case ADMIN -> "Organization View";
            case MANAGER -> "Team View";
            default -> "Personal View";
        };
        Long teamSize = switch (context.getViewType()) {
            case ADMIN -> employeeRepository.countByTenantIdAndStatus(tenantId, Employee.EmployeeStatus.ACTIVE);
            case MANAGER -> context.getTargetEmployeeIds() != null ? (long) context.getTargetEmployeeIds().size() : 0L;
            default -> 1L;
        };

        return DashboardAnalyticsResponse.builder()
                .viewType(context.getViewType().name())
                .viewLabel(viewLabel)
                .teamSize(teamSize)
                .attendance(getAttendanceAnalytics(context, today))
                .leave(getLeaveAnalytics(context))
                .payroll(context.isAdmin() ? getPayrollAnalytics(tenantId) : null) // Only admins see payroll
                .headcount(getHeadcountAnalytics(context))
                .upcomingEvents(getUpcomingEvents(context))
                .build();
    }

    /**
     * Build DashboardContext for a user based on their role
     */
    public DashboardContext buildContext(UUID tenantId, UUID userId, UUID employeeId, boolean isAdmin, boolean isManager) {
        DashboardContext.ViewType viewType;
        List<UUID> targetEmployeeIds = null;

        if (isAdmin) {
            viewType = DashboardContext.ViewType.ADMIN;
            // Admins see all - no need to specify employee IDs
        } else if (isManager && employeeId != null) {
            viewType = DashboardContext.ViewType.MANAGER;
            // Get all reportees (direct and indirect)
            targetEmployeeIds = getAllReporteeIds(tenantId, employeeId);
            // Include self in the view
            if (!targetEmployeeIds.contains(employeeId)) {
                targetEmployeeIds.add(0, employeeId);
            }
        } else {
            viewType = DashboardContext.ViewType.EMPLOYEE;
            // Regular employees see only their own data
            targetEmployeeIds = employeeId != null ? List.of(employeeId) : List.of();
        }

        return DashboardContext.builder()
                .tenantId(tenantId)
                .userId(userId)
                .employeeId(employeeId)
                .viewType(viewType)
                .targetEmployeeIds(targetEmployeeIds)
                .build();
    }

    /**
     * Get all reportee IDs (direct + indirect) for a manager
     */
    private List<UUID> getAllReporteeIds(UUID tenantId, UUID managerId) {
        List<UUID> allReportees = new ArrayList<>();
        List<UUID> currentLevel = List.of(managerId);

        // Traverse the hierarchy up to 10 levels deep (to prevent infinite loops)
        for (int i = 0; i < 10 && !currentLevel.isEmpty(); i++) {
            List<UUID> nextLevel = employeeRepository.findEmployeeIdsByManagerIds(tenantId, currentLevel);
            if (nextLevel.isEmpty()) {
                break;
            }
            allReportees.addAll(nextLevel);
            currentLevel = nextLevel;
        }

        return allReportees;
    }

    private AttendanceAnalytics getAttendanceAnalytics(DashboardContext context, LocalDate today) {
        UUID tenantId = context.getTenantId();
        List<UUID> employeeIds = context.getTargetEmployeeIds();

        Long totalEmployees;
        Long present;
        Long onLeave;
        Long onTime;

        if (context.isAdmin()) {
            // Admin sees all organization data
            totalEmployees = employeeRepository.countByTenantIdAndStatus(tenantId, Employee.EmployeeStatus.ACTIVE);
            present = attendanceRepository.countByTenantIdAndDate(tenantId, today);
            onLeave = leaveRequestRepository.countByTenantIdAndDateAndStatus(tenantId, today, LeaveRequest.LeaveRequestStatus.APPROVED);
            onTime = attendanceRepository.countByTenantIdAndDateAndOnTime(tenantId, today);
        } else if (context.isManager() && employeeIds != null && !employeeIds.isEmpty()) {
            // Manager sees team data
            totalEmployees = (long) employeeIds.size();
            present = attendanceRepository.countByTenantIdAndDateAndEmployeeIdIn(tenantId, today, employeeIds);
            onLeave = leaveRequestRepository.countByTenantIdAndDateAndStatusAndEmployeeIdIn(tenantId, today, LeaveRequest.LeaveRequestStatus.APPROVED, employeeIds);
            onTime = attendanceRepository.countByTenantIdAndDateAndOnTimeAndEmployeeIdIn(tenantId, today, employeeIds);
        } else {
            // Employee sees personal data
            UUID employeeId = context.getEmployeeId();
            totalEmployees = 1L;
            present = employeeId != null ? attendanceRepository.countByTenantIdAndDateAndEmployeeId(tenantId, today, employeeId) : 0L;
            onLeave = employeeId != null ? leaveRequestRepository.countByTenantIdAndDateAndStatusAndEmployeeId(tenantId, today, LeaveRequest.LeaveRequestStatus.APPROVED, employeeId) : 0L;
            onTime = present; // For personal view, if present then assume on-time for simplicity
        }

        Long absent = Math.max(0, totalEmployees - present - onLeave);
        Long late = Math.max(0, present - onTime);

        Double attendancePercentage = totalEmployees > 0
                ? (present.doubleValue() / totalEmployees.doubleValue()) * 100
                : 0.0;

        // Get last 7 days trend
        List<TrendData> trend = new ArrayList<>();
        for (int i = 6; i >= 0; i--) {
            LocalDate date = today.minusDays(i);
            Long dayPresent;

            if (context.isAdmin()) {
                dayPresent = attendanceRepository.countByTenantIdAndDate(tenantId, date);
            } else if (context.isManager() && employeeIds != null && !employeeIds.isEmpty()) {
                dayPresent = attendanceRepository.countByTenantIdAndDateAndEmployeeIdIn(tenantId, date, employeeIds);
            } else {
                dayPresent = context.getEmployeeId() != null
                        ? attendanceRepository.countByTenantIdAndDateAndEmployeeId(tenantId, date, context.getEmployeeId())
                        : 0L;
            }

            trend.add(TrendData.builder()
                    .date(date.format(DateTimeFormatter.ofPattern("MMM dd")))
                    .value(dayPresent)
                    .label(date.getDayOfWeek().name().substring(0, 3))
                    .build());
        }

        return AttendanceAnalytics.builder()
                .present(present)
                .absent(absent)
                .onLeave(onLeave)
                .onTime(onTime)
                .late(late)
                .attendancePercentage(Math.round(attendancePercentage * 100.0) / 100.0)
                .trend(trend)
                .build();
    }

    private LeaveAnalytics getLeaveAnalytics(DashboardContext context) {
        UUID tenantId = context.getTenantId();
        List<UUID> employeeIds = context.getTargetEmployeeIds();

        Long pending;
        Long approved;
        Long rejected;

        if (context.isAdmin()) {
            // Admin sees all organization leave data
            pending = leaveRequestRepository.countByTenantIdAndStatus(tenantId, LeaveRequest.LeaveRequestStatus.PENDING);
            approved = leaveRequestRepository.countByTenantIdAndStatus(tenantId, LeaveRequest.LeaveRequestStatus.APPROVED);
            rejected = leaveRequestRepository.countByTenantIdAndStatus(tenantId, LeaveRequest.LeaveRequestStatus.REJECTED);
        } else if (context.isManager() && employeeIds != null && !employeeIds.isEmpty()) {
            // Manager sees team leave data
            pending = leaveRequestRepository.countByTenantIdAndStatusAndEmployeeIdIn(tenantId, LeaveRequest.LeaveRequestStatus.PENDING, employeeIds);
            approved = leaveRequestRepository.countByTenantIdAndStatusAndEmployeeIdIn(tenantId, LeaveRequest.LeaveRequestStatus.APPROVED, employeeIds);
            rejected = leaveRequestRepository.countByTenantIdAndStatusAndEmployeeIdIn(tenantId, LeaveRequest.LeaveRequestStatus.REJECTED, employeeIds);
        } else {
            // Employee sees personal leave data
            UUID employeeId = context.getEmployeeId();
            pending = employeeId != null ? leaveRequestRepository.countByTenantIdAndStatusAndEmployeeId(tenantId, LeaveRequest.LeaveRequestStatus.PENDING, employeeId) : 0L;
            approved = employeeId != null ? leaveRequestRepository.countByTenantIdAndStatusAndEmployeeId(tenantId, LeaveRequest.LeaveRequestStatus.APPROVED, employeeId) : 0L;
            rejected = employeeId != null ? leaveRequestRepository.countByTenantIdAndStatusAndEmployeeId(tenantId, LeaveRequest.LeaveRequestStatus.REJECTED, employeeId) : 0L;
        }

        // Calculate utilization percentage (approved leaves / total available)
        Long totalRequested = approved + pending + rejected;
        Double utilizationPercentage = totalRequested > 0
                ? (approved.doubleValue() / totalRequested.doubleValue()) * 100
                : 0.0;

        // Get last 6 months trend (for admin and manager only)
        List<TrendData> trend = new ArrayList<>();
        if (context.isAdmin()) {
            LocalDate today = LocalDate.now();
            for (int i = 5; i >= 0; i--) {
                YearMonth month = YearMonth.from(today.minusMonths(i));
                LocalDate startDate = month.atDay(1);
                LocalDate endDate = month.atEndOfMonth();

                Long monthCount = leaveRequestRepository.countByTenantIdAndDateRange(tenantId, startDate, endDate);

                trend.add(TrendData.builder()
                        .date(month.format(DateTimeFormatter.ofPattern("MMM")))
                        .value(monthCount)
                        .label(month.format(DateTimeFormatter.ofPattern("MMM yy")))
                        .build());
            }
        }

        // Get leave type distribution (for admin only)
        List<LeaveTypeDistribution> distribution = new ArrayList<>();
        if (context.isAdmin()) {
            List<Object[]> leaveTypeCounts = leaveRequestRepository.findLeaveTypeDistribution(tenantId);
            distribution = leaveTypeCounts.stream()
                    .map(row -> LeaveTypeDistribution.builder()
                            .leaveType((String) row[0])
                            .count(((Number) row[1]).longValue())
                            .color(getColorForLeaveType((String) row[0]))
                            .build())
                    .collect(Collectors.toList());
        }

        return LeaveAnalytics.builder()
                .pending(pending)
                .approved(approved)
                .rejected(rejected)
                .utilizationPercentage(Math.round(utilizationPercentage * 100.0) / 100.0)
                .trend(trend)
                .distribution(distribution)
                .build();
    }

    private PayrollAnalytics getPayrollAnalytics(UUID tenantId) {
        YearMonth currentMonth = YearMonth.now();

        // Get current month payroll stats
        Long totalEmployees = employeeRepository.countByTenantIdAndStatus(tenantId, Employee.EmployeeStatus.ACTIVE);
        Long processedPayslips = payslipRepository.countByTenantIdAndYearAndMonth(
                tenantId, currentMonth.getYear(), currentMonth.getMonthValue());
        Long pendingPayslips = totalEmployees - processedPayslips;

        BigDecimal monthlyTotal = payslipRepository.sumNetSalaryByTenantIdAndYearAndMonth(
                tenantId, currentMonth.getYear(), currentMonth.getMonthValue());

        if (monthlyTotal == null) {
            monthlyTotal = BigDecimal.ZERO;
        }

        CurrentMonthPayroll currentMonthData = CurrentMonthPayroll.builder()
                .total(monthlyTotal)
                .processed(processedPayslips)
                .pending(pendingPayslips)
                .status(processedPayslips.equals(totalEmployees) ? "COMPLETED" : "IN_PROGRESS")
                .build();

        // Get last 6 months cost trend
        List<PayrollTrendData> costTrend = new ArrayList<>();
        for (int i = 5; i >= 0; i--) {
            YearMonth month = YearMonth.now().minusMonths(i);
            BigDecimal monthTotal = payslipRepository.sumNetSalaryByTenantIdAndYearAndMonth(
                    tenantId, month.getYear(), month.getMonthValue());

            if (monthTotal == null) {
                monthTotal = BigDecimal.ZERO;
            }

            costTrend.add(PayrollTrendData.builder()
                    .month(month.format(DateTimeFormatter.ofPattern("MMM yy")))
                    .amount(monthTotal)
                    .build());
        }

        // Calculate average salary
        BigDecimal averageSalary = totalEmployees > 0 && monthlyTotal.compareTo(BigDecimal.ZERO) > 0
                ? monthlyTotal.divide(BigDecimal.valueOf(totalEmployees), 2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        return PayrollAnalytics.builder()
                .currentMonth(currentMonthData)
                .costTrend(costTrend)
                .averageSalary(averageSalary)
                .build();
    }

    private HeadcountAnalytics getHeadcountAnalytics(DashboardContext context) {
        UUID tenantId = context.getTenantId();
        List<UUID> employeeIds = context.getTargetEmployeeIds();
        LocalDate today = LocalDate.now();
        LocalDate monthStart = today.withDayOfMonth(1);

        Long total;
        Long newJoinees;
        Long exits = 0L; // Not applicable for team/personal view
        List<TrendData> trend = new ArrayList<>();
        List<DepartmentDistribution> departmentDistribution = new ArrayList<>();

        if (context.isAdmin()) {
            // Admin sees organization-wide headcount data
            total = employeeRepository.countByTenantIdAndStatus(tenantId, Employee.EmployeeStatus.ACTIVE);
            newJoinees = employeeRepository.countByTenantIdAndJoiningDateBetween(tenantId, monthStart, today);
            exits = employeeRepository.countByTenantIdAndStatusAndExitDateBetween(
                    tenantId, Employee.EmployeeStatus.TERMINATED, monthStart, today);

            // Get last 6 months headcount trend
            for (int i = 5; i >= 0; i--) {
                YearMonth month = YearMonth.now().minusMonths(i);
                LocalDate endOfMonth = month.atEndOfMonth();

                Long monthCount = employeeRepository.countByTenantIdAndStatusAndJoiningDateBefore(
                        tenantId, Employee.EmployeeStatus.ACTIVE, endOfMonth);

                trend.add(TrendData.builder()
                        .date(month.format(DateTimeFormatter.ofPattern("MMM yy")))
                        .value(monthCount)
                        .label(month.format(DateTimeFormatter.ofPattern("MMM")))
                        .build());
            }

            // Get department distribution
            List<Object[]> deptCounts = employeeRepository.findDepartmentDistribution(tenantId);
            departmentDistribution = deptCounts.stream()
                    .map(row -> DepartmentDistribution.builder()
                            .department((String) row[0])
                            .count(((Number) row[1]).longValue())
                            .build())
                    .collect(Collectors.toList());
        } else if (context.isManager() && employeeIds != null && !employeeIds.isEmpty()) {
            // Manager sees team headcount
            total = employeeRepository.countByTenantIdAndIdIn(tenantId, employeeIds);
            newJoinees = employeeRepository.countByTenantIdAndIdInAndJoiningDateBetween(
                    tenantId, employeeIds, monthStart, today);

            // Get department distribution for team
            List<Object[]> deptCounts = employeeRepository.findDepartmentDistributionForEmployees(tenantId, employeeIds);
            departmentDistribution = deptCounts.stream()
                    .map(row -> DepartmentDistribution.builder()
                            .department((String) row[0])
                            .count(((Number) row[1]).longValue())
                            .build())
                    .collect(Collectors.toList());
        } else {
            // Employee sees personal data only
            total = 1L;
            newJoinees = 0L; // Not relevant for personal view
        }

        // Calculate growth percentage (only for admin)
        Double growthPercentage = 0.0;
        if (context.isAdmin() && total > 0) {
            Long previousMonthTotal = total - newJoinees + exits;
            growthPercentage = previousMonthTotal > 0
                    ? ((double) (total - previousMonthTotal) / (double) previousMonthTotal) * 100
                    : 0.0;
        }

        return HeadcountAnalytics.builder()
                .total(total)
                .newJoinees(newJoinees)
                .exits(exits)
                .growthPercentage(Math.round(growthPercentage * 100.0) / 100.0)
                .trend(trend)
                .departmentDistribution(departmentDistribution)
                .build();
    }

    private UpcomingEvents getUpcomingEvents(DashboardContext context) {
        UUID tenantId = context.getTenantId();
        LocalDate today = LocalDate.now();
        LocalDate next30Days = today.plusDays(30);

        // Upcoming events are shown for admins and managers only (they care about team events)
        // For regular employees, they see events for the whole organization (holidays are common)
        List<BirthdayEvent> birthdays = new ArrayList<>();
        List<AnniversaryEvent> anniversaries = new ArrayList<>();

        if (context.isAdmin() || context.isManager()) {
            // Get upcoming birthdays with department names
            birthdays = employeeRepository
                    .findUpcomingBirthdaysWithDepartment(tenantId, today, next30Days).stream()
                    .filter(row -> {
                        // For manager, filter to only team members
                        if (context.isManager() && context.getTargetEmployeeIds() != null) {
                            UUID empId = (UUID) row[0];
                            return context.getTargetEmployeeIds().contains(empId);
                        }
                        return true; // Admin sees all
                    })
                    .map(row -> {
                        // row: [id, first_name, middle_name, last_name, date_of_birth, department_name]
                        String firstName = (String) row[1];
                        String middleName = (String) row[2];
                        String lastName = (String) row[3];
                        LocalDate dateOfBirth = ((java.sql.Date) row[4]).toLocalDate();
                        String departmentName = (String) row[5];

                        String fullName = firstName +
                                (middleName != null && !middleName.isEmpty() ? " " + middleName : "") +
                                (lastName != null && !lastName.isEmpty() ? " " + lastName : "");

                        return BirthdayEvent.builder()
                                .employeeName(fullName)
                                .date(dateOfBirth.format(DateTimeFormatter.ofPattern("MMM dd")))
                                .department(departmentName)
                                .build();
                    })
                    .collect(Collectors.toList());

            // Get upcoming work anniversaries with department names
            anniversaries = employeeRepository
                    .findUpcomingAnniversariesWithDepartment(tenantId, today, next30Days).stream()
                    .filter(row -> {
                        // For manager, filter to only team members
                        if (context.isManager() && context.getTargetEmployeeIds() != null) {
                            UUID empId = (UUID) row[0];
                            return context.getTargetEmployeeIds().contains(empId);
                        }
                        return true; // Admin sees all
                    })
                    .map(row -> {
                        // row: [id, first_name, middle_name, last_name, joining_date, department_name]
                        String firstName = (String) row[1];
                        String middleName = (String) row[2];
                        String lastName = (String) row[3];
                        LocalDate joiningDate = ((java.sql.Date) row[4]).toLocalDate();
                        String departmentName = (String) row[5];

                        String fullName = firstName +
                                (middleName != null && !middleName.isEmpty() ? " " + middleName : "") +
                                (lastName != null && !lastName.isEmpty() ? " " + lastName : "");

                        int years = today.getYear() - joiningDate.getYear();
                        return AnniversaryEvent.builder()
                                .employeeName(fullName)
                                .date(joiningDate.format(DateTimeFormatter.ofPattern("MMM dd")))
                                .years(years)
                                .department(departmentName)
                                .build();
                    })
                    .collect(Collectors.toList());
        }

        // Get upcoming holidays (everyone can see holidays)
        List<HolidayEvent> holidays = holidayRepository
                .findAllByTenantIdAndHolidayDateBetween(tenantId, today, next30Days).stream()
                .map(holiday -> HolidayEvent.builder()
                        .name(holiday.getHolidayName())
                        .date(holiday.getHolidayDate().format(DateTimeFormatter.ofPattern("MMM dd, yyyy")))
                        .type(holiday.getHolidayType().name())
                        .build())
                .collect(Collectors.toList());

        return UpcomingEvents.builder()
                .birthdays(birthdays)
                .anniversaries(anniversaries)
                .holidays(holidays)
                .build();
    }

    private String getColorForLeaveType(String leaveType) {
        return switch (leaveType.toUpperCase()) {
            case "ANNUAL", "CASUAL" -> "#10b981";       // Green
            case "SICK" -> "#ef4444";                     // Red
            case "MATERNITY", "PATERNITY" -> "#8b5cf6";  // Purple
            case "COMPENSATORY" -> "#f59e0b";             // Orange
            default -> "#6b7280";                         // Gray
        };
    }
}
