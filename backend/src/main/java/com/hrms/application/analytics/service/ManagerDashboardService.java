package com.hrms.application.analytics.service;

import com.hrms.api.analytics.dto.ManagerDashboardResponse;
import com.hrms.api.analytics.dto.ManagerDashboardResponse.*;
import com.hrms.common.security.SecurityContext;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.employee.Employee;
import com.hrms.domain.leave.LeaveRequest;
import com.hrms.infrastructure.attendance.repository.AttendanceRecordRepository;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import com.hrms.infrastructure.leave.repository.LeaveRequestRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Manager Dashboard Service - Provides team-specific insights for managers
 * Shows metrics about direct and indirect reports
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class ManagerDashboardService {

    private final EmployeeRepository employeeRepository;
    private final AttendanceRecordRepository attendanceRepository;
    private final LeaveRequestRepository leaveRequestRepository;

    /**
     * Get manager dashboard for the currently logged-in manager
     */
    public ManagerDashboardResponse getManagerDashboard() {
        UUID tenantId = TenantContext.getCurrentTenant();
        UUID managerId = SecurityContext.getCurrentEmployeeId();

        if (managerId == null) {
            throw new IllegalStateException("Current user is not linked to an employee record");
        }

        return getManagerDashboard(managerId);
    }

    /**
     * Get manager dashboard for a specific manager
     */
    public ManagerDashboardResponse getManagerDashboard(UUID managerId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        LocalDate today = LocalDate.now();

        // Get manager details
        Employee manager = employeeRepository.findByIdAndTenantId(managerId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Manager not found: " + managerId));

        // Get all team member IDs (direct + indirect reports)
        List<UUID> teamMemberIds = getAllReporteeIds(tenantId, managerId);

        log.info("Building manager dashboard for manager: {}, team size: {}", managerId, teamMemberIds.size());

        return ManagerDashboardResponse.builder()
                .managerId(managerId)
                .managerName(manager.getFirstName() + " " + (manager.getLastName() != null ? manager.getLastName() : ""))
                .departmentName(null) // Would need to lookup department by departmentId
                .teamOverview(buildTeamOverview(tenantId, managerId, teamMemberIds, today))
                .teamAttendance(buildTeamAttendance(tenantId, teamMemberIds, today))
                .teamLeave(buildTeamLeave(tenantId, teamMemberIds, today))
                .teamPerformance(buildTeamPerformance(tenantId, teamMemberIds))
                .actionItems(buildActionItems(tenantId, managerId, teamMemberIds))
                .teamMembers(buildTeamMembersList(tenantId, teamMemberIds, today))
                .teamAlerts(buildTeamAlerts(tenantId, teamMemberIds))
                .build();
    }

    private List<UUID> getAllReporteeIds(UUID tenantId, UUID managerId) {
        List<UUID> allReportees = new ArrayList<>();
        List<UUID> currentLevel = List.of(managerId);

        // Traverse the hierarchy up to 10 levels deep
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

    private TeamOverview buildTeamOverview(UUID tenantId, UUID managerId, List<UUID> teamMemberIds, LocalDate today) {
        if (teamMemberIds.isEmpty()) {
            return TeamOverview.builder()
                    .directReports(0)
                    .totalTeamSize(0)
                    .activeMembers(0)
                    .onLeave(0)
                    .onProbation(0)
                    .newJoinersThisMonth(0)
                    .exitsThisMonth(0)
                    .teamHealthScore(BigDecimal.ZERO)
                    .teamHealthStatus("N/A")
                    .hierarchyLevels(0)
                    .avgSpanOfControl(BigDecimal.ZERO)
                    .build();
        }

        // Direct reports
        List<UUID> directReports = employeeRepository.findEmployeeIdsByManagerIds(tenantId, List.of(managerId));

        // Active members
        Long activeCount = employeeRepository.countByTenantIdAndIdIn(tenantId, teamMemberIds);

        // On leave today
        Long onLeaveToday = leaveRequestRepository.countByTenantIdAndDateAndStatusAndEmployeeIdIn(
                tenantId, today, LeaveRequest.LeaveRequestStatus.APPROVED, teamMemberIds);

        // On probation (simplified - would need probation status tracking)
        Long onProbation = 0L; // Would query employee probation status

        // New joiners this month
        LocalDate monthStart = today.withDayOfMonth(1);
        Long newJoiners = employeeRepository.countByTenantIdAndIdInAndJoiningDateBetween(
                tenantId, teamMemberIds, monthStart, today);

        // Calculate team health score (simplified composite)
        BigDecimal attendanceRate = calculateTeamAttendanceRate(tenantId, teamMemberIds, today);
        BigDecimal teamHealthScore = attendanceRate.multiply(BigDecimal.valueOf(0.4))
                .add(BigDecimal.valueOf(80).multiply(BigDecimal.valueOf(0.3))) // Placeholder performance
                .add(BigDecimal.valueOf(75).multiply(BigDecimal.valueOf(0.3))); // Placeholder engagement

        String healthStatus;
        if (teamHealthScore.compareTo(BigDecimal.valueOf(80)) >= 0) healthStatus = "EXCELLENT";
        else if (teamHealthScore.compareTo(BigDecimal.valueOf(60)) >= 0) healthStatus = "GOOD";
        else if (teamHealthScore.compareTo(BigDecimal.valueOf(40)) >= 0) healthStatus = "NEEDS_ATTENTION";
        else healthStatus = "CRITICAL";

        return TeamOverview.builder()
                .directReports(directReports.size())
                .totalTeamSize(teamMemberIds.size())
                .activeMembers(activeCount.intValue())
                .onLeave(onLeaveToday.intValue())
                .onProbation(onProbation.intValue())
                .newJoinersThisMonth(newJoiners.intValue())
                .exitsThisMonth(0) // Would need exit tracking
                .teamHealthScore(teamHealthScore.setScale(1, RoundingMode.HALF_UP))
                .teamHealthStatus(healthStatus)
                .hierarchyLevels(calculateHierarchyLevels(tenantId, managerId))
                .avgSpanOfControl(BigDecimal.valueOf(directReports.size()))
                .build();
    }

    private int calculateHierarchyLevels(UUID tenantId, UUID managerId) {
        int levels = 0;
        List<UUID> currentLevel = List.of(managerId);

        while (!currentLevel.isEmpty() && levels < 10) {
            List<UUID> nextLevel = employeeRepository.findEmployeeIdsByManagerIds(tenantId, currentLevel);
            if (nextLevel.isEmpty()) break;
            levels++;
            currentLevel = nextLevel;
        }

        return levels;
    }

    private BigDecimal calculateTeamAttendanceRate(UUID tenantId, List<UUID> teamMemberIds, LocalDate date) {
        if (teamMemberIds.isEmpty()) return BigDecimal.ZERO;

        Long present = attendanceRepository.countByTenantIdAndDateAndEmployeeIdIn(tenantId, date, teamMemberIds);
        return BigDecimal.valueOf(present * 100.0 / teamMemberIds.size())
                .setScale(1, RoundingMode.HALF_UP);
    }

    private TeamAttendance buildTeamAttendance(UUID tenantId, List<UUID> teamMemberIds, LocalDate today) {
        if (teamMemberIds.isEmpty()) {
            return TeamAttendance.builder()
                    .presentToday(0)
                    .absentToday(0)
                    .workFromHomeToday(0)
                    .onLeaveToday(0)
                    .lateToday(0)
                    .weeklyAttendanceRate(BigDecimal.ZERO)
                    .monthlyAttendanceRate(BigDecimal.ZERO)
                    .avgWorkingHours(BigDecimal.ZERO)
                    .weeklyTrend(new ArrayList<>())
                    .attendanceIssues(new ArrayList<>())
                    .build();
        }

        // Today's attendance
        Long presentToday = attendanceRepository.countByTenantIdAndDateAndEmployeeIdIn(tenantId, today, teamMemberIds);
        Long onLeaveToday = leaveRequestRepository.countByTenantIdAndDateAndStatusAndEmployeeIdIn(
                tenantId, today, LeaveRequest.LeaveRequestStatus.APPROVED, teamMemberIds);
        Long lateToday = attendanceRepository.countByTenantIdAndDateAndOnTimeAndEmployeeIdIn(tenantId, today, teamMemberIds);
        Long absentToday = Math.max(0, teamMemberIds.size() - presentToday - onLeaveToday);

        // Weekly attendance rate
        LocalDate weekStart = today.with(DayOfWeek.MONDAY);
        BigDecimal weeklyRate = calculateWeeklyAttendanceRate(tenantId, teamMemberIds, weekStart, today);

        // Monthly attendance rate
        LocalDate monthStart = today.withDayOfMonth(1);
        BigDecimal monthlyRate = calculateMonthlyAttendanceRate(tenantId, teamMemberIds, monthStart, today);

        // 7-day trend
        List<DailyAttendance> weeklyTrend = new ArrayList<>();
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("MMM dd");
        for (int i = 6; i >= 0; i--) {
            LocalDate date = today.minusDays(i);
            Long present = attendanceRepository.countByTenantIdAndDateAndEmployeeIdIn(tenantId, date, teamMemberIds);
            Long onLeave = leaveRequestRepository.countByTenantIdAndDateAndStatusAndEmployeeIdIn(
                    tenantId, date, LeaveRequest.LeaveRequestStatus.APPROVED, teamMemberIds);

            weeklyTrend.add(DailyAttendance.builder()
                    .date(date.format(formatter))
                    .dayOfWeek(date.getDayOfWeek().name().substring(0, 3))
                    .present(present.intValue())
                    .absent((int) Math.max(0, teamMemberIds.size() - present - onLeave))
                    .onLeave(onLeave.intValue())
                    .attendanceRate(teamMemberIds.size() > 0 ?
                            BigDecimal.valueOf(present * 100.0 / teamMemberIds.size()).setScale(1, RoundingMode.HALF_UP) :
                            BigDecimal.ZERO)
                    .build());
        }

        return TeamAttendance.builder()
                .presentToday(presentToday.intValue())
                .absentToday(absentToday.intValue())
                .workFromHomeToday(0) // Would need WFH tracking
                .onLeaveToday(onLeaveToday.intValue())
                .lateToday((int) (presentToday - lateToday))
                .totalLateArrivals(0)
                .totalEarlyDepartures(0)
                .weeklyAttendanceRate(weeklyRate)
                .monthlyAttendanceRate(monthlyRate)
                .monthlyAttendanceChange(BigDecimal.ZERO)
                .avgWorkingHours(BigDecimal.valueOf(8.2)) // Placeholder
                .weeklyTrend(weeklyTrend)
                .attendanceIssues(new ArrayList<>()) // Would identify patterns
                .build();
    }

    private BigDecimal calculateWeeklyAttendanceRate(UUID tenantId, List<UUID> teamMemberIds, LocalDate start, LocalDate end) {
        long totalDays = 0;
        long presentDays = 0;

        for (LocalDate date = start; !date.isAfter(end); date = date.plusDays(1)) {
            if (date.getDayOfWeek() != DayOfWeek.SATURDAY && date.getDayOfWeek() != DayOfWeek.SUNDAY) {
                totalDays += teamMemberIds.size();
                presentDays += attendanceRepository.countByTenantIdAndDateAndEmployeeIdIn(tenantId, date, teamMemberIds);
            }
        }

        if (totalDays == 0) return BigDecimal.ZERO;
        return BigDecimal.valueOf(presentDays * 100.0 / totalDays).setScale(1, RoundingMode.HALF_UP);
    }

    private BigDecimal calculateMonthlyAttendanceRate(UUID tenantId, List<UUID> teamMemberIds, LocalDate start, LocalDate end) {
        return calculateWeeklyAttendanceRate(tenantId, teamMemberIds, start, end);
    }

    private TeamLeave buildTeamLeave(UUID tenantId, List<UUID> teamMemberIds, LocalDate today) {
        if (teamMemberIds.isEmpty()) {
            return TeamLeave.builder()
                    .pendingApprovals(0)
                    .pendingLeaveRequests(new ArrayList<>())
                    .onLeaveToday(0)
                    .upcomingLeaveThisWeek(0)
                    .upcomingLeaveThisMonth(0)
                    .avgLeaveUtilization(BigDecimal.ZERO)
                    .teamMembersLowLeaveBalance(0)
                    .leavePatterns(new ArrayList<>())
                    .upcomingLeaves(new ArrayList<>())
                    .build();
        }

        // Pending approvals
        Long pendingCount = leaveRequestRepository.countByTenantIdAndStatusAndEmployeeIdIn(
                tenantId, LeaveRequest.LeaveRequestStatus.PENDING, teamMemberIds);

        // On leave today
        Long onLeaveToday = leaveRequestRepository.countByTenantIdAndDateAndStatusAndEmployeeIdIn(
                tenantId, today, LeaveRequest.LeaveRequestStatus.APPROVED, teamMemberIds);

        // Upcoming leave this week
        LocalDate weekEnd = today.with(DayOfWeek.SUNDAY);
        Long upcomingWeek = leaveRequestRepository.countByTenantIdAndDateRangeAndStatusAndEmployeeIdIn(
                tenantId, today.plusDays(1), weekEnd, LeaveRequest.LeaveRequestStatus.APPROVED, teamMemberIds);

        // Upcoming leave this month
        LocalDate monthEnd = today.withDayOfMonth(today.lengthOfMonth());
        Long upcomingMonth = leaveRequestRepository.countByTenantIdAndDateRangeAndStatusAndEmployeeIdIn(
                tenantId, today.plusDays(1), monthEnd, LeaveRequest.LeaveRequestStatus.APPROVED, teamMemberIds);

        return TeamLeave.builder()
                .pendingApprovals(pendingCount.intValue())
                .pendingLeaveRequests(new ArrayList<>()) // Would fetch actual pending requests
                .onLeaveToday(onLeaveToday.intValue())
                .upcomingLeaveThisWeek(upcomingWeek.intValue())
                .upcomingLeaveThisMonth(upcomingMonth.intValue())
                .avgLeaveUtilization(BigDecimal.valueOf(65)) // Placeholder
                .teamMembersLowLeaveBalance(0)
                .leavePatterns(new ArrayList<>())
                .upcomingLeaves(new ArrayList<>())
                .build();
    }

    private TeamPerformance buildTeamPerformance(UUID tenantId, List<UUID> teamMemberIds) {
        // This would need integration with performance management module
        return TeamPerformance.builder()
                .exceeding(0)
                .meeting(0)
                .needsImprovement(0)
                .notRated(teamMemberIds.size())
                .avgPerformanceRating(BigDecimal.ZERO)
                .ratingChangeFromLastCycle(BigDecimal.ZERO)
                .totalGoals(0)
                .goalsOnTrack(0)
                .goalsAtRisk(0)
                .goalsCompleted(0)
                .goalCompletionRate(BigDecimal.ZERO)
                .oneOnOnesScheduled(0)
                .oneOnOnesOverdue(0)
                .oneOnOnesCompletedThisMonth(0)
                .pendingFeedbackRequests(0)
                .avgFeedbackScore(BigDecimal.ZERO)
                .pendingTrainings(0)
                .trainingCompletionRate(BigDecimal.ZERO)
                .performanceConcerns(new ArrayList<>())
                .build();
    }

    private ActionItems buildActionItems(UUID tenantId, UUID managerId, List<UUID> teamMemberIds) {
        Long pendingLeave = leaveRequestRepository.countByTenantIdAndStatusAndEmployeeIdIn(
                tenantId, LeaveRequest.LeaveRequestStatus.PENDING, teamMemberIds);

        return ActionItems.builder()
                .leaveApprovals(pendingLeave.intValue())
                .expenseApprovals(0) // Would need expense module
                .timesheetApprovals(0) // Would need timesheet module
                .overtimeApprovals(0) // Would need overtime module
                .performanceReviewsDue(0)
                .probationReviewsDue(0)
                .oneOnOnesDue(0)
                .overdueApprovals(0)
                .overdueReviews(0)
                .totalActionItems(pendingLeave.intValue())
                .build();
    }

    private List<TeamMemberSummary> buildTeamMembersList(UUID tenantId, List<UUID> teamMemberIds, LocalDate today) {
        if (teamMemberIds.isEmpty()) {
            return new ArrayList<>();
        }

        return teamMemberIds.stream()
                .limit(20) // Limit to top 20 for performance
                .map(empId -> {
                    Employee emp = employeeRepository.findByIdAndTenantId(empId, tenantId).orElse(null);
                    if (emp == null) return null;

                    // Check today's status
                    Long present = attendanceRepository.countByTenantIdAndDateAndEmployeeId(tenantId, today, empId);
                    Long onLeave = leaveRequestRepository.countByTenantIdAndDateAndStatusAndEmployeeId(
                            tenantId, today, LeaveRequest.LeaveRequestStatus.APPROVED, empId);

                    String todayStatus;
                    if (present > 0) todayStatus = "PRESENT";
                    else if (onLeave > 0) todayStatus = "ON_LEAVE";
                    else todayStatus = "ABSENT";

                    int tenureMonths = emp.getJoiningDate() != null ?
                            (int) java.time.temporal.ChronoUnit.MONTHS.between(emp.getJoiningDate(), today) : 0;

                    return TeamMemberSummary.builder()
                            .employeeId(emp.getId())
                            .employeeName(emp.getFirstName() + " " + (emp.getLastName() != null ? emp.getLastName() : ""))
                            .designation(emp.getDesignation())
                            .profilePicUrl(null)
                            .status(emp.getStatus().name())
                            .todayStatus(todayStatus)
                            .performanceRating(BigDecimal.ZERO)
                            .attendanceRate(BigDecimal.valueOf(90)) // Placeholder
                            .hasAttritionRisk(false)
                            .pendingLeaveBalance(0) // Would need leave balance
                            .joiningDate(emp.getJoiningDate())
                            .tenureMonths(tenureMonths)
                            .build();
                })
                .filter(java.util.Objects::nonNull)
                .collect(Collectors.toList());
    }

    private List<TeamAlert> buildTeamAlerts(UUID tenantId, List<UUID> teamMemberIds) {
        List<TeamAlert> alerts = new ArrayList<>();

        // Check for pending leave approvals
        Long pendingLeave = leaveRequestRepository.countByTenantIdAndStatusAndEmployeeIdIn(
                tenantId, LeaveRequest.LeaveRequestStatus.PENDING, teamMemberIds);

        if (pendingLeave > 0) {
            alerts.add(TeamAlert.builder()
                    .id(UUID.randomUUID().toString())
                    .severity("WARNING")
                    .type("LEAVE")
                    .title("Pending Leave Approvals")
                    .description(pendingLeave + " leave request(s) pending your approval")
                    .employeeId(null)
                    .employeeName(null)
                    .createdAt(LocalDate.now().toString())
                    .actionRequired("Review and approve/reject pending leave requests")
                    .build());
        }

        return alerts;
    }
}
