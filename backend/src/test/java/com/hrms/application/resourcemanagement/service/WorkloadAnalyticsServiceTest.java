package com.hrms.application.resourcemanagement.service;

import com.hrms.api.resourcemanagement.dto.AllocationDTOs.*;
import com.hrms.api.resourcemanagement.dto.WorkloadDTOs.*;
import com.hrms.common.security.SecurityContext;
import com.hrms.domain.employee.Employee;
import com.hrms.domain.project.Project;
import com.hrms.domain.project.ProjectEmployee;
import com.hrms.infrastructure.attendance.repository.HolidayRepository;
import com.hrms.infrastructure.employee.repository.DepartmentRepository;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import com.hrms.infrastructure.project.repository.HrmsProjectRepository;
import com.hrms.infrastructure.project.repository.ProjectEmployeeRepository;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.time.LocalDate;
import java.util.*;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("WorkloadAnalyticsService Tests")
class WorkloadAnalyticsServiceTest {

    @Mock
    private EmployeeRepository employeeRepository;

    @Mock
    private HrmsProjectRepository projectRepository;

    @Mock
    private ProjectEmployeeRepository projectEmployeeRepository;

    @Mock
    private DepartmentRepository departmentRepository;

    @Mock
    private HolidayRepository holidayRepository;

    @Mock
    private ResourceManagementService resourceManagementService;

    private WorkloadAnalyticsService workloadAnalyticsService;

    private UUID tenantId;
    private UUID employeeId;
    private UUID projectId;
    private Employee employee;
    private Project project;

    @BeforeEach
    void setUp() {
        tenantId = UUID.randomUUID();
        employeeId = UUID.randomUUID();
        projectId = UUID.randomUUID();

        workloadAnalyticsService = new WorkloadAnalyticsService(
                employeeRepository,
                projectRepository,
                projectEmployeeRepository,
                departmentRepository,
                holidayRepository);
        workloadAnalyticsService.setResourceManagementService(resourceManagementService);

        employee = Employee.builder()
                .employeeCode("EMP001")
                .firstName("Alice")
                .lastName("Example")
                .build();
        employee.setId(employeeId);
        employee.setTenantId(tenantId);
        employee.setStatus(Employee.EmployeeStatus.ACTIVE);

        project = Project.builder()
                .projectCode("PRJ001")
                .name("Test Project")
                .status(Project.ProjectStatus.IN_PROGRESS)
                .startDate(LocalDate.now().minusMonths(1))
                .build();
        project.setId(projectId);
        project.setTenantId(tenantId);
    }

    // ============================================
    // getWorkloadDashboard
    // ============================================

    @Nested
    @DisplayName("getWorkloadDashboard")
    class DashboardTests {

        @Test
        @DisplayName("Should return dashboard with all sections populated")
        void shouldReturnFullDashboard() {
            EmployeeWorkload workload = buildWorkload(AllocationStatus.UNASSIGNED, 0);

            try (MockedStatic<SecurityContext> sc = mockStatic(SecurityContext.class)) {
                sc.when(SecurityContext::getCurrentTenantId).thenReturn(tenantId);
                when(employeeRepository.findByTenantId(tenantId)).thenReturn(List.of(employee));
                when(projectRepository.findAllByTenantId(eq(tenantId), any(Pageable.class)))
                        .thenReturn(new PageImpl<>(List.of(project)));
                when(departmentRepository.findByTenantId(tenantId)).thenReturn(Collections.emptyList());
                when(projectEmployeeRepository.findAllByProjectIdAndTenantIdAndIsActive(
                        eq(projectId), eq(tenantId), eq(true))).thenReturn(Collections.emptyList());
                when(resourceManagementService.getEmployeeWorkload(employeeId)).thenReturn(workload);
                when(resourceManagementService.getEmployeeCapacity(eq(employeeId), any()))
                        .thenReturn(buildCapacity(0));

                WorkloadDashboardData result = workloadAnalyticsService.getWorkloadDashboard(null);

                assertThat(result).isNotNull();
                assertThat(result.getSummary()).isNotNull();
                assertThat(result.getEmployeeWorkloads()).hasSize(1);
                assertThat(result.getProjectWorkloads()).hasSize(1);
                assertThat(result.getTrends()).hasSize(6);
                assertThat(result.getHeatmapData()).isNotNull();
            }
        }

        @Test
        @DisplayName("Should apply allocation status filter")
        void shouldApplyAllocationStatusFilter() {
            EmployeeWorkload overAllocated = buildWorkload(AllocationStatus.OVER_ALLOCATED, 120);
            WorkloadFilterOptions filter = new WorkloadFilterOptions();
            filter.setAllocationStatus(List.of(AllocationStatus.OPTIMAL));

            try (MockedStatic<SecurityContext> sc = mockStatic(SecurityContext.class)) {
                sc.when(SecurityContext::getCurrentTenantId).thenReturn(tenantId);
                when(employeeRepository.findByTenantId(tenantId)).thenReturn(List.of(employee));
                when(projectRepository.findAllByTenantId(eq(tenantId), any(Pageable.class)))
                        .thenReturn(Page.empty());
                when(departmentRepository.findByTenantId(tenantId)).thenReturn(Collections.emptyList());
                when(resourceManagementService.getEmployeeWorkload(employeeId)).thenReturn(overAllocated);
                when(resourceManagementService.getEmployeeCapacity(eq(employeeId), any()))
                        .thenReturn(buildCapacity(120));

                WorkloadDashboardData result = workloadAnalyticsService.getWorkloadDashboard(filter);

                // Over-allocated employee should be filtered out from OPTIMAL filter
                assertThat(result.getEmployeeWorkloads()).isEmpty();
            }
        }
    }

    // ============================================
    // getDepartmentWorkloads
    // ============================================

    @Nested
    @DisplayName("getDepartmentWorkloads")
    class DeptWorkloadTests {

        @Test
        @DisplayName("Should return empty list when no departments exist")
        void shouldReturnEmptyWhenNoDepartments() {
            try (MockedStatic<SecurityContext> sc = mockStatic(SecurityContext.class)) {
                sc.when(SecurityContext::getCurrentTenantId).thenReturn(tenantId);
                when(employeeRepository.findByTenantId(tenantId)).thenReturn(Collections.emptyList());
                when(projectRepository.findAllByTenantId(eq(tenantId), any(Pageable.class)))
                        .thenReturn(Page.empty());
                when(departmentRepository.findByTenantId(tenantId)).thenReturn(Collections.emptyList());

                List<DepartmentWorkload> result = workloadAnalyticsService
                        .getDepartmentWorkloads(LocalDate.now(), LocalDate.now().plusMonths(1));

                assertThat(result).isEmpty();
            }
        }
    }

    // ============================================
    // exportWorkloadReport
    // ============================================

    @Nested
    @DisplayName("exportWorkloadReport")
    class ExportTests {

        @Test
        @DisplayName("Should export CSV with header row")
        void shouldExportCsvWithHeader() {
            try (MockedStatic<SecurityContext> sc = mockStatic(SecurityContext.class)) {
                sc.when(SecurityContext::getCurrentTenantId).thenReturn(tenantId);
                when(employeeRepository.findByTenantId(tenantId)).thenReturn(Collections.emptyList());
                when(projectRepository.findAllByTenantId(eq(tenantId), any(Pageable.class)))
                        .thenReturn(Page.empty());
                when(departmentRepository.findByTenantId(tenantId)).thenReturn(Collections.emptyList());

                byte[] result = workloadAnalyticsService.exportWorkloadReport("csv", null);

                assertThat(result).isNotNull();
                String csv = new String(result);
                assertThat(csv).contains("Employee");
                assertThat(csv).contains("Total Allocation");
                assertThat(csv).contains("--- Summary ---");
            }
        }

        @Test
        @DisplayName("Should fall back to CSV for xlsx format")
        void shouldFallbackForXlsx() {
            try (MockedStatic<SecurityContext> sc = mockStatic(SecurityContext.class)) {
                sc.when(SecurityContext::getCurrentTenantId).thenReturn(tenantId);
                when(employeeRepository.findByTenantId(tenantId)).thenReturn(Collections.emptyList());
                when(projectRepository.findAllByTenantId(eq(tenantId), any(Pageable.class)))
                        .thenReturn(Page.empty());
                when(departmentRepository.findByTenantId(tenantId)).thenReturn(Collections.emptyList());

                byte[] result = workloadAnalyticsService.exportWorkloadReport("xlsx", null);

                assertThat(result).isNotNull();
                assertThat(new String(result)).contains("Employee");
            }
        }

        @Test
        @DisplayName("Should throw for unknown format")
        void shouldThrowForUnknownFormat() {
            try (MockedStatic<SecurityContext> sc = mockStatic(SecurityContext.class)) {
                sc.when(SecurityContext::getCurrentTenantId).thenReturn(tenantId);
                when(employeeRepository.findByTenantId(tenantId)).thenReturn(Collections.emptyList());
                when(projectRepository.findAllByTenantId(eq(tenantId), any(Pageable.class)))
                        .thenReturn(Page.empty());
                when(departmentRepository.findByTenantId(tenantId)).thenReturn(Collections.emptyList());

                assertThatThrownBy(() ->
                        workloadAnalyticsService.exportWorkloadReport("docx", null))
                        .isInstanceOf(IllegalArgumentException.class)
                        .hasMessageContaining("Unsupported export format");
            }
        }
    }

    // ============================================
    // getWorkloadHeatmap
    // ============================================

    @Nested
    @DisplayName("getWorkloadHeatmap")
    class HeatmapTests {

        @Test
        @DisplayName("Should return heatmap rows limited to requested count")
        void shouldReturnLimitedHeatmapRows() {
            LocalDate start = LocalDate.now();
            LocalDate end = start.plusWeeks(1);

            try (MockedStatic<SecurityContext> sc = mockStatic(SecurityContext.class)) {
                sc.when(SecurityContext::getCurrentTenantId).thenReturn(tenantId);
                when(employeeRepository.findByTenantId(tenantId)).thenReturn(List.of(employee));
                when(resourceManagementService.getEmployeeCapacity(eq(employeeId), any()))
                        .thenReturn(buildCapacity(50));

                List<WorkloadHeatmapRow> rows = workloadAnalyticsService
                        .getWorkloadHeatmap(start, end, null, 10);

                assertThat(rows).hasSize(1);
                assertThat(rows.get(0).getEmployeeId()).isEqualTo(employeeId);
                assertThat(rows.get(0).getCells()).isNotEmpty();
            }
        }

        @Test
        @DisplayName("Should filter by departmentId when provided")
        void shouldFilterByDepartment() {
            UUID deptId = UUID.randomUUID();
            employee.setDepartmentId(UUID.randomUUID()); // different dept

            try (MockedStatic<SecurityContext> sc = mockStatic(SecurityContext.class)) {
                sc.when(SecurityContext::getCurrentTenantId).thenReturn(tenantId);
                when(employeeRepository.findByTenantId(tenantId)).thenReturn(List.of(employee));

                List<WorkloadHeatmapRow> rows = workloadAnalyticsService
                        .getWorkloadHeatmap(LocalDate.now(), LocalDate.now().plusWeeks(1),
                                deptId, null);

                assertThat(rows).isEmpty();
            }
        }
    }

    // ============================================
    // Helpers
    // ============================================

    private EmployeeWorkload buildWorkload(AllocationStatus status, int allocation) {
        return EmployeeWorkload.builder()
                .employeeId(employeeId)
                .employeeName("Alice Example")
                .employeeCode("EMP001")
                .totalAllocation(allocation)
                .approvedAllocation(allocation)
                .pendingAllocation(0)
                .allocationStatus(status)
                .projectCount(0)
                .allocations(Collections.emptyList())
                .hasPendingApprovals(false)
                .build();
    }

    private EmployeeCapacity buildCapacity(int allocation) {
        return EmployeeCapacity.builder()
                .employeeId(employeeId)
                .employeeName("Alice Example")
                .employeeCode("EMP001")
                .totalAllocation(allocation)
                .approvedAllocation(allocation)
                .pendingAllocation(0)
                .availableCapacity(100 - allocation)
                .isOverAllocated(allocation > 100)
                .hasPendingApprovals(false)
                .allocationStatus(allocation > 100 ? AllocationStatus.OVER_ALLOCATED
                        : allocation >= 75 ? AllocationStatus.OPTIMAL
                        : allocation > 0 ? AllocationStatus.UNDER_UTILIZED
                        : AllocationStatus.UNASSIGNED)
                .allocations(Collections.emptyList())
                .effectiveDate(LocalDate.now().toString())
                .build();
    }
}
