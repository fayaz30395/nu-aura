package com.nulogic.application.leave.service;

import com.nulogic.common.security.TenantContext;
import com.nulogic.common.util.TenantTimeService;
import com.nulogic.domain.leave.LeaveBalance;
import com.nulogic.infrastructure.leave.repository.LeaveAccrualLedgerRepository;
import com.nulogic.infrastructure.leave.repository.LeaveBalanceRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("LeaveBalanceService.accrueLeavePeriodic: year rollover")
class LeaveBalanceServiceAccrualPeriodTest {

    private static final UUID TENANT = UUID.fromString("00000000-0000-4000-8000-0000000000b1");
    private static final UUID EMPLOYEE = UUID.randomUUID();
    private static final UUID LEAVE_TYPE = UUID.randomUUID();

    @Mock
    private LeaveBalanceRepository leaveBalanceRepository;
    @Mock
    private LeaveAccrualLedgerRepository leaveAccrualLedgerRepository;
    @Mock
    private TenantTimeService tenantTimeService;
    @InjectMocks
    private LeaveBalanceService service;

    @AfterEach
    void tearDown() {
        TenantContext.clear();
    }

    @Test
    @DisplayName("January accrual credits January's year even when it is still Dec 31 in the tenant's zone")
    void creditsTheAccrualPeriodsYear() {
        TenantContext.setCurrentTenant(TENANT);
        // 02:00 UTC on Jan 1 2027 is still Dec 31 2026 for a tenant west of UTC.
        when(tenantTimeService.today(TENANT)).thenReturn(LocalDate.of(2026, 12, 31));
        LeaveBalance january = LeaveBalance.builder().employeeId(EMPLOYEE).leaveTypeId(LEAVE_TYPE).year(2027).build();
        when(leaveBalanceRepository.findForUpdate(EMPLOYEE, LEAVE_TYPE, 2027, TENANT)).thenReturn(Optional.of(january));

        boolean applied = service.accrueLeavePeriodic(EMPLOYEE, LEAVE_TYPE, new BigDecimal("1.00"), YearMonth.of(2027, 1));

        assertThat(applied).isTrue();
        assertThat(january.getAccrued()).isEqualByComparingTo("1.00");
        verify(leaveBalanceRepository).save(january);
        verify(leaveBalanceRepository, never()).findForUpdate(any(), any(), eq(2026), any());
    }

    @Test
    @DisplayName("an already-accrued period is a no-op (idempotency ledger)")
    void duplicatePeriodIsNoOp() {
        TenantContext.setCurrentTenant(TENANT);
        when(leaveAccrualLedgerRepository.existsByTenantIdAndEmployeeIdAndLeaveTypeIdAndAccrualPeriod(
                TENANT, EMPLOYEE, LEAVE_TYPE, "2027-01")).thenReturn(true);

        boolean applied = service.accrueLeavePeriodic(EMPLOYEE, LEAVE_TYPE, new BigDecimal("1.00"), YearMonth.of(2027, 1));

        assertThat(applied).isFalse();
        verify(leaveBalanceRepository, never()).findForUpdate(any(), any(), anyInt(), any());
        verify(leaveAccrualLedgerRepository, never()).saveAndFlush(any());
    }
}
