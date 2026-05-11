package com.hrms.application.dashboard.service;

import com.hrms.api.dashboard.dto.DashboardMetricsResponse;
import com.hrms.api.dashboard.dto.DashboardMetricsResponse.*;
import com.hrms.common.config.CacheConfig;
import com.hrms.common.security.SecurityContext;
import com.hrms.domain.audit.AuditLog;
import com.hrms.domain.employee.Employee;
import com.hrms.infrastructure.audit.repository.AuditLogRepository;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class DashboardService {

    private final EmployeeRepository employeeRepository;
    private final AuditLogRepository auditLogRepository;

    @Transactional(readOnly = true)
    @Cacheable(value = CacheConfig.DASHBOARD_METRICS,
            key = "T(com.hrms.common.security.TenantContext).getCurrentTenant()")
    public DashboardMetricsResponse getDashboardMetrics() {
        UUID tenantId = SecurityContext.getCurrentTenantId();
        log.info("Fetching dashboard metrics for tenant: {}", tenantId);

        return DashboardMetricsResponse.builder()
                .employeeMetrics(getEmployeeMetrics(tenantId))
                .attendanceMetrics(getAttendanceMetrics(tenantId))
                .leaveMetrics(getLeaveMetrics(tenantId))
                .departmentMetrics(getDepartmentMetrics(tenantId))
                .recentActivities(getRecentActivities(tenantId))
                .build();
    }

    private EmployeeMetrics getEmployeeMetrics(UUID tenantId) {
        // PERF (wave-3 H1): previously loaded up to 10,000 employees into memory
        // just to compute counts. Replaced with three COUNT(*) queries which run
        // in O(index-scan) time and keep heap pressure constant regardless of
        // tenant size. Per-status grouping is built from the two known buckets
        // (ACTIVE, others) — the dashboard only consumes ACTIVE / INACTIVE
        // headline numbers, so this avoids a second GROUP BY round-trip.
        long totalEmployees = employeeRepository.countByTenantId(tenantId);
        long activeEmployees = employeeRepository.countByTenantIdAndStatus(
                tenantId, Employee.EmployeeStatus.ACTIVE);
        long inactiveEmployees = totalEmployees - activeEmployees;

        LocalDate startOfMonth = LocalDate.now().withDayOfMonth(1);
        long newEmployeesThisMonth = employeeRepository.countNewHiresAfterDate(tenantId, startOfMonth);

        // Group by department: not currently populated by this endpoint (kept
        // as an empty map to preserve the response contract). If the frontend
        // ever requires it, EmployeeRepository#getEmployeeCountByDepartment
        // already exposes it as a single GROUP BY query.
        Map<String, Long> employeesByDepartment = new HashMap<>();

        // Group by status: only ACTIVE vs other is exposed to the dashboard.
        // Avoid a second query just to populate this map — derive it from the
        // counts we already have above.
        Map<String, Long> employeesByStatus = new HashMap<>();
        employeesByStatus.put(Employee.EmployeeStatus.ACTIVE.name(), activeEmployees);
        if (inactiveEmployees > 0) {
            employeesByStatus.put("INACTIVE", inactiveEmployees);
        }

        return EmployeeMetrics.builder()
                .totalEmployees(totalEmployees)
                .activeEmployees(activeEmployees)
                .inactiveEmployees(inactiveEmployees)
                .newEmployeesThisMonth(newEmployeesThisMonth)
                .employeesByDepartment(employeesByDepartment)
                .employeesByStatus(employeesByStatus)
                .build();
    }

    private AttendanceMetrics getAttendanceMetrics(UUID tenantId) {
        // Placeholder implementation - would integrate with actual attendance
        // repository
        List<DailyAttendance> last7Days = new ArrayList<>();
        LocalDate today = LocalDate.now();

        for (int i = 6; i >= 0; i--) {
            LocalDate date = today.minusDays(i);
            last7Days.add(DailyAttendance.builder()
                    .date(date)
                    .present(0L)
                    .absent(0L)
                    .late(0L)
                    .build());
        }

        return AttendanceMetrics.builder()
                .presentToday(0L)
                .absentToday(0L)
                .lateArrivals(0L)
                .earlyDepartures(0L)
                .averageAttendanceRate(0.0)
                .last7Days(last7Days)
                .build();
    }

    private LeaveMetrics getLeaveMetrics(UUID tenantId) {
        // Placeholder implementation - would integrate with actual leave repository
        return LeaveMetrics.builder()
                .pendingLeaveRequests(0L)
                .approvedLeavesThisMonth(0L)
                .totalLeavesThisMonth(0L)
                .leavesByType(new HashMap<>())
                .upcomingLeaves(new ArrayList<>())
                .build();
    }

    private DepartmentMetrics getDepartmentMetrics(UUID tenantId) {
        // Placeholder implementation - would integrate with actual department
        // repository
        Map<String, DepartmentStats> departmentStatsMap = new HashMap<>();

        return DepartmentMetrics.builder()
                .departmentStats(departmentStatsMap)
                .build();
    }

    private List<RecentActivity> getRecentActivities(UUID tenantId) {
        // SEC + PERF (wave-3 H1): previous implementation called
        // {@code auditLogRepository.findAll(PageRequest.of(0, 10))} which had
        // NO tenant filter — a user on tenant A could see audit rows from
        // tenant B. Now scoped via the dedicated derived finder, which avoids
        // the unnecessary count(*) query that PageRequest forces on Page<>.
        List<AuditLog> recentLogs = auditLogRepository
                .findTop10ByTenantIdOrderByCreatedAtDesc(tenantId);

        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

        return recentLogs.stream()
                .map(auditEntry -> RecentActivity.builder()
                        .actorName(auditEntry.getActorEmail() != null ? auditEntry.getActorEmail() : "System")
                        .action(auditEntry.getAction() != null ? auditEntry.getAction().name() : "UNKNOWN")
                        .entityType(auditEntry.getEntityType())
                        .description(auditEntry.getChanges() != null ? auditEntry.getChanges() : "")
                        .timestamp(auditEntry.getCreatedAt() != null
                                ? auditEntry.getCreatedAt().format(formatter)
                                : "")
                        .build())
                .collect(Collectors.toList());
    }
}
