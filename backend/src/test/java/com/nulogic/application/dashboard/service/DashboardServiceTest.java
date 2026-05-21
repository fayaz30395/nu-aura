package com.nulogic.application.dashboard.service;

import com.nulogic.api.dashboard.dto.DashboardMetricsResponse;
import com.nulogic.common.security.SecurityContext;
import com.nulogic.domain.audit.AuditLog;
import com.nulogic.domain.employee.Employee;
import com.nulogic.infrastructure.audit.repository.AuditLogRepository;
import com.nulogic.infrastructure.employee.repository.EmployeeRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class DashboardServiceTest {

    @Mock
    private EmployeeRepository employeeRepository;

    @Mock
    private AuditLogRepository auditLogRepository;

    @Mock
    private com.nulogic.common.util.TenantTimeService tenantTimeService;

    @InjectMocks
    private DashboardService dashboardService;

    private UUID tenantId;
    private List<Employee> employees;
    private List<AuditLog> auditLogs;

    @BeforeEach
    void setUpTenantTimeServiceDefaults() {
        org.mockito.Mockito.lenient()
                .when(tenantTimeService.today(org.mockito.ArgumentMatchers.nullable(java.util.UUID.class)))
                .thenReturn(java.time.LocalDate.now());
        org.mockito.Mockito.lenient()
                .when(tenantTimeService.now(org.mockito.ArgumentMatchers.nullable(java.util.UUID.class)))
                .thenReturn(java.time.LocalDateTime.now());
    }

    @BeforeEach
    void setUp() {
        tenantId = UUID.randomUUID();
        employees = createTestEmployees();
        auditLogs = createTestAuditLogs();
    }

    @Test
    void getDashboardMetrics_ShouldReturnMetrics_WhenDataExists() {
        // Given
        when(employeeRepository.countByTenantId(tenantId)).thenReturn(3L);
        when(employeeRepository.countByTenantIdAndStatus(tenantId, Employee.EmployeeStatus.ACTIVE))
                .thenReturn(2L);
        when(employeeRepository.countNewHiresAfterDate(eq(tenantId), any(LocalDate.class))).thenReturn(0L);
        when(auditLogRepository.findTop10ByTenantIdOrderByCreatedAtDesc(tenantId)).thenReturn(auditLogs);

        try (MockedStatic<SecurityContext> mockedSecurityContext = mockStatic(SecurityContext.class)) {
            mockedSecurityContext.when(SecurityContext::getCurrentTenantId).thenReturn(tenantId);

            // When
            DashboardMetricsResponse response = dashboardService.getDashboardMetrics();

            // Then
            assertThat(response).isNotNull();
            assertThat(response.getEmployeeMetrics()).isNotNull();
            assertThat(response.getEmployeeMetrics().getTotalEmployees()).isEqualTo(3);
            assertThat(response.getEmployeeMetrics().getActiveEmployees()).isEqualTo(2);
            assertThat(response.getEmployeeMetrics().getInactiveEmployees()).isEqualTo(1);

            assertThat(response.getAttendanceMetrics()).isNotNull();
            assertThat(response.getLeaveMetrics()).isNotNull();
            assertThat(response.getDepartmentMetrics()).isNotNull();
            assertThat(response.getRecentActivities()).isNotNull();
            assertThat(response.getRecentActivities()).hasSize(2);

            verify(employeeRepository).countByTenantId(tenantId);
            verify(employeeRepository).countByTenantIdAndStatus(tenantId, Employee.EmployeeStatus.ACTIVE);
            verify(auditLogRepository).findTop10ByTenantIdOrderByCreatedAtDesc(tenantId);
        }
    }

    @Test
    void getDashboardMetrics_ShouldCountNewEmployeesThisMonth() {
        // Given
        when(employeeRepository.countByTenantId(tenantId)).thenReturn(4L);
        when(employeeRepository.countByTenantIdAndStatus(tenantId, Employee.EmployeeStatus.ACTIVE))
                .thenReturn(3L);
        when(employeeRepository.countNewHiresAfterDate(eq(tenantId), any(LocalDate.class))).thenReturn(1L);
        when(auditLogRepository.findTop10ByTenantIdOrderByCreatedAtDesc(tenantId)).thenReturn(auditLogs);

        try (MockedStatic<SecurityContext> mockedSecurityContext = mockStatic(SecurityContext.class)) {
            mockedSecurityContext.when(SecurityContext::getCurrentTenantId).thenReturn(tenantId);

            // When
            DashboardMetricsResponse response = dashboardService.getDashboardMetrics();

            // Then
            assertThat(response.getEmployeeMetrics().getNewEmployeesThisMonth()).isEqualTo(1);
        }
    }

    @Test
    void getDashboardMetrics_ShouldGroupEmployeesByStatus() {
        // Given
        when(employeeRepository.countByTenantId(tenantId)).thenReturn(3L);
        when(employeeRepository.countByTenantIdAndStatus(tenantId, Employee.EmployeeStatus.ACTIVE))
                .thenReturn(2L);
        when(employeeRepository.countNewHiresAfterDate(eq(tenantId), any(LocalDate.class))).thenReturn(0L);
        when(auditLogRepository.findTop10ByTenantIdOrderByCreatedAtDesc(tenantId)).thenReturn(auditLogs);

        try (MockedStatic<SecurityContext> mockedSecurityContext = mockStatic(SecurityContext.class)) {
            mockedSecurityContext.when(SecurityContext::getCurrentTenantId).thenReturn(tenantId);

            // When
            DashboardMetricsResponse response = dashboardService.getDashboardMetrics();

            // Then
            assertThat(response.getEmployeeMetrics().getEmployeesByStatus())
                    .containsEntry("ACTIVE", 2L)
                    .containsEntry("INACTIVE", 1L);
        }
    }

    @Test
    void getDashboardMetrics_ShouldHandleEmptyEmployeeList() {
        // Given
        when(employeeRepository.countByTenantId(tenantId)).thenReturn(0L);
        when(employeeRepository.countByTenantIdAndStatus(tenantId, Employee.EmployeeStatus.ACTIVE))
                .thenReturn(0L);
        when(employeeRepository.countNewHiresAfterDate(eq(tenantId), any(LocalDate.class))).thenReturn(0L);
        when(auditLogRepository.findTop10ByTenantIdOrderByCreatedAtDesc(tenantId)).thenReturn(auditLogs);

        try (MockedStatic<SecurityContext> mockedSecurityContext = mockStatic(SecurityContext.class)) {
            mockedSecurityContext.when(SecurityContext::getCurrentTenantId).thenReturn(tenantId);

            // When
            DashboardMetricsResponse response = dashboardService.getDashboardMetrics();

            // Then
            assertThat(response.getEmployeeMetrics().getTotalEmployees()).isZero();
            assertThat(response.getEmployeeMetrics().getActiveEmployees()).isZero();
        }
    }

    private List<Employee> createTestEmployees() {
        List<Employee> employees = new ArrayList<>();

        employees.add(createEmployee(
                UUID.randomUUID(), "John", "Doe",
                Employee.EmployeeStatus.ACTIVE,
                LocalDate.of(2023, 1, 15)
        ));

        employees.add(createEmployee(
                UUID.randomUUID(), "Jane", "Smith",
                Employee.EmployeeStatus.ACTIVE,
                LocalDate.of(2023, 3, 20)
        ));

        employees.add(createEmployee(
                UUID.randomUUID(), "Bob", "Johnson",
                Employee.EmployeeStatus.TERMINATED,
                LocalDate.of(2022, 6, 10)
        ));

        return employees;
    }

    private Employee createEmployee(UUID id, String firstName, String lastName,
                                    Employee.EmployeeStatus status, LocalDate joiningDate) {
        Employee employee = Employee.builder()
                .firstName(firstName)
                .lastName(lastName)
                .status(status)
                .joiningDate(joiningDate)
                .employeeCode("EMP" + id.toString().substring(0, 8))
                .build();
        employee.setId(id);
        return employee;
    }

    private List<AuditLog> createTestAuditLogs() {
        List<AuditLog> logs = new ArrayList<>();

        AuditLog log1 = AuditLog.builder()
                .entityType("EMPLOYEE")
                .entityId(UUID.randomUUID())
                .action(AuditLog.AuditAction.CREATE)
                .actorId(UUID.randomUUID())
                .actorEmail("admin@test.com")
                .changes("Created employee")
                .build();
        log1.setId(UUID.randomUUID());
        log1.setCreatedAt(LocalDateTime.now().minusHours(1));
        logs.add(log1);

        AuditLog log2 = AuditLog.builder()
                .entityType("ROLE")
                .entityId(UUID.randomUUID())
                .action(AuditLog.AuditAction.UPDATE)
                .actorId(UUID.randomUUID())
                .actorEmail("manager@test.com")
                .changes("Updated role permissions")
                .build();
        log2.setId(UUID.randomUUID());
        log2.setCreatedAt(LocalDateTime.now().minusHours(2));
        logs.add(log2);

        return logs;
    }
}
