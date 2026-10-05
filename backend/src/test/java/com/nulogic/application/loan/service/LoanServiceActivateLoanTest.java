package com.nulogic.application.loan.service;

import com.nulogic.api.loan.dto.EmployeeLoanDto;
import com.nulogic.common.security.TenantContext;
import com.nulogic.domain.loan.EmployeeLoan;
import com.nulogic.domain.loan.EmployeeLoan.LoanStatus;
import com.nulogic.domain.loan.EmployeeLoan.LoanType;
import com.nulogic.infrastructure.loan.repository.EmployeeLoanRepository;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Coverage ratchet for {@link LoanService#activateLoan} — the DISBURSED → ACTIVE
 * status transition that the existing {@link LoanServiceTest} did not exercise.
 */
@MockitoSettings(strictness = Strictness.LENIENT)
@ExtendWith(MockitoExtension.class)
@DisplayName("LoanService activateLoan write path")
class LoanServiceActivateLoanTest {

    private static MockedStatic<TenantContext> tenantContextMock;
    @Mock
    private EmployeeLoanRepository loanRepository;
    @InjectMocks
    private LoanService loanService;

    private UUID tenantId;
    private UUID employeeId;
    private UUID loanId;

    @BeforeAll
    static void setUpClass() {
        tenantContextMock = mockStatic(TenantContext.class);
    }

    @AfterAll
    static void tearDownClass() {
        tenantContextMock.close();
    }

    @BeforeEach
    void setUp() {
        tenantId = UUID.randomUUID();
        employeeId = UUID.randomUUID();
        loanId = UUID.randomUUID();

        tenantContextMock.when(TenantContext::getCurrentTenant).thenReturn(tenantId);
        tenantContextMock.when(TenantContext::requireCurrentTenant).thenReturn(tenantId);
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

    @Test
    @DisplayName("activateLoan - transitions a DISBURSED loan to ACTIVE")
    void activateLoan_success() {
        EmployeeLoan loan = buildLoan(LoanStatus.DISBURSED);
        when(loanRepository.findByIdAndTenantId(loanId, tenantId)).thenReturn(Optional.of(loan));
        when(loanRepository.save(any(EmployeeLoan.class))).thenAnswer(inv -> inv.getArgument(0));

        EmployeeLoanDto result = loanService.activateLoan(loanId);

        assertThat(result).isNotNull();
        assertThat(result.getStatus()).isEqualTo(LoanStatus.ACTIVE);
        verify(loanRepository).save(loan);
    }

    @Test
    @DisplayName("activateLoan - rejects a loan not in DISBURSED status")
    void activateLoan_wrongStatus_throws() {
        EmployeeLoan loan = buildLoan(LoanStatus.PENDING);
        when(loanRepository.findByIdAndTenantId(loanId, tenantId)).thenReturn(Optional.of(loan));

        assertThatThrownBy(() -> loanService.activateLoan(loanId))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Cannot activate loan in status");

        verify(loanRepository, never()).save(any(EmployeeLoan.class));
    }

    @Test
    @DisplayName("activateLoan - rejects when loan is not found")
    void activateLoan_notFound_throws() {
        when(loanRepository.findByIdAndTenantId(loanId, tenantId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> loanService.activateLoan(loanId))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Loan not found");

        verify(loanRepository, never()).save(any(EmployeeLoan.class));
    }
}
