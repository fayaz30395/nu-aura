package com.hrms.application.resourcemanagement.service;

import com.hrms.api.resourcemanagement.dto.AllocationDTOs.*;
import com.hrms.api.resourcemanagement.dto.WorkloadDTOs.*;
import com.hrms.api.resourcemanagement.dto.ApprovalDTOs.*;
import com.hrms.common.security.SecurityContext;
import com.hrms.domain.employee.Employee;
import com.hrms.domain.project.Project;
import com.hrms.domain.project.ProjectEmployee;
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
import org.springframework.data.domain.Pageable;

import java.time.LocalDate;
import java.util.*;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for the {@link ResourceManagementService} facade.
 *
 * <p>Core capacity and availability logic is tested directly here.
 * Approval workflow tests validate delegation to {@link AllocationApprovalService}.
 * Analytics tests validate delegation to {@link WorkloadAnalyticsService}.
 *
 * <p>Dedicated unit tests for the sub-services live in
 * {@link AllocationApprovalServiceTest} and {@link WorkloadAnalyticsServiceTest}.
 */
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

    @Mock
    private AllocationApprovalService allocationApprovalService;

    @Mock
    private WorkloadAnalyticsService workloadAnalyticsService;

    @InjectMocks
    private ResourceManagementService resourceManagementService;

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

    // ============================================
    // CORE: Allocation Validation
    // ============================================

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
                        LocalDate.now().plusMonths(1), LocalDate.now()); // end before start

                assertThat(result.getIsValid()).isFalse();
                assertThat(result.getMessage()).contains("End date cannot be before start date");
            }
        }
    }

    // ============================================
    // FACADE: Approval delegation
    // ============================================

    @Nested
    @DisplayName("Approval Delegation Tests")
    class ApprovalDelegationTests {

        @Test
        @DisplayName("approveAllocationRequest delegates to AllocationApprovalService")
        void shouldDelegateApproveToSubService() {
            UUID requestId = UUID.randomUUID();
            doNothing().when(allocationApprovalService)
                    .approveAllocationRequest(requestId, "OK");

            resourceManagementService.approveAllocationRequest(requestId, "OK");

            verify(allocationApprovalService).approveAllocationRequest(requestId, "OK");
        }

        @Test
        @DisplayName("rejectAllocationRequest delegates to AllocationApprovalService")
        void shouldDelegateRejectToSubService() {
            UUID requestId = UUID.randomUUID();
            doNothing().when(allocationApprovalService)
                    .rejectAllocationRequest(requestId, "Not needed");

            resourceManagementService.rejectAllocationRequest(requestId, "Not needed");

            verify(allocationApprovalService).rejectAllocationRequest(requestId, "Not needed");
        }

        @Test
        @DisplayName("getPendingApprovalsCount delegates to AllocationApprovalService")
        void shouldDelegatePendingCountToSubService() {
            when(allocationApprovalService.getPendingApprovalsCount()).thenReturn(5L);

            long count = resourceManagementService.getPendingApprovalsCount();

            assertThat(count).isEqualTo(5L);
            verify(allocationApprovalService).getPendingApprovalsCount();
        }

        @Test
        @DisplayName("getAllPendingRequests delegates to AllocationApprovalService")
        void shouldDelegateGetPendingRequestsToSubService() {
            Page<AllocationApprovalResponse> page = Page.empty();
            when(allocationApprovalService.getAllPendingRequests(null, Pageable.unpaged()))
                    .thenReturn(page);

            Page<AllocationApprovalResponse> result =
                    resourceManagementService.getAllPendingRequests(null, Pageable.unpaged());

            assertThat(result).isSameAs(page);
        }

        @Test
        @DisplayName("getMyPendingApprovals delegates to AllocationApprovalService")
        void shouldDelegateMyPendingApprovalsToSubService() {
            Page<AllocationApprovalResponse> page = Page.empty();
            when(allocationApprovalService.getMyPendingApprovals(Pageable.unpaged())).thenReturn(page);

            Page<AllocationApprovalResponse> result =
                    resourceManagementService.getMyPendingApprovals(Pageable.unpaged());

            assertThat(result).isSameAs(page);
        }
    }

    // ============================================
    // FACADE: Analytics delegation
    // ============================================

    @Nested
    @DisplayName("Analytics Delegation Tests")
    class AnalyticsDelegationTests {

        @Test
        @DisplayName("getWorkloadDashboard delegates to WorkloadAnalyticsService")
        void shouldDelegateDashboardToSubService() {
            WorkloadDashboardData dashboard = WorkloadDashboardData.builder()
                    .employeeWorkloads(Collections.emptyList())
                    .departmentWorkloads(Collections.emptyList())
                    .projectWorkloads(Collections.emptyList())
                    .heatmapData(Collections.emptyList())
                    .trends(Collections.emptyList())
                    .build();
            when(workloadAnalyticsService.getWorkloadDashboard(null)).thenReturn(dashboard);

            WorkloadDashboardData result = resourceManagementService.getWorkloadDashboard(null);

            assertThat(result).isSameAs(dashboard);
            verify(workloadAnalyticsService).getWorkloadDashboard(null);
        }

        @Test
        @DisplayName("getDepartmentWorkloads delegates to WorkloadAnalyticsService")
        void shouldDelegateDeptWorkloadsToSubService() {
            LocalDate start = LocalDate.now();
            LocalDate end = start.plusMonths(1);
            when(workloadAnalyticsService.getDepartmentWorkloads(start, end))
                    .thenReturn(Collections.emptyList());

            resourceManagementService.getDepartmentWorkloads(start, end);

            verify(workloadAnalyticsService).getDepartmentWorkloads(start, end);
        }

        @Test
        @DisplayName("exportWorkloadReport delegates to WorkloadAnalyticsService")
        void shouldDelegateExportToSubService() {
            byte[] csv = "Employee,Code\n".getBytes();
            when(workloadAnalyticsService.exportWorkloadReport(eq("csv"), any())).thenReturn(csv);

            byte[] result = resourceManagementService.exportWorkloadReport("csv", null);

            assertThat(result).isSameAs(csv);
            verify(workloadAnalyticsService).exportWorkloadReport(eq("csv"), any());
        }
    }
}
