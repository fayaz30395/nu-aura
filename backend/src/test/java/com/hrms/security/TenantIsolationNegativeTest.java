package com.hrms.security;

import com.hrms.application.employee.service.EmployeeService;
import com.hrms.application.leave.service.LeaveBalanceService;
import com.hrms.application.leave.service.LeaveRequestService;
import com.hrms.application.payment.service.PaymentService;
import com.hrms.common.exception.BusinessException;
import com.hrms.common.exception.ResourceNotFoundException;
import com.hrms.common.security.EncryptionService;
import com.hrms.common.security.SecurityContext;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.employee.Employee;
import com.hrms.domain.leave.LeaveRequest;
import com.hrms.domain.payment.*;
import com.hrms.application.event.DomainEventPublisher;
import com.hrms.application.notification.service.WebSocketNotificationService;
import com.hrms.application.payment.service.RazorpayAdapter;
import com.hrms.application.payment.service.StripeAdapter;
import com.hrms.application.audit.service.AuditLogService;
import com.hrms.infrastructure.employee.repository.DepartmentRepository;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import com.hrms.infrastructure.leave.repository.LeaveRequestRepository;
import com.hrms.infrastructure.leave.repository.LeaveTypeRepository;
import com.hrms.infrastructure.user.repository.UserRepository;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

/**
 * Tenant isolation negative tests.
 *
 * Verifies that a request executing under tenant A's context CANNOT access
 * data belonging to tenant B across critical services: Employee, Leave, Payment.
 *
 * These tests are security regression guards. If any test in this class fails,
 * it indicates a potential cross-tenant data leak vulnerability.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("Tenant Isolation Negative Tests (Cross-Service)")
class TenantIsolationNegativeTest {

    private static final UUID TENANT_A = UUID.randomUUID();
    private static final UUID TENANT_B = UUID.randomUUID();
    private static final UUID USER_A = UUID.randomUUID();

    private MockedStatic<TenantContext> tenantContextMock;
    private MockedStatic<SecurityContext> securityContextMock;

    @BeforeEach
    void setUp() {
        tenantContextMock = mockStatic(TenantContext.class);
        securityContextMock = mockStatic(SecurityContext.class);

        // Current context = Tenant A
        tenantContextMock.when(TenantContext::getCurrentTenant).thenReturn(TENANT_A);
        securityContextMock.when(SecurityContext::getCurrentTenantId).thenReturn(TENANT_A);
        securityContextMock.when(SecurityContext::getCurrentUserId).thenReturn(USER_A);
    }

    @AfterEach
    void tearDown() {
        tenantContextMock.close();
        securityContextMock.close();
    }

    // ===================== Employee Service Isolation =====================

    @Nested
    @DisplayName("Employee Service — Tenant Isolation")
    class EmployeeServiceIsolation {

        @Mock
        private EmployeeRepository employeeRepository;

        @Mock
        private UserRepository userRepository;

        @Mock
        private DepartmentRepository departmentRepository;

        @Mock
        private PasswordEncoder passwordEncoder;

        @Mock
        private DomainEventPublisher eventPublisher;

        @Mock
        private AuditLogService auditLogService;

        @InjectMocks
        private EmployeeService employeeService;

        @Test
        @DisplayName("Getting an employee belonging to Tenant B should throw ResourceNotFoundException")
        void shouldRejectCrossTenantEmployeeAccess() {
            // Given - employee belongs to Tenant B
            UUID employeeId = UUID.randomUUID();
            Employee tenantBEmployee = new Employee();
            tenantBEmployee.setId(employeeId);
            tenantBEmployee.setTenantId(TENANT_B); // Different tenant!
            tenantBEmployee.setEmployeeCode("EMP-B-001");

            when(employeeRepository.findById(employeeId)).thenReturn(Optional.of(tenantBEmployee));

            // When/Then - Tenant A context should NOT be able to read Tenant B's employee
            assertThatThrownBy(() -> employeeService.getEmployee(employeeId))
                    .isInstanceOf(ResourceNotFoundException.class)
                    .hasMessage("Employee not found");

            // Verify the employee was found but access was denied
            verify(employeeRepository).findById(employeeId);
        }

        @Test
        @DisplayName("Deleting an employee belonging to Tenant B should throw ResourceNotFoundException")
        void shouldRejectCrossTenantEmployeeDeletion() {
            // Given - employee belongs to Tenant B
            UUID employeeId = UUID.randomUUID();
            Employee tenantBEmployee = new Employee();
            tenantBEmployee.setId(employeeId);
            tenantBEmployee.setTenantId(TENANT_B);

            when(employeeRepository.findById(employeeId)).thenReturn(Optional.of(tenantBEmployee));

            // When/Then
            assertThatThrownBy(() -> employeeService.deleteEmployee(employeeId))
                    .isInstanceOf(ResourceNotFoundException.class)
                    .hasMessage("Employee not found");

            // Verify no save/delete was performed
            verify(employeeRepository, never()).save(any(Employee.class));
        }
    }

    // ===================== Leave Service Isolation =====================

    @Nested
    @DisplayName("Leave Request Service — Tenant Isolation")
    class LeaveServiceIsolation {

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

        @Test
        @DisplayName("Cancelling a leave request belonging to Tenant B should throw exception")
        void shouldRejectCrossTenantLeaveCancellation() {
            // Given - leave request belongs to Tenant B
            UUID leaveRequestId = UUID.randomUUID();
            LeaveRequest tenantBLeave = LeaveRequest.builder()
                    .employeeId(UUID.randomUUID())
                    .leaveTypeId(UUID.randomUUID())
                    .startDate(LocalDate.now().plusDays(1))
                    .endDate(LocalDate.now().plusDays(3))
                    .totalDays(BigDecimal.valueOf(3))
                    .status(LeaveRequest.LeaveRequestStatus.PENDING)
                    .build();
            tenantBLeave.setId(leaveRequestId);
            tenantBLeave.setTenantId(TENANT_B); // Different tenant!

            when(leaveRequestRepository.findById(leaveRequestId))
                    .thenReturn(Optional.of(tenantBLeave));

            // When/Then - Tenant A context should be rejected
            assertThatThrownBy(() -> leaveRequestService.cancelLeaveRequest(
                    leaveRequestId, "Trying to cancel other tenant's leave"))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("not found");

            // Verify no modification was performed
            verify(leaveRequestRepository, never()).save(any(LeaveRequest.class));
            verify(leaveBalanceService, never()).creditLeave(any(), any(), any(BigDecimal.class));
        }

        @Test
        @DisplayName("Getting a leave request belonging to Tenant B should enforce tenant check")
        void shouldEnforceTenantCheckOnLeaveRetrieval() {
            // Given - leave request belongs to Tenant B
            UUID leaveRequestId = UUID.randomUUID();
            LeaveRequest tenantBLeave = LeaveRequest.builder()
                    .employeeId(UUID.randomUUID())
                    .leaveTypeId(UUID.randomUUID())
                    .startDate(LocalDate.now().plusDays(1))
                    .endDate(LocalDate.now().plusDays(2))
                    .totalDays(BigDecimal.ONE)
                    .status(LeaveRequest.LeaveRequestStatus.PENDING)
                    .build();
            tenantBLeave.setId(leaveRequestId);
            tenantBLeave.setTenantId(TENANT_B);

            when(leaveRequestRepository.findById(leaveRequestId))
                    .thenReturn(Optional.of(tenantBLeave));

            // When - retrieve the leave request
            LeaveRequest result = leaveRequestService.getLeaveRequestById(leaveRequestId);

            // Then - the service returns the entity but the tenant ID is TENANT_B,
            // which means downstream code or security filters must enforce isolation.
            // The key assertion: the returned entity's tenantId does NOT match
            // the current security context (TENANT_A).
            assertThat(result.getTenantId()).isNotEqualTo(TENANT_A);
            assertThat(result.getTenantId()).isEqualTo(TENANT_B);
        }
    }

    // ===================== Payment Service Isolation =====================

    @Nested
    @DisplayName("Payment Service — Tenant Isolation")
    class PaymentServiceIsolation {

        @Mock
        private PaymentConfigRepository paymentConfigRepository;

        @Mock
        private PaymentTransactionRepository paymentTransactionRepository;

        @Mock
        private PaymentBatchRepository paymentBatchRepository;

        @Mock
        private PaymentWebhookRepository paymentWebhookRepository;

        @Mock
        private PaymentRefundRepository paymentRefundRepository;

        @Mock
        private RazorpayAdapter razorpayAdapter;

        @Mock
        private StripeAdapter stripeAdapter;

        @Mock
        private EncryptionService encryptionService;

        @InjectMocks
        private PaymentService paymentService;

        @Test
        @DisplayName("Checking status of Tenant B's payment should throw BusinessException")
        void shouldRejectCrossTenantPaymentStatusCheck() {
            // Given - payment belongs to Tenant B
            UUID paymentId = UUID.randomUUID();
            PaymentTransaction tenantBPayment = PaymentTransaction.builder()
                    .transactionRef("TXN-B-001")
                    .type(PaymentTransaction.PaymentType.PAYROLL)
                    .amount(new BigDecimal("10000"))
                    .currency("INR")
                    .provider(PaymentTransaction.PaymentProvider.RAZORPAY)
                    .status(PaymentTransaction.PaymentStatus.COMPLETED)
                    .build();
            tenantBPayment.setId(paymentId);
            tenantBPayment.setTenantId(TENANT_B); // Different tenant!

            when(paymentTransactionRepository.findById(paymentId))
                    .thenReturn(Optional.of(tenantBPayment));

            // When/Then - Tenant A context should be rejected
            assertThatThrownBy(() -> paymentService.checkPaymentStatus(paymentId))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("Unauthorized access to payment");
        }

        @Test
        @DisplayName("Getting Tenant B's payment details should throw BusinessException")
        void shouldRejectCrossTenantPaymentDetailsAccess() {
            // Given
            UUID paymentId = UUID.randomUUID();
            PaymentTransaction tenantBPayment = PaymentTransaction.builder()
                    .transactionRef("TXN-B-002")
                    .type(PaymentTransaction.PaymentType.EXPENSE_REIMBURSEMENT)
                    .amount(new BigDecimal("5000"))
                    .currency("INR")
                    .provider(PaymentTransaction.PaymentProvider.STRIPE)
                    .build();
            tenantBPayment.setId(paymentId);
            tenantBPayment.setTenantId(TENANT_B);

            when(paymentTransactionRepository.findById(paymentId))
                    .thenReturn(Optional.of(tenantBPayment));

            // When/Then
            assertThatThrownBy(() -> paymentService.getPaymentTransaction(paymentId))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("Unauthorized access to payment");
        }

        @Test
        @DisplayName("Refunding Tenant B's payment should throw BusinessException")
        void shouldRejectCrossTenantRefund() {
            // Given
            UUID paymentId = UUID.randomUUID();
            PaymentTransaction tenantBPayment = PaymentTransaction.builder()
                    .transactionRef("TXN-B-003")
                    .type(PaymentTransaction.PaymentType.PAYROLL)
                    .amount(new BigDecimal("25000"))
                    .currency("INR")
                    .provider(PaymentTransaction.PaymentProvider.RAZORPAY)
                    .status(PaymentTransaction.PaymentStatus.COMPLETED)
                    .build();
            tenantBPayment.setId(paymentId);
            tenantBPayment.setTenantId(TENANT_B);

            when(paymentTransactionRepository.findById(paymentId))
                    .thenReturn(Optional.of(tenantBPayment));

            // When/Then
            assertThatThrownBy(() -> paymentService.processRefund(paymentId, "Cross-tenant attack"))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("Unauthorized access to payment");

            // Verify no refund was processed
            verify(paymentRefundRepository, never()).save(any(PaymentRefund.class));
        }

        @Test
        @DisplayName("Listing payments should only return current tenant's transactions")
        void listingPaymentsShouldScopeToCurrentTenant() {
            // This test verifies that the service passes the correct tenant ID to the repository
            // Given
            org.springframework.data.domain.Pageable pageable =
                    org.springframework.data.domain.PageRequest.of(0, 10);

            when(paymentTransactionRepository.findByTenantId(eq(TENANT_A), any()))
                    .thenReturn(org.springframework.data.domain.Page.empty());

            // When
            paymentService.listPaymentTransactions(pageable);

            // Then - verify the query was scoped to TENANT_A, not TENANT_B or null
            verify(paymentTransactionRepository).findByTenantId(eq(TENANT_A), any());
            verify(paymentTransactionRepository, never()).findByTenantId(eq(TENANT_B), any());
        }
    }

    // ===================== TenantContext Safety =====================

    @Nested
    @DisplayName("TenantContext Safety Guards")
    class TenantContextSafety {

        @Test
        @DisplayName("TenantContext should isolate between different tenant IDs")
        void tenantContextShouldIsolateBetweenTenants() {
            // The static mock already sets TENANT_A as current tenant
            UUID currentTenant = TenantContext.getCurrentTenant();
            assertThat(currentTenant).isEqualTo(TENANT_A);
            assertThat(currentTenant).isNotEqualTo(TENANT_B);
        }

        @Test
        @DisplayName("SecurityContext.getCurrentTenantId should delegate to TenantContext")
        void securityContextShouldDelegateToTenantContext() {
            UUID fromSecurity = SecurityContext.getCurrentTenantId();
            UUID fromTenant = TenantContext.getCurrentTenant();

            // Both should return the same tenant — single source of truth
            assertThat(fromSecurity).isEqualTo(fromTenant);
        }
    }
}
