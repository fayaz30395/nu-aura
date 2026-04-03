package com.hrms.application.loan.service;

import com.hrms.api.loan.dto.CreateLoanRequest;
import com.hrms.api.loan.dto.EmployeeLoanDto;
import com.hrms.application.workflow.service.WorkflowService;
import com.hrms.common.security.SecurityContext;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.loan.EmployeeLoan;
import com.hrms.domain.loan.EmployeeLoan.LoanStatus;
import com.hrms.domain.loan.EmployeeLoan.LoanType;
import com.hrms.domain.workflow.WorkflowDefinition;
import com.hrms.infrastructure.loan.repository.EmployeeLoanRepository;
import org.junit.jupiter.api.*;
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
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@MockitoSettings(strictness = Strictness.LENIENT)
@ExtendWith(MockitoExtension.class)
@DisplayName("LoanService Tests")
class LoanServiceTest {

    private static MockedStatic<TenantContext> tenantContextMock;
    private static MockedStatic<SecurityContext> securityContextMock;
    @Mock
    private EmployeeLoanRepository loanRepository;
    @Mock
    private WorkflowService workflowService;
    @InjectMocks
    private LoanService loanService;
    private UUID tenantId;
    private UUID employeeId;
    private UUID userId;
    private UUID loanId;

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

    @BeforeEach
    void setUp() {
        tenantId = UUID.randomUUID();
        employeeId = UUID.randomUUID();
        userId = UUID.randomUUID();
        loanId = UUID.randomUUID();

        tenantContextMock.when(TenantContext::getCurrentTenant).thenReturn(tenantId);
        securityContextMock.when(SecurityContext::getCurrentEmployeeId).thenReturn(employeeId);
        securityContextMock.when(SecurityContext::getCurrentUserId).thenReturn(userId);
    }

    private EmployeeLoan buildLoan(LoanStatus status) {
        EmployeeLoan loan = EmployeeLoan.builder()
                .employeeId(employeeId)
                .loanNumber("LN-001")
                .loanType(LoanType.PERSONAL_LOAN)
                .principalAmount(new BigDecimal("100000"))
                .interestRate(BigDecimal.ZERO)
                .totalAmount(new BigDecimal("100000"))
                .outstandingAmount(new BigDecimal("100000"))
                .emiAmount(new BigDecimal("10000"))
                .tenureMonths(10)
                .status(status)
                .purpose("Personal use")
                .requestedDate(LocalDate.now())
                .build();
        loan.setId(loanId);
        loan.setTenantId(tenantId);
        return loan;
    }

    // ==================== applyForLoan ====================

    @Test
    @DisplayName("applyForLoan - creates loan application successfully")
    void applyForLoan_success() {
        CreateLoanRequest request = CreateLoanRequest.builder()
                .loanType(LoanType.PERSONAL_LOAN)
                .principalAmount(new BigDecimal("50000"))
                .interestRate(new BigDecimal("5.0"))
                .tenureMonths(12)
                .purpose("Home repair")
                .build();

        when(loanRepository.save(any(EmployeeLoan.class))).thenAnswer(inv -> {
            EmployeeLoan loan = inv.getArgument(0);
            loan.setId(loanId);
            return loan;
        });

        EmployeeLoanDto result = loanService.applyForLoan(request);

        assertThat(result).isNotNull();
        assertThat(result.getLoanType()).isEqualTo(LoanType.PERSONAL_LOAN);
        assertThat(result.getPrincipalAmount()).isEqualByComparingTo(new BigDecimal("50000"));
        verify(loanRepository).save(any(EmployeeLoan.class));
    }

    // ==================== approveLoan ====================

    @Test
    @DisplayName("approveLoan - approves pending loan")
    void approveLoan_success() {
        EmployeeLoan loan = buildLoan(LoanStatus.PENDING);
        when(loanRepository.findByIdAndTenantId(loanId, tenantId)).thenReturn(Optional.of(loan));
        when(loanRepository.save(any(EmployeeLoan.class))).thenAnswer(inv -> inv.getArgument(0));

        EmployeeLoanDto result = loanService.approveLoan(loanId, null);

        assertThat(result).isNotNull();
        assertThat(result.getStatus()).isEqualTo(LoanStatus.APPROVED);
        verify(loanRepository).save(any(EmployeeLoan.class));
    }

    @Test
    @DisplayName("approveLoan - rejects when loan not in PENDING status")
    void approveLoan_wrongStatus() {
        EmployeeLoan loan = buildLoan(LoanStatus.APPROVED);
        when(loanRepository.findByIdAndTenantId(loanId, tenantId)).thenReturn(Optional.of(loan));

        assertThatThrownBy(() -> loanService.approveLoan(loanId, null))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Cannot approve loan in status");
    }

    @Test
    @DisplayName("approveLoan - loan not found throws exception")
    void approveLoan_notFound() {
        when(loanRepository.findByIdAndTenantId(loanId, tenantId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> loanService.approveLoan(loanId, null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Loan not found");
    }

    @Test
    @DisplayName("approveLoan - with reduced approved amount recalculates EMI")
    void approveLoan_withReducedAmount() {
        EmployeeLoan loan = buildLoan(LoanStatus.PENDING);
        when(loanRepository.findByIdAndTenantId(loanId, tenantId)).thenReturn(Optional.of(loan));
        when(loanRepository.save(any(EmployeeLoan.class))).thenAnswer(inv -> inv.getArgument(0));

        BigDecimal reducedAmount = new BigDecimal("80000");
        loanService.approveLoan(loanId, reducedAmount);

        verify(loanRepository).save(argThat(saved ->
                saved.getPrincipalAmount().compareTo(reducedAmount) == 0
        ));
    }

    // ==================== rejectLoan ====================

    @Test
    @DisplayName("rejectLoan - rejects pending loan with reason")
    void rejectLoan_success() {
        EmployeeLoan loan = buildLoan(LoanStatus.PENDING);
        when(loanRepository.findByIdAndTenantId(loanId, tenantId)).thenReturn(Optional.of(loan));
        when(loanRepository.save(any(EmployeeLoan.class))).thenAnswer(inv -> inv.getArgument(0));

        EmployeeLoanDto result = loanService.rejectLoan(loanId, "Insufficient collateral");

        assertThat(result).isNotNull();
        assertThat(result.getStatus()).isEqualTo(LoanStatus.REJECTED);
    }

    @Test
    @DisplayName("rejectLoan - fails for non-PENDING loan")
    void rejectLoan_wrongStatus() {
        EmployeeLoan loan = buildLoan(LoanStatus.ACTIVE);
        when(loanRepository.findByIdAndTenantId(loanId, tenantId)).thenReturn(Optional.of(loan));

        assertThatThrownBy(() -> loanService.rejectLoan(loanId, "reason"))
                .isInstanceOf(IllegalStateException.class);
    }

    // ==================== disburseLoan ====================

    @Test
    @DisplayName("disburseLoan - disburses approved loan")
    void disburseLoan_success() {
        EmployeeLoan loan = buildLoan(LoanStatus.APPROVED);
        when(loanRepository.findByIdAndTenantId(loanId, tenantId)).thenReturn(Optional.of(loan));
        when(loanRepository.save(any(EmployeeLoan.class))).thenAnswer(inv -> inv.getArgument(0));

        EmployeeLoanDto result = loanService.disburseLoan(loanId);

        assertThat(result).isNotNull();
        assertThat(result.getStatus()).isEqualTo(LoanStatus.DISBURSED);
    }

    @Test
    @DisplayName("disburseLoan - fails for non-APPROVED loan")
    void disburseLoan_wrongStatus() {
        EmployeeLoan loan = buildLoan(LoanStatus.PENDING);
        when(loanRepository.findByIdAndTenantId(loanId, tenantId)).thenReturn(Optional.of(loan));

        assertThatThrownBy(() -> loanService.disburseLoan(loanId))
                .isInstanceOf(IllegalStateException.class);
    }

    // ==================== recordRepayment ====================

    @Test
    @DisplayName("recordRepayment - records partial repayment")
    void recordRepayment_partial() {
        EmployeeLoan loan = buildLoan(LoanStatus.ACTIVE);
        when(loanRepository.findByIdAndTenantId(loanId, tenantId)).thenReturn(Optional.of(loan));
        when(loanRepository.save(any(EmployeeLoan.class))).thenAnswer(inv -> inv.getArgument(0));

        EmployeeLoanDto result = loanService.recordRepayment(loanId, new BigDecimal("10000"));

        assertThat(result).isNotNull();
        assertThat(result.getStatus()).isEqualTo(LoanStatus.ACTIVE);
    }

    @Test
    @DisplayName("recordRepayment - full repayment closes loan")
    void recordRepayment_fullClosesLoan() {
        EmployeeLoan loan = buildLoan(LoanStatus.ACTIVE);
        when(loanRepository.findByIdAndTenantId(loanId, tenantId)).thenReturn(Optional.of(loan));
        when(loanRepository.save(any(EmployeeLoan.class))).thenAnswer(inv -> inv.getArgument(0));

        EmployeeLoanDto result = loanService.recordRepayment(loanId, new BigDecimal("100000"));

        assertThat(result).isNotNull();
        assertThat(result.getStatus()).isEqualTo(LoanStatus.CLOSED);
    }

    @Test
    @DisplayName("recordRepayment - fails for loan not in ACTIVE/DISBURSED")
    void recordRepayment_wrongStatus() {
        EmployeeLoan loan = buildLoan(LoanStatus.PENDING);
        when(loanRepository.findByIdAndTenantId(loanId, tenantId)).thenReturn(Optional.of(loan));

        assertThatThrownBy(() -> loanService.recordRepayment(loanId, new BigDecimal("5000")))
                .isInstanceOf(IllegalStateException.class);
    }

    // ==================== cancelLoan ====================

    @Test
    @DisplayName("cancelLoan - cancels pending loan")
    void cancelLoan_success() {
        EmployeeLoan loan = buildLoan(LoanStatus.PENDING);
        when(loanRepository.findByIdAndTenantId(loanId, tenantId)).thenReturn(Optional.of(loan));
        when(loanRepository.save(any(EmployeeLoan.class))).thenAnswer(inv -> inv.getArgument(0));

        EmployeeLoanDto result = loanService.cancelLoan(loanId);

        assertThat(result).isNotNull();
        assertThat(result.getStatus()).isEqualTo(LoanStatus.CANCELLED);
    }

    @Test
    @DisplayName("cancelLoan - fails for ACTIVE loan")
    void cancelLoan_activeThrows() {
        EmployeeLoan loan = buildLoan(LoanStatus.ACTIVE);
        when(loanRepository.findByIdAndTenantId(loanId, tenantId)).thenReturn(Optional.of(loan));

        assertThatThrownBy(() -> loanService.cancelLoan(loanId))
                .isInstanceOf(IllegalStateException.class);
    }

    // ==================== Query methods ====================

    @Test
    @DisplayName("getById - returns loan DTO")
    void getById_success() {
        EmployeeLoan loan = buildLoan(LoanStatus.ACTIVE);
        when(loanRepository.findByIdAndTenantId(loanId, tenantId)).thenReturn(Optional.of(loan));

        EmployeeLoanDto result = loanService.getById(loanId);

        assertThat(result).isNotNull();
        assertThat(result.getLoanNumber()).isEqualTo("LN-001");
    }

    @Test
    @DisplayName("getMyLoans - returns paginated results")
    void getMyLoans_success() {
        Pageable pageable = PageRequest.of(0, 10);
        EmployeeLoan loan = buildLoan(LoanStatus.ACTIVE);
        Page<EmployeeLoan> page = new PageImpl<>(List.of(loan), pageable, 1);
        when(loanRepository.findByEmployeeIdAndTenantId(employeeId, tenantId, pageable)).thenReturn(page);

        Page<EmployeeLoanDto> result = loanService.getMyLoans(pageable);

        assertThat(result.getTotalElements()).isEqualTo(1);
    }

    @Test
    @DisplayName("getAllLoans - filters by status when provided")
    void getAllLoans_withStatus() {
        Pageable pageable = PageRequest.of(0, 10);
        EmployeeLoan loan = buildLoan(LoanStatus.ACTIVE);
        Page<EmployeeLoan> page = new PageImpl<>(List.of(loan), pageable, 1);
        when(loanRepository.findByTenantIdAndStatus(tenantId, LoanStatus.ACTIVE, pageable)).thenReturn(page);

        Page<EmployeeLoanDto> result = loanService.getAllLoans(LoanStatus.ACTIVE, pageable);

        assertThat(result.getTotalElements()).isEqualTo(1);
    }

    @Test
    @DisplayName("getAllLoans - returns all when status is null")
    void getAllLoans_noStatusFilter() {
        Pageable pageable = PageRequest.of(0, 10);
        Page<EmployeeLoan> page = new PageImpl<>(List.of(), pageable, 0);
        when(loanRepository.findByTenantId(tenantId, pageable)).thenReturn(page);

        Page<EmployeeLoanDto> result = loanService.getAllLoans(null, pageable);

        assertThat(result.getTotalElements()).isZero();
    }

    // ==================== ApprovalCallbackHandler ====================

    @Test
    @DisplayName("getEntityType - returns LOAN_REQUEST")
    void getEntityType_returnsLoanRequest() {
        assertThat(loanService.getEntityType()).isEqualTo(WorkflowDefinition.EntityType.LOAN_REQUEST);
    }

    @Test
    @DisplayName("onApproved - approves pending loan via workflow")
    void onApproved_success() {
        EmployeeLoan loan = buildLoan(LoanStatus.PENDING);
        when(loanRepository.findByIdAndTenantId(loanId, tenantId)).thenReturn(Optional.of(loan));

        loanService.onApproved(tenantId, loanId, userId);

        verify(loanRepository).save(argThat(saved ->
                saved.getStatus() == LoanStatus.APPROVED
        ));
    }

    @Test
    @DisplayName("onApproved - skips when loan not in PENDING status")
    void onApproved_skipsNonPending() {
        EmployeeLoan loan = buildLoan(LoanStatus.APPROVED);
        when(loanRepository.findByIdAndTenantId(loanId, tenantId)).thenReturn(Optional.of(loan));

        loanService.onApproved(tenantId, loanId, userId);

        verify(loanRepository, never()).save(any());
    }

    @Test
    @DisplayName("onRejected - rejects pending loan via workflow")
    void onRejected_success() {
        EmployeeLoan loan = buildLoan(LoanStatus.PENDING);
        when(loanRepository.findByIdAndTenantId(loanId, tenantId)).thenReturn(Optional.of(loan));

        loanService.onRejected(tenantId, loanId, userId, "Budget constraints");

        verify(loanRepository).save(argThat(saved ->
                saved.getStatus() == LoanStatus.REJECTED
        ));
    }
}
