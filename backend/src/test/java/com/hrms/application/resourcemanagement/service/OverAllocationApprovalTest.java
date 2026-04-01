package com.hrms.application.resourcemanagement.service;

import com.hrms.api.resourcemanagement.dto.AllocationDTOs.AllocationValidationResult;
import com.hrms.api.resourcemanagement.dto.ApprovalDTOs.AllocationApprovalResponse;
import com.hrms.api.resourcemanagement.dto.ApprovalDTOs.CreateAllocationRequest;
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
import org.mockito.ArgumentCaptor;
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
 * Tests that over-allocation (&gt;100%) correctly triggers the approval flow.
 * Scenario: Employee allocated 70% on Project A, then 50% on Project B = 120% total.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("Over-Allocation (>100%) Approval Flow Tests")
class OverAllocationApprovalTest {

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
    private UUID projectAId;
    private UUID projectBId;
    private UUID requesterId;
    private Employee employee;
    private Project projectA;
    private Project projectB;

    @BeforeEach
    void setUp() {
        tenantId = UUID.randomUUID();
        employeeId = UUID.randomUUID();
        projectAId = UUID.randomUUID();
        projectBId = UUID.randomUUID();
        requesterId = UUID.randomUUID();

        employee = Employee.builder()
                .employeeCode("EMP001")
                .firstName("Jane")
                .lastName("Smith")
                .build();
        employee.setId(employeeId);
        employee.setTenantId(tenantId);
        employee.setStatus(Employee.EmployeeStatus.ACTIVE);

        projectA = Project.builder()
                .projectCode("PRJA")
                .name("Project Alpha")
                .status(Project.ProjectStatus.IN_PROGRESS)
                .startDate(LocalDate.now().minusMonths(2))
                .build();
        projectA.setId(projectAId);
        projectA.setTenantId(tenantId);

        projectB = Project.builder()
                .projectCode("PRJB")
                .name("Project Beta")
                .status(Project.ProjectStatus.IN_PROGRESS)
                .startDate(LocalDate.now().minusMonths(1))
                .build();
        projectB.setId(projectBId);
        projectB.setTenantId(tenantId);
    }

    @Test
    @DisplayName("Allocating 50% when employee already has 70% should require approval (total 120%)")
    void shouldRequireApprovalWhenTotalExceeds100Percent() {
        try (MockedStatic<SecurityContext> securityContext = mockStatic(SecurityContext.class)) {
            securityContext.when(SecurityContext::getCurrentTenantId).thenReturn(tenantId);

            // Employee already has 70% on Project A
            ProjectEmployee existingAllocation = ProjectEmployee.builder()
                    .employeeId(employeeId)
                    .projectId(projectAId)
                    .allocationPercentage(70)
                    .startDate(LocalDate.now().minusMonths(1))
                    .isActive(true)
                    .build();
            existingAllocation.setTenantId(tenantId);

            when(employeeRepository.findById(employeeId)).thenReturn(Optional.of(employee));
            when(projectEmployeeRepository.findAllByEmployeeIdAndTenantIdAndIsActive(
                    employeeId, tenantId, true)).thenReturn(List.of(existingAllocation));
            when(approvalRepository.findAllByTenantIdAndStatus(
                    eq(tenantId), any(), any(Pageable.class))).thenReturn(Page.empty());

            // Validate: add 50% on Project B => total 120%
            AllocationValidationResult result = resourceManagementService.validateAllocation(
                    employeeId, projectBId, 50,
                    LocalDate.now(), LocalDate.now().plusMonths(3));

            assertThat(result.getIsValid()).isTrue();
            assertThat(result.getRequiresApproval()).isTrue();
            assertThat(result.getResultingAllocation()).isEqualTo(120);
            assertThat(result.getMessage()).contains("exceed 100%");
            assertThat(result.getMessage()).contains("Approval required");
        }
    }

    @Test
    @DisplayName("createAllocationRequest should create PENDING approval when over-allocated")
    void shouldCreatePendingApprovalRequestForOverAllocation() {
        try (MockedStatic<SecurityContext> securityContext = mockStatic(SecurityContext.class)) {
            securityContext.when(SecurityContext::getCurrentTenantId).thenReturn(tenantId);
            securityContext.when(SecurityContext::getCurrentEmployeeId).thenReturn(requesterId);

            // Build the CreateAllocationRequest for the 50% on Project B
            CreateAllocationRequest request = new CreateAllocationRequest();
            request.setEmployeeId(employeeId);
            request.setProjectId(projectBId);
            request.setAllocationPercentage(50);
            request.setRole("DEVELOPER");
            request.setStartDate(LocalDate.now());
            request.setEndDate(LocalDate.now().plusMonths(3));
            request.setReason("Project needs additional developer bandwidth");

            AllocationApprovalResponse expectedResponse = AllocationApprovalResponse.builder()
                    .id(UUID.randomUUID())
                    .employeeId(employeeId)
                    .projectId(projectBId)
                    .requestedAllocation(50)
                    .status(AllocationApprovalRequest.ApprovalStatus.PENDING)
                    .build();

            when(allocationApprovalService.createAllocationRequest(request))
                    .thenReturn(expectedResponse);

            // Act
            AllocationApprovalResponse response = resourceManagementService.createAllocationRequest(request);

            // Assert: request was delegated and returned with PENDING status
            verify(allocationApprovalService).createAllocationRequest(request);
            assertThat(response.getStatus()).isEqualTo(AllocationApprovalRequest.ApprovalStatus.PENDING);
            assertThat(response.getRequestedAllocation()).isEqualTo(50);
        }
    }

    @Test
    @DisplayName("Allocating within 100% should not require approval")
    void shouldNotRequireApprovalWhenWithin100Percent() {
        try (MockedStatic<SecurityContext> securityContext = mockStatic(SecurityContext.class)) {
            securityContext.when(SecurityContext::getCurrentTenantId).thenReturn(tenantId);

            // Employee already has 40% on Project A
            ProjectEmployee existingAllocation = ProjectEmployee.builder()
                    .employeeId(employeeId)
                    .projectId(projectAId)
                    .allocationPercentage(40)
                    .startDate(LocalDate.now().minusMonths(1))
                    .isActive(true)
                    .build();
            existingAllocation.setTenantId(tenantId);

            when(employeeRepository.findById(employeeId)).thenReturn(Optional.of(employee));
            when(projectEmployeeRepository.findAllByEmployeeIdAndTenantIdAndIsActive(
                    employeeId, tenantId, true)).thenReturn(List.of(existingAllocation));
            when(approvalRepository.findAllByTenantIdAndStatus(
                    eq(tenantId), any(), any(Pageable.class))).thenReturn(Page.empty());

            // Validate: add 50% on Project B => total 90%, within capacity
            AllocationValidationResult result = resourceManagementService.validateAllocation(
                    employeeId, projectBId, 50,
                    LocalDate.now(), LocalDate.now().plusMonths(3));

            assertThat(result.getIsValid()).isTrue();
            assertThat(result.getRequiresApproval()).isFalse();
            assertThat(result.getResultingAllocation()).isEqualTo(90);
        }
    }

    @Test
    @DisplayName("Allocating exactly 100% should not require approval")
    void shouldNotRequireApprovalAtExactly100Percent() {
        try (MockedStatic<SecurityContext> securityContext = mockStatic(SecurityContext.class)) {
            securityContext.when(SecurityContext::getCurrentTenantId).thenReturn(tenantId);

            ProjectEmployee existingAllocation = ProjectEmployee.builder()
                    .employeeId(employeeId)
                    .projectId(projectAId)
                    .allocationPercentage(50)
                    .startDate(LocalDate.now().minusMonths(1))
                    .isActive(true)
                    .build();
            existingAllocation.setTenantId(tenantId);

            when(employeeRepository.findById(employeeId)).thenReturn(Optional.of(employee));
            when(projectEmployeeRepository.findAllByEmployeeIdAndTenantIdAndIsActive(
                    employeeId, tenantId, true)).thenReturn(List.of(existingAllocation));
            when(approvalRepository.findAllByTenantIdAndStatus(
                    eq(tenantId), any(), any(Pageable.class))).thenReturn(Page.empty());

            // Validate: add 50% on Project B => total 100%, exactly at capacity
            AllocationValidationResult result = resourceManagementService.validateAllocation(
                    employeeId, projectBId, 50,
                    LocalDate.now(), LocalDate.now().plusMonths(3));

            assertThat(result.getIsValid()).isTrue();
            assertThat(result.getRequiresApproval()).isFalse();
            assertThat(result.getResultingAllocation()).isEqualTo(100);
        }
    }
}
