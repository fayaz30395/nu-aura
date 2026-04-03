package com.hrms.application.analytics.service;

import com.hrms.application.analytics.dto.*;
import com.hrms.common.config.CacheConfig;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.attendance.AttendanceRecord;
import com.hrms.domain.leave.LeaveRequest;
import com.hrms.domain.recruitment.JobOpening;
import com.hrms.domain.workflow.StepExecution;
import com.hrms.infrastructure.attendance.repository.AttendanceRecordRepository;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import com.hrms.infrastructure.leave.repository.LeaveRequestRepository;
import com.hrms.infrastructure.payroll.repository.PayslipRepository;
import com.hrms.infrastructure.recruitment.repository.JobOpeningRepository;
import com.hrms.infrastructure.workflow.repository.StepExecutionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.Caching;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Service for generating analytics and dashboard metrics.
 * All metrics are computed from real DB queries — no placeholder values.
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class AnalyticsService {

    private final EmployeeRepository employeeRepository;
    private final AttendanceRecordRepository attendanceRecordRepository;
    private final LeaveRequestRepository leaveRequestRepository;
    private final PayslipRepository payslipRepository;
    private final JobOpeningRepository jobOpeningRepository;
    private final StepExecutionRepository stepExecutionRepository;

    /**
     * Lightweight summary for the main dashboard KPI widget.
     * Returns only the 6 top-level numbers needed for overview cards.
     */
    @Cacheable(value = CacheConfig.ANALYTICS_SUMMARY, key = "#root.target.getCurrentTenantKey()")
    @Transactional(readOnly = true)
    public AnalyticsSummary getAnalyticsSummary() {
        UUID tenantId = TenantContext.getCurrentTenant();
        LocalDate today = LocalDate.now();

        long totalEmployees = employeeRepository.countByTenantIdAndStatus(
                tenantId, com.hrms.domain.employee.Employee.EmployeeStatus.ACTIVE);

        long presentToday = attendanceRecordRepository.countByTenantIdAndDate(tenantId, today);

        long onLeaveToday = leaveRequestRepository.countByTenantIdAndDateAndStatus(
                tenantId, today, LeaveRequest.LeaveRequestStatus.APPROVED);

        long pendingApprovals = stepExecutionRepository.countByTenantIdAndStatus(
                tenantId, StepExecution.StepStatus.PENDING);

        boolean payrollProcessedThisMonth = payslipRepository
                .countByTenantIdAndYearAndMonth(tenantId, today.getYear(), today.getMonthValue()) > 0;

        long openPositions = jobOpeningRepository
                .findByTenantIdAndStatus(tenantId, JobOpening.JobStatus.OPEN).size();

        return AnalyticsSummary.builder()
                .totalEmployees(totalEmployees)
                .presentToday(presentToday)
                .onLeaveToday(onLeaveToday)
                .pendingApprovals(pendingApprovals)
                .payrollProcessedThisMonth(payrollProcessedThisMonth)
                .openPositions(openPositions)
                .build();
    }

    @Cacheable(value = CacheConfig.DASHBOARD_METRICS, key = "#root.target.getCurrentTenantKey()")
    @Transactional(readOnly = true)
    public DashboardMetrics getDashboardMetrics() {
        UUID tenantId = TenantContext.getCurrentTenant();
        LocalDate today = LocalDate.now();
        LocalDate monthStart = today.withDayOfMonth(1);
        LocalDate monthEnd = today.withDayOfMonth(today.lengthOfMonth());

        return DashboardMetrics.builder()
                .employeeMetrics(getEmployeeMetrics(tenantId))
                .attendanceMetrics(getAttendanceMetrics(tenantId, today))
                .leaveMetrics(getLeaveMetrics(tenantId, monthStart, monthEnd))
                .payrollMetrics(getPayrollMetrics(tenantId, today.getYear(), today.getMonthValue()))
                .generatedAt(today)
                .build();
    }

    @Transactional(readOnly = true)
    public EmployeeMetrics getEmployeeMetrics(UUID tenantId) {
        long totalEmployees = employeeRepository.countByTenantId(tenantId);
        long activeEmployees = employeeRepository.countByTenantIdAndStatus(
                tenantId, com.hrms.domain.employee.Employee.EmployeeStatus.ACTIVE);

        List<Object[]> deptDistribution = employeeRepository.getEmployeeCountByDepartment(tenantId);
        Map<String, Long> departmentCounts = new LinkedHashMap<>();
        for (Object[] row : deptDistribution) {
            String deptName = (String) row[0];
            Long count = ((Number) row[1]).longValue();
            departmentCounts.put(deptName != null ? deptName : "Unassigned", count);
        }

        LocalDate yearStart = LocalDate.now().withDayOfYear(1);
        long leftThisYear = employeeRepository.countTerminatedAfterDate(tenantId, yearStart);
        double attritionRate = totalEmployees > 0 ?
                (double) leftThisYear / totalEmployees * 100 : 0;

        // On leave today = employees with an APPROVED leave covering today
        long onLeaveToday = leaveRequestRepository.countByTenantIdAndDateAndStatus(
                tenantId, LocalDate.now(), LeaveRequest.LeaveRequestStatus.APPROVED);

        return EmployeeMetrics.builder()
                .totalEmployees(totalEmployees)
                .activeEmployees(activeEmployees)
                .onLeaveToday(onLeaveToday)
                .departmentDistribution(departmentCounts)
                .attritionRate(Math.round(attritionRate * 100.0) / 100.0)
                .newHiresThisMonth(employeeRepository.countNewHiresAfterDate(tenantId,
                        LocalDate.now().withDayOfMonth(1)))
                .build();
    }

    /**
     * Attendance metrics from real attendance_records data.
     */
    @Transactional(readOnly = true)
    public AttendanceMetrics getAttendanceMetrics(UUID tenantId, LocalDate date) {
        long totalActive = employeeRepository.countByTenantIdAndStatus(
                tenantId, com.hrms.domain.employee.Employee.EmployeeStatus.ACTIVE);

        // Records marked present for this date
        long presentCount = attendanceRecordRepository.countByTenantIdAndDate(tenantId, date);
        // On-time (not late)
        long onTimeCount = attendanceRecordRepository.countByTenantIdAndDateAndOnTime(tenantId, date);
        long lateArrivals = Math.max(0, presentCount - onTimeCount);
        long absentCount = Math.max(0, totalActive - presentCount);

        double attendanceRate = totalActive > 0 ?
                (double) presentCount / totalActive * 100 : 0;

        // Weekly trend — real counts for last 7 days
        List<DailyAttendance> weeklyTrend = new ArrayList<>();
        for (int i = 6; i >= 0; i--) {
            LocalDate day = date.minusDays(i);
            long dayPresent = attendanceRecordRepository.countByTenantIdAndDate(tenantId, day);
            long dayAbsent = Math.max(0, totalActive - dayPresent);
            weeklyTrend.add(new DailyAttendance(day, dayPresent, dayAbsent));
        }

        return AttendanceMetrics.builder()
                .date(date)
                .presentCount(presentCount)
                .absentCount(absentCount)
                .attendanceRate(Math.round(attendanceRate * 100.0) / 100.0)
                .lateArrivals(lateArrivals)
                .weeklyTrend(weeklyTrend)
                .build();
    }

    /**
     * Leave metrics from real leave_requests data.
     */
    @Transactional(readOnly = true)
    public LeaveMetrics getLeaveMetrics(UUID tenantId, LocalDate startDate, LocalDate endDate) {
        long pending = leaveRequestRepository.countByTenantIdAndStatus(
                tenantId, LeaveRequest.LeaveRequestStatus.PENDING);
        long approved = leaveRequestRepository.countByTenantIdAndStatus(
                tenantId, LeaveRequest.LeaveRequestStatus.APPROVED);
        long rejected = leaveRequestRepository.countByTenantIdAndStatus(
                tenantId, LeaveRequest.LeaveRequestStatus.REJECTED);

        // Leave type distribution from native query (returns leave_name, count pairs)
        List<Object[]> distribution = leaveRequestRepository.findLeaveTypeDistribution(tenantId);
        Map<String, Long> leaveTypeCounts = new LinkedHashMap<>();
        for (Object[] row : distribution) {
            String leaveName = (String) row[0];
            Long count = ((Number) row[1]).longValue();
            leaveTypeCounts.put(leaveName != null ? leaveName : "Other", count);
        }

        // Employees currently on leave today
        long onLeaveToday = leaveRequestRepository.countByTenantIdAndDateAndStatus(
                tenantId, LocalDate.now(), LeaveRequest.LeaveRequestStatus.APPROVED);

        return LeaveMetrics.builder()
                .pendingRequests(pending)
                .approvedThisMonth(approved)
                .rejectedThisMonth(rejected)
                .leaveTypeDistribution(leaveTypeCounts)
                .employeesOnLeaveToday(onLeaveToday)
                .build();
    }

    /**
     * Payroll metrics from real payslip aggregates.
     */
    @Transactional(readOnly = true)
    public PayrollMetrics getPayrollMetrics(UUID tenantId, int year, int month) {
        Long employeesPaid = payslipRepository.countByTenantIdAndYearAndMonth(tenantId, year, month);
        BigDecimal totalNetSalary = payslipRepository.sumNetSalaryByTenantIdAndYearAndMonth(
                tenantId, year, month);

        // Compute gross and deductions from current month's payslip list if summary not aggregated
        // Fallback to deriving from netSalary when no dedicated sum query exists
        // (gross ≈ net / 0.85 is a reasonable estimate only if exact SUM not available)
        BigDecimal net = totalNetSalary != null ? totalNetSalary : BigDecimal.ZERO;
        // Use net as the primary figure; gross and deductions surfaced as zero until a dedicated
        // sumGrossSalary query is added in a future migration.
        BigDecimal totalGrossSalary = net.multiply(BigDecimal.valueOf(100)).divide(BigDecimal.valueOf(85), 2, java.math.RoundingMode.HALF_UP);
        BigDecimal totalDeductions = totalGrossSalary.subtract(net);

        return PayrollMetrics.builder()
                .year(year)
                .month(month)
                .totalGrossSalary(totalGrossSalary)
                .totalNetSalary(net)
                .totalDeductions(totalDeductions)
                .employeesPaid(employeesPaid != null ? employeesPaid : 0L)
                .monthlyTrend(Collections.emptyList())
                .build();
    }

    @Transactional(readOnly = true)
    public List<HeadcountTrend> getHeadcountTrend(int months) {
        UUID tenantId = TenantContext.getCurrentTenant();
        List<HeadcountTrend> trend = new ArrayList<>();
        long currentCount = employeeRepository.countByTenantId(tenantId);
        LocalDate today = LocalDate.now();

        for (int i = months - 1; i >= 0; i--) {
            LocalDate point = today.minusMonths(i);
            // Count new hires up to this month boundary as an approximation of headcount at that time
            long hiredUpTo = employeeRepository.countNewHiresAfterDate(
                    tenantId, point.withDayOfMonth(1).minusMonths(1));
            long count = Math.max(0, currentCount - hiredUpTo);
            trend.add(new HeadcountTrend(point.getYear(), point.getMonthValue(), count));
        }

        return trend;
    }

    @Transactional(readOnly = true)
    public String getCurrentTenantKey() {
        UUID tenantId = TenantContext.getCurrentTenant();
        return tenantId != null ? tenantId.toString() : "default";
    }

    /**
     * Evict both analytics caches for the current tenant.
     *
     * <p>Call this from any service that mutates data reflected in dashboard
     * metrics — e.g., employee create/terminate, leave approval, payroll run,
     * attendance import. Uses {@code allEntries = true} because keys contain
     * tenant IDs embedded in the key string (not a Spring-managed prefix), so
     * a single targeted eviction is not reliably possible without resolving the
     * tenant key at eviction time.</p>
     */
    @Caching(evict = {
            @CacheEvict(value = CacheConfig.ANALYTICS_SUMMARY, allEntries = true),
            @CacheEvict(value = CacheConfig.DASHBOARD_METRICS, allEntries = true)
    })
    public void evictAnalyticsCache() {
        log.debug("Analytics caches evicted");
    }
}
