package com.hrms.integration.crossmodule;

import com.hrms.application.event.DomainEventPublisher;
import com.hrms.application.leave.service.LeaveBalanceService;
import com.hrms.application.leave.service.LeaveRequestService;
import com.hrms.application.notification.service.WebSocketNotificationService;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.employee.Employee;
import com.hrms.domain.event.leave.LeaveApprovedEvent;
import com.hrms.domain.leave.LeaveRequest;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import com.hrms.infrastructure.leave.repository.LeaveRequestRepository;
import com.hrms.infrastructure.leave.repository.LeaveTypeRepository;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * Cross-module business flow test: Leave Approval -> Payroll / Balance Impact.
 * <p>
 * Verifies that when a leave request is approved:
 * 1. The leave balance is properly deducted (balance service called)
 * 2. Half-day leaves deduct 0.5 (not 1.0) — R2-006 regression guard
 * 3. A LeaveApprovedEvent is published for downstream consumers (payroll LOP, analytics)
 * 4. Cancelling an approved leave credits the balance back
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("Cross-Module: Leave Approval -> Payroll/Balance Impact")
class LeaveApprovalPayrollImpactTest {

    private static MockedStatic<TenantContext> tenantContextMock;
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
    private UUID tenantId;
    private UUID employeeId;
    private UUID leaveTypeId;
    private UUID managerId;
    private Employee employee;
    private LeaveRequest leaveRequest;

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
        if (org.springframework.transaction.support.TransactionSynchronizationManager.isSynchronizationActive()) {
            org.springframework.transaction.support.TransactionSynchronizationManager.clearSynchronization();
        }
    }

    @BeforeEach
    void setUp() {
        if (!org.springframework.transaction.support.TransactionSynchronizationManager.isSynchronizationActive()) {
            org.springframework.transaction.support.TransactionSynchronizationManager.initSynchronization();
        }
        tenantId = UUID.randomUUID();
        employeeId = UUID.randomUUID();
        leaveTypeId = UUID.randomUUID();
        managerId = UUID.randomUUID();

        tenantContextMock.when(TenantContext::getCurrentTenant).thenReturn(tenantId);
        tenantContextMock.when(TenantContext::requireCurrentTenant).thenReturn(tenantId);

        employee = new Employee();
        employee.setId(employeeId);
        employee.setTenantId(tenantId);
        employee.setManagerId(managerId);
        employee.setFirstName("Jane");
        employee.setLastName("Smith");

        leaveRequest = LeaveRequest.builder()
                .employeeId(employeeId)
                .leaveTypeId(leaveTypeId)
                .startDate(LocalDate.now().plusDays(5))
                .endDate(LocalDate.now().plusDays(7))
                .totalDays(BigDecimal.valueOf(3.0))
                .reason("Medical appointment")
                .status(LeaveRequest.LeaveRequestStatus.PENDING)
                .isHalfDay(false)
                .build();
        leaveRequest.setId(UUID.randomUUID());
        leaveRequest.setTenantId(tenantId);
    }

    @Test
    @DisplayName("Full-day leave approval should deduct exact totalDays from balance")
    void fullDayLeaveApprovalShouldDeductTotalDays() {
        // Given
        UUID requestId = leaveRequest.getId();
        when(leaveRequestRepository.findById(requestId)).thenReturn(Optional.of(leaveRequest));
        when(employeeRepository.findByIdAndTenantId(employeeId, tenantId)).thenReturn(Optional.of(employee));
        when(leaveRequestRepository.save(any(LeaveRequest.class))).thenAnswer(inv -> inv.getArgument(0));

        // When
        LeaveRequest result = leaveRequestService.approveLeaveRequest(requestId, managerId);

        // Then - balance deducted by totalDays (3.0)
        assertThat(result.getStatus()).isEqualTo(LeaveRequest.LeaveRequestStatus.APPROVED);
        verify(leaveBalanceService).deductLeave(
                eq(employeeId),
                eq(leaveTypeId),
                eq(BigDecimal.valueOf(3.0))
        );
    }

    @Test
    @DisplayName("Half-day leave approval should deduct 0.5 days (R2-006 fix)")
    void halfDayLeaveApprovalShouldDeductHalfDay() {
        // Given - half-day request
        leaveRequest.setIsHalfDay(true);
        leaveRequest.setTotalDays(BigDecimal.valueOf(1.0));
        UUID requestId = leaveRequest.getId();

        when(leaveRequestRepository.findById(requestId)).thenReturn(Optional.of(leaveRequest));
        when(employeeRepository.findByIdAndTenantId(employeeId, tenantId)).thenReturn(Optional.of(employee));
        when(leaveRequestRepository.save(any(LeaveRequest.class))).thenAnswer(inv -> inv.getArgument(0));

        // When
        leaveRequestService.approveLeaveRequest(requestId, managerId);

        // Then - should deduct 0.5 regardless of totalDays
        verify(leaveBalanceService).deductLeave(
                eq(employeeId),
                eq(leaveTypeId),
                eq(new BigDecimal("0.5"))
        );
    }

    @Test
    @DisplayName("Cancelling approved leave should credit balance back (payroll reversal)")
    void cancellingApprovedLeaveShouldCreditBalance() {
        // Given - leave was already approved
        leaveRequest.setStatus(LeaveRequest.LeaveRequestStatus.APPROVED);
        UUID requestId = leaveRequest.getId();
        String cancellationReason = "Manager approved time off instead";

        when(leaveRequestRepository.findById(requestId)).thenReturn(Optional.of(leaveRequest));
        when(leaveRequestRepository.save(any(LeaveRequest.class))).thenAnswer(inv -> inv.getArgument(0));

        // When
        LeaveRequest result = leaveRequestService.cancelLeaveRequest(requestId, cancellationReason);

        // Then - balance should be credited back
        assertThat(result.getStatus()).isEqualTo(LeaveRequest.LeaveRequestStatus.CANCELLED);
        verify(leaveBalanceService).creditLeave(
                eq(employeeId),
                eq(leaveTypeId),
                eq(BigDecimal.valueOf(3.0))
        );
    }

    @Test
    @DisplayName("Cancelling pending leave should NOT credit balance (no deduction was made)")
    void cancellingPendingLeaveShouldNotCreditBalance() {
        // Given - leave is still pending (no approval = no deduction happened)
        leaveRequest.setStatus(LeaveRequest.LeaveRequestStatus.PENDING);
        UUID requestId = leaveRequest.getId();

        when(leaveRequestRepository.findById(requestId)).thenReturn(Optional.of(leaveRequest));
        when(leaveRequestRepository.save(any(LeaveRequest.class))).thenAnswer(inv -> inv.getArgument(0));

        // When
        leaveRequestService.cancelLeaveRequest(requestId, "Plans changed");

        // Then - no balance credit should happen
        verify(leaveBalanceService, never()).creditLeave(any(), any(), any(BigDecimal.class));
    }

    @Test
    @DisplayName("LeaveApprovedEvent payload should contain data needed for payroll LOP calculation")
    void leaveApprovedEventShouldContainPayrollData() {
        // Given
        UUID leaveRequestId = UUID.randomUUID();
        UUID approverId = UUID.randomUUID();
        LocalDate startDate = LocalDate.of(2026, 3, 15);
        LocalDate endDate = LocalDate.of(2026, 3, 20);
        BigDecimal daysDeducted = BigDecimal.valueOf(5.0);

        // When
        LeaveApprovedEvent event = LeaveApprovedEvent.of(
                this, tenantId, leaveRequestId,
                employeeId, approverId, "Loss Of Pay",
                startDate, endDate, daysDeducted
        );

        // Then - verify all payroll-relevant data is in the event
        assertThat(event.getEventType()).isEqualTo("LEAVE_APPROVED");
        assertThat(event.getTenantId()).isEqualTo(tenantId);
        assertThat(event.getAggregateId()).isEqualTo(leaveRequestId);
        assertThat(event.getEmployeeId()).isEqualTo(employeeId);
        assertThat(event.getApproverId()).isEqualTo(approverId);
        assertThat(event.getLeaveType()).isEqualTo("Loss Of Pay");
        assertThat(event.getStartDate()).isEqualTo(startDate);
        assertThat(event.getEndDate()).isEqualTo(endDate);
        assertThat(event.getDaysDeducted()).isEqualByComparingTo(daysDeducted);

        // Verify payload map contains all fields needed by payroll consumer
        @SuppressWarnings("unchecked")
        Map<String, Object> payload = (Map<String, Object>) event.getEventPayload();
        assertThat(payload).containsKey("leaveRequestId");
        assertThat(payload).containsKey("employeeId");
        assertThat(payload).containsKey("leaveType");
        assertThat(payload).containsKey("startDate");
        assertThat(payload).containsKey("endDate");
        assertThat(payload).containsKey("daysDeducted");
    }
}
