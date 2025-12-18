package com.hrms.application.dashboard.service;

import com.hrms.api.dashboard.dto.DashboardMetricsResponse;
import com.hrms.api.dashboard.dto.DashboardMetricsResponse.*;
import com.hrms.common.security.SecurityContext;
import com.hrms.domain.audit.AuditLog;
import com.hrms.domain.employee.Employee;
import com.hrms.infrastructure.audit.repository.AuditLogRepository;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class DashboardService {

        private final EmployeeRepository employeeRepository;
        private final AuditLogRepository auditLogRepository;

        @Transactional(readOnly = true)
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
                List<Employee> allEmployees = employeeRepository.findAllByTenantId(tenantId, PageRequest.of(0, 10000))
                                .getContent();

                long totalEmployees = allEmployees.size();
                long activeEmployees = allEmployees.stream()
                                .filter(e -> Employee.EmployeeStatus.ACTIVE.equals(e.getStatus()))
                                .count();
                long inactiveEmployees = totalEmployees - activeEmployees;

                // Employees hired this month
                LocalDate startOfMonth = LocalDate.now().withDayOfMonth(1);
                long newEmployeesThisMonth = allEmployees.stream()
                                .filter(e -> e.getJoiningDate() != null &&
                                                !e.getJoiningDate().isBefore(startOfMonth))
                                .count();

                // Group by department - simplified since we only have departmentId
                Map<String, Long> employeesByDepartment = new HashMap<>();

                // Group by status
                Map<String, Long> employeesByStatus = allEmployees.stream()
                                .collect(Collectors.groupingBy(
                                                e -> e.getStatus() != null ? e.getStatus().name() : "UNKNOWN",
                                                Collectors.counting()));

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
                // Fetch recent audit logs
                List<AuditLog> recentLogs = auditLogRepository.findAll(
                                PageRequest.of(0, 10)).getContent();

                DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

                return recentLogs.stream()
                                .map(log -> RecentActivity.builder()
                                                .actorName(log.getActorEmail() != null ? log.getActorEmail() : "System")
                                                .action(log.getAction() != null ? log.getAction().name() : "UNKNOWN")
                                                .entityType(log.getEntityType())
                                                .description(log.getChanges() != null ? log.getChanges() : "")
                                                .timestamp(log.getCreatedAt() != null
                                                                ? log.getCreatedAt().format(formatter)
                                                                : "")
                                                .build())
                                .collect(Collectors.toList());
        }
}
