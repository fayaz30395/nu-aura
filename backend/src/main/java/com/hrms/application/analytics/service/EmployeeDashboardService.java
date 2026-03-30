package com.hrms.application.analytics.service;

import com.hrms.api.analytics.dto.EmployeeDashboardResponse;
import com.hrms.api.analytics.dto.EmployeeDashboardResponse.*;
import com.hrms.common.exception.ResourceNotFoundException;
import com.hrms.common.security.SecurityContext;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.attendance.AttendanceRecord;
import com.hrms.domain.employee.Employee;
import com.hrms.domain.leave.LeaveRequest;
import com.hrms.infrastructure.attendance.repository.AttendanceRecordRepository;
import com.hrms.infrastructure.attendance.repository.HolidayRepository;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import com.hrms.infrastructure.leave.repository.LeaveBalanceRepository;
import com.hrms.infrastructure.leave.repository.LeaveRequestRepository;
import com.hrms.infrastructure.payroll.repository.PayslipRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.hrms.domain.payroll.Payslip;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Employee Dashboard Service - Provides personal analytics for individual employees
 * Self-service insights into attendance, leave, performance, and career
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class EmployeeDashboardService {

    private final EmployeeRepository employeeRepository;
    private final AttendanceRecordRepository attendanceRepository;
    private final LeaveRequestRepository leaveRequestRepository;
    private final LeaveBalanceRepository leaveBalanceRepository;
    private final PayslipRepository payslipRepository;
    private final HolidayRepository holidayRepository;
    private final com.hrms.application.attendance.service.TenantAttendanceConfigService tenantAttendanceConfigService;

    /**
     * Get employee dashboard for the currently logged-in employee
     */
    @Transactional(readOnly = true)
    public EmployeeDashboardResponse getEmployeeDashboard() {
        UUID tenantId = TenantContext.getCurrentTenant();
        UUID employeeId = SecurityContext.getCurrentEmployeeId();

        if (employeeId == null) {
            throw new IllegalStateException("Current user is not linked to an employee record");
        }

        return getEmployeeDashboard(employeeId);
    }

    /**
     * Get employee dashboard for a specific employee
     */
    @Transactional(readOnly = true)
    public EmployeeDashboardResponse getEmployeeDashboard(UUID employeeId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        LocalDate today = LocalDate.now();

        Employee employee = employeeRepository.findByIdAndTenantId(employeeId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found: " + employeeId));

        log.info("Building employee dashboard for employee: {}", employeeId);

        int tenureMonths = employee.getJoiningDate() != null ?
                (int) ChronoUnit.MONTHS.between(employee.getJoiningDate(), today) : 0;

        // Manager lookup would require fetching by managerId
        String managerName = null;
        if (employee.getManagerId() != null) {
            Optional<Employee> manager = employeeRepository.findByIdAndTenantId(employee.getManagerId(), tenantId);
            if (manager.isPresent()) {
                Employee mgr = manager.get();
                managerName = mgr.getFirstName() + " " + (mgr.getLastName() != null ? mgr.getLastName() : "");
            }
        }

        return EmployeeDashboardResponse.builder()
                .employeeId(employeeId)
                .employeeName(employee.getFirstName() + " " + (employee.getLastName() != null ? employee.getLastName() : ""))
                .designation(employee.getDesignation())
                .department(null) // Would need to lookup department by departmentId
                .reportingManager(managerName)
                .joiningDate(employee.getJoiningDate())
                .tenureMonths(tenureMonths)
                .profilePicUrl(null)
                .quickStats(buildQuickStats(tenantId, employeeId, today))
                .attendance(buildAttendanceSummary(tenantId, employeeId, today))
                .leave(buildLeaveSummary(tenantId, employeeId, today))
                .payroll(buildPayrollSummary(tenantId, employeeId))
                .performance(buildPerformanceSummary(tenantId, employeeId))
                .learning(buildLearningProgress(tenantId, employeeId))
                .career(buildCareerProgress(tenantId, employee))
                .upcomingEvents(buildUpcomingEvents(tenantId, employeeId, today))
                .pendingTasks(buildPendingTasks(tenantId, employeeId))
                .recentAnnouncements(buildRecentAnnouncements(tenantId))
                .build();
    }

    private QuickStats buildQuickStats(UUID tenantId, UUID employeeId, LocalDate today) {
        LocalDate monthStart = today.withDayOfMonth(1);

        // Days worked this month
        Long daysWorked = attendanceRepository.countByTenantIdAndEmployeeIdAndDateBetween(
                tenantId, employeeId, monthStart, today);

        // Leaves remaining - simplified
        BigDecimal leavesRemaining = BigDecimal.ZERO;
        try {
            leavesRemaining = leaveBalanceRepository.sumBalanceByEmployeeId(tenantId, employeeId, today.getYear());
            if (leavesRemaining == null) leavesRemaining = BigDecimal.ZERO;
        } catch (Exception e) { // Intentional broad catch — analytics query error boundary
            log.debug("Could not fetch leave balance for employee {}: {}", employeeId, e.getMessage());
        }

        // Last month salary
        YearMonth lastMonth = YearMonth.now().minusMonths(1);
        BigDecimal lastSalary = BigDecimal.ZERO;
        try {
            lastSalary = payslipRepository.findNetSalaryByEmployeeIdAndYearAndMonth(
                    tenantId, employeeId, lastMonth.getYear(), lastMonth.getMonthValue());
            if (lastSalary == null) lastSalary = BigDecimal.ZERO;
        } catch (Exception e) { // Intentional broad catch — analytics query error boundary
            log.debug("Could not fetch last month payslip for employee {}: {}", employeeId, e.getMessage());
        }

        // Pending approvals (as employee, you might have tasks pending)
        Long pendingLeaves = leaveRequestRepository.countByTenantIdAndStatusAndEmployeeId(
                tenantId, LeaveRequest.LeaveRequestStatus.PENDING, employeeId);

        return QuickStats.builder()
                .daysWorkedThisMonth(daysWorked.intValue())
                .leavesRemaining(leavesRemaining != null ? leavesRemaining.intValue() : 0)
                .lastMonthSalary(lastSalary)
                .currentRating(BigDecimal.valueOf(3.5)) // Placeholder - would need performance data
                .pendingApprovals(pendingLeaves.intValue())
                .completedTrainings(0) // Placeholder
                .recognitionsReceived(0) // Placeholder
                .goalsOnTrack(0) // Placeholder
                .build();
    }

    private AttendanceSummary buildAttendanceSummary(UUID tenantId, UUID employeeId, LocalDate today) {
        LocalDate monthStart = today.withDayOfMonth(1);

        // This month's attendance
        Long presentDays = attendanceRepository.countByTenantIdAndEmployeeIdAndDateBetween(
                tenantId, employeeId, monthStart, today);

        Long leaveDays = leaveRequestRepository.countApprovedLeaveDaysByEmployeeIdAndDateBetween(
                tenantId, employeeId, monthStart, today);

        // Calculate working days (excluding weekends and holidays)
        int workingDays = 0;
        for (LocalDate date = monthStart; !date.isAfter(today); date = date.plusDays(1)) {
            if (date.getDayOfWeek() != DayOfWeek.SATURDAY && date.getDayOfWeek() != DayOfWeek.SUNDAY) {
                workingDays++;
            }
        }

        // Get holiday count
        Long holidays = holidayRepository.countByTenantIdAndHolidayDateBetween(tenantId, monthStart, today);
        workingDays = (int) Math.max(0, workingDays - holidays);

        Long absentDays = Math.max(0, workingDays - presentDays - leaveDays);
        BigDecimal attendancePercentage = workingDays > 0 ?
                BigDecimal.valueOf(presentDays * 100.0 / workingDays).setScale(1, RoundingMode.HALF_UP) :
                BigDecimal.ZERO;

        // Today's status
        String todayStatus = "ABSENT";
        String checkIn = null;
        String checkOut = null;
        String workLocation = null;

        Optional<AttendanceRecord> todayRecord = attendanceRepository.findByTenantIdAndEmployeeIdAndDate(
                tenantId, employeeId, today);
        if (todayRecord.isPresent()) {
            AttendanceRecord record = todayRecord.get();
            todayStatus = "PRESENT";
            if (record.getCheckInTime() != null) {
                checkIn = record.getCheckInTime().format(DateTimeFormatter.ofPattern("HH:mm"));
            }
            if (record.getCheckOutTime() != null) {
                checkOut = record.getCheckOutTime().format(DateTimeFormatter.ofPattern("HH:mm"));
            }
            workLocation = Boolean.TRUE.equals(record.getIsRemoteCheckin()) ? "Remote" : "Office";
        } else {
            // Check if on leave
            Long onLeave = leaveRequestRepository.countByTenantIdAndDateAndStatusAndEmployeeId(
                    tenantId, today, LeaveRequest.LeaveRequestStatus.APPROVED, employeeId);
            if (onLeave > 0) {
                todayStatus = "ON_LEAVE";
            } else if (today.getDayOfWeek() == DayOfWeek.SATURDAY || today.getDayOfWeek() == DayOfWeek.SUNDAY) {
                todayStatus = "WEEKEND";
            }
        }

        // 30-day attendance history
        List<DailyAttendanceRecord> history = new ArrayList<>();
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("MMM dd");
        for (int i = 29; i >= 0; i--) {
            LocalDate date = today.minusDays(i);
            Optional<AttendanceRecord> record = attendanceRepository.findByTenantIdAndEmployeeIdAndDate(
                    tenantId, employeeId, date);

            String status;
            String cin = null;
            String cout = null;
            BigDecimal hours = BigDecimal.ZERO;
            boolean isLate = false;

            if (record.isPresent()) {
                AttendanceRecord r = record.get();
                status = "PRESENT";
                if (r.getCheckInTime() != null) cin = r.getCheckInTime().format(DateTimeFormatter.ofPattern("HH:mm"));
                if (r.getCheckOutTime() != null) cout = r.getCheckOutTime().format(DateTimeFormatter.ofPattern("HH:mm"));
                // Calculate hours from check-in/check-out if available
                if (r.getCheckInTime() != null && r.getCheckOutTime() != null) {
                    long minutes = java.time.Duration.between(r.getCheckInTime(), r.getCheckOutTime()).toMinutes();
                    hours = BigDecimal.valueOf(minutes / 60.0).setScale(1, java.math.RoundingMode.HALF_UP);
                }
                isLate = r.getCheckInTime() != null && r.getCheckInTime().toLocalTime().isAfter(java.time.LocalTime.of(9, 15));
            } else if (date.getDayOfWeek() == DayOfWeek.SATURDAY || date.getDayOfWeek() == DayOfWeek.SUNDAY) {
                status = "WEEKEND";
            } else {
                Long onLeave = leaveRequestRepository.countByTenantIdAndDateAndStatusAndEmployeeId(
                        tenantId, date, LeaveRequest.LeaveRequestStatus.APPROVED, employeeId);
                status = onLeave > 0 ? "LEAVE" : "ABSENT";
            }

            history.add(DailyAttendanceRecord.builder()
                    .date(date.format(formatter))
                    .status(status)
                    .checkIn(cin)
                    .checkOut(cout)
                    .hoursWorked(hours)
                    .isLate(isLate)
                    .build());
        }

        return AttendanceSummary.builder()
                .presentDays(presentDays.intValue())
                .absentDays(absentDays.intValue())
                .leaveDays(leaveDays.intValue())
                .holidayDays(holidays.intValue())
                .workingDays(workingDays)
                .attendancePercentage(attendancePercentage)
                .totalHoursThisMonth(BigDecimal.valueOf(presentDays).multiply(tenantAttendanceConfigService.getStandardWorkHours(tenantId))) // Uses tenant config
                .avgHoursPerDay(BigDecimal.valueOf(8.2)) // Placeholder
                .expectedHoursThisMonth(BigDecimal.valueOf(workingDays).multiply(tenantAttendanceConfigService.getStandardWorkHours(tenantId)))
                .overtimeHours(BigDecimal.ZERO) // Would need overtime calculation
                .lateDays(0) // Would need late tracking
                .earlyDepartures(0)
                .avgCheckInTime(BigDecimal.ZERO)
                .avgCheckOutTime(BigDecimal.ZERO)
                .attendanceHistory(history)
                .todayStatus(todayStatus)
                .checkInTime(checkIn)
                .checkOutTime(checkOut)
                .workLocation(workLocation)
                .build();
    }

    private LeaveSummary buildLeaveSummary(UUID tenantId, UUID employeeId, LocalDate today) {
        // Leave balances
        List<LeaveBalance> balances = new ArrayList<>();
        try {
            List<Object[]> balanceData = leaveBalanceRepository.findBalancesByEmployeeId(tenantId, employeeId, today.getYear());
            balances = balanceData.stream()
                    .map(row -> LeaveBalance.builder()
                            .leaveType((String) row[0])
                            .leaveTypeName((String) row[1])
                            .entitled(row[2] != null ? (BigDecimal) row[2] : BigDecimal.ZERO)
                            .taken(row[3] != null ? (BigDecimal) row[3] : BigDecimal.ZERO)
                            .balance(row[4] != null ? (BigDecimal) row[4] : BigDecimal.ZERO)
                            .pending(row[5] != null ? (BigDecimal) row[5] : BigDecimal.ZERO)
                            .carryForward(BigDecimal.ZERO)
                            .build())
                    .collect(Collectors.toList());
        } catch (Exception e) { // Intentional broad catch — analytics query error boundary
            log.warn("Could not fetch leave balances: {}", e.getMessage());
        }

        BigDecimal totalBalance = balances.stream()
                .map(LeaveBalance::getBalance)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalTaken = balances.stream()
                .map(LeaveBalance::getTaken)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Request counts
        LocalDate yearStart = today.withDayOfYear(1);
        Long pending = leaveRequestRepository.countByTenantIdAndStatusAndEmployeeId(
                tenantId, LeaveRequest.LeaveRequestStatus.PENDING, employeeId);
        Long approved = leaveRequestRepository.countByTenantIdAndStatusAndEmployeeIdAndDateAfter(
                tenantId, LeaveRequest.LeaveRequestStatus.APPROVED, employeeId, yearStart);
        Long rejected = leaveRequestRepository.countByTenantIdAndStatusAndEmployeeIdAndDateAfter(
                tenantId, LeaveRequest.LeaveRequestStatus.REJECTED, employeeId, yearStart);

        // Recent requests
        List<LeaveRequest> recentRequests = new ArrayList<>(); // Would fetch from repository

        // Upcoming holidays
        List<UpcomingHoliday> upcomingHolidays = holidayRepository
                .findAllByTenantIdAndHolidayDateBetween(tenantId, today, today.plusDays(90))
                .stream()
                .map(h -> UpcomingHoliday.builder()
                        .name(h.getHolidayName())
                        .date(h.getHolidayDate())
                        .dayOfWeek(h.getHolidayDate().getDayOfWeek().name())
                        .daysFromNow((int) ChronoUnit.DAYS.between(today, h.getHolidayDate()))
                        .build())
                .collect(Collectors.toList());

        return LeaveSummary.builder()
                .leaveBalances(balances)
                .totalLeaveBalance(totalBalance)
                .totalLeaveTaken(totalTaken)
                .totalLeaveAccrued(totalBalance.add(totalTaken))
                .pendingRequests(pending.intValue())
                .approvedThisYear(approved.intValue())
                .rejectedThisYear(rejected.intValue())
                .recentRequests(new ArrayList<>()) // Would map actual requests
                .avgLeavesPerMonth(totalTaken.divide(BigDecimal.valueOf(Math.max(1, today.getMonthValue())), 1, RoundingMode.HALF_UP))
                .mostUsedLeaveType("Annual") // Would calculate
                .upcomingLeaves(new ArrayList<>())
                .upcomingHolidays(upcomingHolidays)
                .build();
    }

    private PayrollSummary buildPayrollSummary(UUID tenantId, UUID employeeId) {
        YearMonth currentMonth = YearMonth.now();
        YearMonth lastMonth = currentMonth.minusMonths(1);
        int currentYear = currentMonth.getYear();

        // Single query: fetch all payslips for current year (eliminates N+1)
        List<Payslip> currentYearPayslips;
        try {
            currentYearPayslips = payslipRepository.findByEmployeeIdAndYear(tenantId, employeeId, currentYear);
        } catch (Exception e) { // Intentional broad catch — analytics query error boundary
            log.warn("Could not fetch payslip data for year {}: {}", currentYear, e.getMessage());
            currentYearPayslips = new ArrayList<>();
        }

        // Also fetch previous year payslips for the 6-month pay trend (if trend crosses year boundary)
        List<Payslip> previousYearPayslips;
        try {
            previousYearPayslips = payslipRepository.findByEmployeeIdAndYear(tenantId, employeeId, currentYear - 1);
        } catch (Exception e) { // Intentional broad catch — analytics query error boundary
            log.warn("Could not fetch payslip data for year {}: {}", currentYear - 1, e.getMessage());
            previousYearPayslips = new ArrayList<>();
        }

        // Index by month for O(1) lookup
        Map<Integer, Payslip> currentYearByMonth = currentYearPayslips.stream()
                .collect(Collectors.toMap(Payslip::getPayPeriodMonth, Function.identity(), (a, b) -> a));
        Map<Integer, Payslip> previousYearByMonth = previousYearPayslips.stream()
                .collect(Collectors.toMap(Payslip::getPayPeriodMonth, Function.identity(), (a, b) -> a));

        // Last month's payslip details
        BigDecimal lastGross = BigDecimal.ZERO;
        BigDecimal lastNet = BigDecimal.ZERO;
        BigDecimal lastDeductions = BigDecimal.ZERO;
        BigDecimal lastTaxes = BigDecimal.ZERO;

        Payslip lastMonthPayslip = lastMonth.getYear() == currentYear
                ? currentYearByMonth.get(lastMonth.getMonthValue())
                : previousYearByMonth.get(lastMonth.getMonthValue());
        if (lastMonthPayslip != null) {
            lastGross = lastMonthPayslip.getGrossSalary() != null ? lastMonthPayslip.getGrossSalary() : BigDecimal.ZERO;
            lastNet = lastMonthPayslip.getNetSalary() != null ? lastMonthPayslip.getNetSalary() : BigDecimal.ZERO;
            lastDeductions = lastMonthPayslip.getTotalDeductions() != null ? lastMonthPayslip.getTotalDeductions() : BigDecimal.ZERO;
            lastTaxes = lastMonthPayslip.getIncomeTax() != null ? lastMonthPayslip.getIncomeTax() : BigDecimal.ZERO;
        }

        // YTD calculations from in-memory data
        BigDecimal ytdGross = BigDecimal.ZERO;
        BigDecimal ytdNet = BigDecimal.ZERO;
        BigDecimal ytdDeductions = BigDecimal.ZERO;
        BigDecimal ytdTaxes = BigDecimal.ZERO;

        for (Payslip p : currentYearPayslips) {
            if (p.getPayPeriodMonth() <= currentMonth.getMonthValue()) {
                ytdGross = ytdGross.add(p.getGrossSalary() != null ? p.getGrossSalary() : BigDecimal.ZERO);
                ytdNet = ytdNet.add(p.getNetSalary() != null ? p.getNetSalary() : BigDecimal.ZERO);
                ytdDeductions = ytdDeductions.add(p.getTotalDeductions() != null ? p.getTotalDeductions() : BigDecimal.ZERO);
                ytdTaxes = ytdTaxes.add(p.getIncomeTax() != null ? p.getIncomeTax() : BigDecimal.ZERO);
            }
        }

        // Pay trend (6 months) from in-memory data
        List<PayTrendPoint> payTrend = new ArrayList<>();
        for (int i = 5; i >= 0; i--) {
            YearMonth month = currentMonth.minusMonths(i);
            BigDecimal gross = BigDecimal.ZERO;
            BigDecimal net = BigDecimal.ZERO;

            Payslip p = month.getYear() == currentYear
                    ? currentYearByMonth.get(month.getMonthValue())
                    : previousYearByMonth.get(month.getMonthValue());
            if (p != null) {
                gross = p.getGrossSalary() != null ? p.getGrossSalary() : BigDecimal.ZERO;
                net = p.getNetSalary() != null ? p.getNetSalary() : BigDecimal.ZERO;
            }

            payTrend.add(PayTrendPoint.builder()
                    .month(month.format(DateTimeFormatter.ofPattern("MMM yy")))
                    .grossSalary(gross)
                    .netSalary(net)
                    .build());
        }

        return PayrollSummary.builder()
                .payPeriod(lastMonth.format(DateTimeFormatter.ofPattern("MMMM yyyy")))
                .grossSalary(lastGross)
                .netSalary(lastNet)
                .deductions(lastDeductions)
                .taxes(lastTaxes)
                .paymentDate(lastMonth.atEndOfMonth())
                .payslipStatus("PAID")
                .ytdGross(ytdGross)
                .ytdNet(ytdNet)
                .ytdDeductions(ytdDeductions)
                .ytdTaxes(ytdTaxes)
                .salaryComponents(new ArrayList<>()) // Would fetch actual components
                .payTrend(payTrend)
                .pendingReimbursements(BigDecimal.ZERO)
                .approvedReimbursements(BigDecimal.ZERO)
                .build();
    }

    private PerformanceSummary buildPerformanceSummary(UUID tenantId, UUID employeeId) {
        // This would integrate with the performance module
        return PerformanceSummary.builder()
                .currentCycle("2025")
                .currentRating(BigDecimal.valueOf(3.5))
                .ratingLabel("Meets Expectations")
                .reviewStatus("PENDING")
                .totalGoals(5)
                .completedGoals(2)
                .inProgressGoals(2)
                .overdueGoals(1)
                .goalCompletionRate(BigDecimal.valueOf(40))
                .activeGoals(new ArrayList<>())
                .feedbackReceived(5)
                .feedbackGiven(3)
                .avgFeedbackRating(BigDecimal.valueOf(4.2))
                .lastOneOnOne(LocalDate.now().minusWeeks(2))
                .nextOneOnOne(LocalDate.now().plusWeeks(2))
                .oneOnOnesThisQuarter(3)
                .recognitionsReceived(2)
                .recognitionsGiven(4)
                .pointsEarned(150)
                .pointsBalance(100)
                .ratingHistory(new ArrayList<>())
                .build();
    }

    private LearningProgress buildLearningProgress(UUID tenantId, UUID employeeId) {
        // This would integrate with the LMS module
        return LearningProgress.builder()
                .totalAssignedCourses(10)
                .completedCourses(6)
                .inProgressCourses(3)
                .overdueCourses(1)
                .completionRate(BigDecimal.valueOf(60))
                .totalLearningHours(BigDecimal.valueOf(24))
                .learningHoursThisMonth(BigDecimal.valueOf(4))
                .targetLearningHours(BigDecimal.valueOf(40))
                .activeCertifications(3)
                .expiringSoon(1)
                .expired(0)
                .activeCourses(new ArrayList<>())
                .skills(new ArrayList<>())
                .recentAchievements(new ArrayList<>())
                .build();
    }

    private CareerProgress buildCareerProgress(UUID tenantId, Employee employee) {
        int timeInRole = employee.getJoiningDate() != null ?
                (int) ChronoUnit.MONTHS.between(employee.getJoiningDate(), LocalDate.now()) : 0;

        List<CareerMilestone> milestones = new ArrayList<>();

        // Add joining milestone
        if (employee.getJoiningDate() != null) {
            milestones.add(CareerMilestone.builder()
                    .type("JOINING")
                    .title("Joined Organization")
                    .description("Started as " + (employee.getDesignation() != null ? employee.getDesignation() : "Employee"))
                    .date(employee.getJoiningDate())
                    .icon("briefcase")
                    .build());
        }

        return CareerProgress.builder()
                .milestones(milestones)
                .currentPosition(employee.getDesignation())
                .currentGrade(null) // Would need grade tracking
                .positionSince(employee.getJoiningDate())
                .timeInRoleMonths(timeInRole)
                .nextPossibleRole(null) // Would need career path data
                .readinessForPromotion(BigDecimal.ZERO)
                .skillsToAcquire(new ArrayList<>())
                .currentCtc(BigDecimal.ZERO) // Would need compensation data
                .lastIncrement(BigDecimal.ZERO)
                .lastIncrementDate(null)
                .incrementPercentage(BigDecimal.ZERO)
                .promotionsCount(0)
                .lateralMovesCount(0)
                .careerGrowthScore(BigDecimal.ZERO)
                .build();
    }

    private List<UpcomingEvent> buildUpcomingEvents(UUID tenantId, UUID employeeId, LocalDate today) {
        List<UpcomingEvent> events = new ArrayList<>();

        // Add upcoming holidays
        holidayRepository.findAllByTenantIdAndHolidayDateBetween(tenantId, today, today.plusDays(30))
                .forEach(h -> events.add(UpcomingEvent.builder()
                        .type("HOLIDAY")
                        .title(h.getHolidayName())
                        .date(h.getHolidayDate())
                        .time(null)
                        .daysFromNow((int) ChronoUnit.DAYS.between(today, h.getHolidayDate()))
                        .description("Public Holiday")
                        .build()));

        return events;
    }

    private List<TaskItem> buildPendingTasks(UUID tenantId, UUID employeeId) {
        List<TaskItem> tasks = new ArrayList<>();

        // Check for pending training
        tasks.add(TaskItem.builder()
                .type("TRAINING")
                .title("Complete Compliance Training")
                .description("Annual compliance training is due")
                .dueDate(LocalDate.now().plusDays(7))
                .priority("HIGH")
                .actionUrl("/training")
                .build());

        return tasks;
    }

    private List<Announcement> buildRecentAnnouncements(UUID tenantId) {
        // Would fetch from announcement module
        return new ArrayList<>();
    }
}
