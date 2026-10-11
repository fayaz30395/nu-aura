package com.nulogic.application.analytics.service;

import com.nulogic.api.analytics.dto.EmployeeDashboardResponse;
import com.nulogic.api.payroll.dto.PayslipReleaseStatusResponse;
import com.nulogic.api.payroll.dto.PayslipReleaseStatusResponse.Reason;
import com.nulogic.application.attendance.service.TenantAttendanceConfigService;
import com.nulogic.application.payroll.service.PayslipService;
import com.nulogic.common.security.Permission;
import com.nulogic.common.security.SecurityContext;
import com.nulogic.common.security.TenantContext;
import com.nulogic.common.util.TenantTimeService;
import com.nulogic.domain.employee.Employee;
import com.nulogic.domain.payroll.PayrollRun.PayrollStatus;
import com.nulogic.domain.payroll.Payslip;
import com.nulogic.domain.user.RoleScope;
import com.nulogic.infrastructure.attendance.repository.AttendanceRecordRepository;
import com.nulogic.infrastructure.attendance.repository.HolidayRepository;
import com.nulogic.infrastructure.employee.repository.EmployeeRepository;
import com.nulogic.infrastructure.leave.repository.LeaveBalanceRepository;
import com.nulogic.infrastructure.leave.repository.LeaveRequestRepository;
import com.nulogic.infrastructure.payroll.repository.PayslipRepository;
import org.junit.jupiter.api.AfterEach;
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
import java.time.YearMonth;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * P0-1: the employee dashboard must not expose amounts from payroll runs that are not yet
 * APPROVED/LOCKED. Callers without PAYROLL_VIEW_ALL see released data only; PAYROLL_VIEW_ALL
 * callers are unchanged.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("EmployeeDashboardService payslip release gating")
class EmployeeDashboardServiceReleaseGatingTest {

    private static final BigDecimal UNRELEASED_NET = new BigDecimal("99999.00");
    private static final BigDecimal RELEASED_NET = new BigDecimal("5000.00");

    @Mock private EmployeeRepository employeeRepository;
    @Mock private AttendanceRecordRepository attendanceRepository;
    @Mock private LeaveRequestRepository leaveRequestRepository;
    @Mock private LeaveBalanceRepository leaveBalanceRepository;
    @Mock private PayslipRepository payslipRepository;
    @Mock private HolidayRepository holidayRepository;
    @Mock private TenantAttendanceConfigService tenantAttendanceConfigService;
    @Mock private TenantTimeService tenantTimeService;
    @Mock private PayslipService payslipService;

    @InjectMocks private EmployeeDashboardService service;

    private MockedStatic<TenantContext> tenantContext;
    private MockedStatic<SecurityContext> securityContext;
    private final UUID tenantId = UUID.randomUUID();
    private final UUID employeeId = UUID.randomUUID();
    private final YearMonth lastMonth = YearMonth.now().minusMonths(1);

    @BeforeEach
    void setUp() {
        tenantContext = mockStatic(TenantContext.class);
        tenantContext.when(TenantContext::getCurrentTenant).thenReturn(tenantId);
        securityContext = mockStatic(SecurityContext.class);
        securityContext.when(() -> SecurityContext.getPermissionScope(Permission.PAYROLL_VIEW_ALL))
                .thenReturn(null);
        when(tenantTimeService.today(any())).thenReturn(LocalDate.now());
        when(tenantAttendanceConfigService.getStandardWorkHours(any())).thenReturn(new BigDecimal("8"));
        when(employeeRepository.findByIdAndTenantId(employeeId, tenantId))
                .thenReturn(Optional.of(mock(Employee.class)));
    }

    @AfterEach
    void tearDown() {
        tenantContext.close();
        securityContext.close();
    }

    private Payslip payslip(YearMonth period, BigDecimal net) {
        Payslip p = new Payslip();
        p.setPayPeriodYear(period.getYear());
        p.setPayPeriodMonth(period.getMonthValue());
        p.setGrossSalary(net.add(new BigDecimal("1000.00")));
        p.setNetSalary(net);
        p.setTotalDeductions(new BigDecimal("1000.00"));
        p.setIncomeTax(new BigDecimal("500.00"));
        return p;
    }

    private void stubUnguardedReadsReturnUnreleased() {
        // Trap: any call that bypasses the released-only query returns an unreleased payslip.
        Payslip unreleased = payslip(lastMonth, UNRELEASED_NET);
        when(payslipRepository.findByEmployeeIdAndYear(any(), any(), anyInt())).thenReturn(List.of(unreleased));
        when(payslipRepository.findNetSalaryByEmployeeIdAndYearAndMonth(any(), any(), anyInt(), anyInt()))
                .thenReturn(UNRELEASED_NET);
    }

    @Test
    @DisplayName("self-view: unreleased runs never reach salary fields, YTD or trend")
    void selfView_unreleasedAmountsNeverAppear() {
        stubUnguardedReadsReturnUnreleased();
        when(payslipRepository.findReleasedByEmployeeAndYear(any(), any(), anyInt(), any()))
                .thenReturn(List.of());

        EmployeeDashboardResponse response = service.getEmployeeDashboard(employeeId);

        assertThat(response.getQuickStats().getLastMonthSalary()).isEqualByComparingTo(BigDecimal.ZERO);
        EmployeeDashboardResponse.PayrollSummary payroll = response.getPayroll();
        assertThat(payroll.getGrossSalary()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(payroll.getNetSalary()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(payroll.getDeductions()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(payroll.getTaxes()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(payroll.getYtdGross()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(payroll.getYtdNet()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(payroll.getPayTrend()).allSatisfy(point -> {
            assertThat(point.getGrossSalary()).isEqualByComparingTo(BigDecimal.ZERO);
            assertThat(point.getNetSalary()).isEqualByComparingTo(BigDecimal.ZERO);
        });
        verify(payslipRepository, never()).findByEmployeeIdAndYear(any(), any(), anyInt());
        verify(payslipRepository, never())
                .findNetSalaryByEmployeeIdAndYearAndMonth(any(), any(), anyInt(), anyInt());
    }

    @Test
    @DisplayName("self-view: released (APPROVED/LOCKED) data still appears")
    void selfView_releasedDataStillAppears() {
        stubUnguardedReadsReturnUnreleased();
        Payslip released = payslip(lastMonth, RELEASED_NET);
        when(payslipRepository.findReleasedByEmployeeAndYear(any(), any(), eq(lastMonth.getYear()), any()))
                .thenReturn(List.of(released));

        EmployeeDashboardResponse response = service.getEmployeeDashboard(employeeId);

        assertThat(response.getQuickStats().getLastMonthSalary()).isEqualByComparingTo(RELEASED_NET);
        assertThat(response.getPayroll().getNetSalary()).isEqualByComparingTo(RELEASED_NET);
        assertThat(response.getPayroll().getPayTrend())
                .anySatisfy(point -> assertThat(point.getNetSalary()).isEqualByComparingTo(RELEASED_NET));
    }

    @Test
    @DisplayName("self-view: released-only queries are asked for exactly APPROVED and LOCKED")
    void selfView_usesApprovedAndLockedOnly() {
        when(payslipRepository.findReleasedByEmployeeAndYear(any(), any(), anyInt(), any()))
                .thenReturn(List.of());

        service.getEmployeeDashboard(employeeId);

        verify(payslipRepository, org.mockito.Mockito.atLeastOnce()).findReleasedByEmployeeAndYear(
                eq(tenantId), eq(employeeId), anyInt(),
                eq(List.of(PayrollStatus.APPROVED, PayrollStatus.LOCKED)));
        assertThat(PayslipService.RELEASED_STATUSES)
                .containsExactly(PayrollStatus.APPROVED, PayrollStatus.LOCKED);
    }

    @Test
    @DisplayName("super admin without an explicit PAYROLL_VIEW_ALL entry: unchanged, sees unreleased data")
    void superAdmin_unchanged() {
        securityContext.when(SecurityContext::isSuperAdmin).thenReturn(true);
        Payslip unreleased = payslip(lastMonth, UNRELEASED_NET);
        when(payslipRepository.findByEmployeeIdAndYear(any(), any(), anyInt())).thenReturn(List.of(unreleased));

        EmployeeDashboardResponse response = service.getEmployeeDashboard(employeeId);

        assertThat(response.getPayroll().getNetSalary()).isEqualByComparingTo(UNRELEASED_NET);
        verify(payslipRepository, never()).findReleasedByEmployeeAndYear(any(), any(), anyInt(), any());
    }

    @Test
    @DisplayName("PAYROLL_VIEW_ALL caller: unchanged, sees unreleased data")
    void viewAll_unchanged() {
        securityContext.when(() -> SecurityContext.getPermissionScope(Permission.PAYROLL_VIEW_ALL))
                .thenReturn(RoleScope.ALL);
        Payslip unreleased = payslip(lastMonth, UNRELEASED_NET);
        when(payslipRepository.findByEmployeeIdAndYear(any(), any(), anyInt())).thenReturn(List.of(unreleased));

        EmployeeDashboardResponse response = service.getEmployeeDashboard(employeeId);

        assertThat(response.getQuickStats().getLastMonthSalary()).isEqualByComparingTo(UNRELEASED_NET);
        assertThat(response.getPayroll().getNetSalary()).isEqualByComparingTo(UNRELEASED_NET);
        verify(payslipRepository, never()).findReleasedByEmployeeAndYear(any(), any(), anyInt(), any());
    }

    // ---- dashboard payslipStatus / paymentDate semantics (never PAID; release is not payment) ----

    private static List<PayslipReleaseStatusResponse> twelveMonths(int month, Reason reason) {
        return IntStream.rangeClosed(1, 12)
                .mapToObj(m -> m == month
                        ? new PayslipReleaseStatusResponse(m, reason == Reason.RELEASED, reason)
                        : new PayslipReleaseStatusResponse(m, false, Reason.NO_PAYSLIP))
                .toList();
    }

    private String lastMonthStatus() {
        EmployeeDashboardResponse response = service.getEmployeeDashboard(employeeId);
        assertThat(response.getPayroll().getPaymentDate()).as("no confirmed payment date exists").isNull();
        return response.getPayroll().getPayslipStatus();
    }

    @Test
    @DisplayName("status RELEASED when the last month's payslip belongs to a released run")
    void status_released() {
        when(payslipService.getReleaseStatus(any(), eq(lastMonth.getYear())))
                .thenReturn(twelveMonths(lastMonth.getMonthValue(), Reason.RELEASED));

        assertThat(lastMonthStatus()).isEqualTo("RELEASED");
    }

    @Test
    @DisplayName("status NOT_RELEASED when the payslip exists but its run is not released")
    void status_notReleasedWhenRunNotReleased() {
        when(payslipService.getReleaseStatus(any(), eq(lastMonth.getYear())))
                .thenReturn(twelveMonths(lastMonth.getMonthValue(), Reason.NOT_RELEASED));

        assertThat(lastMonthStatus()).isEqualTo("NOT_RELEASED");
    }

    @Test
    @DisplayName("status NOT_RELEASED when no payroll run exists for the period")
    void status_notReleasedWhenNoRun() {
        when(payslipService.getReleaseStatus(any(), eq(lastMonth.getYear())))
                .thenReturn(twelveMonths(lastMonth.getMonthValue(), Reason.NO_PAYSLIP));
        when(payslipService.getRunStatusForPeriod(lastMonth.getYear(), lastMonth.getMonthValue()))
                .thenReturn(Optional.empty());

        assertThat(lastMonthStatus()).isEqualTo("NOT_RELEASED");
    }

    @Test
    @DisplayName("status NOT_RELEASED when the period's run exists but is not released")
    void status_notReleasedWhenRunExistsUnreleasedAndNoPayslip() {
        when(payslipService.getReleaseStatus(any(), eq(lastMonth.getYear())))
                .thenReturn(twelveMonths(lastMonth.getMonthValue(), Reason.NO_PAYSLIP));
        when(payslipService.getRunStatusForPeriod(lastMonth.getYear(), lastMonth.getMonthValue()))
                .thenReturn(Optional.of(PayrollStatus.PROCESSED));

        assertThat(lastMonthStatus()).isEqualTo("NOT_RELEASED");
    }

    @Test
    @DisplayName("status NOT_AVAILABLE when the run is released but the employee has no payslip (not applicable)")
    void status_notAvailableWhenReleasedRunWithoutPayslip() {
        when(payslipService.getReleaseStatus(any(), eq(lastMonth.getYear())))
                .thenReturn(twelveMonths(lastMonth.getMonthValue(), Reason.NO_PAYSLIP));
        when(payslipService.getRunStatusForPeriod(lastMonth.getYear(), lastMonth.getMonthValue()))
                .thenReturn(Optional.of(PayrollStatus.APPROVED));

        assertThat(lastMonthStatus()).isEqualTo("NOT_AVAILABLE");
    }

    @Test
    @DisplayName("status NOT_AVAILABLE when release information cannot be established")
    void status_notAvailableOnFailure() {
        when(payslipService.getReleaseStatus(any(), anyInt())).thenThrow(new IllegalStateException("boom"));

        assertThat(lastMonthStatus()).isEqualTo("NOT_AVAILABLE");
    }

    @Test
    @DisplayName("PAID is never emitted: approval or lock does not prove payment")
    void status_neverPaid() {
        for (Reason reason : Reason.values()) {
            when(payslipService.getReleaseStatus(any(), anyInt()))
                    .thenReturn(twelveMonths(lastMonth.getMonthValue(), reason));
            when(payslipService.getRunStatusForPeriod(anyInt(), anyInt()))
                    .thenReturn(Optional.of(PayrollStatus.LOCKED));

            assertThat(lastMonthStatus()).isNotEqualTo("PAID");
        }
    }
}
