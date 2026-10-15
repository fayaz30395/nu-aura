package com.nulogic.application.leave.service;

import com.nulogic.common.security.TenantContext;
import com.nulogic.domain.leave.LeaveBalance;
import com.nulogic.domain.leave.LeaveType;
import com.nulogic.infrastructure.leave.repository.LeaveBalanceRepository;
import com.nulogic.infrastructure.leave.repository.LeaveTypeRepository;
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
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Coverage ratchet for the leave write-path operations that had no unit test:
 * {@link LeaveBalanceService#encashLeave} (F2.3) and
 * {@link LeaveBalanceService#carryForwardBalances} (BIZ-012).
 */
@MockitoSettings(strictness = Strictness.LENIENT)
@ExtendWith(MockitoExtension.class)
@DisplayName("LeaveBalanceService encashment & carry-forward write paths")
class LeaveBalanceEncashmentCarryForwardTest {

    private static MockedStatic<TenantContext> tenantContextMock;
    @Mock
    private LeaveBalanceRepository leaveBalanceRepository;
    @Mock
    private LeaveTypeRepository leaveTypeRepository;
    @Mock
    private com.nulogic.infrastructure.leave.repository.LeaveAccrualLedgerRepository leaveAccrualLedgerRepository;
    @InjectMocks
    private LeaveBalanceService leaveBalanceService;

    private UUID tenantId;
    private UUID employeeId;
    private UUID leaveTypeId;
    private UUID balanceId;

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
        leaveTypeId = UUID.randomUUID();
        balanceId = UUID.randomUUID();

        tenantContextMock.when(TenantContext::getCurrentTenant).thenReturn(tenantId);
        tenantContextMock.when(TenantContext::requireCurrentTenant).thenReturn(tenantId);
    }

    private LeaveBalance buildBalance(BigDecimal openingBalance) {
        LeaveBalance balance = LeaveBalance.builder()
                .employeeId(employeeId)
                .leaveTypeId(leaveTypeId)
                .year(2025)
                .openingBalance(openingBalance)
                .build();
        balance.setId(balanceId);
        balance.setTenantId(tenantId);
        balance.calculateAvailable();
        return balance;
    }

    private LeaveType buildLeaveType(Boolean encashable, BigDecimal maxEncashablePerYear) {
        LeaveType leaveType = LeaveType.builder()
                .leaveName("Annual Leave")
                .isEncashable(encashable)
                .maxEncashableDaysPerYear(maxEncashablePerYear)
                .build();
        leaveType.setId(leaveTypeId);
        leaveType.setTenantId(tenantId);
        return leaveType;
    }

    // ==================== encashLeave ====================

    @Test
    @DisplayName("encashLeave - encashes days and reduces available balance")
    void encashLeave_success() {
        LeaveBalance balance = buildBalance(new BigDecimal("10"));
        LeaveType leaveType = buildLeaveType(true, null);

        when(leaveBalanceRepository.findByIdAndTenantId(balanceId, tenantId))
                .thenReturn(Optional.of(balance));
        when(leaveTypeRepository.findByIdAndTenantId(leaveTypeId, tenantId))
                .thenReturn(Optional.of(leaveType));
        when(leaveBalanceRepository.save(any(LeaveBalance.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        LeaveBalance result = leaveBalanceService.encashLeave(balanceId, 3);

        assertThat(result.getEncashed()).isEqualByComparingTo(new BigDecimal("3"));
        assertThat(result.getAvailable()).isEqualByComparingTo(new BigDecimal("7"));
        verify(leaveBalanceRepository, times(1)).save(balance);
    }

    @Test
    @DisplayName("encashLeave - rejects a leave type that is not encashable")
    void encashLeave_notEncashable_throws() {
        LeaveBalance balance = buildBalance(new BigDecimal("10"));
        LeaveType leaveType = buildLeaveType(false, null);

        when(leaveBalanceRepository.findByIdAndTenantId(balanceId, tenantId))
                .thenReturn(Optional.of(balance));
        when(leaveTypeRepository.findByIdAndTenantId(leaveTypeId, tenantId))
                .thenReturn(Optional.of(leaveType));

        assertThatThrownBy(() -> leaveBalanceService.encashLeave(balanceId, 3))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("does not allow encashment");

        verify(leaveBalanceRepository, never()).save(any(LeaveBalance.class));
    }

    @Test
    @DisplayName("encashLeave - rejects when available balance is insufficient")
    void encashLeave_insufficientBalance_throws() {
        LeaveBalance balance = buildBalance(new BigDecimal("2"));
        LeaveType leaveType = buildLeaveType(true, null);

        when(leaveBalanceRepository.findByIdAndTenantId(balanceId, tenantId))
                .thenReturn(Optional.of(balance));
        when(leaveTypeRepository.findByIdAndTenantId(leaveTypeId, tenantId))
                .thenReturn(Optional.of(leaveType));

        assertThatThrownBy(() -> leaveBalanceService.encashLeave(balanceId, 5))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Insufficient leave balance");

        verify(leaveBalanceRepository, never()).save(any(LeaveBalance.class));
    }

    @Test
    @DisplayName("encashLeave - rejects a request exceeding the annual policy cap (F2.3)")
    void encashLeave_exceedsAnnualCap_throws() {
        LeaveBalance balance = buildBalance(new BigDecimal("10"));
        LeaveType leaveType = buildLeaveType(true, new BigDecimal("2"));

        when(leaveBalanceRepository.findByIdAndTenantId(balanceId, tenantId))
                .thenReturn(Optional.of(balance));
        when(leaveTypeRepository.findByIdAndTenantId(leaveTypeId, tenantId))
                .thenReturn(Optional.of(leaveType));

        assertThatThrownBy(() -> leaveBalanceService.encashLeave(balanceId, 5))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("exceeds policy maximum");

        verify(leaveBalanceRepository, never()).save(any(LeaveBalance.class));
    }

    // ==================== carryForwardBalances ====================

    private LeaveBalance buildOldBalance(BigDecimal available) {
        LeaveBalance oldBalance = LeaveBalance.builder()
                .employeeId(employeeId)
                .leaveTypeId(leaveTypeId)
                .year(2024)
                .openingBalance(available)
                .build();
        oldBalance.setId(UUID.randomUUID());
        oldBalance.setTenantId(tenantId);
        oldBalance.calculateAvailable();
        return oldBalance;
    }

    private LeaveBalance buildNextYearBalance() {
        LeaveBalance nextBalance = LeaveBalance.builder()
                .employeeId(employeeId)
                .leaveTypeId(leaveTypeId)
                .year(2025)
                .openingBalance(BigDecimal.ZERO)
                .build();
        nextBalance.setId(UUID.randomUUID());
        nextBalance.setTenantId(tenantId);
        nextBalance.calculateAvailable();
        return nextBalance;
    }

    @Test
    @DisplayName("carryForwardBalances - carries available days into next year's opening balance")
    void carryForwardBalances_success() {
        LeaveBalance oldBalance = buildOldBalance(new BigDecimal("8"));
        LeaveBalance nextBalance = buildNextYearBalance();
        LeaveType leaveType = LeaveType.builder()
                .leaveName("Annual Leave")
                .isCarryForwardAllowed(true)
                .build();
        leaveType.setId(leaveTypeId);
        leaveType.setTenantId(tenantId);

        when(leaveBalanceRepository.findAllByTenantIdAndYear(tenantId, 2024))
                .thenReturn(List.of(oldBalance));
        when(leaveTypeRepository.findAllByTenantId(tenantId))
                .thenReturn(List.of(leaveType));
        when(leaveBalanceRepository.findForUpdate(employeeId, leaveTypeId, 2025, tenantId))
                .thenReturn(Optional.of(nextBalance));

        int count = leaveBalanceService.carryForwardBalances(2024);

        assertThat(count).isEqualTo(1);
        assertThat(nextBalance.getOpeningBalance()).isEqualByComparingTo(new BigDecimal("8"));
        verify(leaveBalanceRepository, times(1))
                .findForUpdate(employeeId, leaveTypeId, 2025, tenantId);
    }

    @Test
    @DisplayName("carryForwardBalances - second run does not double-credit")
    void carryForwardBalances_rerunIsIdempotent() {
        LeaveBalance oldBalance = buildOldBalance(new BigDecimal("8"));
        LeaveBalance nextBalance = buildNextYearBalance();
        LeaveType leaveType = LeaveType.builder().leaveName("Annual Leave").isCarryForwardAllowed(true).build();
        leaveType.setId(leaveTypeId);
        leaveType.setTenantId(tenantId);
        when(leaveBalanceRepository.findAllByTenantIdAndYear(tenantId, 2024)).thenReturn(List.of(oldBalance));
        when(leaveTypeRepository.findAllByTenantId(tenantId)).thenReturn(List.of(leaveType));
        when(leaveBalanceRepository.findForUpdate(employeeId, leaveTypeId, 2025, tenantId))
                .thenReturn(Optional.of(nextBalance));
        // first call: not yet in ledger; second call: ledger row exists
        when(leaveAccrualLedgerRepository.existsByTenantIdAndEmployeeIdAndLeaveTypeIdAndAccrualPeriod(
                tenantId, employeeId, leaveTypeId, "CF-2024")).thenReturn(false, true);

        int first = leaveBalanceService.carryForwardBalances(2024);
        int second = leaveBalanceService.carryForwardBalances(2024);

        assertThat(first).isEqualTo(1);
        assertThat(second).isZero();
        assertThat(nextBalance.getOpeningBalance()).isEqualByComparingTo(new BigDecimal("8"));
        verify(leaveAccrualLedgerRepository, times(1)).saveAndFlush(any());
    }

    @Test
    @DisplayName("carryForwardBalances - caps carry-forward at maxCarryForwardDays")
    void carryForwardBalances_capsAtMaxCarryForwardDays() {
        LeaveBalance oldBalance = buildOldBalance(new BigDecimal("8"));
        LeaveBalance nextBalance = buildNextYearBalance();
        LeaveType leaveType = LeaveType.builder()
                .leaveName("Annual Leave")
                .isCarryForwardAllowed(true)
                .maxCarryForwardDays(new BigDecimal("5"))
                .build();
        leaveType.setId(leaveTypeId);
        leaveType.setTenantId(tenantId);

        when(leaveBalanceRepository.findAllByTenantIdAndYear(tenantId, 2024))
                .thenReturn(List.of(oldBalance));
        when(leaveTypeRepository.findAllByTenantId(tenantId))
                .thenReturn(List.of(leaveType));
        when(leaveBalanceRepository.findForUpdate(employeeId, leaveTypeId, 2025, tenantId))
                .thenReturn(Optional.of(nextBalance));

        int count = leaveBalanceService.carryForwardBalances(2024);

        assertThat(count).isEqualTo(1);
        assertThat(nextBalance.getOpeningBalance()).isEqualByComparingTo(new BigDecimal("5"));
    }

    @Test
    @DisplayName("carryForwardBalances - skips leave types that disallow carry-forward")
    void carryForwardBalances_skipsNonCarryForward() {
        LeaveBalance oldBalance = buildOldBalance(new BigDecimal("8"));
        LeaveType leaveType = LeaveType.builder()
                .leaveName("Sick Leave")
                .isCarryForwardAllowed(false)
                .build();
        leaveType.setId(leaveTypeId);
        leaveType.setTenantId(tenantId);

        when(leaveBalanceRepository.findAllByTenantIdAndYear(tenantId, 2024))
                .thenReturn(List.of(oldBalance));
        when(leaveTypeRepository.findAllByTenantId(tenantId))
                .thenReturn(List.of(leaveType));

        int count = leaveBalanceService.carryForwardBalances(2024);

        assertThat(count).isEqualTo(0);
        verify(leaveBalanceRepository, never()).findForUpdate(any(), any(), any(Integer.class), any());
    }

    @Test
    @DisplayName("carryForwardBalances - skips balances with no available days")
    void carryForwardBalances_skipsZeroAvailable() {
        LeaveBalance oldBalance = buildOldBalance(BigDecimal.ZERO);
        LeaveType leaveType = LeaveType.builder()
                .leaveName("Annual Leave")
                .isCarryForwardAllowed(true)
                .build();
        leaveType.setId(leaveTypeId);
        leaveType.setTenantId(tenantId);

        when(leaveBalanceRepository.findAllByTenantIdAndYear(tenantId, 2024))
                .thenReturn(List.of(oldBalance));
        when(leaveTypeRepository.findAllByTenantId(tenantId))
                .thenReturn(List.of(leaveType));

        int count = leaveBalanceService.carryForwardBalances(2024);

        assertThat(count).isEqualTo(0);
        verify(leaveBalanceRepository, never()).findForUpdate(any(), any(), any(Integer.class), any());
    }
}
