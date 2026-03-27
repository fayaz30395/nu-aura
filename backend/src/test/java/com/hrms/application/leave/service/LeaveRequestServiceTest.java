package com.hrms.application.leave.service;

import com.hrms.application.event.DomainEventPublisher;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.employee.Employee;
import com.hrms.domain.leave.LeaveRequest;
import com.hrms.infrastructure.leave.repository.LeaveTypeRepository;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import com.hrms.infrastructure.leave.repository.LeaveRequestRepository;
import com.hrms.application.notification.service.WebSocketNotificationService;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("LeaveRequestService Tests")
class LeaveRequestServiceTest {

    @Mock
    private LeaveRequestRepository leaveRequestRepository;

    @Mock
    private LeaveBalanceService leaveBalanceService;

    @Mock
    private WebSocketNotificationService webSocketNotificationService;

    @Mock
    private EmployeeRepository employeeRepository;

    @Mock
    private LeaveTypeRepository leaveTypeRepository;

    @Mock
    private DomainEventPublisher domainEventPublisher;

    @InjectMocks
    private LeaveRequestService leaveRequestService;

    private static MockedStatic<TenantContext> tenantContextMock;

    private UUID tenantId;
    private UUID employeeId;
    private UUID leaveTypeId;
    private UUID managerId;
    private LeaveRequest leaveRequest;
    private Employee employee;

    @BeforeAll
    static void setUpClass() {
        tenantContextMock = mockStatic(TenantContext.class);
    }

    @AfterAll
    static void tearDownClass() {
        tenantContextMock.close();
    }

    @AfterEach
    void tearDown() {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.clearSynchronization();
        }
    }

    @BeforeEach
    void setUp() {
        // Initialize transaction synchronization for @Transactional behavior in unit tests
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.initSynchronization();
        }

        tenantId = UUID.randomUUID();
        employeeId = UUID.randomUUID();
        leaveTypeId = UUID.randomUUID();
        managerId = UUID.randomUUID();

        tenantContextMock.when(TenantContext::getCurrentTenant).thenReturn(tenantId);
        tenantContextMock.when(TenantContext::requireCurrentTenant).thenReturn(tenantId);

        // Create employee with manager for L1 approval tests
        employee = new Employee();
        employee.setId(employeeId);
        employee.setTenantId(tenantId);
        employee.setManagerId(managerId);
        employee.setFirstName("John");
        employee.setLastName("Doe");

        leaveRequest = LeaveRequest.builder()
                .employeeId(employeeId)
                .leaveTypeId(leaveTypeId)
                .startDate(LocalDate.now().plusDays(1))
                .endDate(LocalDate.now().plusDays(3))
                .totalDays(BigDecimal.valueOf(3.0))
                .reason("Family vacation")
                .status(LeaveRequest.LeaveRequestStatus.PENDING)
                .build();
        leaveRequest.setId(UUID.randomUUID());
        leaveRequest.setTenantId(tenantId);
    }

    @Nested
    @DisplayName("Create Leave Request")
    class CreateLeaveRequestTests {

        @Test
        @DisplayName("Should create leave request successfully when no overlapping leaves")
        void shouldCreateLeaveRequestSuccessfully() {
            when(leaveRequestRepository.findOverlappingLeaves(any(), any(), any(), any()))
                    .thenReturn(Collections.emptyList());
            when(leaveRequestRepository.save(any(LeaveRequest.class)))
                    .thenAnswer(invocation -> invocation.getArgument(0));

            LeaveRequest result = leaveRequestService.createLeaveRequest(leaveRequest);

            assertThat(result).isNotNull();
            assertThat(result.getRequestNumber()).startsWith("LR-");
            assertThat(result.getTenantId()).isEqualTo(tenantId);
            verify(leaveRequestRepository).save(any(LeaveRequest.class));
        }

        @Test
        @DisplayName("Should throw exception when overlapping leave exists")
        void shouldThrowExceptionWhenOverlappingLeaveExists() {
            LeaveRequest existingLeave = LeaveRequest.builder()
                    .employeeId(employeeId)
                    .build();
            existingLeave.setId(UUID.randomUUID());
            when(leaveRequestRepository.findOverlappingLeaves(any(), any(), any(), any()))
                    .thenReturn(List.of(existingLeave));

            assertThatThrownBy(() -> leaveRequestService.createLeaveRequest(leaveRequest))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("overlaps");
        }

        @Test
        @DisplayName("Should throw exception when balance service indicates insufficient balance")
        void shouldThrowExceptionWhenInsufficientBalance() {
            when(leaveRequestRepository.findOverlappingLeaves(any(), any(), any(), any()))
                    .thenReturn(Collections.emptyList());
            when(leaveRequestRepository.save(any(LeaveRequest.class)))
                    .thenAnswer(invocation -> invocation.getArgument(0));
            when(leaveBalanceService.getOrCreateBalance(any(), any(), anyInt()))
                    .thenThrow(new IllegalStateException("Insufficient leave balance"));

            assertThatThrownBy(() -> leaveRequestService.createLeaveRequest(leaveRequest))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("Insufficient");
        }
    }

    @Nested
    @DisplayName("Approve Leave Request")
    class ApproveLeaveRequestTests {

        @Test
        @DisplayName("Should approve leave request successfully when approver is manager")
        void shouldApproveLeaveRequestSuccessfully() {
            UUID requestId = leaveRequest.getId();
            when(leaveRequestRepository.findById(requestId))
                    .thenReturn(Optional.of(leaveRequest));
            when(employeeRepository.findByIdAndTenantId(employeeId, tenantId))
                    .thenReturn(Optional.of(employee));
            when(leaveRequestRepository.save(any(LeaveRequest.class)))
                    .thenAnswer(invocation -> invocation.getArgument(0));

            // Approve with the manager ID (L1 approval)
            LeaveRequest result = leaveRequestService.approveLeaveRequest(requestId, managerId);

            assertThat(result).isNotNull();
            assertThat(result.getStatus()).isEqualTo(LeaveRequest.LeaveRequestStatus.APPROVED);
            verify(leaveBalanceService).deductLeave(employeeId, leaveTypeId, leaveRequest.getTotalDays());
        }

        @Test
        @DisplayName("Should throw exception when leave request not found")
        void shouldThrowExceptionWhenLeaveRequestNotFound() {
            UUID requestId = UUID.randomUUID();
            when(leaveRequestRepository.findById(requestId))
                    .thenReturn(Optional.empty());

            assertThatThrownBy(() -> leaveRequestService.approveLeaveRequest(requestId, managerId))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("not found");
        }

        @Test
        @DisplayName("Should throw exception when approver is not the employee's manager")
        void shouldThrowExceptionWhenApproverIsNotManager() {
            UUID requestId = leaveRequest.getId();
            UUID nonManagerId = UUID.randomUUID();
            when(leaveRequestRepository.findById(requestId))
                    .thenReturn(Optional.of(leaveRequest));
            when(employeeRepository.findByIdAndTenantId(employeeId, tenantId))
                    .thenReturn(Optional.of(employee));

            assertThatThrownBy(() -> leaveRequestService.approveLeaveRequest(requestId, nonManagerId))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("direct manager");
        }

        @Test
        @DisplayName("Should throw exception when employee has no manager assigned")
        void shouldThrowExceptionWhenEmployeeHasNoManager() {
            UUID requestId = leaveRequest.getId();
            Employee employeeWithoutManager = new Employee();
            employeeWithoutManager.setId(employeeId);
            employeeWithoutManager.setTenantId(tenantId);
            employeeWithoutManager.setManagerId(null);

            when(leaveRequestRepository.findById(requestId))
                    .thenReturn(Optional.of(leaveRequest));
            when(employeeRepository.findByIdAndTenantId(employeeId, tenantId))
                    .thenReturn(Optional.of(employeeWithoutManager));

            assertThatThrownBy(() -> leaveRequestService.approveLeaveRequest(requestId, managerId))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("no manager assigned");
        }
    }

    @Nested
    @DisplayName("Reject Leave Request")
    class RejectLeaveRequestTests {

        @Test
        @DisplayName("Should reject leave request successfully when rejector is manager")
        void shouldRejectLeaveRequestSuccessfully() {
            UUID requestId = leaveRequest.getId();
            String rejectionReason = "Insufficient staff coverage";
            when(leaveRequestRepository.findById(requestId))
                    .thenReturn(Optional.of(leaveRequest));
            when(employeeRepository.findByIdAndTenantId(employeeId, tenantId))
                    .thenReturn(Optional.of(employee));
            when(leaveRequestRepository.save(any(LeaveRequest.class)))
                    .thenAnswer(invocation -> invocation.getArgument(0));

            // Reject with the manager ID (L1 approval)
            LeaveRequest result = leaveRequestService.rejectLeaveRequest(requestId, managerId, rejectionReason);

            assertThat(result).isNotNull();
            assertThat(result.getStatus()).isEqualTo(LeaveRequest.LeaveRequestStatus.REJECTED);
            verify(leaveBalanceService, never()).deductLeave(any(), any(), any(BigDecimal.class));
        }

        @Test
        @DisplayName("Should throw exception when rejector is not the employee's manager")
        void shouldThrowExceptionWhenRejectorIsNotManager() {
            UUID requestId = leaveRequest.getId();
            UUID nonManagerId = UUID.randomUUID();
            String rejectionReason = "Insufficient staff coverage";
            when(leaveRequestRepository.findById(requestId))
                    .thenReturn(Optional.of(leaveRequest));
            when(employeeRepository.findByIdAndTenantId(employeeId, tenantId))
                    .thenReturn(Optional.of(employee));

            assertThatThrownBy(() -> leaveRequestService.rejectLeaveRequest(requestId, nonManagerId, rejectionReason))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("direct manager");
        }

        @Test
        @DisplayName("Should throw exception when leave request already approved")
        void shouldThrowExceptionWhenAlreadyApproved() {
            UUID requestId = leaveRequest.getId();
            leaveRequest.setStatus(LeaveRequest.LeaveRequestStatus.APPROVED);

            when(leaveRequestRepository.findById(requestId))
                    .thenReturn(Optional.of(leaveRequest));
            when(employeeRepository.findByIdAndTenantId(employeeId, tenantId))
                    .thenReturn(Optional.of(employee));

            assertThatThrownBy(() -> leaveRequestService.approveLeaveRequest(requestId, managerId))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("Only pending requests can be approved");
        }
    }

    @Nested
    @DisplayName("Cancel Leave Request")
    class CancelLeaveRequestTests {

        @Test
        @DisplayName("Should cancel pending leave request without balance credit")
        void shouldCancelPendingLeaveRequestWithoutBalanceCredit() {
            UUID requestId = leaveRequest.getId();
            String cancellationReason = "Plans changed";
            when(leaveRequestRepository.findById(requestId))
                    .thenReturn(Optional.of(leaveRequest));
            when(leaveRequestRepository.save(any(LeaveRequest.class)))
                    .thenAnswer(invocation -> invocation.getArgument(0));

            LeaveRequest result = leaveRequestService.cancelLeaveRequest(requestId, cancellationReason);

            assertThat(result).isNotNull();
            assertThat(result.getStatus()).isEqualTo(LeaveRequest.LeaveRequestStatus.CANCELLED);
            verify(leaveBalanceService, never()).creditLeave(any(), any(), any(BigDecimal.class));
        }

        @Test
        @DisplayName("Should cancel approved leave request and credit balance")
        void shouldCancelApprovedLeaveRequestAndCreditBalance() {
            UUID requestId = leaveRequest.getId();
            leaveRequest.setStatus(LeaveRequest.LeaveRequestStatus.APPROVED);
            String cancellationReason = "Emergency";
            when(leaveRequestRepository.findById(requestId))
                    .thenReturn(Optional.of(leaveRequest));
            when(leaveRequestRepository.save(any(LeaveRequest.class)))
                    .thenAnswer(invocation -> invocation.getArgument(0));

            LeaveRequest result = leaveRequestService.cancelLeaveRequest(requestId, cancellationReason);

            assertThat(result).isNotNull();
            verify(leaveBalanceService).creditLeave(employeeId, leaveTypeId, leaveRequest.getTotalDays());
        }

        @Test
        @DisplayName("Should throw exception when cancelling leave request from another tenant")
        void shouldThrowExceptionWhenCancellingOtherTenantRequest() {
            UUID requestId = leaveRequest.getId();
            leaveRequest.setTenantId(UUID.randomUUID());
            when(leaveRequestRepository.findById(requestId))
                    .thenReturn(Optional.of(leaveRequest));

            assertThatThrownBy(() -> leaveRequestService.cancelLeaveRequest(requestId, "Not authorized"))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("not found");
        }
    }

    @Nested
    @DisplayName("Half-Day Leave Handling")
    class HalfDayLeaveTests {

        @Test
        @DisplayName("Should deduct 0.5 days for half-day leave approval (R2-006 fix)")
        void shouldDeductHalfDayForHalfDayLeave() {
            // Given - half-day leave request
            leaveRequest.setIsHalfDay(true);
            leaveRequest.setTotalDays(BigDecimal.valueOf(1.0)); // totalDays may store 1.0 for UI purposes
            UUID requestId = leaveRequest.getId();

            when(leaveRequestRepository.findById(requestId))
                    .thenReturn(Optional.of(leaveRequest));
            when(employeeRepository.findByIdAndTenantId(employeeId, tenantId))
                    .thenReturn(Optional.of(employee));
            when(leaveRequestRepository.save(any(LeaveRequest.class)))
                    .thenAnswer(invocation -> invocation.getArgument(0));

            // When
            leaveRequestService.approveLeaveRequest(requestId, managerId);

            // Then - should deduct 0.5 regardless of totalDays value
            verify(leaveBalanceService).deductLeave(
                    eq(employeeId),
                    eq(leaveTypeId),
                    eq(new BigDecimal("0.5")));
        }

        @Test
        @DisplayName("Should deduct full days for non-half-day leave")
        void shouldDeductFullDaysForRegularLeave() {
            // Given - regular (non-half-day) leave request
            leaveRequest.setIsHalfDay(false);
            leaveRequest.setTotalDays(BigDecimal.valueOf(3.0));
            UUID requestId = leaveRequest.getId();

            when(leaveRequestRepository.findById(requestId))
                    .thenReturn(Optional.of(leaveRequest));
            when(employeeRepository.findByIdAndTenantId(employeeId, tenantId))
                    .thenReturn(Optional.of(employee));
            when(leaveRequestRepository.save(any(LeaveRequest.class)))
                    .thenAnswer(invocation -> invocation.getArgument(0));

            // When
            leaveRequestService.approveLeaveRequest(requestId, managerId);

            // Then - should deduct totalDays value
            verify(leaveBalanceService).deductLeave(
                    eq(employeeId),
                    eq(leaveTypeId),
                    eq(BigDecimal.valueOf(3.0)));
        }
    }

    @Nested
    @DisplayName("Update Leave Request")
    class UpdateLeaveRequestTests {

        @Test
        @DisplayName("Should update pending leave request successfully")
        void shouldUpdatePendingLeaveRequestSuccessfully() {
            UUID requestId = leaveRequest.getId();
            LeaveRequest updateData = LeaveRequest.builder()
                    .leaveTypeId(leaveTypeId)
                    .startDate(LocalDate.now().plusDays(5))
                    .endDate(LocalDate.now().plusDays(7))
                    .totalDays(BigDecimal.valueOf(3.0))
                    .isHalfDay(false)
                    .reason("Updated reason")
                    .build();

            when(leaveRequestRepository.findById(requestId))
                    .thenReturn(Optional.of(leaveRequest));
            when(leaveRequestRepository.findOverlappingLeaves(any(), any(), any(), any()))
                    .thenReturn(Collections.emptyList());
            when(leaveRequestRepository.save(any(LeaveRequest.class)))
                    .thenAnswer(invocation -> invocation.getArgument(0));

            LeaveRequest result = leaveRequestService.updateLeaveRequest(requestId, updateData);

            assertThat(result).isNotNull();
            assertThat(result.getReason()).isEqualTo("Updated reason");
            assertThat(result.getStartDate()).isEqualTo(LocalDate.now().plusDays(5));
        }

        @Test
        @DisplayName("Should throw exception when updating approved leave request")
        void shouldThrowExceptionWhenUpdatingApprovedLeaveRequest() {
            UUID requestId = leaveRequest.getId();
            leaveRequest.setStatus(LeaveRequest.LeaveRequestStatus.APPROVED);

            LeaveRequest updateData = LeaveRequest.builder()
                    .startDate(LocalDate.now().plusDays(5))
                    .endDate(LocalDate.now().plusDays(7))
                    .build();

            when(leaveRequestRepository.findById(requestId))
                    .thenReturn(Optional.of(leaveRequest));

            assertThatThrownBy(() -> leaveRequestService.updateLeaveRequest(requestId, updateData))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("Cannot edit leave request");
        }

        @Test
        @DisplayName("Should throw exception when update causes overlap with another leave")
        void shouldThrowExceptionWhenUpdateCausesOverlap() {
            UUID requestId = leaveRequest.getId();
            LeaveRequest updateData = LeaveRequest.builder()
                    .leaveTypeId(leaveTypeId)
                    .startDate(LocalDate.now().plusDays(10))
                    .endDate(LocalDate.now().plusDays(12))
                    .build();

            // Another leave request that would overlap
            LeaveRequest overlappingLeave = LeaveRequest.builder()
                    .employeeId(employeeId)
                    .startDate(LocalDate.now().plusDays(11))
                    .endDate(LocalDate.now().plusDays(13))
                    .build();
            overlappingLeave.setId(UUID.randomUUID()); // Different ID

            when(leaveRequestRepository.findById(requestId))
                    .thenReturn(Optional.of(leaveRequest));
            when(leaveRequestRepository.findOverlappingLeaves(any(), any(), any(), any()))
                    .thenReturn(List.of(overlappingLeave));

            assertThatThrownBy(() -> leaveRequestService.updateLeaveRequest(requestId, updateData))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("overlaps");
        }
    }

    @Nested
    @DisplayName("Query Leave Requests")
    class QueryLeaveRequestTests {

        @Test
        @DisplayName("Should get leave request by ID")
        void shouldGetLeaveRequestById() {
            UUID requestId = leaveRequest.getId();
            when(leaveRequestRepository.findById(requestId))
                    .thenReturn(Optional.of(leaveRequest));

            LeaveRequest result = leaveRequestService.getLeaveRequestById(requestId);

            assertThat(result).isNotNull();
            assertThat(result.getId()).isEqualTo(requestId);
        }

        @Test
        @DisplayName("Should get all leave requests with pagination")
        void shouldGetAllLeaveRequestsWithPagination() {
            Pageable pageable = PageRequest.of(0, 10);
            Page<LeaveRequest> page = new PageImpl<>(List.of(leaveRequest));
            when(leaveRequestRepository.findAllByTenantId(tenantId, pageable))
                    .thenReturn(page);

            Page<LeaveRequest> result = leaveRequestService.getAllLeaveRequests(pageable);

            assertThat(result).isNotNull();
            assertThat(result.getContent()).hasSize(1);
        }

        @Test
        @DisplayName("Should get leave requests by employee")
        void shouldGetLeaveRequestsByEmployee() {
            Pageable pageable = PageRequest.of(0, 10);
            Page<LeaveRequest> page = new PageImpl<>(List.of(leaveRequest));
            when(leaveRequestRepository.findAllByTenantIdAndEmployeeId(tenantId, employeeId, pageable))
                    .thenReturn(page);

            Page<LeaveRequest> result = leaveRequestService.getLeaveRequestsByEmployee(employeeId, pageable);

            assertThat(result).isNotNull();
            assertThat(result.getContent()).hasSize(1);
        }

        @Test
        @DisplayName("Should get leave requests by status")
        void shouldGetLeaveRequestsByStatus() {
            Pageable pageable = PageRequest.of(0, 10);
            Page<LeaveRequest> page = new PageImpl<>(List.of(leaveRequest));
            when(leaveRequestRepository.findAllByTenantIdAndStatus(tenantId, LeaveRequest.LeaveRequestStatus.PENDING, pageable))
                    .thenReturn(page);

            Page<LeaveRequest> result = leaveRequestService.getLeaveRequestsByStatus(LeaveRequest.LeaveRequestStatus.PENDING, pageable);

            assertThat(result).isNotNull();
            assertThat(result.getContent()).hasSize(1);
        }
    }
}
