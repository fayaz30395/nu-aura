package com.hrms.application.resourcemanagement.service;

import com.hrms.api.resourcemanagement.dto.AllocationDTOs.*;
import com.hrms.api.resourcemanagement.dto.WorkloadDTOs.*;
import com.hrms.common.exception.ResourceNotFoundException;
import com.hrms.common.security.Permission;
import com.hrms.common.security.SecurityContext;
import com.hrms.domain.employee.Employee;
import com.hrms.domain.project.Project;
import com.hrms.domain.project.ProjectEmployee;
import com.hrms.domain.resourcemanagement.AllocationApprovalRequest;
import com.hrms.infrastructure.employee.repository.DepartmentRepository;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import com.hrms.infrastructure.project.repository.HrmsProjectRepository;
import com.hrms.infrastructure.project.repository.ProjectEmployeeRepository;
import com.hrms.infrastructure.resourcemanagement.repository.AllocationApprovalRequestRepository;
import com.hrms.infrastructure.attendance.repository.HolidayRepository;
import com.hrms.infrastructure.leave.repository.LeaveRequestRepository;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
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
@DisplayName("ResourceManagementService Tests")
class ResourceManagementServiceTest {

    @Mock
    private EmployeeRepository employeeRepository;

    @Mock
    private ProjectEmployeeRepository projectEmployeeRepository;

    @Mock
    private HrmsProjectRepository projectRepository;

    @Mock
    private AllocationApprovalRequestRepository approvalRepository;

    @Mock
    private DepartmentRepository departmentRepository;

    @Mock
    private HolidayRepository holidayRepository;

    @Mock
    private LeaveRequestRepository leaveRequestRepository;

    @InjectMocks
    private ResourceManagementService resourceManagementService;

    private UUID tenantId;
    private UUID employeeId;
    private UUID projectId;
    private UUID managerId;
    private Employee employee;
    private Project project;

    @BeforeEach
    void setUp() {
        tenantId = UUID.randomUUID();
        employeeId = UUID.randomUUID();
        projectId = UUID.randomUUID();
        managerId = UUID.randomUUID();

        employee = Employee.builder()
                .employeeCode("EMP001")
                .firstName("John")
                .lastName("Doe")
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

    @Nested
    @DisplayName("Allocation Validation Tests")
    class AllocationValidationTests {

        @Test
        @DisplayName("Should validate allocation within capacity")
        void shouldValidateAllocationWithinCapacity() {
            try (MockedStatic<SecurityContext> securityContext = mockStatic(SecurityContext.class)) {
                securityContext.when(SecurityContext::getCurrentTenantId).thenReturn(tenantId);

                when(employeeRepository.findById(employeeId)).thenReturn(Optional.of(employee));
                when(projectEmployeeRepository.findAllByEmployeeIdAndTenantIdAndIsActive(
                        employeeId, tenantId, true)).thenReturn(Collections.emptyList());
                when(approvalRepository.findAllByTenantIdAndStatus(
                        eq(tenantId), any(), any(Pageable.class))).thenReturn(Page.empty());

                AllocationValidationResult result = resourceManagementService.validateAllocation(
                        employeeId, projectId, 50, LocalDate.now(), LocalDate.now().plusMonths(3));

                assertThat(result.getIsValid()).isTrue();
                assertThat(result.getRequiresApproval()).isFalse();
                assertThat(result.getResultingAllocation()).isEqualTo(50);
            }
        }

        @Test
        @DisplayName("Should require approval when exceeding 100% capacity")
        void shouldRequireApprovalWhenExceedingCapacity() {
            try (MockedStatic<SecurityContext> securityContext = mockStatic(SecurityContext.class)) {
                securityContext.when(SecurityContext::getCurrentTenantId).thenReturn(tenantId);

                ProjectEmployee existingAllocation = ProjectEmployee.builder()
                        .employeeId(employeeId)
                        .projectId(UUID.randomUUID())
                        .allocationPercentage(80)
                        .startDate(LocalDate.now().minusMonths(1))
                        .isActive(true)
                        .build();

                when(employeeRepository.findById(employeeId)).thenReturn(Optional.of(employee));
                when(projectEmployeeRepository.findAllByEmployeeIdAndTenantIdAndIsActive(
                        employeeId, tenantId, true)).thenReturn(List.of(existingAllocation));
                when(approvalRepository.findAllByTenantIdAndStatus(
                        eq(tenantId), any(), any(Pageable.class))).thenReturn(Page.empty());

                AllocationValidationResult result = resourceManagementService.validateAllocation(
                        employeeId, projectId, 50, LocalDate.now(), LocalDate.now().plusMonths(3));

                assertThat(result.getIsValid()).isTrue();
                assertThat(result.getRequiresApproval()).isTrue();
                assertThat(result.getResultingAllocation()).isEqualTo(130);
            }
        }

        @Test
        @DisplayName("Should reject when end date is before start date")
        void shouldRejectWhenEndDateBeforeStartDate() {
            try (MockedStatic<SecurityContext> securityContext = mockStatic(SecurityContext.class)) {
                securityContext.when(SecurityContext::getCurrentTenantId).thenReturn(tenantId);

                when(employeeRepository.findById(employeeId)).thenReturn(Optional.of(employee));
                when(projectEmployeeRepository.findAllByEmployeeIdAndTenantIdAndIsActive(
                        employeeId, tenantId, true)).thenReturn(Collections.emptyList());
                when(approvalRepository.findAllByTenantIdAndStatus(
                        eq(tenantId), any(), any(Pageable.class))).thenReturn(Page.empty());

                AllocationValidationResult result = resourceManagementService.validateAllocation(
                        employeeId, projectId, 50,
                        LocalDate.now().plusMonths(1), LocalDate.now()); // End before start

                assertThat(result.getIsValid()).isFalse();
                assertThat(result.getMessage()).contains("End date cannot be before start date");
            }
        }
    }

    @Nested
    @DisplayName("Approval Permission Tests")
    class ApprovalPermissionTests {

        @Test
        @DisplayName("Should throw exception when user lacks approval permission")
        void shouldThrowWhenUserLacksApprovalPermission() {
            try (MockedStatic<SecurityContext> securityContext = mockStatic(SecurityContext.class)) {
                UUID requestId = UUID.randomUUID();

                securityContext.when(SecurityContext::getCurrentTenantId).thenReturn(tenantId);
                securityContext.when(SecurityContext::getCurrentEmployeeId).thenReturn(managerId);
                securityContext.when(() -> SecurityContext.hasAnyPermission(any())).thenReturn(false);
                securityContext.when(SecurityContext::isManager).thenReturn(false);

                // Permission check happens before findById is called
                assertThatThrownBy(() ->
                        resourceManagementService.approveAllocationRequest(requestId, "Approved"))
                        .isInstanceOf(SecurityException.class)
                        .hasMessageContaining("do not have permission");
            }
        }

        @Test
        @DisplayName("Should throw exception when approving own request")
        void shouldThrowWhenApprovingOwnRequest() {
            try (MockedStatic<SecurityContext> securityContext = mockStatic(SecurityContext.class)) {
                UUID requestId = UUID.randomUUID();

                securityContext.when(SecurityContext::getCurrentTenantId).thenReturn(tenantId);
                securityContext.when(SecurityContext::getCurrentEmployeeId).thenReturn(managerId);
                securityContext.when(() -> SecurityContext.hasAnyPermission(any())).thenReturn(true);
                securityContext.when(SecurityContext::isManager).thenReturn(true);

                AllocationApprovalRequest request = AllocationApprovalRequest.builder()
                        .employeeId(employeeId)
                        .projectId(projectId)
                        .requestedAllocation(50)
                        .requestedById(managerId) // Same as approver
                        .status(AllocationApprovalRequest.ApprovalStatus.PENDING)
                        .build();
                request.setId(requestId);
                request.setTenantId(tenantId);

                when(approvalRepository.findById(requestId)).thenReturn(Optional.of(request));

                assertThatThrownBy(() ->
                        resourceManagementService.approveAllocationRequest(requestId, "Approved"))
                        .isInstanceOf(IllegalStateException.class)
                        .hasMessageContaining("Cannot approve your own");
            }
        }

        @Test
        @DisplayName("Should allow manager to approve requests")
        void shouldAllowManagerToApprove() {
            try (MockedStatic<SecurityContext> securityContext = mockStatic(SecurityContext.class)) {
                UUID requestId = UUID.randomUUID();
                UUID requesterId = UUID.randomUUID();

                securityContext.when(SecurityContext::getCurrentTenantId).thenReturn(tenantId);
                securityContext.when(SecurityContext::getCurrentEmployeeId).thenReturn(managerId);
                securityContext.when(() -> SecurityContext.hasAnyPermission(
                        Permission.ALLOCATION_APPROVE,
                        Permission.ALLOCATION_MANAGE,
                        Permission.PROJECT_MANAGE,
                        Permission.SYSTEM_ADMIN)).thenReturn(true);
                securityContext.when(SecurityContext::isManager).thenReturn(true);

                AllocationApprovalRequest request = AllocationApprovalRequest.builder()
                        .employeeId(employeeId)
                        .projectId(projectId)
                        .requestedAllocation(50)
                        .requestedById(requesterId)
                        .role("Developer")
                        .startDate(LocalDate.now())
                        .status(AllocationApprovalRequest.ApprovalStatus.PENDING)
                        .build();
                request.setId(requestId);
                request.setTenantId(tenantId);

                when(approvalRepository.findById(requestId)).thenReturn(Optional.of(request));
                when(approvalRepository.save(any())).thenReturn(request);
                when(projectEmployeeRepository.save(any())).thenReturn(null);

                assertThatCode(() ->
                        resourceManagementService.approveAllocationRequest(requestId, "Approved"))
                        .doesNotThrowAnyException();

                verify(approvalRepository).save(argThat(r ->
                        r.getStatus() == AllocationApprovalRequest.ApprovalStatus.APPROVED));
                verify(projectEmployeeRepository).save(any(ProjectEmployee.class));
            }
        }
    }

    @Nested
    @DisplayName("Export Tests")
    class ExportTests {

        @Test
        @DisplayName("Should export workload report as CSV")
        void shouldExportWorkloadReportAsCsv() {
            try (MockedStatic<SecurityContext> securityContext = mockStatic(SecurityContext.class)) {
                securityContext.when(SecurityContext::getCurrentTenantId).thenReturn(tenantId);

                when(employeeRepository.findByTenantId(tenantId)).thenReturn(List.of(employee));
                when(employeeRepository.findById(employeeId)).thenReturn(Optional.of(employee));
                when(projectRepository.findAllByTenantId(eq(tenantId), any(Pageable.class)))
                        .thenReturn(new PageImpl<>(List.of(project)));
                when(departmentRepository.findByTenantId(tenantId)).thenReturn(Collections.emptyList());
                when(projectEmployeeRepository.findAllByEmployeeIdAndTenantIdAndIsActive(
                        any(), eq(tenantId), eq(true))).thenReturn(Collections.emptyList());
                when(projectEmployeeRepository.findAllByProjectIdAndTenantIdAndIsActive(
                        any(), eq(tenantId), eq(true))).thenReturn(Collections.emptyList());
                when(approvalRepository.findAllByTenantIdAndStatus(
                        eq(tenantId), any(), any(Pageable.class))).thenReturn(Page.empty());

                byte[] result = resourceManagementService.exportWorkloadReport("csv", null);

                assertThat(result).isNotNull();
                String csv = new String(result);
                assertThat(csv).contains("Employee");
                assertThat(csv).contains("Department");
                assertThat(csv).contains("Total Allocation");
            }
        }

        @Test
        @DisplayName("Should throw for unsupported Excel format")
        void shouldThrowForUnsupportedExcelFormat() {
            try (MockedStatic<SecurityContext> securityContext = mockStatic(SecurityContext.class)) {
                securityContext.when(SecurityContext::getCurrentTenantId).thenReturn(tenantId);

                when(employeeRepository.findByTenantId(tenantId)).thenReturn(Collections.emptyList());
                when(projectRepository.findAllByTenantId(eq(tenantId), any(Pageable.class)))
                        .thenReturn(Page.empty());
                when(departmentRepository.findByTenantId(tenantId)).thenReturn(Collections.emptyList());

                assertThatThrownBy(() ->
                        resourceManagementService.exportWorkloadReport("xlsx", null))
                        .isInstanceOf(UnsupportedOperationException.class)
                        .hasMessageContaining("Excel export is not yet implemented");
            }
        }

        @Test
        @DisplayName("Should throw for unsupported PDF format")
        void shouldThrowForUnsupportedPdfFormat() {
            try (MockedStatic<SecurityContext> securityContext = mockStatic(SecurityContext.class)) {
                securityContext.when(SecurityContext::getCurrentTenantId).thenReturn(tenantId);

                when(employeeRepository.findByTenantId(tenantId)).thenReturn(Collections.emptyList());
                when(projectRepository.findAllByTenantId(eq(tenantId), any(Pageable.class)))
                        .thenReturn(Page.empty());
                when(departmentRepository.findByTenantId(tenantId)).thenReturn(Collections.emptyList());

                assertThatThrownBy(() ->
                        resourceManagementService.exportWorkloadReport("pdf", null))
                        .isInstanceOf(UnsupportedOperationException.class)
                        .hasMessageContaining("PDF export is not yet implemented");
            }
        }

        @Test
        @DisplayName("Should throw for unknown format")
        void shouldThrowForUnknownFormat() {
            try (MockedStatic<SecurityContext> securityContext = mockStatic(SecurityContext.class)) {
                securityContext.when(SecurityContext::getCurrentTenantId).thenReturn(tenantId);

                when(employeeRepository.findByTenantId(tenantId)).thenReturn(Collections.emptyList());
                when(projectRepository.findAllByTenantId(eq(tenantId), any(Pageable.class)))
                        .thenReturn(Page.empty());
                when(departmentRepository.findByTenantId(tenantId)).thenReturn(Collections.emptyList());

                assertThatThrownBy(() ->
                        resourceManagementService.exportWorkloadReport("unknown", null))
                        .isInstanceOf(IllegalArgumentException.class)
                        .hasMessageContaining("Unsupported export format");
            }
        }
    }

    @Nested
    @DisplayName("Workload Dashboard Tests")
    class WorkloadDashboardTests {

        @Test
        @DisplayName("Should return dashboard with project workloads")
        void shouldReturnDashboardWithProjectWorkloads() {
            try (MockedStatic<SecurityContext> securityContext = mockStatic(SecurityContext.class)) {
                securityContext.when(SecurityContext::getCurrentTenantId).thenReturn(tenantId);

                when(employeeRepository.findByTenantId(tenantId)).thenReturn(List.of(employee));
                when(employeeRepository.findById(employeeId)).thenReturn(Optional.of(employee));
                when(projectRepository.findAllByTenantId(eq(tenantId), any(Pageable.class)))
                        .thenReturn(new PageImpl<>(List.of(project)));
                when(departmentRepository.findByTenantId(tenantId)).thenReturn(Collections.emptyList());
                when(projectEmployeeRepository.findAllByEmployeeIdAndTenantIdAndIsActive(
                        any(), eq(tenantId), eq(true))).thenReturn(Collections.emptyList());
                when(projectEmployeeRepository.findAllByProjectIdAndTenantIdAndIsActive(
                        eq(projectId), eq(tenantId), eq(true))).thenReturn(Collections.emptyList());
                when(approvalRepository.findAllByTenantIdAndStatus(
                        eq(tenantId), any(), any(Pageable.class))).thenReturn(Page.empty());

                WorkloadDashboardData result = resourceManagementService.getWorkloadDashboard(null);

                assertThat(result).isNotNull();
                assertThat(result.getProjectWorkloads()).isNotNull();
                assertThat(result.getHeatmapData()).isNotNull();
                assertThat(result.getTrends()).isNotNull();
                assertThat(result.getSummary()).isNotNull();
            }
        }

        @Test
        @DisplayName("Should calculate trends for last 6 months")
        void shouldCalculateTrendsForLast6Months() {
            try (MockedStatic<SecurityContext> securityContext = mockStatic(SecurityContext.class)) {
                securityContext.when(SecurityContext::getCurrentTenantId).thenReturn(tenantId);

                when(employeeRepository.findByTenantId(tenantId)).thenReturn(List.of(employee));
                when(employeeRepository.findById(employeeId)).thenReturn(Optional.of(employee));
                when(projectRepository.findAllByTenantId(eq(tenantId), any(Pageable.class)))
                        .thenReturn(Page.empty());
                when(departmentRepository.findByTenantId(tenantId)).thenReturn(Collections.emptyList());
                when(projectEmployeeRepository.findAllByEmployeeIdAndTenantIdAndIsActive(
                        any(), eq(tenantId), eq(true))).thenReturn(Collections.emptyList());
                when(approvalRepository.findAllByTenantIdAndStatus(
                        eq(tenantId), any(), any(Pageable.class))).thenReturn(Page.empty());

                WorkloadDashboardData result = resourceManagementService.getWorkloadDashboard(null);

                assertThat(result.getTrends()).hasSize(6);
                assertThat(result.getTrends().get(0).getPeriodLabel()).isNotNull();
            }
        }
    }
}
