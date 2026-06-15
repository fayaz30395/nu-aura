package com.nulogic.application.leave.service;

import com.nulogic.api.workflow.dto.WorkflowExecutionRequest;
import com.nulogic.application.event.DomainEventPublisher;
import com.nulogic.application.notification.service.WebSocketNotificationService;
import com.nulogic.application.audit.service.AuditLogService;
import com.nulogic.application.workflow.service.WorkflowService;
import com.nulogic.common.exception.BusinessException;
import com.nulogic.common.security.SecurityContext;
import com.nulogic.common.security.TenantContext;
import com.nulogic.domain.employee.Employee;
import com.nulogic.domain.leave.LeaveRequest;
import com.nulogic.infrastructure.attendance.repository.HolidayRepository;
import com.nulogic.infrastructure.employee.repository.EmployeeRepository;
import com.nulogic.infrastructure.leave.repository.LeaveRequestRepository;
import com.nulogic.infrastructure.leave.repository.LeaveTypeRepository;
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
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("LeaveRequestService Tests")
class LeaveRequestServiceTest {

    private static MockedStatic<TenantContext> tenantContextMock;
    private static MockedStatic<SecurityContext> securityContextMock;
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
    @Mock
    private AuditLogService auditLogService;
    @Mock
    private WorkflowService workflowService;
    @Mock
    private com.nulogic.common.util.TenantTimeService tenantTimeService;
    @Mock
    private HolidayRepository holidayRepository;
    @InjectMocks
    private LeaveRequestService leaveRequestService;
    private UUID tenantId;
    private UUID employeeId;
    private UUID leaveTypeId;
    private UUID managerId;
    private LeaveRequest leaveRequest;
    private Employee employee;

    @BeforeAll
    static void setUpClass() {
        tenantContextMock = mockStatic(TenantContext.class);
        securityContextMock = mockStatic(SecurityContext.class);
    }

    @AfterAll
    static void tearDownClass() {
        tenantContextMock.close();
        securityContextMock.close();
    }

    @AfterEach
    void tearDown() {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.clearSynchronization();
        }
    }

    @BeforeEach
    void setUpTenantTimeServiceDefaults() {
        org.mockito.Mockito.lenient()
                .when(tenantTimeService.today(org.mockito.ArgumentMatchers.nullable(java.util.UUID.class)))
                .thenReturn(java.time.LocalDate.now());
        org.mockito.Mockito.lenient()
                .when(tenantTimeService.now(org.mockito.ArgumentMatchers.nullable(java.util.UUID.class)))
                .thenReturn(java.time.LocalDateTime.now());
        // PROD-2: computeLeaveDays consults the tenant holiday calendar — default: none.
        org.mockito.Mockito.lenient()
                .when(holidayRepository.findAllByTenantIdAndHolidayDateBetween(any(), any(), any()))
                .thenReturn(Collections.emptyList());
        // BA-6: approve paths re-run the overlap check — default: no conflicts.
        org.mockito.Mockito.lenient()
                .when(leaveRequestRepository.findOverlappingLeaves(any(), any(), any(), any()))
                .thenReturn(Collections.emptyList());
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
        securityContextMock.when(SecurityContext::getCurrentEmployeeId).thenReturn(employeeId);
        securityContextMock.when(() -> SecurityContext.hasPermission(anyString())).thenReturn(false);

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
            verify(workflowService).startWorkflow(any(WorkflowExecutionRequest.class));
        }

        @Test
        @DisplayName("Should fail when approval workflow cannot start")
        void shouldFailWhenApprovalWorkflowCannotStart() {
            when(leaveRequestRepository.findOverlappingLeaves(any(), any(), any(), any()))
                    .thenReturn(Collections.emptyList());
            when(leaveRequestRepository.save(any(LeaveRequest.class)))
                    .thenAnswer(invocation -> invocation.getArgument(0));
            when(workflowService.startWorkflow(any(WorkflowExecutionRequest.class)))
                    .thenThrow(new BusinessException("No active workflow definition configured for LEAVE_REQUEST"));

            assertThatThrownBy(() -> leaveRequestService.createLeaveRequest(leaveRequest))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("No active workflow definition configured for LEAVE_REQUEST");

            verify(workflowService).startWorkflow(any(WorkflowExecutionRequest.class));
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
            doThrow(new IllegalArgumentException("Insufficient leave balance"))
                    .when(leaveBalanceService).addPendingLeave(any(), any(), any());

            assertThatThrownBy(() -> leaveRequestService.createLeaveRequest(leaveRequest))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("Insufficient");
        }

        @Test
        @DisplayName("DATA-1: Should reject inverted date range (endDate before startDate)")
        void shouldRejectInvertedDateRange() {
            leaveRequest.setStartDate(LocalDate.now().plusDays(5));
            leaveRequest.setEndDate(LocalDate.now().plusDays(2));

            assertThatThrownBy(() -> leaveRequestService.createLeaveRequest(leaveRequest))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("on or after start date");

            verify(leaveBalanceService, never()).addPendingLeave(any(), any(), any());
            verify(leaveRequestRepository, never()).save(any(LeaveRequest.class));
        }

        @Test
        @DisplayName("BA-3: Should reject half-day leave spanning multiple days")
        void shouldRejectMultiDayHalfDayLeave() {
            leaveRequest.setIsHalfDay(true);
            leaveRequest.setStartDate(LocalDate.now().plusDays(1));
            leaveRequest.setEndDate(LocalDate.now().plusDays(3));

            assertThatThrownBy(() -> leaveRequestService.createLeaveRequest(leaveRequest))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("Half-day");

            verify(leaveBalanceService, never()).addPendingLeave(any(), any(), any());
            verify(leaveRequestRepository, never()).save(any(LeaveRequest.class));
        }
    }

    @Nested
    @DisplayName("Approve Leave Request")
    class ApproveLeaveRequestTests {

        @Test
        @DisplayName("Should approve leave request successfully when approver is manager")
        void shouldApproveLeaveRequestSuccessfully() {
            UUID requestId = leaveRequest.getId();
            when(leaveRequestRepository.findByIdAndTenantId(requestId, tenantId))
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
            when(leaveRequestRepository.findByIdAndTenantId(requestId, tenantId))
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
            when(leaveRequestRepository.findByIdAndTenantId(requestId, tenantId))
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

            when(leaveRequestRepository.findByIdAndTenantId(requestId, tenantId))
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
            when(leaveRequestRepository.findByIdAndTenantId(requestId, tenantId))
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
            when(leaveRequestRepository.findByIdAndTenantId(requestId, tenantId))
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

            when(leaveRequestRepository.findByIdAndTenantId(requestId, tenantId))
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
            when(leaveRequestRepository.findByIdAndTenantId(requestId, tenantId))
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
            when(leaveRequestRepository.findByIdAndTenantId(requestId, tenantId))
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
            // DB-level tenant isolation: cross-tenant records are invisible via findByIdAndTenantId
            when(leaveRequestRepository.findByIdAndTenantId(requestId, tenantId))
                    .thenReturn(Optional.empty());

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

            when(leaveRequestRepository.findByIdAndTenantId(requestId, tenantId))
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

            when(leaveRequestRepository.findByIdAndTenantId(requestId, tenantId))
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

            when(leaveRequestRepository.findByIdAndTenantId(requestId, tenantId))
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
        @DisplayName("BA-4/DATA-4: Should ignore client totalDays, recompute server-side and re-reserve pending")
        void shouldRecomputeTotalDaysAndRebalancePendingOnUpdate() {
            UUID requestId = leaveRequest.getId();
            UUID newLeaveTypeId = UUID.randomUUID();
            // Deterministic Mon-Fri window: 5 working days
            LocalDate monday = LocalDate.now().with(java.time.temporal.TemporalAdjusters.next(java.time.DayOfWeek.MONDAY));
            LeaveRequest updateData = LeaveRequest.builder()
                    .leaveTypeId(newLeaveTypeId)
                    .startDate(monday)
                    .endDate(monday.plusDays(4))
                    .totalDays(BigDecimal.valueOf(1.0)) // bogus client value — must be ignored
                    .isHalfDay(false)
                    .reason("Updated reason")
                    .build();

            when(leaveRequestRepository.findByIdAndTenantId(requestId, tenantId))
                    .thenReturn(Optional.of(leaveRequest));
            when(leaveRequestRepository.findOverlappingLeaves(any(), any(), any(), any()))
                    .thenReturn(Collections.emptyList());
            when(leaveRequestRepository.save(any(LeaveRequest.class)))
                    .thenAnswer(invocation -> invocation.getArgument(0));

            LeaveRequest result = leaveRequestService.updateLeaveRequest(requestId, updateData);

            // Server-side recompute: 5 weekdays, not the client-sent 1.0
            assertThat(result.getTotalDays()).isEqualByComparingTo(BigDecimal.valueOf(5));
            // Old reservation (3.0 on old type) released, new reservation (5 on new type) taken
            verify(leaveBalanceService).releasePendingLeave(employeeId, leaveTypeId, BigDecimal.valueOf(3.0));
            verify(leaveBalanceService).addPendingLeave(employeeId, newLeaveTypeId, BigDecimal.valueOf(5));
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

            when(leaveRequestRepository.findByIdAndTenantId(requestId, tenantId))
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

            when(leaveRequestRepository.findByIdAndTenantId(requestId, tenantId))
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
            when(leaveRequestRepository.findByIdAndTenantId(requestId, tenantId))
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

    @Nested
    @DisplayName("Workflow Callback")
    class WorkflowCallbackTests {

        @Test
        @DisplayName("Should fail approval callback when leave request is missing")
        void shouldFailApprovalCallbackWhenLeaveRequestMissing() {
            UUID requestId = UUID.randomUUID();
            when(leaveRequestRepository.findByIdAndTenantId(requestId, tenantId)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> leaveRequestService.onApproved(tenantId, requestId, managerId))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("Leave request not found for approval callback");

            verify(leaveRequestRepository, never()).save(any(LeaveRequest.class));
        }

        @Test
        @DisplayName("BA-2: Workflow rejection callback should release the pending reservation")
        void shouldReleasePendingLeaveOnWorkflowRejection() {
            UUID requestId = leaveRequest.getId();
            when(leaveRequestRepository.findByIdAndTenantId(requestId, tenantId)).thenReturn(Optional.of(leaveRequest));

            leaveRequestService.onRejected(tenantId, requestId, managerId, "Coverage needed");

            assertThat(leaveRequest.getStatus()).isEqualTo(LeaveRequest.LeaveRequestStatus.REJECTED);
            verify(leaveBalanceService).releasePendingLeave(employeeId, leaveTypeId, BigDecimal.valueOf(3.0));
        }

        @Test
        @DisplayName("BA-2: Workflow rejection of half-day leave should release 0.5 days")
        void shouldReleaseHalfDayPendingOnWorkflowRejection() {
            leaveRequest.setIsHalfDay(true);
            UUID requestId = leaveRequest.getId();
            when(leaveRequestRepository.findByIdAndTenantId(requestId, tenantId)).thenReturn(Optional.of(leaveRequest));

            leaveRequestService.onRejected(tenantId, requestId, managerId, "Coverage needed");

            verify(leaveBalanceService).releasePendingLeave(employeeId, leaveTypeId, new BigDecimal("0.5"));
        }

        @Test
        @DisplayName("BA-6: Workflow approval callback should fail when overlapping approved leave exists")
        void shouldFailWorkflowApprovalWhenApprovedOverlapExists() {
            UUID requestId = leaveRequest.getId();
            LeaveRequest approvedOverlap = LeaveRequest.builder()
                    .employeeId(employeeId)
                    .requestNumber("LR-EXISTING")
                    .status(LeaveRequest.LeaveRequestStatus.APPROVED)
                    .build();
            approvedOverlap.setId(UUID.randomUUID());

            when(leaveRequestRepository.findByIdAndTenantId(requestId, tenantId)).thenReturn(Optional.of(leaveRequest));
            when(leaveRequestRepository.findOverlappingLeaves(any(), any(), any(), any()))
                    .thenReturn(List.of(approvedOverlap));

            assertThatThrownBy(() -> leaveRequestService.onApproved(tenantId, requestId, managerId))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("overlap");

            verify(leaveBalanceService, never()).deductLeave(any(), any(), any(BigDecimal.class));
        }
    }

    @Nested
    @DisplayName("Compute Leave Days")
    class ComputeLeaveDaysTests {

        @Test
        @DisplayName("PROD-2: Should exclude tenant holidays falling on workdays")
        void shouldExcludeHolidaysFromLeaveDays() {
            // Pick a deterministic Mon-Fri window
            LocalDate monday = LocalDate.now().with(java.time.temporal.TemporalAdjusters.next(java.time.DayOfWeek.MONDAY));
            LocalDate friday = monday.plusDays(4);

            com.nulogic.domain.attendance.Holiday holiday = com.nulogic.domain.attendance.Holiday.builder()
                    .holidayName("Festival")
                    .holidayDate(monday.plusDays(2)) // Wednesday
                    .holidayType(com.nulogic.domain.attendance.Holiday.HolidayType.NATIONAL)
                    .year(monday.getYear())
                    .build();
            when(holidayRepository.findAllByTenantIdAndHolidayDateBetween(tenantId, monday, friday))
                    .thenReturn(List.of(holiday));

            BigDecimal days = leaveRequestService.computeLeaveDays(monday, friday, false, tenantId);

            assertThat(days).isEqualByComparingTo(BigDecimal.valueOf(4)); // 5 weekdays - 1 holiday
        }

        @Test
        @DisplayName("PROD-2: Optional/restricted holidays should NOT reduce leave days")
        void shouldNotExcludeOptionalHolidays() {
            LocalDate monday = LocalDate.now().with(java.time.temporal.TemporalAdjusters.next(java.time.DayOfWeek.MONDAY));
            LocalDate friday = monday.plusDays(4);

            com.nulogic.domain.attendance.Holiday optionalHoliday = com.nulogic.domain.attendance.Holiday.builder()
                    .holidayName("Optional Festival")
                    .holidayDate(monday.plusDays(1))
                    .holidayType(com.nulogic.domain.attendance.Holiday.HolidayType.OPTIONAL)
                    .isOptional(true)
                    .year(monday.getYear())
                    .build();
            when(holidayRepository.findAllByTenantIdAndHolidayDateBetween(tenantId, monday, friday))
                    .thenReturn(List.of(optionalHoliday));

            BigDecimal days = leaveRequestService.computeLeaveDays(monday, friday, false, tenantId);

            assertThat(days).isEqualByComparingTo(BigDecimal.valueOf(5));
        }

        @Test
        @DisplayName("DATA-1: Should throw for inverted range instead of returning negative days")
        void shouldThrowForInvertedRange() {
            assertThatThrownBy(() -> leaveRequestService.computeLeaveDays(
                    LocalDate.now().plusDays(5), LocalDate.now().plusDays(1), false, tenantId))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("on or after start date");
        }

        @Test
        @DisplayName("DATA-1: Should throw when range contains no working days")
        void shouldThrowForWeekendOnlyRange() {
            LocalDate saturday = LocalDate.now().with(java.time.temporal.TemporalAdjusters.next(java.time.DayOfWeek.SATURDAY));

            assertThatThrownBy(() -> leaveRequestService.computeLeaveDays(
                    saturday, saturday.plusDays(1), false, tenantId))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("no working days");
        }
    }
}
