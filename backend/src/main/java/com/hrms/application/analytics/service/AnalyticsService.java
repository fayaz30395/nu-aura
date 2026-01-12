package com.hrms.application.analytics.service;

import com.hrms.application.analytics.dto.*;
import com.hrms.common.security.TenantContext;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;

/**
 * Service for generating analytics and dashboard metrics.
 * Provides aggregated data for HR dashboards and reports.
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class AnalyticsService {

    private final EmployeeRepository employeeRepository;

    /**
     * Get comprehensive dashboard metrics for the current tenant.
     */
    @Cacheable(value = "dashboardMetrics", key = "#root.target.getCurrentTenantKey()")
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
                .generatedAt(LocalDate.now())
                .build();
    }

    /**
     * Get employee-related metrics.
     */
    public EmployeeMetrics getEmployeeMetrics(UUID tenantId) {
        long totalEmployees = employeeRepository.countByTenantId(tenantId);
        long activeEmployees = employeeRepository.countByTenantIdAndStatus(
                tenantId, com.hrms.domain.employee.Employee.EmployeeStatus.ACTIVE);

        // Get department distribution
        List<Object[]> deptDistribution = employeeRepository.getEmployeeCountByDepartment(tenantId);
        Map<String, Long> departmentCounts = new LinkedHashMap<>();
        for (Object[] row : deptDistribution) {
            String deptName = (String) row[0];
            Long count = ((Number) row[1]).longValue();
            departmentCounts.put(deptName != null ? deptName : "Unassigned", count);
        }

        // Calculate attrition (employees who left this year)
        LocalDate yearStart = LocalDate.now().withDayOfYear(1);
        long leftThisYear = employeeRepository.countTerminatedAfterDate(tenantId, yearStart);
        double attritionRate = totalEmployees > 0 ?
                (double) leftThisYear / totalEmployees * 100 : 0;

        return EmployeeMetrics.builder()
                .totalEmployees(totalEmployees)
                .activeEmployees(activeEmployees)
                .onLeaveToday(0L) // Will be calculated from attendance
                .departmentDistribution(departmentCounts)
                .attritionRate(Math.round(attritionRate * 100.0) / 100.0)
                .newHiresThisMonth(employeeRepository.countNewHiresAfterDate(tenantId,
                        LocalDate.now().withDayOfMonth(1)))
                .build();
    }

    /**
     * Get attendance-related metrics for a specific date.
     * Note: Uses placeholder values - implement repository methods for production.
     */
    public AttendanceMetrics getAttendanceMetrics(UUID tenantId, LocalDate date) {
        long totalActive = employeeRepository.countByTenantIdAndStatus(
                tenantId, com.hrms.domain.employee.Employee.EmployeeStatus.ACTIVE);

        // Placeholder - implement actual attendance counting
        long presentCount = (long) (totalActive * 0.85); // 85% attendance estimate
        long absentCount = Math.max(0, totalActive - presentCount);

        double attendanceRate = totalActive > 0 ?
                (double) presentCount / totalActive * 100 : 0;

        // Weekly trend placeholder
        List<DailyAttendance> weeklyTrend = new ArrayList<>();
        for (int i = 6; i >= 0; i--) {
            LocalDate day = date.minusDays(i);
            long present = (long) (totalActive * (0.80 + Math.random() * 0.15));
            weeklyTrend.add(new DailyAttendance(day, present, Math.max(0, totalActive - present)));
        }

        return AttendanceMetrics.builder()
                .date(date)
                .presentCount(presentCount)
                .absentCount(absentCount)
                .attendanceRate(Math.round(attendanceRate * 100.0) / 100.0)
                .lateArrivals(0L)
                .weeklyTrend(weeklyTrend)
                .build();
    }

    /**
     * Get leave-related metrics for a date range.
     * Note: Uses placeholder values - implement repository methods for production.
     */
    public LeaveMetrics getLeaveMetrics(UUID tenantId, LocalDate startDate, LocalDate endDate) {
        // Placeholder values
        Map<String, Long> leaveTypeCounts = new LinkedHashMap<>();
        leaveTypeCounts.put("Annual Leave", 15L);
        leaveTypeCounts.put("Sick Leave", 8L);
        leaveTypeCounts.put("Personal Leave", 5L);

        return LeaveMetrics.builder()
                .pendingRequests(3L)
                .approvedThisMonth(20L)
                .rejectedThisMonth(2L)
                .leaveTypeDistribution(leaveTypeCounts)
                .employeesOnLeaveToday(5L)
                .build();
    }

    /**
     * Get payroll-related metrics.
     * Note: Uses placeholder values - implement repository methods for production.
     */
    public PayrollMetrics getPayrollMetrics(UUID tenantId, int year, int month) {
        return PayrollMetrics.builder()
                .year(year)
                .month(month)
                .totalGrossSalary(BigDecimal.valueOf(500000))
                .totalNetSalary(BigDecimal.valueOf(425000))
                .totalDeductions(BigDecimal.valueOf(75000))
                .employeesPaid(50L)
                .monthlyTrend(Collections.emptyList())
                .build();
    }

    /**
     * Get headcount trend over time.
     */
    public List<HeadcountTrend> getHeadcountTrend(int months) {
        UUID tenantId = TenantContext.getCurrentTenant();
        List<HeadcountTrend> trend = new ArrayList<>();

        long baseCount = employeeRepository.countByTenantId(tenantId);
        LocalDate today = LocalDate.now();

        for (int i = months - 1; i >= 0; i--) {
            LocalDate monthEnd = today.minusMonths(i);
            // Simulate growth trend
            long count = baseCount - (i * 2L);
            trend.add(new HeadcountTrend(
                    monthEnd.getYear(),
                    monthEnd.getMonthValue(),
                    Math.max(count, 0)
            ));
        }

        return trend;
    }

    /**
     * Helper method to get current tenant key for caching.
     */
    public String getCurrentTenantKey() {
        UUID tenantId = TenantContext.getCurrentTenant();
        return tenantId != null ? tenantId.toString() : "default";
    }
}
