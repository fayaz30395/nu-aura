package com.nulogic.application.resourcemanagement.service;

import com.nulogic.api.resourcemanagement.dto.ApprovalDTOs.AllocationApprovalResponse;
import com.nulogic.common.exception.ResourceNotFoundException;
import com.nulogic.common.security.Permission;
import com.nulogic.common.security.SecurityContext;
import com.nulogic.domain.employee.Employee;
import com.nulogic.domain.project.Project;
import com.nulogic.domain.project.ProjectEmployee;
import com.nulogic.domain.resourcemanagement.AllocationApprovalRequest;
import com.nulogic.infrastructure.employee.repository.EmployeeRepository;
import com.nulogic.infrastructure.project.repository.HrmsProjectRepository;
import com.nulogic.infrastructure.project.repository.ProjectEmployeeRepository;
import com.nulogic.infrastructure.resourcemanagement.repository.AllocationApprovalRequestRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.LocalDate;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("AllocationApprovalService Tests")
class AllocationApprovalServiceTest {

    @Mock
    private AllocationApprovalRequestRepository approvalRepository;

    @Mock
    private EmployeeRepository employeeRepository;

    @Mock
    private HrmsProjectRepository projectRepository;

    @Mock
    private ProjectEmployeeRepository projectEmployeeRepository;

    @Mock
    private com.nulogic.common.util.TenantTimeService tenantTimeService;

    @InjectMocks
    private AllocationApprovalService allocationApprovalService;

    @BeforeEach
    void setUpTenantTimeServiceDefaults() {
        org.mockito.Mockito.lenient()
                .when(tenantTimeService.today(org.mockito.ArgumentMatchers.nullable(java.util.UUID.class)))
                .thenReturn(java.time.LocalDate.now());
        org.mockito.Mockito.lenient()
                .when(tenantTimeService.now(org.mockito.ArgumentMatchers.nullable(java.util.UUID.class)))
                .thenReturn(java.time.LocalDateTime.now());
    }

    private UUID tenantId;
    private UUID employeeId;
    private UUID projectId;
    private UUID managerId;
    private UUID requesterId;
    private Employee employee;
    private Project project;

    @BeforeEach
    void setUp() {
        tenantId = UUID.randomUUID();
        employeeId = UUID.randomUUID();
        projectId = UUID.randomUUID();
        managerId = UUID.randomUUID();
        requesterId = UUID.randomUUID();

        employee = Employee.builder()
                .employeeCode("EMP001")
                .firstName("Jane")
                .lastName("Smith")
                .build();
        employee.setId(employeeId);
        employee.setTenantId(tenantId);

        project = Project.builder()
                .projectCode("PRJ001")
                .name("Alpha Project")
                .status(Project.ProjectStatus.IN_PROGRESS)
                .startDate(LocalDate.now().minusMonths(1))
                .build();
        project.setId(projectId);
        project.setTenantId(tenantId);
    }

    // ============================================
    // getPendingApprovalsCount
    // ============================================

    private AllocationApprovalRequest buildRequest(UUID id, UUID requestedById,
                                                   AllocationApprovalRequest.ApprovalStatus status) {
        AllocationApprovalRequest request = AllocationApprovalRequest.builder()
                .employeeId(employeeId)
                .projectId(projectId)
                .requestedAllocation(50)
                .role("Developer")
                .startDate(LocalDate.now())
                .requestedById(requestedById)
                .status(status)
                .build();
        request.setId(id);
        request.setTenantId(tenantId);
        return request;
    }

    // ============================================
    // getAllocationRequest
    // ============================================

    @Nested
    @DisplayName("getPendingApprovalsCount")
    class PendingCountTests {

        @Test
        @DisplayName("Should return count from repository")
        void shouldReturnPendingCount() {
            try (MockedStatic<SecurityContext> sc = mockStatic(SecurityContext.class)) {
                sc.when(SecurityContext::getCurrentTenantId).thenReturn(tenantId);
                when(approvalRepository.countByTenantIdAndStatus(
                        tenantId, AllocationApprovalRequest.ApprovalStatus.PENDING)).thenReturn(7L);

                long count = allocationApprovalService.getPendingApprovalsCount();

                assertThat(count).isEqualTo(7L);
            }
        }
    }

    // ============================================
    // approveAllocationRequest
    // ============================================

    @Nested
    @DisplayName("getAllocationRequest")
    class GetAllocationRequestTests {

        @Test
        @DisplayName("Should return approval response for valid request")
        void shouldReturnResponseForValidRequest() {
            UUID requestId = UUID.randomUUID();
            AllocationApprovalRequest request = buildRequest(requestId, requesterId,
                    AllocationApprovalRequest.ApprovalStatus.PENDING);

            try (MockedStatic<SecurityContext> sc = mockStatic(SecurityContext.class)) {
                sc.when(SecurityContext::getCurrentTenantId).thenReturn(tenantId);
                when(approvalRepository.findByIdAndTenantId(requestId, tenantId)).thenReturn(Optional.of(request));
                when(employeeRepository.findById(employeeId)).thenReturn(Optional.of(employee));
                when(projectRepository.findById(projectId)).thenReturn(Optional.of(project));
                when(employeeRepository.findById(requesterId)).thenReturn(Optional.empty());
                when(projectEmployeeRepository.findAllByEmployeeIdAndTenantIdAndIsActive(
                        any(), any(), eq(true))).thenReturn(Collections.emptyList());

                AllocationApprovalResponse response = allocationApprovalService.getAllocationRequest(requestId);

                assertThat(response).isNotNull();
            }
        }

        @Test
        @DisplayName("Should throw ResourceNotFoundException when request not found")
        void shouldThrowWhenNotFound() {
            UUID requestId = UUID.randomUUID();

            try (MockedStatic<SecurityContext> sc = mockStatic(SecurityContext.class)) {
                sc.when(SecurityContext::getCurrentTenantId).thenReturn(tenantId);
                when(approvalRepository.findByIdAndTenantId(requestId, tenantId)).thenReturn(Optional.empty());

                assertThatThrownBy(() -> allocationApprovalService.getAllocationRequest(requestId))
                        .isInstanceOf(ResourceNotFoundException.class);
            }
        }

        @Test
        @DisplayName("Should throw ResourceNotFoundException when request belongs to different tenant")
        void shouldThrowWhenWrongTenant() {
            UUID requestId = UUID.randomUUID();
            AllocationApprovalRequest request = buildRequest(requestId, requesterId,
                    AllocationApprovalRequest.ApprovalStatus.PENDING);
            request.setTenantId(UUID.randomUUID()); // different tenant

            try (MockedStatic<SecurityContext> sc = mockStatic(SecurityContext.class)) {
                sc.when(SecurityContext::getCurrentTenantId).thenReturn(tenantId);
                when(approvalRepository.findByIdAndTenantId(requestId, tenantId)).thenReturn(Optional.empty());

                assertThatThrownBy(() -> allocationApprovalService.getAllocationRequest(requestId))
                        .isInstanceOf(ResourceNotFoundException.class);
            }
        }
    }

    // ============================================
    // rejectAllocationRequest
    // ============================================

    @Nested
    @DisplayName("approveAllocationRequest")
    class ApproveRequestTests {

        @Test
        @DisplayName("Should throw SecurityException when user lacks permission")
        void shouldThrowWhenLacksPermission() {
            UUID requestId = UUID.randomUUID();

            try (MockedStatic<SecurityContext> sc = mockStatic(SecurityContext.class)) {
                sc.when(SecurityContext::getCurrentTenantId).thenReturn(tenantId);
                sc.when(SecurityContext::getCurrentEmployeeId).thenReturn(managerId);
                sc.when(() -> SecurityContext.hasAnyPermission(any())).thenReturn(false);
                sc.when(SecurityContext::isManager).thenReturn(false);

                assertThatThrownBy(() ->
                        allocationApprovalService.approveAllocationRequest(requestId, "OK"))
                        .isInstanceOf(SecurityException.class)
                        .hasMessageContaining("do not have permission");
            }
        }

        @Test
        @DisplayName("Should throw IllegalStateException when approving own request")
        void shouldThrowWhenApprovingOwnRequest() {
            UUID requestId = UUID.randomUUID();
            AllocationApprovalRequest request = buildRequest(requestId, managerId,
                    AllocationApprovalRequest.ApprovalStatus.PENDING);

            try (MockedStatic<SecurityContext> sc = mockStatic(SecurityContext.class)) {
                sc.when(SecurityContext::getCurrentTenantId).thenReturn(tenantId);
                sc.when(SecurityContext::getCurrentEmployeeId).thenReturn(managerId);
                sc.when(() -> SecurityContext.hasAnyPermission(any())).thenReturn(true);
                sc.when(SecurityContext::isManager).thenReturn(true);
                when(approvalRepository.findByIdAndTenantId(requestId, tenantId)).thenReturn(Optional.of(request));

                assertThatThrownBy(() ->
                        allocationApprovalService.approveAllocationRequest(requestId, "OK"))
                        .isInstanceOf(IllegalStateException.class)
                        .hasMessageContaining("Cannot approve your own");
            }
        }

        @Test
        @DisplayName("Should throw IllegalStateException when request already resolved")
        void shouldThrowWhenAlreadyResolved() {
            UUID requestId = UUID.randomUUID();
            AllocationApprovalRequest request = buildRequest(requestId, requesterId,
                    AllocationApprovalRequest.ApprovalStatus.APPROVED);

            try (MockedStatic<SecurityContext> sc = mockStatic(SecurityContext.class)) {
                sc.when(SecurityContext::getCurrentTenantId).thenReturn(tenantId);
                sc.when(SecurityContext::getCurrentEmployeeId).thenReturn(managerId);
                sc.when(() -> SecurityContext.hasAnyPermission(any())).thenReturn(true);
                sc.when(SecurityContext::isManager).thenReturn(true);
                when(approvalRepository.findByIdAndTenantId(requestId, tenantId)).thenReturn(Optional.of(request));

                assertThatThrownBy(() ->
                        allocationApprovalService.approveAllocationRequest(requestId, "OK"))
                        .isInstanceOf(IllegalStateException.class)
                        .hasMessageContaining("Request is already");
            }
        }

        @Test
        @DisplayName("Should approve request and create ProjectEmployee assignment")
        void shouldApproveAndCreateAssignment() {
            UUID requestId = UUID.randomUUID();
            AllocationApprovalRequest request = buildRequest(requestId, requesterId,
                    AllocationApprovalRequest.ApprovalStatus.PENDING);

            try (MockedStatic<SecurityContext> sc = mockStatic(SecurityContext.class)) {
                sc.when(SecurityContext::getCurrentTenantId).thenReturn(tenantId);
                sc.when(SecurityContext::getCurrentEmployeeId).thenReturn(managerId);
                sc.when(() -> SecurityContext.hasAnyPermission(
                        Permission.ALLOCATION_APPROVE,
                        Permission.ALLOCATION_MANAGE,
                        Permission.PROJECT_MANAGE,
                        Permission.SYSTEM_ADMIN)).thenReturn(true);
                sc.when(SecurityContext::isManager).thenReturn(true);
                when(approvalRepository.findByIdAndTenantId(requestId, tenantId)).thenReturn(Optional.of(request));
                when(approvalRepository.save(any())).thenReturn(request);
                when(projectEmployeeRepository.save(any())).thenReturn(null);

                assertThatCode(() ->
                        allocationApprovalService.approveAllocationRequest(requestId, "Looks good"))
                        .doesNotThrowAnyException();

                verify(approvalRepository).save(argThat(r ->
                        r.getStatus() == AllocationApprovalRequest.ApprovalStatus.APPROVED
                                && r.getApprovalComment().equals("Looks good")));
                verify(projectEmployeeRepository).save(any(ProjectEmployee.class));
            }
        }
    }

    // ============================================
    // getAllPendingRequests
    // ============================================

    @Nested
    @DisplayName("rejectAllocationRequest")
    class RejectRequestTests {

        @Test
        @DisplayName("Should reject request and set reason")
        void shouldRejectAndSetReason() {
            UUID requestId = UUID.randomUUID();
            AllocationApprovalRequest request = buildRequest(requestId, requesterId,
                    AllocationApprovalRequest.ApprovalStatus.PENDING);

            try (MockedStatic<SecurityContext> sc = mockStatic(SecurityContext.class)) {
                sc.when(SecurityContext::getCurrentTenantId).thenReturn(tenantId);
                sc.when(SecurityContext::getCurrentEmployeeId).thenReturn(managerId);
                sc.when(() -> SecurityContext.hasAnyPermission(any())).thenReturn(true);
                sc.when(SecurityContext::isManager).thenReturn(true);
                when(approvalRepository.findByIdAndTenantId(requestId, tenantId)).thenReturn(Optional.of(request));
                when(approvalRepository.save(any())).thenReturn(request);

                assertThatCode(() ->
                        allocationApprovalService.rejectAllocationRequest(requestId, "Not justified"))
                        .doesNotThrowAnyException();

                verify(approvalRepository).save(argThat(r ->
                        r.getStatus() == AllocationApprovalRequest.ApprovalStatus.REJECTED
                                && "Not justified".equals(r.getRejectionReason())));
                verify(projectEmployeeRepository, never()).save(any());
            }
        }

        @Test
        @DisplayName("Should throw when rejecting own request")
        void shouldThrowWhenRejectingOwnRequest() {
            UUID requestId = UUID.randomUUID();
            AllocationApprovalRequest request = buildRequest(requestId, managerId,
                    AllocationApprovalRequest.ApprovalStatus.PENDING);

            try (MockedStatic<SecurityContext> sc = mockStatic(SecurityContext.class)) {
                sc.when(SecurityContext::getCurrentTenantId).thenReturn(tenantId);
                sc.when(SecurityContext::getCurrentEmployeeId).thenReturn(managerId);
                sc.when(() -> SecurityContext.hasAnyPermission(any())).thenReturn(true);
                sc.when(SecurityContext::isManager).thenReturn(true);
                when(approvalRepository.findByIdAndTenantId(requestId, tenantId)).thenReturn(Optional.of(request));

                assertThatThrownBy(() ->
                        allocationApprovalService.rejectAllocationRequest(requestId, "Reason"))
                        .isInstanceOf(IllegalStateException.class)
                        .hasMessageContaining("Cannot reject your own");
            }
        }
    }

    // ============================================
    // Helpers
    // ============================================

    @Nested
    @DisplayName("getAllPendingRequests")
    class GetPendingRequestsTests {

        @Test
        @DisplayName("Should return mapped page of pending requests")
        void shouldReturnPageOfPendingRequests() {
            UUID requestId = UUID.randomUUID();
            AllocationApprovalRequest request = buildRequest(requestId, requesterId,
                    AllocationApprovalRequest.ApprovalStatus.PENDING);

            try (MockedStatic<SecurityContext> sc = mockStatic(SecurityContext.class)) {
                sc.when(SecurityContext::getCurrentTenantId).thenReturn(tenantId);
                when(approvalRepository.findAllByTenantIdAndStatus(
                        eq(tenantId), eq(AllocationApprovalRequest.ApprovalStatus.PENDING),
                        any(Pageable.class)))
                        .thenReturn(new org.springframework.data.domain.PageImpl<>(List.of(request)));
                when(employeeRepository.findById(employeeId)).thenReturn(Optional.of(employee));
                when(projectRepository.findById(projectId)).thenReturn(Optional.of(project));
                when(employeeRepository.findById(requesterId)).thenReturn(Optional.empty());
                when(projectEmployeeRepository.findAllByEmployeeIdAndTenantIdAndIsActive(
                        any(), any(), eq(true))).thenReturn(Collections.emptyList());

                Page<AllocationApprovalResponse> result =
                        allocationApprovalService.getAllPendingRequests(null, Pageable.unpaged());

                assertThat(result.getTotalElements()).isEqualTo(1);
            }
        }
    }
}
