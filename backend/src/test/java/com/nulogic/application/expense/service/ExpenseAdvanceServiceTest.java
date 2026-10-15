package com.nulogic.application.expense.service;

import com.nulogic.api.expense.dto.ExpenseAdvanceRequest;
import com.nulogic.common.security.Permission;
import com.nulogic.common.security.TenantContext;
import com.nulogic.common.util.TenantTimeService;
import com.nulogic.domain.expense.ExpenseAdvance;
import com.nulogic.infrastructure.employee.repository.EmployeeRepository;
import com.nulogic.infrastructure.expense.repository.ExpenseAdvanceRepository;
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
import org.springframework.security.access.AccessDeniedException;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * SEC-E9 regression: {@code createAdvance} took its {@code employeeId} straight from the path
 * ({@code POST /api/v1/expenses/advances/employees/{employeeId}}) and never checked it. The
 * controller's {@code @RequiresPermission(EXPENSE:CREATE)} only proves the caller may request
 * SOME advance — it says nothing about whose name goes on it, and EXPENSE:CREATE is a baseline
 * employee grant. Any employee could therefore raise a cash-advance request against a colleague.
 *
 * <p>Same shape as SEC-E5 on expense claims and SEC-E8 on mileage; all three now route through
 * {@code ExpenseClaimService.assertEmployeeAccess(targetEmployeeId, EXPENSE:CREATE)}, so the
 * scope of the write permission governs.</p>
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("SEC-E9: expense-advance write ownership")
class ExpenseAdvanceServiceTest {

    private static final UUID TENANT_ID = UUID.fromString("550e8400-e29b-41d4-a716-446655440000");
    private static final UUID TARGET_EMPLOYEE_ID = UUID.fromString("48000000-e001-0000-0000-0000000000b1");

    private static MockedStatic<TenantContext> tenantContextMock;

    @Mock
    private ExpenseAdvanceRepository advanceRepository;
    @Mock
    private EmployeeRepository employeeRepository;
    @Mock
    private TenantTimeService tenantTimeService;
    @Mock
    private ExpenseClaimService expenseClaimService;

    @Mock
    private com.nulogic.infrastructure.expense.repository.ExpenseClaimRepository expenseClaimRepository;
    @InjectMocks
    private ExpenseAdvanceService service;

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
        tenantContextMock.when(TenantContext::getCurrentTenant).thenReturn(TENANT_ID);
        tenantContextMock.when(TenantContext::requireCurrentTenant).thenReturn(TENANT_ID);
        when(tenantTimeService.now(any())).thenReturn(LocalDateTime.now());
    }

    private ExpenseAdvanceRequest request() {
        ExpenseAdvanceRequest request = new ExpenseAdvanceRequest();
        request.setAmount(new BigDecimal("5000.00"));
        request.setCurrency("INR");
        request.setPurpose("Client site visit");
        return request;
    }

    @Test
    @DisplayName("a caller denied by the EXPENSE:CREATE scope cannot raise an advance for another employee")
    void deniedScopeCannotCreateForAnotherEmployee() {
        doThrow(new AccessDeniedException("denied"))
                .when(expenseClaimService)
                .assertEmployeeAccess(TARGET_EMPLOYEE_ID, Permission.EXPENSE_CREATE);

        assertThatThrownBy(() -> service.createAdvance(TARGET_EMPLOYEE_ID, request()))
                .isInstanceOf(AccessDeniedException.class);

        verify(advanceRepository, never()).save(any());
        // The gate must run before the existence probe, so an unauthorized caller cannot use
        // this endpoint to confirm whether an employee id exists in the tenant.
        verify(employeeRepository, never()).existsByIdAndTenantId(any(), any());
    }

    @Test
    @DisplayName("the gate is consulted with the WRITE permission, not a view permission")
    void gateUsesTheWritePermission() {
        when(employeeRepository.existsByIdAndTenantId(TARGET_EMPLOYEE_ID, TENANT_ID)).thenReturn(true);
        when(advanceRepository.save(any())).thenAnswer(inv -> {
            ExpenseAdvance advance = inv.getArgument(0);
            advance.setId(UUID.randomUUID());
            return advance;
        });

        service.createAdvance(TARGET_EMPLOYEE_ID, request());

        verify(expenseClaimService).assertEmployeeAccess(TARGET_EMPLOYEE_ID, Permission.EXPENSE_CREATE);
    }

    // ---- settleAdvance ownership / tenant checks ----

    private ExpenseAdvance disbursedAdvance(UUID advanceId) {
        ExpenseAdvance advance = ExpenseAdvance.builder()
                .employeeId(TARGET_EMPLOYEE_ID)
                .amount(new BigDecimal("5000.00"))
                .status(ExpenseAdvance.AdvanceStatus.DISBURSED)
                .build();
        advance.setId(advanceId);
        advance.setTenantId(TENANT_ID);
        return advance;
    }

    private com.nulogic.domain.expense.ExpenseClaim claimOf(UUID employeeId,
                                                           com.nulogic.domain.expense.ExpenseClaim.ExpenseStatus status) {
        return com.nulogic.domain.expense.ExpenseClaim.builder().employeeId(employeeId).status(status).build();
    }

    @Test
    @DisplayName("settling against another employee's claim is denied and the advance stays DISBURSED")
    void settleWithForeignClaimDenied() {
        UUID advanceId = UUID.randomUUID();
        UUID claimId = UUID.randomUUID();
        ExpenseAdvance advance = disbursedAdvance(advanceId);
        when(advanceRepository.findByIdAndTenantId(advanceId, TENANT_ID)).thenReturn(java.util.Optional.of(advance));
        when(expenseClaimRepository.findByIdAndTenantId(claimId, TENANT_ID)).thenReturn(java.util.Optional.of(
                claimOf(UUID.randomUUID(), com.nulogic.domain.expense.ExpenseClaim.ExpenseStatus.APPROVED)));

        assertThatThrownBy(() -> service.settleAdvance(advanceId, claimId))
                .isInstanceOf(AccessDeniedException.class);

        org.assertj.core.api.Assertions.assertThat(advance.getStatus())
                .isEqualTo(ExpenseAdvance.AdvanceStatus.DISBURSED);
        verify(advanceRepository, never()).save(any());
    }

    @Test
    @DisplayName("settling against a claim from another tenant (not found in tenant) is rejected")
    void settleWithCrossTenantClaimRejected() {
        UUID advanceId = UUID.randomUUID();
        UUID claimId = UUID.randomUUID();
        when(advanceRepository.findByIdAndTenantId(advanceId, TENANT_ID))
                .thenReturn(java.util.Optional.of(disbursedAdvance(advanceId)));
        when(expenseClaimRepository.findByIdAndTenantId(claimId, TENANT_ID)).thenReturn(java.util.Optional.empty());

        assertThatThrownBy(() -> service.settleAdvance(advanceId, claimId))
                .isInstanceOf(jakarta.persistence.EntityNotFoundException.class);

        verify(advanceRepository, never()).save(any());
    }

    @Test
    @DisplayName("caller denied by EXPENSE:CREATE scope for the advance holder cannot settle")
    void settleDeniedByScope() {
        UUID advanceId = UUID.randomUUID();
        when(advanceRepository.findByIdAndTenantId(advanceId, TENANT_ID))
                .thenReturn(java.util.Optional.of(disbursedAdvance(advanceId)));
        doThrow(new AccessDeniedException("denied")).when(expenseClaimService)
                .assertEmployeeAccess(TARGET_EMPLOYEE_ID, Permission.EXPENSE_CREATE);

        assertThatThrownBy(() -> service.settleAdvance(advanceId, UUID.randomUUID()))
                .isInstanceOf(AccessDeniedException.class);

        verify(advanceRepository, never()).save(any());
    }

    @Test
    @DisplayName("settling with the holder's own approved claim succeeds")
    void settleWithOwnClaimSucceeds() {
        UUID advanceId = UUID.randomUUID();
        UUID claimId = UUID.randomUUID();
        ExpenseAdvance advance = disbursedAdvance(advanceId);
        when(advanceRepository.findByIdAndTenantId(advanceId, TENANT_ID)).thenReturn(java.util.Optional.of(advance));
        when(expenseClaimRepository.findByIdAndTenantId(claimId, TENANT_ID)).thenReturn(java.util.Optional.of(
                claimOf(TARGET_EMPLOYEE_ID, com.nulogic.domain.expense.ExpenseClaim.ExpenseStatus.APPROVED)));
        when(advanceRepository.save(any(ExpenseAdvance.class))).thenAnswer(i -> i.getArgument(0));

        service.settleAdvance(advanceId, claimId);

        org.assertj.core.api.Assertions.assertThat(advance.getStatus())
                .isEqualTo(ExpenseAdvance.AdvanceStatus.SETTLED);
        org.assertj.core.api.Assertions.assertThat(advance.getSettlementClaimId()).isEqualTo(claimId);
    }
}
